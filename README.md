# F5 Multisite Dashboard - README

![License](https://img.shields.io/badge/license-MIT-green)
![F5 Compatible](https://img.shields.io/badge/F5%20BIG--IP-compatible-orange)
![TMOS Version](https://img.shields.io/badge/TMOS-15.0%2B-red)
![F5 iRules](https://img.shields.io/badge/F5-iRules%20(Tcl)-FF6600?logo=f5&logoColor=white)
![F5 LTM](https://img.shields.io/badge/F5-LTM%20Module-FF6600?logo=f5&logoColor=white)
![F5 APM](https://img.shields.io/badge/F5-APM%20Auth-FF6600?logo=f5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Grid%20%2B%20Flexbox-1572B6?logo=css3&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26?logo=html5&logoColor=white)
![No Framework](https://img.shields.io/badge/Framework-Vanilla%20JS-success?logo=javascript&logoColor=white)
![REST API](https://img.shields.io/badge/API-JSON%20REST-green)

## Overview

A production incident is unfolding. Your application is degraded. You need to know immediately: which pool members are down, across all your data centers, right now. Not five minutes ago when your sluggish monitoring system last polled. Not "let me login to each F5 and check." 

**Right now.**

This dashboard answers that question in ten seconds.

It's a browser-based monitoring application that provides near real-time visibility into F5 BIG-IP pool member status across unlimited sites. It runs entirely from the F5 devices themselves — no external servers, no databases, no agents, no infrastructure. Upload seven files, configure eight data groups, apply two iRules, and you're operational. Thirty minutes from start to finish.

The architecture is distributed rather than centralized. Each F5 site can operate as either a Dashboard Frontend (serving the interface and aggregating data) or an API-Host (providing pool data via JSON endpoints), or both. Sites communicate directly with each other without requiring a central monitoring server. Add ten sites, add a hundred sites—the architecture scales horizontally without redesign because there's no central bottleneck.

Traditional monitoring operates on a simple principle: poll everything, store everything, filter only when queried. This works adequately for infrastructure that changes infrequently and where historical trending matters more than instantaneous state. It fails when you need to know what's happening right now and only care about a subset of your total configuration at any given moment. This dashboard inverts the traditional model completely. Instead of the backend deciding what to collect and clients filtering afterwards, the client tells the backend exactly what it needs in this specific moment. When a user searches for "sharepoint" and sees three matching pools out of two hundred configured, the next poll cycle queries only those three visble pools. The backend processes three pool status checks instead of two hundred. That's not a minor optimization—it's a ninety-eight-point-five percent reduction in processing load.

The Big-IPs remain stateless. They receive a JSON request, process the specific pools requested, return JSON, and immediately forget everything. Great care was taken to limit the impact of the dashboard on the Big-IP operational dataplane. No static/global variables, or state tracking of any kind occurs on the Big-IP's. All dashboard state tracking complexity occurs on the client. The F5 dataplane already handles thousands of decisions per second for production traffic, so checking pool status for a handful of pools every thirty seconds is negligible overhead. Because the system is stateless and lightweight, it scales horizontally without architectural limit. 

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

### Front-End (one - or more as desired)
- Serves the web interface and static assets
- Handles user authentication via APM
- Provides local pool monitoring for the frontend site
- Proxies requests to remote backend API-Hosts

### API-Host (all other clusters within a topology)
- Exposes JSON API endpoints for pool data
- Performs DNS resolution and member status checks
- Provides health monitoring endpoints

**Notional layout of the multi-site topology. Supports multiple Front-ends; scales horizontally as needed**
<img width="2023" height="1137" alt="Image" src="https://github.com/user-attachments/assets/3c4a285a-92f2-408f-938d-6b3e65d42440" />

---

## Screenshots

**Theme1 - AGLight in MACRO mode**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/ef0294cf-8c74-45fd-849e-a2dbe34f44ce" />

**Theme2 - Monochrome Grey in micro mode with logger active, alarmed pools, an active search, and actual pool name mode enabled**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/4c037655-ea14-43b2-9cda-46575cc7c20f" />

**Theme3 - Amber in MACRO mode with alarmed pool members**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/72a7a8dd-bc03-48ca-b12d-e81258b69e11" />

**3 instances of Dashboard showing 3 sites in 3 tabs of Microsoft Edge with instance site table data isolation**
<img width="2497" height="1186" alt="Image" src="https://github.com/user-attachments/assets/980ad18f-fa62-431b-b6ac-38dbb86cc6ea" />

---

## Getting Started

📋 **[Complete Installation Guide](INSTALLATION.md)** - Step-by-step setup instructions for both Dashboard Front-end and API-Host components

---

## Dashboard Current Limitations

**Dashboard v1.x is not multi-partition compatible.** 
All BIG-IP objects (pools, data groups, virtual servers, iRules, etc.) must reside in the `/Common` partition. 

Multi-partition support is planned for v2.0 and is in development and testing.

Following the release of partitions in 2.0, an iappLX rpm is planned for the future.

DNS resolution only supports IPv4 PTR lookups at this time

### TMOS Version Compatibility
- TMOS 15-17.x series (all versions)

---

## Performance

**Scalability:**
- Tested with 500+ pools per site on lab grade VE's
- Tested with 1000+ pool members on lab grade VE's
- Currently deployed and in operation with various organizations on pre-iSeries appliances, iSeries appliances, and rSeries appliance tenants

---

## Architecture Overview

### Call Stack Visualization

The F5 Multisite Dashboard uses a 3-level procedural architecture with automatic memory management and efficient variable scoping. Procedures offer code modularity for easy sharing between Front-end and API-Hosts to maintain operational parity for Dashboard components. It became very apparent early in development that standard iRule "monolithic blocks of code" would be unsustainable long term if we wanted the Front-end and API-Host to operate identically throughout development and feature tuning. Procedures were the logical solution.

```plaintext
HTTP Request (/api/proxy/pools)
│
▼ LEVEL 0: Global Scope (HTTP_REQUEST Event)
┌─────────────────────────────────────────────────────────
│ • Parse headers (X-Selected-Site, X-Need-Pools-*, X-Need-DNS-*)
│ • Initialize variables: dns_request_cache = {}
│ • Determine pool filtering and DNS optimization needs
│ • Call main coordinator procedure
└─────────────────────────────────────────────────────────
│
▼ LEVEL 1: collect_all_pool_data (Pool Coordinator)
┌─────────────────────────────────────────────────────────
│ • Receives: pool lists, DNS settings, cache reference
│ • Decides which pools to process (filtered vs all)
│ • Loops through each selected pool
│ • upvar dns_request_cache → Global Scope
│ • Returns: comma-separated JSON string
└─────────────────────────────────────────────────────────
│
▼ LEVEL 2: process_single_pool (Individual Pool Handler)
┌─────────────────────────────────────────────────────────
│ • Receives: single pool name + configuration
│ • Queries F5: members -list, LB::status for each member
│ • Builds JSON for each pool member
│ • Counts up/down/disabled members
│ • upvar dns_request_cache → Level 1 Scope
│ • Returns: complete pool JSON object
└─────────────────────────────────────────────────────────
│
▼ LEVEL 3: resolve_hostname_for_json (DNS Resolution - Optional)
┌─────────────────────────────────────────────────────────
│ • Called only when DNS resolution needed
│ • Checks cache first, performs PTR lookup if needed
│ • Handles IPv4 → d.c.b.a.in-addr.arpa conversion
│ • upvar dns_request_cache → Level 2 Scope
│ • Returns: "null" or "\"hostname.domain.com\""
└─────────────────────────────────────────────────────────
```

### Dataplane Efficiency via Poll Optimizations

The dashboard implements intelligent request scoping to minimize dataplane impact on F5 Big-IP systems while maximizing efficiency through targeted pool monitoring and on-demand DNS resolution.

#### Pool Request Optimization

##### How It Works
The dashboard uses **X-Need-Pools** headers to request only visible pool data during each polling cycle, rather than processing all configured pools.

##### Scoping Behavior
- **Full Site Mode**: When no search filter is active, all pools in `datagroup-dashboard-pools` are processed
- **Filtered Mode**: With an active search showing 4 pools out of 100 configured, only those 4 pools are sent in X-Need-Pools headers

```plaintext
Example: 100 configured pools, search filter shows 4 pools
Request Optimization: Only 4 pools processed by backend
Performance Gain: 96% reduction in backend processing
```

- To update all pools at a site, ensure no search filter is active

#### DNS Request Optimization

##### On-Demand Resolution Model
DNS resolution operates independently from regular polling cycles and is triggered only by explicit user action via the **Resolve** button.

##### Browser Security Limitations
Web browsers cannot perform PTR record lookups directly due to security restrictions. The dashboard overcomes this by:
- Collecting IP addresses of pool members without cached hostnames
- Packaging them into **X-Need-DNS** headers during user-initiated resolve requests
- Sending an out-of-cycle request to the selected site Big-IP for DNS processing

##### Scoping Behavior
DNS resolution respects search filter visibility:

| Scenario | Total Pools | Visible Pools | DNS Scope |
|----------|-------------|---------------|-----------|
| No Filter | 50 | 50 | All member IPs |
| Search Active | 50 | 2 | Only visible pool member IPs |

##### Header Structure
- **Capacity**: Each `X-Need-DNS` header supports up to 250 IP addresses
- **Scalability**: Unlimited headers supported for large member sets
- **Format**: Comma-separated IP address lists

##### DNS Infrastructure Protection

###### Caching Strategy
- **Per-Site Caching**: Each site sessionstorage maintains its own hostname cache
- **Cross-Pool Efficiency**: Duplicate IPs (e.g., SharePoint WFE servers) resolved once per site
- **Session Persistence**: Cached hostnames survive browser refreshes

###### Anti-Strobing Measures
- **User-Initiated Only**: No automatic DNS queries during regular polling
- **Cache-First Lookup**: Known hostnames never re-queried until cache is flushed
- **Infrastructure Respect**: Designed to minimize DNS server load

###### Manual Cache Control
- **Flush Function**: Clears site-specific hostname cache
- **Use Case**: PTR record updates or hostname changes
- **Effect**: Next resolve will re-query all member IPs for fresh data

##### Site-Level DNS Control

###### iRule Configuration Options
Each site can independently:
- Enable/disable DNS resolution capability
- Configure DNS resolver endpoints

#### Performance Impact Analysis

##### Pool Optimization Benefits
| Pool Count | Search Filter | Backend Load | Efficiency Gain |
|------------|---------------|--------------|-----------------|
| 100 pools | None | 100% | Baseline |
| 100 pools | 5 visible | 5% | 95% reduction |
| 200 pools | 10 visible | 5% | 95% reduction |

#### Technical Implementation

##### Request Header Examples

###### Pool Scoping Headers
```http
X-Need-Pools-Count: 2
X-Need-Pools-1: pool1,pool2,pool3,pool4,pool5
X-Need-Pools-2: pool6,pool7
```

###### DNS Resolution Headers
```http
X-Need-DNS-Count: 2
X-Need-DNS-IPs-1: 192.168.1.1,192.168.1.2,...,192.168.1.250
X-Need-DNS-IPs-2: 192.168.2.1,192.168.2.2
```

##### Backend Processing Flow
1. **Header Detection**: iRule detects optimization headers
2. **Scope Determination**: Process only requested pools/IPs
3. **Response Generation**: Return scoped pool data with hostname information

---

## JSON Schema v1.8

```bash
/api/proxy/pools
   {
     "hostname": "bigip-hostname",
     "timestamp": "YYYY-MM-DD HH:MM:SS",
     "debug_enabled": "enabled|disabled",
     "instanceId":"inst_timestamp_random" or null,
     "pools": [
       {
         "name": "pool_name",
         "alias": "user_friendly_name" or "null",
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
             "hostname": "resolved-hostname" or "null"
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
     "version": "1.8",
     "pools_configured": number,
     "message": "status description"
   }
```

---

## Contributing

This project uses:
- **iRules (Tcl)** for F5 BIG-IP integration
- **Vanilla JavaScript** (no frameworks)
- **CSS** for responsive layout

When contributing:
1. Maintain compatibility with F5 BIG-IP TMOS 
2. All development must currently target `/Common` partition (v1.x limitation)
3. Test with multiple themes and view modes
4. Verify browser compatibility across supported platforms
5. Update version numbers consistently across all files
6. Add reasonable debug logging for new features

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
