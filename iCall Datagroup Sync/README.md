# F5 Multisite Dashboard - iCall Datagroup Sync

![License](https://img.shields.io/badge/license-MIT-green)
![F5 Compatible](https://img.shields.io/badge/F5%20BIG--IP-compatible-orange)
![TMOS Version](https://img.shields.io/badge/TMOS-15.0%2B-red)
![F5 LTM](https://img.shields.io/badge/F5-LTM%20Module-FF6600?logo=f5&logoColor=white)

## Table of Contents

- [Overview](#overview)
- [Installation Steps](#installation-steps)
- [Configuration Options](#configuration-options)
- [Alias Processing](#alias-processing)
- [License](#license)
- [Disclaimer](#disclaimer)

## Overview

In the F5 Multisite Dashboard, there are two datagroups that must be managed when LTM pools are created or deleted from the system: `/Common/dashboard/datagroup-dashboard-pools` and `/Common/dashboard/datagroup-dashboard-pool-alias`. For most organizations, simply managing these datagroups via a pool commissioning/decommissioning process should be sufficient. For larger or more advanced deployments, an automated script that performs datagroup management would be preferable. 

This script runs as an iCall event and parses LTM pool configurations periodically across all partitions. It compares the LTM pool configuration with the dashboard datagroup configuration to identify pools that exist in LTM but not in the dashboard or vice versa. It then updates the two datagroups and the dashboard reflects the change on its next poll. Pools in `/Common` are written as bare names; pools in any other partition are written as full paths (`/dmz/web-pool`). The `excluded_partitions` setting is the ongoing control for which partitions appear on the dashboard.

The datagroups live in a device-local folder that is excluded from config sync, so the periodic writes never leave manual-sync clusters showing Changes Pending. Each device runs its own copy of this script and maintains its own datagroups. This script should be run on all Dashboard Front-ends and API-Hosts where automatic management of dashboard datagroups is desired. This version of the script requires Dashboard v2.0.

It is recommended to test and evaluate this script in your demo/lab/preproduction environment before deploying to production. 

## Installation Steps

### 1. Create Required Datagroups (if not already created)

The script requires two string-type datagroups inside the dashboard device-local folder. Datagroup paths can be customized in the script configuration.

```bash
# Create the device-local folder (excluded from config sync) and the datagroups
tmsh create sys folder /Common/dashboard device-group none traffic-group none
tmsh create ltm data-group internal /Common/dashboard/datagroup-dashboard-pools type string
tmsh create ltm data-group internal /Common/dashboard/datagroup-dashboard-pool-alias type string
tmsh save sys config
```

If you are migrating from a 1.x install where these datagroups lived directly in `/Common`, create the folder and new datagroups first, then update the iRules, then delete the old datagroups. Updating the iRules before the new datagroups exist and are populated causes every dashboard request to fail until they do.

### 2. Create Backup Directory

This step can be skipped if you do not plan to use the datagroup backup feature.

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
vi /config/icallscripts/dashboard/dashboard-pool-sync.tcl
```
When the editor opens, paste the complete 'dashboard-pool-sync.tcl' script content and save (`:wq` in vi).

### 4. Configure Script Parameters

The dashboard-pool-sync.tcl script contains editable parameters that offer various functional options.

- If custom datagroup names are used for your dashboard configurations they can be edited

- If datagroup backups are desired, this can be enabled and the number of backup files and the backup location can be set

- If you have pools that you **do not** wish to display in the dashboard, these can be either explicitly excluded or excluded via a pattern. Note that once you exclude pools they will not be removed from the datagroups if they are already present. The exclusion feature will simply prevent them from being re-added during the iCall script run. You must manually remove excluded pools and aliases from the datagroups once you have set the desired exclusion parameters in this script.

- If you have entire partitions you do not wish to display, list them in `excluded_partitions`. Partition exclusion behaves differently from pool exclusion: it is authoritative, and existing datagroup entries from a newly-excluded partition are removed automatically on the next run. `Common` cannot be excluded.

- The script supports auto-alias generation using the description field of the LTM Pool. If you desire to use your current pool descriptors as dashboard aliases enable this feature. It will not overwrite aliases that are already present.

In vi edit the parameters of the script to suit your needs:

```tcl
# Target datagroup names (device-local folder, excluded from config sync)
set pools_datagroup "/Common/dashboard/datagroup-dashboard-pools"
set alias_datagroup "/Common/dashboard/datagroup-dashboard-pool-alias"

# Backup configuration for change management and recovery
set create_backups 1          ; # 0 = disabled; 1 = enabled
set max_backups 30            ; # Maximum backup files to retain per datagroup
set backup_dir "/var/tmp/dashboard_backups"  ; # Backup storage location

# Pool exclusion patterns (prevent addition; never remove existing entries)
set excluded_pools {
    "*_test_pool"
    "*_temp_pool"
}

# Partition exclusion (authoritative: removes existing entries on next run)
set excluded_partitions {
    "lab-test"
}

# Automatic alias generation from pool description fields
# When enabled, creates friendly names from pool descriptions for dashboard display
# Only updates aliases that are currently empty
set auto_generate_aliases 1   ; # 0 = disabled; 1 = enabled
set description_max_length 255 ; # Maximum characters in generated alias
```

### 5. Edit the script definition and handler in tmsh

Note: The script must be created before the handler.

In tmsh, create the script object first. This opens an editor; set the definition to source the script file, then save and exit as you would in vi.

```bash
create sys icall script dashboard-pool-sync
```

Then create the periodic handler:

```bash
create sys icall handler periodic dashboard-pool-sync-handler { interval 86400 script dashboard-pool-sync }
```

The resulting configuration should look like this:

```bash
sys icall handler periodic dashboard-pool-sync-handler {
    interval 86400
    script dashboard-pool-sync
}
sys icall script dashboard-pool-sync {
    app-service none
    definition {
        source /config/icallscripts/dashboard/dashboard-pool-sync.tcl
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

### 7. Repeat this process on other devices in the cluster:

- Create the `/var/tmp/dashboard_backups` directory
- Create the `/config/icallscripts/dashboard` directory
- Create the `dashboard-pool-sync.tcl` script


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
Aliases containing spaces are converted to underscores in order to prevent complex parsing and escaping processing in tmsh:

- **Pool Description**: "Production Web Servers"
- **Stored Alias**: "Production_Web_Servers"

Note: The Multisite Dashboard Javascript UI Module replaces alias underscores with spaces for display.

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
ERROR: Dashboard sync aborted - /Common/dashboard/datagroup-dashboard-pools contains 17 records but zero parsed; record iteration is broken on this TMOS version
```

The last error is a safety abort: if a populated datagroup reads back as zero records, the script stops rather than renumbering every sort order and clearing every alias.

### Pool Description Setup

For meaningful auto-generated aliases:

```bash
# Add descriptive LTM pool descriptions
tmsh modify ltm pool web_prod_443 description "Production Web Servers - HTTPS"
tmsh modify ltm pool api_gateway_80 description "API Gateway Load Balancer"
tmsh modify ltm pool db_cluster_3306 description "Production Database Cluster"
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
