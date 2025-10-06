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

### 3. Remove Existing Components (If Upgrading)

```bash
# Clean removal of existing components
tmsh delete sys icall handler periodic dashboard-pool-sync-handler 2>/dev/null
tmsh delete sys icall script dashboard-pool-sync 2>/dev/null
```

### 4. Install the iCall Script

**Create the script using tmsh:**

```bash
# Create script
tmsh create sys icall script dashboard-pool-sync

# Edit the script definition
tmsh edit sys icall script dashboard-pool-sync definition
```

When the editor opens, paste the complete script content and save (`:wq` in vi).

### 5. Configure Script Parameters

Edit the configuration section at the top of the script to customize:

```tcl
# Datagroup names - modify for your environment
set pools_datagroup "datagroup-dashboard-pools"
set alias_datagroup "datagroup-dashboard-pool-alias"

# Pool exclusion patterns
set excluded_pools {
    "dashboard-api-hosts_https_pool"
    "dashboard-dns_udp53_pool"
    "*_test_pool"
    "*_temp_pool"
}

# Feature toggles
set auto_generate_aliases 1     ; # 0 = disabled; 1 = enabled
set create_backups 1            ; # 0 = disabled; 1 = enabled
set max_backups 30              ; # Retention count
set description_max_length 255  ; # Alias truncation limit
```

### 6. Create Periodic Handler

```bash
# Schedule daily execution (86400 seconds = 24 hours)
tmsh create sys icall handler periodic dashboard-pool-sync-handler \
    script dashboard-pool-sync interval 86400 status active
```

### 7. Save and Test

```bash
# Save configuration
tmsh save sys config

# Test installation
tmsh run sys icall script dashboard-pool-sync
```

## Configuration Options

### Datagroup Names
Customize datagroup names for different environments:

```tcl
# Production environment
set pools_datagroup "prod-dashboard-pools"
set alias_datagroup "prod-dashboard-aliases"

# Development environment  
set pools_datagroup "dev-dashboard-pools"
set alias_datagroup "dev-dashboard-aliases"
```

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

### Description Processing
When auto-generation is enabled:
1. Trims whitespace
2. Capitalizes first letter
3. Truncates long descriptions (adds "...")
4. Converts spaces to underscores for storage

## Monitoring and Operations

### Useful Commands

Add to `/root/.bashrc` for convenient management:

```bash
# Dashboard sync operations
alias dashboard-sync='tmsh run sys icall script dashboard-pool-sync'
alias dashboard-logs='tail -f /var/log/ltm | grep "Dashboard sync"'
alias dashboard-status='tmsh show sys icall handler periodic dashboard-pool-sync-handler'

# View datagroup contents
alias dashboard-pools='tmsh list ltm data-group internal datagroup-dashboard-pools'
alias dashboard-aliases='tmsh list ltm data-group internal datagroup-dashboard-pool-alias'

# Troubleshooting
alias dashboard-errors='grep "ERROR: Dashboard sync" /var/log/ltm | tail -10'
alias dashboard-backups='ls -lt /var/tmp/dashboard_backups/'
```

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

## Dashboard Integration

### Frontend Considerations

**Reading Datagroups:**
Your dashboard should read from the configured datagroup names.

**Alias Display:**
Convert underscores back to spaces for user-friendly display:

```javascript
function formatAlias(alias) {
    return alias.replace(/_/g, ' ');
}
```

**Manual Alias Entry:**
When users manually set aliases:
- Accept normal text input with spaces
- Convert spaces to underscores before storing
- The sync script preserves manually set aliases

## Troubleshooting

### Installation Issues

**Datagroup Validation Errors:**
```bash
# Verify datagroups exist and are correct type
tmsh list ltm data-group internal datagroup-dashboard-pools
tmsh list ltm data-group internal datagroup-dashboard-pool-alias

# Check datagroup type
tmsh list ltm data-group internal datagroup-dashboard-pools type
```

**Script Not Running:**
```bash
# Check handler status
tmsh show sys icall handler periodic dashboard-pool-sync-handler

# Verify script exists
tmsh list sys icall script dashboard-pool-sync
```

### Operational Issues

**Missing Pools in Dashboard:**
1. Check if pools match exclusion patterns
2. Verify pools exist in LTM: `tmsh list ltm pool`
3. Run manual sync: `dashboard-sync`
4. Check logs: `dashboard-errors`

**Aliases Not Generated:**
1. Verify `auto_generate_aliases` is set to 1
2. Check if pools have descriptions: `tmsh list ltm pool POOLNAME description`
3. Confirm existing aliases are empty (script preserves manual entries)

### Configuration Changes

**Modify Datagroup Names:**
1. Create new datagroups with desired names
2. Update script configuration variables
3. Migrate data from old datagroups if needed
4. Test with manual sync

**Change Exclusion Patterns:**
1. Edit script configuration
2. Manually remove previously excluded pools if needed
3. Run manual sync to apply changes

### Recovery Procedures

**Restore from Backup:**
```bash
# List available backups
ls -lt /var/tmp/dashboard_backups/

# View backup content
cat /var/tmp/dashboard_backups/datagroup-dashboard-pools_20241005_143022.backup

# Manual restore (adapt to your backup format)
# Note: Backups are for reference; restore using tmsh modify commands
```

**Manual Pool Management:**
```bash
# Add pool manually
tmsh modify ltm data-group internal datagroup-dashboard-pools \
    records add { "new_pool" { data 100 } }

# Remove pool manually  
tmsh modify ltm data-group internal datagroup-dashboard-pools \
    records delete { "old_pool" }
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

**Create convenient alias:**

```bash
echo 'alias dashboard-restore="/usr/local/bin/dashboard-restore.sh"' >> /root/.bashrc
source /root/.bashrc
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

**Common Recovery Scenarios:**

```bash
# Quick recovery from latest backup
dashboard-restore latest

# Examine backup before restoring
dashboard-restore view
# Enter timestamp when prompted

# Emergency restore with custom datagroups
dashboard-restore latest emergency-pools emergency-aliases
```

### Recovery Procedures

**When to Use Restore:**
- Datagroup corruption detected
- Accidental manual modifications
- Sync script malfunction
- Rolling back changes

**Safety Features:**
- Automatic pre-restore backup creation
- Target datagroup validation
- Confirmation prompts before destructive operations
- Clear error messages and guidance

**Post-Restore Steps:**
1. Save F5 configuration: `tmsh save sys config`
2. Verify datagroup contents: `dashboard-pools`
3. Test dashboard functionality
4. Monitor next sync cycle: `dashboard-logs`

## Security Considerations

- Script runs with root privileges via iCall
- Backup files contain pool configuration data
- Ensure backup directory has appropriate permissions
- Review exclusion patterns to prevent sensitive pool exposure
- Restore script requires root access for tmsh operations
- Pre-restore backups provide additional recovery layer

## Monitoring and Maintenance

### Regular Tasks
- Monitor logs for errors: `dashboard-errors`
- Verify sync operations: `dashboard-logs`
- Check backup retention: `dashboard-backups`
- Verify restore script accessibility: `dashboard-restore --help`

### Backup Management
```bash
# Check backup disk usage
du -sh /var/tmp/dashboard_backups/

# Manual cleanup if needed (retain recent backups)
find /var/tmp/dashboard_backups/ -name "*.backup" -mtime +60 -delete

# Test restore capabilities monthly
dashboard-restore view
```

### Troubleshooting with Restore

**Datagroup Issues:**
```bash
# Check current state
dashboard-pools
dashboard-aliases

# Compare with recent backup
dashboard-restore view

# Restore if corruption detected
dashboard-restore latest
```

**Recovery from Failed Sync:**
```bash
# Check sync errors
dashboard-errors

# Restore to known good state
dashboard-restore 20241004_182245

# Investigate sync script issues
dashboard-status
```

## Upgrade Procedure

### Sync Script Upgrade
1. Test new script version in development environment
2. Create manual backup: `dashboard-sync`
3. Follow installation steps 3-4 to replace script
4. Test with manual sync
5. Monitor for 24-48 hours

### Restore Script Upgrade
1. Test new restore script in development
2. Backup current script: `cp /usr/local/bin/dashboard-restore.sh /usr/local/bin/dashboard-restore.sh.backup`
3. Install new version
4. Test restore functionality: `dashboard-restore --help`
5. Verify with backup preview: `dashboard-restore view`

### Emergency Recovery Plan

**Complete System Recovery:**
1. Verify backup files exist: `ls -la /var/tmp/dashboard_backups/`
2. Identify last known good backup timestamp
3. Restore datagroups: `dashboard-restore [timestamp]`
4. Save configuration: `tmsh save sys config`
5. Restart sync monitoring: `dashboard-status`
6. Document incident and root cause

**Rollback Procedure:**
1. Stop sync script: `tmsh modify sys icall handler periodic dashboard-pool-sync-handler status inactive`
2. Restore from backup: `dashboard-restore [timestamp]`
3. Save configuration: `tmsh save sys config`
4. Investigate issues before re-enabling sync
5. Re-enable sync: `tmsh modify sys icall handler periodic dashboard-pool-sync-handler status active`

---

**Installation Complete**

The F5 Dashboard Pool Sync system is now active with comprehensive backup and recovery capabilities. The system will automatically discover and synchronize LTM pools every 24 hours with full recovery options available through the restore script.
