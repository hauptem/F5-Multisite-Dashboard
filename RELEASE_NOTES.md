# Multi-Site Dashboard v2.0 Release Notes

**Multi-Partition Support**
- Pools from any partition display in the single grid. The full path (/dmz/web-pool) is the pool identifier in datagroups, alias lookups, and optimization headers; Common pools keep the bare name, so Common-only deployments carry their member state, acknowledgments, and sort orders through the upgrade unchanged
- Grid groups by partition: Common first, remaining partitions A-Z. Custom order and sort_order apply within each partition
- Actual-name display shows the full path for pools outside Common so partition membership is visible at a glance. Alias display is unchanged; the tooltip on an aliased pool shows the full path
- Partition names are searchable and search is the partition filter - dmz shows the partition, dmz AND web narrows it, NOT trims unwanted matches. No partition selector was added. Search terms match anywhere in pool data, so a partition name that overlaps member hostnames (a lab partition in a lab.local domain) pulls in extra pools; NOT common cleans that up
- Member state, acknowledgments, and history are keyed per partition. The same pool name with the same member IP:port in two partitions tracks independently - a flap in one never marks or acknowledges the other
- Logger entries show the full path for partitioned pools
- Reordering is constrained to the pool's own partition group. Cross-partition drops are ignored and the drop highlight is withheld from invalid targets, since the partition grouping would override the swapped order anyway
- iRule pool parsing is folder-safe: partition is the second path segment, pool name is every trailing segment rejoined, so /Common/appA/web-pool yields appA/web-pool instead of colliding every pool in a folder onto one name. Malformed entries (/dmz/, //pool) log PARTITION_ERROR and are skipped
- Header pool-name limit raised 100 to 255 for full paths. Over-length names were silently dropped from the filtered list; an emptied list falls back to full-site polling, quietly defeating the scoped-poll optimization
- JSON response carries a partition field on every pool. The client hard-requires it and reports a deployment error naming the pool when it is absent - a missing field means a 1.x iRule is still serving that site

**Datagroups and Discovery**
- The pools and alias datagroups moved to /Common/dashboard, a device-local folder excluded from config sync. Automated datagroup writes no longer leave manual-sync clusters showing Changes Pending; each device's sync maintains its own copy. The iRules reference the new location through static variables, which mcpd's dependency validation cannot see - nothing prevents deleting a datagroup an iRule still needs, so upgrade order matters (see Upgrading)
- iCall: discovers pools across all partitions and writes canonical names. New excluded_partitions setting hides entire partitions; exclusion is authoritative and existing entries from a newly-excluded partition are removed on the next run. Pool exclusion patterns remain add-only and never remove existing entries. Common cannot be excluded
- iCall: aborts when a populated datagroup reads back as zero records instead of proceeding - proceeding would renumber every sort order and clear every alias while logging a summary indistinguishable from a bootstrap
- iCall: pool descriptions used for alias auto-generation are stripped of braces, quotes, backslashes, and semicolons; these embed unquoted in the generated tmsh record syntax and one decorated description previously corrupted the entire datagroup write
- bash discovery script: multi-partition discovery with the same exclusion controls, merge semantics that preserve hand-tuned sort orders and aliases across runs (the previous version rebuilt both from scratch on every run), a dry-run flag (-n) that prints every add/keep/remove decision without writing, and an abort on the same populated-but-zero-parsed condition as the iCall

**Security**
- All external data rendered into the page is HTML-escaped: pool names, aliases, tooltips, member addresses, backend error fields, and logger lines including their sessionStorage re-injection. Resolved DNS hostnames previously flowed into innerHTML unescaped, so a hostile PTR record could inject markup into the dashboard

**Bug Fixes**
- Acknowledging a status change on a route-domain member (10.1.1.1%2) silently failed - an input check misread route-domain addresses as hostnames and rejected the acknowledgment. Present since 1.x; partitioned deployments were the first to use route domains and hit it
- Duplicate Dashboard.logger.toggleExpand definition removed. The module defined the function twice and the second silently overrode the first; the dead copy is gone and behavior is unchanged
- Grid and micro-view structural CSS removed from dashboard.css and all Theme1 color variants. The rules duplicated the set injected at runtime by the UI module, which already won by source order; the UI module is now the sole owner of grid structure and theme work in the stylesheet cannot break grid layout
