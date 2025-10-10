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
- [Datagroup Recovery and Restore](#optional-datagroup-recovery-and-restore)
- [License](#license)
- [Disclaimer](#disclaimer)

## Overview

In the F5 Multisite Dashboard, there are two datagroups that must be managed when LTM pools are created or deleted from the system: `datagroup-dashboard-pools` and `datagroup-dashboard-pool-alias`. For most organizations, simply managing these datagroups via a pool commissioning/decommissioning process should be sufficient. For larger or more advanced deployments, an automated script that performs datagroup management would be preferable. 

This script runs as an iCall event and parses LTM pool configurations periodically. It compares the LTM pool configuration with the dashboard datagroup configuration to identify pools that exist in LTM but not in the dashboard or vice versa. It then rebuilds the two datagroups dynamically and the dashboard will update upon its next poll event. This script should be run on all Dashboard Front-ends and API-Hosts where automatic management of dashboard datagroups is desired. This script was released for Dashboard v1.8.

It is recommended to test and evaluate this script in your demo/lab/preproduction environment before deploying to production. 

## Installation Steps

### 1. Create Required Datagroups (if not already created)

The script requires two string-type datagroups. Datagroup names can be customized in the script configuration.

```bash
# Create default datagroups
tmsh create ltm data-group internal datagroup-dashboard-pools type string
tmsh create ltm data-group internal datagroup-dashboard-pool-alias type string
```

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

- If you have pools that you **do not** wish to display in the dashboard, these can be either explicitely excluded or excluded via a pattern. Note that once you exclude pools they will not be removed from the datagroups if they are already present. The exclusion feature will simply prevent them from being re-added during the iCall script run. You must manually remove excluded pools and aliases from the datagroups once you have set the desired exclusion parameters in this script.

- The script supports auto-alias generation using the description field of the LTM Pool. If you desire to use your current pool descriptors as dashboard aliases enable this feature. It will not overwrite aliases that are already present.

In vi edit the parameters of the script to suit your needs:

```tcl
# Target datagroup names
set pools_datagroup "datagroup-dashboard-pools"
set alias_datagroup "datagroup-dashboard-pool-alias"

# Backup configuration for change management and recovery
set create_backups 0          ; # 0 = disabled; 1 = enabled
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
set auto_generate_aliases 0   ; # 0 = disabled; 1 = enabled
set description_max_length 80 ; # Maximum characters in generated alias
```

### 5. Edit the script definition and handler in tmsh

Note: The script must be created before the handler.

```bash
In tmsh:

create sys icall script dashboard-pool-sync
** edit definition line in editor as you would in vi**

create sys icall handler periodic dashboard-pool-sync-handler { interval 86400 script dashboard-pool-sync }


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

Note: The Multisite Dashboard v1.8 Javascript UI Module will now replace added alias underscores with spaces for proper alias display.

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

---

## (OPTIONAL) Datagroup Recovery and Restore

### Install the Restore Script

The restore script provides datagroup recovery capabilities using dashboard-pool-sync backup files in the event that an administrator desires to revert to a previous dashboard datagroup configuration. **This process is only applicable if the backup feature has been enabled.**

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

### Restore Script Demo

**Environment:**
- F5 BIG-IP with dashboard pool sync running
- Current datagroups need to be restored from backup

**Backup Directory Contents:**
```bash
/var/tmp/dashboard_backups/
├── datagroup-dashboard-pools_20251006_115719.backup
└── datagroup-dashboard-pool-alias_20251006_115719.backup
```

### Viewing Available Backups

```bash
[root@f5-bigip-01 ~]# ./dashboard-restore.sh
=== Dashboard Datagroup Restore Tool ===

Available backups:

  20251006_115719 (2025-10-06 11:57:19)

TIP: Use './dashboard-restore.sh view' to see backup contents before restoring

Enter backup timestamp (YYYYMMDD_HHMMSS) or 'latest' for most recent:
```

### Viewing Backup Contents

```bash
[root@f5-bigip-01 ~]# ./dashboard-restore.sh view
=== Dashboard Datagroup Restore Tool ===

Available backups for viewing:

Recent backups:
  20251006_115719

Enter timestamp to view (or 'latest' for most recent):
latest
============================================
BACKUP CONTENTS FOR: 20251006_115719
============================================

POOLS (showing pool name and sort order):
--------------------------------------------
  Comcast-DNS_udp_pool                10
  Company-finance_https_pool          20
  Company-marketing_https_pool        30
  Company-portal_https_pool           40
  DISA-OCSP_Pool                      50
  Google.com_ICMP_pool                60
  IPv6_Pool                           70
  LAB-ASM_lorem_http_pool             80
  Lab-ASM-Hack-it-Server              90
  MSC_https_pool                      100
  Microsoft_PowerBI_http_pool         110
  SRX-Gateway_ICMP_pool               120
  SRX-Gateway_ssh_pool                130
  Palo_Alto-Panorama                  140
  dashboard-api-hosts_https_pool      150
  dashboard-dns_udp53_pool            160
  ACAS_Servers                        170
  Total pools: 17

ALIASES (showing pool name and display alias):
--------------------------------------------
  Comcast-DNS_udp_pool                
  Company-finance_https_pool          Sharepoint - Finance Web Front Ends
  Company-marketing_https_pool        Sharepoint - Marketing Web Front Ends
  Company-portal_https_pool           Sharepoint - Portal Web Front Ends
  DISA-OCSP_Pool                      DISA OCSP Server
  Google.com_ICMP_pool                
  IPv6_Pool                           
  LAB-ASM_lorem_http_pool             
  Lab-ASM-Hack-it-Server              
  MSC_https_pool                      
  Microsoft_PowerBI_http_pool         Microsoft PowerBI
  SRX-Gateway_ICMP_pool               
  SRX-Gateway_ssh_pool                
  Palo_Alto-Panorama                  Palo Alto Networks Panorama Servers
  dashboard-api-hosts_https_pool      
  dashboard-dns_udp53_pool            
  ACAS_Servers                        
  Total aliases: 17
```

### Successful Restore

```bash
[root@f5-bigip-01 ~]# ./dashboard-restore.sh 20251006_115719
=== Dashboard Datagroup Restore Tool ===

Available backups:

  20251006_115719 (2025-10-06 11:57:19)

TIP: Use './dashboard-restore.sh view' to see backup contents before restoring

Will restore from backup: 20251006_115719
Source files:
  Pools: /var/tmp/dashboard_backups/datagroup-dashboard-pools_20251006_115719.backup
  Aliases: /var/tmp/dashboard_backups/datagroup-dashboard-pool-alias_20251006_115719.backup

Target datagroups:
  Pools: datagroup-dashboard-pools
  Aliases: datagroup-dashboard-pool-alias

Backup preview:
============================================
BACKUP CONTENTS FOR: 20251006_115719
============================================

POOLS (showing pool name and sort order):
--------------------------------------------
  Comcast-DNS_udp_pool                10
  Company-finance_https_pool          20
  Company-marketing_https_pool        30
  Company-portal_https_pool           40
  DISA-OCSP_Pool                      50
  Google.com_ICMP_pool                60
  IPv6_Pool                           70
  LAB-ASM_lorem_http_pool             80
  Lab-ASM-Hack-it-Server              90
  MSC_https_pool                      100
  Microsoft_PowerBI_http_pool         110
  SRX-Gateway_ICMP_pool               120
  SRX-Gateway_ssh_pool                130
  Palo_Alto-Panorama                  140
  dashboard-api-hosts_https_pool      150
  dashboard-dns_udp53_pool            160
  ACAS_Servers                        170
  Total pools: 17

ALIASES (showing pool name and display alias):
--------------------------------------------
  Comcast-DNS_udp_pool                
  Company-finance_https_pool          Sharepoint - Finance Web Front Ends
  Company-marketing_https_pool        Sharepoint - Marketing Web Front Ends
  Company-portal_https_pool           Sharepoint - Portal Web Front Ends
  DISA-OCSP_Pool                      DISA OCSP Server
  Google.com_ICMP_pool                
  IPv6_Pool                           
  LAB-ASM_lorem_http_pool             
  Lab-ASM-Hack-it-Server              
  MSC_https_pool                      
  Microsoft_PowerBI_http_pool         Microsoft PowerBI
  SRX-Gateway_ICMP_pool               
  SRX-Gateway_ssh_pool                
  Palo_Alto-Panorama                  Palo Alto Networks Panorama Servers
  dashboard-api-hosts_https_pool      
  dashboard-dns_udp53_pool            
  ACAS_Servers                        
  Total aliases: 17

============================================
WARNING: This will replace current datagroups!
Type 'YES' to continue with restore:
YES

Starting restore process...

Verifying target datagroups...
Building pools datagroup records...
Building alias datagroup records...
Restoring pools datagroup...
Restoring alias datagroup...

============================================
RESTORE COMPLETED SUCCESSFULLY
============================================
Restored from backup: 20251006_115719
Target datagroups:
  Pools: datagroup-dashboard-pools
  Aliases: datagroup-dashboard-pool-alias

Use 'tmsh save sys config' to save the configuration

Restore completed successfully!
Don't forget to save the configuration: tmsh save sys config
```

### Debug Version

```bash
[root@f5-bigip-01 ~]# ./debug_restore_script_full.sh latest
=== Dashboard Datagroup Restore Tool - DEBUG VERSION ===

[...same interface but with additional debug output...]

DEBUG: Processing pools from /var/tmp/dashboard_backups/datagroup-dashboard-pools_20251006_115719.backup
DEBUG: Processing name='ACAS_Servers' data='170'
DEBUG: Added pool record: "ACAS_Servers" { data 170 }
DEBUG: Processing name='Comcast-DNS_udp_pool' data='10'
DEBUG: Added pool record:  "Comcast-DNS_udp_pool" { data 10 }

[...detailed processing continues...]

DEBUG: About to execute tmsh command for pools:
tmsh modify ltm data-group internal "datagroup-dashboard-pools" records replace-all-with { "ACAS_Servers" { data 170 } "Comcast-DNS_udp_pool" { data 10 } [... full command] }

DEBUG: About to execute tmsh command for aliases:
tmsh modify ltm data-group internal "datagroup-dashboard-pool-alias" records replace-all-with { "ACAS_Servers" { } "Comcast-DNS_udp_pool" { } [... full command] }

Restoring pools datagroup...
Restoring alias datagroup...

============================================
RESTORE COMPLETED SUCCESSFULLY
============================================
```

### Post-Restore Verification

```bash
[root@f5-bigip-01 ~]# tmsh save sys config
Saving running configuration...
 /config/bigip.conf
 /config/bigip_base.conf
 /config/bigip_user.conf

[root@f5-bigip-01 ~]# tmsh list ltm data-group internal datagroup-dashboard-pools 
ltm data-group internal datagroup-dashboard-pools {
    records {
        ACAS_Servers {
            data 170
        }
        Comcast-DNS_udp_pool {
            data 10
        }
        Company-finance_https_pool {
            data 20
        }
        Company-marketing_https_pool {
            data 30
        }
...

[root@f5-bigip-01 ~]# tmsh list ltm data-group internal datagroup-dashboard-pool-alias 
ltm data-group internal datagroup-dashboard-pool-alias {
    records {
        ACAS_Servers {
        }
        Comcast-DNS_udp_pool {
        }
        Company-finance_https_pool {
            data Sharepoint_-_Finance_Web_Front_Ends
        }
        Company-marketing_https_pool {
            data Sharepoint_-_Marketing_Web_Front_Ends
        }
...
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
