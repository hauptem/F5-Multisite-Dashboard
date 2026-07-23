#!/bin/bash
# Automated Pool Discovery Script - Multi-Partition
# Dashboard Version 2.0
#
# Discovers pools across all partitions and populates the dashboard datagroups
# with canonical names: bare name for /Common pools, full path for all others.
# Bare-equals-Common and never-both-forms are enforced by construction because
# this script is the only writer of the pools datagroup.
#
# Partition visibility is controlled here, not in the iRule. Excluded
# partitions are never written to the datagroup, so they are never polled,
# never rendered, and never appear in the dashboard partition dropdown.
# Exclusion takes effect at the next run of this script.

# ======================================================================================================
# ADMIN CONFIGURATION
# ======================================================================================================

# Partitions to EXCLUDE from the dashboard, space-separated, no slashes.
# Every partition not listed here is included. Common cannot be excluded.
# Example: EXCLUDE_PARTITIONS="secure lab-test"
EXCLUDE_PARTITIONS=""

# Individual pools to exclude by canonical name, space-separated.
# Example: EXCLUDE_POOLS="dashboard-api-hosts_https_pool dashboard-dns_udp53_pool"
EXCLUDE_POOLS=""

# ======================================================================================================
# END ADMIN CONFIGURATION
# ======================================================================================================

# Dry-run mode: -n or --dry-run prints the merged record sets and all
# add/keep/remove decisions without writing to the datagroups
DRY_RUN=0
if [ "$1" = "-n" ] || [ "$1" = "--dry-run" ]; then
    DRY_RUN=1
    echo "DRY RUN - no datagroup changes will be made"
fi

# Machine-written datagroups live in a device-local folder excluded from
# config sync. Every write here is a config change; in /Common on a
# manual-sync cluster each sync run would flip "Changes Pending" and train
# operators to ignore a meaningful flag. Each device's discovery maintains
# its own copy - there is nothing meaningful to sync
POOLS_DG="/Common/dashboard/datagroup-dashboard-pools"
ALIAS_DG="/Common/dashboard/datagroup-dashboard-pool-alias"

# Verify both datagroups exist before touching anything
for DG in "$POOLS_DG" "$ALIAS_DG"; do
    if ! tmsh -q list ltm data-group internal "$DG" > /dev/null 2>&1; then
        echo "ERROR: datagroup $DG not found - create it before running discovery"
        exit 1
    fi
done

# Common is the implicit default partition and is never excludable
for P in $EXCLUDE_PARTITIONS; do
    if [ "$P" = "Common" ]; then
        echo "WARNING: Common cannot be excluded - ignoring"
    fi
done

# ======================================================================================================
# DISCOVERY - all partitions, full paths
# ======================================================================================================
# cd / + recursive is required: a plain 'list ltm pool' only sees the current
# partition. Recursive listing returns every pool as a full path
# (/Partition/name, including folder forms like /Common/appA/web-pool)
DISCOVERED=$(tmsh -q -c "cd /; list ltm pool recursive one-line" 2>/dev/null \
    | grep -o "ltm pool [^{]*" | awk '{print $3}')

if [ -z "$DISCOVERED" ]; then
    echo "ERROR: No pools discovered - aborting without modifying datagroups"
    exit 1
fi

# Build the canonical pool list, applying partition and pool exclusions
CANONICAL_POOLS=""
SKIPPED_PARTITIONED=0
for FULLPATH in $DISCOVERED; do
    # Partition is the second path segment; pool name is everything after it.
    # Never take a single segment alone - folder pools (/Common/appA/web-pool)
    # must keep their trailing segments or distinct pools collapse onto one key
    TRIMMED=${FULLPATH#/}
    PARTITION=${TRIMMED%%/*}
    POOLNAME=${TRIMMED#*/}
    if [ -z "$PARTITION" ] || [ -z "$POOLNAME" ] || [ "$POOLNAME" = "$TRIMMED" ]; then
        echo "WARNING: Skipping malformed pool path: $FULLPATH"
        continue
    fi

    # Partition exclusion (Common is never excluded)
    if [ "$PARTITION" != "Common" ]; then
        SKIP=0
        for P in $EXCLUDE_PARTITIONS; do
            if [ "$P" = "$PARTITION" ]; then
                SKIP=1
                break
            fi
        done
        if [ $SKIP -eq 1 ]; then
            ((SKIPPED_PARTITIONED++))
            continue
        fi
    fi

    # Canonical form: bare name for Common, constructed full path for
    # everything else. Built from the parsed parts rather than the raw tmsh
    # output so a missing leading slash in the listing can never propagate
    # into the datagroup - a slashless entry reads as a Common bare name to
    # the iRule and fails every LB command
    if [ "$PARTITION" = "Common" ]; then
        CANONICAL="$POOLNAME"
    else
        CANONICAL="/$PARTITION/$POOLNAME"
    fi

    # Individual pool exclusion
    SKIP=0
    for EX in $EXCLUDE_POOLS; do
        if [ "$EX" = "$CANONICAL" ]; then
            SKIP=1
            break
        fi
    done
    if [ $SKIP -eq 1 ]; then
        continue
    fi

    CANONICAL_POOLS="$CANONICAL_POOLS $CANONICAL"
done

POOL_COUNT=$(echo $CANONICAL_POOLS | wc -w)
if [ "$POOL_COUNT" -eq 0 ]; then
    echo "ERROR: All discovered pools were excluded - aborting without modifying datagroups"
    exit 1
fi
echo "Discovered $POOL_COUNT eligible pools ($SKIPPED_PARTITIONED excluded by partition)"

# ======================================================================================================
# MERGE - preserve existing sort orders and aliases
# ======================================================================================================
# replace-all-with is still used for the write, but the record set is a merge,
# not a rebuild: surviving pools keep their sort order and alias untouched,
# new pools append after the current maximum, vanished pools are removed and
# logged. A blind rebuild would reset every hand-tuned sort order and orphan
# every alias on each run - the original single-partition script did exactly
# that, which was survivable only because it was run once at install

declare -A EXISTING_SORT
declare -A EXISTING_ALIAS

# Parse existing datagroup records from tmsh one-line output. tmsh quotes
# record names and data values only when they contain special characters,
# so both quoted ("web-pool" { data "10" }) and unquoted
# (web-pool { data 10 }) forms must parse, plus empty records (name { }).
parse_datagroup_records() {
    local DG="$1"
    local LINE NAME VALUE
    while IFS= read -r LINE; do
        NAME=$(echo "$LINE" | sed -n 's/^\(\("[^"]*"\)\|\([^ "{}]\+\)\) {.*/\1/p' | tr -d '"')
        VALUE=$(echo "$LINE" | sed -n 's/.*{ data \(\("[^"]*"\)\|\([^ }]\+\)\) }.*/\1/p' | tr -d '"')
        if [ -n "$NAME" ]; then
            printf '%s\t%s\n' "$NAME" "$VALUE"
        fi
    done < <(tmsh -q list ltm data-group internal "$DG" one-line 2>/dev/null \
        | grep -oE '("[^"]+"|[^ "{}]+) \{( data ("[^"]*"|[^ }]+))? \}')
}

while IFS=$'\t' read -r NAME VALUE; do
    [ -n "$NAME" ] && EXISTING_SORT["$NAME"]="$VALUE"
done < <(parse_datagroup_records "$POOLS_DG")

while IFS=$'\t' read -r NAME VALUE; do
    [ -n "$NAME" ] && EXISTING_ALIAS["$NAME"]="$VALUE"
done < <(parse_datagroup_records "$ALIAS_DG")

# Guard: a populated datagroup that parses to zero records means the
# read-back is broken, not that the datagroup is empty. Proceeding would
# silently renumber every sort order and wipe every alias - the exact
# failure a broken parser produced during development, indistinguishable
# from a bootstrap in the output. 
RAW_RECORD_COUNT=$(tmsh -q list ltm data-group internal "$POOLS_DG" one-line 2>/dev/null | grep -c 'records')
if [ "$RAW_RECORD_COUNT" -gt 0 ] && [ ${#EXISTING_SORT[@]} -eq 0 ]; then
    echo "ERROR: $POOLS_DG contains records but the parser read zero - aborting"
    echo "ERROR: run 'tmsh -q list ltm data-group internal $POOLS_DG one-line' and report the output format"
    exit 1
fi

# Find the current maximum sort order so new pools append after existing ones
MAX_SORT=0
for NAME in "${!EXISTING_SORT[@]}"; do
    V="${EXISTING_SORT[$NAME]}"
    if [[ "$V" =~ ^[0-9]+$ ]] && [ "$V" -gt "$MAX_SORT" ]; then
        MAX_SORT=$V
    fi
done

# Build merged record sets
POOL_RECORDS=""
ALIAS_RECORDS=""
NEW_COUNT=0
KEPT_COUNT=0
NEXT_SORT=$((MAX_SORT + 10))
for POOL in $CANONICAL_POOLS; do
    if [ -n "${EXISTING_SORT[$POOL]+x}" ] && [[ "${EXISTING_SORT[$POOL]}" =~ ^[0-9]+$ ]]; then
        SORT="${EXISTING_SORT[$POOL]}"
        ((KEPT_COUNT++))
    else
        SORT=$NEXT_SORT
        ((NEXT_SORT+=10))
        ((NEW_COUNT++))
    fi
    POOL_RECORDS="$POOL_RECORDS \"$POOL\" { data \"$SORT\" }"

    ALIAS="${EXISTING_ALIAS[$POOL]}"
    ALIAS_RECORDS="$ALIAS_RECORDS \"$POOL\" { data \"$ALIAS\" }"
done

# Log pools being removed (present in datagroup, no longer discovered/eligible).
# A vanished pool is either cleanup or an outage - the admin should see which
for NAME in "${!EXISTING_SORT[@]}"; do
    FOUND=0
    for POOL in $CANONICAL_POOLS; do
        if [ "$POOL" = "$NAME" ]; then
            FOUND=1
            break
        fi
    done
    if [ $FOUND -eq 0 ]; then
        echo "REMOVING: $NAME (no longer discovered or now excluded)"
    fi
done

# Log orphaned aliases (alias key with no surviving pool) - removed with the merge
for NAME in "${!EXISTING_ALIAS[@]}"; do
    FOUND=0
    for POOL in $CANONICAL_POOLS; do
        if [ "$POOL" = "$NAME" ]; then
            FOUND=1
            break
        fi
    done
    if [ $FOUND -eq 0 ] && [ -n "${EXISTING_ALIAS[$NAME]}" ]; then
        echo "REMOVING ALIAS: $NAME := \"${EXISTING_ALIAS[$NAME]}\" (pool gone)"
    fi
done

# ======================================================================================================
# WRITE
# ======================================================================================================
if [ $DRY_RUN -eq 1 ]; then
    echo ""
    echo "DRY RUN - would write to $POOLS_DG:"
    echo "  { $POOL_RECORDS }" | sed 's/} "/}\n  "/g'
    echo ""
    echo "DRY RUN - would write to $ALIAS_DG:"
    echo "  { $ALIAS_RECORDS }" | sed 's/} "/}\n  "/g'
    echo ""
    echo "DRY RUN complete - no changes made"
    echo "Total pools that would be configured: $POOL_COUNT ($KEPT_COUNT kept existing sort order, $NEW_COUNT new)"
    exit 0
fi

tmsh modify ltm data-group internal "$POOLS_DG" records replace-all-with { $POOL_RECORDS }
tmsh modify ltm data-group internal "$ALIAS_DG" records replace-all-with { $ALIAS_RECORDS }

echo "Pool datagroups populated successfully"
echo "Total pools configured: $POOL_COUNT ($KEPT_COUNT kept existing sort order, $NEW_COUNT new)"
