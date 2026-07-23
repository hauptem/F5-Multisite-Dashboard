# Release Notes

## 1.8 (Fall 2025)

Dashboard 1.8 does not support partitions other than Common. The 1.8 release will remain in the repo as the last main release before the 2.0 rework.

## 2.0 (July 2026)

Dashboard 2.0 adds multi-partition support. All components must be upgraded together: frontend iRule, API-Host iRules, iCall script, all iFiles, and all datagroups. There is no compatibility with 1.x components. The first poll after upgrade re-baselines member state for partitioned pools and resets any pending acknowledgments one time. No action is required.

- Pools from any partition can now be monitored alongside Common pools in the same grid. The full path (/dmz/web-pool) is the pool identifier used in datagroups, aliases, headers, and state tracking. Common pools continue to use the bare name, so Common-only deployments keep their member state, acknowledgments, and sort orders through the upgrade
- The JSON response includes a new partition field on every pool. The client requires this field and will report a deployment error if a 1.x iRule is still serving a site
- The grid sorts Common pools first, then remaining partitions alphabetically. Sort order and custom ordering still apply within each partition
- When actual pool names are displayed, pools outside Common show their full path (/dmz/web-pool) so partition membership is visible at a glance. Aliases display unchanged; hovering an aliased pool shows the full path in the tooltip
- Partition names are searchable, so there is no partition selector in the UI. Searching dmz shows that partition, dmz AND web narrows it to matching pools, and NOT removes anything unwanted from the results. Search-filtered views scope the backend polling to visible pools, same as before
- Member state is tracked per partition. The same pool name with the same member IP:port in two partitions will not cross-contaminate status, acknowledgments, or history
- Drag reordering is limited to pools within the same partition. Cross-partition drops are ignored and the drop highlight is not shown on invalid targets
- The logger pool column shows the full path for partitioned pools so log entries are unambiguous
- Fixed: clicking to acknowledge a status change on a route-domain member (172.16.32.1%2) silently failed. A validation check misread route-domain addresses as hostnames and rejected them. This bug existed in 1.x; partitioned deployments were the first to hit it
- iRule pool name parsing handles folders (/Common/appA/web-pool parses to pool name appA/web-pool). Malformed datagroup entries such as /dmz/ are logged and skipped
- The pool name limit in optimization headers was raised from 100 to 255 characters to fit full partition paths. Names over the old limit were silently dropped, which could disable scoped polling
- The iCall sync script now discovers pools in all partitions and writes full-path names, constructed from the parsed partition and pool name so tmsh output format differences between TMOS versions cannot produce malformed entries. A new excluded_partitions setting hides entire partitions from the dashboard. Note that partition exclusion also removes existing datagroup entries on the next run, while the existing pool exclusion patterns still only prevent new additions
- The pools and alias datagroups moved to /Common/dashboard, a device-local folder excluded from config sync. Automated writes to these datagroups no longer leave manual-sync clusters showing Changes Pending. When migrating, create the folder and datagroups and run discovery before updating the iRules, otherwise requests will fail until the datagroups exist. Expect a brief member-down blip per API host during the migration
- The iCall script now aborts if a populated datagroup reads back as zero records rather than silently renumbering sort orders and clearing aliases. Pool descriptions used for alias generation are stripped of characters that would break the tmsh record syntax
- The bash discovery script was rewritten to match: all partitions, exclusion lists, and merge behavior that preserves existing sort orders and aliases across runs. A dry-run flag (-n) shows what would change without writing anything
- HTML output is now escaped wherever external data lands in the page, including resolved DNS hostnames and logger entries. Previously a hostile PTR record could inject markup
- Grid and micro view CSS was removed from dashboard.css. These styles are injected by the UI module, which is now their only source. Theme changes in the stylesheet cannot affect grid layout
- General cleanup: dead code removed across the modules and old changelog-style comment markers (ADDED, MODIFIED, CRITICAL FIX) replaced with comments explaining why the code works the way it does
