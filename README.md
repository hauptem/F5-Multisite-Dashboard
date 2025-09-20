# F5 BIG-IP Multi-Site Dashboard v1.7

A comprehensive real-time monitoring dashboard for F5 BIG-IP load balancers featuring multi-site support, DNS hostname resolution, member state tracking, and advanced filtering capabilities.

![Dashboard Version](https://img.shields.io/badge/version-1.7-blue)
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

## Overview

<img width="1504" height="1021" alt="Image" src="https://github.com/user-attachments/assets/82483b0d-de24-424c-87ea-eb6c59252431" />


### The Problem This Solves

You're troubleshooting an application issue. Your monitoring tools show trends and alerts, but you need to know **right now**: Are the pool members actually up? Which ones changed state? What's the real status behind that load balancer?

Traditionally, this means logging into the F5 GUI, navigating through Local Traffic > Pools, clicking through individual pool pages, and refreshing to see current state. When your application spans multiple sites, you're logging into multiple F5s, checking the same pools across different locations, trying to piece together a complete picture of application health. Meanwhile, application teams are asking operations teams for status updates, who then have to reach out to F5 engineers, creating a chain of dependencies just to answer basic "is it working?" questions.

Your enterprise monitoring tools excel at historical trends and alerting, but when you need current state of specific pool members - not 5 minutes ago when the last poll happened - there's a gap that forces manual investigation.

### What This Actually Is

This isn't another monitoring dashboard. **It's the F5 serving a sophisticated application interface directly from the BIG-IP itself.**

A 170KB modular JavaScript application runs entirely in your browser, served directly from the F5's high-speed operational dataplane. One or more sites operate as Dashboard Front-Ends serving the dashboard interface (HTML, JavaScript, CSS) via iFiles, while other sites operate as API Hosts providing pool data through optimized JSON-based dashboard API calls. This provides unified visibility across multiple sites from a single interface without requiring even a read-only account on any of the BIG-IPs, allowing you to switch between locations and see consistent pool, member, and health status data with almost no latency and very little overhead. All dashboard sites inherit the high-availability capabilities of their host BIG-IP cluster. Think of it as an extension of the F5 GUI: near real-time state tracking, DNS hostname resolution (if configured), advanced search/filtering, and the ability to see exactly what changed and when. It gives application teams and operations teams direct visibility into application state without needing to wait for answers from F5 engineers, eliminating the organizational bottleneck that slows down troubleshooting when every minute counts.

**Bottom Line:** When you need to know what's really happening with your applications behind the F5, Dashboard gives you that answer immediately, with zero additional infrastructure cost.

F5-Multisite-Dashboard is an ultra-performant, near real-time looking glass directly into application pool state. It doesn't replace Network Management Systems - it complements them by providing instant visibility that NMS platforms can't match.

### Key Technical Innovations

**Zero Infrastructure Overhead**
F5-Multisite-Dashboard runs entirely on the F5 itself via an iFile-served 170KB Modular JavaScript application in the browser. No monitoring servers, no databases, no network dependencies between components (other than HTTPS/TCP443).

**Self-Contained Intelligence**
The JavaScript application includes real-time state tracking, DNS hostname resolution with caching, advanced Boolean search and filtering, and session persistence.

### Why This Approach Wasn't Considered Before

**Organizational Boundaries:** Network teams manage F5s while monitoring teams buy enterprise platforms. The idea of the F5 serving sophisticated applications never crosses organizational boundaries.

**Conceptual Limitations:** F5s are still unfortunately seen as network devices, not application delivery platforms. The enterprise software industry has institutionalized the belief that monitoring must be external and centralized, even when the device being monitored is perfectly capable of providing its own real-time interface.

**Technical Assumptions:** Most don't realize that modern browsers can handle sophisticated applications, or that iRules can serve as full application backends. The pattern of using F5s to inject third-party monitoring JavaScript exists, but always for sending data out to external systems, never for serving applications that query the F5 itself.

## Features

### Core Functionality
- **Real-time Pool Monitoring** - Live status updates for pool members across multiple sites
- **Multi-Site Architecture** - Frontend/backend separation supporting distributed F5 deployments
- **DNS Hostname Resolution** - Automatic PTR lookups with intelligent caching
- **Member State Tracking** - Persistent monitoring of status changes with acknowledgment system
- **Advanced Search & Filtering** - Boolean search with saved search functionality
- **Responsive Grid Layout** - Dynamic column adjustment based on content and viewport

### User Interface
- **Three Visual Themes** - AGLight, Monochrome Grey, and Amber Terminal
- **MACRO/MICRO View Modes** - Toggle between detailed member view and compact pool overview
- **Drag & Drop Pool Reordering** - Custom pool arrangement with persistence
- **Keyboard Shortcuts** - Full keyboard navigation and control
- **Session Persistence** - Settings and state preserved across browser sessions

## Architecture

The dashboard consists of two main components:

### Frontend (Dashboard Host)
- Serves the web interface and static assets
- Handles user authentication via APM
- Provides local pool monitoring for the frontend site
- Proxies requests to remote backend API hosts

### Backend API (API Host)
- Exposes JSON API endpoints for pool data
- Performs DNS resolution and member status checks
- Supports pool filtering optimization headers
- Provides health monitoring endpoints

## Installation

### Prerequisites
- F5 BIG-IP with LTM and APM modules provisioned
- **TMOS Version:** 15.0 or higher (tested on 15.x, 16.x, 17.x)
- DNS resolver configured for PTR lookups (optional)
- **Note:** This version (1.7) is **not multi-partition compatible** - all objects must be in `/Common` partition. Partition compatibility is planned for version 2.0.

### Frontend Setup
#### Dashboard Front-End Critical Dependencies:

All datagroups, pools and DNS resolver **must exist in LTM** and match the item names in the iRule. If you wish to use custom names for pools, make sure to edit the relevant iRule references.

**1. `datagroup-dashboard-clients` (Address)**
- Used to restrict dashboard access via Client IP or Client Subnet

**2. `datagroup-dashboard-debug` (Address)**  
- Used to limit dashboard debug via Client IP or Client Subnet

**3. `datagroup-dashboard-sites` (String)**
- Used to define dashboard site list in the dropdown control - the Front-End is typically the first site defined with the lowest sort order e.g. "CHICAGO = 10".

**4. `datagroup-dashboard-api-host` (String)**
- Used to map remote Site names to API Host Virtualserver IP addresses. e.g. "NEW YORK = 192.168.4.33". It is this mapping that the Front-end uses to proxy pool requests to the API hosts/

**5. `datagroup-dashboard-pools` (String)**
- Used to provide a list of pools to display. **This is an essential step.** LTM does not permit an iRule to determine general elements of TMOS configuration. Therefore we **must** administratively provide configuration attributes in the form of a list of LTM pool names that the dashboard will be permitted to process via LB::status events and subsequently display. A script has been provided to assist with the initial population of this datagroup.

**6. `datagroup-dashboard-pool-alias` (String)**
- Used to create alias names for actual pool names. This feature is optional, but the datagroup itself must exist. This is to permit 'Aliases' or user friendly names to be displayed instead of the actual LTM pool names. This is for environments where a pool name might not provide the best indicator of what the pool actually supports.

**7. `datagroup-dashboard-api-keys` (String)**
- Used to authenticate Front-end to API hosts. This key can be the same across the entire topology but must exist or the Front-End will have no access to the api endpoint /api/proxy/pools. This is an application-level control for security.

**8. `dashboard-api-hosts_https_pool` (LTM Pool)**
- This pool contains the API Host IPs for monitoring. The pool is not used for front-end proxy LB determination, it is used simply to make the Front-end aware of API host operation via LTM pool monitor status.

**9. `dashboard-dns_udp53_pool` (LTM Pool)**
- This pool contains the DNS listener used for monitoring purposes only. If the listener is detected down by the monitor attached to this pool, the iRule will fail back to IP-only mode gracefully.

**10. `/Common/dashboard-DNS` (LTM dns-resolver)**
- This LTM resolver is recommended to map to a GTM listener dedicated for dashboard use with the provided DNS iRule applied and scoped for in-addr.arpa. In current deployments, each API host uses a local GTM listener, but any reachable DNS server that can provide responses to PTR queries will work.

**11. `session.custom.dashboard.auth` (Front-end LTM APM session variable)**
- This variable must be equal to 1 for the Front-end irule to trigger and needs to be set by the APM Policy that is placed on the Front-End virtualserver. Use any authentications methods appropriate for your organization or use no authentication, but APM must set this variable for the Front-End iRule to trigger. This is primarily done to ensure APM completes before the iRule starts processing client HTTP requests. It's an APM / LTM interoperability control. If you do not desire APM controls, simply set the variable in the LTM iRule or remove the variable check.

**12. iFiles:**
- `dashboard_js-core.js`   - **Javascript Core Module**
                           - Core coordination functionality including initialization, themes switching, timers, MACRO/micro view modes, wake lock management, and alias switching
 
- `dashboard_js-client.js` - **Javascript Client Module**
                           - HTTP communication layer for JSON fetch API calls, settings persistence, DNS operations, and fetch request lifecycle management
 
- `dashboard_js-data.js`   - **Javascript Data Module**
                           - Data management, instance tracking, state tracking, pool reordering functionality, and DNS hostname caching

- `dashboard_js-ui.js`     - **Javascript UI Module**
                           - UI rendering, search filtering, visual state management, MACRO/micro view mode support, search recall and save, and integrated pool grid management 
 
- `dashboard_js-logger.js` - **Javascript Logger Module**
                           - Dedicated logger with resizable UI, state persistence, memory management, wake lock integration, session storage and copy

- `dashboard_themes.css`   - **Dashboard CSS with 3 themes**
                           - AGLight (theme1) which is reminiscint of AdminGUI, Monochrome Grey (theme2), and Amber (theme3)
 
- `dashboard_logo.png`     - logo image file

#### Front-end Configuration

**1. Create Required Data Groups:**
```bash
# Client access control
tmsh create ltm data-group internal datagroup-dashboard-clients type ip
tmsh modify ltm data-group internal datagroup-dashboard-clients records add { 10.0.0.0/8 { } }

# Debug access control  
tmsh create ltm data-group internal datagroup-dashboard-debug type ip
tmsh modify ltm data-group internal datagroup-dashboard-debug records add { 10.0.0.0/8 { } }

# Available sites with sort order. Sites are listed top-down in the site dropdown from lowest to highest. The Front-end typically is assigned the lowest value.
tmsh create ltm data-group internal datagroup-dashboard-sites type string
tmsh modify ltm data-group internal datagroup-dashboard-sites records add { 
    "CHICAGO" { data "10" } 
    "NEWYORK" { data "20" } 
}

# API host mappings. This maps a site name to an API host virtualserver IP
tmsh create ltm data-group internal datagroup-dashboard-api-host type string
tmsh modify ltm data-group internal datagroup-dashboard-api-host records add { 
    "NEWYORK" { data "192.168.2.100" } 
}

# Pool configuration with sort order. The sort order is an administrative control that allows the UI Module to present the pools in a controlled order. If no sort order value is set, the iRule applies a value of 999 and the UI displays the pools in the order they exist within the pools datagroup.
tmsh create ltm data-group internal datagroup-dashboard-pools type string
tmsh modify ltm data-group internal datagroup-dashboard-pools records add { 
    "web_pool" { data "10" } 
    "app_pool" { data "20" } 
}

# Pool aliases (optional) - If the LTM pool names are sufficiently descriptive then aliases may not be required; Note that by default the dashboard shows the alias names with the actual names in the tooltip.
tmsh create ltm data-group internal datagroup-dashboard-pool-alias type string
tmsh modify ltm data-group internal datagroup-dashboard-pool-alias records add { 
    "web_pool" { data "Web Servers" } 
}

# API authentication keys - this can be any value but must match from Front-End to API Hosts
tmsh create ltm data-group internal datagroup-dashboard-api-keys type string
tmsh modify ltm data-group internal datagroup-dashboard-api-keys records add { 
    "dashboard-secure-api-key8192025" { data "Installed 8 19 2025" } 
}
```

### Automated Pool Discovery

Use this script to automatically discover and populate pool data groups:

```bash
#!/bin/bash
# Automated Pool Discovery Script
# This script discovers all existing pools and populates the dashboard data groups

# Get all pool names from /Common partition (removing /Common/ prefix)
POOLS=$(tmsh list ltm pool one-line | grep -o "ltm pool [^{]*" | awk '{print $3}' | sed 's|^/Common/||' | tr '\n' ' ')

echo "Discovered pools: $POOLS"

# Populate dashboard-pools data group with auto-incrementing sort order (by 10s)
POOL_RECORDS=""
SORT_ORDER=10
for POOL in $POOLS; do
    POOL_RECORDS="$POOL_RECORDS \"$POOL\" { data \"$SORT_ORDER\" }"
    ((SORT_ORDER+=10))
done

# Apply to data groups
tmsh modify ltm data-group internal datagroup-dashboard-pools records replace-all-with { $POOL_RECORDS }

# Initialize empty aliases (can be customized later)
ALIAS_RECORDS=""
for POOL in $POOLS; do
    ALIAS_RECORDS="$ALIAS_RECORDS \"$POOL\" { data \"\" }"
done

tmsh modify ltm data-group internal datagroup-dashboard-pool-alias records replace-all-with { $ALIAS_RECORDS }

echo "Pool data groups populated successfully!"
echo "Total pools configured: $(echo $POOLS | wc -w)"
```

**Note:** After running this script, you can manually customize aliases by modifying the `datagroup-dashboard-pool-alias` data group to provide user-friendly display names.

**2. Create Pools:**
```bash
# API hosts pool
tmsh create ltm pool dashboard-api-hosts_https_pool members add { 192.168.2.100:443 }

# DNS pool (if using DNS resolution)
tmsh create ltm pool dashboard-dns_udp53_pool members add { 192.168.1.53:53 }
```

**3. Upload Static Assets as iFiles:**
```bash
tmsh create sys file ifile dashboard_js-core.js source-path file:///path/to/dashboard_js-core.js
tmsh create sys file ifile dashboard_js-client.js source-path file:///path/to/dashboard_js-client.js
tmsh create sys file ifile dashboard_js-data.js source-path file:///path/to/dashboard_js-data.js
tmsh create sys file ifile dashboard_js-ui.js source-path file:///path/to/dashboard_js-ui.js
tmsh create sys file ifile dashboard_js-logger.js source-path file:///path/to/dashboard_js-logger.js
tmsh create sys file ifile dashboard_themes.css source-path file:///path/to/dashboard_themes.css
tmsh create sys file ifile dashboard_logo.png source-path file:///path/to/dashboard_logo.png
```

**4. Create Virtual Server:**
```bash
tmsh create ltm virtual dashboard-frontend_https_vs {
    destination 192.168.1.100:443
    ip-protocol tcp
    pool none
    profiles add {
        tcp { }
        http { }
        clientssl { 
            context clientside 
        }
    }
    rules { LTM_Dashboard-Frontend_v1.7_irule }
}
```

**5. Configure APM Policy:**
   - Create APM policy with session variable `session.custom.dashboard.auth = 1`
   - Apply policy to the virtual server

### Backend API Setup

The **Dashboard API Host** provides JSON-based pool data endpoints for remote sites. Backend hosts perform the actual pool member status checks, DNS hostname resolution (if configured), and serve optimized data to frontend dashboard instances. Multiple backend API hosts can support a single frontend for distributed monitoring.

#### Dashboard API Hosts Critical Dependencies:

**1. `datagroup-dashboard-trusted-frontends` (Address)**
- Used to restrict access to authorized dashboard front-ends Self-IPs

**2. `datagroup-dashboard-api-keys` (String)**
- Used to authenticate Front-end to API host

**3. `datagroup-dashboard-pools` (String)**
- Used to provide a list of pools to display

**4. `datagroup-dashboard-pool-alias` (String)**
- Used to create alias names for actual pool names

**5. `dashboard-dns_udp53_pool` (API Host LTM Pool)**
- This pool contains the DNS listener for monitoring

**6. `/Common/dashboard-DNS` (API Host LTM dns-resolver)**
- This resolver should map to a GTM listener dedicated for dashboard and scoped for in-addr.arpa.

#### Backend API Configuration

**1. Create Required Data Groups:**
```bash
# Trusted frontend IPs
tmsh create ltm data-group internal datagroup-dashboard-trusted-frontends type ip
tmsh modify ltm data-group internal datagroup-dashboard-trusted-frontends records add { 192.168.1.100 { } }

# API authentication (same key as frontend)
tmsh create ltm data-group internal datagroup-dashboard-api-keys type string
tmsh modify ltm data-group internal datagroup-dashboard-api-keys records add { 
    "your-secure-api-key-here" { data "1" } 
}

# Pool configuration (backend-specific pools)
tmsh create ltm data-group internal datagroup-dashboard-pools type string
tmsh modify ltm data-group internal datagroup-dashboard-pools records add { 
    "backend_web_pool" { data "10" } 
    "backend_app_pool" { data "20" } 
}

# DNS pool (if using DNS resolution)
tmsh create ltm pool dashboard-dns_udp53_pool members add { 192.168.2.53:53 }
```

### Automated Pool Discovery

Use the same pool discovery script on backend API hosts:

```bash
#!/bin/bash
# Automated Pool Discovery Script
# This script discovers all existing pools and populates the dashboard data groups

# Get all pool names from /Common partition (removing /Common/ prefix)
POOLS=$(tmsh list ltm pool one-line | grep -o "ltm pool [^{]*" | awk '{print $3}' | sed 's|^/Common/||' | tr '\n' ' ')

echo "Discovered pools: $POOLS"

# Populate dashboard-pools data group with auto-incrementing sort order (by 10s)
POOL_RECORDS=""
SORT_ORDER=10
for POOL in $POOLS; do
    POOL_RECORDS="$POOL_RECORDS \"$POOL\" { data \"$SORT_ORDER\" }"
    ((SORT_ORDER+=10))
done

# Apply to data groups
tmsh modify ltm data-group internal datagroup-dashboard-pools records replace-all-with { $POOL_RECORDS }

# Initialize empty aliases (can be customized later)
ALIAS_RECORDS=""
for POOL in $POOLS; do
    ALIAS_RECORDS="$ALIAS_RECORDS \"$POOL\" { data \"\" }"
done

tmsh modify ltm data-group internal datagroup-dashboard-pool-alias records replace-all-with { $ALIAS_RECORDS }

echo "Pool data groups populated successfully!"
echo "Total pools configured: $(echo $POOLS | wc -w)"
```

**Note:** After running this script, you can manually customize aliases by modifying the `datagroup-dashboard-pool-alias` data group to provide user-friendly display names.

**2. Create API Virtual Server:**
```bash
tmsh create ltm virtual dashboard-api_https_vs {
    destination 192.168.2.100:443
    ip-protocol tcp
    pool none
    profiles add {
        tcp { }
        http { }
        clientssl { 
            context clientside 
        }
    }
    rules { LTM_Dashboard-API-Host_v1.7_irule }
}
```

### DNS Resolver Setup (Optional)

The **DNS Resolver** provides hostname resolution capabilities for both frontend and backend components. This enables the dashboard to display friendly hostnames instead of IP addresses for pool members. The resolver can be a standard LTM DNS resolver or a dedicated GTM listener with access restrictions.

**Create DNS Resolver:**
```bash
tmsh create net dns-resolver dashboard-DNS {
    forward-zones add { 
        in-addr.arpa { 
            nameservers add { 192.168.1.53:53 }
        }
    }
    route-domain none
}
```

**GTM/DNS Listener Configuration:**
If using GTM for DNS resolution, create a dedicated listener with access restrictions:

```bash
# Create GTM listener for dashboard DNS
tmsh create gtm listener dashboard-dns-listener {
    address 192.168.1.53
    port 53
    ip-protocol udp
    profiles add { dns }
    rules { DNS_Dashboard-DNS-Restrict_v1.0_irule }
}

# Create data group for authorized DNS clients (LTM Self-IPs)
tmsh create ltm data-group internal dashboard-dns-clients type ip
tmsh modify ltm data-group internal dashboard-dns-clients records add { 
    10.1.1.100/32 { }    # Frontend BIG-IP Self-IP
    10.1.2.100/32 { }    # Backend BIG-IP Self-IP
}
```

**DNS Restriction iRule (DNS_Dashboard-DNS-Restrict_v1.0_irule):**
This iRule should be applied to the GTM listener to restrict DNS queries:
- Allows PTR queries from authorized clients (for hostname resolution)
- Restricts A record queries to specific dashboard hostnames
- Refuses all other query types and unauthorized clients

## Configuration

### Debug Settings
Enable debug logging by modifying the iRule variables:
```tcl
# In CLIENT_ACCEPTED event
set debug_enabled 1    # Set to 1 to enable debug
set dns_enabled 1      # Set to 1 to enable DNS resolution
```

### Pool Configuration
Pools are configured via data groups:
- `datagroup-dashboard-pools`: Pool names with sort order
- `datagroup-dashboard-pool-alias`: Optional display aliases
- Sort order determines display sequence (lower numbers first)

### Site Configuration
Multi-site setup via data groups:
- `datagroup-dashboard-sites`: Available sites with sort order
- `datagroup-dashboard-api-host`: Site-to-IP mappings for API backends

## API Reference

### Health Endpoint
```
GET /api/health
```
Returns API health status (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "hostname": "bigip-01.example.com",
  "timestamp": "2025-01-15 14:30:45",
  "uptime_seconds": 1234567,
  "version": "1.7",
  "pools_configured": 5,
  "message": "API endpoint is operational with 5 pools configured"
}
```

### Pool Data Endpoint
```
GET /api/proxy/pools
Headers:
  X-API-Key: your-secure-api-key-here
  X-Selected-Site: CHICAGO
  X-Instance-ID: inst_abc123
```
Returns detailed pool and member status information.

**Response:**
```json
{
  "hostname": "bigip-01.example.com",
  "timestamp": "2025-01-15 14:30:45",
  "debug_enabled": "disabled",
  "instanceId": "inst_abc123",
  "pools": [
    {
      "name": "web_pool",
      "alias": "Web Servers",
      "sort_order": 1,
      "status": "UP",
      "up_members": 2,
      "down_members": 0,
      "disabled_members": 0,
      "total_members": 2,
      "members": [
        {
          "ip": "192.168.1.10",
          "port": "80",
          "status": "up",
          "hostname": "web01.example.com"
        }
      ]
    }
  ]
}
```

## Usage

### Basic Operation
1. Access dashboard URL in web browser
2. Authenticate via APM policy and ensure APM sets session variable `session.custom.dashboard.auth = 1`
3. Select desired site from dropdown
4. Monitor pool status in near real-time

### Search and Filtering
- **Search Syntax:** Boolean operators (AND, OR, NOT)
- **Special Keywords:** `changed` (shows pools with unacknowledged member changes)
- **Examples:**
  - `web AND up` - Pools containing "web" with "up" status
  - `NOT disabled` - All pools except disabled ones
  - `changed` - Pools with member state changes

### Keyboard Shortcuts
- `Ctrl+F` / `Cmd+F` - Focus search filter
- `Alt+C` - Filter for changed members
- `Alt+M` - Toggle MACRO/MICRO view mode
- `Alt+T` - Cycle themes
- `Alt+L` - Toggle event logger
- `Alt+R` - Resolve DNS hostnames
- `Alt+F` - Flush DNS cache
- `Alt+1-5` - Load saved searches
- `Alt+Shift+1-5` - Save current search

### View Modes
- **MACRO Mode:** Full member details with status and actions
- **MICRO Mode:** Compact pool-only view with change indicators

## Troubleshooting

### Common Issues

**Dashboard shows "No pools configured"**
- Verify `datagroup-dashboard-pools` contains pool names
- Check pool names match actual BIG-IP pool configuration in `/Common` partition
- Ensure all dashboard components are deployed in `/Common` partition (v1.7 limitation)
- Enable debug logging to see backend responses

**API authentication failures**
- Verify API keys match between frontend and backend
- Check `datagroup-dashboard-api-keys` configuration in `/Common` partition
- Ensure frontend IP is in `datagroup-dashboard-trusted-frontends`

**DNS resolution not working**
- Verify DNS resolver configuration in `/Common` partition
- Check `dashboard-dns_udp53_pool` has active members
- Set `dns_enabled = 1` in iRule configuration
- Ensure TMOS version supports advanced DNS features (13.0+ recommended)

**Site selection shows no sites**
- Check `datagroup-dashboard-sites` configuration in `/Common` partition
- Verify `datagroup-dashboard-api-host` mappings
- Ensure backend API hosts are accessible from the Front-end

### Debug Mode
Enable comprehensive logging:
1. Set `debug_enabled = 1` in iRule
2. Add client IP to `datagroup-dashboard-debug`
3. Monitor logs: `tail -f /var/log/ltm`

## Known Limitations

### Multi-Partition Support
**Dashboard v1.7 is not multi-partition compatible.** All BIG-IP objects (pools, data groups, virtual servers, iRules, etc.) must reside in the `/Common` partition. 

### TMOS Version Compatibility
**Minimum Required:** TMOS 15.0
**Tested Versions:**
- TMOS 15.x series (15.1.0 and higher recommended)
- TMOS 16.x series (all versions)
- TMOS 17.x series (all versions)

### Other Limitations
- DNS resolution only supports IPv4 PTR lookups

## Performance

**Scalability:**
- Tested with 500+ pools per site
- Tested with 1000+ pool members 

**Resource Usage:**
- ~2MB memory per dashboard instance
- ~1KB/pool in session storage
- Minimal CPU impact on F5 device
- Network traffic scales with refresh frequency
- 0% GPU Browser pipeline usage when in an unalarmed state

## Contributing

This project uses:
- **iRules (Tcl)** for F5 BIG-IP integration
- **Vanilla JavaScript** for frontend (no frameworks)
- **CSS Grid/Flexbox** for responsive layout
- **Session Storage** for session state persistence

When contributing:
1. Maintain compatibility with F5 BIG-IP TMOS 15.0+ (test on multiple versions)
2. All development must target `/Common` partition (v1.7 limitation)
3. Test with multiple themes and view modes
4. Verify browser compatibility across supported platforms
5. Update version numbers consistently across all files
6. Add debug logging for new features
7. Consider TMOS version compatibility for new iRule features

## License

MIT License - see [LICENSE](LICENSE) file for details.
