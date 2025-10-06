# F5 Dashboard Pool Sync iCall Script Installation Guide

## Overview

For the F5 Multisite Dashboard, there are two datagroups that must be managed as LTM pools are created or deleted from the system, datagroup-dashboard-pools and datagroup-dashboard-pool-alias. For most organizations, simply working management of these datagroups into their pool commissioning/decomissioning process should be sufficient. For larger deployments an automated script that performs datagroup management would be preferable. This script runs as an iCall event and parses LTM pool configurations periodically. It then compares the LTM pool configuration with the datagroup configuration to identify pools that exist in LTM but but in the dashboard or vice versa. It then rebuilds the two datagroups dynamically. 

The script supports a number of configurable options:
- Periodic datagroup backups
- The number of backup files
- Exclusion capability for pools that are not desired in dashboard
- The auto-generation of dashboard aliases using the value of the LTM pool description field

## Installation Steps

### 1. Create Required Datagroups (if not already created)

The script requires two string-type datagroups. **Datagroup names can be customized** in the script configuration.

```bash
# Create default datagroups
tmsh create ltm data-group internal datagroup-dashboard-pools type string
tmsh create ltm data-group internal datagroup-dashboard-pool-alias type string
```

### 2. Create Directories

```bash
# Create backup directory
mkdir -p /var/tmp/dashboard_backups
chmod 755 /var/tmp/dashboard_backups
```

### 3. Install the iCall Script

**Create the script**

```bash
# Create script
mkdir -p /config/icallscripts/dashboard
vi dashboard-pool-sync.tcl
```
When the editor opens, paste the complete 'dashboard-pool-sync.tcl' script content and save (`:wq` in vi).

### 4. Configure Script Parameters

In vi edit the parameters of the script to suit your needs:

```tcl
# Target datagroup names
set pools_datagroup "datagroup-dashboard-pools"
set alias_datagroup "datagroup-dashboard-pool-alias"

# Backup configuration for change management and recovery
set create_backups 1          ; # 0 = disabled; 1 = enabled
set max_backups 30            ; # Maximum backup files to retain per datagroup
set backup_dir "/var/tmp/dashboard_backups"  ; # Backup storage location

# Pool exclusion patterns
set excluded_pools {
    "*_test_pool"
    "*_temp_pool"
}

# Automatic alias generation from pool description fields
# When enabled, creates friendly names from pool descriptions for dashboard display
# Only updates aliases that are currently empty
set auto_generate_aliases 1   ; # 0 = disabled; 1 = enabled
set description_max_length 255 ; # Maximum characters in generated alias
```

### 5. Edit the script definition and handler in tmsh

```bash
sys icall handler periodic dashboard-pool-sync-handler {
    interval 86400
    script dashboard-pool-sync
}
sys icall script dashboard-pool-sync {
    app-service none
    definition {
        source /config/icallscripts/dashboard/dashboard-sync.tcl
    }
    description none
    events none
}
```

### 6. Save

```bash
# Save configuration
tmsh save sys config

## Configuration Options

### Feature Controls

**Auto-Generated Aliases**
- **Enabled (1)**: Creates aliases from pool descriptions automatically
- **Disabled (0)**: Leaves aliases empty for manual entry

**Backup Creation**
- **Enabled (1)**: Creates timestamped backups before changes
- **Disabled (0)**: Skips backup creation for faster execution

**Pool Exclusions**
Patterns to exclude from dashboard (supports wildcards):
- Specific names: `"my-special-pool"`
- Wildcard patterns: `"*_test_pool"`, `"temp_*"`

## Alias Processing

### Space Handling
Aliases containing spaces are converted to underscores for F5 compatibility:
- **Pool Description**: "Production Web Servers"
- **Stored Alias**: "Production_Web_Servers"
- **Dashboard Display**: Convert back to spaces in your UI

### Log Messages

**Successful Synchronization:**
```
Dashboard sync - Completed successfully: 15 total pools, 2 added, 1 removed
Dashboard sync - Added pools: web_prod_pool, api_v2_pool
```

**No Changes Required:**
```
Dashboard sync - No changes required: monitoring 15 pools, excluding 4 patterns
```

**Error Conditions:**
```
ERROR: Dashboard sync - Pools datagroup validation failed: Datagroup prod-pools does not exist
ERROR: Dashboard sync - Alias datagroup validation failed: Datagroup prod-aliases has wrong type: integer (expected: string)
```

### Pool Description Setup

For meaningful auto-generated aliases:

```bash
# Add descriptive pool descriptions
tmsh modify ltm pool web_prod_443 description "Production Web Servers - HTTPS"
tmsh modify ltm pool api_gateway_80 description "API Gateway Load Balancer"
tmsh modify ltm pool db_cluster_3306 description "Production Database Cluster"
```

## Recovery and Restore

### Install the Restore Script

The restore script provides recovery capabilities for the backup files created by the sync script.

**Create the restore script:**

```bash
# Create the restore script file
vi /usr/local/bin/dashboard-restore.sh
```

Copy the complete restore script content and save the file.

**Set permissions:**

```bash
chmod +x /usr/local/bin/dashboard-restore.sh
```

### Using the Restore Script

**Basic Usage:**

```bash
# View available backups
dashboard-restore

# Restore from latest backup
dashboard-restore latest

# Restore from specific backup
dashboard-restore 20241005_143022

# Preview backup contents
dashboard-restore view

# Use custom datagroup names
dashboard-restore latest prod-pools prod-aliases
```

