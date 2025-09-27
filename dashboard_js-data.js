// Multi-Site Dashboard JavaScript - DATA MODULE
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
// Description: Data management, state tracking, pool reordering functionality, 
// DNS hostname caching, and alias mode persistence

// =============================================================================
// MODULE INITIALIZATION
// =============================================================================

/**
 * Get instance-specific data container, creating if needed
 * @returns {Object} Instance-specific data container
 */
Dashboard.data.getInstanceData = function() {
  if (!Dashboard.core.instanceID) {
    Dashboard.core.initializeInstanceIsolation();
  }
  
  if (!Dashboard.data.instances) {
    Dashboard.data.instances = {};
  }
  
  if (!Dashboard.data.instances[Dashboard.core.instanceID]) {
    Dashboard.data.instances[Dashboard.core.instanceID] = {
      memberStates: {},
      customOrder: {},
      reorderMode: false,
      draggedElement: null,
      memberStateCache: new Map(),
      config: {
        maxHistoryEntries: 50,
        maxMembersSupported: 1000
      },
      logger: {
        enabled: false,
        maxEntries: 5000,
        initialized: false,
        pendingLogs: []
      },
      hostnameCache: {
        maxEntries: 5000,
        chunkSize: 250,
        persistencePrefix: 'hostnameCache_'
      }
    };
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Created new instance data container for:', Dashboard.core.instanceID);
    }
  }
  
  return Dashboard.data.instances[Dashboard.core.instanceID];
};

/**
 * Initialize data management module
 */
Dashboard.data.init = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Initializing with safe logger integration, DNS hostname caching, and alias mode persistence');
  }
  
  // Initialize instance-specific data container
  const instanceData = Dashboard.data.getInstanceData();
  
  // Initialize hostname caching
  Dashboard.data.initializeHostnameCache();
  
  // Load persisted data from session storage
  Dashboard.data.loadCustomOrder();
  Dashboard.data.loadMemberStates();
  Dashboard.data.loadHostnameCache();
  Dashboard.data.loadAliasMode();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Initialization complete with DNS hostname caching and alias mode persistence for instance:', Dashboard.core.instanceID);
  }
};

/**
 * Initialize hostname cache data structure (sessionStorage only)
 */
Dashboard.data.initializeHostnameCache = function() {
  const instanceData = Dashboard.data.getInstanceData();
  
  // Remove in-memory cache - only keep configuration
  instanceData.hostnameCache = {
    maxEntries: 5000,
    chunkSize: 250,
    persistencePrefix: 'hostnameCache_'
  };
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Hostname cache initialized (sessionStorage only) with max entries:', instanceData.hostnameCache.maxEntries, 'for instance:', Dashboard.core.instanceID);
  }
};

// =============================================================================
// CORE FUNCTIONALITY - STATE TRACKING AND DATA MANAGEMENT
// =============================================================================

/**
 * MODIFIED: Update member states with dual key tracking for hostname support
 * @param {Object} data - Pool data from API response (includes hostname fields)
 */
Dashboard.data.updateMemberStates = function(data) {
  if (!data.pools || data.pools.length === 0) {
    return;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  let hasStateChanges = false;
  let hasNewMembers = false;
  let hasAutoAcknowledgments = false;
  
  const currentTime = Date.now();
  const siteName = Dashboard.state.currentSite || 'UNKNOWN';
  const hostname = data.hostname || 'unknown';
  const shouldDebug = (window.dashboardConfig && window.dashboardConfig.debugEnabled) || (data.debug_enabled === "enabled");
  
  // Clear cache when states are being updated
  instanceData.memberStateCache.clear();
  
  data.pools.forEach(function(pool) {
    if (!pool.members || pool.members.length === 0) {
      return;
    }
    
    pool.members.forEach(function(member) {
      // Generate both IP-based (primary) and hostname-based (secondary) keys
      const memberIP = Dashboard.data.extractMemberIP(member);
      const keys = Dashboard.data.generateMemberKeys(
        pool.name, 
        memberIP, 
        member.port, 
        member.hostname
      );
      
      const primaryKey = keys.primaryKey;
      const secondaryKey = keys.secondaryKey;
      
      // Always use primary key (IP-based) for state storage
      let currentState = instanceData.memberStates[primaryKey];
      
      // Check if we need to migrate from old hostname-based key
      if (!currentState && secondaryKey && instanceData.memberStates[secondaryKey]) {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Data: Migrating state from hostname key to IP key:', secondaryKey, '->', primaryKey);
        }
        currentState = instanceData.memberStates[secondaryKey];
        instanceData.memberStates[primaryKey] = currentState;
        delete instanceData.memberStates[secondaryKey];
      }
      
      // Determine display address for logging (hostname if available, otherwise IP)
      const displayAddress = (member.hostname !== null && member.hostname !== undefined) ? 
        member.hostname : memberIP;
      const displayMember = displayAddress + ':' + member.port;
      
      if (!currentState) {
        // New member - initialize with circular buffer
        instanceData.memberStates[primaryKey] = {
          baseline: member.status,
          current: member.status,
          needsAck: false,
          lastSeen: currentTime,
          history: Dashboard.data.createCircularBuffer(instanceData.config.maxHistoryEntries),
          // Store both keys for lookup purposes
          primaryKey: primaryKey,
          secondaryKey: secondaryKey
        };
        hasNewMembers = true;
        if (shouldDebug) {
          console.log('Data: New member detected:', primaryKey, 'baseline:', member.status, 'display:', displayMember);
        }
        
      } else {
        // Update secondary key reference in case hostname changed
        currentState.primaryKey = primaryKey;
        currentState.secondaryKey = secondaryKey;
        
        // Existing member - check for status change
        const previousStatus = currentState.current;
        currentState.current = member.status;
        currentState.lastSeen = currentTime;
        
        if (previousStatus !== member.status) {
          if (shouldDebug) {
            console.log('Data: Status change detected for', primaryKey, 'from', previousStatus, 'to', member.status, 'display:', displayMember);
          }
          
          Dashboard.data.safeLogMemberChange(
            previousStatus,
            member.status,
            displayMember,
            pool.name,
            siteName,
            hostname
          );
          
          Dashboard.data.addToBuffer(currentState.history, {
            timestamp: currentTime,
            from: previousStatus,
            to: member.status
          });
          
          // Check if member returned to baseline state (auto-acknowledge)
          if (member.status === currentState.baseline) {
            if (shouldDebug) {
              console.log('Data: Auto-acknowledging', primaryKey, '- returned to baseline state:', currentState.baseline);
            }
            currentState.needsAck = false;
            hasAutoAcknowledgments = true;
          } else {
            currentState.needsAck = true;
            hasStateChanges = true;
          }
        }
      }
    });
  });
  
  if (hasNewMembers || hasStateChanges || hasAutoAcknowledgments) {
    Dashboard.data.saveMemberStates();
  }
  
  if (hasStateChanges) {
    if (shouldDebug) {
      console.log('Data: Member status changes detected - visual cues will be applied');
    }
  }
  
  if (hasAutoAcknowledgments) {
    if (shouldDebug) {
      console.log('Data: Auto-acknowledgments processed - some members returned to baseline');
    }
  }
};

/**
 * MODIFIED: Check if member status has changed with dual key lookup support
 * @param {string} poolName - Name of the pool
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 * @returns {boolean} True if status needs acknowledgment
 */
Dashboard.data.hasMemberStatusChanged = function(poolName, memberAddress, memberPort) {
  const instanceData = Dashboard.data.getInstanceData();
  
  // Try primary key first (IP-based)
  let memberKey = Dashboard.data.generateMemberKey(poolName, memberAddress, memberPort);
  
  // Check cache first for O(1) lookup performance
  if (instanceData.memberStateCache.has(memberKey)) {
    return instanceData.memberStateCache.get(memberKey);
  }
  
  let memberState = instanceData.memberStates[memberKey];
  
  // If not found and memberAddress looks like a hostname, search by secondary key
  if (!memberState && !memberAddress.match(/^\d+\.\d+\.\d+\.\d+$/) && !memberAddress.includes('::') && !memberAddress.startsWith('[')) {
    // This might be a hostname, search through all states for matching secondary key
    for (const [key, state] of Object.entries(instanceData.memberStates)) {
      if (state.secondaryKey === memberKey) {
        memberState = state;
        memberKey = key; // Use the primary key for caching
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Data: Found member state using hostname lookup:', memberKey);
        }
        break;
      }
    }
  }
  
  const result = memberState ? memberState.needsAck : false;
  
  instanceData.memberStateCache.set(memberKey, result);
  
  if (result) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Member state change detected for key:', memberKey);
    }
  }
  
  return result;
};

/**
 * Acknowledge status change with dual key lookup support
 * @param {string} poolName - Name of the pool
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 */
Dashboard.data.acknowledgeMemberChange = function(poolName, memberAddress, memberPort) {
  const instanceData = Dashboard.data.getInstanceData();
  
  // Safety check: ensure we're not trying to acknowledge with a hostname
  if (!memberAddress.match(/^\d+\.\d+\.\d+\.\d+$/) && !memberAddress.includes(':') && !memberAddress.startsWith('[')) {
    console.error('Data: acknowledgeMemberChange called with hostname instead of IP address:', memberAddress);
    console.error('Data: This indicates a bug in the event handling - should always use actual IP addresses');
    return;
  }
  
  // Try to find the member state using either IP or hostname
  let memberKey = Dashboard.data.generateMemberKey(poolName, memberAddress, memberPort);
  let memberState = instanceData.memberStates[memberKey];
  
  // If not found and looks like hostname, search by secondary key
  if (!memberState && !memberAddress.match(/^\d+\.\d+\.\d+\.\d+$/) && !memberAddress.includes('::') && !memberAddress.startsWith('[')) {
    for (const [key, state] of Object.entries(instanceData.memberStates)) {
      if (state.secondaryKey === memberKey) {
        memberState = state;
        memberKey = key; // Use the primary key for operations
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Data: Found member state for acknowledgment using hostname lookup:', memberKey);
        }
        break;
      }
    }
  }
  
  if (!memberState) {
    console.warn('Data: Cannot acknowledge change for unknown member:', memberKey);
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Available member keys:', Object.keys(instanceData.memberStates));
      
      // Additional debugging: show secondary keys
      const secondaryKeys = [];
      Object.values(instanceData.memberStates).forEach(state => {
        if (state.secondaryKey) {
          secondaryKeys.push(state.secondaryKey);
        }
      });
      console.log('Data: Available secondary keys:', secondaryKeys);
    }
    return;
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Acknowledging status change for member:', memberKey);
  }
  
  memberState.baseline = memberState.current;
  memberState.needsAck = false;
  
  instanceData.memberStateCache.delete(memberKey);
  
  Dashboard.data.addToBuffer(memberState.history, {
    timestamp: Date.now(),
    from: 'acknowledged',
    to: memberState.current
  });
  
  Dashboard.data.saveMemberStates();
  
  try {
    const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
    const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    if (currentData.pools && Dashboard.ui && Dashboard.ui.renderPoolData) {
      Dashboard.ui.renderPoolData(currentData);
    }
  } catch (e) {
    console.error('Data: Error parsing currentPoolData for re-render:', e);
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Member change acknowledged - baseline updated to:', memberState.current);
  }
};

/**
 * Reset all member states for ALL sites - production ready full state flush (memory only)
 */
Dashboard.data.resetAllMemberStates = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Performing full reset of all in-memory member states across all sites');
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  
  // Count total states before reset for debugging
  const totalStatesBefore = Object.keys(instanceData.memberStates).length;
  
  // Clear all in-memory member states
  instanceData.memberStates = {};
  
  // Clear the cache since we cleared member states
  instanceData.memberStateCache.clear();
  
  // Clear pending logs
  Dashboard.data.clearPendingLogs();
  
  // Clear drag element
  Dashboard.data.clearDraggedElement();
  
  // Re-render current site to show cleared visual cues
  try {
    const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
    const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    if (currentData.pools && Dashboard.ui && Dashboard.ui.renderPoolData) {
      Dashboard.ui.renderPoolData(currentData);
    }
  } catch (e) {
    console.error('Data: Error parsing currentPoolData for re-render:', e);
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Full in-memory member state reset complete - cleared', totalStatesBefore, 'states (sessionStorage preserved)');
  }
};

/**
 * Get member state information including recent history (hostname-aware)
 * @param {string} poolName - Name of the pool
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 * @returns {Object|null} Member state object or null if not found
 */
Dashboard.data.getMemberState = function(poolName, memberAddress, memberPort) {
  const instanceData = Dashboard.data.getInstanceData();
  let memberKey = Dashboard.data.generateMemberKey(poolName, memberAddress, memberPort);
  let memberState = instanceData.memberStates[memberKey];
  
  // If not found and looks like hostname, search by secondary key
  if (!memberState && !memberAddress.match(/^\d+\.\d+\.\d+\.\d+$/) && !memberAddress.includes('::') && !memberAddress.startsWith('[')) {
    for (const [key, state] of Object.entries(instanceData.memberStates)) {
      if (state.secondaryKey === memberKey) {
        return state;
      }
    }
  }
  
  return memberState || null;
};

/**
 * Get recent change history for a member (hostname-aware)
 * @param {string} poolName - Name of the pool
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 * @param {number} count - Number of recent changes to get
 * @returns {Array} Array of recent changes, newest first
 */
Dashboard.data.getMemberHistory = function(poolName, memberAddress, memberPort, count = 10) {
  const memberState = Dashboard.data.getMemberState(poolName, memberAddress, memberPort);
  if (!memberState || !memberState.history) {
    return [];
  }
  
  return Dashboard.data.getRecentEntries(memberState.history, count);
};

// =============================================================================
// DOM MANAGEMENT AND UI STATE CONTROL
// =============================================================================

/**
 * Toggle reorder mode on/off
 */
Dashboard.data.toggleReorderMode = function() {
  const instanceData = Dashboard.data.getInstanceData();
  instanceData.reorderMode = !instanceData.reorderMode;
  const toggle = document.getElementById('reorder-toggle');
  const containers = document.querySelectorAll('.pool-container');
  
  if (instanceData.reorderMode) {
    if (toggle) {
      toggle.textContent = 'Disable';
      toggle.classList.add('active');
    }
    
    containers.forEach(container => {
      container.draggable = true;
      container.addEventListener('dragstart', Dashboard.data.handleDragStart);
      container.addEventListener('dragend', Dashboard.data.handleDragEnd);
      container.addEventListener('dragover', Dashboard.data.handleDragOver);
      container.addEventListener('drop', Dashboard.data.handleDrop);
      
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.title = 'Drag to reorder';
      container.style.position = 'relative';
      container.appendChild(dragHandle);
    });
  } else {
    if (toggle) {
      toggle.textContent = 'Reorder';
      toggle.classList.remove('active');
    }
    
    containers.forEach(function(container) {
      container.draggable = false;
      container.removeEventListener('dragstart', Dashboard.data.handleDragStart);
      container.removeEventListener('dragend', Dashboard.data.handleDragEnd);
      container.removeEventListener('dragover', Dashboard.data.handleDragOver);
      container.removeEventListener('drop', Dashboard.data.handleDrop);
      
      const dragHandle = container.querySelector('.drag-handle');
      if (dragHandle) {
        dragHandle.remove();
      }
    });
  }
};

/**
 * Update custom order with SWAP behavior for drag-and-drop
 * @param {string} draggedPool - Name of the pool being dragged
 * @param {string} targetPool - Name of the pool being dropped on
 */
Dashboard.data.updateCustomOrder = function(draggedPool, targetPool) {
  const instanceData = Dashboard.data.getInstanceData();
  const containers = Array.from(document.querySelectorAll('.pool-container:not([style*="display: none"])'));
  const currentOrder = {};
  
  containers.forEach(function(container, index) {
    const poolName = container.getAttribute('data-pool-name');
    currentOrder[poolName] = index;
  });
  
  const draggedIndex = currentOrder[draggedPool];
  const targetIndex = currentOrder[targetPool];
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Swapping pools:', draggedPool, '(index:', draggedIndex, ') with', targetPool, '(index:', targetIndex, ')');
  }
  
  const newOrder = {};
  Object.keys(currentOrder).forEach(function(poolName) {
    if (poolName === draggedPool) {
      newOrder[poolName] = targetIndex;
    } else if (poolName === targetPool) {
      newOrder[poolName] = draggedIndex;
    } else {
      newOrder[poolName] = currentOrder[poolName];
    }
  });
  
  instanceData.customOrder = newOrder;
  Dashboard.data.saveCustomOrder();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: New order after swap:', instanceData.customOrder);
  }
};

// =============================================================================
// FEATURE FUNCTIONALITY
// =============================================================================

/**
 * Build pool optimization headers from visible pools using actual pool names
 * @returns {Object} Headers object with X-Need-Pools-Count and X-Need-Pools-N headers
 */
Dashboard.data.buildPoolHeaders = function() {
    // Get visible pool names from UI module
    const visiblePools = Dashboard.ui && Dashboard.ui.getVisiblePoolNames ? Dashboard.ui.getVisiblePoolNames() : [];
    
    if (visiblePools.length === 0) {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('Data: No visible pools for filtering optimization - returning empty headers');
        }
        return {};
    }
    
    const headers = {};
    const chunkSize = 5;
    
    // Calculate header count first
    const headerCount = Math.ceil(visiblePools.length / chunkSize);
    
    // First: Set the count header (mirrors DNS pattern exactly)
    headers['X-Need-Pools-Count'] = headerCount.toString();
    
    // Second: Build the numbered headers
    let currentHeaderIndex = 1;
    for (let i = 0; i < visiblePools.length; i += chunkSize) {
        const chunk = visiblePools.slice(i, i + chunkSize);
        headers[`X-Need-Pools-${currentHeaderIndex}`] = chunk.join(',');
        currentHeaderIndex++;
    }
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Built pool filtering headers -', headerCount, 'headers for', visiblePools.length, 'visible pools');
    }
    
    return headers;
};

/**
 * Get hostname from sessionStorage cache
 * @param {string} ip - IP address to lookup
 * @returns {string|null} Cached hostname or null if not found
 */
Dashboard.data.getHostnameFromCache = function(ip) {
  if (!Dashboard.state || !Dashboard.state.currentSite) {
    return null;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const cacheKey = Dashboard.core.getStorageKey(instanceData.hostnameCache.persistencePrefix + Dashboard.state.currentSite);
  
  try {
    const savedCache = sessionStorage.getItem(cacheKey);
    if (savedCache) {
      const cacheData = JSON.parse(savedCache);
      return cacheData.entries[ip] || null;
    }
  } catch (e) {
    console.error('Data: Error reading hostname from cache:', e);
  }
  
  return null;
};

/**
 * Set hostname in sessionStorage cache
 * @param {string} ip - IP address
 * @param {string} hostname - Hostname to cache
 */
Dashboard.data.setHostnameInCache = function(ip, hostname) {
  if (!Dashboard.state || !Dashboard.state.currentSite) {
    return;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const cacheKey = Dashboard.core.getStorageKey(instanceData.hostnameCache.persistencePrefix + Dashboard.state.currentSite);
  
  try {
    // Get existing cache data
    let cacheData = {
      entries: {},
      timestamp: Date.now(),
      siteId: Dashboard.state.currentSite
    };
    
    const savedCache = sessionStorage.getItem(cacheKey);
    if (savedCache) {
      cacheData = JSON.parse(savedCache);
    }
    
    // Add/update hostname
    cacheData.entries[ip] = hostname;
    cacheData.timestamp = Date.now();
    
    // Check cache size and prune if needed
    const entryCount = Object.keys(cacheData.entries).length;
    if (entryCount > instanceData.hostnameCache.maxEntries) {
      // Keep most recent 80% of entries (simple pruning)
      const entries = Object.entries(cacheData.entries);
      const keepCount = Math.floor(instanceData.hostnameCache.maxEntries * 0.8);
      const prunedEntries = entries.slice(-keepCount);
      
      cacheData.entries = {};
      prunedEntries.forEach(([ip, hostname]) => {
        cacheData.entries[ip] = hostname;
      });
      
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Pruned hostname cache from', entryCount, 'to', Object.keys(cacheData.entries).length, 'entries');
      }
    }
    
    // Save updated cache
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    
  } catch (e) {
    console.error('Data: Error saving hostname to cache:', e);
  }
};

/**
 * Get hostname cache size for current site
 * @returns {number} Number of cached hostnames for current site
 */
Dashboard.data.getHostnameCacheSize = function() {
  if (!Dashboard.state || !Dashboard.state.currentSite) {
    return 0;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const cacheKey = Dashboard.core.getStorageKey(instanceData.hostnameCache.persistencePrefix + Dashboard.state.currentSite);
  
  try {
    const savedCache = sessionStorage.getItem(cacheKey);
    if (savedCache) {
      const cacheData = JSON.parse(savedCache);
      return Object.keys(cacheData.entries).length;
    }
  } catch (e) {
    console.error('Data: Error reading cache size:', e);
  }
  
  return 0;
};

/**
 * Load hostname cache from sessionStorage for current site (no-op now - cache is accessed directly)
 */
Dashboard.data.loadHostnameCache = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const cacheSize = Dashboard.data.getHostnameCacheSize();
    console.log('Data: Hostname cache ready for site', Dashboard.state.currentSite, 'with', cacheSize, 'entries (sessionStorage only)');
  }
};

/**
 * Save hostname cache to sessionStorage for current site (no-op now - cache is saved on each update)
 */
Dashboard.data.saveHostnameCache = function() {
  // No-op - cache is saved directly on each update
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const cacheSize = Dashboard.data.getHostnameCacheSize();
    console.log('Data: Hostname cache current size for site', Dashboard.state.currentSite, ':', cacheSize, 'entries');
  }
};

/**
 * Prune hostname cache when it exceeds limits (no-op now - pruning happens during setHostnameInCache)
 */
Dashboard.data.pruneHostnameCache = function() {
  // No-op - pruning happens automatically in setHostnameInCache
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Hostname cache pruning handled automatically during updates');
  }
};

/**
 * Flush hostname cache completely for current site only
 */
Dashboard.data.flushHostnameCache = function() {
  if (!Dashboard.state || !Dashboard.state.currentSite) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: No current site - hostname cache flush skipped');
    }
    return 0;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const cacheKey = Dashboard.core.getStorageKey(instanceData.hostnameCache.persistencePrefix + Dashboard.state.currentSite);
  
  let cacheSize = 0;
  try {
    // Get current cache size before clearing
    cacheSize = Dashboard.data.getHostnameCacheSize();
    
    // Clear only the current site's cache from sessionStorage
    sessionStorage.removeItem(cacheKey);
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Hostname cache flushed for site', Dashboard.state.currentSite, '-', cacheSize, 'entries cleared');
      console.log('Data: Other sites\' hostname caches remain intact');
      console.log('Data: Next Resolve click will perform full DNS resolution for current site');
    }
  } catch (e) {
    console.error('Data: Error flushing hostname cache:', e);
  }
  
  return cacheSize;
};

/**
 * Identify IPs that need DNS resolution from API response (sessionStorage lookup)
 * @param {Object} apiData - API response data with pools and members
 * @returns {Array} Array of IP addresses that need DNS resolution
 */
Dashboard.data.getIPsNeedingDNS = function(apiData) {
  if (!apiData || !apiData.pools) {
    return [];
  }
  
  const unknownIPs = new Set();
  
  apiData.pools.forEach(pool => {
    if (pool.members && Array.isArray(pool.members)) {
      pool.members.forEach(member => {
        const ip = member.ip;
        if (ip && !Dashboard.data.getHostnameFromCache(ip)) {
          unknownIPs.add(ip);
        }
      });
    }
  });
  
  const result = Array.from(unknownIPs);
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Found', result.length, 'IPs needing DNS resolution out of total members');
  }
  
  return result;
};

/**
 * Get all IPs from API response for forced DNS resolution (sessionStorage lookup)
 * @param {Object} apiData - API response data with pools and members
 * @param {boolean} respectVisibility - Whether to only include IPs from visible pools
 * @returns {Array} Array of IP addresses that actually need forced resolution
 */
Dashboard.data.getAllIPsForDNSResolution = function(apiData, respectVisibility = false) {
  if (!apiData || !apiData.pools) {
    return [];
  }
  
  const needResolutionIPs = new Set();
  
  apiData.pools.forEach(pool => {
    // If respectVisibility is true, check if pool should be shown based on current filter
    if (respectVisibility && Dashboard.ui && Dashboard.ui.shouldShowPool) {
      const shouldShow = Dashboard.ui.shouldShowPool(pool.name, pool);
      if (!shouldShow) {
        // Pool is not visible - skip its IPs
        return;
      }
    }
    
    if (pool.members && Array.isArray(pool.members)) {
      pool.members.forEach(member => {
        const ip = member.ip;
        if (ip) {
          const cachedHostname = Dashboard.data.getHostnameFromCache(ip);
          if (!cachedHostname) {
            // Not cached at all OR cached as null - needs resolution
            needResolutionIPs.add(ip);
          }
          // If cachedHostname is a valid string, skip this IP (already resolved)
        }
      });
    }
  });
  
  const result = Array.from(needResolutionIPs);
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const totalIPs = new Set();
    let processedPools = 0;
    let skippedPools = 0;
    
    apiData.pools.forEach(pool => {
      let poolProcessed = true;
      
      if (respectVisibility && Dashboard.ui && Dashboard.ui.shouldShowPool) {
        const shouldShow = Dashboard.ui.shouldShowPool(pool.name, pool);
        if (!shouldShow) {
          poolProcessed = false;
          skippedPools++;
        }
      }
      
      if (poolProcessed) {
        processedPools++;
        if (pool.members && Array.isArray(pool.members)) {
          pool.members.forEach(member => {
            if (member.ip) totalIPs.add(member.ip);
          });
        }
      }
    });
    
    if (respectVisibility) {
      console.log('Data: Found', result.length, 'IPs needing forced DNS resolution from', processedPools, 'visible pools (', skippedPools, 'pools filtered out)');
      console.log('Data: Total IPs in visible pools:', totalIPs.size, '- Cached:', (totalIPs.size - result.length), 'Need resolution:', result.length);
    } else {
      console.log('Data: Found', result.length, 'IPs needing forced DNS resolution out of', totalIPs.size, 'total IPs');
      console.log('Data: Skipped', (totalIPs.size - result.length), 'IPs that are already cached with valid hostnames');
    }
  }
  
  return result;
};

/**
 * Build chunked "need DNS" headers from array of IP addresses
 * @param {Array} ipArray - Array of IP addresses needing DNS resolution
 * @returns {Object} Headers object with X-Need-DNS-Count and X-Need-DNS-IPs-N headers
 */
Dashboard.data.buildNeedDNSHeaders = function(ipArray) {
  if (!ipArray || ipArray.length === 0) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: No IPs need DNS - returning empty headers');
    }
    return {};
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const headers = {};
  const chunkSize = instanceData.hostnameCache.chunkSize;
  let headerCount = 0;
  
  for (let i = 0; i < ipArray.length; i += chunkSize) {
    headerCount++;
    const chunk = ipArray.slice(i, i + chunkSize);
    headers[`X-Need-DNS-IPs-${headerCount}`] = chunk.join(',');
  }
  
  headers['X-Need-DNS-Count'] = headerCount.toString();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Built need-DNS headers -', headerCount, 'headers for', ipArray.length, 'IPs');
  }
  
  return headers;
};

/**
 * Get hostname cache statistics
 * @returns {Object} Cache statistics object
 */
Dashboard.data.getHostnameCacheStats = function() {
  return {
    cacheSize: Dashboard.data.getHostnameCacheSize(),
    maxEntries: Dashboard.data.getInstanceData().hostnameCache.maxEntries,
    hitRate: 0, // Not tracked in sessionStorage-only implementation
    currentSite: Dashboard.state ? Dashboard.state.currentSite : 'unknown'
  };
};

/**
 * Load alias mode preference for current site
 */
Dashboard.data.loadAliasMode = function() {
  if (!Dashboard.state || !Dashboard.state.currentSite) {
    Dashboard.state.currentAliasMode = true; // Default to show aliases
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: No current site - using default alias mode:', Dashboard.state.currentAliasMode);
    }
    return;
  }
  
  const storageKey = Dashboard.core.getStorageKey('aliasMode_' + Dashboard.state.currentSite);
  try {
    const savedMode = sessionStorage.getItem(storageKey);
    if (savedMode !== null) {
      Dashboard.state.currentAliasMode = savedMode === 'true';
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Loaded alias mode', Dashboard.state.currentAliasMode, 'for site:', Dashboard.state.currentSite);
      }
    } else {
      Dashboard.state.currentAliasMode = true; // Default to show aliases
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: No saved alias mode for site:', Dashboard.state.currentSite, '- defaulting to show aliases');
      }
    }
  } catch (e) {
    console.error('Data: Error loading alias mode for site:', e);
    Dashboard.state.currentAliasMode = true; // Default to show aliases
  }
};

/**
 * Save alias mode preference for current site
 */
Dashboard.data.saveAliasMode = function() {
  if (!Dashboard.state || !Dashboard.state.currentSite) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: No current site - skipping alias mode save');
    }
    return;
  }
  
  const storageKey = Dashboard.core.getStorageKey('aliasMode_' + Dashboard.state.currentSite);
  try {
    sessionStorage.setItem(storageKey, Dashboard.state.currentAliasMode.toString());
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Saved alias mode', Dashboard.state.currentAliasMode, 'for site:', Dashboard.state.currentSite);
    }
  } catch (e) {
    console.error('Data: Error saving alias mode for site:', e);
  }
};

/**
 * Load member states from session storage
 */
Dashboard.data.loadMemberStates = function() {
  const instanceData = Dashboard.data.getInstanceData();
  const storageKey = Dashboard.core.getStorageKey('memberStates_' + Dashboard.state.currentSite);
  const savedStates = sessionStorage.getItem(storageKey);
  if (savedStates) {
    try {
      const data = JSON.parse(savedStates);
      
      Object.keys(data).forEach(memberKey => {
        const savedState = data[memberKey];
        
        instanceData.memberStates[memberKey] = {
          baseline: savedState.baseline,
          current: savedState.current,
          needsAck: savedState.needsAck,
          lastSeen: savedState.lastSeen,
          history: Dashboard.data.createCircularBuffer(instanceData.config.maxHistoryEntries),
          // Restore key references if they exist
          primaryKey: savedState.primaryKey || memberKey,
          secondaryKey: savedState.secondaryKey || null
        };
        
        if (savedState.history && savedState.history.entries) {
          const restoredBuffer = instanceData.memberStates[memberKey].history;
          
          savedState.history.entries.forEach((entry, index) => {
            if (entry && index < savedState.history.count) {
              restoredBuffer.entries[index] = entry;
            }
          });
          
          restoredBuffer.head = savedState.history.head || 0;
          restoredBuffer.count = savedState.history.count || 0;
        }
      });
      
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Loaded member states for', Object.keys(instanceData.memberStates).length, 'members with dual key support');
      }
    } catch (e) {
      console.error('Data: Error loading member states:', e);
      instanceData.memberStates = {};
    }
  }
};

/**
 * Save member states to session storage
 */
Dashboard.data.saveMemberStates = function() {
  if (!Dashboard.state.currentSite) {
    return;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const serializable = {};
  
  Object.keys(instanceData.memberStates).forEach(memberKey => {
    const state = instanceData.memberStates[memberKey];
    
    const historyEntries = [];
    for (let i = 0; i < state.history.count; i++) {
      const entry = state.history.entries[i];
      if (entry) {
        historyEntries.push(entry);
      }
    }
    
    serializable[memberKey] = {
      baseline: state.baseline,
      current: state.current,
      needsAck: state.needsAck,
      lastSeen: state.lastSeen,
      history: {
        entries: historyEntries,
        head: state.history.head,
        count: state.history.count
      },
      // Save key references for dual key support
      primaryKey: state.primaryKey,
      secondaryKey: state.secondaryKey
    };
  });
  
  try {
    const storageKey = Dashboard.core.getStorageKey('memberStates_' + Dashboard.state.currentSite);
    sessionStorage.setItem(storageKey, JSON.stringify(serializable));
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Saved member states for', Object.keys(serializable).length, 'members with dual key support');
    }
  } catch (e) {
    console.error('Data: Error saving member states:', e);
    if (e.name === 'QuotaExceededError') {
      Dashboard.data.performEmergencyCleanup();
    }
  }
};

/**
 * Load custom pool ordering from session storage
 */
Dashboard.data.loadCustomOrder = function() {
  const instanceData = Dashboard.data.getInstanceData();
  const storageKey = Dashboard.core.getStorageKey('poolCustomOrder_' + Dashboard.state.currentSite);
  const savedOrder = sessionStorage.getItem(storageKey);
  if (savedOrder) {
    try {
      instanceData.customOrder = JSON.parse(savedOrder);
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Loaded custom order for', Object.keys(instanceData.customOrder).length, 'pools');
      }
    } catch (e) {
      console.error('Data: Error loading custom order:', e);
      instanceData.customOrder = {};
    }
  }
};

/**
 * Save custom pool ordering to session storage
 */
Dashboard.data.saveCustomOrder = function() {
  if (Dashboard.state.currentSite) {
    const instanceData = Dashboard.data.getInstanceData();
    const storageKey = Dashboard.core.getStorageKey('poolCustomOrder_' + Dashboard.state.currentSite);
    sessionStorage.setItem(storageKey, JSON.stringify(instanceData.customOrder));
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Saved custom order for', Object.keys(instanceData.customOrder).length, 'pools');
    }
  }
};

/**
 * Safely enable logger functionality
 */
Dashboard.data.enableLogger = function() {
  const instanceData = Dashboard.data.getInstanceData();
  
  instanceData.logger.enabled = true;
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Logger enabled - state changes will be logged');
  }
  
  if (instanceData.logger.pendingLogs.length > 0) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Processing', instanceData.logger.pendingLogs.length, 'pending logs');
    }
    instanceData.logger.pendingLogs.forEach(log => {
      Dashboard.data.safeLogMemberChange(log.fromStatus, log.toStatus, log.member, log.pool, log.siteName, log.hostname);
    });
    instanceData.logger.pendingLogs = [];
  }
};

/**
 * Disable logger functionality
 */
Dashboard.data.disableLogger = function() {
  const instanceData = Dashboard.data.getInstanceData();
  
  instanceData.logger.enabled = false;
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Logger disabled');
  }
};

/**
 * Safely log member state change with hostname support
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status  
 * @param {string} member - Member display text (hostname:port or ip:port)
 * @param {string} pool - Pool name
 * @param {string} siteName - Site name
 * @param {string} hostname - Hostname
 */
Dashboard.data.safeLogMemberChange = function(fromStatus, toStatus, member, pool, siteName, hostname) {
  const instanceData = Dashboard.data.getInstanceData();
  if (!instanceData.logger.enabled) return;
  
  let loggerAddEntry = null;
  
  // Try multiple paths to find the logger's addLogEntry function
  if (Dashboard.logger && Dashboard.logger.addLogEntry) {
    loggerAddEntry = Dashboard.logger.addLogEntry;
  } else if (Dashboard.ui && Dashboard.ui.addLogEntry) {
    loggerAddEntry = Dashboard.ui.addLogEntry;
  }
  
  if (loggerAddEntry) {
    try {
      loggerAddEntry(fromStatus, toStatus, member, pool, siteName, hostname);
    } catch (error) {
      console.warn('Data: Logger error, storing for later:', error.message);
      Dashboard.data.storePendingLog(fromStatus, toStatus, member, pool, siteName, hostname);
    }
  } else {
    Dashboard.data.storePendingLog(fromStatus, toStatus, member, pool, siteName, hostname);
  }
};

/**
 * Store log entry for later processing when logger becomes available
 */
Dashboard.data.storePendingLog = function(fromStatus, toStatus, member, pool, siteName, hostname) {
  const instanceData = Dashboard.data.getInstanceData();
  instanceData.logger.pendingLogs.push({
    fromStatus, toStatus, member, pool, siteName, hostname, timestamp: Date.now()
  });
  
  const maxPendingLogs = 50;
  if (instanceData.logger.pendingLogs.length > maxPendingLogs) {
    const removed = instanceData.logger.pendingLogs.shift();
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Removed oldest pending log to prevent memory buildup');
    }
  }
  
  setTimeout(() => {
    if (instanceData.logger.enabled) {
      const hasLogger = (Dashboard.logger && Dashboard.logger.addLogEntry) || (Dashboard.ui && Dashboard.ui.addLogEntry);
      if (hasLogger) {
        const pending = instanceData.logger.pendingLogs.shift();
        if (pending) {
          Dashboard.data.safeLogMemberChange(pending.fromStatus, pending.toStatus, pending.member, pending.pool, pending.siteName, pending.hostname);
        }
      }
    }
  }, 1000);
};

/**
 * Legacy function name for backward compatibility
 */
Dashboard.data.logMemberChange = Dashboard.data.safeLogMemberChange;

/**
 * Emergency cleanup when storage quota is exceeded
 */
Dashboard.data.performEmergencyCleanup = function() {
  const instanceData = Dashboard.data.getInstanceData();
  Object.keys(instanceData.memberStates).forEach(memberKey => {
    const state = instanceData.memberStates[memberKey];
    if (state.history && state.history.count > 10) {
      const recentEntries = Dashboard.data.getRecentEntries(state.history, 10);
      state.history = Dashboard.data.createCircularBuffer(10);
      recentEntries.reverse().forEach(entry => {
        Dashboard.data.addToBuffer(state.history, entry);
      });
    }
  });
  
  instanceData.memberStateCache.clear();
  Dashboard.data.clearPendingLogs();
  
  try {
    Dashboard.data.saveMemberStates();
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Emergency cleanup successful - reduced history size');
    }
  } catch (e) {
    console.error('Data: Emergency cleanup failed:', e);
  }
};

/**
 * Get summary of all members with status changes (hostname-aware)
 * @returns {Array} Array of member change summaries
 */
Dashboard.data.getChangedMembersSummary = function() {
  const instanceData = Dashboard.data.getInstanceData();
  const changedMembers = [];
  
  Object.keys(instanceData.memberStates).forEach(function(memberKey) {
    const memberState = instanceData.memberStates[memberKey];
    
    if (memberState.needsAck) {
      const recentHistory = Dashboard.data.getRecentEntries(memberState.history, 1);
      const lastChange = recentHistory[0];
      
      changedMembers.push({
        memberKey: memberKey,
        baseline: memberState.baseline,
        current: memberState.current,
        lastSeen: new Date(memberState.lastSeen).toLocaleTimeString(),
        lastChange: lastChange ? new Date(lastChange.timestamp).toLocaleTimeString() : 'Unknown',
        historyCount: memberState.history.count
      });
    }
  });
  
  return changedMembers;
};

/**
 * Get memory usage statistics including hostname cache
 * @returns {Object} Memory usage information
 */
Dashboard.data.getMemoryStats = function() {
  const instanceData = Dashboard.data.getInstanceData();
  const memberCount = Object.keys(instanceData.memberStates).length;
  const totalHistoryEntries = Object.values(instanceData.memberStates).reduce((total, state) => {
    return total + (state.history ? state.history.count : 0);
  }, 0);
  
  const bytesPerMember = 200;
  const bytesPerHistoryEntry = 40;
  const bytesPerCacheEntry = 50;
  const cacheSize = instanceData.memberStateCache.size;
  const pendingLogsSize = instanceData.logger.pendingLogs.length;
  const hostnameCacheSize = Dashboard.data.getHostnameCacheSize();
  
  const estimatedMemory = (memberCount * bytesPerMember) + 
                         (totalHistoryEntries * bytesPerHistoryEntry) + 
                         (cacheSize * bytesPerCacheEntry) +
                         (pendingLogsSize * 100) +
                         (hostnameCacheSize * 60); // hostname cache entries
  
  return {
    memberCount: memberCount,
    totalHistoryEntries: totalHistoryEntries,
    cacheSize: cacheSize,
    pendingLogsCount: pendingLogsSize,
    hostnameCacheSize: hostnameCacheSize,
    maxPossibleEntries: memberCount * instanceData.config.maxHistoryEntries,
    estimatedMemoryBytes: estimatedMemory,
    estimatedMemoryMB: (estimatedMemory / 1024 / 1024).toFixed(2),
    maxMemoryMB: ((memberCount * instanceData.config.maxHistoryEntries * bytesPerHistoryEntry) / 1024 / 1024).toFixed(2),
    loggerEnabled: instanceData.logger.enabled
  };
};

// =============================================================================
// EVENT HANDLING AND USER INTERACTIONS
// =============================================================================

/**
 * Handle drag start event
 * @param {Event} e - Drag start event
 */
Dashboard.data.handleDragStart = function(e) {
  const instanceData = Dashboard.data.getInstanceData();
  instanceData.draggedElement = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.outerHTML);
};

/**
 * Handle drag end event
 * @param {Event} e - Drag end event
 */
Dashboard.data.handleDragEnd = function(e) {
  const instanceData = Dashboard.data.getInstanceData();
  e.target.classList.remove('dragging');
  instanceData.draggedElement = null;
  
  document.querySelectorAll('.pool-container').forEach(function(container) {
    container.classList.remove('drag-over');
  });
};

/**
 * Handle drag over event
 * @param {Event} e - Drag over event
 */
Dashboard.data.handleDragOver = function(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  
  e.dataTransfer.dropEffect = 'move';
  e.target.closest('.pool-container').classList.add('drag-over');
  
  return false;
};

/**
 * Handle drop event
 * @param {Event} e - Drop event
 */
Dashboard.data.handleDrop = function(e) {
  const instanceData = Dashboard.data.getInstanceData();
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  const dropTarget = e.target.closest('.pool-container');
  dropTarget.classList.remove('drag-over');
  
  if (instanceData.draggedElement !== dropTarget) {
    const draggedPoolName = instanceData.draggedElement.getAttribute('data-pool-name');
    const targetPoolName = dropTarget.getAttribute('data-pool-name');
    
    Dashboard.data.updateCustomOrder(draggedPoolName, targetPoolName);
    
    try {
      const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
      const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
      if (currentData.pools && Dashboard.ui && Dashboard.ui.renderPoolData) {
        Dashboard.ui.renderPoolData(currentData);
      }
    } catch (e) {
      console.error('Data: Error parsing currentPoolData for re-render after drop:', e);
    }
  }
  
  instanceData.draggedElement = null;
  
  return false;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse member address to handle both IPv4 and IPv6 formats
 * @param {string} memberText - Member address text (could be hostname:port or ip:port)
 * @returns {Object} Parsed result with ip, port, and isValid properties
 */
Dashboard.data.parseMemberAddress = function(memberText) {
  if (!memberText || typeof memberText !== 'string') {
    return { ip: '', port: '', isValid: false };
  }
  
  const text = memberText.trim();
  
  // Handle hostname:port format - but don't return hostname as IP (this breaks state tracking)
  if (!text.match(/^\d/) && !text.startsWith('[') && text.includes(':')) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: parseMemberAddress called with hostname format - this should not be used for state tracking:', text);
    }
    return { ip: '', port: '', isValid: false }; // Reject hostname parsing for state tracking
  }
  
  // Handle bracketed IPv6 format: [2607:f8b0:4004:c23::64]:80
  if (text.startsWith('[') && text.includes(']:')) {
    const bracketEnd = text.indexOf(']:');
    const ip = text.substring(1, bracketEnd);
    const port = text.substring(bracketEnd + 2);
    
    if (ip.length > 0 && port.length > 0 && !isNaN(parseInt(port))) {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Parsed bracketed IPv6:', ip, 'port:', port);
      }
      return { ip: ip, port: port, isValid: true };
    }
  }
  
  // Handle IPv6 with dot separator: 2607:f8b0:4004:c23::64.80
  if (text.includes(':') && text.includes('.') && !text.includes(']:')) {
    const lastDotIndex = text.lastIndexOf('.');
    const ip = text.substring(0, lastDotIndex);
    const port = text.substring(lastDotIndex + 1);
    
    if ((ip.includes('::') || (ip.split(':').length >= 3)) && 
        port.length > 0 && !isNaN(parseInt(port))) {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Parsed dot-separated IPv6:', ip, 'port:', port);
      }
      return { ip: ip, port: port, isValid: true };
    }
  }
  
  // Handle IPv6 with colon separator: 2607:f8b0:4004:c25::64:0
  if (text.includes(':') && (text.includes('::') || text.split(':').length > 2)) {
    const lastColonIndex = text.lastIndexOf(':');
    const ip = text.substring(0, lastColonIndex);
    const port = text.substring(lastColonIndex + 1);
    
    if ((ip.includes('::') || ip.split(':').length >= 2) && 
        port.length > 0 && !isNaN(parseInt(port)) && port.indexOf(':') === -1) {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('Data: Parsed colon-separated IPv6:', ip, 'port:', port);
      }
      return { ip: ip, port: port, isValid: true };
    }
  }
  
  // Handle standard IPv4 format: 192.168.1.1:80
  if (text.includes(':') && !text.includes('::')) {
    const parts = text.split(':');
    if (parts.length === 2) {
      const ip = parts[0].trim();
      const port = parts[1].trim();
      
      const ipParts = ip.split('.');
      if (ipParts.length === 4 && ip.length > 0 && port.length > 0 && !isNaN(parseInt(port))) {
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('Data: Parsed IPv4:', ip, 'port:', port);
        }
        return { ip: ip, port: port, isValid: true };
      }
    }
  }
  
  console.warn('Data: Could not parse member address format:', text);
  return { ip: '', port: '', isValid: false };
};

/**
 * Generate consistent member key for both IPv4, IPv6, and hostname addresses
 * @param {string} poolName - Pool name
 * @param {string} ip - IP address, IPv6 address, or hostname
 * @param {string} port - Port number
 * @returns {string} Consistent member key
 */
Dashboard.data.generateMemberKey = function(poolName, ip, port) {
  let normalizedIp = ip;
  return poolName + '_' + normalizedIp + ':' + port;
};

/**
 * NEW: Generate both IP-based and hostname-based member keys for comprehensive lookup
 * @param {string} poolName - Pool name
 * @param {string} ip - IP address
 * @param {string} port - Port number
 * @param {string} hostname - Hostname (optional)
 * @returns {Object} Object with primaryKey (IP-based) and secondaryKey (hostname-based)
 */
Dashboard.data.generateMemberKeys = function(poolName, ip, port, hostname = null) {
  const primaryKey = poolName + '_' + ip + ':' + port;
  let secondaryKey = null;
  
  if (hostname && hostname !== ip && hostname !== null && hostname !== undefined) {
    secondaryKey = poolName + '_' + hostname + ':' + port;
  }
  
  return { primaryKey, secondaryKey };
};

/**
 * Extract actual IP address from member object for state tracking
 * @param {Object} member - Member object with ip and potentially hostname fields
 * @returns {string} IP address for state tracking
 */
Dashboard.data.extractMemberIP = function(member) {
  // Always use the IP field for state tracking, regardless of hostname presence
  return member.ip || '';
};

/**
 * Create a new circular buffer for member history
 * @param {number} size - Maximum number of entries (default: 50)
 * @returns {Object} Circular buffer object
 */
Dashboard.data.createCircularBuffer = function(size = 50) {
  return {
    entries: new Array(size),
    head: 0,
    count: 0,
    maxSize: size
  };
};

/**
 * Add entry to circular buffer
 * @param {Object} buffer - Circular buffer object
 * @param {Object} entry - Entry to add {timestamp, from, to}
 */
Dashboard.data.addToBuffer = function(buffer, entry) {
  buffer.entries[buffer.head] = entry;
  buffer.head = (buffer.head + 1) % buffer.maxSize;
  
  if (buffer.count < buffer.maxSize) {
    buffer.count++;
  }
};

/**
 * Get recent entries from circular buffer
 * @param {Object} buffer - Circular buffer object
 * @param {number} count - Number of recent entries to get (default: all)
 * @returns {Array} Array of recent entries, newest first
 */
Dashboard.data.getRecentEntries = function(buffer, count = buffer.count) {
  if (buffer.count === 0) return [];
  
  const result = [];
  const maxEntries = Math.min(count, buffer.count);
  
  for (let i = 0; i < maxEntries; i++) {
    const index = (buffer.head - 1 - i + buffer.maxSize) % buffer.maxSize;
    if (buffer.entries[index]) {
      result.push(buffer.entries[index]);
    }
  }
  
  return result;
};

/**
 * Clear pending logs to prevent memory accumulation
 */
Dashboard.data.clearPendingLogs = function() {
  const instanceData = Dashboard.data.getInstanceData();
  const logCount = instanceData.logger.pendingLogs.length;
  instanceData.logger.pendingLogs = [];
  
  if (logCount > 0) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Cleared', logCount, 'pending logs to free memory');
    }
  }
};

/**
 * Reset dragged element reference to prevent memory leaks
 */
Dashboard.data.clearDraggedElement = function() {
  const instanceData = Dashboard.data.getInstanceData();
  if (instanceData.draggedElement) {
    instanceData.draggedElement = null;
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Cleared dragged element reference');
    }
  }
};

console.log('Dashboard Data module loaded successfully');
