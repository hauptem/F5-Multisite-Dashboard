# iCall Script: dashboard-pool-sync
# Purpose: Automatically synchronize dashboard datagroups with LTM pools
# Features: Pool exclusion, error handling, file-based backups, LTM Pool description parsing
# Author: Eric Haupt
# License: MIT
# Copyright (c) 2025 Eric Haupt
# Released under the MIT License. See LICENSE file for details.
#
# OVERVIEW:
# This script maintains two dashboard datagroups that track LTM pool configurations:
# 1. datagroup-dashboard-pools: Contains pool names with sort order values for dashboard display
# 2. datagroup-dashboard-pool-alias: Contains pool names with friendly display aliases
# 
# The script runs automatically via iCall to ensure datagroups stay synchronized
# with actual LTM pool configurations, adding new pools and removing deleted ones.
#
# ================================================================================
# CONFIGURATION 
# ================================================================================
# Target datagroup names
# These datagroups must exist and be type 'string'
set pools_datagroup "datagroup-dashboard-pools"
set alias_datagroup "datagroup-dashboard-pool-alias"
# Pool exclusion patterns - pools matching these patterns will be ignored
# Note: Exclusion prevents automatic addition but does not remove existing entries
# Supports wildcard patterns using standard Tcl string matching
set excluded_pools {
    "*_test_pool"
    "*_temp_pool"
}
# Backup configuration
# Backups are created before any script modifications
set create_backups 0          ; # 0 = disabled; 1 = enabled
set max_backups 30            ; # Maximum backup files to retain per datagroup
set backup_dir "/var/tmp/dashboard_backups"  ; # Backup storage location
# Automatic alias generation from LTM pool description field
# When enabled, creates friendly names from pool descriptions for dashboard display
# Only updates aliases that are currently empty
set auto_generate_aliases 0   ; # 0 = disabled; 1 = enabled
set description_max_length 80 ; # Maximum characters in generated alias
# ================================================================================
# MAIN SYNCHRONIZATION LOGIC
# ================================================================================
# Initialize error tracking
set sync_error 0
set error_details ""
# PHASE 1: ENVIRONMENT VALIDATION
# Verify that required datagroups exist
if {[catch {
    set pools_exists [tmsh::get_config /ltm data-group internal $pools_datagroup]
    if {[llength $pools_exists] == 0} {
        error "Datagroup $pools_datagroup does not exist"
    }
    set pools_type [tmsh::get_field_value [lindex $pools_exists 0] "type"]
    if {$pools_type ne "string"} {
        error "Datagroup $pools_datagroup has wrong type: $pools_type (expected: string)"
    }
} error_msg]} {
    tmsh::log "ERROR: Dashboard sync - Pools datagroup validation failed: $error_msg"
    return 1
}
if {[catch {
    set alias_exists [tmsh::get_config /ltm data-group internal $alias_datagroup]
    if {[llength $alias_exists] == 0} {
        error "Datagroup $alias_datagroup does not exist"
    }
    set alias_type [tmsh::get_field_value [lindex $alias_exists 0] "type"]
    if {$alias_type ne "string"} {
        error "Datagroup $alias_datagroup has wrong type: $alias_type (expected: string)"
    }
} error_msg]} {
    tmsh::log "ERROR: Dashboard sync - Alias datagroup validation failed: $error_msg"
    return 1
}
# PHASE 2: LTM POOL DISCOVERY
# Retrieve current LTM pool configuration
# Only includes pools that pass exclusion filtering
if {[catch {set current_pools [tmsh::get_config /ltm pool]} error_msg]} {
    tmsh::log "ERROR: Dashboard sync - Failed to get pool configuration: $error_msg"
    return 1
}
# Build filtered list of LTM pool data with descriptions
# Each entry contains: {pool_name pool_description}
set ltm_pool_data {}
foreach pool $current_pools {
    set pool_name [tmsh::get_name $pool]
    # Remove /Common/ prefix 
    # This standardizes pool names for datagroup storage
    regsub {^/Common/} $pool_name "" pool_name
    # Apply exclusion filters to keep unwanted pools out of dashboard
    # Uses pattern matching to support wildcards and specific names
    set should_exclude 0
    foreach pattern $excluded_pools {
        if {[string match $pattern $pool_name]} {
            set should_exclude 1
            break
        }
    }
    # Process pools that pass exclusion filter
    if {!$should_exclude} {
        # Extract pool description for alias generation
        set pool_description ""
        if {[catch {
            set pool_description [tmsh::get_field_value $pool "description"]
        }]} {
            set pool_description ""
        }
        
        # Store as list for later processing: {name description}
        lappend ltm_pool_data [list $pool_name $pool_description]
    }
}
# PHASE 3: DATAGROUP STATE ANALYSIS
# Read current datagroup contents to determine required changes
# Initialize arrays to hold current datagroup contents
array set existing_pools {}    ; # pool_name -> sort_order
array set existing_aliases {}  ; # pool_name -> alias_value
# Parse existing pools datagroup
if {[catch {
    set datagroup_pools_config [tmsh::get_config /ltm data-group internal $pools_datagroup]
    if {[llength $datagroup_pools_config] > 0} {
        # Handle empty datagroups that lack records field
        if {[catch {set records [tmsh::get_field_value [lindex $datagroup_pools_config 0] "records"]} records_error]} {
            set records {}
        }
        # Process each existing record
        foreach record $records {
            set name [tmsh::get_name $record]
            # Handle records with missing or empty data field
            if {[catch {set data [tmsh::get_field_value $record "data"]} data_error]} {
                set data ""
            }
            set existing_pools($name) $data
        }
    }
} error_msg]} {
    tmsh::log "ERROR: Dashboard sync - Failed to read pools datagroup: $error_msg"
    set sync_error 1
    set error_details "Failed to read pools datagroup"
}
# Parse existing alias datagroup
if {!$sync_error && [catch {
    set datagroup_aliases_config [tmsh::get_config /ltm data-group internal $alias_datagroup]
    if {[llength $datagroup_aliases_config] > 0} {
        # Handle empty datagroups that lack records field
        if {[catch {set records [tmsh::get_field_value [lindex $datagroup_aliases_config 0] "records"]} records_error]} {
            set records {}
        }
        # Process each existing record
        foreach record $records {
            set name [tmsh::get_name $record]
            # Handle records with missing or empty data field
            if {[catch {set data [tmsh::get_field_value $record "data"]} data_error]} {
                set data ""
            }
            set existing_aliases($name) $data
        }
    }
} error_msg]} {
    tmsh::log "ERROR: Dashboard sync - Failed to read alias datagroup: $error_msg"
    set sync_error 1
    set error_details "Failed to read alias datagroup"
}
# Abort if we encountered errors reading datagroups
if {$sync_error} {
    tmsh::log "ERROR: Dashboard sync aborted - $error_details"
    return 1
}
# PHASE 4: SORT ORDER MANAGEMENT
# Calculate appropriate sort order values for new pools
# Uses increments of 10 to allow manual insertion between values
set max_sort_order 0
foreach {pool_name sort_order} [array get existing_pools] {
    if {[string is integer $sort_order] && $sort_order > $max_sort_order} {
        set max_sort_order $sort_order
    }
}
# Start new pools at next increment of 10
set next_sort_order [expr {($max_sort_order / 10 + 1) * 10}]
# Initialize change tracking
set pools_added {}
set pools_removed {}
set aliases_updated {}
set changes_made 0
# PHASE 5: POOL ADDITION AND ALIAS PROCESSING
# Add new pools and update aliases based on current LTM configuration
foreach pool_data $ltm_pool_data {
    set pool_name [lindex $pool_data 0]
    set pool_description [lindex $pool_data 1]
    if {![info exists existing_pools($pool_name)]} {
        # NEW POOL: Add to both datagroups with calculated sort order
        set existing_pools($pool_name) $next_sort_order
        # Generate alias from description if feature is enabled
        set new_alias ""
        if {$auto_generate_aliases && $pool_description ne ""} {
            # Clean and format the description for display
            set clean_desc [string trim $pool_description]
            # Truncate overly long descriptions with ellipsis
            if {[string length $clean_desc] > $description_max_length} {
                set clean_desc "[string range $clean_desc 0 [expr {$description_max_length - 4}]]..."
            }
            # Ensure proper capitalization
            if {[string length $clean_desc] > 0} {
                set clean_desc "[string toupper [string index $clean_desc 0]][string range $clean_desc 1 end]"
            }
            set new_alias $clean_desc
        }
        # Always add entry to alias datagroup
        set existing_aliases($pool_name) $new_alias
        lappend pools_added $pool_name
        set changes_made 1
        # Increment sort order for next new pool
        incr next_sort_order 10
    } else {
        # EXISTING POOL: Check if alias should be updated from description
        if {$auto_generate_aliases && $pool_description ne ""} {
            set current_alias ""
            if {[info exists existing_aliases($pool_name)]} {
                set current_alias $existing_aliases($pool_name)
            }
            # Generate new alias from description
            set new_alias ""
            if {$pool_description ne ""} {
                # Apply same cleaning logic as for new pools
                set clean_desc [string trim $pool_description]
                if {[string length $clean_desc] > $description_max_length} {
                    set clean_desc "[string range $clean_desc 0 [expr {$description_max_length - 4}]]..."
                }
                if {[string length $clean_desc] > 0} {
                    set clean_desc "[string toupper [string index $clean_desc 0]][string range $clean_desc 1 end]"
                }
                set new_alias $clean_desc
            }
            # Only update if current alias is empty
            # This prevents overwriting aliases that have been manually set
            if {$new_alias ne $current_alias && $current_alias eq ""} {
                set existing_aliases($pool_name) $new_alias
                lappend aliases_updated $pool_name
                set changes_made 1
            }
        } else {
            # Ensure pool exists in alias datagroup even if auto-generation is disabled
            if {![info exists existing_aliases($pool_name)]} {
                set existing_aliases($pool_name) ""
                set changes_made 1
            }
        }
    }
}
# PHASE 6: POOL REMOVAL PROCESSING
# Remove pools from datagroups that no longer exist in LTM
# Build list of current LTM pool names for comparison
set ltm_pool_names {}
foreach pool_data $ltm_pool_data {
    lappend ltm_pool_names [lindex $pool_data 0]
}
# Check each datagroup entry against current LTM pools
foreach pool_name [array names existing_pools] {
    # Skip removal if pool matches exclusion pattern
    # This prevents removal of manually managed pools that don't exist in LTM
    set should_exclude 0
    foreach pattern $excluded_pools {
        if {[string match $pattern $pool_name]} {
            set should_exclude 1
            break
        }
    }
    # Only remove pools that don't match exclusion patterns
    if {!$should_exclude} {
        if {[lsearch -exact $ltm_pool_names $pool_name] == -1} {
            # Pool exists in datagroup but not in LTM - remove it
            unset existing_pools($pool_name)
            if {[info exists existing_aliases($pool_name)]} {
                unset existing_aliases($pool_name)
            }
            lappend pools_removed $pool_name
            set changes_made 1
        }
    }
}
# PHASE 7: CHANGE APPLICATION
# Apply detected changes
if {$changes_made} {
    # Create timestamped backups before making changes (if enabled)
    if {$create_backups} {
        set timestamp [clock format [clock seconds] -format "%Y%m%d_%H%M%S"]
        # Ensure backup directory exists
        catch {exec mkdir -p $backup_dir}
        # Backup pools datagroup with metadata
        set pools_backup_file "$backup_dir/${pools_datagroup}_$timestamp.backup"
        if {[catch {
            set pools_config [tmsh::get_config /ltm data-group internal $pools_datagroup]
            if {[llength $pools_config] > 0} {
                set fp [open $pools_backup_file w]
                puts $fp "# Backup of $pools_datagroup"
                puts $fp "# Created: [clock format [clock seconds]]"
                puts $fp "# Format: pool_name|sort_order"
                puts $fp "# Purpose: Pre-sync backup for rollback capability"
                puts $fp ""
                # Handle empty datagroups gracefully
                if {[catch {set records [tmsh::get_field_value [lindex $pools_config 0] "records"]} records_error]} {
                    puts $fp "# Datagroup is empty"
                } else {
                    foreach record $records {
                        set name [tmsh::get_name $record]
                        if {[catch {set data [tmsh::get_field_value $record "data"]} data_error]} {
                            set data ""
                        }
                        puts $fp "$name|$data"
                    }
                }
                close $fp
            }
        } error_msg]} {
            tmsh::log "WARNING: Dashboard sync - Could not backup pools datagroup: $error_msg"
        }
        # Backup alias datagroup
        set alias_backup_file "$backup_dir/${alias_datagroup}_$timestamp.backup"
        if {[catch {
            set alias_config [tmsh::get_config /ltm data-group internal $alias_datagroup]
            if {[llength $alias_config] > 0} {
                set fp [open $alias_backup_file w]
                puts $fp "# Backup of $alias_datagroup"
                puts $fp "# Created: [clock format [clock seconds]]"
                puts $fp "# Format: pool_name|alias"
                puts $fp "# Purpose: Pre-sync backup for rollback capability"
                puts $fp ""
                # Handle empty datagroups gracefully
                if {[catch {set records [tmsh::get_field_value [lindex $alias_config 0] "records"]} records_error]} {
                    puts $fp "# Datagroup is empty"
                } else {
                    foreach record $records {
                        set name [tmsh::get_name $record]
                        if {[catch {set data [tmsh::get_field_value $record "data"]} data_error]} {
                            set data ""
                        }
                        puts $fp "$name|$data"
                    }
                }
                close $fp
            }
        } error_msg]} {
            tmsh::log "WARNING: Dashboard sync - Could not backup alias datagroup: $error_msg"
        }
        # Cleanup old backup files to prevent disk space issues
        # Maintains most recent backups up to configured limit
        if {[catch {
            # Clean pools datagroup backups
            set pool_files [glob -nocomplain "$backup_dir/${pools_datagroup}_*.backup"]
            if {[llength $pool_files] > $max_backups} {
                set pool_files [lsort -decreasing $pool_files]
                foreach file [lrange $pool_files $max_backups end] {
                    catch {file delete $file}
                }
            }
            # Clean alias datagroup backups
            set alias_files [glob -nocomplain "$backup_dir/${alias_datagroup}_*.backup"]
            if {[llength $alias_files] > $max_backups} {
                set alias_files [lsort -decreasing $alias_files]
                foreach file [lrange $alias_files $max_backups end] {
                    catch {file delete $file}
                }
            }
        } error_msg]} {
            tmsh::log "WARNING: Dashboard sync - Error cleaning old backups: $error_msg"
        }
    }
    # Build tmsh record syntax for pools datagroup
    # Format: "pool_name" { data sort_order }
    set pool_records ""
    foreach pool_name [lsort [array names existing_pools]] {
        set sort_order $existing_pools($pool_name)
        if {$sort_order eq ""} {
            set sort_order 999  ; # Default for pools with missing sort order
        }
        append pool_records " \"$pool_name\" \{ data $sort_order \}"
    }
    # Build tmsh record syntax for alias datagroup
    # Spaces are converted to underscores
    set alias_records ""
    foreach pool_name [lsort [array names existing_aliases]] {
        set alias_value $existing_aliases($pool_name)
        if {$alias_value eq ""} {
            # Empty alias - create record without data field
            append alias_records " \"$pool_name\" \{ \}"
        } else {
            # Convert spaces to underscores
            set safe_alias [string map {" " "_"} $alias_value]
            append alias_records " \"$pool_name\" \{ data $safe_alias \}"
        }
    }
    # Apply datagroup updates
    if {[catch {
        # Update pools datagroup
        if {$pool_records ne ""} {
            tmsh::modify /ltm data-group internal $pools_datagroup records replace-all-with \{ $pool_records \}
        }
        # Update alias datagroup  
        if {$alias_records ne ""} {
            tmsh::modify /ltm data-group internal $alias_datagroup records replace-all-with \{ $alias_records \}
        }
        # Log successful synchronization
        set total_pools [array size existing_pools]
        set summary_msg "Dashboard sync - Completed successfully: $total_pools total pools"
        
        if {[llength $pools_added] > 0} {
            append summary_msg ", [llength $pools_added] added"
        }
        if {[llength $pools_removed] > 0} {
            append summary_msg ", [llength $pools_removed] removed"
        }
        if {[llength $aliases_updated] > 0} {
            append summary_msg ", [llength $aliases_updated] aliases updated"
        }
        tmsh::log $summary_msg
        # Log detailed change information
        if {[llength $pools_added] > 0} {
            tmsh::log "Dashboard sync - Added pools: [join $pools_added {, }]"
        }
        if {[llength $pools_removed] > 0} {
            tmsh::log "Dashboard sync - Removed pools: [join $pools_removed {, }]"
        }
        if {[llength $aliases_updated] > 0} {
            tmsh::log "Dashboard sync - Updated aliases: [join $aliases_updated {, }]"
        }
    } error_msg]} {
        tmsh::log "ERROR: Dashboard sync - Failed to update datagroups: $error_msg"
        return 1
    }
} else {
    # Log periodic execution even when no changes are needed
    # This provides operational visibility and confirms script is running
    set total_pools [array size existing_pools]
    set excluded_count [llength $excluded_pools]
    tmsh::log "Dashboard sync - No changes required: monitoring $total_pools pools, excluding $excluded_count patterns"
}
# SUCCESSFUL COMPLETION
# Script completed without errors
return 0
