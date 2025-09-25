# F5 Multi-Site Dashboard - User Guide

## Introduction

The F5 Multi-Site Pool Status Dashboard provides centralized monitoring of LTM load balancer pools across multiple Big-IP sites. This web-based interface offers near real-time visibility into pool health, member status, and provides advanced features for tracking status changes and managing your monitoring experience.

## First Time Setup

1. **Select a Site**: Use the site selector in the bottom bar to choose your initial monitoring site
2. **Configure Refresh Rate**: Set your preferred auto-refresh interval (10s, 30s, 60s, or 90s)
3. **Choose Theme**: Select a visual theme that suits your preference and environment
4. **Select View Mode**: Choose between MACRO (detailed) or MICRO (summary) view

## Dashboard Interface Overview

### Header Section

- **Logo and Title**: F5 logo (links to Big-IP Front-end management interface if DNS record exists)
- **Site Information Bar**: Displays current site hostname and last update timestamp (when a site is selected)
- **Logout Button**: Ends your dashboard session and logs you out of APM

### Main Content Area

- **Top Controls Bar**: Search, filtering, view mode, and management controls
- **Pool Grid**: Displays pool status cards in a responsive grid layout
- **Loading/Error States**: Informational messages when appropriate

### Bottom Bar

- **Auto-Refresh Timer**: Shows countdown and allows interval adjustment
- **Site Selector**: Dropdown to choose monitoring site
- **Theme Controls**: Theme toggle, view mode, alias mode, and logger access buttons

## Pool Status Monitoring

### Pool-Level Status Badges

- 🟢 **UP (Green)**: Pool has available members and is operational
- 🔴 **DOWN (Red)**: All pool members are unavailable
- 🔘 **DISABLED (Gray)**: All active members are administratively disabled
- 🟡 **UNKNOWN (Yellow)**: Pool status cannot be determined or pool not found
- 🟠 **EMPTY (Orange)**: Pool exists but has no configured members

### Member-Level Status Badges

- 🟢 **UP (Green)**: Member is available and passing health checks
- 🔴 **DOWN (Red)**: Member is unavailable or failing health checks
- 🔘 **DISABLED (Gray)**: Member is administratively disabled

## Understanding Member Information

- **Display Format**: Shows hostname:port when DNS is enabled, otherwise IP:port
- **Tooltip Information**: Hover over hostnames to see IP address

## View Modes

### MACRO View 

- **Detail Level**: Full member details with individual status indicators
- **Use Case**: Detailed monitoring and troubleshooting
- **Pool Display**: Complete member lists with scrollable tables
- **Status Changes**: Individual member change indicators

### MICRO View (Default)

- **Detail Level**: Pool-level summary with alarm indicators
- **Use Case**: High-level overview monitoring
- **Pool Display**: Condensed pool status with aggregate information
- **Status Changes**: Pool-level alarm indicators when any member has unacknowledged changes

### Switching View Modes

- **Button Location**: "Mode" button in bottom bar
- **Keyboard Shortcut**: Alt+M
- **Per-Site Setting**: Each site remembers its preferred view mode

## Alias Display Mode

- **Alias Mode ON (Default)**: Shows pool alias names when available
- **Alias Mode OFF**: Shows actual LTM pool names
- **Fallback**: If no alias exists, always shows actual LTM pool name
- **Tooltip**: Hover to see alternate name (actual name when showing alias, alias when showing actual name)
- **Button Location**: "Alias" button in bottom bar
- **Button States**:
  - "Alias" (default) = showing alias names
  - "Actual" (highlighted) = showing actual pool names
- **Keyboard Shortcut**: Alt+A
- **Per-Site Setting**: Each site remembers its preferred alias mode
- **Search Compatibility**: Search works with both actual names and aliases

## Site Selection and Management

### Selecting a Site

- Locate the Site Selector dropdown in the bottom bar
- Click the dropdown to view available sites
- Select your desired site from the list
- The dashboard will immediately load data from the selected site

### Site States

- **No Site Selected**: Shows "Select a site..." message with instruction to select from dropdown
- **Site Loading**: Displays loading indicator while fetching data
- **Site Active**: Shows real-time pool data with auto-refresh
- **Site Error**: Displays error message with retry option if site is unavailable

### Site Information Display

When a site is selected, the header shows:

- **Hostname**: The source Big-IP hostname providing the data
- **Last Updated**: Timestamp of the most recent client data fetch
- **Direct Link**: Click hostname to access the source Big-IP management interface (if DNS record exists)

## Advanced Search and Filtering

### Search Input Field

- **Location**: Central search box in the top controls
- **Placeholder**: "Search... BOOLEAN OR (default), AND, NOT..."
- **Real-Time**: Results update as you type (300ms delay)
- **Quick Buttons**: "Changed" and "Clear" buttons for common filters

### Boolean Search Operators

#### Basic Search (OR Logic - Default)

- `web database` → Shows pools containing "web" or "database"
- `192.168.10 10.20.1` → Shows pools with "192.168.10" or "10.20.1" IP addresses

#### AND - All terms must match

- `centos AND app01` → Pools with "centos" members and "app01" in pool name
- `web AND 192.168` → Pools with "web" and "192.168" IP addresses

#### NOT - Exclude terms

- `NOT down` → All pools except those with "down" members
- `windows NOT disabled` → Pools with "windows" but not "disabled" members
- `NOT down AND Cisco` → Pools with "Cisco" but no "down" members

#### Special Keywords

- **changed - Find Alarms**
- `changed` → Only pools with pulsing status badges (unacknowledged state changes)

### Search Examples

- `"web server" AND up` → Pools with exact phrase "web server" and "up" status
- `centos AND changed NOT disabled` → Changed centos servers (not disabled)
- `up NOT down` → Show pools that are fully available
- `down NOT up` → Show pools that are fully unavailable

### Search Capabilities

The search function examines:

- Pool names and alias names
- Pool status (UP, DOWN, DISABLED, UNKNOWN, EMPTY)
- Member IP addresses and hostnames
- Member ports and status
- Case-insensitive matching with partial word support

## Pool Reordering

### Enabling Reorder Mode

1. Click the "Reorder" button in the top-left of the controls bar
2. Button changes to "Disable" and highlights in yellow
3. Pool tables become draggable with move cursors

### Reordering Pools

1. **Drag Source**: Click and hold on any pool table
2. **Visual Feedback**: Dragged pool becomes semi-transparent and slightly smaller
3. **Drop Target**: Drag over another pool table (highlights with dashed border)
4. **Complete**: Release to swap positions

### Reorder Behavior

- **Swap Logic**: Dragging Pool A onto Pool B swaps their positions
- **Persistence**: New order is automatically saved and persists for session duration only
- **Site-Specific**: Each site maintains its own custom pool order
- **Fallback**: If no custom order exists, pools use their configured sort order or, if no sort order was configured, the pools will display in the order they are listed in the pools datagroup

## Status Change Tracking

### Overview

The dashboard tracks when pool member statuses change from their baseline state and provides visual indicators when member states change.

### Visual Change Indicators

#### Pulsing Animation

- **Effect**: Status badges pulse with a golden glow
- **Trigger**: When a member's status differs from its established baseline
- **Duration**: Continues until manually acknowledged

#### Clickable Status Badges

- **Appearance**: Changed status badges become clickable (cursor changes to pointer)
- **Border**: Border indicates acknowledgment is available
- **Tooltip**: Enhanced tooltip shows previous status and change time

### Baseline Status Concept

- **Initial State**: When first seen, a member's polled status becomes its "baseline"
- **Change Detection**: Any deviation from the recorded baseline triggers change tracking
- **Auto-Return**: If status returns to recorded baseline, change indicator automatically clears

### Acknowledging Changes

- **Identify Changed Member**: Look for pulsing status badges
- **Click Status Badge**: Single click on the pulsing badge
- **Immediate Effect**: Pulsing stops, badge returns to normal appearance
- **New Baseline**: Current status becomes the new baseline for future comparisons

### MICRO View Alarm Logic

In MICRO view mode:

- **Pool-Level Alarms**: Entire pool status badge shows alarm state if any member has unacknowledged changes
- **Tooltip Enhancement**: Pool tooltips indicate "Members need attention - switch to MACRO Mode"
- **Quick Identification**: Easily spot pools with issues across large deployments

## DNS Integration and Optimization

### DNS Hostname Display

- **Automatic Resolution**: Backend resolves IP addresses to hostnames when configured
- **Display Priority**: Shows hostname:port when available, otherwise IP:port
- **Caching**: Intelligent client-side caching reduces backend DNS lookups
- **Tooltip Support**: Hover over hostnames to see underlying IP addresses

### DNS Management Functions

#### Resolve DNS

- **Function**: Forces fresh DNS resolution for all current pool members
- **Use Case**: Update hostnames after DNS changes
- **Button Location**: "Resolve" button in bottom bar
- **Optimization**: Only resolves IPs not already cached with valid hostnames

#### Flush DNS Cache

- **Function**: Clears all cached DNS entries for current site
- **Effect**: Immediate UI update showing IP addresses instead of hostnames
- **Use Case**: Clear stale DNS cache entries
- **Button Location**: "Flush" button in bottom bar


## Keyboard Shortcuts Reference

## Search & Filter Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+F` / `Cmd+F` | **Focus Search** | Opens search input and selects all text |
| `Alt+C` | **Filter Changed** | Sets search filter to "changed" to show only pools with member changes |
| `Alt+X` | **Clear Search** | Clears the search filter and focuses search input |
| `Escape` | **Clear Filter** | Clears search filter when search input is focused |

## View & Display Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+M` | **Toggle View Mode** | Switches between MACRO and Micro view modes |
| `Alt+T` | **Toggle Theme** | Cycles through available themes (theme1, theme2, theme3) |
| `Alt+A` | **Toggle Alias Mode** | Switches between showing pool aliases or actual pool names |
| `Alt+H` | **Toggle Bottom Bar** | Shows/hides the bottom control bar |

## Site & Refresh Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+S` | **Cycle Sites** | Cycles through available sites in the dropdown |
| `Alt+P` | **Cycle Polling Interval** | Cycles through Polling intervals (10s, 30s, 60s, 90s) |

## DNS & Network Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+R` | **Resolve DNS** | Initiates a poll with DNS resolution requested for unknown member hostnames |
| `Alt+F` | **Flush DNS Cache** | Clears the dashboard DNS hostname cache |

## Logger Controls

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+L` | **Toggle Logger** | Shows/hides the logger window |

## Saved Searches

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt+1` through `Alt+5` | **Load Saved Search** | Loads saved search from slots 1-5 |
| `Alt+Shift+1` through `Alt+Shift+5` | **Save Current Search** | Saves current search term to slots 1-5 |

## Additional Features

### Context Menu Options
- **Right-click on search input**: Opens context menu for loading/saving searches to numbered slots

### Search Input Behavior
- **Enter in search input**: Immediately applies the search filter 

## Search Filter Syntax

The search filter supports Boolean operators for advanced filtering:

| Operator | Usage | Example |
|----------|-------|---------|
| `OR` | Default behavior (space-separated) | `pool1 pool2` (shows pools containing either term) |
| `AND` | Requires all terms | `pool1 AND up` (shows pools containing pool1 in the name with up members) |
| `NOT` | Excludes terms | `web NOT down` (shows pools with "web" but no down members) |
| `changed` | Special keyword | Shows only pools with unacknowledged member status changes |

## Theme Selection

### Changing Themes

- "Theme" button in bottom-right controls or Alt+T

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
- Timer resets after each data fetch

### Data Persistence

Settings and preferences stored include:

- **Theme Selection**: Current visual theme
- **View Mode**: MACRO/MICRO mode per site
- **Alias Mode**: Pool name display preference per site

## Dashboard Logger

### Overview

The integrated logger provides near real-time activity tracking and debugging information in a resizable, movable text-based window interface. The logger is optional and the dashboard will function if this module is not deployed.

### Accessing the Logger

- **Location**: "Logs" button in bottom-right theme controls
- **Toggle**: Click to show/hide the logger window
- **Keyboard Shortcut**: Alt+L
- **Persistence**: Logger state (shown/hidden) persists across sites

### Logger Interface

#### Header Controls

- **Title**: "Dashboard Logs"
- **Font Size**: + and - buttons to adjust text size
- **Expand**: Toggle between normal and full-width view
- **Clear**: Remove all current log entries
- **Close (X)**: Close the logger window

#### Content Area

- **Background**: Black terminal-style background
- **Text Format**: Monospace font with color coded events
- **Auto-Scroll**: Automatically scrolls to show newest entries
- **Entry Limit**: Maximum 5000 entries (oldest entries removed automatically)

### Logger Functionality

#### Drag and Move

- **Drag Handle**: Click and drag the header to reposition the logger
- **Free Positioning**: Place anywhere on screen
- **Boundaries**: Constrained to browser window

### Log Entry Format

Each log entry contains:

- **Status Symbol**: Colored symbol indicating final status ▲ UP, ▼ DOWN, ■ DISABLED
- **Timestamp**: HH:MM:SS format
- **Site Name**: Source site identifier
- **Status Change**: FROM status → TO status
- **Member**: Affected pool member hostname:port or IP:port
- **Pool**: Pool name

## FAQ

**Q: How often does the dashboard refresh data?**

The default refresh interval is 30 seconds, but you can change it to 10, 60, or 90 seconds using the dropdown next to the countdown timer or by pressing Alt+P to cycle through options.

**Q: What's the difference between MACRO and MICRO view modes?**

MACRO view shows detailed member information for troubleshooting. MICRO view shows pool-level summaries for monitoring many pools at once. MICRO view displays pool-level alarms when any member has unacknowledged status changes.

**Q: Can I monitor multiple sites simultaneously?**

Yes, the dashboard supports multi-instance operation as of version 1.6.

**Q: What's the difference between pool names and aliases?**

Pool names are the actual F5 LTM identifiers. Aliases are user-friendly names configured for easier identification. Use Alt+A to toggle between displaying actual names and aliases.

**Q: How do I search for pools with any DOWN members?**

Type "down" in the search box. This will show pools that either have DOWN status themselves or contain members with DOWN status.

**Q: How do I find pools that need attention?**

Type "changed" in the search box, click the "Changed" button, or press Alt+C. This shows pools with unacknowledged status changes (pulsing badges).

**Q: What's the difference between "web app" and "web AND app" in search?**

"web app" (without quotes) searches for pools containing "web" OR "app". "web AND app" requires both terms to be present. Use quotes for exact phrases: "web app".

**Q: Why are some status badges pulsing?**

Pulsing indicates that a pool member's status has changed from its initially recorded baseline state. Click the pulsing badge to acknowledge the change and stop the pulsing.

**Q: What happens if I don't acknowledge status changes?**

The pulsing will continue until you either click to acknowledge, use the "Reset" button, or the member returns to its baseline state automatically.

**Q: Can I see a history of status changes?**

Yes, enable the logger (Alt+L) to see real-time status changes with timestamps. The logger maintains a history of changes for your current session. 5000 event FIFO buffer.

**Q: Why do some pools show hostnames and others show IP addresses?**

The dashboard uses DNS resolution when configured. If a hostname can be resolved for a pool member, it displays the hostname. Otherwise, it shows the IP address. You can hover over hostnames to see the underlying IP address.

**Q: How do I update hostnames after DNS changes?**

Press Alt+R or click the "Resolve" button to force fresh DNS resolution. Press Alt+F or click "Flush" to clear the DNS cache completely.

**Q: How much data does the dashboard use?**

Data usage is minimal. Each refresh fetches only JSON data (typically just a few KB per site). The amount depends on the number of pools and members configured for the site you are monitoring.

**Q: Is there a maximum number of pools the dashboard can display?**

There's no hard limit, but performance may decrease with very large numbers of pools (1000+). Use search filtering and MICRO view to manage large pool sets effectively. Dashboard 1.x has been tested with 600 pools and 800+ nodes on a Lab license VE without issue. 
