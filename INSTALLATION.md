# F5 Multisite Dashboard 2.0 - Installation Guide

This guide provides complete step-by-step installation procedures for both Frontend and API Host components of the F5 Multisite Dashboard.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Frontend Installation](#frontend-installation)
- [API Host Installation](#api-host-installation)
- [GTM/DNS Listener Configuration](#gtmdns-listener-configuration)
- [Testing and Validation](#testing-and-validation)
- [Debug System Operation](#debug-system-operation)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Prerequisites

- F5 BIG-IP with LTM and APM modules provisioned
- TMOS 17.x or 21.x series (matches the versions listed in the [README](README.md))
- Administrative access to the Configuration utility and SSH/tmsh on each device
- The dashboard release files (iFiles, iRules, and the discovery script) from this repository
- Optional: GTM/BIG-IP DNS if you want a dedicated dashboard DNS listener for PTR resolution

---

## Frontend Installation

The Frontend serves the web interface and handles user authentication via APM.

### Critical Dependencies

**Note:** All data groups, pools and DNS resolver must exist in LTM and match the item names in the iRule. If you wish to use custom names for dashboard-specific pools or the resolver, make sure to edit the relevant iRule references.

**1. `datagroup-dashboard-clients` (Address)**  
Used to restrict dashboard access via Client IP or Client Subnet

**2. `datagroup-dashboard-debug` (Address)**  
Used to limit dashboard debug via Client IP or Client Subnet

**3. `datagroup-dashboard-sites` (String)**  
Used to define dashboard site list in the dropdown control - the Frontend is typically the first site defined with the lowest sort order e.g. "CHICAGO = 10".

**4. `datagroup-dashboard-api-host` (String)**  
Used to map remote Site names to API Host Virtual Server IP addresses. e.g. "NEWYORK = 192.168.4.33". It is this mapping that the Frontend uses to map JSON fetch requests to the API hosts.

**5. `/Common/dashboard/datagroup-dashboard-pools` (String, device-local folder)**  
Used to provide a list of pools to display. **This is an essential step.** LTM does not permit an iRule to determine general elements of TMOS configuration. Therefore we **must** administratively provide configuration attributes in the form of a list of LTM pool names that the dashboard will be permitted to process via LB::status events and subsequently display. This is the one data group that will require management of pools as new pools are implemented or pools are removed from LTM. A bash script has been provided to assist with the initial population of this data group. An iCall-based solution for automatic pool and alias datagroup management is also available and is the recommended long-term approach.

**6. `/Common/dashboard/datagroup-dashboard-pool-alias` (String, device-local folder)**  
Used to create alias names for actual pool names. This feature is optional, but the data group itself must exist. This is to permit 'Aliases' or user friendly names to be displayed instead of the actual LTM pool names. This is for environments where a pool name might not provide the best indicator of what the pool actually supports.

**7. `datagroup-dashboard-api-keys` (String)**  
Used to authenticate Frontend to API hosts. This key can be the same across the entire topology but must exist or the Frontend will have no access to the api endpoint /api/proxy/pools. This is an application-level control for security.

**8. `dashboard-api-hosts_https_pool` (LTM Pool)**  
This pool contains the API Host IPs. 

**9. `dashboard-dns_udp53_pool` (LTM Pool)**  
This pool contains the DNS listener used for monitoring purposes only. If the listener is detected down by the monitor attached to this pool, the iRule will fail back to IP-only mode gracefully.

**10. `/Common/dashboard-DNS` (LTM dns-resolver)**  
This LTM resolver is recommended to map to a GTM listener dedicated for dashboard use with the provided DNS iRule applied and scoped for in-addr.arpa. In current deployments, each API host uses a local GTM listener, but any reachable DNS server that can provide responses to PTR queries will work.

**11. `session.custom.dashboard.auth` (Frontend LTM APM session variable)**  
This variable must be equal to 1 for the Frontend iRule to trigger and needs to be set by the APM Policy that is placed on the Frontend virtual server. Use any authentication methods appropriate for your organization or use no authentication, but APM must set this variable for the Frontend iRule to trigger. This is primarily done to ensure APM completes before the iRule starts processing client HTTP requests - It's an APM / LTM interoperability control. If you do not desire APM controls, simply set the variable in the LTM iRule or remove the variable check.

**12. iFiles:**

- `dashboard_js-core.js` **Javascript Core Module** Core coordination functionality including initialization, themes switching, timers, MACRO/MICRO view modes, wake lock management, and alias switching
- `dashboard_js-client.js` **Javascript Client Module** HTTP communication layer for JSON fetch API calls, settings persistence, DNS operations, and fetch request lifecycle management
- `dashboard_js-data.js` **Javascript Data Module** Data management, instance tracking, state tracking, pool reordering functionality, and DNS hostname caching
- `dashboard_js-ui.js` **Javascript UI Module** UI rendering, search filtering, visual state management, MACRO/MICRO view mode support, search recall and save, and integrated pool grid management
- `dashboard_js-logger.js` **Javascript Logger Module** Dedicated logger with resizable UI, state persistence, memory management, wake lock integration, session storage and copy
- `dashboard.css` **Dashboard CSS with 3 themes** AGLight (theme1) which is reminiscent of AdminGUI, Monochrome Grey (theme2), and Amber (theme3)
- `dashboard_logo.png` any 53px by 53px png logo image

---

### Create Data Groups

The dashboard requires several data groups for configuration and access control.

#### Data Group - datagroup-dashboard-clients

1. Navigate to **Local Traffic → iRules → Data Group List**
2. Click **Create**
3. Configure data group:
   - **Name**: `datagroup-dashboard-clients`
   - **Type**: `Address`
4. Add client networks:
   - **Address**: `192.168.1.0/24` (example - your client network)
   - **Address**: `10.0.0.0/8` (add your specific subnets)
5. Click **Finished**

#### Data Group - datagroup-dashboard-debug

1. Click **Create**
2. Configure data group:
   - **Name**: `datagroup-dashboard-debug`
   - **Type**: `Address`
3. Add debug clients:
   - **Address**: `192.168.1.100` (admin workstation IP)
   - **Address**: `10.0.1.50` (network engineer desktop)
4. Click **Finished**

#### Data Group - datagroup-dashboard-sites

1. Click **Create**
2. Configure data group:
   - **Name**: `datagroup-dashboard-sites`
   - **Type**: `String`
3. Add sites; note that the Frontend itself should have the lowest sort order which will cause it to appear first in the list:
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
3. Add site mappings:
   - **String**: `NEW_YORK`, **Value**: `192.168.2.100`
   - **String**: `LONDON`, **Value**: `192.168.3.100`
   - **String**: `TOKYO`, **Value**: `192.168.4.100`
4. Click **Finished**

**Note:** Do not include the Frontend site (CHICAGO) in this data group.

#### Data Group - datagroup-dashboard-api-keys

1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-api-keys`
   - **Type**: `String`
3. Add API key:
   - **String**: `dashboard-api-key-2026-v20`
4. Click **Finished**

**Note:** This same key must be configured on all backend BIG-IP systems.

#### Create the Dashboard Device-Local Folder

The pool and alias data groups are written automatically by the discovery tooling, so they live in a device-local folder excluded from config sync. This keeps automated writes from leaving manual-sync clusters showing Changes Pending. Each device maintains its own copy. Create the folder and both data groups from the command line (sub-folder objects cannot be created in the GUI):

```bash
tmsh create sys folder /Common/dashboard device-group none traffic-group none
tmsh create ltm data-group internal /Common/dashboard/datagroup-dashboard-pools type string
tmsh create ltm data-group internal /Common/dashboard/datagroup-dashboard-pool-alias type string
tmsh save sys config
```

**The order matters.** Create the folder and data groups and populate them before installing or updating the iRules. The iRules reference these data groups at runtime and every request fails with a TCL error until they exist.

#### Data Group - /Common/dashboard/datagroup-dashboard-pools

Pool names are the record keys and sort order is the value. The UI shows pools from lowest to highest sort order within each partition; increments of 10 are recommended for later re-adjustments. Pools in `/Common` use the bare name. Pools in any other partition use the full path:

```text
web_pool := 10
app_pool := 20
/dmz/web-pool := 30
/secure/db-pool := 40
```

#### Data Group - /Common/dashboard/datagroup-dashboard-pool-alias

Alias keys match the pool data group exactly, including full paths for partitioned pools:

```text
web_pool := Chicago Web Servers
/dmz/web-pool := DMZ Web Servers
```

#### Pool Discovery Script

Use the included discovery script to populate both pool data groups automatically:

📋 **[Pool Discovery Script](dashboard_pool_discovery.sh)**

The script discovers pools across all partitions, writes canonical names, and merges with existing records: hand-tuned sort orders and aliases survive re-runs, new pools append after the current maximum, and removed pools are logged. Edit the two settings at the top before running:

- `EXCLUDE_PARTITIONS`: partitions to hide from the dashboard entirely (`Common` cannot be excluded)
- `EXCLUDE_POOLS`: individual pools to skip, such as the dashboard's own utility pools

Run with `-n` first for a dry run that prints every add, keep, and remove decision without writing anything. After running, customize aliases by modifying the alias data group; the script never overwrites a non-empty alias.

### Optional: iCall Pool Sync (Frontend)

An iCall script that periodically refreshes the pool and alias data groups with the current LTM pool configuration. This is the recommended long-term alternative to re-running the discovery script by hand.

📋 **[iCall Script](/iCall%20Datagroup%20Sync/README.md)** - Setup instructions for the automatic pool and alias data group sync

---

### Create Required Pools

The Frontend requires specific pools for health monitoring and backend communication.

#### Pool 1 - dashboard-api-hosts_https_pool

This pool is used only for monitoring and detection of API host reachability and operation. The Frontend uses the data group `datagroup-dashboard-api-host` to actually map client requests for specific sites to backend virtual server IPs. This pool enables dashboard to present intelligence about the state of the API host instead of failing silently.

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

This pool monitors DNS resolver availability. The Frontend iRule will check member state for this pool and fail back gracefully to IP-only mode if all members in this pool are down.

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
   - Click **Add**
5. Click **Finished**

#### Create a Custom Frontend HTTPS Monitor

For health checking of backend APIs:

1. Navigate to **Local Traffic → Monitors → Monitor List**
2. Click **Create**
3. Configure monitor:
   - **Name**: `dashboard-api-host_https_monitor`
   - **Type**: `HTTPS`
   - **Interval**: `5` seconds
   - **Timeout**: `16` seconds
   - **Send String**:
     ```text
     GET /api/health HTTP/1.1\r\nConnection: Close\r\n\r\n
     ```
   - **Receive String**: `(healthy|unhealthy)`
   - note that any JSON response from the API host is a valid check of the API host operation. "unhealthy" is used by an endpoint to inform the client about a problem on the API host, but is valid for a health check.
4. Click **Finished**
5. Assign this monitor to the dashboard-api-hosts_https_pool

---

### DNS Resolver Configuration

(Optional to use but the iRule will require it to exist unless edited)
The DNS resolver enables hostname display for pool members in dashboard responses.

#### Access BIG-IP via SSH

1. SSH to your Frontend BIG-IP as an administrative user
2. Access the tmsh shell:
   ```bash
   tmsh
   ```

#### Create DNS Resolver

Execute the following command, replacing the DNS server IP with your environment's DNS server.
Note that the iRule will expect 'dashboard-DNS' to exist unless this reference is edited for a different resolver name.

```bash
create net dns-resolver dashboard-DNS forward-zones add { in-addr.arpa { nameservers add { 192.168.1.53:53 } } }
```

#### Configuration Notes:

- Replace `192.168.1.53` with your DNS server IP address
- For GTM integration, use your GTM listener IP address
- Dashboard will only request PTR records so it is recommended to scope the resolver to in-addr.arpa unless a shared resolver is used for dashboard

#### Verify DNS Resolver Creation

```bash
list net dns-resolver dashboard-DNS
```

#### Save Configuration

```bash
save sys config
```

#### Exit TMSH

```bash
quit
```

---

### Upload Static Files (iFiles)

The dashboard requires multiple static files for the web interface.

#### Access iFile Management

1. Navigate to **Local Traffic → iRules → iFile List**

Upload the following files:

1. **dashboard_logo.png**
   - Name: `dashboard_logo.png`
   - Upload your organization's logo image

2. **dashboard.css**
   - Name: `dashboard.css`

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

For each file:
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
ltm ifile dashboard.css {
    file-name dashboard.css
}
```

---

### Create and Configure the Frontend iRule

#### Create the iRule

1. Navigate to **Local Traffic → iRules → iRule List**
2. Click **Create**
3. Configure iRule:
   - **Name**: `LTM_Dashboard-Frontend_vx.x_irule`

#### Add iRule Content

Copy the complete Frontend iRule code (from `LTM_Dashboard-Frontend_vx.x_irule.txt`) into the **Definition** field.

#### Key Configuration Points in iRule

**Local Site Configuration**

Locate the variable "local_site_name" and modify for your environment:

```tcl
set local_site_name "CHICAGO"
```

Change `"CHICAGO"` to match your Frontend site name from the sites data group. Only the Frontend needs to be made site-aware. The API hosts simply process requests received and do not require site awareness.

#### Save iRule

1. Click **Finished**
2. Verify iRule appears in iRule list without syntax errors
3. If errors exist, review and correct the iRule code

---

### Create Frontend Virtual Server

#### Create Virtual Server

1. Navigate to **Local Traffic → Virtual Servers → Virtual Server List**
2. Click **Create**

#### Basic Configuration

- **Name**: `Dashboard-Frontend_https_vs`
- **Description**: `F5 Multisite Dashboard Frontend`
- **Type**: `Standard`
- **Source Address**: `0.0.0.0/0`
- **Destination Address**: Choose appropriate IP for dashboard access
- **Service Port**: `443`

#### Protocol Configuration

- **HTTP Profile (Client)**: `http`
- **SSL Profile (Client)**: Select appropriate clientSSL profile 
- **SSL Profile (Server)**: `serverssl`

#### Advanced Configuration

- **Source Address Translation**: `Auto Map`
- **Address Translation**: `Enabled`
- **Port Translation**: `Enabled`

#### Access Policy Assignment

- **Access Profile**: Select your configured APM access policy (when configured)

#### iRule Assignment

1. In **Resources** section, find **iRules**
2. Move `LTM_Dashboard-Frontend_vx.x_irule` from Available to Enabled

#### Default Pool Assignment

- **Default Pool**: Leave blank (iRule handles proxy based on datagroup-dashboard-api-host mapping)

#### Finish Virtual Server Creation

1. Click **Finished**
2. Verify virtual server shows as **Available (Enabled)**

---

### Configure Frontend HTTP Compression Profile

#### Create Frontend Compression Profile

1. Log in to the F5 Configuration utility
2. Navigate to **Local Traffic > Profiles > Services > HTTP Compression**
3. Click **Create**
4. In the **Name** field, enter: `dashboard-httpcompression`
5. From the **Parent Profile** list, select `httpcompression`

#### Configure Frontend Content Types

1. In the **Settings** section, locate **Content List**
2. For the **Content Type Include** setting, check the **Custom** box
3. Click **Add** and add each of the following content types:
   - `text/html`
   - `text/css`
   - `application/javascript`
   - `application/json`
   - `text/javascript`

#### Configure Compression Settings

For the Frontend profile, apply these settings:

1. In the **Compression Settings** section:
   - For **GZIP Compression Level**, check **Custom** and select **6**

2. In the **Additional Settings** section:
   - For **Minimum Content Length**, check **Custom** and enter **1024**
   - For **Buffer Size**, check **Custom** and select **4096**

3. Click **Finished**

#### Apply profile to Frontend Virtual Server

1. Navigate to **Local Traffic > Virtual Servers > Virtual Server List**
2. Click on your dashboard Frontend virtual server `Dashboard-Frontend_https_vs`
3. In the **Configuration** section, select **Advanced** from the dropdown
4. Scroll down to the **HTTP Compression Profile** section
5. From the **HTTP Compression Profile** dropdown, select `dashboard-httpcompression`
6. Click **Update**

---

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

## API Host Installation

The **Dashboard API Host** provides JSON-based endpoints for remote sites accessible by one or more Frontends.

### Critical Dependencies:

**1. `datagroup-dashboard-trusted-frontends` (Address)**  
Used to restrict access to authorized dashboard Frontend Self-IPs to the API Host virtual server

**2. `datagroup-dashboard-api-keys` (String)**  
Used to authenticate Frontends to the API host

**3. `/Common/dashboard/datagroup-dashboard-pools` (String, device-local folder)**  
Used to provide a local list of pools to display

**4. `/Common/dashboard/datagroup-dashboard-pool-alias` (String, device-local folder)**  
Used to create alias names for actual configuration pool names

**5. `dashboard-dns_udp53_pool` (LTM Pool)**  
This pool contains the DNS listener for monitoring

**6. `/Common/dashboard-DNS` (LTM dns-resolver)**  
This resolver should map to a GTM listener dedicated for dashboard and scoped for in-addr.arpa.

---

### Create Data Groups (API Host)

The dashboard requires several data groups for configuration and access control.

#### Data Group - datagroup-dashboard-trusted-frontends

1. Navigate to **Local Traffic → iRules → Data Group List**
2. Click **Create**
3. Configure data group:
   - **Name**: `datagroup-dashboard-trusted-frontends`
   - **Type**: `Address`
4. Add Frontend IPs:
   - **Address**: `192.168.1.50` (Primary Frontend BIG-IP self-IP)
   - **Address**: `192.168.1.51` (Secondary Frontend BIG-IP self-IP)
   - Add additional Self-IPs as needed for Frontend monitors 
5. Click **Finished**

#### Data Group - datagroup-dashboard-api-keys

1. Click **Create** (new data group)
2. Configure data group:
   - **Name**: `datagroup-dashboard-api-keys`
   - **Type**: `String`
3. Add API key:
   - **String**: `dashboard-api-key-2026-v20`, **Value**: `Production API Key - Issued 2026-07 - Shared with Frontend`
4. Click **Finished**

#### Create the Dashboard Device-Local Folder (API Host)

Same as the Frontend: the pool and alias data groups are machine-written and live in a device-local folder excluded from config sync. Create the folder and data groups before installing the iRule:

```bash
tmsh create sys folder /Common/dashboard device-group none traffic-group none
tmsh create ltm data-group internal /Common/dashboard/datagroup-dashboard-pools type string
tmsh create ltm data-group internal /Common/dashboard/datagroup-dashboard-pool-alias type string
tmsh save sys config
```

Populate them with the discovery script (below) or manually. Pool names follow the canonical format: bare name for `/Common` pools, full path (`/dmz/web-pool`) for pools in any other partition. Alias keys match the pool entries exactly.

#### Pool Discovery Script

Use the included discovery script to populate both pool data groups automatically:

📋 **[Pool Discovery Script](dashboard_pool_discovery.sh)**

The script discovers pools across all partitions, writes canonical names, and merges with existing records: hand-tuned sort orders and aliases survive re-runs, new pools append after the current maximum, and removed pools are logged. Edit the two settings at the top before running:

- `EXCLUDE_PARTITIONS`: partitions to hide from the dashboard entirely (`Common` cannot be excluded)
- `EXCLUDE_POOLS`: individual pools to skip, such as the dashboard's own utility pools

Run with `-n` first for a dry run that prints every add, keep, and remove decision without writing anything. After running, customize aliases by modifying the alias data group; the script never overwrites a non-empty alias.

### Optional: iCall Pool Sync (API Host)

The same iCall script applies here: it periodically refreshes the pool and alias data groups with the current LTM pool configuration.

📋 **[iCall Script](/iCall%20Datagroup%20Sync/README.md)** - Setup instructions for the automatic pool and alias data group sync

---

### Create Required Pools (API Host)

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
   - Click **Add**
5. Click **Finished**

---

### DNS Resolver Configuration (API Host)

(Optional to use but the iRule will require it to exist unless the iRule is edited)
The DNS resolver enables hostname display for pool members in dashboard responses.

#### Access BIG-IP via SSH

1. SSH to your API Host BIG-IP as an administrative user
2. Access the tmsh shell:
   ```bash
   tmsh
   ```

#### Create DNS Resolver

Execute the following command, replacing the DNS server IP with your environment's DNS server.
Note that the iRule will expect 'dashboard-DNS' to exist unless this reference is edited for a different resolver name.

```bash
create net dns-resolver dashboard-DNS forward-zones add { in-addr.arpa { nameservers add { 192.168.1.53:53 } } }
```

#### Configuration Notes:

- Replace `192.168.1.53` with your DNS server IP address
- For GTM integration, use your GTM listener IP address
- Dashboard will only request PTR records so it is recommended to scope the resolver to in-addr.arpa unless a shared resolver is used for dashboard

#### Verify DNS Resolver Creation

```bash
list net dns-resolver dashboard-DNS
```

#### Save Configuration

```bash
save sys config
```

#### Exit TMSH

```bash
quit
```

---

### Create and Configure the API Host iRule

#### Create the iRule

1. Navigate to **Local Traffic → iRules → iRule List**
2. Click **Create**
3. Configure iRule:
   - **Name**: `LTM_Dashboard-API-Host_vx.x_irule`

#### Add iRule Content

Copy the complete API Host iRule code (from `LTM_Dashboard-API-Host_vx.x_irule.txt`) into the **Definition** field.

#### Save iRule

1. Click **Finished**
2. Verify iRule appears in iRule list without syntax errors
3. If errors exist, review and correct the iRule code

---

### Create API Host Virtual Server

#### Create Virtual Server

1. Navigate to **Local Traffic → Virtual Servers → Virtual Server List**
2. Click **Create**

#### Basic Configuration

- **Name**: `Dashboard-API-Host_https_vs`
- **Description**: `F5 Multisite Dashboard API Host`
- **Type**: `Standard`
- **Source Address**: `0.0.0.0/0`
- **Destination Address**: Choose appropriate IP for dashboard access
- **Service Port**: `443`

#### Protocol Configuration

- **HTTP Profile (Client)**: `http`
- **SSL Profile (Client)**: Select appropriate SSL profile for HTTPS

#### iRule Assignment

1. In **Resources** section, find **iRules**
2. Move `LTM_Dashboard-API-Host_vx.x_irule` from Available to Enabled

#### Default Pool Assignment

- **Default Pool**: Leave blank

#### Finish Virtual Server Creation

1. Click **Finished**
2. Verify virtual server shows as **Available (Enabled)**

---

### Configure HTTP Compression (API Host)

#### Create API Host Compression Profile

1. Log in to the F5 Configuration utility
2. Navigate to **Local Traffic > Profiles > Services > HTTP Compression**
3. Click **Create**
4. In the **Name** field, enter: `dashboard-httpcompression`
5. From the **Parent Profile** list, select `httpcompression`

#### Configure API Host Content Types

1. In the **Settings** section, locate **Content List**
2. For the **Content Type Include** setting, check the **Custom** box
3. Click **Add** and add each of the following content types:
   - `text/html`
   - `application/json`

#### Configure Compression Settings

For the API Host profile, apply these settings:

1. In the **Compression Settings** section:
   - For **GZIP Compression Level**, check **Custom** and select **6**

2. In the **Additional Settings** section:
   - For **Minimum Content Length**, check **Custom** and enter **1024**
   - For **Buffer Size**, check **Custom** and select **4096**

3. Click **Finished**

#### Apply Compression to API Host Virtual Server

1. Navigate to **Local Traffic > Virtual Servers > Virtual Server List**
2. Click on your dashboard API host virtual server `Dashboard-API-Host_https_vs`
3. In the **Configuration** section, select **Advanced** from the dropdown
4. Scroll down to the **HTTP Compression Profile** section
5. From the **HTTP Compression Profile** dropdown, select `dashboard-httpcompression`
6. Click **Update**

---

## GTM/DNS Listener Configuration

If using GTM for DNS resolution, you can create a dedicated dashboard listener with access restrictions.

### Create DNS Client Data Group

1. Navigate to **Local Traffic → iRules → Data Group List**
2. Click **Create**
3. Configure data group:
   - **Name**: `dashboard-dns-clients`
   - **Type**: `Address`
4. Add authorized Self-IPs:
   - **Address**: `10.1.1.100` (Frontend BIG-IP Self-IP)
   - **Address**: `10.1.2.100` (Backend BIG-IP Self-IP)
   - Add additional Self-IPs as needed for monitors 
5. Click **Finished**

---

### Create DNS Restriction iRule

1. Navigate to **Local Traffic → iRules → iRule List**
2. Click **Create**
3. Configure iRule:
   - **Name**: `DNS_Dashboard-DNS-Restrict_v1.0_irule`

Copy the complete DNS iRule code (from `DNS_Dashboard-DNS-Restrict_v1.0_irule.txt`) into the **Definition** field.

#### Save iRule

1. Click **Finished**
2. Verify iRule appears in iRule list without syntax errors
3. If errors exist, review and correct the iRule code

---

### Create GTM Listener

1. Navigate to **DNS → Delivery → Listeners → Listener List**
2. Click **Create**
3. Configure listener:
   - **Name**: `dashboard-dns-listener`
   - **Description**: `DNS listener for dashboard`
   - **Destination**: Enter IP address (e.g., `192.168.1.53`)
   - **Service Port**: `53`
   - **IP Protocol**: `UDP`
   - **State**: `Enabled`

4. In the **Configuration** section:
   - **DNS Profile**: Select `dns` (default DNS profile)

5. In the **Resources** section, find **iRules**:
   - Move `DNS_Dashboard-DNS-Restrict_v1.0_irule` from **Available** to **Enabled**

6. Click **Finished**

7. Verify listener shows as **Available (Enabled)**

Note: It is recommended to also implement a transparent cache for the dashboard listener in a `dashboard-dns` profile to reduce DNS PTR queries to Infrastructure DNS servers even further.

---

## Testing and Validation

### Basic API Testing

#### Health Endpoint Test

Test the health endpoint:

1. **From authorized IP** (Frontend or any authorized client):
   ```bash
   curl -k https://[api-host-ip]:443/api/health
   ```

2. **Expected Response** (HTTP 200):
```bash
   {
     "status": "healthy",
     "hostname": "NEWYORK-bigip.lab.local",
     "timestamp": "2026-07-20 14:30:15",
     "uptime_seconds": 2678400,
     "version": "2.0",
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

```bash
{
  "hostname": "CHICAGO-bigip.lab.local",
  "timestamp": "2026-07-20 14:30:45",
  "debug_enabled": "disabled",
  "instanceId": "inst_abc123",
  "pools": [
    {
      "partition": "Common",
      "name": "web_pool",
      "alias": "Chicago Web Servers",
      "sort_order": 150,
      "status": "UP",
      "up_members": 1,
      "down_members": 1,
      "disabled_members": 0,
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
          "status": "up",
          "hostname": "Web02-Chicago.lab.local"
        }
      ]
    }
  ]
}
```

---

## Debug System Operation

The dashboard implements a two-factor debug activation system designed to prevent accidental debug log generation across multiple F5 devices in production environments. The system requires both a debug flag AND IP-based authorization to activate debug logging, ensuring that if the iRule debug variables are accidentally left enabled, only authorized IPs will trigger debug output. Too many times we have seen iRules with a simple debug toggle that was left on for months or even years - generating debug nonstop for all client requests.

### Protection Mechanism

The dashboard debug system uses dual-condition activation to prevent the dashboard system from being left in a debug state. Each iRule (Frontend or API Host) contains a `debug_enabled` variable that acts as the primary switch, but debug logging only occurs when the requesting user's IP address is also present in the Frontend's `datagroup-dashboard-debug` address list. This means that even if `debug_enabled = 1` is accidentally left active on all production F5 devices, regular dashboard users will never trigger debug logging - only pre-authorized IPs will match and generate debug output.

### Operation Flow

When a client HTTP request arrives, the Frontend iRule first checks if `debug_enabled = 1`, then validates the client IP against the `datagroup-dashboard-debug` list. Only when both conditions are met does it set `client_debug_enabled = 1` and begin logging debug information. For API host architectures, the Frontend forwards the authorized client's IP via an `X-Forwarded-Debug-Client` header to the relevant backend API Host, allowing the API hosts to perform the same dual validation and maintain consistent debug scope across the entire request chain.

Clientside JavaScript debugging follows a similar pattern. Client browsers will not log Dashboard Javascript operational events to the devtools console unless the Frontend signals debug to the client. The Frontend must contain the requesting client IP address in `datagroup-dashboard-debug` and have `debug_enabled = 1` for this signal to occur. The signal is delivered two ways: the initial page load injects the debug state into the page configuration, and each JSON poll response carries a "debug_enabled": "enabled|disabled" element that can activate console debug mid-session (note that debug is not available in the minified code)

### Configuration

**iRule Debug Flags:**

```tcl
# Set to 1 to enable debug capability, 0 to disable completely
set debug_enabled 0
```

**IP Authorization:**

```text
# datagroup-dashboard-debug (Address type)
# Only these IPs can trigger debug logging; recommended to use host IP addresses and not client subnet identifiers
10.1.1.100
192.168.1.50
```

This design allows safe and targeted debugging in production environments where debug flags might be left accidentally enabled, as the IP-based authorization layer prevents unintended debug activation by dashboard production users while still allowing administrators to troubleshoot when needed and only on the relevant dashboard host.

---

## Troubleshooting

### Cannot connect to Frontend
- Verify that the Frontend iRule has been applied to the Frontend virtual server
- Verify `datagroup-dashboard-clients` contains client IP addresses or client subnets
- Verify that APM is setting variable `session.custom.dashboard.auth` to `1` upon successful authentication

### Site selection shows no sites
- Check the `datagroup-dashboard-sites` configuration on the Frontend

### Dashboard shows "No pools configured"
- Verify `datagroup-dashboard-pools` contains pool names
- Check that the data group pool names match the actual Frontend LTM pool names (case sensitive!)

### Cannot connect to API Host
- Verify API Host `datagroup-dashboard-trusted-frontends` contains the correct Frontend Self-IPs
- Verify that the API Host iRule has been applied to the API Host virtual server

### API authentication failure when selecting a backend site
- Verify API keys match between Frontend and backend
- Check `datagroup-dashboard-api-keys` configuration on both clusters

### Dashboard reports a pool "is missing the partition field"

- A v1.x iRule is still serving the selected site; v2.0 requires the partition field on every pool record
- Verify both the Frontend and the site's API Host are running the v2.0 iRules and that iFiles were updated together

### TCL errors referencing /Common/dashboard data groups

- The iRule was installed or updated before the device-local folder and data groups were created
- Create the folder and both data groups, run the discovery script, and the site recovers within one monitor interval

### Partitioned pools show UNKNOWN

- The data group entry is not in canonical form; partitioned pools must be listed as the full path (`/dmz/web-pool`)
- Re-run the discovery script to generate correct pool name entries

### DNS resolution not working
- Verify DNS resolver configuration in LTM
- Check `dashboard-dns_udp53_pool` has at least one active member
- Set `dns_enabled = 1` in the dashboard iRule configuration
- Validate LTM resolver using dig from bash
- If DNS iRule is used on a GTM listener, ensure the dashboard hosts Self-IPs (Frontend or API Host) exist within the data group `dashboard-dns-clients`
- Debug the dashboard Frontend or Backend while performing "Resolve" requests

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
