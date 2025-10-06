// Multi-Site Dashboard JavaScript - LOGGER MODULE
// Dashboard Version: 1.8
// Dashboard JSON:    1.8
// Author: Eric Haupt
// License: MIT
//
// Copyright (c) 2025 Eric Haupt
// Released under the MIT License. See LICENSE file for details.
//
// Description: Dedicated logger functionality with resizable UI, state 
// persistence, memory management, wake lock integration, session storage and copy

// =============================================================================
// MODULE INITIALIZATION
// =============================================================================

/**
 * Initialize logger namespace if not already done
 */
if (!window.Dashboard) {
  window.Dashboard = {};
}
if (!window.Dashboard.logger) {
  window.Dashboard.logger = {};
}

/**
 * Initialize logger module with wake lock coordination
 */
Dashboard.logger.init = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Initializing standalone logger module with wake lock integration and session storage persistence');
  }
  
  // Initialize logger state
  Dashboard.logger.state = {
    visible: false,
    expanded: false,
    fontSize: 22,
    container: null,
    initialized: false,
    previousDimensions: {},
    columnWidths: {
      timestamp: 12,
      site: 14,
      change: 10,
      member: 23,
      pool: 12
    }
  };
  
  // Initialize session storage configuration
  Dashboard.logger.storage = {
    key: 'dashboardLogEntries',
    maxEntries: 5000
  };
  
  Dashboard.logger.loadLoggerState();
  Dashboard.logger.safeInitLogger();
  Dashboard.logger.registerWithUI();
  
  // Enable logging in data module always (now that we have session storage)
  if (Dashboard.data && Dashboard.data.enableLogger) {
    Dashboard.data.enableLogger();
  }
  
  // Notify core module about initial logger state for wake lock management
  if (Dashboard.logger.state.visible && Dashboard.core && Dashboard.core.onLoggerVisible) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Notifying core module of initial visible state');
    }
    Dashboard.core.onLoggerVisible();
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Initialization complete with wake lock integration and session storage persistence');
  }
};

/**
 * Safely initialize logger UI components
 */
Dashboard.logger.safeInitLogger = function() {
  if (Dashboard.logger.state.initialized || document.getElementById('dashboard-logger')) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Logger already initialized or exists');
    }
    return;
  }
  
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Waiting for DOM ready before logger init');
    }
    setTimeout(Dashboard.logger.safeInitLogger, 100);
    return;
  }
  
  try {
    Dashboard.logger.initLogger();
  } catch (e) {
    console.error('Logger: Logger initialization failed:', e);
  }
};

/**
 * Initialize logger UI components with enhanced tooltips
 */
Dashboard.logger.initLogger = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Creating logger interface');
  }
  
  const loggerHTML = `
    <div class="dashboard-logger-container" id="dashboard-logger" style="position: fixed !important; bottom: 90px !important; right: 20px !important; width: 80vw; height: 25vh; background: #2a2a2a !important; border: 2px solid #555555 !important; border-radius: 0; box-shadow: none !important; display: flex; flex-direction: column; font-family: 'Lucida Console', 'Monaco', 'Courier New', monospace !important; overflow: visible; min-height: 15vh; max-height: calc(100vh - 180px) !important; min-width: 50vw; max-width: 95vw; z-index: 2000; display: none;">
      <div class="logger-header" style="background: linear-gradient(to bottom, #3a3a3a 0%, #2a2a2a 100%) !important; color: #f5f5f5 !important; padding: 6px 12px; border-bottom: 1px solid #555555 !important; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; font-size: 0.9em; font-weight: 600; cursor: move; user-select: none;">
        <div class="logger-title" style="flex: 1; color: #f5f5f5 !important;">Dashboard Event Logger</div>
        <div class="logger-controls" style="display: flex; align-items: center; gap: 15px;">
          <div class="font-size-control" style="display: flex; align-items: center; gap: 8px; color: #f5f5f5 !important; font-size: 0.8em; opacity: 0.8;">
            <span>Text Size</span>
            <div class="font-size-buttons" style="display: flex; gap: 10px;">
              <button class="font-btn" data-action="font-decrease" title="Decrease font size" style="background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.3) !important; color: #ffffff !important; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: 500; transition: all 0.2s; min-width: 28px; text-align: center;">−</button>
              <button class="font-btn" data-action="font-reset" title="Reset font size" style="background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.3) !important; color: #ffffff !important; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: 500; transition: all 0.2s; min-width: 28px; text-align: center;">R</button>
              <button class="font-btn" data-action="font-increase" title="Increase font size" style="background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.3) !important; color: #ffffff !important; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: 500; transition: all 0.2s; min-width: 28px; text-align: center;">+</button>
            </div>
          </div>
          <button class="copy-btn" data-action="copy" title="Copy text to clipboard" style="background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.3) !important; color: #f5f5f5 !important; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: 500; transition: all 0.2s; margin-left: 15px; width: 70px; min-width: 70px; text-align: center;">Copy</button>
          <button class="expand-btn" data-action="expand" title="Expand logger window" style="background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.3) !important; color: #f5f5f5 !important; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: 500; transition: all 0.2s; margin-left: 15px; width: 70px; min-width: 70px; text-align: center;">Expand</button>
          <button class="clear-btn" data-action="clear" title="Clear logger window" style="background: rgba(255,165,0,0.3) !important; border: 1px solid rgba(255,165,0,0.5) !important; color: #f5f5f5 !important; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: 500; transition: all 0.2s; margin-left: 15px; width: 70px; min-width: 70px; text-align: center;">Clear</button>
          <button class="close-btn" data-action="close" title="Close logger" style="background: rgba(220,53,69,0.3) !important; border: 1px solid rgba(220,53,69,0.5) !important; color: #f5f5f5 !important; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em; font-weight: bold; transition: all 0.2s; margin-left: 15px;">×</button>
        </div>
      </div>
      <div class="logger-content" id="dashboard-logger-content" style="flex: 1; overflow-y: auto; padding: 8px; background: #000000 !important; font-size: 14px; line-height: 1.3; box-sizing: border-box; min-height: 0; color: #ffffff;"></div>
      <div class="resize-handle-bottom" id="logger-resize-handle-bottom" style="position: absolute; bottom: -5px; left: 0; right: 0; height: 8px; background: #666666 !important; cursor: ns-resize; opacity: 0.7; transition: opacity 0.2s; z-index: 2001;"></div>
      <div class="resize-handle-right" id="logger-resize-handle-right" style="position: absolute; top: 0; bottom: 0; right: -5px; width: 8px; background: #666666 !important; cursor: ew-resize; opacity: 0.7; transition: opacity 0.2s; z-index: 2001;"></div>
      <div class="resize-handle-corner" id="logger-resize-handle-corner" style="position: absolute; bottom: -5px; right: -5px; width: 12px; height: 12px; background: #777777 !important; cursor: nw-resize; opacity: 0.8; transition: opacity 0.2s; z-index: 2002; border-radius: 3px 0 0 0;"></div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loggerHTML);
  
  Dashboard.logger.state.container = document.getElementById('dashboard-logger');
  
  if (!Dashboard.logger.state.container) {
    throw new Error('Failed to create logger container');
  }
  
  setTimeout(() => {
    Dashboard.logger.initLoggerEventHandlers();
    Dashboard.logger.initLoggerDragResize();
    Dashboard.logger.applyLoggerState();
  }, 50);
  
  Dashboard.logger.state.initialized = true;
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Logger interface created successfully');
  }
};

/**
 * Toggle expanded view with dynamic tooltip update
 */
Dashboard.logger.toggleExpand = function() {
  const logger = Dashboard.logger.state.container;
  const expandBtn = logger ? logger.querySelector('.expand-btn') : null;
  
  if (!logger || !expandBtn) return;
  
  if (!Dashboard.logger.state.expanded) {
    // Save current dimensions (only width and height)
    const computedStyle = window.getComputedStyle(logger);
    Dashboard.logger.state.previousDimensions = {
      width: computedStyle.width,
      height: computedStyle.height
    };
    
    // Expand - keep centered positioning
    logger.style.width = 'calc(100vw - 40px)';
    logger.style.height = '50vh';
    logger.style.left = '50%';
    logger.style.transform = 'translateX(-50%)';
    logger.style.bottom = '20px';
    logger.style.right = 'auto';
    
    expandBtn.textContent = 'Restore';
    expandBtn.style.background = 'rgba(255,165,0,0.3)';
    expandBtn.style.borderColor = 'rgba(255,165,0,0.5)';
    Dashboard.logger.state.expanded = true;
    
    // Force tooltip update with a slight delay to ensure DOM update
    setTimeout(() => {
      expandBtn.setAttribute('title', 'Restore logger window');
    }, 10);
  } else {
    // Restore - keep centered positioning
    const prev = Dashboard.logger.state.previousDimensions;
    if (prev) {
      logger.style.width = prev.width;
      logger.style.height = prev.height;
    }
    logger.style.left = '50%';
    logger.style.transform = 'translateX(-50%)';
    logger.style.bottom = '90px';
    logger.style.right = 'auto';
    
    expandBtn.style.background = 'rgba(255,255,255,0.2)';
    expandBtn.style.borderColor = 'rgba(255,255,255,0.3)';
    expandBtn.textContent = 'Expand';
    Dashboard.logger.state.expanded = false;
    
    // Force tooltip update with a slight delay to ensure DOM update
    setTimeout(() => {
      expandBtn.setAttribute('title', 'Expand logger window');
    }, 10);
  }
  
  Dashboard.logger.saveLoggerState();
};

/**
 * Register logger functions with UI module for backward compatibility
 */
Dashboard.logger.registerWithUI = function() {
  if (!Dashboard.ui) {
    Dashboard.ui = {};
  }
  
  // Register core logger functions with UI module
  Dashboard.ui.toggleLogger = Dashboard.logger.toggleLogger;
  Dashboard.ui.addLogEntry = Dashboard.logger.addLogEntry;
  Dashboard.ui.saveLoggerState = Dashboard.logger.saveLoggerState;
  Dashboard.ui.loadLoggerState = Dashboard.logger.loadLoggerState;
  Dashboard.ui.destroyLogger = Dashboard.logger.destroyLogger;
  
  Dashboard.ui.logger = Dashboard.logger.state;
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Registered with UI module for backward compatibility');
  }
};

/**
 * Auto-initialize logger when DOM is ready
 */
Dashboard.logger.autoInit = function() {
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    setTimeout(Dashboard.logger.autoInit, 100);
    return;
  }
  
  Dashboard.logger.init();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Auto-initialization complete');
  }
};

// Start auto-initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Dashboard.logger.autoInit);
} else {
  setTimeout(Dashboard.logger.autoInit, 50);
}

// =============================================================================
// CORE FUNCTIONALITY - MAIN LOGGING OPERATIONS
// =============================================================================

/**
 * Toggle logger visibility with wake lock integration and session storage restore
 */
Dashboard.logger.toggleLogger = function() {
  if (!Dashboard.logger.state.initialized) {
    Dashboard.logger.safeInitLogger();
    if (!Dashboard.logger.state.initialized) {
      console.error('Logger: Cannot toggle logger - initialization failed');
      return;
    }
  }
  
  const wasVisible = Dashboard.logger.state.visible;
  Dashboard.logger.state.visible = !Dashboard.logger.state.visible;
  const logger = Dashboard.logger.state.container;
  
  if (logger) {
    if (Dashboard.logger.state.visible) {
      logger.style.display = 'flex';
      
      // Force correct positioning - centered horizontally
      logger.style.position = 'fixed';
      logger.style.bottom = '90px';
      logger.style.left = '50%';
      logger.style.transform = 'translateX(-50%)';
      logger.style.maxHeight = 'calc(100vh - 180px)';
      logger.style.zIndex = '2000';
      
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Logger: Logger shown with forced positioning - bottom: 90px, centered horizontally');
      }
      
      // Restore log entries from session storage
      Dashboard.logger.restoreLogEntries();
      
      Dashboard.logger.notifyLoggerVisible();
      
    } else {
      logger.style.display = 'none';
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Logger: Logger hidden');
      }
      
      Dashboard.logger.notifyLoggerHidden();
      Dashboard.logger.performLoggerCleanup();
    }
  }
  
  // Keep logging enabled always (session storage persists events)
  if (Dashboard.data && Dashboard.data.enableLogger) {
    Dashboard.data.enableLogger();
  }
  
  Dashboard.logger.saveLoggerState();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Logger', Dashboard.logger.state.visible ? 'shown' : 'hidden', 'with wake lock notification');
  }
};

/**
 * Add a new log entry for member state change with session storage persistence and updated character spacing
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status
 * @param {string} member - Member display text (hostname:port or ip:port)
 * @param {string} pool - Pool name
 * @param {string} siteName - Site name
 */
Dashboard.logger.addLogEntry = function(fromStatus, toStatus, member, pool, siteName) {
  if (!Dashboard.logger.state.initialized) {
    console.warn('Logger: Logger not initialized for log entry');
    return;
  }
  
  // Generate timestamp
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  // Parse member for display text (handles both hostname:port and ip:port)
  const memberParts = member.split(':');
  const address = memberParts[0] || member;
  const port = memberParts[1] || '';
  const fullMember = port ? `${address}:${port}` : address;
  
  // Determine status indicator character and color based on final status
  let statusChar = '○'; // default white circle
  let symbolColor = '#ffffff'; // default white
  if (toStatus.toUpperCase() === 'UP') {
    statusChar = '▲'; // triangle for UP
    symbolColor = '#44ff44'; // green
  } else if (toStatus.toUpperCase() === 'DOWN') {
    statusChar = '▼'; // triangle for DOWN
    symbolColor = '#ff4444'; // red
  } else if (toStatus.toUpperCase() === 'DISABLED' || toStatus.toUpperCase() === 'SESSION_DISABLED') {
    statusChar = '■'; // square for DISABLED
    symbolColor = '#888888'; // dark grey
  }
  
  // Simple status text with consistent 4-character width using non-breaking spaces
  const fromStatusText = (fromStatus.toUpperCase() === 'DISABLED' || fromStatus.toUpperCase() === 'SESSION_DISABLED' ? 'DIS' : fromStatus.toUpperCase());
  const toStatusText = (toStatus.toUpperCase() === 'DISABLED' || toStatus.toUpperCase() === 'SESSION_DISABLED' ? 'DIS' : toStatus.toUpperCase());
  const fromStatusPadded = (fromStatusText + '\u00A0'.repeat(4)).substring(0, 4);
  const toStatusPadded = (toStatusText + '\u00A0'.repeat(4)).substring(0, 4);
  
  // Simple text formatting with fixed character widths using non-breaking spaces for consistent alignment
  const timeStr = timestamp.padEnd(11, ' ');
  const siteStr = (siteName.substring(0, 20) + '\u00A0'.repeat(20)).substring(0, 20);
  const statusChangeStr = (' ' + fromStatusPadded + ' →' + ' ' + toStatusPadded + ' ');
  const memberStr = (fullMember.substring(0, 48) + '\u00A0'.repeat(48)).substring(0, 48);
  
  // Build line with colored symbol and white text
  const textPart = `${timeStr} │ ${siteStr} │ ${statusChangeStr} │ ${memberStr} │ ${pool}`;
  const logEntryHTML = `<span style="color: ${symbolColor};">${statusChar}</span> <span style="color: #ffffff;">${textPart}</span>`;
  
  // Create log entry object for session storage
  const logEntryData = {
    timestamp: now.getTime(),
    html: logEntryHTML
  };
  
  // Save to session storage with FIFO management
  Dashboard.logger.saveLogEntryToStorage(logEntryData);
  
  // Add to DOM if logger is visible
  const content = document.getElementById('dashboard-logger-content');
  if (content && Dashboard.logger.state.visible) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.fontFamily = 'Consolas, "Courier New", monospace';
    entry.style.lineHeight = '1.4';
    entry.style.marginBottom = '1px';
    entry.style.whiteSpace = 'nowrap';
    entry.style.fontWeight = 'bold';
    entry.style.color = '#ffffff';
    entry.innerHTML = logEntryHTML;
    
    content.appendChild(entry);
    
    // Auto-scroll and limit DOM entries to 5000
    content.scrollTop = content.scrollHeight;
    while (content.children.length > Dashboard.logger.storage.maxEntries) {
      content.removeChild(content.firstChild);
    }
  }
  
  // Log DNS hostname usage for debugging
  if (address && !address.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    if ((window.dashboardConfig && window.dashboardConfig.debugEnabled)) {
      console.log('Logger: Logged entry with hostname:', address, 'for pool:', pool);
    }
  }
};

/**
 * Clear all log entries from both DOM and session storage
 */
Dashboard.logger.clearLogs = function() {
  // Clear DOM content
  const content = document.getElementById('dashboard-logger-content');
  if (content) {
    content.innerHTML = '';
    content.style.color = '#ffffff';
  }
  
  // Clear session storage
  Dashboard.logger.clearSessionStorage();
  
  // Reset column widths
  Dashboard.logger.state.columnWidths = {
    timestamp: 12,
    site: 14,
    change: 10,
    member: 23,
    pool: 12
  };
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Logger and session storage cleared');
  }
};

/**
 * Copy logger content to clipboard
 */
Dashboard.logger.copyLogs = function() {
  const content = document.getElementById('dashboard-logger-content');
  if (!content) {
    console.warn('Logger: No logger content to copy');
    return;
  }
  
  // Get all log entries
  const logEntries = content.querySelectorAll('.log-entry');
  if (logEntries.length === 0) {
    console.warn('Logger: No log entries to copy');
    return;
  }
  
  // Extract text content from each entry, removing HTML formatting
  const logLines = Array.from(logEntries).map(entry => {
    // Get the text content and clean it up
    const text = entry.textContent || entry.innerText || '';
    return text.trim();
  });
  
  // Join all lines with newlines
  const logText = logLines.join('\n');
  
  // Try to copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(logText).then(() => {
      // Visual feedback - briefly change copy button color
      const copyBtn = Dashboard.logger.state.container.querySelector('.copy-btn');
      if (copyBtn) {
        const originalBg = copyBtn.style.background;
        const originalBorder = copyBtn.style.borderColor;
        copyBtn.style.background = 'rgba(0,255,0,0.3)';
        copyBtn.style.borderColor = 'rgba(0,255,0,0.5)';
        copyBtn.textContent = 'Copied!';
        
        setTimeout(() => {
          copyBtn.style.background = originalBg;
          copyBtn.style.borderColor = originalBorder;
          copyBtn.textContent = 'Copy';
        }, 1500);
      }
      
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Logger: Copied', logLines.length, 'log entries to clipboard');
      }
    }).catch(err => {
      console.error('Logger: Failed to copy to clipboard:', err);
      // Fallback - create a textarea and select it
      Dashboard.logger.fallbackCopy(logText);
    });
  } else {
    // Fallback for older browsers
    Dashboard.logger.fallbackCopy(logText);
  }
};

/**
 * Fallback copy method for older browsers
 * @param {string} text - Text to copy
 */
Dashboard.logger.fallbackCopy = function(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-999999px';
  textarea.style.top = '-999999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      // Visual feedback
      const copyBtn = Dashboard.logger.state.container.querySelector('.copy-btn');
      if (copyBtn) {
        const originalBg = copyBtn.style.background;
        const originalBorder = copyBtn.style.borderColor;
        copyBtn.style.background = 'rgba(0,255,0,0.3)';
        copyBtn.style.borderColor = 'rgba(0,255,0,0.5)';
        copyBtn.textContent = 'Copied!';
        
        setTimeout(() => {
          copyBtn.style.background = originalBg;
          copyBtn.style.borderColor = originalBorder;
          copyBtn.textContent = 'Copy';
        }, 1500);
      }
      
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Logger: Copied logs to clipboard using fallback method');
      }
    } else {
      console.error('Logger: Fallback copy failed');
    }
  } catch (err) {
    console.error('Logger: Fallback copy error:', err);
  } finally {
    document.body.removeChild(textarea);
  }
};

// =============================================================================
// SESSION STORAGE MANAGEMENT
// =============================================================================

/**
 * Save log entry to session storage with FIFO management
 * @param {Object} logEntryData - Log entry object with timestamp and html
 */
Dashboard.logger.saveLogEntryToStorage = function(logEntryData) {
  try {
    // Get existing entries from session storage
    let storedEntries = Dashboard.logger.getStoredLogEntries();
    
    // Add new entry
    storedEntries.push(logEntryData);
    
    // Apply FIFO limit - remove oldest entries if over limit
    while (storedEntries.length > Dashboard.logger.storage.maxEntries) {
      storedEntries.shift(); // Remove first (oldest) entry
    }
    
    // Save back to session storage
    sessionStorage.setItem(Dashboard.logger.storage.key, JSON.stringify(storedEntries));
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Saved log entry to session storage, total entries:', storedEntries.length);
    }
  } catch (e) {
    console.error('Logger: Error saving log entry to session storage:', e);
  }
};

/**
 * Get stored log entries from session storage
 * @returns {Array} Array of log entry objects
 */
Dashboard.logger.getStoredLogEntries = function() {
  try {
    const stored = sessionStorage.getItem(Dashboard.logger.storage.key);
    if (stored) {
      const entries = JSON.parse(stored);
      if (Array.isArray(entries)) {
        return entries;
      }
    }
  } catch (e) {
    console.error('Logger: Error reading log entries from session storage:', e);
  }
  return [];
};

/**
 * Restore log entries from session storage to DOM
 */
Dashboard.logger.restoreLogEntries = function() {
  const content = document.getElementById('dashboard-logger-content');
  if (!content) {
    return;
  }
  
  // Clear existing DOM content
  content.innerHTML = '';
  
  // Get stored entries
  const storedEntries = Dashboard.logger.getStoredLogEntries();
  
  if (storedEntries.length === 0) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: No stored log entries to restore');
    }
    return;
  }
  
  // Add each stored entry to DOM
  storedEntries.forEach(function(entryData) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.fontFamily = 'Consolas, "Courier New", monospace';
    entry.style.lineHeight = '1.4';
    entry.style.marginBottom = '1px';
    entry.style.whiteSpace = 'nowrap';
    entry.style.fontWeight = 'bold';
    entry.style.color = '#ffffff';
    entry.innerHTML = entryData.html;
    
    content.appendChild(entry);
  });
  
  // Auto-scroll to bottom
  content.scrollTop = content.scrollHeight;
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Restored', storedEntries.length, 'log entries from session storage');
  }
};

/**
 * Clear session storage log entries
 */
Dashboard.logger.clearSessionStorage = function() {
  try {
    sessionStorage.removeItem(Dashboard.logger.storage.key);
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Cleared session storage log entries');
    }
  } catch (e) {
    console.error('Logger: Error clearing session storage:', e);
  }
};

// =============================================================================
// DOM MANAGEMENT AND UI STATE CONTROL
// =============================================================================

/**
 * Initialize logger event handlers
 */
Dashboard.logger.initLoggerEventHandlers = function() {
  const logger = Dashboard.logger.state.container;
  if (!logger) {
    console.warn('Logger: Logger container not found for event handlers');
    return;
  }
  
  logger.addEventListener('click', function(e) {
    const target = e.target;
    const action = target.getAttribute('data-action');
    
    switch (action) {
      case 'font-decrease':
        e.preventDefault();
        Dashboard.logger.changeFontSize(-2);
        break;
      case 'font-reset':
        e.preventDefault();
        Dashboard.logger.resetFontSize();
        break;
      case 'font-increase':
        e.preventDefault();
        Dashboard.logger.changeFontSize(2);
        break;
      case 'copy':
        e.preventDefault();
        Dashboard.logger.copyLogs();
        break;
      case 'expand':
        e.preventDefault();
        Dashboard.logger.toggleExpand();
        break;
      case 'clear':
        e.preventDefault();
        Dashboard.logger.clearLogs();
        break;
      case 'close':
        e.preventDefault();
        Dashboard.logger.toggleLogger();
        break;
    }
  });
  
  // Add hover and click effects for all buttons
  const allButtons = logger.querySelectorAll('.font-btn, .copy-btn, .expand-btn, .clear-btn, .close-btn');
  allButtons.forEach(button => {
    // Hover effects
    button.addEventListener('mouseenter', function() {
      if (this.classList.contains('font-btn') || this.classList.contains('copy-btn') || this.classList.contains('expand-btn')) {
        this.style.background = 'rgba(255,255,255,0.4) !important';
        this.style.transform = 'translateY(-1px)';
      } else if (this.classList.contains('clear-btn')) {
        this.style.background = 'rgba(255,165,0,0.5) !important';
        this.style.transform = 'translateY(-1px)';
      } else if (this.classList.contains('close-btn')) {
        this.style.background = 'rgba(220,53,69,0.5) !important';
        this.style.transform = 'translateY(-1px)';
      }
    });
    
    button.addEventListener('mouseleave', function() {
      if (this.classList.contains('font-btn') || this.classList.contains('copy-btn') || this.classList.contains('expand-btn')) {
        this.style.background = 'rgba(255,255,255,0.2) !important';
        this.style.transform = 'translateY(0)';
      } else if (this.classList.contains('clear-btn')) {
        this.style.background = 'rgba(255,165,0,0.3) !important';
        this.style.transform = 'translateY(0)';
      } else if (this.classList.contains('close-btn')) {
        this.style.background = 'rgba(220,53,69,0.3) !important';
        this.style.transform = 'translateY(0)';
      }
    });
    
    // Click effects for all buttons
    button.addEventListener('mousedown', function() {
      this.style.transform = 'translateY(1px)';
      this.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
    });
    
    button.addEventListener('mouseup', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
    });
  });
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Logger event handlers initialized');
  }
};

/**
 * Initialize logger drag and resize functionality
 */
Dashboard.logger.initLoggerDragResize = function() {
  const logger = Dashboard.logger.state.container;
  if (!logger) return;
  
  // Drag functionality
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  
  const header = logger.querySelector('.logger-header');
  if (header) {
    header.addEventListener('mousedown', function(e) {
      isDragging = true;
      const rect = logger.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      function handleDrag(e) {
        if (!isDragging) return;
        logger.style.position = 'fixed';
        logger.style.left = (e.clientX - dragOffset.x) + 'px';
        logger.style.top = (e.clientY - dragOffset.y) + 'px';
        logger.style.right = 'auto';
        logger.style.bottom = 'auto';
        logger.style.transform = 'none'; // Clear transform to prevent jumping
      }
      
      function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDrag);
      }
      
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    });
  }
  
  Dashboard.logger.initLoggerResize();
};

/**
 * Initialize logger resize handles
 */
Dashboard.logger.initLoggerResize = function() {
  const logger = Dashboard.logger.state.container;
  if (!logger) return;
  
  let isResizing = false;
  let resizeType = '';
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  
  const resizeHandleBottom = document.getElementById('logger-resize-handle-bottom');
  const resizeHandleRight = document.getElementById('logger-resize-handle-right');
  const resizeHandleCorner = document.getElementById('logger-resize-handle-corner');
  
  function handleResize(e) {
    if (!isResizing) return;
    
    const minHeight = window.innerHeight * 0.15;
    const maxHeight = window.innerHeight * 0.8;
    const minWidth = window.innerWidth * 0.5;
    const maxWidth = window.innerWidth * 0.95;
    
    if (resizeType === 'bottom' || resizeType === 'corner') {
      const newHeight = startHeight + (e.clientY - startY);
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        logger.style.height = newHeight + 'px';
      }
    }
    
    if (resizeType === 'right' || resizeType === 'corner') {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        logger.style.width = newWidth + 'px';
      }
    }
  }
  
  function stopResize() {
    isResizing = false;
    resizeType = '';
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }
  
  // Bottom resize
  if (resizeHandleBottom) {
    resizeHandleBottom.addEventListener('mousedown', function(e) {
      isResizing = true;
      resizeType = 'bottom';
      startY = e.clientY;
      startHeight = parseInt(document.defaultView.getComputedStyle(logger).height, 10);
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      e.preventDefault();
    });
  }
  
  // Right resize
  if (resizeHandleRight) {
    resizeHandleRight.addEventListener('mousedown', function(e) {
      isResizing = true;
      resizeType = 'right';
      startX = e.clientX;
      startWidth = parseInt(document.defaultView.getComputedStyle(logger).width, 10);
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      e.preventDefault();
    });
  }
  
  // Corner resize
  if (resizeHandleCorner) {
    resizeHandleCorner.addEventListener('mousedown', function(e) {
      isResizing = true;
      resizeType = 'corner';
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(document.defaultView.getComputedStyle(logger).width, 10);
      startHeight = parseInt(document.defaultView.getComputedStyle(logger).height, 10);
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      e.preventDefault();
    });
  }
};

// =============================================================================
// FEATURE FUNCTIONALITY - WAKE LOCK INTEGRATION AND STATE PERSISTENCE
// =============================================================================

/**
 * Notify core module when logger becomes visible
 */
Dashboard.logger.notifyLoggerVisible = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Notifying core module - logger became visible');
  }
  
  if (Dashboard.core && Dashboard.core.onLoggerVisible) {
    Dashboard.core.onLoggerVisible();
  } else {
    console.warn('Logger: Core module wake lock handler not available');
    setTimeout(() => {
      if (Dashboard.core && Dashboard.core.onLoggerVisible) {
        Dashboard.core.onLoggerVisible();
      }
    }, 100);
  }
};

/**
 * Notify core module when logger becomes hidden
 */
Dashboard.logger.notifyLoggerHidden = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Notifying core module - logger became hidden');
  }
  
  if (Dashboard.core && Dashboard.core.onLoggerHidden) {
    Dashboard.core.onLoggerHidden();
  } else {
    console.warn('Logger: Core module wake lock handler not available');
    setTimeout(() => {
      if (Dashboard.core && Dashboard.core.onLoggerHidden) {
        Dashboard.core.onLoggerHidden();
      }
    }, 100);
  }
};

/**
 * Toggle expanded view
 */
Dashboard.logger.toggleExpand = function() {
  const logger = Dashboard.logger.state.container;
  const expandBtn = logger ? logger.querySelector('.expand-btn') : null;
  
  if (!logger || !expandBtn) return;
  
  if (!Dashboard.logger.state.expanded) {
    // Save current dimensions (only width and height)
    const computedStyle = window.getComputedStyle(logger);
    Dashboard.logger.state.previousDimensions = {
      width: computedStyle.width,
      height: computedStyle.height
    };
    
    // Expand - keep centered positioning
    logger.style.width = 'calc(100vw - 40px)';
    logger.style.height = '50vh';
    logger.style.left = '50%';
    logger.style.transform = 'translateX(-50%)';
    logger.style.bottom = '20px';
    logger.style.right = 'auto';
    
    expandBtn.textContent = 'Restore';
    expandBtn.style.background = 'rgba(255,165,0,0.3)';
    expandBtn.style.borderColor = 'rgba(255,165,0,0.5)';
    Dashboard.logger.state.expanded = true;
  } else {
    // Restore - keep centered positioning
    const prev = Dashboard.logger.state.previousDimensions;
    if (prev) {
      logger.style.width = prev.width;
      logger.style.height = prev.height;
    }
    logger.style.left = '50%';
    logger.style.transform = 'translateX(-50%)';
    logger.style.bottom = '90px';
    logger.style.right = 'auto';
    
    expandBtn.style.background = 'rgba(255,255,255,0.2)';
    expandBtn.style.borderColor = 'rgba(255,255,255,0.3)';
    expandBtn.textContent = 'Expand';
    Dashboard.logger.state.expanded = false;
  }
  
  Dashboard.logger.saveLoggerState();
};

/**
 * Change logger font size
 * @param {number} delta - Change amount (+2 or -2)
 */
Dashboard.logger.changeFontSize = function(delta) {
  Dashboard.logger.state.fontSize += delta;
  if (Dashboard.logger.state.fontSize < 10) Dashboard.logger.state.fontSize = 10;
  if (Dashboard.logger.state.fontSize > 64) Dashboard.logger.state.fontSize = 64;
  
  const content = document.getElementById('dashboard-logger-content');
  if (content) {
    content.style.fontSize = Dashboard.logger.state.fontSize + 'px';
  }
  
  Dashboard.logger.saveLoggerState();
};

/**
 * Reset logger font size to default
 */
Dashboard.logger.resetFontSize = function() {
  Dashboard.logger.state.fontSize = 22;
  
  const content = document.getElementById('dashboard-logger-content');
  if (content) {
    content.style.fontSize = Dashboard.logger.state.fontSize + 'px';
  }
  
  Dashboard.logger.saveLoggerState();
};

/**
 * Save logger state to session storage
 */
Dashboard.logger.saveLoggerState = function() {
  const state = {
    visible: Dashboard.logger.state.visible,
    expanded: Dashboard.logger.state.expanded,
    fontSize: Dashboard.logger.state.fontSize
  };
  
  try {
    const currentSite = Dashboard.state ? Dashboard.state.currentSite : 'default';
    sessionStorage.setItem('dashboardLoggerState_' + currentSite, JSON.stringify(state));
  } catch (e) {
    console.error('Logger: Error saving logger state:', e);
  }
};

/**
 * Load logger state from session storage
 */
Dashboard.logger.loadLoggerState = function() {
  const currentSite = Dashboard.state ? Dashboard.state.currentSite : 'default';
  const saved = sessionStorage.getItem('dashboardLoggerState_' + currentSite);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      Dashboard.logger.state.visible = state.visible || false;
      Dashboard.logger.state.expanded = state.expanded || false;
      Dashboard.logger.state.fontSize = state.fontSize || 22;
    } catch (e) {
      console.error('Logger: Error loading logger state:', e);
    }
  }
};

/**
 * Apply loaded logger state to UI with positioning fix
 */
Dashboard.logger.applyLoggerState = function() {
  const logger = Dashboard.logger.state.container;
  if (!logger) return;
  
  // Apply visibility
  logger.style.display = Dashboard.logger.state.visible ? 'flex' : 'none';
  
  // Force correct positioning - centered horizontally
  logger.style.position = 'fixed';
  logger.style.bottom = '90px';
  logger.style.left = '50%';
  logger.style.transform = 'translateX(-50%)';
  logger.style.maxHeight = 'calc(100vh - 180px)';
  logger.style.zIndex = '2000';
  
  // Apply font size
  const content = document.getElementById('dashboard-logger-content');
  if (content) {
    content.style.fontSize = Dashboard.logger.state.fontSize + 'px';
  }
  
  // Enable/disable data logging - keep enabled always now
  if (Dashboard.logger.state.visible && Dashboard.data && Dashboard.data.enableLogger) {
    Dashboard.data.enableLogger();
  }
  
  // Restore log entries from session storage if logger is visible
  if (Dashboard.logger.state.visible) {
    Dashboard.logger.restoreLogEntries();
  }
  
  // Notify core module about initial state
  if (Dashboard.logger.state.visible) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Notifying core module of restored visible state');
    }
    Dashboard.logger.notifyLoggerVisible();
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Applied state with forced positioning - bottom: 90px, centered horizontally');
  }
};

// =============================================================================
// UTILITY FUNCTIONS - MEMORY CLEANUP AND STATE MANAGEMENT
// =============================================================================

/**
 * Comprehensive logger cleanup when hiding to prevent memory leaks
 */
Dashboard.logger.performLoggerCleanup = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Performing comprehensive logger cleanup');
  }
  
  const logger = Dashboard.logger.state.container;
  if (!logger) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: No logger container to clean up');
    }
    return;
  }
  
  Dashboard.logger.removeLoggerEventListeners(logger);
  
  const content = document.getElementById('dashboard-logger-content');
  if (content) {
    content.innerHTML = '';
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Cleared logger content');
    }
  }
  
  Dashboard.logger.removeLoggerResizeListeners();
  Dashboard.logger.clearLoggerTimers();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Comprehensive logger cleanup complete');
  }
};

/**
 * Cleanup logger DOM references to prevent memory leaks
 */
Dashboard.logger.cleanupLogger = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Cleaning up logger references');
  }
  
  // Notify core module that logger is being cleaned up
  if (Dashboard.logger.state.visible) {
    Dashboard.logger.notifyLoggerHidden();
  }
  
  if (Dashboard.logger.state.container) {
    Dashboard.logger.state.container = null;
  }
  
  Dashboard.logger.state.initialized = false;
  Dashboard.logger.state.visible = false;
  Dashboard.logger.state.expanded = false;
  Dashboard.logger.state.previousDimensions = {};
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Logger cleanup complete');
  }
};

/**
 * Remove all event listeners from logger container
 * @param {HTMLElement} logger - Logger container element
 */
Dashboard.logger.removeLoggerEventListeners = function(logger) {
  if (!logger) return;
  
  // Clone and replace the logger element to remove all event listeners
  const newLogger = logger.cloneNode(true);
  if (logger.parentNode) {
    logger.parentNode.replaceChild(newLogger, logger);
    
    Dashboard.logger.state.container = newLogger;
    
    // Re-attach essential event handlers
    Dashboard.logger.initLoggerEventHandlers();
    Dashboard.logger.initLoggerDragResize();
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Removed all logger event listeners via clone replacement');
    }
  }
};

/**
 * Remove resize event listeners specifically
 */
Dashboard.logger.removeLoggerResizeListeners = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Resize listeners will be cleared via clone replacement');
  }
};

/**
 * Clear any timers related to logger functionality
 */
Dashboard.logger.clearLoggerTimers = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Logger timers cleared (none currently active)');
  }
};

/**
 * Destroy logger completely and remove from DOM
 */
Dashboard.logger.destroyLogger = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Destroying logger completely');
  }
  
  if (Dashboard.logger.state.visible) {
    Dashboard.logger.notifyLoggerHidden();
  }
  
  const logger = Dashboard.logger.state.container;
  if (logger && logger.parentNode) {
    Dashboard.logger.performLoggerCleanup();
    logger.parentNode.removeChild(logger);
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Logger: Logger removed from DOM');
    }
  }
  
  Dashboard.logger.cleanupLogger();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Logger: Logger destruction complete');
  }
};

console.log('Dashboard Logger module loaded successfully');