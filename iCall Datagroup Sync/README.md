# F5 Multisite Dashboard - iCall Datagroup Sync README

![License](https://img.shields.io/badge/license-MIT-green)
![F5 Compatible](https://img.shields.io/badge/F5%20BIG--IP-compatible-orange)
![TMOS Version](https://img.shields.io/badge/TMOS-15.0%2B-red)
![F5 LTM](https://img.shields.io/badge/F5-LTM%20Module-FF6600?logo=f5&logoColor=white)

## Overview

FIn the F5 Multisite Dashboard, there are two datagroups that must be managed as LTM pools are created or deleted from the system, **datagroup-dashboard-pools** and **datagroup-dashboard-pool-alias**. For most organizations, simply managing these datagroups via a pool commissioning/decomissioning process should be sufficient. For larger or more advanced deployments, an automated script that performs datagroup management would be preferable. This script runs as an iCall event and parses LTM pool configurations periodically. It compares the LTM pool configuration with the dashboard datagroup configuration to identify pools that exist in LTM but but in the dashboard or vice versa. It then rebuilds the two datagroups dynamically and the dashboard will update upon its next poll event.

The script supports a number of configurable options:
- Periodic datagroup backups
- The number of backup files
- Exclusion capability for pools that are not desired in dashboard
- The auto-generation of dashboard aliases using the value of the LTM pool description field

It is recommended to test and evaluate this script in your demo/lab/preproduction environment before deploying to production. 

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
```

## Configuration Options

### Feature Controls

**Auto-Generated Aliases**
- **Enabled (1)**: Creates aliases from LTM pool description field
- **Disabled (0)**: Leaves aliases empty for manual alias entry

**Backup Creation**
- **Enabled (1)**: Creates timestamped backups before changes
- **Disabled (0)**: Skips backup creation

**Pool Exclusions**
Patterns to exclude from dashboard (supports wildcards):
- Specific names: `"my-special-pool"`
- Wildcard patterns: `"*_test_pool"`, `"temp_*"`

## Alias Processing

### Space Handling
Aliases containing spaces are converted to underscores in order to prevent complex parsing and escaping processing:

- **Pool Description**: "Production Web Servers"
- **Stored Alias**: "Production_Web_Servers"
- 

Note: The Multisite Dashboard v1.8 UI Module will now replace underscores with spaces for proper alias display.

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
# Add descriptive LTM pool descriptions
tmsh modify ltm pool web_prod_443 description "Production Web Servers - HTTPS"
tmsh modify ltm pool api_gateway_80 description "API Gateway Load Balancer"
tmsh modify ltm pool db_cluster_3306 description "Production Database Cluster"
```

## Recovery and Restore

### Install the Restore Script

The restore script provides recovery capabilities for the datagroup backup files created by the sync script in the event that an administrator desires to revert to a previous configuration.

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
# Interactive mode
dashboard-restore

# Restore from latest backup
dashboard-restore latest

# Restore from specific backup
dashboard-restore 20241005_143022

# Preview backup contents
dashboard-restore view

```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Disclaimer

- This solution is **NOT** officially endorsed, supported, or maintained by F5 Inc.
- F5 Inc. retains all rights to their trademarks, including but not limited to "F5", "BIG-IP", "LTM", "APM", and related marks
- This is an independent, community-developed solution that utilizes F5 products but is not affiliated with F5 Inc.
- For official F5 support and solutions, please contact F5 Inc. directly

**Technical Disclaimer**

- This software is provided "AS IS" without warranty of any kind
- The authors and contributors are not responsible for any damages or issues that may arise from its use
- Always test thoroughly in non-production environments before deployment
- Backup your F5 configuration before implementing any changes
- Review and understand all code before deploying to production systems

By using this software, you acknowledge that you have read and understood these disclaimers and agree to use this solution at your own risk.
