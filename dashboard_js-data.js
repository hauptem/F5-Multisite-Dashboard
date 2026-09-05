// Multi-Site Dashboard JavaScript - DATA MODULE
// Dashboard Version: 2.1
// Dashboard JSON:    2.1
// Author: Eric Haupt
// License: MIT
//
// Copyright (c) 2026 Eric Haupt
// Released under the MIT License. See LICENSE file for details.
//
// Description: Member state tracking, custom pool order, DNS hostname caching,
// and per-site preference persistence

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
      memberStateCache: new Map(),
      config: {
        maxHistoryEntries: 50,
        maxMembersSupported: 1000
      },
      hostnameCache: {
        maxEntries: 5000,
        chunkSize: 64,
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
  Dashboard.data.loadAliasMode();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Initialization complete with DNS hostname caching and alias mode persistence for instance:', Dashboard.core.instanceID);
  }
};

/**
 * Initialize hostname cache configuration
 * Resolved hostnames live in sessionStorage only; this object carries the
 * size limits and key prefix used by the direct read/write functions
 */
Dashboard.data.initializeHostnameCache = function() {
  const instanceData = Dashboard.data.getInstanceData();
  
  instanceData.hostnameCache = {
    maxEntries: 5000,
    chunkSize: 64,
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
 * Update member states from an API response, storing each member under an
 * IP-based primary key with a hostname-based secondary key for lookups
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
    
    // Canonical name is the state-key prefix. Bare names duplicate across
    // partitions; canonical prefixes keep same-named pools' baselines,
    // acknowledgments, and history fully isolated
    const canonicalPoolName = Dashboard.core.getCanonicalPoolName(pool);
    
    pool.members.forEach(function(member) {
      // Generate both IP-based (primary) and hostname-based (secondary) keys
      const memberIP = Dashboard.data.extractMemberIP(member);
      const keys = Dashboard.data.generateMemberKeys(
        canonicalPoolName, 
        memberIP, 
        member.port, 
        member.hostname
      );
      
      const primaryKey = keys.primaryKey;
      const secondaryKey = keys.secondaryKey;
      
      // Always use primary key (IP-based) for state storage
      let currentState = instanceData.memberStates[primaryKey];
      
      // Migrate state stored under a hostname key to the IP key. DNS results
      // arrive after members are first seen, so a member can be keyed by
      // hostname from an earlier cycle; without this reconciliation its
      // baseline and acknowledgment state would silently reset the moment
      // the same member reappears under its IP key
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
        member.hostname : Dashboard.ui.formatMemberIP(memberIP);
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
          
          Dashboard.data.logMemberChange(previousStatus, member.status, displayMember, canonicalPoolName, siteName);
          
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
 * Check if member status has changed, with dual key lookup support
 * @param {string} canonicalPoolName - Name of the pool (canonical: bare for Common, full path otherwise)
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 * @returns {boolean} True if status needs acknowledgment
 */
Dashboard.data.hasMemberStatusChanged = function(canonicalPoolName, memberAddress, memberPort) {
  const instanceData = Dashboard.data.getInstanceData();
  
  // Try primary key first (IP-based)
  let memberKey = Dashboard.data.generateMemberKey(canonicalPoolName, memberAddress, memberPort);
  
  // Check cache first for O(1) lookup performance
  if (instanceData.memberStateCache.has(memberKey)) {
    return instanceData.memberStateCache.get(memberKey);
  }
  
  let memberState = instanceData.memberStates[memberKey];
  
  // If not found and memberAddress looks like a hostname, search by secondary key
  if (!memberState && !memberAddress.match(/^\d+\.\d+\.\d+\.\d+(%\d+)?$/) && !memberAddress.includes('::') && !memberAddress.startsWith('[')) {
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
 * @param {string} canonicalPoolName - Name of the pool (canonical: bare for Common, full path otherwise)
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 */
Dashboard.data.acknowledgeMemberChange = function(canonicalPoolName, memberAddress, memberPort) {
  const instanceData = Dashboard.data.getInstanceData();
  
  // Safety check: ensure we're not trying to acknowledge with a hostname.
  // Route-domain members (172.16.32.1%2) are valid IPs and must pass -
  // the anchored IPv4 test alone rejects them and silently breaks
  // acknowledgment for every route-domain member
  if (!memberAddress.match(/^\d+\.\d+\.\d+\.\d+(%\d+)?$/) && !memberAddress.includes(':') && !memberAddress.startsWith('[')) {
    console.error('Data: acknowledgeMemberChange called with hostname instead of IP address:', memberAddress);
    console.error('Data: This indicates a bug in the event handling - should always use actual IP addresses');
    return;
  }
  
  // Try to find the member state using either IP or hostname
  let memberKey = Dashboard.data.generateMemberKey(canonicalPoolName, memberAddress, memberPort);
  let memberState = instanceData.memberStates[memberKey];
  
  // If not found and looks like hostname, search by secondary key
  if (!memberState && !memberAddress.match(/^\d+\.\d+\.\d+\.\d+(%\d+)?$/) && !memberAddress.includes('::') && !memberAddress.startsWith('[')) {
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
 * Reset all member states in memory and the current site's stored copy, so
 * the cleared badges do not return on reload
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
  
  // Clear the current site's stored states
  if (Dashboard.state.currentSite) {
    try {
      sessionStorage.removeItem(Dashboard.core.getStorageKey('memberStates_' + Dashboard.state.currentSite));
    } catch (e) {
      console.error('Data: Error clearing stored member states:', e);
    }
  }
  
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
    console.log('Data: Member state reset complete - cleared', totalStatesBefore, 'states');
  }
};

/**
 * Drop all in-memory member state for the current site
 * Called on site change after the previous site's states are saved, so the
 * next site's first poll seeds baselines instead of diffing against
 * another site's members under colliding keys
 */
Dashboard.data.clearMemberStates = function() {
  const instanceData = Dashboard.data.getInstanceData();
  instanceData.memberStates = {};
  instanceData.memberStateCache.clear();
};

/**
 * Get member state information including recent history (hostname-aware)
 * @param {string} canonicalPoolName - Name of the pool (canonical: bare for Common, full path otherwise)
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 * @returns {Object|null} Member state object or null if not found
 */
Dashboard.data.getMemberState = function(canonicalPoolName, memberAddress, memberPort) {
  const instanceData = Dashboard.data.getInstanceData();
  let memberKey = Dashboard.data.generateMemberKey(canonicalPoolName, memberAddress, memberPort);
  let memberState = instanceData.memberStates[memberKey];
  
  // If not found and looks like hostname, search by secondary key
  if (!memberState && !memberAddress.match(/^\d+\.\d+\.\d+\.\d+(%\d+)?$/) && !memberAddress.includes('::') && !memberAddress.startsWith('[')) {
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
 * @param {string} canonicalPoolName - Name of the pool (canonical: bare for Common, full path otherwise)
 * @param {string} memberAddress - Either IP address or hostname
 * @param {string} memberPort - Port of the member
 * @param {number} count - Number of recent changes to get
 * @returns {Array} Array of recent changes, newest first
 */
Dashboard.data.getMemberHistory = function(canonicalPoolName, memberAddress, memberPort, count = 10) {
  const memberState = Dashboard.data.getMemberState(canonicalPoolName, memberAddress, memberPort);
  if (!memberState || !memberState.history) {
    return [];
  }
  
  return Dashboard.data.getRecentEntries(memberState.history, count);
};

// =============================================================================
// DOM MANAGEMENT AND UI STATE CONTROL
// =============================================================================

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
    // data-canonical-name is the identity attribute; data-pool-name is the
    // bare name and duplicates across partitions
    const canonicalPoolName = container.getAttribute('data-canonical-name');
    currentOrder[canonicalPoolName] = index;
  });
  
  const draggedIndex = currentOrder[draggedPool];
  const targetIndex = currentOrder[targetPool];
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Swapping pools:', draggedPool, '(index:', draggedIndex, ') with', targetPool, '(index:', targetIndex, ')');
  }
  
  const newOrder = {};
  Object.keys(currentOrder).forEach(function(canonicalPoolName) {
    if (canonicalPoolName === draggedPool) {
      newOrder[canonicalPoolName] = targetIndex;
    } else if (canonicalPoolName === targetPool) {
      newOrder[canonicalPoolName] = draggedIndex;
    } else {
      newOrder[canonicalPoolName] = currentOrder[canonicalPoolName];
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
 * Read the current site's hostname cache from sessionStorage in one parse
 * Callers walk the returned entries map directly rather than reading per IP,
 * which would re-parse the cache for every member
 * @returns {Object} Cache object with entries, timestamp, and siteId; empty entries when absent
 */
Dashboard.data.readHostnameCache = function() {
  const cacheData = {
    entries: {},
    timestamp: Date.now(),
    siteId: Dashboard.state ? Dashboard.state.currentSite : ''
  };
  
  if (!Dashboard.state || !Dashboard.state.currentSite) {
    return cacheData;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const cacheKey = Dashboard.core.getStorageKey(instanceData.hostnameCache.persistencePrefix + Dashboard.state.currentSite);
  
  try {
    const savedCache = sessionStorage.getItem(cacheKey);
    if (savedCache) {
      const parsed = JSON.parse(savedCache);
      if (parsed && parsed.entries) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Data: Error reading hostname cache:', e);
  }
  
  return cacheData;
};

/**
 * Write the current site's hostname cache to sessionStorage in one call
 * Prunes to 80% of maxEntries when the limit is exceeded
 * @param {Object} cacheData - Cache object as returned by readHostnameCache
 */
Dashboard.data.writeHostnameCache = function(cacheData) {
  if (!Dashboard.state || !Dashboard.state.currentSite || !cacheData) {
    return;
  }
  
  const instanceData = Dashboard.data.getInstanceData();
  const cacheKey = Dashboard.core.getStorageKey(instanceData.hostnameCache.persistencePrefix + Dashboard.state.currentSite);
  
  try {
    cacheData.timestamp = Date.now();
    cacheData.siteId = Dashboard.state.currentSite;
    
    const entryCount = Object.keys(cacheData.entries).length;
    if (entryCount > instanceData.hostnameCache.maxEntries) {
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
    
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    
  } catch (e) {
    console.error('Data: Error saving hostname cache:', e);
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
  
  return Object.keys(Dashboard.data.readHostnameCache().entries).length;
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
  const cached = Dashboard.data.readHostnameCache().entries;
  
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
          if (!cached[ip]) {
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
  // The iRule accepts at most 50 numbered headers and ignores the whole set
  // above that. Send the first 50 chunks; the remainder are still uncached
  // and go on the next Resolve click
  const maxHeaders = 50;
  let headerCount = 0;
  
  for (let i = 0; i < ipArray.length && headerCount < maxHeaders; i += chunkSize) {
    headerCount++;
    const chunk = ipArray.slice(i, i + chunkSize);
    headers[`X-Need-DNS-IPs-${headerCount}`] = chunk.join(',');
  }
  
  if (ipArray.length > maxHeaders * chunkSize) {
    console.warn('Data: DNS resolution limited to', maxHeaders * chunkSize, 'of', ipArray.length, 'IPs per request - click Resolve again for the rest');
  }
  
  headers['X-Need-DNS-Count'] = headerCount.toString();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('Data: Built need-DNS headers -', headerCount, 'headers for', ipArray.length, 'IPs');
  }
  
  return headers;
};

/**
 * Merge API response with cached hostnames 
 * @param {Object} apiResponse - API response from backend
 * @returns {Object} Enhanced API response with cached hostnames filled in
 */
Dashboard.data.mergeWithHostnameCache = function(apiResponse) {
  if (!apiResponse || !apiResponse.pools) {
    return apiResponse;
  }
  
  let cacheHits = 0;
  let cacheMisses = 0;
  let newEntries = 0;
  
  // One cache read before the walk and one write after it; per-member access
  // would re-parse the whole site cache for every member
  const cacheData = Dashboard.data.readHostnameCache();
  
  apiResponse.pools.forEach(pool => {
    if (pool.members && Array.isArray(pool.members)) {
      pool.members.forEach(member => {
        const ip = member.ip;
        
        if (member.hostname === null) {
          // Backend sent no hostname - fill from the cache
          const cachedHostname = cacheData.entries[ip];
          if (cachedHostname) {
            member.hostname = cachedHostname;
            cacheHits++;
          } else {
            cacheMisses++;
          }
        } else {
          // Backend resolved a hostname - record it for future cycles
          cacheData.entries[ip] = member.hostname;
          newEntries++;
        }
      });
    }
  });
  
  if (newEntries > 0) {
    Dashboard.data.writeHostnameCache(cacheData);
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const cacheSize = Dashboard.data.getHostnameCacheSize ? Dashboard.data.getHostnameCacheSize() : 0;
    console.log('Data: Hostname merge complete - Cache hits:', cacheHits, 
               'Cache misses:', cacheMisses, 'New entries:', newEntries,
               'Total cached:', cacheSize);
  }
  
  return apiResponse;
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
 * Save view mode preference for a specific site
 */
Dashboard.data.saveViewModeForSite = function(siteName, viewMode) {
  if (!siteName) return;
  
  const storageKey = Dashboard.core.getStorageKey('viewMode_' + siteName);
  try {
    sessionStorage.setItem(storageKey, viewMode);
  } catch (e) {
    console.error('Data: Error saving view mode for site:', e);
  }
};

/**
 * Load view mode preference for a specific site
 */
Dashboard.data.loadViewModeForSite = function(siteName) {
  // Sites without a saved mode use the cookie preference the page was served with
  const defaultMode = (window.dashboardConfig && window.dashboardConfig.currentViewMode) || 'micro';
  if (!siteName) return defaultMode;
  
  const storageKey = Dashboard.core.getStorageKey('viewMode_' + siteName);
  try {
    const savedMode = sessionStorage.getItem(storageKey);
    const validModes = ['macro', 'micro'];
    
    if (savedMode && validModes.includes(savedMode)) {
      return savedMode;
    }
  } catch (e) {
    console.error('Data: Error loading view mode for site:', e);
  }
  
  return defaultMode;
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
    
    // Fields loadMemberStates defaults (primaryKey to the map key,
    // secondaryKey to null, history to an empty buffer) are written only when
    // they carry information; a steady member serializes to about 90 bytes
    // instead of 220
    const record = {
      baseline: state.baseline,
      current: state.current,
      needsAck: state.needsAck,
      lastSeen: state.lastSeen
    };
    if (state.history.count > 0) {
      record.history = {
        entries: historyEntries,
        head: state.history.head,
        count: state.history.count
      };
    }
    if (state.primaryKey && state.primaryKey !== memberKey) {
      record.primaryKey = state.primaryKey;
    }
    if (state.secondaryKey) {
      record.secondaryKey = state.secondaryKey;
    }
    serializable[memberKey] = record;
  });
  
  try {
    const storageKey = Dashboard.core.getStorageKey('memberStates_' + Dashboard.state.currentSite);
    sessionStorage.setItem(storageKey, JSON.stringify(serializable));
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Saved member states for', Object.keys(serializable).length, 'members with dual key support');
    }
  } catch (e) {
    console.error('Data: Error saving member states:', e);
    // performEmergencyCleanup retries this save; the guard keeps a retry that
    // also exceeds quota from re-entering cleanup
    if (e.name === 'QuotaExceededError' && !Dashboard.data.emergencyCleanupActive) {
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
  // Reset first: a site with no saved order otherwise inherits the previous site's
  instanceData.customOrder = {};
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
 * Log a member status change through the logger module
 * The logger initializes on DOMContentLoaded; a change seen before that has
 * no baseline to differ from, so nothing is queued for it
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status
 * @param {string} member - Member display text (hostname:port or ip:port)
 * @param {string} pool - Canonical pool name
 * @param {string} siteName - Site name
 */
Dashboard.data.logMemberChange = function(fromStatus, toStatus, member, pool, siteName) {
  if (Dashboard.logger.state && Dashboard.logger.state.initialized) {
    Dashboard.logger.addLogEntry(fromStatus, toStatus, member, pool, siteName);
  }
};

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
  
  // Evict other sites' stored member states. The current site's badges are
  // what the operator is looking at; an evicted site re-seeds its baselines
  // on the next visit
  try {
    const prefix = Dashboard.core.getStorageKey('memberStates_');
    const keep = prefix + Dashboard.state.currentSite;
    const evict = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key.startsWith(prefix) && key !== keep) {
        evict.push(key);
      }
    }
    evict.forEach(key => sessionStorage.removeItem(key));
    if (evict.length > 0) {
      console.warn('Data: Storage quota reached - evicted stored member states for', evict.length, 'other site(s)');
    }
  } catch (e) {
    console.error('Data: Error evicting stored member states:', e);
  }
  
  Dashboard.data.emergencyCleanupActive = true;
  try {
    Dashboard.data.saveMemberStates();
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('Data: Emergency cleanup successful - reduced history size');
    }
  } catch (e) {
    console.error('Data: Emergency cleanup failed:', e);
  }
  Dashboard.data.emergencyCleanupActive = false;
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
  const hostnameCacheSize = Dashboard.data.getHostnameCacheSize();
  
  const estimatedMemory = (memberCount * bytesPerMember) + 
                         (totalHistoryEntries * bytesPerHistoryEntry) + 
                         (cacheSize * bytesPerCacheEntry) +
                         (hostnameCacheSize * 60); // hostname cache entries
  
  return {
    memberCount: memberCount,
    totalHistoryEntries: totalHistoryEntries,
    cacheSize: cacheSize,
    hostnameCacheSize: hostnameCacheSize,
    maxPossibleEntries: memberCount * instanceData.config.maxHistoryEntries,
    estimatedMemoryBytes: estimatedMemory,
    estimatedMemoryMB: (estimatedMemory / 1024 / 1024).toFixed(2),
    maxMemoryMB: ((memberCount * instanceData.config.maxHistoryEntries * bytesPerHistoryEntry) / 1024 / 1024).toFixed(2)
  };
};

// =============================================================================
// EVENT HANDLING AND USER INTERACTIONS
// =============================================================================

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate consistent member key for both IPv4, IPv6, and hostname addresses
 * @param {string} canonicalPoolName - Pool name (canonical: bare for Common, full path otherwise)
 * @param {string} ip - IP address, IPv6 address, or hostname
 * @param {string} port - Port number
 * @returns {string} Consistent member key
 */
Dashboard.data.generateMemberKey = function(canonicalPoolName, ip, port) {
  return canonicalPoolName + '_' + ip + ':' + port;
};

/**
 * Generate both IP-based and hostname-based member keys
 * The IP key is authoritative for state storage because IPs are stable
 * across polls; the hostname key exists so lookups made from displayed
 * addresses still resolve to the same state after DNS resolution
 * @param {string} canonicalPoolName - Pool name (canonical: bare for Common, full path otherwise)
 * @param {string} ip - IP address
 * @param {string} port - Port number
 * @param {string} hostname - Hostname (optional)
 * @returns {Object} Object with primaryKey (IP-based) and secondaryKey (hostname-based)
 */
Dashboard.data.generateMemberKeys = function(canonicalPoolName, ip, port, hostname = null) {
  const primaryKey = canonicalPoolName + '_' + ip + ':' + port;
  let secondaryKey = null;
  
  if (hostname && hostname !== ip) {
    secondaryKey = canonicalPoolName + '_' + hostname + ':' + port;
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

console.log('Dashboard Data module loaded successfully');