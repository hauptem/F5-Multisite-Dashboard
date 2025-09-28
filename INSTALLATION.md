# F5 Multisite Dashboard - Installation Guide

This guide provides complete step-by-step installation procedures for both Frontend and API-Host components of the F5 Multisite Dashboard.

---

## Prerequisites

- F5 BIG-IP with LTM and APM modules provisioned
- TMOS Version: 15.0 or higher (tested on 15.x, 16.x, 17.x)
- DNS resolver configured for PTR lookups (optional)
- Note: **Version 1.7.x is not multi-partition compatible**; Partition compatibility is planned for version 2.0.

---

## Frontend Installation

The Frontend serves the web interface and handles user authentication via APM.

### Critical Dependencies

Note: All datagroups, pools and DNS resolver must exist in LTM and match the item names in the iRule.
If you wish to use custom names for dashboard specific pools or the resolver, make sure to edit the relevant iRule references.

**1. `datagroup-dashboard-clients` (Address)**
- Used to restrict dashboard access via Client IP or Client Subnet

**2. `datagroup-dashboard-debug` (Address)**  
- Used to limit dashboard debug via Client IP or Client Subnet

**3. `datagroup-dashboard-sites` (String)**
- Used to define dashboard site list in the dropdown control - the Front-End is typically the first site defined with the lowest sort order e.g. "CHICAGO = 10".

**4. `datagroup-dashboard-api-host` (String)**
- Used to map remote Site names to API Host Virtualserver IP addresses. e.g. "NEWYORK = 192.168.4.33". It is this mapping that the Front-end uses to proxy JSON fetch requests to the API hosts.

**5. `datagroup-dashboard-pools` (String)**
- Used to provide a list of pools to display. **This is an essential step.** LTM does not permit an iRule to determine general elements of TMOS configuration. Therefore we **must** administratively provide configuration attributes in the form of a list of LTM pool names that the dashboard will be permitted to process via LB::status events and subsequently display. This is the one datagroup that will require management of pools as new pools are implemented or pools are removed from LTM. A script has been provided to assist with the initial population of this datagroup. It is possible to use a script with a cron job to manage this group automatically, but that technique is not provided as part of this solution at this time.

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
- This variable must be equal to 1 for the Front-end irule to trigger and needs to be set by the APM Policy that is placed on the Front-End virtualserver. Use any authentication methods appropriate for your organization or use no authentication, but APM must set this variable for the Front-End iRule to trigger. This is primarily done to ensure APM completes before the iRule starts processing client HTTP requests - It's an APM / LTM interoperability control. If you do not desire APM controls, simply set the variable in the LTM iRule or remove the variable check.

**12. iFiles:**

`dashboard_js-core.js` **Javascript Core Module** Core coordination functionality including initialization, themes switching, timers, MACRO/micro view modes, wake lock management, and alias switching
 
`dashboard_js-client.js` **Javascript Client Module** HTTP communication layer for JSON fetch API calls, settings persistence, DNS operations, and fetch request lifecycle management
 
`dashboard_js-data.js` **Javascript Data Module** Data management, instance tracking, state tracking, pool reordering functionality, and DNS hostname caching

`dashboard_js-ui.js` **Javascript UI Module** UI rendering, search filtering, visual state management, MACRO/micro view mode support, search recall and save, and integrated pool grid management 
 
`dashboard_js-logger.js` **Javascript Logger Module** Dedicated logger with resizable UI, state persistence, memory management, wake lock integration, session storage and copy

`dashboard_themes.css` **Dashboard CSS with 3 themes** AGLight (theme1) which is reminiscent of AdminGUI, Monochrome Grey (theme2), and Amber (theme3)
 
`dashboard_logo.png` any 51px by 53px png logo image

### Create Data Groups

The dashboard requires several data groups for configuration and access control.

#### Data Group - datagroup-dashboard-clients
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

#### Data Group - datagroup-dashboard-debug
1. Click **Create** 
2. Configure data group:
   - **Name**: `datagroup-dashboard-debug`
   - **Type**: `Address`
   - **Description**: `Client IPs authorized for debug logging`

3. Add debug clients:
   - **Address**: `192.168.1.100` (admin workstation IP)
   - **Address**: `10.0.1.50` (network engineer desktop)

4. Click **Finished**

#### Data Group - datagroup-dashboard-sites
1. Click **Create** 
2. Configure data group:
   - **Name**: `datagroup-dashboard-sites`
   - **Type**: `String`
   - **Description**: `Available monitoring sites with display order`

3. Add sites; note that the Front-end itself should have the lowest sort order which will cause it to appear first in the list:
   - **String**: `CHICAGO`, **Value**: `10`
   - **String**: `NEW_YORK`, **Value**: `20`
   - **String**: `LONDON`, **Value**: `30`
   - **String**: `TOKYO`, **Value**: `40`

4. Click **Finished**

#### Data Group - datagroup-dashboard-api-host
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

#### Data Group - datagroup-dashboard-pools
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-pools`
   - **Type**: `String`
   - **Description**: `Local pools to display with sort order`

3. Add local pools. You can also add a sort order; the Javascript UI will show pools from lowest to highest. If no sort order is configured the pools will be displayed in the order they appear within the pools datagroup. (It is recommended to use sort order increments of 10 for later re-adjustments):
   - **String**: `web_servers_pool`, **Value**: `10`
   - **String**: `app_servers_pool`, **Value**: `20`
   - **String**: `database_pool`, **Value**: `30`
   - **String**: `api_pool`, **Value**: `40`

4. Click **Finished**

#### Data Group  - datagroup-dashboard-pool-alias
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

#### Data Group - datagroup-dashboard-api-keys
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-api-keys`
   - **Type**: `String`
   - **Description**: `API keys for backend authentication`

3. Add API key:
   - **String**: `dashboard-api-key-2025-v17`

4. Click **Finished**

**Note**: This same key must be configured on all backend BIG-IP systems.

#### Automated Pool Discovery
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

### Create Required Pools

The frontend requires specific pools for health monitoring and backend communication.

#### Pool 1 - dashboard-api-hosts_https_pool
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

#### Pool 2 - dashboard-dns_udp53_pool
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

#### Create a Custom HTTPS Monitor
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
5. Assign this monitor to the dashboard-api-hosts_https_pool

### DNS Resolver Configuration 
(Optional to use but the iRule will require it to exist unless edited)
The DNS resolver enables hostname display for pool members in dashboard responses.

#### Access BIG-IP via SSH
1. SSH to your Frontend BIG-IP as an administrative user
2. Access the tmsh shell:
   ```
   tmsh
   ```

#### Create DNS Resolver
Execute the following command, replacing the DNS server IP with your environment's DNS server.
Note that the iRule will expect 'dashboard-DNS' to exist unless this reference is edited for a different resolver name.

```tcl
create net dns-resolver dashboard-DNS forward-zones add { in-addr.arpa { nameservers add { 192.168.1.53:53 } } }
```

#### Configuration Notes:
- Replace `192.168.1.53` with your DNS server IP address
- For GTM integration, use your GTM listener IP address
- Dashboard will only request PTR records so it is recommended to scope the resolver to in-addr-arpa. unless a shared resolver is used for dashboard

#### Verify DNS Resolver Creation
```tcl
list net dns-resolver dashboard-DNS
```

#### Save Configuration
```tcl
save sys config
```

#### Exit TMSH
```tcl
quit
```

### Upload Static Files (iFiles)
The dashboard requires multiple static files for the web interface.

#### Access iFile Management
1. Navigate to **Local Traffic → iRules → iFile List**

Upload the following files:

1. **dashboard_logo.png**
   - Name: `dashboard_logo.png`
   - Upload your organization's logo image

2. **dashboard_themes.css**
   - Name: `dashboard_themes.css`

3. **dashboard_js-core.js**
   - Name: `dashboard_js-core.js`

4. **dashboard_js-client.js**
   - Name: `dashboard_js-client.js`

5. **dashboard_js-data.js**
   - Name: `dashboard_js-data.js`

6. **dashboard_js-ui.js**
   - Name: `dashboard_js-ui.js`

7. **dashboard_js-logger.js**
   - Name: `dashboard_js-logger.js`

1. Click **Import**
2. Configure import:
   - **Import Type**: `File Upload`
   - **File Name**: Select file from your computer
   - **Name**: Use exact filename (e.g., `dashboard_logo.png`)
3. Click **Import**
4. Verify file appears in iFile list

#### Verify All Files Uploaded
```bash
tmsh list ltm ifile

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

### Create and Configure the Front-end iRule

#### Create the iRule

1. Navigate to **Local Traffic → iRules → iRule List**
2. Click **Create**
3. Configure iRule:
   - **Name**: `LTM_Dashboard-Frontend_v1.7.1_irule`

#### Add iRule Content

Copy the complete frontend iRule code (from `LTM_Dashboard-Frontend_v1.7.1_irule.txt`) into the **Definition** field.

#### Key Configuration Points in iRule

**Local Site Configuration**

Locate the variable "local_site_name" and modify for your environment:
```tcl
set local_site_name "CHICAGO"
```
Change `"CHICAGO"` to match your frontend site name from the sites data group. Only the front-end needs to be made site-aware. The API hosts simply process requests received and do not require site awareness.

#### Save iRule

1. Click **Finished**
2. Verify iRule appears in iRule list without syntax errors
3. If errors exist, review and correct the iRule code

### Front-end Virtual Server

#### Create Virtual Server

1. Navigate to **Local Traffic → Virtual Servers → Virtual Server List**
2. Click **Create**

#### Basic Configuration

- **Name**: `Dashboard-Front-end_https_vs`
- **Description**: `F5 Multisite Dashboard Frontend`
- **Type**: `Standard`
- **Source Address**: `0.0.0.0/0`
- **Destination Address**: Choose appropriate IP for dashboard access
- **Service Port**: `443` 

#### Protocol Configuration

- **HTTP Profile (Client)**: `http`
- **SSL Profile (Client)**: Select appropriate SSL profile for HTTPS
- **SSL Profile (Server)**: `serverssl` 

#### Advanced Configuration

- **Source Address Translation**: `Auto Map`
- **Address Translation**: `Enabled`
- **Port Translation**: `Enabled`

#### Access Policy Assignment

- **Access Profile**: Select your configured APM access policy

#### iRule Assignment

1. In **Resources** section, find **iRules**
2. Move `LTM_Dashboard-Frontend_v1.7.1_irule` from Available to Enabled

#### Default Pool Assignment

- **Default Pool**: Leave blank (iRule handles proxy based on datagroup-dashboard-api-host mapping)

#### Finish Virtual Server Creation

1. Click **Finished**
2. Verify virtual server shows as **Available (Enabled)**

### APM Configuration

#### Access APM Configuration

1. Navigate to **Access → Profiles/Policies → Access Profiles (Per-Session Policies)**

#### Required Session Variables

The dashboard requires a specific session variable to function. Your access policy **must** set:

**Variable Name**: `session.custom.dashboard.auth`  
**Required Value**: `1`

#### Implementation Options

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
   - **Variable Value**: Text `1`
7. Save and apply the policy

---

## API-Host Installation

The **Dashboard API Host** provides JSON-based endpoints for remote sites accessible by one or more Front-ends.

### Critical Dependencies:

**1. `datagroup-dashboard-trusted-frontends` (Address)**
- Used to restrict access to authorized dashboard front-ends Self-IPs to the API Host virtualserver

**2. `datagroup-dashboard-api-keys` (String)**
- Used to authenticate Front-ends to the API host

**3. `datagroup-dashboard-pools` (String)**
- Used to provide a local list of pools to display

**4. `datagroup-dashboard-pool-alias` (String)**
- Used to create alias names for actual configuration pool names

**5. `dashboard-dns_udp53_pool` (LTM Pool)**
- This pool contains the DNS listener for monitoring

**6. `/Common/dashboard-DNS` (LTM dns-resolver)**
- This resolver should map to a GTM listener dedicated for dashboard and scoped for in-addr.arpa.

### Create Data Groups
The dashboard requires several data groups for configuration and access control.

#### Data Group - datagroup-dashboard-trusted-frontends
1. Navigate to **Local Traffic → iRules → Data Group List**
2. Click **Create**
3. Configure data group:
   - **Name**: `datagroup-dashboard-trusted-frontends`
   - **Type**: `Address`
   - **Description**: `Authorized frontend BIG-IP self-IPs for API access`

4. Add frontend IPs:
   - **Address**: `192.168.1.50` (Primary Frontend BIG-IP self-IP)
   - **Address**: `192.168.1.51` (Secondary Frontend BIG-IP self-IP)

5. Click **Finished**

#### Data Group - datagroup-dashboard-pools
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

#### Data Group  - datagroup-dashboard-pool-alias
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

#### Data Group - datagroup-dashboard-api-keys
1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-api-keys`
   - **Type**: `String`
   - **Description**: `Valid API keys for dashboard authentication`

3. Add API key:
   - **String**: `dashboard-api-key-2025-v17`, **Value**: `Production API Key - Issued 2025-09 - Shared with Frontend`

4. Click **Finished**

**Security recommemdations**:
- Use strong, randomly generated API keys (minimum 32 characters)
- Same key must be configured on all dashboard hosts
- Periodically change key in accordance with organization requirements

#### Automated Pool Discovery
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

### Create API Host Required Pools
The API Host requires a single specific pool for health monitoring of the dashboard-DNS resolver

#### Pool 1 - dashboard-dns_udp53_pool
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

### DNS Resolver Configuration 
(Optional to use but the iRule will require it to exist unless the iRule is edited)
The DNS resolver enables hostname display for pool members in dashboard responses.

#### Access BIG-IP via SSH
1. SSH to your Frontend BIG-IP as an administrative user
2. Access the tmsh shell:
   ```
   tmsh
   ```

#### Create DNS Resolver
Execute the following command, replacing the DNS server IP with your environment's DNS server.
Note that the iRule will expect 'dashboard-DNS' to exist unless this reference is edited for a different resolver name.

```tcl
create net dns-resolver dashboard-DNS forward-zones add { in-addr.arpa { nameservers add { 192.168.1.53:53 } } }
```

#### Configuration Notes:
- Replace `192.168.1.53` with your DNS server IP address
- For GTM integration, use your GTM listener IP address
- Dashboard will only request PTR records so it is recommended to scope the resolver to in-addr-arpa. unless a shared resolver is used for dashboard

#### Verify DNS Resolver Creation
```tcl
list net dns-resolver dashboard-DNS
```

#### Save Configuration
```tcl
save sys config
```

#### Exit TMSH
```tcl
quit
```

### Create and Configure the API Host iRule

#### Create the iRule

1. Navigate to **Local Traffic → iRules → iRule List**
2. Click **Create**
3. Configure iRule:
   - **Name**: `LTM_Dashboard-API-Host_v1.7.1_irule`

#### Add iRule Content

Copy the complete frontend iRule code (from `LTM_Dashboard-API-Host_v1.7.1_irule.txt`) into the **Definition** field.

#### Save iRule

1. Click **Finished**
2. Verify iRule appears in iRule list without syntax errors
3. If errors exist, review and correct the iRule code

### Create Virtual Server

#### Create Virtual Server

1. Navigate to **Local Traffic → Virtual Servers → Virtual Server List**
2. Click **Create**

#### Basic Configuration

- **Name**: `Dashboard-API-Host_https_vs`
- **Description**: `F5 Multisite Dashboard API-Host`
- **Type**: `Standard`
- **Source Address**: `0.0.0.0/0`
- **Destination Address**: Choose appropriate IP for dashboard access
- **Service Port**: `443` 

#### Protocol Configuration

- **HTTP Profile (Client)**: `http`
- **SSL Profile (Client)**: Select appropriate SSL profile for HTTPS

#### iRule Assignment

1. In **Resources** section, find **iRules**
2. Move `LTM_Dashboard-API-Host_v1.7.1_irule` from Available to Enabled

#### Default Pool Assignment

- **Default Pool**: Leave blank 

#### Finish Virtual Server Creation

1. Click **Finished**
2. Verify virtual server shows as **Available (Enabled)**

---

## Testing and Validation

### Basic API Testing

#### Health Endpoint Test

Test the health endpoint without authentication:

1. **From authorized IP** (front-end or any authorized client):
   ```bash
   curl -k https://[api-host-ip]:443/api/health
   ```

2. **Expected Response** (HTTP 200):
```json
   {
     "status": "healthy",
     "hostname": "CHICAGO-bigip.lab.local",
     "timestamp": "2025-09-25 14:30:15",
     "uptime_seconds": 2678400,
     "version": "1.7",
     "pools_configured": 37,
     "message": "API endpoint is operational with 37 pools configured"
   }
  ```

#### Authentication Test

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
   **Expected**: HTTP 200 with pool data (if configured)

#### Pool Data Validation

**Example Pool Data Response:**
```json
{
  "hostname": "CHICAGO-bigip.lab.local",
  "timestamp": "2025-01-15 14:30:45",
  "debug_enabled": "disabled",
  "instanceId": "inst_abc123",
  "pools": [
    {
      "name": "web_pool",
      "alias": "Chicago Web Servers",
      "sort_order": 150,
      "status": "DOWN",
      "up_members": 0,
      "down_members": 1,
      "disabled_members": 1,
      "total_members": 2,
      "members": [
        {
          "ip": "192.168.1.10",
          "port": "80",
          "status": "down",
          "hostname": "Web01-Chicago.lab.local"
        },
        {
          "ip": "192.168.1.11",
          "port": "80",
          "status": "disabled",
          "hostname": "Web02-Chicago.lab.local"
        }
      ]
    }
  ]
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

---

## Troubleshooting

**Cannot connect to Front-end**
- Verify that the Front-end iRule has been applied to the Front-end virtualserver
- Verify `datagroup-dashboard-clients` contains client IP addresses or client subnets
- Verify that APM is setting variable `session.custom.dashboard.auth` to `1` upon successful authentication

**Site selection shows no sites**
- Check the `datagroup-dashboard-sites` configuration on the Front-end

**Dashboard shows "No pools configured"**
- Verify `datagroup-dashboard-pools` contains pool names
- Check that the datagroup pool names match the actual Front-end LTM pool names (case sensitive!)

**Cannot connect to API Host**
- Verify API Host `datagroup-dashboard-trusted-frontends` contains the correct Front-end Self-IPs
- Verify that the API Host iRule has been applied to the API Host virtualserver

**API authentication failure when selecting a backend site**
- Verify API keys match between frontend and backend
- Check `datagroup-dashboard-api-keys` configuration on both clusters

**DNS resolution not working**
- Verify DNS resolver configuration in LTM
- Check `dashboard-dns_udp53_pool` has at least one active member
- Set `dns_enabled = 1` in the dashboard iRule configuration
- Validate LTM resolver using dig from bash
- If DNS irule is used on a GTM listener, ensure the dashboard hosts Self-IPs (Front-End or API Host) exist within the datagroup `dashboard-dns-clients`
- Debug the dashboard Front-end or Back-end while performing "Resolve" requests

### Debug Mode
Enable comprehensive logging:
1. Set `debug_enabled = 1` in iRule
2. Add client IP to `datagroup-dashboard-debug`
3. Monitor logs: `tail -f /var/log/ltm`
4. Note that in order to see console logs in browser devtools, you must enable irule debug and be a client in the debug datagroup. The irule will signal the client that you are a debug_enabled client. This is for the non-minified Javascript only.

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
 
