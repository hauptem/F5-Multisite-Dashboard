# F5 BIG-IP Multi-Site Dashboard v1.7

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

A comprehensive real-time monitoring dashboard for F5 BIG-IP load balancers featuring multi-site support, DNS hostname resolution, member state tracking, and advanced filtering capabilities.

## Overview

You're troubleshooting an application issue. Your monitoring tools show trends and alerts, but you need to know **right now**: Are the pool members actually up? Which ones changed state? What's the real status behind that load balancer?

Traditionally, this means logging into the F5 GUI, navigating through Local Traffic > Pools, clicking through individual pool pages, and refreshing to see current state. When your application spans multiple sites, you're logging into multiple F5s, checking the same pools across different locations, trying to piece together a complete picture of application health. Meanwhile, application teams are asking operations teams for status updates, who then have to reach out to F5 engineers, creating a chain of dependencies just to answer basic "is it working?" questions.

Your enterprise monitoring tools excel at historical trends and alerting, but when you need current state of specific pool members - not 5 minutes ago when the last poll happened - there's a gap that forces manual investigation.

### What This Actually Is

This isn't another monitoring dashboard. 
**It's the F5 serving a sophisticated application interface directly from the BIG-IP itself.**

A 170KB modular JavaScript application runs entirely in your browser, served directly from the F5's high-speed operational dataplane. One or more sites operate as Dashboard Front-Ends serving the dashboard interface (HTML, JavaScript, CSS) via iFiles, while other sites operate as API Hosts providing pool data through optimized JSON-based dashboard API calls. This provides unified visibility across multiple sites from a single interface without requiring even a read-only account on any of the BIG-IPs, allowing you to switch between locations and see consistent pool, member, and health status data with almost no latency and very little overhead. All dashboard sites inherit the high-availability capabilities of their host BIG-IP cluster. Think of it as an extension of the F5 GUI: near real-time state tracking, DNS hostname resolution (if configured), advanced search/filtering, and the ability to see exactly what changed and when. It gives application teams and operations teams direct visibility into application state without needing to wait for answers from F5 engineers, eliminating the organizational bottleneck that slows down troubleshooting when every minute counts. F5-Multisite-Dashboard is an ultra-performant, near real-time looking glass directly into application pool state. It doesn't replace Network Management Systems - it complements them by providing instant visibility that NMS platforms can't match.

**Bottom Line:** When you need to know what's really happening with your applications behind the F5, Dashboard gives you that answer immediately, with zero additional infrastructure cost.

### Why This Approach Wasn't Considered Before

**Organizational Boundaries:** Network teams manage F5s while monitoring teams buy enterprise platforms. The idea of the F5 serving sophisticated applications never crosses organizational boundaries.

**Conceptual Limitations:** F5s are still unfortunately seen as network devices, not application delivery platforms. The enterprise software industry has institutionalized the belief that monitoring must be external and centralized, even when the device being monitored is perfectly capable of providing its own real-time interface.

**Technical Assumptions:** Most don't realize that modern browsers can handle sophisticated applications, or that iRules can serve as full application backends. The pattern of using F5s to inject third-party monitoring JavaScript exists, but always for sending data out to external systems, never for serving applications that query the F5 itself.

**Dashboard AGLight (theme1) in MACRO mode**
<img width="1504" height="1021" alt="Image" src="https://github.com/user-attachments/assets/82483b0d-de24-424c-87ea-eb6c59252431" />

**Dashboard Monochrome Grey (theme2) micro mode with CLI-based logger active**
<img width="1504" height="1021" alt="Image" src="https://github.com/user-attachments/assets/2a480ec3-c8c8-4463-a3df-acde98ed012f" />

**Dashboard Amber (theme3) MACRO mode with alarmed pools**
<img width="1504" height="1021" alt="Image" src="https://github.com/user-attachments/assets/dff7ae0e-5673-4048-8a4a-19eabea016a5" />

**Three instances of Dashboard three sites in three tabs of Microsoft Edge - complete data isolation**
<img width="2497" height="1186" alt="Image" src="https://github.com/user-attachments/assets/980ad18f-fa62-431b-b6ac-38dbb86cc6ea" />

**Notional layout of the multi-site topology. Supports multiple Front-ends; scales horizontally as needed**
<img width="2026" height="1130" alt="Image" src="https://github.com/user-attachments/assets/d629864e-4614-4e6b-8886-553c0b720f2c" />

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
- TMOS Version: 15.0 or higher (tested on 15.x, 16.x, 17.x)
- DNS resolver configured for PTR lookups (optional)
- **Note:** This version (1.7) is not multi-partition compatible - all objects must be in `/Common` partition. Partition compatibility is planned for version 2.0.
- 

## Frontend Setup
### Dashboard Front-End Critical Dependencies:

All datagroups, pools and DNS resolver must exist in LTM and match the item names in the iRule. If you wish to use custom names for pools, make sure to edit the relevant iRule references.

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

# Front-end Configuration

## Create Data Groups
The dashboard requires several data groups for configuration and access control.

### Data Group - datagroup-dashboard-clients
1. Navigate to **Local Traffic → iRules → Data Group List**
2. Click **Create**
3. Configure data group:
   - **Name**: `datagroup-dashboard-clients`
   - **Type**: `Address`
   - **Description**: `Authorized client networks for dashboard access`

4. Add client networks:
   - **Address**: `192.168.1.0/24` (example - your client network)
   - **Address**: `10.0.0.0/8` (add your specific subnets)

5. Click **Finished**

### Data Group - datagroup-dashboard-debug
1. Click **Create** 
2. Configure data group:
   - **Name**: `datagroup-dashboard-debug`
   - **Type**: `Address`
   - **Description**: `Client IPs authorized for debug logging`

3. Add debug clients:
   - **Address**: `192.168.1.100` (admin workstation IP)
   - **Address**: `10.0.1.50` (network engineer desktop)

4. Click **Finished**

### Data Group - datagroup-dashboard-sites
1. Click **Create** 
2. Configure data group:
   - **Name**: `datagroup-dashboard-sites`
   - **Type**: `String`
   - **Description**: `Available monitoring sites with display order`

3. Add sites; note that the Front-end itself should be first with the lowest sort order:
   - **String**: `CHICAGO`, **Value**: `10`
   - **String**: `NEW_YORK`, **Value**: `20`
   - **String**: `LONDON`, **Value**: `30`
   - **String**: `TOKYO`, **Value**: `40`

4. Click **Finished**

### Data Group - datagroup-dashboard-api-host
1. Click **Create** 
2. Configure data group:
   - **Name**: `datagroup-dashboard-api-host`
   - **Type**: `String`
   - **Description**: `Maps site names to backend BIG-IP API IPs`

3. Add site mappings:
   - **String**: `NEW_YORK`, **Value**: `192.168.2.100`
   - **String**: `LONDON`, **Value**: `192.168.3.100`
   - **String**: `TOKYO`, **Value**: `192.168.4.100`

4. Click **Finished**

**Note**: Do not include the frontend site (CHICAGO) in this data group.

### Data Group - datagroup-dashboard-pools
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-pools`
   - **Type**: `String`
   - **Description**: `Local pools to display with sort order`

3. Add local pools (recommended to use sort order increments of 10 for later adjustment):
   - **String**: `web_servers_pool`, **Value**: `10`
   - **String**: `app_servers_pool`, **Value**: `20`
   - **String**: `database_pool`, **Value**: `30`
   - **String**: `api_pool`, **Value**: `40`

4. Click **Finished**

### Data Group  - datagroup-dashboard-pool-alias
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-pool-alias`
   - **Type**: `String`
   - **Description**: `User-friendly names for pools`

3. Add pool aliases:
   - **String**: `web_servers_pool`, **Value**: `Web Servers`
   - **String**: `app_servers_pool`, **Value**: `Application Tier`
   - **String**: `database_pool`, **Value**: `Database Cluster`
   - **String**: `api_pool`, **Value**: `API Gateway`

4. Click **Finished**

### Data Group - datagroup-dashboard-api-keys
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-api-keys`
   - **Type**: `String`
   - **Description**: `API keys for backend authentication`

3. Add API key:
   - **String**: `dashboard-api-key-2025-v17`

4. Click **Finished**

**Note**: This same key must be configured on all backend BIG-IP systems.

### Automated Pool Discovery
Use this script to automatically discover and populate existing pools into both pool data groups:

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

## Create Required Pools
The frontend requires specific pools for health monitoring and backend communication.

### Pool 1 - dashboard-api-hosts_https_pool
This pool is used only for monitoring and detection of API host reachability and operation. The Front-end uses the datagroup 'datagroup-dashboard-api-host' to actually map client requests for specific sites to back-end virtualserver IPs. This pool enables dashboard to present intelligence about the state of the API host instead of failing silently.

1. Navigate to **Local Traffic → Pools → Pool List**
2. Click **Create**
3. Configure pool settings:
   - **Name**: `dashboard-api-hosts_https_pool`
   - **Description**: `Backend BIG-IP API endpoints for dashboard`
   - **Health Monitors**: `https` (recommended to create a custom HTTPS monitor)
   - **Load Balancing Method**: `Round Robin`

4. Add backend members (repeat for each backend site):
   - Click **New Member**
   - **Address**: Backend BIG-IP API virtual server IP for Site <SITENAME>
   - **Service Port**: `443`
   - Click **Add**

5. Click **Finished**

### Pool 2 - dashboard-dns_udp53_pool
This pool monitors DNS resolver availability. The Front-end iRule will check member state for this pool and fail back gracefully to IP-only mode if all members in this pool are down.

1. Navigate to **Local Traffic → Pools → Pool List**
2. Click **Create**
3. Configure pool settings:
   - **Name**: `dashboard-dns_udp53_pool`
   - **Description**: `DNS servers for dashboard hostname resolution`
   - **Health Monitors**: `dns` (recommended to create a custom monitor)
   - **Load Balancing Method**: `Round Robin`

4. Add DNS server member:
   - Click **New Member**
   - **Address**: Enter your DNS server IP (same as used in the resolver dashboard-DNS)
   - **Service Port**: `53`
   - **Click** **Add**

5. Click **Finished**

### Create a Custom HTTPS Monitor
For health checking of backend APIs:

1. Navigate to **Local Traffic → Monitors → Monitor List**
2. Click **Create**
3. Configure monitor:
   - **Name**: `dashboard-api-host_https_monitor`
   - **Type**: `HTTPS`
   - **Interval**: `5` seconds
   - **Timeout**: `16` seconds
   - **Send String**: 
     ```
     GET /api/health HTTP/1.1\r\nConnection: Close\r\n\r\n
     ```
   - **Receive String**: `(healthy|unhealthy)`
   - note that any JSON response from the API host is a valid check of the API host operation. "unhealthy" is used by an endpoint to inform the client about a problem on the API host, but is valid for a health check.

4. Click **Finished**
5. Return to backend pool and assign this monitor to the dashboard-api-hosts_https_pool

---

## DNS Resolver Configuration 
(Optional to use but the iRule will require it to exist unless edited)
The DNS resolver enables hostname display for pool members in dashboard responses.

### Access BIG-IP via SSH
1. SSH to your Frontend BIG-IP as an administrative user
2. Access the tmsh shell:
   ```
   tmsh
   ```

### Create DNS Resolver
Execute the following command, replacing the DNS server IP with your environment's DNS server.
Note that the iRule will expect 'dashboard-DNS' to exist unless this reference is edited for a different resolver name.

```tcl
create net dns-resolver dashboard-DNS forward-zones add { in-addr.arpa { nameservers add { 192.168.1.53:53 } } }
```

### Configuration Notes:
- Replace `192.168.1.53` with your DNS server IP address
- For GTM integration, use your GTM listener IP address
- Dashboard will only request PTR records so it is recommended to scope the resolver to in-addr-arpa. unless a shared resolver is used for dashboard

### Verify DNS Resolver Creation
```tcl
list net dns-resolver dashboard-DNS
```

### Save Configuration
```tcl
save sys config
```

### Exit TMSH
```tcl
quit
```

## Upload Static Files (iFiles)
The dashboard requires multiple static files for the web interface.

### Access iFile Management
1. Navigate to **Local Traffic → iRules → iFile List**

Upload the following files:

1. **dashboard_logo.png**
   - Name: `dashboard_logo.png`
   - Upload your organization's logo image

2. **dashboard_themes.css**
   - Name: `dashboard_themes.css`
   - Contains all 5 themes and responsive design

3. **dashboard_js-core.js**
   - Name: `dashboard_js-core.js`
   - Core coordination and timing functionality

4. **dashboard_js-client.js**
   - Name: `dashboard_js-client.js`
   - HTTP communication and API management

5. **dashboard_js-data.js**
   - Name: `dashboard_js-data.js`
   - Data management and state tracking

6. **dashboard_js-ui.js**
   - Name: `dashboard_js-ui.js`
   - UI rendering and search functionality

7. **dashboard_js-logger.js**
   - Name: `dashboard_js-logger.js`
   - Event logging with session persistence

1. Click **Import**
2. Configure import:
   - **Import Type**: `File Upload`
   - **File Name**: Select file from your computer
   - **Name**: Use exact filename (e.g., `dashboard_logo.png`)
3. Click **Import**
4. Verify file appears in iFile list

### Verify All Files Uploaded
```bash
tmsh list ltm ifile

ltm ifile F5_logo.png {
    file-name F5_logo.png
}
ltm ifile dashboard_js-client.js {
    file-name dashboard_js-client.js
}
ltm ifile dashboard_js-core.js {
    file-name dashboard_js-core.js
}
ltm ifile dashboard_js-data.js {
    file-name dashboard_js-data.js
}
ltm ifile dashboard_js-logger.js {
    file-name dashboard_js-logger.js
}
ltm ifile dashboard_js-ui.js {
    file-name dashboard_js-ui.js
}
ltm ifile dashboard_logo.png {
    file-name dashboard_logo.png
}
ltm ifile dashboard_themes.css {
    file-name dashboard_themes.css
```

## Create and Configure the Frontend iRule

### Create the iRule

1. Navigate to **Local Traffic → iRules → iRule List**
2. Click **Create**
3. Configure iRule:
   - **Name**: `LTM_Dashboard-Frontend_v1.7_irule`
   - **Description**: `F5 Multi-Site Dashboard Frontend v1.7`

### Add iRule Content

Copy the complete frontend iRule code (from `LTM_Dashboard-Frontend_v1.7_irule.txt`) into the **Definition** field.

### Key Configuration Points in iRule

**Local Site Configuration**

Locate line 82 and modify for your environment:
```tcl
set local_site_name "CHICAGO"
```
Change `"CHICAGO"` to match your frontend site name from the sites data group.

**Debug Configuration**

Locate lines 30-31 to enable/disable debug logging:
```tcl
set debug_enabled 0
set dns_enabled 1
```
- Set `debug_enabled` to `1` to enable debug logging (recommended during setup)
- Set `dns_enabled` to `1` to enable DNS hostname resolution
- Set to `0` to disable features

### Save iRule

1. Click **Finished**
2. Verify iRule appears in iRule list without syntax errors
3. If errors exist, review and correct the iRule code

## Create Virtual Server

### Create Virtual Server

1. Navigate to **Local Traffic → Virtual Servers → Virtual Server List**
2. Click **Create**

### Basic Configuration

- **Name**: `dashboard_frontend_vs`
- **Description**: `F5 Multi-Site Dashboard Frontend v1.7`
- **Type**: `Standard`
- **Source Address**: `0.0.0.0/0`
- **Destination Address**: Choose appropriate IP for dashboard access
- **Service Port**: `443` (HTTPS recommended)

### Protocol Configuration

- **HTTP Profile (Client)**: `http`
- **SSL Profile (Client)**: Select appropriate SSL profile for HTTPS
- **SSL Profile (Server)**: `serverssl` 

### Advanced Configuration

- **Source Address Translation**: `Auto Map`
- **Address Translation**: `Enabled`
- **Port Translation**: `Enabled`

### Access Policy Assignment

- **Access Profile**: Select your configured APM access policy

### iRule Assignment

1. In **Resources** section, find **iRules**
2. Move `LTM_Dashboard-Frontend_v1.7_irule` from Available to Enabled

### Default Pool Assignment

- **Default Pool**: Leave blank (iRule handles all routing)

### Finish Virtual Server Creation

1. Click **Finished**
2. Verify virtual server shows as **Available (Enabled)**

---

### Access APM Configuration

1. Navigate to **Access → Profiles/Policies → Access Profiles (Per-Session Policies)**

### Required Session Variables

The dashboard requires a specific session variable to function. Your access policy **must** set:

**Variable Name**: `session.custom.dashboard.auth`  
**Required Value**: `1`

### Implementation Options

**Option 1: Modify Existing Policy**
If you have an existing access policy:

1. Click **Edit** on your access policy
2. Add a **Variable Assign** action after successful authentication
3. Configure variable assignment:
   - **Variable Type**: `Session Variable`
   - **Variable Name**: `session.custom.dashboard.auth`
   - **Variable Value**: `1`
4. Save and apply the access policy

**Option 2: Create New Policy**
If creating a new access policy:

1. Click **Create**
2. Configure basic policy settings:
   - **Name**: `dashboard_access_policy`
   - **Profile Type**: `All`
   - **Language Settings**: Configure as needed
3. Click **Finished**
4. Click **Edit** to modify the policy flow
5. Add authentication steps as required by your organization
6. Before the final **Allow** ending, add **Variable Assign**:
   - **Variable Type**: `Session Variable`
   - **Variable Name**: `session.custom.dashboard.auth`
   - **Variable Value**: `1`
7. Save and apply the policy

---

### Backend API Host Setup
The **Dashboard API Host** provides JSON-based endpoints for remote sites. 

#### Dashboard API Hosts Critical Dependencies:

**1. `datagroup-dashboard-trusted-frontends` (Address)**
- Used to restrict access to authorized dashboard front-ends Self-IPs to the API Host virtualserver

**2. `datagroup-dashboard-api-keys` (String)**
- Used to authenticate Front-ends to the API host

**3. `datagroup-dashboard-pools` (String)**
- Used to provide a local list of pools to display

**4. `datagroup-dashboard-pool-alias` (String)**
- Used to create alias names for actual configuration pool names

**5. `dashboard-dns_udp53_pool` (API Host LTM Pool)**
- This pool contains the DNS listener for monitoring

**6. `/Common/dashboard-DNS` (API Host LTM dns-resolver)**
- This resolver should map to a GTM listener dedicated for dashboard and scoped for in-addr.arpa.

#### Backend API Configuration
## Create Data Groups
The dashboard requires several data groups for configuration and access control.

### Data Group - datagroup-dashboard-clients
1. Navigate to **Local Traffic → iRules → Data Group List**
2. Click **Create**
3. Configure data group:
   - **Name**: `datagroup-dashboard-trusted-frontends`
   - **Type**: `Address`
   - **Description**: `Authorized frontend BIG-IP self-IPs for API access`

4. Add frontend IPs:
   - **Address**: `192.168.1.50` (Primary Frontend BIG-IP self-IP)
   - **Address**: `192.168.1.51` (Secondary Frontend BIG-IP self-IP)
   - **Address**: `10.0.1.100` (Development Frontend)

5. Click **Finished**

### Data Group - datagroup-dashboard-pools
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-pools`
   - **Type**: `String`
   - **Description**: `Local pools to display with sort order`

3. Add local pools (recommended to use sort order increments of 10 for later adjustment):
   - **String**: `web2_servers_pool`, **Value**: `10`
   - **String**: `app2_servers_pool`, **Value**: `20`
   - **String**: `database2_pool`, **Value**: `30`
   - **String**: `api2_pool`, **Value**: `40`

4. Click **Finished**

**Important Notes**:
- Pool names must match exactly (case-sensitive)
- Sort order determines display sequence in dashboard
- Use increments of 10 to allow for future insertions
- Only pools in this data group will be available via API Calls

### Data Group  - datagroup-dashboard-pool-alias
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-pool-alias`
   - **Type**: `String`
   - **Description**: `User-friendly names for pools`

3. Add pool aliases:
   - **String**: `web2_servers_pool`, **Value**: `Web Servers`
   - **String**: `app2_servers_pool`, **Value**: `Application Tier`
   - **String**: `database2_pool`, **Value**: `Database Cluster`
   - **String**: `api2_pool`, **Value**: `API Gateway`

4. Click **Finished**

### Data Group - datagroup-dashboard-api-keys
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-api-keys`
   - **Type**: `String`
   - **Description**: `Valid API keys for dashboard authentication`

3. Add API key:
   - **String**: `dashboard-api-key-2025-v17`, **Value**: `Production API Key - Issued 2025-09 - Shared with Frontend`

4. Click **Finished**

**Security Requirements**:
- Use strong, randomly generated API keys (minimum 32 characters)
- Include letters, numbers, and special characters
- Same key must be configured on all frontend BIG-IPs
- Consider key rotation procedures for enhanced security

### Automated Pool Discovery
Use this script to automatically discover and populate existing pools into both pool data groups:

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

## Create Required Pools
The API Host requires a single specific pool for health monitoring of the dashboard-DNS resolver

### Pool 1 - dashboard-dns_udp53_pool
This pool monitors DNS resolver availability. The API Host iRule will check member state for this pool and fail back gracefully to IP-only mode if all members in this pool are down.

1. Navigate to **Local Traffic → Pools → Pool List**
2. Click **Create**
3. Configure pool settings:
   - **Name**: `dashboard-dns_udp53_pool`
   - **Description**: `DNS servers for dashboard hostname resolution`
   - **Health Monitors**: `dns` (recommended to create a custom monitor)
   - **Load Balancing Method**: `Round Robin`

4. Add DNS server member:
   - Click **New Member**
   - **Address**: Enter your DNS server IP (same as used in the resolver dashboard-DNS)
   - **Service Port**: `53`
   - **Click** **Add**

5. Click **Finished**

---

## DNS Resolver Configuration 
(Optional to use but the iRule will require it to exist unless edited)
The DNS resolver enables hostname display for pool members in dashboard responses.

### Access BIG-IP via SSH
1. SSH to your Frontend BIG-IP as an administrative user
2. Access the tmsh shell:
   ```
   tmsh
   ```

### Create DNS Resolver
Execute the following command, replacing the DNS server IP with your environment's DNS server.
Note that the iRule will expect 'dashboard-DNS' to exist unless this reference is edited for a different resolver name.

```tcl
create net dns-resolver dashboard-DNS forward-zones add { in-addr.arpa { nameservers add { 192.168.1.53:53 } } }
```

### Configuration Notes:
- Replace `192.168.1.53` with your DNS server IP address
- For GTM integration, use your GTM listener IP address
- Dashboard will only request PTR records so it is recommended to scope the resolver to in-addr-arpa. unless a shared resolver is used for dashboard

### Verify DNS Resolver Creation
```tcl
list net dns-resolver dashboard-DNS
```

### Save Configuration
```tcl
save sys config
```

### Exit TMSH
```tcl
quit
```

## Create and Configure the Frontend iRule

### Create the iRule

1. Navigate to **Local Traffic → iRules → iRule List**
2. Click **Create**
3. Configure iRule:
   - **Name**: `LTM_Dashboard-API-Host_v1.7_irule`

### Add iRule Content

Copy the complete frontend iRule code (from `LTM_Dashboard-API-Host_v1.7_irule.txt`) into the **Definition** field.

### Key Configuration Points in iRule

**Debug Configuration**

Locate lines 30-31 to enable/disable debug logging:
```tcl
set debug_enabled 0
set dns_enabled 1
```
- Set `debug_enabled` to `1` to enable debug logging (recommended during setup)
- Set `dns_enabled` to `1` to enable DNS hostname resolution
- Set to `0` to disable features

### Save iRule

1. Click **Finished**
2. Verify iRule appears in iRule list without syntax errors
3. If errors exist, review and correct the iRule code

## Create Virtual Server

### Create Virtual Server

1. Navigate to **Local Traffic → Virtual Servers → Virtual Server List**
2. Click **Create**

### Basic Configuration

- **Name**: `dashboard_api_host_vs`
- **Description**: `F5 Multi-Site Dashboard API Host`
- **Type**: `Standard`
- **Source Address**: `0.0.0.0/0`
- **Destination Address**: Choose appropriate IP for dashboard access
- **Service Port**: `443` (HTTPS recommended)

### Protocol Configuration

- **HTTP Profile (Client)**: `http`
- **SSL Profile (Client)**: Select appropriate SSL profile for HTTPS

### iRule Assignment

1. In **Resources** section, find **iRules**
2. Move `LTM_Dashboard-API-Host_v1.7_irule` from Available to Enabled

### Default Pool Assignment

- **Default Pool**: Leave blank 

### Finish Virtual Server Creation

1. Click **Finished**
2. Verify virtual server shows as **Available (Enabled)**

---

### Basic API Testing

**Health Endpoint Test**

Test the health endpoint without authentication:

1. **From authorized IP** (frontend or authorized client):
   ```bash
   curl -k https://[api-host-ip]:443/api/health
   ```

2. **Expected Response** (HTTP 200):
   ```json
   {
     "status": "healthy",
     "hostname": "api-host-bigip.company.com",
     "timestamp": "2025-09-25 14:30:15",
     "uptime_seconds": 1234567,
     "version": "1.7",
     "pools_configured": 5,
     "message": "API endpoint is operational with 5 pools configured"
   }
   ```

### Authentication Test

Test API key authentication:

1. **Without API Key** (should fail):
   ```bash
   curl -k https://[api-host-ip]:443/api/proxy/pools
   ```
   **Expected**: HTTP 403 Forbidden

2. **With Invalid API Key** (should fail):
   ```bash
   curl -k -H "X-API-Key: invalid-key" https://[api-host-ip]:443/api/proxy/pools
   ```
   **Expected**: HTTP 403 Forbidden

3. **With Valid API Key** (should succeed):
   ```bash
   curl -k -H "X-API-Key: [your-api-key]" https://[api-host-ip]:443/api/proxy/pools
   ```
   **Expected**: HTTP 200 with pool data

### Pool Data Validation

**Verify Pool Data Response**

1. **Test Data Endpoint**:
   ```bash
   curl -k -H "X-API-Key: [your-api-key]" https://[api-host-ip]:443/api/proxy/pools
   ```

2. **Validate JSON Structure**:
   - Response should include hostname, timestamp, instanceId, pools array
   - Each pool should have name, alias, status, members array
   - Members should include ip, port, status, hostname fields

3. **Compare with BIG-IP Reality**:
   - Pool statuses should match actual BIG-IP pool states
   - Member counts should be accurate
   - IP addresses should be correct
   - Hostnames should resolve properly (if DNS enabled)

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
Enable debug logging or DNS resolution by modifying these two iRule variables:
```tcl
# In CLIENT_ACCEPTED event
set debug_enabled 1    # Set to 1 to enable debug
set dns_enabled 1      # Set to 1 to enable DNS resolution
```
No other irule variables should be changed other than the Front-end Site variable.

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

**API authentication failures**
- Verify API keys match between frontend and backend
- Check `datagroup-dashboard-api-keys` configuration in `/Common` partition
- Ensure frontend IP is in `datagroup-dashboard-trusted-frontends`

**DNS resolution not working**
- Verify DNS resolver configuration in `/Common` partition
- Check `dashboard-dns_udp53_pool` has active members
- Set `dns_enabled = 1` in iRule configuration

**Site selection shows no sites**
- Check `datagroup-dashboard-sites` configuration in `/Common` partition

### Debug Mode
Enable comprehensive logging:
1. Set `debug_enabled = 1` in iRule
2. Add client IP to `datagroup-dashboard-debug`
3. Monitor logs: `tail -f /var/log/ltm`
4. Note that in order to see console logs in browser devtools, you must enable irule debug and be a client in the debug datagroup. The irule will signal the client that you are a debug_enabled client. This is for the non-minified Javascript only.

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
- DNS resolution only supports IPv4 PTR lookups at this time

## Performance

**Scalability:**
- Tested with 500+ pools per site on a lab grade VE
- Tested with 1000+ pool members on a lab grade VE

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
