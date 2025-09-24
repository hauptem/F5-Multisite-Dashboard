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

- **Logo and Title**: F5 logo (links to Big-IP Front-end management interface)
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

### MACRO View (Default)

- **Detail Level**: Full member details with individual status indicators
- **Use Case**: Detailed monitoring and troubleshooting
- **Pool Display**: Complete member lists with scrollable tables
- **Status Changes**: Individual member change indicators

### MICRO View

- **Detail Level**: Pool-level summary with alarm indicators
- **Use Case**: High-level overview monitoring
- **Pool Display**: Condensed pool status with aggregate information
- **Status Changes**: Pool-level alarm indicators when any member has unacknowledged changes

### Switching View Modes

- **Button Location**: "Mode" button in bottom bar
- **Keyboard Shortcut**: Alt+M
- **Per-Site Setting**: Each site remembers its preferred view mode
- **Instant Application**: View changes immediately without page reload

## Alias Display Mode

- **Alias Mode ON (Default)**: Shows pool alias names when available
- **Alias Mode OFF**: Shows actual pool names
- **Fallback**: If no alias exists, always shows actual pool name
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

- **No Site Selected**: Shows "Choose a site..." message with instruction to select from dropdown
- **Site Loading**: Displays loading indicator while fetching data
- **Site Active**: Shows real-time pool data with auto-refresh
- **Site Error**: Displays error message with retry option if site is unavailable

### Site Information Display

When a site is selected, the header shows:

- **Hostname**: The source Big-IP hostname providing the data
- **Last Updated**: Timestamp of the most recent client data fetch
- **Direct Link**: Click hostname to access the source Big-IP management interface

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

### Advanced Search Examples

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
- **Persistence**: New order is automatically saved and persists across sessions
- **Site-Specific**: Each site maintains its own custom pool order
- **Fallback**: If no custom order exists, pools use their configured sort order

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

#### Resolve DNS (Alt+R)

- **Function**: Forces fresh DNS resolution for all current pool members
- **Use Case**: Update hostnames after DNS changes
- **Button Location**: "Resolve" button in bottom bar
- **Optimization**: Only resolves IPs not already cached with valid hostnames

#### Flush DNS Cache (Alt+F)

- **Function**: Clears all cached DNS entries for current site
- **Effect**: Immediate UI update showing IP addresses instead of hostnames
- **Use Case**: Clear stale DNS cache entries
- **Button Location**: "Flush" button in bottom bar

## Keyboard Shortcuts

### Primary Navigation

- **Alt+M** - Toggle Mode (MACRO ↔ MICRO view)
- **Alt+A** - Toggle Alias (pool display name mode)
- **Alt+T** - Toggle Theme (cycles through available themes)
- **Alt+L** - Toggle Logs (show/hide event logger)

### Search and Filtering

- **Ctrl+F** - Focus search input field
- **Alt+C** - Filter for Changed members (pools needing attention)
- **Alt+X** - Clear search filter
- **Escape** - Clear filter (when search input focused)

### Saved Searches

- **Alt+1** through **Alt+5** - Load saved search from slot 1-5
- **Alt+Shift+1** through **Alt+Shift+5** - Save current search to slot 1-5
- **Right-click on search input** - Show saved search context menu

### Site and System Management

- **Alt+S** - Cycle through site dropdown options
- **Alt+P** - Cycle through refresh polling intervals
- **Alt+H** - Toggle bottom bar visibility

### DNS Functions

- **Alt+R** - Resolve DNS hostname resolution
- **Alt+F** - Flush dashboard DNS hostname cache

## Theme Selection

### Changing Themes

- **Access**: "Theme" button in bottom-right controls or Alt+T
- **Cycling**: Each activation advances to the next theme in sequence
- **Persistence**: Theme choice persists across sessions and sites

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
- **Effect**: Immediately applies new interval without page reload
- **Persistence**: Setting persists across sessions

#### Refresh Behavior

- **Visual Countdown**: Shows seconds remaining until next refresh
- **Auto-Reset**: Timer resets after each data fetch
- **Tab Visibility**: Refreshing pauses when tab is hidden (unless logger is open)
- **Error Handling**: Timer continues running even if data fetch fails
- **Wake Lock**: Prevents tab sleeping when logger is visible

### Data Persistence

Settings and preferences stored include:

- **Theme Selection**: Current visual theme
- **View Mode**: MACRO/MICRO mode per site
- **Alias Mode**: Pool name display preference per site
- **Refresh Interval**: Auto-refresh rate
- **Selected Site**: Currently monitored site
- **Pool Order**: Custom pool arrangement (per site)
- **Search Filter**: Active search terms (per site)
- **Logger State**: Shown/hidden and position
- **Member States**: Status change tracking baselines (per site)
- **DNS Cache**: Hostname resolution cache (per site)

## Dashboard Logger

### Overview

The integrated logger provides near real-time activity tracking and debugging information in a resizable, movable text-based window interface.

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

#### Resize Controls

- **Bottom Edge**: Drag to adjust height
- **Right Edge**: Drag to adjust width
- **Corner Handle**: Drag corner for proportional resize
- **Minimum Size**: 50% screen width, 15% screen height
- **Maximum Size**: 95% screen width, 80% screen height

### Log Entry Format

Each log entry contains:

- **Status Symbol**: Colored symbol indicating final status ▲ UP, ▼ DOWN, ■ DISABLED
- **Timestamp**: HH:MM:SS format
- **Site Name**: Source site identifier
- **Hostname**: Source Big-IP hostname
- **Status Change**: FROM status → TO status
- **Member**: Affected pool member hostname:port or IP:port
- **Pool**: Pool name

## FAQ

### General Usage

**Q: How often does the dashboard refresh data?**

The default refresh interval is 30 seconds, but you can change it to 10, 60, or 90 seconds using the dropdown next to the countdown timer or by pressing Alt+P to cycle through options.

**Q: What's the difference between MACRO and MICRO view modes?**

MACRO view shows detailed member information for troubleshooting. MICRO view shows pool-level summaries for monitoring many pools at once. MICRO view displays pool-level alarms when any member has unacknowledged status changes.

**Q: Can I monitor multiple sites simultaneously?**

No, the dashboard displays one site at a time. Use the site selector to switch between sites. Each site maintains its own settings, view mode, and pool order.

**Q: What's the difference between pool names and aliases?**

Pool names are the actual F5 LTM identifiers. Aliases are user-friendly names configured for easier identification. Use Alt+A to toggle between displaying actual names and aliases.

### Search and Filtering

**Q: How do I search for pools with any DOWN members?**

Type "down" in the search box. This will show pools that either have DOWN status themselves or contain members with DOWN status.

**Q: How do I find pools that need attention?**

Type "changed" in the search box, click the "Changed" button, or press Alt+C. This shows pools with unacknowledged status changes (pulsing badges).

**Q: What's the difference between "web app" and "web AND app" in search?**

"web app" (without quotes) searches for pools containing "web" OR "app". "web AND app" requires both terms to be present. Use quotes for exact phrases: "web app".

### Status Change Tracking

**Q: Why are some status badges pulsing?**

Pulsing indicates that a pool member's status has changed from its initially recorded baseline state. Click the pulsing badge to acknowledge the change and stop the pulsing.

**Q: What happens if I don't acknowledge status changes?**

The pulsing will continue until you either click to acknowledge, use the "Reset" button, or the member returns to its baseline state automatically.

**Q: Can I see a history of status changes?**

Yes, enable the logger (Alt+L) to see real-time status changes with timestamps. The logger maintains a history of changes for your current session.

### DNS Features

**Q: Why do some pools show hostnames and others show IP addresses?**

The dashboard uses DNS resolution when configured. If a hostname can be resolved for a pool member, it displays the hostname. Otherwise, it shows the IP address. You can hover over hostnames to see the underlying IP address.

**Q: How do I update hostnames after DNS changes?**

Press Alt+R or click the "Resolve" button to force fresh DNS resolution. Press Alt+F or click "Flush" to clear the DNS cache completely.

### Technical Questions

**Q: Why does my browser tab stay active even when I'm not looking at it?**

When the logger is visible, the dashboard uses Wake Lock technology to prevent your browser tab from going to sleep. This ensures continuous monitoring and logging. The wake lock is released when you hide the logger. Wake-lock may not be available on all client systems.

**Q: How much data does the dashboard use?**

Data usage is minimal. Each refresh fetches only JSON data (typically just a few KB per site). The amount depends on the number of pools and members configured for the site you are monitoring.

**Q: Is there a maximum number of pools the dashboard can display?**

There's no hard limit, but performance may decrease with very large numbers of pools (1000+). Use search filtering and MICRO view to manage large pool sets effectively.
