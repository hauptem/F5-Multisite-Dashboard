# F5 Multisite Dashboard 2.1 (September 5 2026)

![License](https://img.shields.io/badge/license-MIT-green)
![TMOS Version](https://img.shields.io/badge/TMOS-17.x%20%7C%2021.x-red)
![F5 iRules](https://img.shields.io/badge/F5-iRules%20(Tcl)-FF6600?logo=f5&logoColor=white)
![No Framework](https://img.shields.io/badge/Framework-Vanilla%20JS-success?logo=javascript&logoColor=white)

## What's New in 2.0 

Dashboard 2.0 brought multi-partition support. Dashboard 2.1 is a bugfix and maintenance release. No new features have been added, but the client javascript modules have been made more performant with regard to memory and error handling.

### Upgrading

When upgrading dashboard versions, ensure to install the same version for all files: CSS, Javascript, and iRules. **Mixing dashboard files with different versions is not recommended.** See release notes for details.

- [Release Notes](RELEASE_NOTES.md) 

---

## Dashboard Overview

When an application is degraded, you need to know which pool members are down across all your data centers without logging into each F5 to check. This dashboard answers that question in about ten seconds.

It's a browser-based monitoring application that provides near real-time visibility into F5 BIG-IP pool member status across unlimited sites. It runs entirely from the F5 devices themselves in the dataplane: no external servers, no databases, no agents. Upload seven files, configure eight data groups, apply two iRules, and you're operational in about thirty minutes.

The architecture is distributed rather than centralized. Each F5 site can operate as a Dashboard Frontend (serving the interface and aggregating data), an API Host (providing pool data via JSON endpoints), or both. Sites communicate directly with each other, so there is no central monitoring server to bottleneck and the design scales horizontally without redesign.

Traditional monitoring polls everything, stores everything, and filters when queried. This dashboard inverts that model: the client tells the backend exactly what it needs each cycle. If a search for "sharepoint" shows three matching pools out of two hundred configured, the next poll queries only those three pools, and the backend skips the other 197 entirely.

The BIG-IPs remain stateless. They receive a JSON request, process the requested pools, return JSON, and forget everything. All state tracking happens in the client. The F5 dataplane already handles thousands of decisions per second for production traffic, so checking status on a handful of pools every thirty seconds is negligible overhead.

### Core Function 

The entire Dashboard system is fundamentally a sophisticated wrapper around one F5 iRule TCL command:

```tcl
LB::status pool $pool_name member $ip $port
```

- Executes this command across pools and members at each poll
- Returns status

All JavaScript modules, CSS themes, and iRules exist to make that single status command operationally useful by adding visual presentation, change tracking, and user experience features. 

At its core it's a pool status iRule on steroids:    **query member status → detect changes → display nicely → repeat**

---

## Architecture Topology

The dashboard consists of two components:

### Frontend (one or more)
- Serves the web interface and static assets
- Handles user authentication via APM
- Provides local pool monitoring for the frontend site
- Proxies requests to remote backend API Hosts

### API Host (all other clusters within a topology)
- Exposes JSON API endpoints for pool data
- Performs DNS resolution and member status checks
- Provides health monitoring endpoints

**Notional layout of the multi-site topology. Supports multiple Frontends; scales horizontally as needed**
<img width="2023" height="1137" alt="Image" src="https://github.com/user-attachments/assets/3c4a285a-92f2-408f-938d-6b3e65d42440" />

---

## Screenshots

**Theme1 - AGLight in MACRO mode**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/ef0294cf-8c74-45fd-849e-a2dbe34f44ce" />

**Theme2 - Monochrome Grey in micro mode with logger active, alarmed pools, an active search, and actual pool name mode enabled**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/4c037655-ea14-43b2-9cda-46575cc7c20f" />

**Theme3 - Amber in MACRO mode with alarmed pool members**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/72a7a8dd-bc03-48ca-b12d-e81258b69e11" />

---

## Getting Started

📋 **[Installation Guide](INSTALLATION.md)** - Step-by-step setup instructions for both Dashboard Frontend and API Host components

📋 **[User Guide](USERGUIDE.md)** - Comprehensive Dashboard User Manual

---

## Dashboard Limitations

DNS resolution only supports IPv4 PTR lookups at this time

Dashboard virtual servers and iRules must reside in the `/Common` partition.

### TMOS Version Compatibility
- TMOS 17.x+ series (all versions)

---

## Internals

### Dataplane Efficiency via Poll Optimizations

The dashboard scopes every request to minimize dataplane impact on the BIG-IP.

#### Pool Scoping

Each poll cycle sends X-Need-Pools headers listing only the pools currently visible in the grid. With no search filter active, all pools in `datagroup-dashboard-pools` are processed as normal. With a filter active showing 4 pools out of 100 configured, only those 4 are sent and the backend processes only those 4. To force a full-site update, clear the search filter.

```http
X-Need-Pools-Count: 2
X-Need-Pools-1: pool1,pool2,/dmz/pool3,pool4,pool5
X-Need-Pools-2: /secure/pool6,pool7
```

Up to 5 pool names per header (canonical form for partitioned pools) and up to 50 numbered headers, for a limit of 250 filtered pools per request. Requests exceeding the cap fall back to full-site processing.

#### DNS Resolution

Browsers cannot perform PTR lookups themselves, so hostname resolution is handled by the BIG-IP. It runs outside the normal poll cycle and only when the user clicks **Resolve**: the dashboard collects the member IPs that don't already have cached hostnames, packages them into X-Need-DNS headers, and sends a one-off request to the selected site. Like polling, resolution respects the search filter and only covers visible pool members.

```http
X-Need-DNS-Count: 2
X-Need-DNS-IPs-1: 192.168.1.1,192.168.1.2,...,192.168.1.64
X-Need-DNS-IPs-2: 192.168.2.1,192.168.2.2
```

Up to 64 IPs per header and up to 50 numbered headers (3,200 IPs maximum), enforced by backend header-count validation.

Resolved hostnames are cached per site in sessionStorage, so duplicate IPs are resolved once, results survive browser refreshes, and known hostnames are never re-queried until the cache is flushed. Use the flush function after PTR record or hostname changes to force a fresh lookup on the next resolve. Each site can independently enable or disable DNS resolution and configure its own resolver endpoints in the iRule.

---

## JSON Schema v2.1

```bash
/api/proxy/pools
   {
     "hostname": "bigip-hostname",
     "timestamp": "YYYY-MM-DD HH:MM:SS",
     "debug_enabled": "enabled|disabled",
     "instanceId":"inst_timestamp_random",
     "pools": [
       {
         "partition": "Common|partition_name",
         "name": "pool_name",
         "alias": "user_friendly_name" or null,
         "sort_order": number,
         "status": "UP|DOWN|DISABLED|UNKNOWN|EMPTY",
         "up_members": number,
         "down_members": number,
         "disabled_members": number,
         "total_members": number,
         "members": [
           {
             "ip": "x.x.x.x",
             "port": "port",
             "status": "up|down|disabled|session_disabled",
             "hostname": "resolved-hostname" or null
           }
         ]
       }
     ]
   }
```

```bash
/api/health
   {
     "status": "healthy|unhealthy",
     "hostname": "bigip-hostname",
     "timestamp": "YYYY-MM-DD HH:MM:SS",
     "uptime_seconds": number,
     "version": "2.0",
     "pools_configured": number,
     "message": "status description"
   }
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

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
