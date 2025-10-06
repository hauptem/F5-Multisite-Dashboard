# F5 Dashboard Pool Sync Installation Guide

**Automated LTM pool synchronization with configurable datagroup names and comprehensive validation**

## Overview

This system automatically synchronizes F5 LTM pools with dashboard datagroups, providing:
- Daily pool discovery and synchronization
- Configurable datagroup names for different environments
- Automatic alias generation from pool descriptions
- Comprehensive backup and recovery capabilities
- Production-ready error handling and validation

## Prerequisites

- F5 LTM with iCall support
- Root access to F5 command line
- Dashboard frontend configured to read from datagroups

## Installation Steps

### 1. Create Required Datagroups

The script requires two string-type datagroups. **Datagroup names can be customized** in the script configuration.

```bash
# Create default datagroups (modify names if needed)
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

When the editor opens, paste the complete dashboard-pool-sync.tcl script content and save (`:wq` in vi).

### 4. Configure Script Parameters

In vi edit the parameters of the script to suit your needs:

```tcl
# Datagroup names - modify for your environment
set pools_datagroup "datagroup-dashboard-pools"
set alias_datagroup "datagroup-dashboard-pool-alias"

# Pool exclusion patterns
set excluded_pools {
    "*_test_pool"
    "*_temp_pool"
}

# Feature toggles
set auto_generate_aliases 0     ; # 0 = disabled; 1 = enabled
set create_backups 0            ; # 0 = disabled; 1 = enabled
set max_backups 30              ; # Retention count
set description_max_length 255  ; # Alias truncation limit
```

### 5. Edit the script definition and handler

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

