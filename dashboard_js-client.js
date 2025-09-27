// Multi-Site Dashboard JavaScript - CLIENT MODULE
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
// Description: HTTP communication layer for external API calls, settings persistence,
// DNS operations, and request lifecycle management

// =============================================================================
// MODULE INITIALIZATION
// =============================================================================

/**
 * Initialize client namespace if not already done
 */
if (!window.Dashboard) {
  window.Dashboard = {};
}
if (!window.Dashboard.client) {
  window.Dashboard.client = {};
}

/**
 * Initialize client module with request infrastructure
 */
Dashboard.client.init = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Initializing HTTP communication module');
  }
  
  // Initialize client state
  Dashboard.client.state = {
    currentLoadController: null,
    initialized: false
  };
  
  // Ensure Dashboard.state.isLoading is properly initialized
  if (Dashboard.state && Dashboard.state.isLoading === undefined) {
    Dashboard.state.isLoading = false;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Initialized Dashboard.state.isLoading to false');
    }
  }
  
  // Initialize client configuration
  Dashboard.client.config = {
    defaultHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    endpoints: {
      poolData: '/api/proxy/pools',
      settings: '/'
    }
  };
  
  Dashboard.client.state.initialized = true;
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: HTTP communication module initialized');
  }
};

// =============================================================================
// REQUEST INFRASTRUCTURE
// =============================================================================

/**
 * Create base request configuration with standard headers
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Complete headers object
 */
Dashboard.client.buildRequestHeaders = function(additionalHeaders = {}) {
  return Object.assign({}, Dashboard.client.config.defaultHeaders, additionalHeaders);
};

/**
 * Cancel any pending requests from previous operations
 */
Dashboard.client.cancelPendingRequests = function() {
  if (Dashboard.client.state.currentLoadController) {
    Dashboard.client.state.currentLoadController.abort();
    Dashboard.client.state.currentLoadController = null;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Cancelled pending request');
    }
  }
};

/**
 * Create new AbortController for request management
 * @returns {AbortController} New controller for request cancellation
 */
Dashboard.client.createRequestController = function() {
  Dashboard.client.cancelPendingRequests();
  Dashboard.client.state.currentLoadController = new AbortController();
  return Dashboard.client.state.currentLoadController;
};

// =============================================================================
// PRIMARY COMMUNICATION
// =============================================================================

/**
 * Load pool data with proper state management and dependency checks
 * @param {boolean} forceDNSResolution - Force DNS resolution regardless of cache
 */
Dashboard.client.loadPoolData = function(forceDNSResolution = false) {
  // Ensure Dashboard.state exists and isLoading is properly initialized
  if (!Dashboard.state) {
    console.error('Client: Dashboard.state not available - cannot load pool data');
    return;
  }
  
  if (Dashboard.state.isLoading === undefined) {
    Dashboard.state.isLoading = false;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Initialized Dashboard.state.isLoading to false during loadPoolData');
    }
  }
  
  if (Dashboard.state.isLoading) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Load already in progress, skipping');
    }
    return;
  }
  
  if (!Dashboard.state.currentSite) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: No site selected');
    }
    if (Dashboard.ui && Dashboard.ui.hideErrorStates) {
      Dashboard.ui.hideErrorStates();
    }
    return;
  }
  
  Dashboard.state.isLoading = true;
  
  if (Dashboard.ui && Dashboard.ui.hideErrorStates) {
    Dashboard.ui.hideErrorStates();
  }
  
  // Additional error state clearing for site changes
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) {
    errorMessage.style.display = 'none';
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Loading pool data from site:', Dashboard.state.currentSite, 'with pool filtering optimization and DNS optimization, forceDNS:', forceDNSResolution);
  }
  
  // =============================================================================
  // API REQUEST WITH POOL AND DNS HEADERS
  // =============================================================================
  const fetchHeaders = {};
  
  // =============================================================================
  // POOL POLLING OPTIMIZATION: Build header list for visible pools
  // =============================================================================
  if (Dashboard.ui && Dashboard.ui.getInstanceState) {
    const uiInstanceState = Dashboard.ui.getInstanceState();
    if (uiInstanceState.searchFilterActive && uiInstanceState.searchFilter) {
      if (Dashboard.data && Dashboard.data.buildPoolHeaders) {
        const poolHeaders = Dashboard.data.buildPoolHeaders();
        Object.assign(fetchHeaders, poolHeaders);
        
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          const headerCount = Object.keys(poolHeaders).filter(h => h.startsWith('X-Need-Pools-')).length;
          if (headerCount > 0) {
            console.log('Client: Including', headerCount, 'pool filtering headers in request');
          }
        }
      }
    }
  }
  
  // =============================================================================
  // DNS REQUEST OPTIMIZATION: Build header list for unresolved members
  // =============================================================================
  let needDNSHeaders = {};
  
  if (forceDNSResolution) {
    // Get the current pool data to identify IPs for forced resolution
    const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
    const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    
    if (currentData.pools && Dashboard.data && Dashboard.data.getAllIPsForDNSResolution) {
      // MODIFIED: Check if search filtering is active to determine scoping
      const uiInstanceState = Dashboard.ui && Dashboard.ui.getInstanceState ? Dashboard.ui.getInstanceState() : null;
      const shouldRespectVisibility = uiInstanceState && uiInstanceState.searchFilterActive && uiInstanceState.searchFilter;
      
      // MODIFIED: Pass visibility flag to getAllIPsForDNSResolution
      const allIPs = Dashboard.data.getAllIPsForDNSResolution(currentData, shouldRespectVisibility);
      
      if (allIPs.length > 0 && Dashboard.data.buildNeedDNSHeaders) {
        needDNSHeaders = Dashboard.data.buildNeedDNSHeaders(allIPs);
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          if (shouldRespectVisibility) {
            console.log('Client: Built scoped DNS headers for', allIPs.length, 'IPs from visible pools only');
          } else {
            console.log('Client: Built DNS headers for', allIPs.length, 'IPs from all pools');
          }
        }
      } else {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Client: No IPs found for forced DNS resolution');
        }
      }
    } else {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: No current data or Data module unavailable for forced DNS');
      }
    }
  } else {
    // Normal operation - no DNS headers sent (user must click Resolve)
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Normal load - no DNS headers sent (user-initiated DNS only)');
    }
  }
  
  // Add DNS optimization headers if available
  Object.keys(needDNSHeaders).forEach(headerName => {
    fetchHeaders[headerName] = needDNSHeaders[headerName];
  });
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const dnsHeaderCount = Object.keys(needDNSHeaders).filter(h => h.startsWith('X-Need-DNS-IPs-')).length;
    const poolHeaderCount = Object.keys(fetchHeaders).filter(h => h.startsWith('X-Need-Pools-')).length;
    if (dnsHeaderCount > 0 || poolHeaderCount > 0) {
      console.log('Client: Request includes', dnsHeaderCount, 'DNS headers and', poolHeaderCount, 'pool filtering headers');
    } else {
      console.log('Client: Request includes no optimization headers - full backend processing');
    }
  }
  
  // Cancel any pending requests from previous site
  const controller = Dashboard.client.createRequestController();
  
  // Use consolidated pool data request pattern with performance measurement
  Dashboard.client.measureRequestPerformance('Pool Data Load', () => {
    return Dashboard.client.sendPoolDataRequest(fetchHeaders, controller.signal);
  })
  .then(data => {
    // If validation returned null, stop all processing immediately
    if (data === null) {
      Dashboard.state.isLoading = false;
      return;
    }
    
    const shouldDebug = (window.dashboardConfig && window.dashboardConfig.debugEnabled) || (data.debug_enabled === "enabled");
    
    // Update global debug flag if backend debug is enabled
    if (data.debug_enabled === "enabled" && !window.dashboardConfig.debugEnabled) {
      console.log('Backend debug detected - enabling frontend debug logging globally');
      window.dashboardConfig.debugEnabled = true;
    }
    
    if (shouldDebug) {
      console.log('Client: Pool data loaded successfully with pool filtering optimization and DNS optimization');
    }
    
    // =============================================================================
    // DNS: Merge server response with client hostname cache (with safety checks)
    // =============================================================================
    let processedData = data;
    try {
      processedData = Dashboard.client.mergeWithHostnameCache(data);
      if (shouldDebug) {
        console.log('Client: Hostname cache merge completed');
        
        // Log DNS optimization effectiveness (with safety checks)
        if (Dashboard.data && Dashboard.data.getHostnameCacheStats) {
          const cacheStats = Dashboard.data.getHostnameCacheStats();
          console.log('Client: DNS cache stats - Size:', cacheStats.cacheSize, 'Max:', cacheStats.maxEntries);
        }
      }
    } catch (mergeError) {
      console.warn('Client: Error merging hostname cache:', mergeError.message);
      processedData = data; // Fall back to original data
    }
    
    // Log DNS enhancement status with optimization details
    if (processedData.pools && processedData.pools.length > 0) {
      let hostnameCount = 0;
      let memberCount = 0;
      let nullHostnameCount = 0;
      
      processedData.pools.forEach(pool => {
        if (pool.members) {
          pool.members.forEach(member => {
            memberCount++;
            if (member.hostname !== null && member.hostname !== undefined) {
              hostnameCount++;
            } else {
              nullHostnameCount++;
            }
          });
        }
      });
      
      if (shouldDebug) {
        console.log('Client: DNS status -', hostnameCount, 'members with hostnames,', nullHostnameCount, 'without, out of', memberCount, 'total');
        if (forceDNSResolution) {
          console.log('Client: User-initiated DNS resolution completed');
        } else {
          console.log('Client: Normal load - No DNS resolution requested');
        }
        
        // Log pool filtering optimization effectiveness
        if (Dashboard.ui && Dashboard.ui.searchFilterActive) {
          console.log('Client: Pool filtering optimization active - backend processed', processedData.pools.length, 'pools (filtered)');
        } else {
          console.log('Client: No pool filtering - backend processed', processedData.pools.length, 'pools (all)');
        }
      }
    }
    
    // =============================================================================
    // DATA MERGE LOGIC: Handle filtered vs full responses
    // =============================================================================
    // Check if this was a filtered request by seeing if pool headers were sent
    const wasFilteredRequest = Object.keys(fetchHeaders).some(h => h.startsWith('X-Need-Pools-'));
    
    if (wasFilteredRequest) {
      // Filtered response - merge with existing data to preserve non-requested pools
      try {
        const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
        const existingData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
        
        if (existingData.pools && Array.isArray(existingData.pools)) {
          // Create a map of existing pools by name for quick lookup
          const existingPoolsMap = {};
          existingData.pools.forEach(pool => {
            existingPoolsMap[pool.name] = pool;
          });
          
          // Update existing pools with new data from filtered response
          processedData.pools.forEach(updatedPool => {
            existingPoolsMap[updatedPool.name] = updatedPool;
          });
          
          // Rebuild pools array from the updated map
          const mergedPools = Object.values(existingPoolsMap);
          
          // Create merged dataset with updated metadata but preserved pool data
          const mergedData = {
            hostname: processedData.hostname,
            timestamp: processedData.timestamp,
            debug_enabled: processedData.debug_enabled,
            instanceId: processedData.instanceId,
            pools: mergedPools
          };
          
          sessionStorage.setItem(cacheKey, JSON.stringify(mergedData));
          
          if (shouldDebug) {
            console.log('Client: Merged filtered response -', processedData.pools.length, 'updated pools into', mergedPools.length, 'total pools');
          }
          
        } else {
          // No existing data - treat as full response
          sessionStorage.setItem(cacheKey, JSON.stringify(processedData));
          if (shouldDebug) {
            console.log('Client: No existing data for merge - storing filtered response as complete dataset');
          }
        }
        
      } catch (mergeError) {
        console.error('Client: Error merging filtered response:', mergeError);
        // Fallback to storing the filtered response
        const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
        sessionStorage.setItem(cacheKey, JSON.stringify(processedData));
      }
      
    } else {
      // Full response - replace sessionStorage completely
      const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
      sessionStorage.setItem(cacheKey, JSON.stringify(processedData));
      if (shouldDebug) {
        console.log('Client: Stored complete dataset -', processedData.pools.length, 'pools');
      }
    }
    
    // Check if Data module is available before calling updateMemberStates
    if (Dashboard.data && Dashboard.data.updateMemberStates) {
      Dashboard.data.updateMemberStates(processedData);
    } else {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Data module not available - skipping member state updates');
      }
    }
    
    if (Dashboard.ui && Dashboard.ui.renderPoolData) {
      if (wasFilteredRequest) {
        // For filtered requests, render with complete merged data from sessionStorage
        const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
        const completeData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
        Dashboard.ui.renderPoolData(completeData);
      } else {
        // For full requests, render with response data
        Dashboard.ui.renderPoolData(processedData);
      }
    }
    
    // Apply pending view mode after data render
    if (Dashboard.core && Dashboard.core.applyPendingViewMode) {
      Dashboard.core.applyPendingViewMode();
    }
    
    // Always reset isLoading state on successful completion
    Dashboard.state.isLoading = false;
  })
  .catch(error => {
    // Check if error was due to request cancellation
    if (error.name === 'AbortError') {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Request cancelled due to site change');
      }
      // Reset isLoading state even for cancelled requests
      Dashboard.state.isLoading = false;
      return; // Don't process cancelled requests
    }
    
    console.error('Client: Pool data load failed:', error.message);
    
    // Always reset isLoading state on error
    Dashboard.state.isLoading = false;
    
    if (Dashboard.ui && Dashboard.ui.showError) {
      const errorInfo = Dashboard.client.processErrorForDisplay(error);
      Dashboard.ui.showError(errorInfo.fullMessage);
    }
  });
};

// =============================================================================
// GLOBAL FUNCTION BINDINGS
// =============================================================================

/**
 * Update global function bindings to point to Client module
 * This function should be called from Dashboard.core.safeBindGlobalFunctions()
 */
Dashboard.client.bindGlobalFunctions = function() {
  try {
    // Bind HTTP communication functions from Client module
    window.changeSite = Dashboard.client.changeSite;
    window.changeRefreshInterval = Dashboard.client.changeRefreshInterval;
    window.loadPoolData = Dashboard.client.loadPoolData;
    window.resolveDNS = Dashboard.client.resolveDNS;
    window.flushDNSCache = Dashboard.client.flushDNSCache;
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Global HTTP communication functions bound successfully');
    }
    
  } catch (error) {
    console.error('Client: Error binding global HTTP communication functions:', error);
  }
};

/**
 * Change site selection
 * @param {string} site - Site to select
 */
Dashboard.client.changeSite = function(site) {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Changing site to:', site,);
  }
  
  const newSite = site || '';
  const previousSite = Dashboard.state.currentSite;
  
  // Save current site's view mode before switching
  if (previousSite && Dashboard.core && Dashboard.core.saveViewModeForSite) {
    Dashboard.core.saveViewModeForSite(previousSite, Dashboard.state.currentViewMode);
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Saved view mode', Dashboard.state.currentViewMode, 'for previous site:', previousSite);
    }
  }
  
  // Save current site's alias mode before switching
  if (previousSite && Dashboard.data && Dashboard.data.saveAliasMode) {
    Dashboard.data.saveAliasMode();
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Saved alias mode', Dashboard.state.currentAliasMode, 'for previous site:', previousSite);
    }
  }
  
  // Cancel any pending requests from previous site
  Dashboard.client.cancelPendingRequests();
  
  // Save current site's custom order before switching
  if (previousSite && Dashboard.data && Dashboard.data.saveCustomOrder) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Saving custom order for previous site:', previousSite);
    }
    Dashboard.data.saveCustomOrder();
  }
  
  // Update local state immediately 
  Dashboard.state.currentSite = newSite;
  
  // Store pending view mode for new site instead of applying immediately
  if (newSite && Dashboard.core && Dashboard.core.loadViewModeForSite) {
    const siteViewMode = Dashboard.core.loadViewModeForSite(newSite);
    Dashboard.state.pendingViewMode = siteViewMode;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Set pending view mode', siteViewMode, 'for new site:', newSite, '- will apply after data render');
    }
  } else if (!newSite) {
    // No site selected - apply default view mode immediately
    Dashboard.state.currentViewMode = 'macro';
    if (Dashboard.core && Dashboard.core.applyViewMode) {
      Dashboard.core.applyViewMode('macro');
    }
    Dashboard.state.pendingViewMode = null;
  }
  
  // Load alias mode for new site
  if (newSite && Dashboard.data && Dashboard.data.loadAliasMode) {
    Dashboard.data.loadAliasMode();
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Loaded alias mode', Dashboard.state.currentAliasMode, 'for new site:', newSite);
    }
  } else {
    // No site selected - use default alias mode
    Dashboard.state.currentAliasMode = true;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: No site selected - using default alias mode:', Dashboard.state.currentAliasMode);
    }
  }
  
  // Update alias button visual state for new site
  if (Dashboard.core && Dashboard.core.initializeAliasButton) {
    Dashboard.core.initializeAliasButton();
  }
  
  // Load custom order for new site
  if (newSite && Dashboard.data && Dashboard.data.loadCustomOrder) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Loading custom order for new site:', newSite);
    }
    Dashboard.data.loadCustomOrder();
  }
  
  // Clear current search filter state and load for new site
  if (Dashboard.ui) {
    // Get current UI instance state to clear properly
    const currentUIState = Dashboard.ui.getInstanceState();
    
    // Clear current search filter variables
    currentUIState.searchFilter = '';
    currentUIState.searchFilterActive = false;
    
    // Load search filter for new site
    if (Dashboard.ui.loadSearchFilter) {
      Dashboard.ui.loadSearchFilter();
    }
    
    // Get the updated search filter state after loading
    const updatedUIState = Dashboard.ui.getInstanceState();
    
    // Update input field with loaded filter for new site
    const searchInput = document.getElementById('poolSearchInput');
    if (searchInput) {
      searchInput.value = updatedUIState.searchFilter || '';
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Updated search filter for new site:', updatedUIState.searchFilter || '(empty)');
      }
    }
  }
  
  // Clear hostname cache for new site
  if (Dashboard.data && Dashboard.data.hostnameCache) {
    Dashboard.data.hostnameCache.cache.clear();
    if (Dashboard.data.loadHostnameCache) {
      Dashboard.data.loadHostnameCache();
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Cleared and reloaded hostname cache for site:', newSite);
      }
    }
  }
  
  // Update site selector dropdown to reflect change
  const siteSelect = document.getElementById('siteSelect');
  if (siteSelect) {
    siteSelect.value = newSite;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Updated site selector dropdown to:', newSite || '(empty)');
    }
  }
  
  // Handle site change logic
  if (newSite) {
    // Site selected - load data and start auto-refresh
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Site selected - clearing all states and loading pool data for:', newSite);
    }
    
    // Clear error and no-site states, show loading
    const noSiteMessage = document.getElementById('no-site-message');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    
    // Clear error states only - let UI module manage pools grid
    if (noSiteMessage) {
      noSiteMessage.style.display = 'none';
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Cleared no-site message');
      }
    }
    if (errorMessage) {
      errorMessage.style.display = 'none';
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Cleared error message state');
      }
    }
    if (loadingMessage) {
      loadingMessage.style.display = 'block';
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Showing loading message');
      }
    }
    
    // Load pool data for new site - view mode will be applied after render
    Dashboard.client.loadPoolData();
    if (Dashboard.core && Dashboard.core.startAutoRefresh) {
      Dashboard.core.startAutoRefresh();
    }
    
  } else {
    // Site cleared - show no-site message and start countdown-only
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Site cleared - showing no-site message and starting countdown-only timer');
    }
    
    // Use UI module to handle visual state
    if (Dashboard.ui && Dashboard.ui.showNoSiteSelected) {
      Dashboard.ui.showNoSiteSelected();
    } else {
      console.warn('Client: Dashboard.ui.showNoSiteSelected not available');
    }
    
    // Start countdown-only timer
    if (Dashboard.core && Dashboard.core.startCountdownOnly) {
      Dashboard.core.startCountdownOnly();
    }
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Site change completed - no server persistence, instance-only state');
  }
};

// =============================================================================
// SETTINGS & CONFIGURATION
// =============================================================================

/**
 * Change refresh interval with AJAX
 * @param {number} interval - New refresh interval in seconds
 */
Dashboard.client.changeRefreshInterval = function(interval) {
  const validIntervals = [10, 30, 60, 90];
  
  if (!validIntervals.includes(parseInt(interval))) {
    console.warn('Client: Invalid refresh interval:', interval);
    return;
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Changing refresh interval to:', interval + 's via AJAX');
  }
  
  const newInterval = parseInt(interval);
  
  // Use consolidated settings request pattern
  Dashboard.client.sendSettingsRequest('/?refresh=' + encodeURIComponent(newInterval), 'refresh', newInterval)
  .then(data => {
    if (data.success) {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Refresh interval preference saved successfully:', newInterval + 's');
      }
      
      // Update local state immediately
      Dashboard.state.refreshInterval = newInterval;
      
      // Update refresh interval dropdown to reflect change
      const refreshSelect = document.getElementById('refreshSelect');
      if (refreshSelect) {
        refreshSelect.value = newInterval;
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Client: Updated refresh interval dropdown to:', newInterval + 's');
        }
      }
      
      // Restart timer with new interval
      if (Dashboard.state.currentSite) {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Client: Restarting auto-refresh timer with new interval:', newInterval + 's');
        }
        if (Dashboard.core && Dashboard.core.startAutoRefresh) {
          Dashboard.core.startAutoRefresh();
        }
      } else {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Client: Restarting countdown-only timer with new interval:', newInterval + 's');
        }
        if (Dashboard.core && Dashboard.core.startCountdownOnly) {
          Dashboard.core.startCountdownOnly();
        }
      }
      
    } else {
      console.warn('Client: Server reported refresh interval save failure');
    }
  })
  .catch(error => {
    console.warn('Client: Refresh interval preference save failed:', error.message);
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Refresh interval still applied locally - will persist on next page load');
    }
    
    // Apply interval locally even if server save failed
    Dashboard.state.refreshInterval = newInterval;
    
    // Update refresh interval dropdown to reflect change (even on error)
    const refreshSelect = document.getElementById('refreshSelect');
    if (refreshSelect) {
      refreshSelect.value = newInterval;
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Updated refresh interval dropdown (fallback) to:', newInterval + 's');
      }
    }
    
    // Restart timer with new interval
    if (Dashboard.state.currentSite) {
      if (Dashboard.core && Dashboard.core.startAutoRefresh) {
        Dashboard.core.startAutoRefresh();
      }
    } else {
      if (Dashboard.core && Dashboard.core.startCountdownOnly) {
        Dashboard.core.startCountdownOnly();
      }
    }
  });
};

// =============================================================================
// DNS & CACHE MANAGEMENT
// =============================================================================

/**
 * User-initiated DNS resolution function
 */
Dashboard.client.resolveDNS = function() {
  // Check if a site is selected before proceeding
  if (!Dashboard.state.currentSite) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Resolve button clicked but no site selected - ignoring request');
    }
    return; // Exit early - no effect when no site is selected
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: User-initiated DNS resolution triggered for site:', Dashboard.state.currentSite);
  }
  
  // Trigger pool data load with forced DNS resolution
  Dashboard.client.loadPoolData(true);
};

/**
 * User-initiated DNS cache flush function
 */
Dashboard.client.flushDNSCache = function() {
  // Check if a site is selected before proceeding with UI updates
  if (!Dashboard.state.currentSite) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Flush button clicked but no site selected - ignoring UI update');
    }
    // Still perform cache flush but don't update UI
    let clearedCount = 0;
    if (Dashboard.data && Dashboard.data.flushHostnameCache) {
      clearedCount = Dashboard.data.flushHostnameCache() || 0;
    }
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: DNS cache flush complete (no UI update) -', clearedCount, 'entries cleared');
    }
    return; // Exit early - no UI effect when no site is selected
  }
  
  // Check if dashboard is currently in error/loading state
  const errorMessage = document.getElementById('error-message');
  const loadingMessage = document.getElementById('loading-message');
  const poolsGrid = document.getElementById('pools-grid');
  
  const isShowingError = errorMessage && window.getComputedStyle(errorMessage).display !== 'none';
  const isShowingLoading = loadingMessage && window.getComputedStyle(loadingMessage).display !== 'none';
  const isShowingPools = poolsGrid && window.getComputedStyle(poolsGrid).display !== 'none' && poolsGrid.children.length > 0;
  
  if (isShowingError || isShowingLoading || !isShowingPools) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Flush button clicked but site is in error/loading state - ignoring UI update');
    }
    // Still perform cache flush but don't update UI
    let clearedCount = 0;
    if (Dashboard.data && Dashboard.data.flushHostnameCache) {
      clearedCount = Dashboard.data.flushHostnameCache() || 0;
    }
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: DNS cache flush complete (no UI update) -', clearedCount, 'entries cleared');
    }
    return; // Exit early - no UI effect when site is in error/loading state
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: User-initiated DNS cache flush triggered for site:', Dashboard.state.currentSite);
  }
  
  // Perform the cache flush
  let clearedCount = 0;
  if (Dashboard.data && Dashboard.data.flushHostnameCache) {
    clearedCount = Dashboard.data.flushHostnameCache() || 0;
  } else {
    console.error('Client: Dashboard.data.flushHostnameCache not available');
  }
  
  // Immediate UI feedback - re-render current data with hostnames cleared
  try {
    const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
    const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    
    if (currentData.pools && currentData.pools.length > 0 && Dashboard.ui && Dashboard.ui.renderPoolData) {
      // Clear all hostname fields to show immediate effect of cache flush
      currentData.pools.forEach(pool => {
        if (pool.members && Array.isArray(pool.members)) {
          pool.members.forEach(member => {
            member.hostname = null; // Clear hostname to show IP address
          });
        }
      });
      
      // Update sessionStorage with cleared hostnames
      sessionStorage.setItem(cacheKey, JSON.stringify(currentData));
      
      // Re-render UI immediately to show IP addresses
      Dashboard.ui.renderPoolData(currentData);
      
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: UI re-rendered immediately after DNS cache flush - hostnames now showing as IP addresses');
      }
    } else {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: No current pool data available for immediate UI update after flush');
      }
    }
  } catch (e) {
    console.error('Client: Error updating UI after DNS cache flush:', e);
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: DNS cache flush complete -', clearedCount, 'entries cleared');
  }
};

// =============================================================================
// UTILITIES & HELPERS
// =============================================================================

/**
 * Merge API response with cached hostnames 
 * @param {Object} apiResponse - API response from backend
 * @returns {Object} Enhanced API response with cached hostnames filled in
 */
Dashboard.client.mergeWithHostnameCache = function(apiResponse) {
  if (!apiResponse || !apiResponse.pools) {
    return apiResponse;
  }
  
  // Check if Data module is available
  if (!Dashboard.data || !Dashboard.data.getHostnameFromCache || !Dashboard.data.setHostnameInCache) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Data module hostname cache functions not available - using original data without cache merge');
    }
    return apiResponse;
  }
  
  let cacheHits = 0;
  let cacheMisses = 0;
  let newEntries = 0;
  
  apiResponse.pools.forEach(pool => {
    if (pool.members && Array.isArray(pool.members)) {
      pool.members.forEach(member => {
        const ip = member.ip;
        
        if (member.hostname === null) {
          // Try to get cached hostname from sessionStorage
          const cachedHostname = Dashboard.data.getHostnameFromCache(ip);
          if (cachedHostname) {
            member.hostname = cachedHostname;
            cacheHits++;
          } else {
            cacheMisses++;
          }
        } else if (member.hostname !== null) {
          // Update sessionStorage cache with new hostname
          Dashboard.data.setHostnameInCache(ip, member.hostname);
          newEntries++;
        } else {
          // No hostname available (neither cached nor resolved)
          cacheMisses++;
        }
      });
    }
  });
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const cacheSize = Dashboard.data.getHostnameCacheSize ? Dashboard.data.getHostnameCacheSize() : 0;
    console.log('Client: Hostname merge complete - Cache hits:', cacheHits, 
               'Cache misses:', cacheMisses, 'New entries:', newEntries,
               'Total cached:', cacheSize);
  }
  
  return apiResponse;
};

/**
 * Enhanced JSON response processing with standardized error handling
 * @param {Response} response - Fetch API response object
 * @returns {Promise} Promise resolving to parsed JSON data
 */
Dashboard.client.processJSONResponse = function(response) {
  if (!response.ok) {
    // Enhanced error handling - try to parse JSON error response first
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // Response is JSON - likely our standardized error format
      return response.json().then(errorData => {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Client: Parsed JSON error response:', errorData);
        }
        const error = new Error('JSON_ERROR');
        error.cause = errorData;
        throw error;
      }, jsonParseError => {
        // Only catches actual response.json() failures, not intentionally thrown errors
        console.warn('Client: Could not parse JSON error response:', jsonParseError.message);
        throw new Error('HTTP ' + response.status + ': ' + (response.statusText || 'Request failed'));
      });
    } else {
      // Not JSON, use standard error handling
      throw new Error('HTTP ' + response.status + ': ' + (response.statusText || 'Request failed'));
    }
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid content type: ' + (contentType || 'unknown'));
  }
  
  return response.json();
};

/**
 * Standardized AJAX POST request for settings with comprehensive error handling
 * @param {string} endpoint - URL endpoint for the request
 * @param {string} parameter - Parameter name for the POST body
 * @param {string} value - Parameter value for the POST body
 * @returns {Promise} Promise resolving to parsed response
 */
Dashboard.client.sendSettingsRequest = function(endpoint, parameter, value) {
  const headers = Dashboard.client.buildRequestHeaders({
    'Content-Type': 'application/x-www-form-urlencoded'
  });
  
  const body = parameter + '=' + encodeURIComponent(value);
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Sending settings request to:', endpoint, 'with parameter:', parameter, '=', value);
  }
  
  return fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: body
  }).then(response => Dashboard.client.processJSONResponse(response));
};

/**
 * Enhanced pool data request with instance identification and response validation
 * @param {Object} requestHeaders - Additional headers for the request
 * @param {AbortSignal} signal - AbortController signal for request cancellation
 * @returns {Promise} Promise resolving to pool data response
 */
Dashboard.client.sendPoolDataRequest = function(requestHeaders = {}, signal = null) {
  // Ensure instance isolation is initialized
  if (!Dashboard.core.instanceID) {
    Dashboard.core.initializeInstanceIsolation();
  }
  
  const headers = Dashboard.client.buildRequestHeaders(requestHeaders);
  
  // Add instance ID header for backend identification
  headers['X-Instance-ID'] = Dashboard.core.instanceID;
  
  // CRITICAL FIX: Send instance-specific selected site as header
  headers['X-Selected-Site'] = Dashboard.state.currentSite || '';
  
  const requestOptions = {
    method: 'GET',
    headers: headers
  };
  
  if (signal) {
    requestOptions.signal = signal;
  }
  
  // Include instanceID as URL parameter for browser cache uniqueness
  const endpointWithInstanceID = Dashboard.client.config.endpoints.poolData + '?instanceId=' + encodeURIComponent(Dashboard.core.instanceID);
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const headerCount = Object.keys(requestHeaders).filter(h => h.startsWith('X-Need-')).length;
    if (headerCount > 0) {
      console.log('Client: Sending pool data request with', headerCount, 'optimization headers, instance ID:', Dashboard.core.instanceID, 'and site:', Dashboard.state.currentSite);
    } else {
      console.log('Client: Sending standard pool data request with instance ID:', Dashboard.core.instanceID, 'and site:', Dashboard.state.currentSite);
    }
  }
  
  return fetch(endpointWithInstanceID, requestOptions)
    .then(response => Dashboard.client.processJSONResponse(response))
    .then(data => Dashboard.client.validateInstanceResponse(data));
};

/**
 * Validate response contains matching instance ID before processing
 * @param {Object} data - Response data from backend
 * @returns {Object|null} Validated response data or null if mismatch
 */
Dashboard.client.validateInstanceResponse = function(data) {
  // Check if response contains instance ID field
  if (!data.hasOwnProperty('instanceId')) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Response missing instanceId field - processing normally (legacy backend)');
    }
    return data;
  }
  
  // Validate instance ID matches current instance
  if (data.instanceId !== Dashboard.core.instanceID) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Rejecting response - instanceId mismatch:', data.instanceId, 'vs', Dashboard.core.instanceID);
    }
    return null; // Return null for mismatched responses
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Response instanceId validated:', data.instanceId);
  }
  
  return data;
};

/**
 * Standardized error message processing for user display
 * @param {Error} error - Error object from fetch operation
 * @returns {Object} Processed error information for UI display
 */
Dashboard.client.processErrorForDisplay = function(error) {
  let userMessage = 'Unable to complete the requested operation.';
  let debugInfo = '';
  
  // Enhanced error processing - check for JSON error format
  if (error.message === 'JSON_ERROR' && error.cause) {
    const errorData = error.cause;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client: Processing standardized JSON error response');
    }
    
    // Use the detailed backend error message
    userMessage = errorData.message || 'An error occurred on the selected site.';
    
    // Add debugging information if available
    if (errorData.hostname) {
      debugInfo += '<br><strong>Source:</strong> ' + errorData.hostname;
    }
    if (errorData.timestamp) {
      debugInfo += '<br><strong>Time:</strong> ' + errorData.timestamp;
    }
    if (errorData.error) {
      debugInfo += '<br><strong>Error Type:</strong> ' + errorData.error;
    }
    if (errorData.version) {
      debugInfo += '<br><strong>API Version:</strong> ' + errorData.version;
    }
    
  } else {
    // Fall back to legacy error message generation based on HTTP status
    if (error.message.includes('HTTP 503')) {
      userMessage = 'The selected site is currently unavailable or unreachable.';
    } else if (error.message.includes('HTTP 502')) {
      userMessage = 'Bad response from the selected site API.';
    } else if (error.message.includes('HTTP 504')) {
      userMessage = 'Timeout waiting for response from the selected site.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      userMessage = 'Network connection failed. Please check your connection and try again.';
    } else if (error.message.includes('Invalid content type')) {
      userMessage = 'The selected site returned invalid data format.';
    }
    
    debugInfo = '<br><br><strong>Error details:</strong> ' + error.message;
  }
  
  return {
    userMessage: userMessage,
    debugInfo: debugInfo,
    fullMessage: userMessage + debugInfo
  };
};

/**
 * Request timing and performance measurement utility
 * @param {string} operationName - Name of the operation for logging
 * @param {Function} requestFunction - Function that returns a Promise for the request
 * @returns {Promise} Promise resolving to request result with timing information
 */
Dashboard.client.measureRequestPerformance = function(operationName, requestFunction) {
  const startTime = Date.now();
  
  return requestFunction().then(result => {
    const totalTime = Date.now() - startTime;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Client:', operationName, 'completed successfully in', totalTime + 'ms');
    }
    return result;
  }).catch(error => {
    const totalTime = Date.now() - startTime;
    console.error('Client:', operationName, 'failed after', totalTime + 'ms:', error.message);
    throw error;
  });
};

/**
 * Request retry logic with exponential backoff
 * @param {Function} requestFunction - Function that returns a Promise for the request
 * @param {number} maxRetries - Maximum number of retry attempts (default: 2)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise} Promise resolving to successful request result
 */
Dashboard.client.retryRequest = function(requestFunction, maxRetries = 2, baseDelay = 1000) {
  let attempt = 0;
  
  const attemptRequest = function() {
    attempt++;
    
    return requestFunction().catch(error => {
      if (attempt >= maxRetries || error.name === 'AbortError') {
        // Max retries reached or request was cancelled - don't retry
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Client: Request failed, retrying in', delay + 'ms', '(attempt', attempt, 'of', maxRetries + ')');
      }
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(attemptRequest());
        }, delay);
      });
    });
  };
  
  return attemptRequest();
};

/**
 * Cleanup client resources before page unload
 */
Dashboard.client.cleanup = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Client: Cleaning up HTTP client resources');
  }
  
  try {
    Dashboard.client.cancelPendingRequests();
    Dashboard.client.state.initialized = false;
  } catch (error) {
    console.warn('Client: Error during cleanup:', error.message);
  }
};

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

/**
 * Auto-initialize client module when ready
 */
Dashboard.client.autoInit = function() {
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    setTimeout(Dashboard.client.autoInit, 50);
    return;
  }
  
  Dashboard.client.init();
};

// Start auto-initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Dashboard.client.autoInit);
} else {
  setTimeout(Dashboard.client.autoInit, 10);
}

// Cleanup on page unload
window.addEventListener('beforeunload', Dashboard.client.cleanup);

console.log('Dashboard Client module loaded successfully');
