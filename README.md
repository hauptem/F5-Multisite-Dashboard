# F5 Multisite Dashboard - README

![License](https://img.shields.io/badge/license-MIT-green)
![F5 Compatible](https://img.shields.io/badge/F5%20BIG--IP-compatible-orange)
![TMOS Version](https://img.shields.io/badge/TMOS-15.0%2B-red)
![F5 iRules](https://img.shields.io/badge/F5-iRules%20(Tcl)-FF6600?logo=f5&logoColor=white)
![F5 LTM](https://img.shields.io/badge/F5-LTM%20Module-FF6600?logo=f5&logoColor=white)
![F5 APM](https://img.shields.io/badge/F5-APM%20Auth-FF6600?logo=f5&logoColor=white)
![Partition Support](https://img.shields.io/badge/multi--partition-not%20supported-yellow)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Grid%20%2B%20Flexbox-1572B6?logo=css3&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26?logo=html5&logoColor=white)
![No Framework](https://img.shields.io/badge/Framework-Vanilla%20JS-success?logo=javascript&logoColor=white)
![Modular](https://img.shields.io/badge/Architecture-Modular%20ES6-blue)
![REST API](https://img.shields.io/badge/API-JSON%20REST-green)
![Chrome](https://img.shields.io/badge/Chrome-80+-4285F4?logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-75+-FF7139?logo=firefox&logoColor=white)
![Safari](https://img.shields.io/badge/Safari-13+-000000?logo=safari&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-80+-0078D4?logo=microsoftedge&logoColor=white)
![Zero Infrastructure](https://img.shields.io/badge/Infrastructure-Zero%20Additional-brightgreen)
![Self Hosted](https://img.shields.io/badge/Hosting-Self%20Contained-blue)

---

A comprehensive real-time monitoring dashboard for F5 BIG-IP load balancers featuring multi-site support, DNS hostname resolution, member state tracking, and advanced filtering capabilities.

---

## Overview

You're troubleshooting an application issue. Your monitoring tools show trends and alerts, but you need to know **right now**: Are the pool members actually up? Which ones changed state? What's the real status behind that load balancer?

Traditionally, this means logging into the F5 GUI, navigating through Local Traffic > Pools, clicking through individual pool pages, and refreshing to see current state. When your application spans multiple sites, you're logging into multiple F5s, checking the same pools across different locations, trying to piece together a complete picture of application health. Meanwhile, application teams are asking operations teams for status updates, who then have to reach out to F5 engineers, creating a chain of dependencies just to answer basic "is it working?" questions.

Your enterprise monitoring tools excel at historical trends and alerting, but when you need current state of specific pool members - not 5 minutes ago when the last poll happened - there's a gap that forces manual investigation.

### What This Actually Is

This isn't another static pool status page. 

**It's the F5 serving a sophisticated dashboard application interface directly from the BIG-IP itself.**

A 170KB modular JavaScript application runs entirely in your browser, served directly from the F5's high-speed operational dataplane. One or more sites operate as Dashboard Front-Ends serving the dashboard interface (HTML, JavaScript, CSS) via iFiles, while other sites operate as API Hosts providing pool data through optimized JSON-based dashboard API calls. This provides unified visibility across multiple sites from a single interface without requiring even a read-only account on any of the BIG-IPs, allowing you to switch between locations and see consistent pool, member, and health status data with almost no latency and very little overhead.  Unlike "pool status" iRules, this solution is entirely out-of-band of any production application virtualservers. 

All dashboard sites inherit the high-availability capabilities of their host BIG-IP cluster. Think of it as an extension of the F5 GUI: near real-time state tracking, DNS hostname resolution (if configured), advanced search/filtering, and the ability to see exactly what changed and when. It gives application teams and operations teams direct visibility into application state without needing to wait for answers from F5 engineers, eliminating the organizational bottleneck that slows down troubleshooting when every minute counts. F5-Multisite-Dashboard is an ultra-performant, near real-time looking glass directly into application pool state. It doesn't replace Network Management Systems - it complements them by providing instant visibility that NMS platforms can't match.

---

### Core Function 

The entire Dashboard system is fundamentally a sophisticated wrapper around one F5 command:

```tcl
LB::status pool $pool_name member $ip $port
```

- Executes this command across pools and members at each poll
- Returns basic status and IP address

All JavaScript modules, CSS themes, and iRules exist to make that single status command operationally useful by adding visual presentation, change tracking, and user experience features.

At its core it's a pool status iRule on steroids: **query member status → detect changes → display nicely → repeat**

---

## Architecture Topology

The dashboard consists of two main components:

### Front-end (one - or more as desired)
- Serves the web interface and static assets
- Handles user authentication via APM
- Provides local pool monitoring for the frontend site
- Proxies requests to remote backend API hosts

### API-Host (all other clusters within a topology)
- Exposes JSON API endpoints for pool data
- Performs DNS resolution and member status checks
- Supports pool filtering optimization headers
- Provides health monitoring endpoints

## Screenshots

**Theme1 - AGLight in MACRO mode**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/ef0294cf-8c74-45fd-849e-a2dbe34f44ce" />

**Theme2 - Monochrome Grey in micro mode with logger active, alarmed pools, an active search, and actual pool name mode enabled**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/4c037655-ea14-43b2-9cda-46575cc7c20f" />

**Theme3 - Amber in MACRO mode with alarmed pool members**
<img width="2560" height="1400" alt="Image" src="https://github.com/user-attachments/assets/72a7a8dd-bc03-48ca-b12d-e81258b69e11" />

**3 instances of Dashboard showing 3 sites in 3 tabs of Microsoft Edge with instance site table data isolation**
<img width="2497" height="1186" alt="Image" src="https://github.com/user-attachments/assets/980ad18f-fa62-431b-b6ac-38dbb86cc6ea" />

**Notional layout of the multi-site topology. Supports multiple Front-ends; scales horizontally as needed**
<img width="2026" height="1130" alt="Image" src="https://github.com/user-attachments/assets/d629864e-4614-4e6b-8886-553c0b720f2c" />

---

## Getting Started

📋 **[Complete Installation Guide](INSTALLATION.md)** - Step-by-step setup instructions for both Frontend and API-Host components

---

## Architecture Overview - Call Stack Visualization

The F5 Multisite Dashboard uses a 3-level procedural architecture with automatic memory management and efficient variable scoping. Procedures offer code modularity for easy sharing between Front-end and API-Host to maintain operational parity.

```
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
## Stack Execution Flow

**Request Processing:**
- 2-3 levels deep depending on DNS needs
- Each level has single, clear responsibility
- Parameters flow down, results flow up
- Shared DNS cache via upvar chain

**Memory Management:**
- Automatic variable cleanup when procedures exit
- DNS cache persists for request duration via upvar
- No manual memory management required
- Predictable resource usage regardless of pool count

**Key Design Principles:**
- **Modularity**: Each procedure handles one specific task
- **Reusability**: Same procedures work in frontend and API host iRules
- **Efficiency**: Direct JSON string building, no object serialization
- **Safety**: Bounded stack depth, automatic cleanup, error isolation

## Architecture Overview - Dataplane protection via poll optimization

The dashboard implements intelligent request scoping to minimize dataplane impact on F5 Big-IP systems while maximizing efficiency through targeted pool monitoring and on-demand DNS resolution.

### Pool Request Optimization
#### How It Works
The dashboard uses **X-Need-Pools** headers to request only visible pool data during each polling cycle, rather than processing all configured pools.

#### Scoping Behavior
- **Full Site Mode**: When no search filter is active, all pools in `datagroup-dashboard-pools` are processed
- **Filtered Mode**: When a search filter is active, only visible pools are requested via optimization headers
- **Header Structure**: Each `X-Need-Pools` header contains up to 5 pool names, with unlimited headers supported for larger pool sets

#### Example Scenario
```
Site Configuration: 100 pools total
Active Search Filter: Shows 4 pools
Request Optimization: Only 4 pools processed by backend
Performance Gain: 96% reduction in backend processing
```

#### Important Notes
- To update all pools at a site, ensure no search filter is active
- Pool filtering is based on actual pool names (not aliases) for backend processing

### DNS Request Optimization
#### On-Demand Resolution Model
DNS resolution operates independently from regular polling cycles and is triggered only by explicit user action via the **Resolve** button.

#### Browser Security Limitations
Web browsers cannot perform PTR record lookups directly due to security restrictions. The dashboard overcomes this by:
- Collecting IP addresses of pool members without cached hostnames
- Packaging them into **X-Need-DNS** headers during user-initiated resolve requests
- Sending an out-of-cycle request to the backend for DNS processing

#### Scoping Behavior
DNS resolution respects search filter visibility:

| Scenario | Total Pools | Visible Pools | DNS Scope |
|----------|-------------|---------------|-----------|
| No Filter | 50 | 50 | All member IPs |
| Search Active | 50 | 2 | Only visible pool member IPs |

#### Header Structure
- **Capacity**: Each `X-Need-DNS` header supports up to 250 IP addresses
- **Scalability**: Unlimited headers supported for large member sets
- **Format**: Comma-separated IP address lists

#### DNS Infrastructure Protection

##### Caching Strategy
- **Per-Site Caching**: Each site maintains its own hostname cache
- **Cross-Pool Efficiency**: Duplicate IPs (e.g., SharePoint WFE servers) resolved once per site
- **Session Persistence**: Cached hostnames survive browser refreshes

##### Anti-Strobing Measures
- **User-Initiated Only**: No automatic DNS queries during regular polling
- **Cache-First Lookup**: Known hostnames never re-queried until cache is flushed
- **Infrastructure Respect**: Designed to minimize DNS server load

#### Cache Management

##### Automatic Cache Behavior
```
Known Hostname: Skip DNS request
Unknown IP: Include in X-Need-DNS headers
Cache Hit: Display cached hostname immediately
```

##### Manual Cache Control
- **Flush Function**: Clears site-specific hostname cache
- **Use Case**: PTR record updates or hostname changes
- **Effect**: Next resolve will re-query all member IPs for fresh data

#### Site-Level DNS Control

##### iRule Configuration Options
Each site can independently:
- Enable/disable DNS resolution capability
- Configure DNS resolver endpoints

##### Recommended Architecture
- **Site-Specific DNS**: Each site handles its own DNS resolution
- **Dedicated Resolvers**: Use dedicated DNS resolvers for dashboard queries
- **Scoped Queries**: Limit resolver scope to `in-addr.arpa` for PTR records

### Performance Impact Analysis

#### Pool Optimization Benefits
| Pool Count | Search Filter | Backend Load | Efficiency Gain |
|------------|---------------|--------------|-----------------|
| 100 pools | None | 100% | Baseline |
| 100 pools | 5 visible | 5% | 95% reduction |
| 200 pools | 10 visible | 5% | 95% reduction |

#### DNS Resolution Benefits
| Member Count | Cache Hit Rate | DNS Queries | Infrastructure Impact |
|--------------|----------------|-------------|---------------------|
| 1000 members | 0% (first run) | 1000 | Initial load |
| 1000 members | 80% (typical) | 200 | 80% reduction |
| 1000 members | 95% (mature) | 50 | 95% reduction |

### Technical Implementation

#### Request Header Examples

##### Pool Scoping Headers
```http
X-Need-Pools-Count: 2
X-Need-Pools-1: pool1,pool2,pool3,pool4,pool5
X-Need-Pools-2: pool6,pool7
```

##### DNS Resolution Headers
```http
X-Need-DNS-Count: 2
X-Need-DNS-IPs-1: 192.168.1.1,192.168.1.2,...,192.168.1.250
X-Need-DNS-IPs-2: 192.168.2.1,192.168.2.2
```

#### Backend Processing Flow
1. **Header Detection**: iRule detects optimization headers
2. **Scope Determination**: Process only requested pools/IPs
3. **Cache Integration**: Check existing DNS cache before resolution
4. **Response Generation**: Return scoped data with hostname information

---
## JSON Schema v1.7.x

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
     "version": "1.7",
     "pools_configured": number,
     "message": "status description"
   }
```
---
## Dashboard Current Limitations

**Dashboard v1.7.x is not multi-partition compatible.** 
All BIG-IP objects (pools, data groups, virtual servers, iRules, etc.) must reside in the `/Common` partition. Multi-partition support is planned for v2.0 and is in development and testing.
DNS resolution only supports IPv4 PTR lookups at this time

### TMOS Version Compatibility
**Minimum Required:** TMOS 15.0
**Tested Versions:**
- TMOS 15.x series (15.1.0 and higher recommended)
- TMOS 16.x series (all versions)
- TMOS 17.x series (all versions)

## Performance

**Scalability:**
- Tested with 500+ pools per site on lab grade VE's
- Tested with 1000+ pool members on lab grade VE's
- Currently deployed and in operation with various organizations on pre-iSeries appliances, iSeries appliances, and rSeries appliance tenants

**Resource Usage:**
- ~2MB memory per dashboard instance
- 5000 entry FIFO buffer for logger
- ~1KB/pool in session storage
- 0% GPU Browser pipeline usage when in an unalarmed state

---

## Contributing

This project uses:
- **iRules (Tcl)** for F5 BIG-IP integration
- **Vanilla JavaScript** (no frameworks)
- **CSS** for responsive layout

When contributing:
1. Maintain compatibility with F5 BIG-IP TMOS 15.0+ (test on multiple versions)
2. All development must target `/Common` partition (v1.7 limitation)
3. Test with multiple themes and view modes
4. Verify browser compatibility across supported platforms
5. Update version numbers consistently across all files
6. Add debug logging for new features

---

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
