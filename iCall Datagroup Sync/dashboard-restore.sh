#!/bin/bash
# Dashboard Datagroup Restore Script
# Purpose: Restore dashboard datagroups from backup files created by the sync script
# Usage: ./dashboard-restore.sh [timestamp|latest|view] [datagroup_prefix]
# Author: Eric Haupt
# License: MIT

# Default configuration - can be overridden by command line arguments
BACKUP_DIR="/var/tmp/dashboard_backups"
POOLS_DATAGROUP="datagroup-dashboard-pools"
ALIAS_DATAGROUP="datagroup-dashboard-pool-alias"

# Function to display usage information
show_usage() {
    echo "Usage: $0 [timestamp|latest|view] [pools_datagroup] [alias_datagroup]"
    echo ""
    echo "Commands:"
    echo "  timestamp     - Restore from specific backup (YYYYMMDD_HHMMSS format)"
    echo "  latest        - Restore from most recent backup"
    echo "  view          - View backup contents without restoring"
    echo ""
    echo "Optional parameters:"
    echo "  pools_datagroup - Name of pools datagroup (default: datagroup-dashboard-pools)"
    echo "  alias_datagroup - Name of alias datagroup (default: datagroup-dashboard-pool-alias)"
    echo ""
    echo "Examples:"
    echo "  $0 latest"
    echo "  $0 20241005_143022"
    echo "  $0 view"
    echo "  $0 latest prod-dashboard-pools prod-dashboard-aliases"
}

# Function to view backup contents
view_backup() {
    local timestamp="$1"
    local pools_file="$BACKUP_DIR/${POOLS_DATAGROUP}_$timestamp.backup"
    local alias_file="$BACKUP_DIR/${ALIAS_DATAGROUP}_$timestamp.backup"
    
    if [ ! -f "$pools_file" ] || [ ! -f "$alias_file" ]; then
        echo "ERROR: Backup files not found for timestamp $timestamp"
        echo "Expected files:"
        echo "  $pools_file"
        echo "  $alias_file"
        return 1
    fi
    
    echo "============================================"
    echo "BACKUP CONTENTS FOR: $timestamp"
    echo "============================================"
    
    echo ""
    echo "POOLS (showing pool name and sort order):"
    echo "--------------------------------------------"
    
    # Display pools with formatting
    local pool_count=0
    while IFS='|' read -r name data; do
        if [[ ! "$name" =~ ^# ]] && [[ -n "$name" ]]; then
            printf "  %-35s %s\n" "$name" "$data"
            ((pool_count++))
            if [ $pool_count -eq 20 ]; then
                break
            fi
        fi
    done < "$pools_file"
    
    # Count total pools
    local total_pools=$(grep -v '^#' "$pools_file" | grep -v '^$' | wc -l)
    if [ $total_pools -gt 20 ]; then
        echo "  ... and $((total_pools - 20)) more pools"
    fi
    echo "  Total pools: $total_pools"
    
    echo ""
    echo "ALIASES (showing pool name and display alias):"
    echo "--------------------------------------------"
    
    # Display aliases with formatting
    local alias_count=0
    while IFS='|' read -r name data; do
        if [[ ! "$name" =~ ^# ]] && [[ -n "$name" ]]; then
            # Convert underscores back to spaces for display
            local display_alias=$(echo "$data" | sed 's/_/ /g')
            printf "  %-35s %s\n" "$name" "$display_alias"
            ((alias_count++))
            if [ $alias_count -eq 20 ]; then
                break
            fi
        fi
    done < "$alias_file"
    
    # Count total aliases
    local total_aliases=$(grep -v '^#' "$alias_file" | grep -v '^$' | wc -l)
    if [ $total_aliases -gt 20 ]; then
        echo "  ... and $((total_aliases - 20)) more aliases"
    fi
    echo "  Total aliases: $total_aliases"
    echo ""
}

# Function to build tmsh records from backup file
build_records() {
    local backup_file="$1"
    local record_type="$2"  # "pools" or "aliases"
    local records=""
    
    while IFS='|' read -r name data; do
        # Skip comments and empty lines
        if [[ "$name" =~ ^# ]] || [[ -z "$name" ]]; then
            continue
        fi
        
        # Clean the name and data - remove leading/trailing whitespace
        name=$(echo "$name" | xargs)
        data=$(echo "$data" | xargs)
        
        if [ "$record_type" = "pools" ]; then
            # Pools: name with sort order data
            if [ -n "$data" ] && [ "$data" != "" ]; then
                records="$records \"$name\" { data $data }"
            else
                records="$records \"$name\" { data 999 }"
            fi
        else
            # Aliases: name with alias data (or empty)
            # For aliases, only add data field if data is non-empty
            if [ -n "$data" ] && [ "$data" != "" ] && [ "$data" != " " ]; then
                records="$records \"$name\" { data $data }"
            else
                records="$records \"$name\" { }"
            fi
        fi
    done < "$backup_file"
    
    echo "$records"
}

# Function to perform the actual restore
perform_restore() {
    local timestamp="$1"
    local pools_file="$BACKUP_DIR/${POOLS_DATAGROUP}_$timestamp.backup"
    local alias_file="$BACKUP_DIR/${ALIAS_DATAGROUP}_$timestamp.backup"
    
    echo "Starting restore process..."
    echo ""
    
    # Verify target datagroups exist
    echo "Verifying target datagroups..."
    if ! tmsh list ltm data-group internal "$POOLS_DATAGROUP" >/dev/null 2>&1; then
        echo "ERROR: Pools datagroup '$POOLS_DATAGROUP' does not exist"
        return 1
    fi
    
    if ! tmsh list ltm data-group internal "$ALIAS_DATAGROUP" >/dev/null 2>&1; then
        echo "ERROR: Alias datagroup '$ALIAS_DATAGROUP' does not exist"
        return 1
    fi
    
    # Build records for pools datagroup
    echo "Building pools datagroup records..."
    local pool_records=$(build_records "$pools_file" "pools")
    if [ -z "$pool_records" ]; then
        echo "ERROR: No valid pool records found in backup"
        return 1
    fi
    
    # Build records for alias datagroup
    echo "Building alias datagroup records..."
    local alias_records=$(build_records "$alias_file" "aliases")
    if [ -z "$alias_records" ]; then
        echo "ERROR: No valid alias records found in backup"
        return 1
    fi
    
    # Apply the restore
    echo "Restoring pools datagroup..."
    if ! tmsh modify ltm data-group internal "$POOLS_DATAGROUP" records replace-all-with { $pool_records }; then
        echo "ERROR: Failed to restore pools datagroup"
        return 1
    fi
    
    echo "Restoring alias datagroup..."
    if ! tmsh modify ltm data-group internal "$ALIAS_DATAGROUP" records replace-all-with { $alias_records }; then
        echo "ERROR: Failed to restore alias datagroup"
        echo "WARNING: Pools datagroup was restored but aliases failed"
        return 1
    fi
    
    echo ""
    echo "============================================"
    echo "RESTORE COMPLETED SUCCESSFULLY"
    echo "============================================"
    echo "Restored from backup: $timestamp"
    echo "Target datagroups:"
    echo "  Pools: $POOLS_DATAGROUP"
    echo "  Aliases: $ALIAS_DATAGROUP"
    echo ""
    echo "Use 'tmsh save sys config' to save the configuration"
    
    return 0
}

# Main script execution
echo "=== Dashboard Datagroup Restore Tool ==="
echo ""

# Parse command line arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Override datagroup names if provided
if [ -n "$2" ]; then
    POOLS_DATAGROUP="$2"
fi
if [ -n "$3" ]; then
    ALIAS_DATAGROUP="$3"
fi

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory $BACKUP_DIR does not exist"
    exit 1
fi

# Handle view option
if [ "$1" = "view" ]; then
    echo "Available backups for viewing:"
    echo ""
    
    # Get unique timestamps for the specified datagroups
    TIMESTAMPS=$(ls -1 "$BACKUP_DIR/${POOLS_DATAGROUP}_"*.backup 2>/dev/null | \
                sed "s/.*${POOLS_DATAGROUP}_\([0-9]\{8\}_[0-9]\{6\}\)\.backup$/\1/" | \
                sort -r | head -10)
    
    if [ -z "$TIMESTAMPS" ]; then
        echo "No backup files found for datagroup: $POOLS_DATAGROUP"
        exit 1
    fi
    
    echo "Recent backups:"
    for ts in $TIMESTAMPS; do
        echo "  $ts"
    done
    
    echo ""
    echo "Enter timestamp to view (or 'latest' for most recent):"
    read VIEW_TIMESTAMP
    
    if [ "$VIEW_TIMESTAMP" = "latest" ]; then
        VIEW_TIMESTAMP=$(echo "$TIMESTAMPS" | head -1)
    fi
    
    view_backup "$VIEW_TIMESTAMP"
    exit 0
fi

# List available backups
echo "Available backups:"
echo ""
ls -1t "$BACKUP_DIR/${POOLS_DATAGROUP}_"*.backup 2>/dev/null | head -10 | while read file; do
    timestamp=$(basename "$file" | sed "s/${POOLS_DATAGROUP}_\(.*\)\.backup/\1/")
    filedate=$(date -d "${timestamp:0:8} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "Invalid date")
    echo "  $timestamp ($filedate)"
done

echo ""
echo "TIP: Use '$0 view' to see backup contents before restoring"
echo ""

# Get user input for timestamp
if [ -n "$1" ] && [ "$1" != "view" ]; then
    TIMESTAMP="$1"
else
    echo "Enter backup timestamp (YYYYMMDD_HHMMSS) or 'latest' for most recent:"
    read TIMESTAMP
fi

# Handle latest option
if [ "$TIMESTAMP" = "latest" ]; then
    POOLS_BACKUP=$(ls -1t "$BACKUP_DIR/${POOLS_DATAGROUP}_"*.backup 2>/dev/null | head -1)
    
    if [ -z "$POOLS_BACKUP" ]; then
        echo "ERROR: No backup files found for datagroup: $POOLS_DATAGROUP"
        exit 1
    fi
    
    # Extract timestamp from filename
    TIMESTAMP=$(basename "$POOLS_BACKUP" | sed "s/${POOLS_DATAGROUP}_\(.*\)\.backup/\1/")
fi

# Verify backup files exist
POOLS_BACKUP="$BACKUP_DIR/${POOLS_DATAGROUP}_$TIMESTAMP.backup"
ALIAS_BACKUP="$BACKUP_DIR/${ALIAS_DATAGROUP}_$TIMESTAMP.backup"

if [ ! -f "$POOLS_BACKUP" ] || [ ! -f "$ALIAS_BACKUP" ]; then
    echo "ERROR: Backup files not found for timestamp $TIMESTAMP"
    echo "Expected files:"
    echo "  $POOLS_BACKUP"
    echo "  $ALIAS_BACKUP"
    echo ""
    echo "Available backups:"
    ls -1 "$BACKUP_DIR/${POOLS_DATAGROUP}_"*.backup 2>/dev/null | head -5
    exit 1
fi

# Show what will be restored
echo "Will restore from backup: $TIMESTAMP"
echo "Source files:"
echo "  Pools: $POOLS_BACKUP"
echo "  Aliases: $ALIAS_BACKUP"
echo ""
echo "Target datagroups:"
echo "  Pools: $POOLS_DATAGROUP"
echo "  Aliases: $ALIAS_DATAGROUP"
echo ""

# Show backup preview
echo "Backup preview:"
view_backup "$TIMESTAMP"

echo ""
echo "============================================"
echo "WARNING: This will replace current datagroups!"
echo "Type 'YES' to continue with restore:"
read CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Perform the restore
perform_restore "$TIMESTAMP"
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "Restore completed successfully!"
    echo "Don't forget to save the configuration: tmsh save sys config"
else
    echo ""
    echo "Restore failed. Check error messages above."
fi

exit $exit_code