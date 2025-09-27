// Multi-Site Dashboard JavaScript - CORE MODULE
// Dashboard Version: 1.7
// Dashboard JSON:    1.7
// Date: September 2025
// Author: Eric Haupt
// License: MIT
//
// Copyright (c) 2025 Eric Haupt
// Released under the MIT License. See LICENSE file for details.
// https://github.com/hauptem/F5-Multisite-Dashboard
//
// Description: Core coordination functionality including initialization, themes, 
// timers, view modes, wake lock management, and alias functionality

// =============================================================================
// GLOBAL NAMESPACE AND CONFIGURATION
// =============================================================================
/**
 * Create global namespace for cross-module communication
 */
window.Dashboard = {
    core: {},
    data: {},
    ui: {},
    logger: {},
    client: {},
    
    // Instance-specific state containers
    instances: {},
    
    // Available themes configuration
    config: {
        availableThemes: ['theme1', 'theme2', 'theme3']
    }
};

/**
 * Get instance-specific state container, creating if needed
 * @returns {Object} Instance-specific state container
 */
Dashboard.core.getInstanceState = function() {
  if (!Dashboard.core.instanceID) {
    Dashboard.core.initializeInstanceIsolation();
  }
  
  if (!Dashboard.instances[Dashboard.core.instanceID]) {
    Dashboard.instances[Dashboard.core.instanceID] = {
      currentSite: '',
      refreshInterval: 10,
      countdownTimer: null,
      isLoading: false,
      currentTheme: 'theme1',
      currentViewMode: 'macro',
      currentAliasMode: true, // true = show aliases, false = show pool names
      pendingViewMode: null,
      initializationComplete: false,
      wakeLockSentinel: null,
      wakeLockSupported: false
    };
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Core: Created new instance state container for:', Dashboard.core.instanceID);
    }
  }
  
  return Dashboard.instances[Dashboard.core.instanceID];
};

/**
 * Create getter/setter for Dashboard.state that routes to instance-specific state
 */
Object.defineProperty(Dashboard, 'state', {
  get: function() {
    return Dashboard.core.getInstanceState();
  },
  set: function(value) {
    // Allow setting individual properties but warn about full replacement
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.warn('Core: Direct Dashboard.state assignment - use Dashboard.state.property = value instead');
    }
    const instanceState = Dashboard.core.getInstanceState();
    Object.assign(instanceState, value);
  }
});

/**
 * Enhanced timer state tracking for better user experience
 */
Dashboard.core.timerState = {
    remainingTime: null,
    intervalId: null,
    isPaused: false,
    lastPauseTime: null,
    isCountdownOnly: false,
    currentCountdown: null
};

// =============================================================================
// MODULE INITIALIZATION
// =============================================================================

/**
 * Main initialization function
 */
Dashboard.core.initializeApplication = function() {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: DOM ready - starting initialization');
    }
    
    try {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Phase 1 - Core initialization');
        }
        Dashboard.core.init();
        
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Phase 2 - Data initialization');
        }
        Dashboard.data.init(); 
        
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Phase 3 - UI initialization');
        }
        Dashboard.ui.init();
        
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Phase 4 - Logger module will self-initialize');
        }
        
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Phase 5 - Binding global functions');
        }
        Dashboard.core.safeBindGlobalFunctions();
        
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Phase 6 - Initializing wake lock system');
        }
        Dashboard.core.initializeWakeLock();
        
        // Post-initialization operations (after all modules ready)
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Phase 7 - Post-initialization operations');
        }
        setTimeout(Dashboard.core.handlePostInitialization, 50);
        
    } catch (error) {
        console.error('Core: Initialization error:', error);
        
        setTimeout(function() {
            if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
                console.log('Core: Retrying initialization');
            }
            try {
                if (!Dashboard.state.initializationComplete) {
                    Dashboard.core.safeBindGlobalFunctions();
                    Dashboard.core.initializeWakeLock();
                    setTimeout(Dashboard.core.handlePostInitialization, 100);
                }
            } catch (e) {
                console.error('Core: Retry failed:', e);
            }
        }, 1000);
    }
};

/**
 * Generate unique instance identifier during initialization
 */
Dashboard.core.generateInstanceID = function() {
  // Generate simple unique identifier using timestamp + random
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `inst_${timestamp}_${random}`;
};

/**
 * Initialize instance isolation system
 */
Dashboard.core.initializeInstanceIsolation = function() {
  if (!Dashboard.core.instanceID) {
    Dashboard.core.instanceID = Dashboard.core.generateInstanceID();
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Core: Generated instance ID:', Dashboard.core.instanceID);
    }
  }
};

/**
 * Get instance-specific storage key for sessionStorage operations
 * @param {string} baseKey - Base storage key without instance prefix
 * @returns {string} Instance-specific storage key
 */
Dashboard.core.getStorageKey = function(baseKey) {
  if (!Dashboard.core.instanceID) {
    Dashboard.core.initializeInstanceIsolation();
  }
  return `${Dashboard.core.instanceID}_${baseKey}`;
};

/**
 * Initialize core dashboard functionality
 */
Dashboard.core.init = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Core: Initializing coordination, themes, timers, view modes, and alias functionality');
  }
  
  // Initialize instance isolation first
  Dashboard.core.initializeInstanceIsolation();
  
  // Initialize instance-specific state
  const instanceState = Dashboard.core.getInstanceState();
  
  if (!instanceState.currentSite && window.dashboardConfig) {
    Dashboard.core.loadServerConfig();
  }
  
  // Load alias mode preference for current site
  if (Dashboard.data && Dashboard.data.loadAliasMode) {
    Dashboard.data.loadAliasMode();
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Core: Site:', instanceState.currentSite, 'Theme:', instanceState.currentTheme, 'View Mode:', instanceState.currentViewMode, 'Alias Mode:', instanceState.currentAliasMode, 'Instance ID:', Dashboard.core.instanceID);
  }
  
  Dashboard.core.applyTheme(instanceState.currentTheme);
  Dashboard.core.applyViewMode(instanceState.currentViewMode);
  Dashboard.core.initializeAliasButton();
  Dashboard.core.setupEventDelegation();
  Dashboard.core.setupEventListeners();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Core: Core coordination initialization complete - no data operations during init');
  }
};

/**
 * Handle post-initialization operations after all modules are ready
 * This includes checking for pre-selected sites and starting operations
 */
Dashboard.core.handlePostInitialization = function() {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: Starting post-initialization operations - all modules should be ready');
    }
    
    // Verify all modules are available before proceeding
    const modulesReady = Dashboard.client && Dashboard.client.state && Dashboard.client.state.initialized &&
                        Dashboard.data && Dashboard.ui;
    
    if (!modulesReady) {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Not all modules ready yet - retrying post-initialization in 100ms');
        }
        setTimeout(Dashboard.core.handlePostInitialization, 100);
        return;
    }
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: All modules confirmed ready - proceeding with post-initialization operations');
    }
    
    // Now it's safe to check for pre-selected site and load data
    if (Dashboard.state.currentSite) {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Pre-selected site detected:', Dashboard.state.currentSite, '- loading pool data after initialization');
        }
        
        // Load pool data for pre-selected site
        if (Dashboard.client && Dashboard.client.loadPoolData) {
            Dashboard.client.loadPoolData();
        }
        
        // Start auto-refresh timer
        Dashboard.core.startAutoRefresh();
        
    } else {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: No pre-selected site - starting countdown-only timer');
        }
        
        // Start countdown-only timer when no site selected
        Dashboard.core.startCountdownOnly();
    }
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: Post-initialization operations complete');
    }
};

/**
 * Load configuration from server-injected variables
 */
Dashboard.core.loadServerConfig = function() {
    const instanceState = Dashboard.core.getInstanceState();
    
    if (window.dashboardConfig) {
        instanceState.currentSite = window.dashboardConfig.currentSite || '';
        instanceState.refreshInterval = window.dashboardConfig.refreshInterval || 10;
        instanceState.currentTheme = window.dashboardConfig.currentTheme || 'theme1';
        instanceState.currentViewMode = window.dashboardConfig.currentViewMode || 'macro';
        instanceState.currentAliasMode = true;
    } else {
        console.warn('Core: No server config found, using defaults');
    }
    
    document.body.classList.add('theme-loaded');
    if (Dashboard.core.applyViewMode) {
        Dashboard.core.applyViewMode(instanceState.currentViewMode);
    }
};

/**
 * Initialize wake lock support detection
 */
Dashboard.core.initializeWakeLock = function() {
    const instanceState = Dashboard.core.getInstanceState();
    instanceState.wakeLockSupported = 'wakeLock' in navigator;
    instanceState.wakeLockRestricted = false;
    instanceState.wakeLockFallbackActive = false;
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: Wake lock API supported:', instanceState.wakeLockSupported);
    }
    
    if (instanceState.wakeLockSupported) {
        Dashboard.core.testWakeLockAvailability();
    }
    
    document.addEventListener('visibilitychange', Dashboard.core.handleVisibilityChange);
};

/**
 * Test wake lock availability to detect restrictions early
 */
Dashboard.core.testWakeLockAvailability = async function() {
    try {
        const testSentinel = await navigator.wakeLock.request('screen');
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Wake lock test successful');
        }
        testSentinel.release();
    } catch (err) {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Wake lock test failed - feature may be restricted');
        }
        Dashboard.core.handleWakeLockError(err);
    }
};

/**
 * Safety check function for ensuring functions are bound and post-init completed
 */
Dashboard.core.performSafetyCheck = function() {
    setTimeout(function() {
        if (!Dashboard.state.initializationComplete) {
            if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
                console.log('Core: Safety check - ensuring global functions are bound');
            }
            Dashboard.core.safeBindGlobalFunctions();
        }
        
        // ADDED: Ensure post-initialization operations completed
        if (Dashboard.state.currentSite && !Dashboard.state.countdownTimer) {
            if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
                console.log('Core: Safety check - ensuring post-initialization operations completed');
            }
            Dashboard.core.handlePostInitialization();
        }
    }, 500);
};

// Set up automatic initialization
document.addEventListener('DOMContentLoaded', Dashboard.core.initializeApplication);
window.addEventListener('load', Dashboard.core.performSafetyCheck);
window.addEventListener('beforeunload', Dashboard.core.cleanup);

// Load server config immediately
Dashboard.core.loadServerConfig();

// =============================================================================
// DOM MANAGEMENT AND UI STATE CONTROL
// =============================================================================

/**
 * Safely bind global functions with error handling
 */
Dashboard.core.safeBindGlobalFunctions = function() {
    try {
        // Bind Core module functions (coordination, themes, view modes)
        window.toggleTheme = Dashboard.core.toggleTheme;
        window.toggleViewMode = Dashboard.core.toggleViewMode;
        window.toggleAlias = Dashboard.core.toggleAlias;
        
        // Bind Client module functions (HTTP communication)
        if (Dashboard.client && Dashboard.client.bindGlobalFunctions) {
            Dashboard.client.bindGlobalFunctions();
        }
        
        // Bind Data module functions
        if (Dashboard.data) {
            if (Dashboard.data.toggleReorderMode) {
                window.toggleReorderMode = Dashboard.data.toggleReorderMode;
            }
            if (Dashboard.data.resetAllMemberStates) {
                window.resetAllMemberStates = Dashboard.data.resetAllMemberStates;
            }
            if (Dashboard.data.acknowledgeMemberChange) {
                window.acknowledgeMemberChange = Dashboard.data.acknowledgeMemberChange;
            }
        }
        
        // Bind Logger module functions
        if (Dashboard.logger && Dashboard.logger.toggleLogger) {
            window.toggleLogger = Dashboard.logger.toggleLogger;
        } else if (Dashboard.ui && Dashboard.ui.toggleLogger) {
            window.toggleLogger = Dashboard.ui.toggleLogger;
        }
        
        Dashboard.state.initializationComplete = true;
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Global functions bound successfully');
        }
        
    } catch (error) {
        console.error('Core: Error binding global functions:', error);
    }
};

/**
 * Setup event delegation for the entire application
 */
Dashboard.core.setupEventDelegation = function() {
  const poolsGrid = document.getElementById('pools-grid');
  if (!poolsGrid) {
    console.warn('Core: pools-grid element not found for event delegation');
    return;
  }
  
  // Pool interactions event delegation with hostname support
  poolsGrid.addEventListener('click', function(e) {
    const target = e.target;
    
    if (target.classList.contains('status-badge') && target.classList.contains('clickable')) {
      e.preventDefault();
      e.stopPropagation();
      
      const row = target.closest('tr');
      const poolContainer = target.closest('.pool-container');
      
      if (row && poolContainer) {
        const actualPoolName = poolContainer.getAttribute('data-pool-name');
        
        if (actualPoolName) {
          try {
            const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
            const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
            const pool = currentData.pools ? currentData.pools.find(p => p.name === actualPoolName) : null;
            
            if (pool && pool.members) {
              const sortedMembers = pool.members.sort(function(a, b) {
                const ipComparison = Dashboard.ui.compareIPAddresses(a.ip, b.ip);
                if (ipComparison !== 0) {
                  return ipComparison;
                }
                const portA = parseInt(a.port, 10);
                const portB = parseInt(b.port, 10);
                return portA - portB;
              });
              
              const memberRows = row.parentElement.children;
              const rowIndex = Array.from(memberRows).indexOf(row);
              
              if (rowIndex >= 0 && rowIndex < sortedMembers.length) {
                const actualMember = sortedMembers[rowIndex];
                
                if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
                  console.log('Core: Acknowledging member change for', actualPoolName, actualMember.ip + ':' + actualMember.port);
                }
                
                if (Dashboard.data && Dashboard.data.acknowledgeMemberChange) {
                  Dashboard.data.acknowledgeMemberChange(actualPoolName, actualMember.ip, actualMember.port);
                } else {
                  console.error('Core: Dashboard.data.acknowledgeMemberChange not available');
                }
              }
            }
          } catch (e) {
            console.error('Core: Error finding actual member data:', e);
          }
        }
      }
      
      return;
    }
  });
  
  // Global application event delegation
  document.body.addEventListener('click', function(e) {
    const target = e.target;
    
    // Mode toggle button
    if (target.classList.contains('mode-toggle') || target.textContent.trim() === 'Mode') {
      e.preventDefault();
      e.stopPropagation();
      if (Dashboard.core && Dashboard.core.toggleViewMode) {
        Dashboard.core.toggleViewMode();
      }
      return false;
    }
    
    // Alias toggle button
    if (target.classList.contains('alias-toggle') || target.textContent.trim() === 'Alias') {
      e.preventDefault();
      e.stopPropagation();
      if (Dashboard.core && Dashboard.core.toggleAlias) {
        Dashboard.core.toggleAlias();
      }
      return false;
    }
    
    // Logger toggle button
    if (target.classList.contains('logger-toggle') || target.classList.contains('dashboard-logger-toggle') || target.textContent.trim() === 'Logs') {
      e.preventDefault();
      e.stopPropagation();
      
      const wasLoggerVisible = Dashboard.core.isLoggerCurrentlyVisible();
      
      if (Dashboard.logger && Dashboard.logger.toggleLogger) {
        Dashboard.logger.toggleLogger();
      } else if (Dashboard.ui && Dashboard.ui.toggleLogger) {
        Dashboard.ui.toggleLogger();
      }
      
      setTimeout(() => {
        const isLoggerVisible = Dashboard.core.isLoggerCurrentlyVisible();
        
        if (!wasLoggerVisible && isLoggerVisible) {
          Dashboard.core.onLoggerVisible();
        } else if (wasLoggerVisible && !isLoggerVisible) {
          Dashboard.core.onLoggerHidden();
        }
      }, 50);
      
      return false;
    }
    
    // Resolve DNS button
    if (target.classList.contains('resolve-toggle') || target.textContent.trim() === 'Resolve') {
      e.preventDefault();
      e.stopPropagation();
      if (Dashboard.client && Dashboard.client.resolveDNS) {
        Dashboard.client.resolveDNS();
      }
      return false;
    }
    
    // Flush DNS Cache button
    if (target.classList.contains('flush-toggle') || target.textContent.trim() === 'Flush') {
      e.preventDefault();
      e.stopPropagation();
      if (Dashboard.client && Dashboard.client.flushDNSCache) {
        Dashboard.client.flushDNSCache();
      }
      return false;
    }
    
    // Reset State button
    if (target.id === 'reset-state-button' || target.classList.contains('reset-state-button')) {
      e.preventDefault();
      e.stopPropagation();
      if (Dashboard.data && Dashboard.data.resetAllMemberStates) {
        Dashboard.data.resetAllMemberStates();
      }
      return false;
    }
    
    // Reorder Toggle button
    if (target.id === 'reorder-toggle' || target.classList.contains('reorder-toggle')) {
      e.preventDefault();
      e.stopPropagation();
      if (Dashboard.data && Dashboard.data.toggleReorderMode) {
        Dashboard.data.toggleReorderMode();
      }
      return false;
    }
  }, true);
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Core: Event delegation setup complete');
  }
};

/**
 * Clean up resources before page unload
 */
Dashboard.core.cleanup = function() {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: Cleaning up resources');
    }
    
    try {
        Dashboard.core.clearExistingTimer();
        Dashboard.core.releaseWakeLock();
        
        // Client module handles its own cleanup
        if (Dashboard.client && Dashboard.client.cleanup) {
            Dashboard.client.cleanup();
        }
        
        if (Dashboard.data && Dashboard.data.clearPendingLogs) {
            Dashboard.data.clearPendingLogs();
        }
        
        if (Dashboard.data && Dashboard.data.clearDraggedElement) {
            Dashboard.data.clearDraggedElement();
        }
        
    } catch (error) {
        console.warn('Core: Error during cleanup:', error.message);
    }
};

// =============================================================================
// FEATURE FUNCTIONALITY - WAKE LOCK, THEMES, VIEW MODES
// =============================================================================

/**
 * Request wake lock to prevent tab from sleeping
 */
Dashboard.core.requestWakeLock = async function() {
    const instanceState = Dashboard.core.getInstanceState();
    
    if (!instanceState.wakeLockSupported) {
        Dashboard.core.enableFallbackWakeLock();
        return;
    }
    
    try {
        instanceState.wakeLockSentinel = await navigator.wakeLock.request('screen');
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Core: Wake lock acquired');
        }
        
        instanceState.wakeLockSentinel.addEventListener('release', () => {
            instanceState.wakeLockSentinel = null;
        });
        
    } catch (err) {
        Dashboard.core.handleWakeLockError(err);
    }
};

/**
 * Release wake lock to allow normal tab sleeping
 */
Dashboard.core.releaseWakeLock = function() {
    const instanceState = Dashboard.core.getInstanceState();
    
    try {
        if (instanceState.wakeLockSentinel) {
            instanceState.wakeLockSentinel.release();
            instanceState.wakeLockSentinel = null;
        }
    } catch (releaseErr) {
        instanceState.wakeLockSentinel = null;
    }
    
    try {
        Dashboard.core.disableFallbackWakeLock();
    } catch (fallbackErr) {
        console.debug('Core: Error disabling fallback wake lock:', fallbackErr.message);
    }
};

/**
 * Handle wake lock errors with specific messaging and fallbacks
 */
Dashboard.core.handleWakeLockError = function(err) {
    const instanceState = Dashboard.core.getInstanceState();
    let shouldUseFallback = true;
    
    if (err.name === 'SecurityError') {
        shouldUseFallback = false;
    }
    
    if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
        instanceState.wakeLockRestricted = true;
    }
    
    if (shouldUseFallback) {
        try {
            Dashboard.core.enableFallbackWakeLock();
        } catch (fallbackErr) {
            console.debug('Core: Fallback wake lock failed:', fallbackErr.message);
        }
    }
};

/**
 * Fallback method for browsers without Wake Lock API
 */
Dashboard.core.enableFallbackWakeLock = function() {
    const instanceState = Dashboard.core.getInstanceState();
    
    if (instanceState.wakeLockRestricted || instanceState.wakeLockFallbackActive) {
        return;
    }
    
    try {
        instanceState.wakeLockFallbackInterval = setInterval(() => {
            try {
                document.title = document.title;
                if (Math.random() < 0.1) {
                    fetch('/api/health', { method: 'HEAD', cache: 'no-cache' }).catch(() => {});
                }
            } catch (domErr) {
                // Ignore DOM restrictions
            }
        }, 30000);
        
        instanceState.wakeLockFallbackActive = true;
        
    } catch (fallbackErr) {
        console.warn('Core: Error enabling fallback wake lock:', fallbackErr.message);
    }
};

/**
 * Disable fallback wake lock methods
 */
Dashboard.core.disableFallbackWakeLock = function() {
    const instanceState = Dashboard.core.getInstanceState();
    
    try {
        if (instanceState.wakeLockFallbackInterval) {
            clearInterval(instanceState.wakeLockFallbackInterval);
            instanceState.wakeLockFallbackInterval = null;
        }
        instanceState.wakeLockFallbackActive = false;
    } catch (cleanupErr) {
        instanceState.wakeLockFallbackActive = false;
        instanceState.wakeLockFallbackInterval = null;
    }
};

/**
 * Check if logger is currently visible
 */
Dashboard.core.isLoggerCurrentlyVisible = function() {
    if (Dashboard.logger && Dashboard.logger.state && Dashboard.logger.state.visible) {
        return true;
    }
    
    if (Dashboard.ui && Dashboard.ui.logger && Dashboard.ui.logger.visible) {
        return true;
    }
    
    const loggerElement = document.getElementById('dashboard-logger');
    if (loggerElement) {
        const computedStyle = window.getComputedStyle(loggerElement);
        return computedStyle.display !== 'none';
    }
    
    return false;
};

/**
 * Enable wake lock when logger becomes visible
 */
Dashboard.core.onLoggerVisible = function() {
    const instanceState = Dashboard.core.getInstanceState();
    
    if (!instanceState.wakeLockRestricted) {
        try {
            Dashboard.core.requestWakeLock();
        } catch (err) {
            console.warn('Core: Failed to request wake lock:', err.message);
        }
    }
    
    if (document.visibilityState === 'hidden') {
        if (Dashboard.state.currentSite) {
            Dashboard.core.startAutoRefresh();
        } else {
            Dashboard.core.startCountdownOnly();
        }
    }
};

/**
 * Disable wake lock when logger becomes hidden
 */
Dashboard.core.onLoggerHidden = function() {
    try {
        Dashboard.core.releaseWakeLock();
    } catch (err) {
        console.warn('Core: Error releasing wake lock:', err.message);
    }
    
    if (document.visibilityState === 'hidden') {
        try {
            Dashboard.core.pauseTimer();
        } catch (err) {
            console.warn('Core: Error pausing timer:', err.message);
        }
    }
};

/**
 * Handle visibility changes with wake lock and timer management
 */
Dashboard.core.handleVisibilityChange = function() {
    if (document.visibilityState === 'visible') {
        const isLoggerVisible = Dashboard.core.isLoggerCurrentlyVisible();
        if (isLoggerVisible) {
            Dashboard.core.requestWakeLock();
        }
        
        if (Dashboard.core.timerState.isPaused) {
            Dashboard.core.resumeTimer();
        } else if (!Dashboard.state.countdownTimer) {
            if (Dashboard.state.currentSite) {
                Dashboard.core.startAutoRefresh();
            } else {
                Dashboard.core.startCountdownOnly();
            }
        }
        
    } else {
        const isLoggerVisible = Dashboard.core.isLoggerCurrentlyVisible();
        
        if (isLoggerVisible) {
            Dashboard.core.requestWakeLock();
        } else {
            if (Dashboard.state.countdownTimer && !Dashboard.core.timerState.isPaused) {
                Dashboard.core.pauseTimer();
            }
            Dashboard.core.releaseWakeLock();
        }
    }
};

/**
 * Apply theme using consolidated CSS body classes
 * @param {string} theme - Theme to apply
 */
Dashboard.core.applyTheme = function(theme) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: Applying theme:', theme);
    }
    
    if (!Dashboard.config.availableThemes.includes(theme)) {
        console.warn('Core: Invalid theme:', theme, 'defaulting to theme1');
        theme = 'theme1';
    }
    
    // Remove all existing theme classes from body
    Dashboard.config.availableThemes.forEach(function(themeName) {
        document.body.classList.remove(themeName);
    });
    
    // Apply the selected theme class to body
    document.body.classList.add(theme);
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: Theme applied successfully:', theme);
    }
    
    // Update body data attribute for CSS targeting (keep for compatibility)
    document.body.setAttribute('data-theme', theme);
    Dashboard.state.currentTheme = theme;
};

/**
 * Toggle to next theme in sequence with AJAX update
 */
Dashboard.core.toggleTheme = function() {
    const currentIndex = Dashboard.config.availableThemes.indexOf(Dashboard.state.currentTheme);
    const nextIndex = (currentIndex + 1) % Dashboard.config.availableThemes.length;
    const nextTheme = Dashboard.config.availableThemes[nextIndex];
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Core: Toggling theme from', Dashboard.state.currentTheme, 'to', nextTheme);
    }
    
    // Apply theme immediately for instant visual feedback
    Dashboard.core.applyTheme(nextTheme);
    
    // Send AJAX request to persist theme preference
    fetch('/?theme=' + encodeURIComponent(nextTheme), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache'
        },
        body: 'theme=' + encodeURIComponent(nextTheme)
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('HTTP ' + response.status);
    })
    .then(data => {
        if (data.success) {
            if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
                console.log('Core: Theme preference saved successfully');
            }
        } else {
            console.warn('Core: Failed to save theme preference:', data.error || 'Unknown error');
        }
    })
    .catch(error => {
        console.error('Core: Error saving theme preference:', error);
        // Theme is already applied locally, so we continue despite server error
    });
};

/**
 * Apply view mode by adding/removing CSS classes
 */
Dashboard.core.applyViewMode = function(viewMode) {
    if (viewMode !== 'macro' && viewMode !== 'micro') {
        viewMode = 'macro';
    }
    
    document.body.classList.remove('macro-view', 'micro-view');
    document.body.classList.add(viewMode + '-view');
    Dashboard.state.currentViewMode = viewMode;
};

/**
 * Apply pending view mode after data render 
 */
Dashboard.core.applyPendingViewMode = function() {
    if (Dashboard.state.pendingViewMode) {
        Dashboard.core.applyViewMode(Dashboard.state.pendingViewMode);
        Dashboard.state.pendingViewMode = null;
    }
};

/**
 * Toggle view mode between macro and micro with AJAX 
 */
Dashboard.core.toggleViewMode = function() {
  const currentMode = Dashboard.state.currentViewMode;
  const nextMode = currentMode === 'macro' ? 'micro' : 'macro';
  
  Dashboard.core.applyViewMode(nextMode);
  
  if (Dashboard.state.currentSite) {
    try {
      const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
      const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
      if (currentData.pools && Dashboard.ui && Dashboard.ui.renderPoolData) {
        Dashboard.ui.renderPoolData(currentData);
      }
    } catch (e) {
      console.error('Core: Error parsing currentPoolData for view mode re-render:', e);
    }
  }
  
  // Use Client module for AJAX request
  if (Dashboard.client && Dashboard.client.sendSettingsRequest) {
    Dashboard.client.sendSettingsRequest('/?viewmode=' + encodeURIComponent(nextMode), 'viewmode', nextMode)
    .catch(error => {
      console.warn('Core: View mode preference save failed:', error.message);
    });
  }
};

/**
 * Initialize alias button visual state based on current mode
 */
Dashboard.core.initializeAliasButton = function() {
    const aliasButton = document.querySelector('.alias-toggle');
    if (aliasButton) {
        if (Dashboard.state.currentAliasMode) {
            aliasButton.textContent = 'Alias';
            aliasButton.classList.remove('alias-active');
        } else {
            aliasButton.textContent = 'Actual';
            aliasButton.classList.add('alias-active');
        }
    }
};

/**
 * Toggle alias display mode with UI update
 */
Dashboard.core.toggleAlias = function() {
  if (!Dashboard.state.currentSite) {
    return;
  }
  
  const poolsGrid = document.getElementById('pools-grid');
  const errorMessage = document.getElementById('error-message');
  const noSiteMessage = document.getElementById('no-site-message');
  const loadingMessage = document.getElementById('loading-message');
  
  const isShowingPoolData = poolsGrid && 
                            window.getComputedStyle(poolsGrid).display !== 'none' &&
                            poolsGrid.children.length > 0;
  
  const isShowingError = errorMessage && window.getComputedStyle(errorMessage).display !== 'none';
  const isShowingNoSite = noSiteMessage && window.getComputedStyle(noSiteMessage).display !== 'none';
  const isShowingLoading = loadingMessage && window.getComputedStyle(loadingMessage).display !== 'none';
  
  if (!isShowingPoolData || isShowingError || isShowingNoSite || isShowingLoading) {
    return;
  }
  
  const nextMode = !Dashboard.state.currentAliasMode;
  Dashboard.state.currentAliasMode = nextMode;
  
  if (Dashboard.data && Dashboard.data.saveAliasMode) {
    Dashboard.data.saveAliasMode();
  }
  
  const aliasButton = document.querySelector('.alias-toggle');
  if (aliasButton) {
    if (nextMode) {
      aliasButton.textContent = 'Alias';
      aliasButton.classList.remove('alias-active');
    } else {
      aliasButton.textContent = 'Actual';
      aliasButton.classList.add('alias-active');
    }
  }
  
  try {
    const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
    const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    if (currentData.pools && currentData.hostname && Dashboard.ui && Dashboard.ui.renderPoolData) {
      Dashboard.ui.renderPoolData(currentData);
    }
  } catch (e) {
    console.error('Core: Error parsing currentPoolData for alias mode re-render:', e);
  }
};

// =============================================================================
// UTILITY FUNCTIONS - TIMERS AND PREFERENCES
// =============================================================================

/**
 * Start auto-refresh timer
 */
Dashboard.core.startAutoRefresh = function() {
    Dashboard.core.clearExistingTimer();
    Dashboard.core.timerState.remainingTime = Dashboard.state.refreshInterval;
    Dashboard.core.timerState.isPaused = false;
    Dashboard.core.timerState.isCountdownOnly = false;
    
    Dashboard.core.updateCountdownDisplay();
    
    Dashboard.state.countdownTimer = setInterval(function() {
        if (Dashboard.core.timerState.isPaused) {
            return;
        }
        
        Dashboard.core.timerState.remainingTime--;
        Dashboard.core.updateCountdownDisplay();
        
        if (Dashboard.core.timerState.remainingTime <= 0) {
            if (Dashboard.client && Dashboard.client.loadPoolData) {
                Dashboard.client.loadPoolData();
            }
            Dashboard.core.timerState.remainingTime = Dashboard.state.refreshInterval;
        }
    }, 1000);
};

/**
 * Start countdown-only timer (when no site is selected)
 */
Dashboard.core.startCountdownOnly = function() {
    Dashboard.core.clearExistingTimer();
    Dashboard.core.timerState.remainingTime = Dashboard.state.refreshInterval;
    Dashboard.core.timerState.isPaused = false;
    Dashboard.core.timerState.isCountdownOnly = true;
    
    Dashboard.core.updateCountdownDisplay();
    
    Dashboard.state.countdownTimer = setInterval(function() {
        if (Dashboard.core.timerState.isPaused) {
            return;
        }
        
        Dashboard.core.timerState.remainingTime--;
        Dashboard.core.updateCountdownDisplay();
        
        if (Dashboard.core.timerState.remainingTime <= 0) {
            if (Dashboard.state.currentSite) {
                Dashboard.core.startAutoRefresh();
                return;
            }
            Dashboard.core.timerState.remainingTime = Dashboard.state.refreshInterval;
        }
    }, 1000);
};

/**
 * Pause the timer - saves remaining time
 */
Dashboard.core.pauseTimer = function() {
    if (!Dashboard.core.timerState.isPaused && Dashboard.state.countdownTimer) {
        Dashboard.core.timerState.isPaused = true;
        Dashboard.core.timerState.lastPauseTime = Date.now();
    }
};

/**
 * Resume the timer - continues from remaining time
 */
Dashboard.core.resumeTimer = function() {
    if (Dashboard.core.timerState.isPaused) {
        Dashboard.core.timerState.isPaused = false;
        
        if (!Dashboard.state.countdownTimer) {
            if (Dashboard.core.timerState.isCountdownOnly) {
                Dashboard.core.startCountdownOnly();
            } else {
                Dashboard.core.startAutoRefresh();
            }
        }
        
        Dashboard.core.updateCountdownDisplay();
    }
};

/**
 * Clear existing timer
 */
Dashboard.core.clearExistingTimer = function() {
    if (Dashboard.state.countdownTimer) {
        clearInterval(Dashboard.state.countdownTimer);
        Dashboard.state.countdownTimer = null;
    }
    Dashboard.core.timerState.isPaused = false;
};

/**
 * Update countdown display
 */
Dashboard.core.updateCountdownDisplay = function() {
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
        countdownElement.textContent = Dashboard.core.timerState.remainingTime;
    }
};

/**
 * Save view mode preference for a specific site
 */
Dashboard.core.saveViewModeForSite = function(siteName, viewMode) {
  if (!siteName) return;
  
  const storageKey = Dashboard.core.getStorageKey('viewMode_' + siteName);
  try {
    sessionStorage.setItem(storageKey, viewMode);
  } catch (e) {
    console.error('Core: Error saving view mode for site:', e);
  }
};

/**
 * Load view mode preference for a specific site
 */
Dashboard.core.loadViewModeForSite = function(siteName) {
  if (!siteName) return 'micro';
  
  const storageKey = Dashboard.core.getStorageKey('viewMode_' + siteName);
  try {
    const savedMode = sessionStorage.getItem(storageKey);
    const validModes = ['macro', 'micro'];
    
    if (savedMode && validModes.includes(savedMode)) {
      return savedMode;
    }
  } catch (e) {
    console.error('Core: Error loading view mode for site:', e);
  }
  
  return 'micro';
};

// =============================================================================
// EVENT HANDLING AND USER INTERACTIONS
// =============================================================================

/**
 * Setup core event listeners
 */
Dashboard.core.setupEventListeners = function() {
    // Event listeners managed by wake lock system
};

console.log('Dashboard Core module loaded successfully');
