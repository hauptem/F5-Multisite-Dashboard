# Release Notes

## 1.8 (Fall 2025)

Dashboard 1.8 does not support partitions other than Common. The 1.8 release will remain in the repo as the last stable release before the 2.0 rework.

## 2.0 (July 2026)

Dashboard 2.0 adds multi-partition support. The frontend iRule, API-Host iRules, iCall script, iFiles, and datagroups must all be upgraded together. **1.8 and 2.0 components are not compatible with each other.**

### New Features

- Pools in any partition can be monitored alongside Common pools in a single grid
- Partitioned pools are identified by their full path (/dmz/web-pool) in datagroups, aliases, and optimization headers. Common pools continue to use the bare name
- The grid groups pools by partition: Common first, then remaining partitions alphabetically. Sort order and drag reordering apply within each partition
- In actual name display mode, partitioned pools show their full path so partition membership is visible at a glance. Alias display is unchanged, and the tooltip on an aliased pool shows the full path
- Partition names are searchable and search is the partition filter. dmz shows that partition, dmz AND web narrows it, NOT excludes unwanted matches. There is no separate partition selector
- Status changes, acknowledgments, and history are tracked per partition. Two pools with the same name in different partitions are fully independent
- Logger entries show the full path for partitioned pools
- The iCall sync script discovers pools in all partitions. A new excluded_partitions setting removes entire partitions from the dashboard; excluded partitions are cleaned out of the datagroups on the next sync run
- The bash discovery script supports the same multi-partition discovery and exclusions, merges with existing datagroup content instead of rebuilding it, and adds a dry-run flag (-n)

### Changes

- The pools and alias datagroups moved to /Common/dashboard, a device-local folder excluded from config sync. Automated datagroup writes no longer leave manual-sync clusters showing Changes Pending
- The pool name limit in X-Need-Pools headers increased from 100 to 255 characters to accommodate full partition paths
- Grid and micro view CSS is injected by the UI module and was removed from dashboard.css. Theme customization in the stylesheet can no longer affect grid layout
- The iCall script validates its datagroup reads and aborts rather than proceeding with empty data, and sanitizes pool descriptions before using them as aliases
- Malformed pool datagroup entries (for example /dmz/ with no pool name) are logged and skipped rather than rendered

### Fixes

- Acknowledging a status change on a route-domain member (10.1.1.1%2) failed silently. Route-domain addresses were misidentified as hostnames by an input check. This bug existed in 1.x but only surfaced in deployments using route domains
- All external data rendered into the page is now HTML-escaped, including resolved DNS hostnames, backend error messages, and logger entries. Previously a malicious PTR record could inject markup into the dashboard

### Upgrading

Upgrade all components together. On each device, create the /Common/dashboard folder and datagroups and run pool discovery before updating the iRules; an iRule that references the new datagroup location before it exists will fail every request until discovery runs. Expect each API host to be briefly marked down during its migration and to recover within one monitor interval.

The first poll after upgrade establishes new state baselines for partitioned pools, which resets any pending acknowledgments once. Common-only deployments retain their member state, acknowledgments, and sort orders. No other migration steps are required.
