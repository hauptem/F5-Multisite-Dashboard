# F5 Multisite Dashboard - User Guide

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Dashboard Interface](#dashboard-interface)
- [Pool Status Monitoring](#pool-status-monitoring)
- [View Modes](#view-modes)
- [Alias Display System](#alias-display-system)
- [Site Management](#site-management)
- [Advanced Search and Filtering](#advanced-search-and-filtering)
- [Pool Reordering](#pool-reordering)
- [Status Change Tracking](#status-change-tracking)
- [DNS Integration and Optimization](#dns-integration-and-optimization)
- [Dashboard Logger](#dashboard-logger)
- [Settings and Preferences](#settings-and-preferences)
- [NOC Mode Setup](#noc-mode-setup)
- [Keyboard Shortcuts Reference](#keyboard-shortcuts-reference)
- [Theme Selection](#theme-selection)
- [Frequently Asked Questions](#frequently-asked-questions)
- [License](#license)
- [Disclaimer](#disclaimer)

## Introduction

The F5 Multisite Dashboard provides centralized monitoring of LTM pools across multiple Big-IP clusters. This web-based interface offers near real-time visibility into pool health, member status, and provides advanced features for tracking status changes and managing your monitoring experience.

## Quick Start

### Initial Setup Steps

1. **Select a Site**: Use the site selector in the bottom bar to choose your initial monitoring site
2. **Configure Refresh Rate**: Set your preferred auto-refresh interval (10s, 30s, 60s, or 90s)
3. **Choose Theme**: Select a visual theme that suits your preference and environment
4. **Select View Mode**: Choose between MACRO (detailed) or MICRO (summary) view

## Dashboard Interface

### Header Section

The header provides essential navigation and site information:

- **Logo and Title**: F5 logo (links to Big-IP Front-end management interface if DNS record exists)
- **Site Information Bar**: Displays current site hostname and last update timestamp (when a site is selected)
- **Logout Button**: Ends your dashboard session and logs you out of APM

<img width="1499" height="68" alt="Image" src="https://github.com/user-attachments/assets/3966e266-1b74-43ab-aa72-fefa2742733a" />

### Main Content Area

The central monitoring interface includes:

- **Top Controls Bar**: Search field with savable searches via right-click, Pool Reorder button, Site data Reset button
- **Pool Grid**: Displays pool status cards in a responsive grid layout
- **Loading/Error States**: Informational messages when appropriate

<img width="1497" height="353" alt="Image" src="https://github.com/user-attachments/assets/ec7d7cd5-b0fe-4df7-b2f6-4ad6821f015f" />

<img width="1492" height="332" alt="Image" src="https://github.com/user-attachments/assets/a4a6c807-cabb-401e-8d57-7321ec0833d6" />

### Bottom Bar Controls

The bottom bar contains all primary dashboard controls:

- **Auto-Refresh Timer**: Shows countdown and allows interval adjustment
- **Site Selector**: Dropdown to choose monitoring site
- **Feature Controls**: Alias mode, View mode, Logger toggle, DNS Flush, DNS Resolve, Theme toggle buttons

<img width="1513" height="74" alt="Image" src="https://github.com/user-attachments/assets/8ef5bddb-8bbd-4577-b679-01b6316c48f8" />

## Pool Status Monitoring

### Understanding Status Indicators

#### Pool-Level Status Badges

- <img width="134" height="40" alt="Image" src="https://github.com/user-attachments/assets/5a38e036-36cb-443b-99f8-19752ec80fad" /> **UP (Green)**: Pool has available members and is operational
- <img width="131" height="39" alt="Image" src="https://github.com/user-attachments/assets/a42c617c-df81-47fa-a730-3e50c43a51a6" /> **DOWN (Red)**: All pool members are unavailable
- <img width="131" height="39" alt="Image" src="https://github.com/user-attachments/assets/31565d68-871b-4715-aae8-155df46510c6" /> **DISABLED (Gray)**: All active members are administratively disabled
- <img width="132" height="40" alt="Image" src="https://github.com/user-attachments/assets/ab20c940-ed4d-4848-bdad-e64972281bac" /> **UNKNOWN (Orange)**: Pool status cannot be determined or pool not found
- <img width="133" height="42" alt="Image" src="https://github.com/user-attachments/assets/196dadee-068b-4c13-b306-9980bb7c5a40" /> **EMPTY (Orange)**: Pool exists but has no configured members

#### Member-Level Status Badges

- <img width="133" height="45" alt="Image" src="https://github.com/user-attachments/assets/10ebd251-826b-4685-8bc8-8ff764f7a339" /> **UP (Green)**: Member is available and passing health checks
- <img width="132" height="44" alt="Image" src="https://github.com/user-attachments/assets/a5d753d6-6e40-4032-a7cd-c670c0c19e11" /> **DOWN (Red)**: Member is unavailable or failing health checks
- <img width="131" height="44" alt="Image" src="https://github.com/user-attachments/assets/5bcc5af9-a902-46fe-8239-7a50c529e2ba" /> **DISABLED (Gray)**: Member is administratively disabled

**Note**: Pools that are unmonitored will always show all pool members as "UP".

### Member Information Display

- **Display Format**: Shows hostname:port when DNS is enabled, otherwise IP:port
- **Tooltip Information**: Hover over hostnames to see IP address details

## View Modes

### MACRO View (Detailed Monitoring)

- **Detail Level**: Full member details with individual status indicators
- **Use Case**: Detailed monitoring and troubleshooting individual members
- **Pool Display**: Complete member lists with scrollable tables
- **Status Changes**: Individual member change indicators with click-to-acknowledge

### MICRO View (Summary Monitoring)

- **Detail Level**: Pool-level summary with alarm indicators
- **Use Case**: High-level overview monitoring across many pools
- **Pool Display**: Condensed pool status with aggregate information
- **Status Changes**: Pool-level alarm indicators when any member has unacknowledged changes

### Managing View Modes

- **Button Location**: "Mode" button in bottom bar
- **Keyboard Shortcut**: Alt+M
- **Per-Site Memory**: Each site remembers its preferred view mode

## Alias Display System

### Understanding Aliases

Pool aliases provide user-friendly names as alternatives to technical LTM pool names.

#### Display Modes

- **Alias Mode ON (Default)**: Shows pool alias names when available
- **Alias Mode OFF**: Shows actual LTM pool names
- **Fallback Behavior**: If no alias exists, always shows actual LTM pool name

#### Managing Alias Display

- **Button Location**: "Alias" button in bottom bar
- **Button States**:
  - "Alias" (default) = showing alias names
  - "Actual" (highlighted) = showing actual pool names
- **Keyboard Shortcut**: Alt+A
- **Per-Site Setting**: Each site remembers its preferred alias mode
- **Tooltip Support**: Hover to see alternate name (actual name when showing alias, alias when showing actual name)
- **Search Compatibility**: Search functionality works with both actual names and aliases

## Site Management

### Site Selection Process

1. Locate the Site Selector dropdown in the bottom bar
2. Click the dropdown to view available sites
3. Select your desired site from the list
4. The dashboard will immediately load data from the selected site

### Site States

- **No Site Selected**: Shows "Select a site..." message with instruction to select from dropdown
- **Site Loading**: Displays loading indicator while fetching data
- **Site Active**: Shows real-time pool data with auto-refresh
- **Site Error**: Displays error message with retry option if site is unavailable

### Site Information Display

When a site is selected, the header displays:

- **Hostname**: The source Big-IP hostname providing the data
- **Last Updated**: Timestamp of the most recent client data fetch
- **Direct Link**: Click hostname to access the source Big-IP management interface (if DNS record exists)

## Advanced Search and Filtering

### Search Interface

- **Location**: Central search box in the top controls
- **Placeholder Text**: "Search... BOOLEAN OR (default), AND, NOT..."
- **Real-Time Updates**: Results update as you type (300ms delay)
- **Quick Actions**: "Changed" and "Clear" buttons for common filters

### Boolean Search Operators

#### Basic Search (OR Logic - Default)
```text
web database        → Shows pools containing "web" or "database"
192.168.10 10.20.1  → Shows pools with "192.168.10" or "10.20.1" IP addresses
```

#### AND Operator - All terms must match
```text
centos AND app01    → Pools with "centos" members and "app01" in pool name
web AND 192.168     → Pools with "web" and "192.168" IP addresses
```

#### NOT Operator - Exclude terms
```text
NOT down            → All pools except those with "down" members
windows NOT disabled → Pools with "windows" but not "disabled" members
NOT down AND Cisco  → Pools with "Cisco" but no "down" members
```

#### Special Keywords
```text
changed             → Only pools with pulsing status badges (unacknowledged state changes)
```

### Advanced Search Examples

```text
"web server" AND up                 → Pools with exact phrase "web server" and "up" status
centos AND changed NOT disabled     → Changed centos servers (not disabled)
up NOT down                         → Show pools that are fully available
down NOT up                         → Show pools that are fully unavailable
```

### Search Scope

The search function examines:
- Pool names and alias names
- Pool status (UP, DOWN, DISABLED, UNKNOWN, EMPTY)
- Member IP addresses and hostnames
- Member ports and status
- Case-insensitive matching with partial word support

### Saved Search System

#### Saving Searches
- **Right-click** on search input to access context menu
- **Alt+Shift+1** through **Alt+Shift+5** to save to numbered slots

#### Loading Searches
- **Right-click** on search input and select from saved searches
- **Alt+1** through **Alt+5** to load from numbered slots

## Pool Reordering

### Activating Reorder Mode

1. Click the "Reorder" button in the top-left of the controls bar
2. Button changes to "Disable" and highlights in yellow
3. Pool tables become draggable with move cursors

### Reordering Process

1. **Drag Source**: Click and hold on any pool table
2. **Visual Feedback**: Dragged pool becomes semi-transparent and slightly smaller
3. **Drop Target**: Drag over another pool table (highlights with dashed border)
4. **Complete**: Release to swap positions

### Reorder Behavior

- **Swap Logic**: Dragging Pool A onto Pool B swaps their positions
- **Persistence**: New order is automatically saved for session duration
- **Site-Specific**: Each site maintains its own custom pool order
- **Fallback**: Without custom order, pools use configured sort order or datagroup listing order

## Status Change Tracking

### Change Detection System

The dashboard automatically tracks when pool member statuses change from their baseline state and provides visual indicators.

#### Baseline Status Concept

- **Initial State**: When first seen, a member's polled status becomes its "baseline"
- **Change Detection**: Any deviation from the recorded baseline triggers change tracking
- **Auto-Return**: If status returns to recorded baseline, change indicator automatically clears

### Visual Change Indicators

#### Pulsing Animation
- **Effect**: Status badges pulse with a golden glow
- **Trigger**: When a member's status differs from its established baseline
- **Duration**: Continues until manually acknowledged

#### Enhanced Tooltips
- **Content**: Shows previous status and change time
- **Clickable Indication**: Cursor changes to pointer for changed badges

### Acknowledging Changes

#### Individual Acknowledgment
1. **Identify Changed Member**: Look for pulsing status badges
2. **Click Status Badge**: Single click on the pulsing badge
3. **Immediate Effect**: Pulsing stops, badge returns to normal appearance
4. **New Baseline**: Current status becomes the new baseline for future comparisons

#### Bulk Reset
- Use the "Reset" button in top controls to clear all member state information for the current site
- Note: Reset does not set new baselines; new baselines are established during the next poll

### MICRO View Alarm Logic

In MICRO view mode:
- **Pool-Level Alarms**: Entire pool status badge shows alarm state if any member has unacknowledged changes
- **Tooltip Enhancement**: Pool tooltips indicate "Members need attention - switch to MACRO Mode"
- **Quick Identification**: Easily spot pools with issues across large deployments
- **Acknowledgment**: Must switch to MACRO view to acknowledge individual members, or use Reset function

## DNS Integration and Optimization

### Hostname Display System

#### Display Logic
- **Automatic Resolution**: Backend resolves IP addresses to hostnames when configured
- **Display Priority**: Shows hostname:port when available, otherwise IP:port
- **Caching**: Intelligent client-side caching reduces backend DNS lookups
- **Tooltip Support**: Hover over hostnames to see underlying IP addresses

### DNS Management Functions

#### Resolve DNS
- **Function**: Forces fresh DNS resolution for all current pool members
- **Use Case**: Update hostnames after DNS changes
- **Button Location**: "Resolve" button in bottom bar
- **Keyboard Shortcut**: Alt+R
- **Optimization**: Only resolves IPs not already cached with valid hostnames

#### Flush DNS Cache
- **Function**: Clears all cached DNS entries for current site
- **Effect**: Immediate UI update showing IP addresses instead of hostnames
- **Use Case**: Clear stale DNS cache entries
- **Button Location**: "Flush" button in bottom bar
- **Keyboard Shortcut**: Alt+F

## Dashboard Logger

### Logger Overview

The integrated logger provides near real-time activity tracking and debugging information in a resizable, movable text-based window interface. The logger is optional and the dashboard will function if this module is not deployed.

### Accessing the Logger

- **Location**: "Logs" button in bottom-right theme controls
- **Toggle**: Click to show/hide the logger window
- **Keyboard Shortcut**: Alt+L
- **Persistence**: Logger state (shown/hidden) persists across sites

### Logger Interface Features

#### Header Controls
- **Title**: "Dashboard Logs"
- **Font Size**: + and - buttons to adjust text size
- **Expand**: Toggle between normal and full-width view
- **Copy**: Copy all logger text to clipboard
- **Clear**: Remove all log entries
- **Close (X)**: Close the logger window

#### Content Display
- **Background**: Black terminal-style background
- **Text Format**: Monospace font with color coded events
- **Auto-Scroll**: Automatically scrolls to show newest entries
- **Entry Limit**: Maximum 5000 entries (oldest entries removed automatically)

### Logger Functionality

#### Repositioning
- **Drag Handle**: Click and drag the header to reposition the logger
- **Free Positioning**: Place anywhere on screen
- **Boundaries**: Constrained to browser window

#### Resizing
- **Resize Handles**: Bottom, right, and corner resize handles
- **Dynamic Sizing**: Adjust width and height independently
- **State Persistence**: Size and position remembered

### Log Entry Format

Each log entry contains:
- **Status Symbol**: Colored symbol indicating final status (▲ UP, ▼ DOWN, ■ DISABLED)
- **Timestamp**: HH:MM:SS format
- **Site Name**: Source site identifier
- **Status Change**: FROM status → TO status
- **Member**: Affected pool member hostname:port or IP:port
- **Pool**: Pool name

<img width="1494" height="394" alt="Image" src="https://github.com/user-attachments/assets/b35bc2b5-bb60-456c-838d-c77cb9531534" />

## Settings and Preferences

### Auto-Refresh Configuration

#### Available Intervals
- **10 seconds**: High-frequency polling
- **30 seconds**: Balanced polling (default)
- **60 seconds**: Standard polling
- **90 seconds**: Low-frequency polling

#### Changing Refresh Rate
- **Dropdown Method**: Use dropdown next to countdown timer in bottom bar
- **Keyboard Method**: Alt+P to cycle through intervals

#### Refresh Behavior
- **Visual Countdown**: Shows seconds remaining until next refresh
- **Timer Reset**: Resets after each data fetch

### Data Persistence

Settings automatically stored include:
- **Theme Selection**: Current visual theme
- **View Mode**: MACRO/MICRO mode per site
- **Alias Mode**: Pool name display preference per site
- **Search Filters**: Active search terms per site
- **Logger State**: Window position and visibility
- **Custom Pool Order**: Drag-and-drop arrangements per site

## NOC Mode Setup

For large-screen monitoring displays, configure "NOC mode" for optimal visibility:

### Configuration Steps

1. **Switch to MICRO View**: Press Alt+M or click Mode button
2. **Increase Page Zoom**: Increase browser page zoom 
3. **Enable Logger**: Press Alt+L to show logger at bottom of screen
4. **Adjust Logger Text**: Use + button to increase font size for distance viewing
5. **Hide Bottom Bar**: Press Alt+H to remove bottom controls for cleaner view
6. **Enter Fullscreen**: Press F11 to maximize browser window

<img width="2560" height="1440" alt="Image" src="https://github.com/user-attachments/assets/5f14c472-c2cb-4f8e-a67c-3f08069faf3e" />

## Keyboard Shortcuts Reference

### Search & Filter Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+F` / `Cmd+F` | **Focus Search** | Opens search input and selects all text |
| `Alt+C` | **Filter Changed** | Sets search filter to "changed" to show only pools with member changes |
| `Alt+X` | **Clear Search** | Clears the search filter and focuses search input |
| `Escape` | **Clear Filter** | Clears search filter when search input is focused |

### View & Display Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+M` | **Toggle View Mode** | Switches between MACRO and MICRO view modes |
| `Alt+T` | **Toggle Theme** | Cycles through available themes (theme1, theme2, theme3) |
| `Alt+A` | **Toggle Alias Mode** | Switches between showing pool aliases or actual pool names |
| `Alt+H` | **Toggle Bottom Bar** | Shows/hides the bottom control bar |

### Site & Refresh Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+S` | **Cycle Sites** | Cycles through available sites in the dropdown |
| `Alt+P` | **Cycle Polling Interval** | Cycles through polling intervals (10s, 30s, 60s, 90s) |

### DNS & Network Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+R` | **Resolve DNS** | Forces fresh DNS resolution for unknown member hostnames |
| `Alt+F` | **Flush DNS Cache** | Clears the dashboard DNS hostname cache |

### Logger Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+L` | **Toggle Logger** | Shows/hides the logger window |

### Saved Searches

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+1` through `Alt+5` | **Load Saved Search** | Loads saved search from slots 1-5 |
| `Alt+Shift+1` through `Alt+Shift+5` | **Save Current Search** | Saves current search term to slots 1-5 |

### Additional Features

- **Right-click on search input**: Opens context menu for loading/saving searches to numbered slots
- **Enter in search input**: Immediately applies the search filter

## Theme Selection

### Available Themes

The dashboard includes three distinct visual themes:

1. **Theme 1 (AGLight)**: Light theme with professional appearance
2. **Theme 2 (Monochrome Grey)**: Dark theme with high contrast
3. **Theme 3 (Amber Terminal)**: Terminal-style theme with amber accents

### Changing Themes

- **Button Method**: Click "Theme" button in bottom-right controls
- **Keyboard Method**: Press Alt+T to cycle through themes
- **Persistence**: Theme selection is remembered across sessions

## Frequently Asked Questions

### General Operation

### How often does the dashboard refresh data?

The default refresh interval is 30 seconds, but you can change it to 10, 60, or 90 seconds using the dropdown next to the countdown timer or by pressing Alt+P to cycle through options. The "Resolve" action will force an out-of-cycle poll with DNS resolution.

### Does the dashboard poll all sites all the time?

No, the Dashboard Javascript Client Module only polls the currently selected site. If you have visited other sites, you retain their polled status in browser sessionstorage and will detect any changes if those sites are visited again, which causes a new poll event.

### Can I monitor multiple sites simultaneously?

Yes, the dashboard supports multi-instance operation. Open multiple browser tabs or windows to monitor different sites concurrently.

### How much network bandwidth does the dashboard use?

Data usage is minimal. Each refresh fetches only JSON data (typically just a few KB per site). The amount depends on the number of pools and members configured for the site you are monitoring. A single pool is typically 400-600 bytes depending on the number of pool members. 600 pools with 3-5 members each is approximately 200kb.

### View Modes and Display

### What's the difference between MACRO and MICRO view modes?

MACRO view shows detailed member information for troubleshooting individual components. MICRO view shows pool-level summaries for monitoring many pools at once. MICRO view displays pool-level alarms when any member has unacknowledged status changes. You cannot acknowledge MICRO mode pool header badges directly; you must enter MACRO mode and acknowledge the alarmed members, or use the Reset function.

### What's the difference between pool names and aliases?

Pool names are the actual F5 LTM pool name identifiers. Aliases are optional user-friendly names configured for easier identification by operations or application teams who might not be able to decode LTM pool names. Use Alt+A to toggle between displaying actual names or aliases (if aliases have been configured). 

### The pool table only shows 5 members, but I have pools with 6+ members?

In the interest of maintaining a consistent grid, visible pool members are limited to 5; when 6 or more pool members exist, the pool table will present a vertical scrollbar. It is therefore recommended to use Micro mode when pools exist that have 6 or more members. The pool status badge will pulse when any member changes. The Logger can also help visualize specific events that occur in large pools where not all members may be visible in the Macro mode pool table card.

### Search and Filtering

### How do I search for pools with any DOWN members?

Type "down" in the search box. This will show pools that either have DOWN status themselves or contain members with DOWN status.

### How do I find pools that need attention?

Type "changed" in the search box, click the "Changed" button, or press Alt+C. This shows pools with unacknowledged status changes (pulsing badges).

### What's the difference between "web app" and "web AND app" in search?

"web app" (without quotes) searches for pools containing "web" OR "app". "web AND app" requires both terms to be present. Use quotes for exact phrases: "web app".

### Status Change Management

### Why are some status badges pulsing?

Pulsing indicates that a pool member's status has changed from its initially recorded polled baseline state. Click the pulsing badge in Macro mode to acknowledge the change and stop the alarm.

### What happens if I don't acknowledge status changes?

The pulsing will continue until you either click to acknowledge, use the "Reset" button, or the member returns to its baseline state automatically.

### Can I see a history of status changes?

Yes, enable the logger (Alt+L) to see real-time status changes with timestamps. The logger maintains a history of changes for your current session in a 5000 event FIFO buffer. The logger monitors each site even when not displayed.

### What does the Reset button do?

The reset button clears member state information for a site. This can be useful if many objects are alarmed and you prefer not to click each one individually. Note that a reset does not set a new baseline; the new baseline will be established during the next poll following a reset action.

### DNS and Network Features

### Why do some pools show hostnames and others show IP addresses?

The dashboard uses DNS resolution when configured. If a hostname can be resolved for a pool member, it displays the hostname. Otherwise, it shows the IP address. You can hover over hostnames to see the underlying IP address in a tooltip.

### How do I update hostnames after DNS changes?

Press Alt+R or click the "Resolve" button to force fresh DNS resolution. Press Alt+F or click "Flush" to clear the DNS cache completely. Note that if a hostname is cached, pressing "Resolve" will never trigger another request for that IP. You would then be required to "Flush" and initiate a new resolve action.

### Miscellaneous

### Is there a maximum number of pools the dashboard can display?

There's no hard limit, but performance may decrease with very large numbers of pools (1000+). Use search filtering and MICRO view to manage large pool sets effectively. Dashboard 1.x has been tested with 600 pools and 800+ nodes per-site on a Lab license VE without issue with the JSON response being 200-300k for 600 pools.

### How do I pause polling if I need to step away for a time, but don't want to lose my existing saved site session data?

Simply select "Select a site" (no site) in the site dropdown and leave the browser open. The dashboard will return to a default state and stop all polling, but your site data will remain in memory.

### What's the unmonitored pool limitation?

LTM Pools that are unmonitored will always show all pool members as "UP" regardless of their actual status. This is an intended limitation of the F5 system when health monitors are not configured since the system needs to assume that all members are available for LB processing. In the event that you have unmonitored pools, it is recommended to annotate this in an alias so that users of the dashboard will know that the visible UP members might not be indicative of real-world operational status.

### Why does this exist? Why not just use Solarwinds or an inline pool status irule?

This project was born from experience in organizations where NMS solutions such as Solarwinds were not accessible by the Application Delivery or Application Teams. This project presents a 'no addtional infrastructure' option for LTM pool visibility where inline pool status irules are not preferred due to application operational concerns.

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
