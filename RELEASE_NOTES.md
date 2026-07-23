# Release Notes

## 2.0 (July 2026)

Dashboard 2.0 adds multi-partition support.

### New Features

- Pools in any partition can be monitored alongside Common pools in a single grid
- Partitioned pools are identified by their full path (/dmz/web-pool) in datagroups, aliases, and optimization headers. Common pools continue to use the bare pool name
- The UI grid groups pools by partition: Common first, then remaining partitions alphabetically. Sort order and drag reordering apply only within each partition
- In actual name display mode, partitioned pools show their full path so partition membership is visible at a glance. Alias display is unchanged, and the tooltip on an aliased pool shows the full pool name
- Partition names are searchable.
- Status changes, acknowledgments, and history are tracked per partition. Two pools with the same name in different partitions are fully independent
- Logger entries show the full path for partitioned pools
- The iCall sync script discovers pools in all partitions. A new excluded_partitions setting removes entire partitions from the dashboard
- The single use bash discovery script supports the same multi-partition discovery and exclusions, merges with existing datagroup content instead of rebuilding it, and adds a dry-run flag (-n)

### Changes

- The pools and alias datagroups moved to /Common/dashboard, a device-local folder excluded from config sync. Automated datagroup iCall writes no longer leave manual-sync clusters showing 'Changes Pending' when iCall makes a change. Note that this method shift also means pool names and aliases will not sync. Therefore it is recommended to use the "derive aliases from pool description" feature if you desire sync.
- The pool name limit in X-Need-Pools headers increased from 100 to 255 characters to accommodate full partition path names
- Grid and micro view CSS is injected by the UI module and was removed from dashboard.css where it was orphaned in version 1.7. Theme customization in the stylesheet can no longer affect grid layout at all.
- The iCall script validates its datagroup reads and aborts rather than proceeding with empty data, and sanitizes pool descriptions before installing them as aliases

### Fixes

- Acknowledging a status change on a route-domain member (10.1.1.1%2) failed silently. Route-domain addresses were misidentified as hostnames by a UI input check. This bug existed in 1.x but only surfaced in deployments using route domains with domain identifiers.
- All external data rendered into the dashboard page is now HTML-escaped, including resolved DNS hostnames, backend error messages, and logger entries.

---

## 1.8 (Fall 2025)

Dashboard 1.8 does not support partitions other than Common. The 1.8 release will remain in the repo as the last stable release before the 2.0 rework.
