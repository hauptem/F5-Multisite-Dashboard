# Multi-Site Dashboard v2.1 Release Notes

**iRules**
- send_error_response now logs its debug_message argument when the client is debug-listed. Eight call sites passed diagnostic text that was never written anywhere
- Non-integer sort_order values in datagroup-dashboard-pools broke the JSON for the whole site response. Guarded with string is integer -strict, fallback 999
- Non-integer order values in datagroup-dashboard-sites aborted page generation in lsort -integer. Same guard
- JSON schema version 2.1

**JavaScript**
- Member state was keyed without a site component and never cleared on site change, so switching sites logged false status changes for any member IP:port that existed at both. changeSite saves the outgoing site's states and custom order, clears them, and loads the incoming site's
- sessionStorage keys were prefixed with a per-load instance ID, so nothing survived a reload and every reload left the previous load's entries behind. Keys now use a fixed dashboard_ prefix
- Hostname cache reads and writes are one per poll instead of one per member. Logger entries are held in memory and flushed once per tick instead of rewriting the full log per entry; a mass outage on a large site previously ran the tab out of memory
- Sites without a saved view mode open in the cookie preference; site selection previously forced micro
- Reset State also clears the current site's stored member states
- Resolve with more than 3200 unique member IPs sends the first 3200 and warns in the console. The iRule rejects more than 50 headers, so such a request previously resolved nothing
- Storage quota: saving member states at quota recursed into its own emergency cleanup until the tab died. Cleanup now runs once, evicts other sites' stored states, and retries. The outgoing site's pool snapshot is dropped on site change, and a failed snapshot write is logged instead of surfacing as a poll error
- Member addresses display without the route domain suffix (60.1.1.1:443, not 60.1.1.1%1:443) in the grid and the logger. The address tooltip, state keys, acknowledgments, and DNS requests keep the full address
- beforeunload cleanup was registered before the handler was defined. The fallback wake lock no longer sends HEAD /api/health to the Frontend, which has no such route. Bottom-bar buttons are matched by class, not by button text
- Modules cleaned up: drag-and-drop moved from data to ui, view mode persistence from core to data, mergeWithHostnameCache from client to data. The queue and shims for a missing logger module are gone (the logger is a required iFile), along with the unused retry, parse, stub, and incremental-render code. No behavior change

**Scripts**
- bash discovery: the two tmsh modify writes are checked. A failed write previously printed the success summary and exited 0
- iCall: aborts without writing when discovery returns no pools or every pool is excluded. Both cases previously removed every datagroup entry

# Multi-Site Dashboard v2.0 Release Notes

**Multi-Partition Support**
- Pools from any partition display in the single grid. The full path (/dmz/web-pool) is the pool identifier in datagroups, alias lookups, and optimization headers; Common pools keep the bare name, so Common-only deployments carry their member state, acknowledgments, and sort orders through the upgrade unchanged
- Grid groups by partition: Common first, remaining partitions A-Z. Custom order and sort_order apply within each partition
- Actual-name display shows the full path for pools outside Common so partition membership is visible at a glance. Alias display is unchanged; the tooltip on an aliased pool shows the full path
- Partition names are searchable and search is the partition filter
- Member state, acknowledgments, and history are keyed per partition. The same pool name with the same member IP:port in two partitions tracks independently
- Logger entries show the full path for partitioned pools
- Reordering is constrained to the pool's own partition group. Cross-partition drops are ignored and the drop highlight is withheld from invalid targets
- iRule pool parsing is folder-safe: partition is the second path segment, pool name is every trailing segment rejoined, so /Common/appA/web-pool yields appA/web-pool instead of colliding every pool in a folder onto one name. Malformed entries (/dmz/, //pool) log PARTITION_ERROR and are skipped
- Header pool-name limit raised 100 to 255 for full paths. Over-length names were silently dropped from the filtered list; an emptied list falls back to full-site polling, quietly defeating the scoped-poll optimization
- JSON response carries a partition field on every pool. The client hard-requires it and reports a deployment error naming the pool when it is absent

**Datagroups and Discovery**
- The pools and alias datagroups moved to /Common/dashboard, a device-local folder excluded from config sync. Automated datagroup writes no longer leave manual-sync clusters showing Changes Pending; each device's sync maintains its own copy. The iRules reference the new location through static variables, which mcpd's dependency validation cannot see
- iCall: discovers pools across all partitions and writes canonical names. New excluded_partitions setting hides entire partitions; exclusion is authoritative and existing entries from a newly-excluded partition are removed on the next run. Pool exclusion patterns remain add-only and never remove existing entries. The Common partition cannot be excluded
- iCall: aborts when a populated datagroup reads back as zero records instead of proceeding - proceeding would renumber every sort order and clear every alias while logging a summary indistinguishable from a bootstrap
- iCall: pool descriptions used for alias auto-generation are stripped of braces, quotes, backslashes, and semicolons; these embed unquoted in the generated tmsh record syntax and one decorated description previously corrupted the entire datagroup write
- bash discovery script: multi-partition discovery with the same exclusion controls, merge semantics that preserve hand-tuned sort orders and aliases across runs (the previous version rebuilt both from scratch on every run), a dry-run flag (-n) that prints every add/keep/remove decision without writing, and an abort on the same populated-but-zero-parsed condition as the iCall

**Security**
- All external data rendered into the page is HTML-escaped: pool names, aliases, tooltips, member addresses, backend error fields, and logger lines including their sessionStorage re-injection. 

**Bug Fixes**
- Acknowledging a status change on a route-domain member (10.1.1.1%2) silently failed - an input check misread route-domain addresses as hostnames and rejected the acknowledgment. Present since 1.x; partitioned deployments were the first to use route domains and hit it
- Duplicate Dashboard.logger.toggleExpand definition removed. The module defined the function twice and the second silently overrode the first; the dead copy is gone and behavior is unchanged
- Grid and micro-view structural CSS removed from dashboard.css and all Theme1 color variants. The rules duplicated the set injected at runtime by the UI module, which already won by source order; the UI module is now the sole owner of grid structure and theme work in the stylesheet cannot break grid layout
