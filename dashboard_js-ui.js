// Multi-Site Dashboard JavaScript - UI MODULE
// Dashboard Version: 1.8
// Dashboard JSON:    1.8
// Author: Eric Haupt
// License: MIT
//
// Copyright (c) 2025 Eric Haupt
// Released under the MIT License. See LICENSE file for details.
//
// Description: UI rendering, search filtering, visual state management, 
// MACRO/MICRO view mode support, search recall and save, and integrated grid management

// =============================================================================
// MODULE INITIALIZATION
// =============================================================================

/**
 * Get instance-specific UI state container, creating if needed
 * @returns {Object} Instance-specific UI state container
 */
Dashboard.ui.getInstanceState = function() {
  if (!Dashboard.core.instanceID) {
    Dashboard.core.initializeInstanceIsolation();
  }
  
  if (!Dashboard.ui.instances) {
    Dashboard.ui.instances = {};
  }
  
  if (!Dashboard.ui.instances[Dashboard.core.instanceID]) {
    Dashboard.ui.instances[Dashboard.core.instanceID] = {
      searchFilter: '',
      searchFilterActive: false,
      hiddenPoolCount: 0,
      bottomBarVisible: true,
      savedSearches: {},
      resizeTimeout: null
    };
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Created new instance UI state container for:', Dashboard.core.instanceID);
    }
  }
  
  return Dashboard.ui.instances[Dashboard.core.instanceID];
};

/**
 * Initialize UI module with all required components and states
 */
Dashboard.ui.init = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Initializing UI module with grid integration');
  }
  
  // Initialize instance-specific state
  const instanceState = Dashboard.ui.getInstanceState();
  
  // Inject grid CSS early in initialization
  Dashboard.ui.addGridStyles();
  
  // Load persisted states
  Dashboard.ui.loadSearchFilter();
  
  // Load saved searches (global)
  Dashboard.ui.loadSavedSearches();
  
  // Initialize search filter functionality
  Dashboard.ui.addSearchFilterStyles();
  Dashboard.ui.addSearchKeyboardShortcuts();
  
  // Initialize top controls bar
  Dashboard.ui.initializeTopControlsBar();
  
  // Initialize header site info area
  Dashboard.ui.initializeHeaderSiteInfo();
  
  // Initialize responsive handling
  Dashboard.ui.initializeResponsiveHandling();
  
  // Logger compatibility
  Dashboard.ui.ensureLoggerCompatibility();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Initialization complete with grid integration');
  }
};

/**
 * Initialize responsive handling for grid updates
 */
Dashboard.ui.initializeResponsiveHandling = function() {
  // Add window resize listener with debouncing
  window.addEventListener('resize', function() {
    if (Dashboard.ui && Dashboard.ui.updateDynamicGrid) {
      const instanceState = Dashboard.ui.getInstanceState();
      clearTimeout(instanceState.resizeTimeout);
      instanceState.resizeTimeout = setTimeout(Dashboard.ui.updateDynamicGrid, 75);
    }
  });
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Responsive handling initialized with debounced resize events');
  }
};

/**
 * Initialize header site info area for displaying current site information
 */
Dashboard.ui.initializeHeaderSiteInfo = function() {
  let headerSiteInfo = document.getElementById('header-site-info');
  
  if (!headerSiteInfo) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: header-site-info not found, creating it');
    }
    
    let headerCenter = document.querySelector('.header-center');
    
    if (!headerCenter) {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('UI: header-center not found, creating header structure');
      }
      
      const header = document.querySelector('header');
      if (!header) {
        console.error('UI: No header element found');
        return;
      }
      
      const headerLeft = header.querySelector('.header-left');
      const headerRight = header.querySelector('.header-right');
      
      if (headerLeft && headerRight && !headerCenter) {
        headerCenter = document.createElement('div');
        headerCenter.className = 'header-center';
        header.insertBefore(headerCenter, headerRight);
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('UI: Created header-center div');
        }
      }
    }
    
    if (headerCenter) {
      headerSiteInfo = document.createElement('div');
      headerSiteInfo.id = 'header-site-info';
      headerSiteInfo.className = 'header-site-info';
      headerSiteInfo.style.display = 'none';
      headerSiteInfo.innerHTML = 'Site info loading...';
      
      headerCenter.appendChild(headerSiteInfo);
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('UI: Created header-site-info element');
      }
    } else {
      console.error('UI: Could not create or find header-center element');
    }
  } else {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: header-site-info element already exists');
    }
  }
};

/**
 * Initialize top controls bar with styling
 */
Dashboard.ui.initializeTopControlsBar = function() {
  Dashboard.ui.addTopControlsStyles();
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Top controls bar initialized');
  }
};

// =============================================================================
// GRID MANAGEMENT - CSS INJECTION AND DYNAMIC BEHAVIOR
// =============================================================================

/**
 * Inject grid-related CSS into the document
 */
Dashboard.ui.addGridStyles = function() {
  if (document.getElementById('dashboard-grid-styles')) {
    return; // Already injected
  }
  
  const style = document.createElement('style');
  style.id = 'dashboard-grid-styles';
  style.textContent = `
    /* =============================================================================
       DASHBOARD GRID STYLES - INJECTED BY UI MODULE
       ============================================================================= */
    
    /* Main grid container */
    .pools-grid {
      display: grid;
      gap: 20px;
      width: 100%;
      margin: 0 auto;
      padding: 0;
    }
    
    /* Individual pool container sizing */
	.pool-container {
	display: flex;
	flex-direction: column;
	height: 350px;
	min-height: 350px;
	max-height: 350px;
	}
    
    /* Table container layout */
    .table-container {
      border-radius: 4px;
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
      background-image: none;
    }
    
    /* Table layout structure */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 1.05em;
      table-layout: fixed;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    thead {
      flex-shrink: 0;
    }
    
    tbody {
      flex: 1;
      display: block;
      overflow-y: auto !important;
      height: 303px;
      max-height: 303px;
      padding-bottom: 8px;
      scroll-behavior: smooth;
      scrollbar-width: auto;
      scrollbar-color: var(--border-color) var(--bg-quaternary);
    }
    
    thead tr,
    tbody tr {
      display: table;
      width: 100%;
      table-layout: fixed;
      min-height: 48px;
      height: auto;
    }
    
    /* =============================================================================
       MACRO/MICRO VIEW MODE SUPPORT
       ============================================================================= */
    
    /* MICRO VIEW MODE STYLES */
    body.micro-view .pool-container {
      height: auto !important;
      min-height: auto !important;
      max-height: auto !important;
    }
    
    body.micro-view .table-container {
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
    }
    
    body.micro-view table {
	  height: auto !important;
	  display: table !important;
	  table-layout: fixed !important;
	  width: 100% !important;
	}
    
    body.micro-view thead {
      display: table-header-group !important;
    }
    
    body.micro-view thead tr {
      display: table-row !important;
      width: 100% !important;
    }
    
    body.micro-view thead th {
      display: table-cell !important;
      width: auto !important;
    }
    
    body.micro-view tbody {
      display: none !important;
    }
    
    /* Header styling adjustments for micro mode */
    body.micro-view th:first-child {
      width: 70% !important;
    }
    
    body.micro-view th:last-child {
      overflow: hidden !important;
    }
    
    body.micro-view th {
      border-bottom: none !important;
    }
    
    body.micro-view th:first-child {
      border-top-left-radius: 4px !important;
      border-bottom-left-radius: 4px !important;
    }
    
    body.micro-view th:last-child {
      border-top-right-radius: 4px !important;
      border-bottom-right-radius: 4px !important;
    }
  `;
  
  document.head.appendChild(style);
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Grid styles injected successfully');
  }
};

/**
 * Calculate optimal number of columns based on content and viewport
 * @param {number} visiblePools - Number of visible pools
 * @param {number} viewportWidth - Current viewport width
 * @returns {number} Optimal number of columns
 */
Dashboard.ui.calculateOptimalColumns = function(visiblePools, viewportWidth) {
  // Minimum viable pool width = ~300px
  const minPoolWidth = 300;
  const gridGap = 20;
  const containerPadding = 32; // 16px each side
  
  // Calculate maximum possible columns based on viewport
  const availableWidth = viewportWidth - containerPadding;
  const maxViewportColumns = Math.floor((availableWidth + gridGap) / (minPoolWidth + gridGap));
  
  // Determine optimal columns
  const maxContentColumns = Math.min(visiblePools, 4); // Never more than 4 or visible pool count
  const optimalColumns = Math.min(maxViewportColumns, maxContentColumns);
  
  return Math.max(1, optimalColumns); // Always at least 1 column
};

/**
 * Update grid columns based on clip detection 
 */
Dashboard.ui.updateDynamicGrid = function() {
  const poolsGrid = document.getElementById('pools-grid');
  if (!poolsGrid) return;
  
  // Count visible pools
  const visiblePools = document.querySelectorAll('.pool-container:not([style*="display: none"])').length;
  if (visiblePools === 0) return;
  
  // Get viewport constraints
  const viewportWidth = window.innerWidth;
  const containerPadding = 32;
  const gridGap = 20;
  const availableWidth = viewportWidth - containerPadding;
  const minPoolWidth = 320;
  
  // Calculate maximum possible columns based on viewport
  const maxViewportColumns = Math.floor((availableWidth + gridGap) / (minPoolWidth + gridGap));
  const maxContentColumns = Math.min(visiblePools, 4);
  const maxPossibleColumns = Math.min(maxViewportColumns, maxContentColumns);
  
  // Start with maximum columns and test for clipping
  let optimalColumns = maxPossibleColumns;
  
  for (let testColumns = maxPossibleColumns; testColumns >= 1; testColumns--) {
    // Temporarily apply column count to test clipping
    poolsGrid.style.gridTemplateColumns = `repeat(${testColumns}, 1fr)`;
    
    // Force layout calculation
    poolsGrid.offsetHeight;
    
    // Check for clipping in status badge containers (both modes)
    const clippedBadges = document.querySelectorAll('.pool-container:not([style*="display: none"]) th:last-child');
    let hasClipping = false;
    
    for (let i = 0; i < clippedBadges.length; i++) {
      const th = clippedBadges[i];
      if (th.scrollWidth > th.clientWidth) {
        hasClipping = true;
        break;
      }
    }
    
    if (!hasClipping) {
      // No clipping detected at this column count
      optimalColumns = testColumns;
      break;
    } else if (testColumns === 1) {
      // Even at 1 column there's clipping - use 1 column anyway
      optimalColumns = 1;
      break;
    }
    // Continue testing with fewer columns
  }
  
  // Apply final column count with width constraints for fewer than 4 pools
  if (visiblePools < 4 && optimalColumns === visiblePools) {
    // Calculate dynamic pool widths to prevent excessive stretching
    const dynamicPoolWidth = (availableWidth - ((visiblePools - 1) * gridGap)) / visiblePools;
    const maxReasonablePoolWidth = Math.min(600, availableWidth * 0.8 / visiblePools);
    
    if (dynamicPoolWidth >= minPoolWidth && dynamicPoolWidth <= maxReasonablePoolWidth) {
      // Pools would be acceptably sized - use fractional layout
      poolsGrid.style.gridTemplateColumns = `repeat(${visiblePools}, 1fr)`;
      poolsGrid.style.justifyContent = 'stretch';
    } else if (dynamicPoolWidth > maxReasonablePoolWidth) {
      // Pools would be too wide - constrain to reasonable maximum and left-align
      poolsGrid.style.gridTemplateColumns = `repeat(${visiblePools}, ${maxReasonablePoolWidth}px)`;
      poolsGrid.style.justifyContent = 'start';
    } else {
      // Pools would be too narrow - use single column
      poolsGrid.style.gridTemplateColumns = '1fr';
      poolsGrid.style.justifyContent = 'stretch';
    }
  } else {
    // 4+ pools or clipping forced column reduction - use fractional layout
    poolsGrid.style.gridTemplateColumns = `repeat(${optimalColumns}, 1fr)`;
    poolsGrid.style.justifyContent = 'stretch';
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log(`UI: Clip-detection grid - ${visiblePools} pools, ${optimalColumns} columns (max possible: ${maxPossibleColumns})`);
  }
};

// =============================================================================
// CORE FUNCTIONALITY - DATA RENDERING
// =============================================================================

/**
 * Render pool data with site info, DNS hostname support, and MACRO/MICRO view mode support
 * @param {Object} data - Pool data from API response containing pools, hostname, and metadata
 */
Dashboard.ui.renderPoolData = function(data) {
  const poolsGrid = document.getElementById('pools-grid');
  const shouldDebug = (window.dashboardConfig && window.dashboardConfig.debugEnabled) || (data.debug_enabled === "enabled");
  
  // Check if dashboard is currently in error/loading/no-site state before rendering
  const errorMessage = document.getElementById('error-message');
  const noSiteMessage = document.getElementById('no-site-message');
  const loadingMessage = document.getElementById('loading-message');
  
  const isShowingError = errorMessage && window.getComputedStyle(errorMessage).display !== 'none';
  const isShowingNoSite = noSiteMessage && window.getComputedStyle(noSiteMessage).display !== 'none';
  const isShowingLoading = loadingMessage && window.getComputedStyle(loadingMessage).display !== 'none';
  
  // Block rendering if dashboard is in an inappropriate state
  if (isShowingError || isShowingNoSite || isShowingLoading) {
    if (shouldDebug) {
      console.log('UI: renderPoolData blocked - dashboard is in error/loading/no-site state');
    }
    return; // Exit early - do not render pool data over error states
  }
  
  // Show site information in header bar
  if (data.hostname) {
    const headerSiteInfo = document.getElementById('header-site-info');
    if (headerSiteInfo) {
      headerSiteInfo.innerHTML = 'Displaying data from: <strong><a href="https://' + data.hostname + '" target="_blank" style="color: inherit; text-decoration: underline;">' + data.hostname + '</a></strong> | Last updated: ' + (data.timestamp || 'Unknown');
      headerSiteInfo.style.display = 'block';
      if (shouldDebug) {
        console.log('UI: Updated header site info with hostname:', data.hostname);
      }
    } else {
      console.error('UI: header-site-info element not found in DOM');
    }
  } else {
    console.warn('UI: No hostname data available for header site info');
  }
  
  // Check if we have pools data - distinguish between no site selected vs empty backend pools
  if (!data.pools || data.pools.length === 0) {
    if (Dashboard.state.currentSite) {
      // Backend site selected but returned no pools = CONFIGURATION ERROR (RED)
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('UI: Backend site', Dashboard.state.currentSite, 'returned empty pools - treating as configuration error');
      }
      
      const siteName = Dashboard.state.currentSite || 'the selected site';
      Dashboard.ui.showError('Configuration Error: No pools configured for monitoring on site <strong>' + siteName + '</strong>.<br><br>Please configure pools in the datagroup to enable monitoring.');
      
      document.getElementById('loading-message').style.display = 'none';
      return;
      
    } else {
      // No site selected = NORMAL STATE (neutral)
      if (poolsGrid) {
        poolsGrid.innerHTML = '<div class="no-site-message"><h3>Please select a site to view pool status</h3><p>Choose a site from the dropdown below.</p></div>';
        poolsGrid.style.display = 'block';
      }
      
      const topControlsContainer = document.querySelector('.top-controls-container');
      if (topControlsContainer) {
        topControlsContainer.style.display = 'none';
      }
      
      document.getElementById('loading-message').style.display = 'none';
      return;
    }
  }
  
  // Show top controls when we have pools
  let topControlsContainer = document.querySelector('.top-controls-container');
  if (!topControlsContainer) {
    Dashboard.ui.createTopControlsBar();
    topControlsContainer = document.querySelector('.top-controls-container');
  }
  
  if (topControlsContainer) {
    topControlsContainer.style.display = 'flex';
    
    const instanceState = Dashboard.ui.getInstanceState();
    const searchInput = document.getElementById('poolSearchInput');
    if (searchInput && searchInput.value !== instanceState.searchFilter) {
      searchInput.value = instanceState.searchFilter;
    }
  }
  
  // Ensure pools grid is visible when rendering data
  if (poolsGrid) {
    poolsGrid.style.display = 'grid';
    if (shouldDebug) {
      console.log('UI: Pools grid set to display: grid');
    }
  }
  
  // Sort pools by custom order first, then by sort_order field
  const sortedPools = data.pools.sort(function(a, b) {
    const instanceData = Dashboard.data.getInstanceData();
    if (instanceData.customOrder && Object.keys(instanceData.customOrder).length > 0) {
      const orderA = instanceData.customOrder[a.name] !== undefined ? instanceData.customOrder[a.name] : 999;
      const orderB = instanceData.customOrder[b.name] !== undefined ? instanceData.customOrder[b.name] : 999;
      return orderA - orderB;
    }
    
    const orderA = a.sort_order !== undefined ? a.sort_order : 999;
    const orderB = b.sort_order !== undefined ? b.sort_order : 999;
    return orderA - orderB;
  });
  
  // Check if we need to do a full rebuild or can update existing containers
  const existingContainers = document.querySelectorAll('.pool-container');
  const existingPoolNames = Array.from(existingContainers).map(container => {
    const poolHeader = container.querySelector('th');
    return poolHeader ? poolHeader.textContent.trim() : '';
  }).filter(name => name);
  
  const newPoolNames = sortedPools.map(pool => pool.name);
  const needsFullRebuild = existingPoolNames.length !== newPoolNames.length || 
                          !existingPoolNames.every(name => newPoolNames.includes(name)) ||
                          !newPoolNames.every(name => existingPoolNames.includes(name)) ||
                          (Dashboard.data && Dashboard.data.getInstanceData().reorderMode) || // Force full rebuild when reorder mode is active
                          true; // Force full rebuild for view mode changes
  
  if (needsFullRebuild) {
    // Full rebuild needed - use original method with scroll preservation
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Full pool grid rebuild required');
    }
    
    // Capture scroll positions before DOM update
    const savedScrollPositions = Dashboard.ui.captureScrollPositions();
    
    // Build new content with immediate filtering applied
    let newContent = '';
    let visibleCount = 0;
    let hiddenCount = 0;
    
    sortedPools.forEach(function(pool) {
      const poolHtml = Dashboard.ui.createPoolContainerHTML(pool);
      
      // Don't apply search filter during HTML rebuild - always build visible containers
      // Let applyPoolFilter handle the filtering separately after rebuild
      newContent += poolHtml;
      visibleCount++;
    });
    
    // Update content in one operation
    if (poolsGrid) {
      poolsGrid.innerHTML = newContent;
      poolsGrid.style.display = 'grid';
    }
    
    // Restore scroll positions after DOM update
    Dashboard.ui.restoreScrollPositions(savedScrollPositions);
    
    // Re-apply search filter after full rebuild to ensure correct filtering
    const instanceState = Dashboard.ui.getInstanceState();
    if (instanceState.searchFilterActive && instanceState.searchFilter) {
      Dashboard.ui.applyPoolFilter(instanceState.searchFilter);
    } else {
      // Update search status for no active filter
      Dashboard.ui.updateSearchStatus(visibleCount, 0, '');
      instanceState.hiddenPoolCount = 0;
    }
    
  } else {
    // Incremental update - preserve scroll positions naturally
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Incremental pool update - scroll positions preserved');
    }
    
    let visibleCount = 0;
    let hiddenCount = 0;
    
    sortedPools.forEach(function(pool, index) {
      // Find existing container by data-pool-name attribute (actual pool name)
      let existingContainer = null;
      existingContainers.forEach(container => {
        const containerPoolName = container.getAttribute('data-pool-name');
        if (containerPoolName && containerPoolName === pool.name) {
          existingContainer = container;
        }
      });
      
      if (existingContainer) {
        // Update pool header display name based on alias mode
        const poolHeader = existingContainer.querySelector('th');
        if (poolHeader) {
          const displayName = Dashboard.ui.getPoolDisplayName(pool);
          const tooltip = Dashboard.ui.getPoolDisplayTooltip(pool);
          
          // Update display name and tooltip
          poolHeader.textContent = displayName;
          poolHeader.title = tooltip;
          
          if (shouldDebug) {
            console.log('UI: Updated pool header for', pool.name, 'to display:', displayName);
          }
        }
        
        // Update existing container content without touching scroll position
        const tbody = existingContainer.querySelector('tbody');
        if (tbody) {
          // Save current scroll position
          const currentScrollPosition = tbody.scrollTop;
          
          // Update tbody content
          let memberRows = '';
          if (pool.members && pool.members.length > 0) {
            // Sort members by IP address, then by port
            const sortedMembers = pool.members.sort(function(a, b) {
              const ipComparison = Dashboard.ui.compareIPAddresses(a.ip, b.ip);
              if (ipComparison !== 0) {
                return ipComparison;
              }
              
              const portA = parseInt(a.port, 10);
              const portB = parseInt(b.port, 10);
              return portA - portB;
            });
            
            sortedMembers.forEach(function(member) {
              const memberHTML = Dashboard.ui.createMemberRowHTML(pool, member);
              memberRows += memberHTML;
            });
          } else {
            if (pool.status === 'UNKNOWN') {
              memberRows = '<tr><td colspan="2" class="error-message">Pool not found or is no longer configured</td></tr>';
            } else {
              memberRows = '<tr><td colspan="2" class="error-message">No pool members configured</td></tr>';
            }
          }
          
          tbody.innerHTML = memberRows;
          
          // Restore scroll position immediately
          tbody.scrollTop = currentScrollPosition;
        }
        
        // Update pool status badge with MICRO view mode alarm logic
        const statusBadge = existingContainer.querySelector('.status-badge');
        if (statusBadge) {
          let statusClass, statusText, statusTooltip;
          
          switch(pool.status) {
            case 'UP':
              statusClass = 'status-up';
              statusText = 'UP';
              statusTooltip = pool.up_members === pool.total_members ? 
                'Pool is fully available' : 
                'Pool available - ' + pool.up_members + ' of ' + pool.total_members + ' members up';
              break;
            case 'DOWN':
              statusClass = 'status-down';
              statusText = 'DOWN';
              statusTooltip = 'All pool members are unavailable';
              break;
            case 'DISABLED':
              statusClass = 'status-disabled';
              statusText = 'DISABLED';
              statusTooltip = pool.down_members === 0 ? 
                'All members are disabled' : 
                'No available members - ' + pool.down_members + ' down, ' + pool.disabled_members + ' disabled';
              break;
            case 'EMPTY':
              statusClass = 'status-unknown';
              statusText = 'EMPTY';
              statusTooltip = 'Pool has no members configured';
              break;
            case 'UNKNOWN':
              statusClass = 'status-unknown';
              statusText = 'UNKNOWN';
              statusTooltip = pool.error || 'Pool not found or is no longer configured';
              break;
            default:
              statusClass = 'status-unknown';
              statusText = 'UNKNOWN';
              statusTooltip = 'Unknown pool status';
          }
          
          statusBadge.className = 'status-badge ' + statusClass;
          
          // MICRO VIEW MODE: Add alarm state if any member has unacknowledged changes
          if (Dashboard.state.currentViewMode === 'micro') {
            const poolHasChanges = Dashboard.ui.checkPoolForMemberChanges(pool);
            if (poolHasChanges) {
              statusBadge.classList.add('pool-has-changes');
              statusTooltip += ' | Members need attention - switch to MACRO Mode';
              if (shouldDebug) {
                console.log('UI: MICRO mode - Pool', pool.name, 'has unacknowledged member changes, adding alarm state');
              }
            } else {
              statusBadge.classList.remove('pool-has-changes');
            }
          } else {
            statusBadge.classList.remove('pool-has-changes');
          }
          
          statusBadge.title = statusTooltip;
          statusBadge.innerHTML = '<span class="status-indicator"></span>' + statusText;
        }
        
        // Apply filtering
        const shouldShow = Dashboard.ui.shouldShowPool(pool.name, pool);
        if (shouldShow) {
          existingContainer.style.display = '';
          visibleCount++;
        } else {
          existingContainer.style.display = 'none';
          hiddenCount++;
        }
      }
    });
    
    // Update search status
    const instanceState = Dashboard.ui.getInstanceState();
    if (instanceState.searchFilterActive) {
      Dashboard.ui.updateSearchStatus(visibleCount, hiddenCount, instanceState.searchFilter);
      instanceState.hiddenPoolCount = hiddenCount;
    } else {
      instanceState.hiddenPoolCount = 0;
    }
  }
  
  // Re-enable drag and drop if reorder mode is active
  const instanceData = Dashboard.data.getInstanceData();
  if (instanceData.reorderMode) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Re-enabling drag and drop after render');
    }
    
    setTimeout(() => {
      if (Dashboard.data.toggleReorderMode) {
        // Always use toggle method to ensure drag functionality works
        Dashboard.data.toggleReorderMode(); // Turn off
        Dashboard.data.toggleReorderMode(); // Turn back on
        if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
          console.log('UI: Drag and drop re-initialized via toggle');
        }
      }
    }, 100);
  }
  
  document.getElementById('loading-message').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  
  // Update dynamic grid after pool rendering is complete
  Dashboard.ui.updateDynamicGrid();
  
  // Log summary of changed members
  if (Dashboard.data && Dashboard.data.getChangedMembersSummary) {
    const changedMembers = Dashboard.data.getChangedMembersSummary();
    if (changedMembers.length > 0) {
      if (shouldDebug) {
        console.log('UI: Members with unacknowledged changes:', changedMembers.length);
        changedMembers.forEach(member => {
          console.log('UI: -', member.memberKey, ':', member.baseline, '->', member.current, 'at', member.lastChange);
        });
      }
    }
  }
  
  // Log memory usage statistics
  if (Dashboard.data && Dashboard.data.getMemoryStats) {
    const memStats = Dashboard.data.getMemoryStats();
    if (shouldDebug) {
      console.log('UI: Memory usage:', memStats.estimatedMemoryMB + 'MB of ' + memStats.maxMemoryMB + 'MB max (' + 
                  memStats.totalHistoryEntries + '/' + memStats.maxPossibleEntries + ' history entries)');
    }
  }
};

/**
 * Check if pool has any members with unacknowledged status changes (for MICRO view mode alarm)
 * @param {Object} pool - Pool data object containing members array
 * @returns {boolean} True if pool has members needing acknowledgment
 */
Dashboard.ui.checkPoolForMemberChanges = function(pool) {
  if (!pool.members || pool.members.length === 0) {
    return false;
  }
  
  if (!Dashboard.data || !Dashboard.data.hasMemberStatusChanged) {
    return false;
  }
  
  // Always use actual pool name for state checking
  return pool.members.some(function(member) {
    return Dashboard.data.hasMemberStatusChanged(pool.name, member.ip, member.port);
  });
};

/**
 * Create individual pool container HTML with MICRO view mode support and alias display
 * @param {Object} pool - Pool data object containing name, status, members, and alias
 * @returns {string} HTML string for complete pool container
 */
Dashboard.ui.createPoolContainerHTML = function(pool) {
  // Determine pool status display properties
  let statusClass, statusText, statusTooltip;
  
  switch(pool.status) {
    case 'UP':
      statusClass = 'status-up';
      statusText = 'UP';
      statusTooltip = pool.up_members === pool.total_members ? 
        'Pool is fully available' : 
        'Pool available - ' + pool.up_members + ' of ' + pool.total_members + ' members up';
      break;
    case 'DOWN':
      statusClass = 'status-down';
      statusText = 'DOWN';
      statusTooltip = 'All pool members are unavailable';
      break;
    case 'DISABLED':
      statusClass = 'status-disabled';
      statusText = 'DISABLED';
      statusTooltip = pool.down_members === 0 ? 
        'All members are disabled' : 
        'No available members - ' + pool.down_members + ' down, ' + pool.disabled_members + ' disabled';
      break;
    case 'EMPTY':
      statusClass = 'status-unknown';
      statusText = 'EMPTY';
      statusTooltip = 'Pool has no members configured';
      break;
    case 'UNKNOWN':
      statusClass = 'status-unknown';
      statusText = 'UNKNOWN';
      statusTooltip = pool.error || 'Pool not found or is no longer configured';
      break;
    default:
      statusClass = 'status-unknown';
      statusText = 'UNKNOWN';
      statusTooltip = 'Unknown pool status';
  }
  
  // MICRO VIEW MODE: Check if pool has unacknowledged member changes
  let poolHasChangesClass = '';
  if (Dashboard.state.currentViewMode === 'micro') {
    const poolHasChanges = Dashboard.ui.checkPoolForMemberChanges(pool);
    if (poolHasChanges) {
      poolHasChangesClass = ' pool-has-changes';
      statusTooltip += ' | Members need attention - switch to MACRO Mode';
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('UI: MICRO mode - Pool', pool.name, 'has unacknowledged member changes, adding alarm state');
      }
    }
  }
  
  // Get display name and tooltip based on alias mode
  const displayName = Dashboard.ui.getPoolDisplayName(pool);
  const displayTooltip = Dashboard.ui.getPoolDisplayTooltip(pool);
  
  // Build member rows with sorting
  let memberRows = '';
  if (pool.members && pool.members.length > 0) {
    // Sort members by IP address, then by port
    const sortedMembers = pool.members.sort(function(a, b) {
      const ipComparison = Dashboard.ui.compareIPAddresses(a.ip, b.ip);
      if (ipComparison !== 0) {
        return ipComparison;
      }
      
      const portA = parseInt(a.port, 10);
      const portB = parseInt(b.port, 10);
      return portA - portB;
    });
    
    sortedMembers.forEach(function(member) {
      const memberHTML = Dashboard.ui.createMemberRowHTML(pool, member);
      memberRows += memberHTML;
    });
  } else {
    if (pool.status === 'UNKNOWN') {
      memberRows = '<tr><td colspan="2" class="error-message">Pool not found or is no longer configured</td></tr>';
    } else {
      memberRows = '<tr><td colspan="2" class="error-message">No pool members configured</td></tr>';
    }
  }
  
  return '<div class="pool-container" data-pool-name="' + pool.name + '">' +
    '<div class="table-container">' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th title="' + displayTooltip + '">' + displayName + '</th>' +
            '<th>' +
              '<span class="status-badge ' + statusClass + poolHasChangesClass + '" title="' + statusTooltip + '">' +
                '<span class="status-indicator"></span>' + statusText +
              '</span>' +
            '</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + memberRows + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
};

/**
 * Create individual member row HTML with enhanced status badge, DNS hostname display, and IP tooltips
 * @param {Object} poolData - Full pool data object (contains actual pool name)
 * @param {Object} member - Member data object with ip, port, status, and hostname fields
 * @returns {string} HTML string for complete member table row
 */
Dashboard.ui.createMemberRowHTML = function(poolData, member) {
  let memberStatusClass, memberStatusText, memberTooltip;
  
  // Determine member status display properties
  switch(member.status) {
    case 'up':
      memberStatusClass = 'status-up';
      memberStatusText = 'UP';
      memberTooltip = 'Member available';
      break;
    case 'down':
      memberStatusClass = 'status-down';
      memberStatusText = 'DOWN';
      memberTooltip = 'Offline - No monitor response';
      break;
    case 'disabled':
      memberStatusClass = 'status-disabled';
      memberStatusText = 'DISABLED';
      memberTooltip = 'Member is administratively disabled';
      break;
    case 'session_disabled':
      memberStatusClass = 'status-disabled';
      memberStatusText = 'DISABLED';
      memberTooltip = 'Available (Disabled) - User disabled';
      break;
    default:
      memberStatusClass = 'status-unknown';
      memberStatusText = 'UNKNOWN';
      memberTooltip = 'Unknown member status: ' + member.status;
  }
  
  // Always use actual pool name from poolData for state tracking
  const hasChanged = Dashboard.data && Dashboard.data.hasMemberStatusChanged ? 
    Dashboard.data.hasMemberStatusChanged(poolData.name, member.ip, member.port) : false;
  const stateChangedClass = hasChanged ? ' state-changed' : '';
  const clickableClass = hasChanged ? ' clickable' : '';
  
  // Get member state for enhanced tooltip
  if (hasChanged && Dashboard.data && Dashboard.data.getMemberState) {
    const memberState = Dashboard.data.getMemberState(poolData.name, member.ip, member.port);
    if (memberState && Dashboard.data.getMemberHistory) {
      const recentHistory = Dashboard.data.getMemberHistory(poolData.name, member.ip, member.port, 1);
      if (recentHistory.length > 0) {
        const lastChange = recentHistory[0];
        const changeTime = new Date(lastChange.timestamp);
        const timeString = changeTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
        memberTooltip += ' | Changed from: ' + memberState.baseline.toUpperCase();
        memberTooltip += ' | ' + timeString + ' | Click to acknowledge';
      } else {
        memberTooltip += ' | Changed from: ' + memberState.baseline.toUpperCase();
        memberTooltip += ' | Click to acknowledge change';
      }
    }
  }
  
  // DNS hostname display logic - use hostname if available, otherwise use IP
  const displayAddress = member.hostname !== null ? member.hostname : member.ip;
  const memberDisplay = displayAddress + ':' + member.port;
  
  // Create IP address tooltip for member address cell
  const ipAddressTooltip = 'IP Address: ' + member.ip + ':' + member.port;
  
  if (hasChanged) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Creating pulsing status badge for member:', memberDisplay, 'in pool:', poolData.name);
    }
  }
  
  // Log DNS usage for debugging
  if (member.hostname !== null) {
    if ((window.dashboardConfig && window.dashboardConfig.debugEnabled)) {
      console.log('UI: Displaying hostname for member:', member.hostname + ':' + member.port, '(IP:', member.ip + ')');
    }
  }
  
  return '<tr>' +
    '<td title="' + ipAddressTooltip + '">' + memberDisplay + '</td>' +
    '<td><span class="status-badge ' + memberStatusClass + stateChangedClass + clickableClass + '" title="' + memberTooltip + '">' +
      '<span class="status-indicator"></span>' + memberStatusText +
    '</span></td>' +
  '</tr>';
};

// =============================================================================
// DOM MANAGEMENT AND UI STATE CONTROL
// =============================================================================

/**
 * Show loading state during initial data load
 */
Dashboard.ui.showLoadingState = function() {
  document.getElementById('loading-message').style.display = 'block';
  document.getElementById('pools-grid').style.display = 'none';
  document.getElementById('no-site-message').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  
  const topControlsContainer = document.querySelector('.top-controls-container');
  if (topControlsContainer) {
    topControlsContainer.style.display = 'none';
  }
};

/**
 * Hide error states during refresh while keeping content visible
 */
Dashboard.ui.hideErrorStates = function() {
  document.getElementById('loading-message').style.display = 'none';
  document.getElementById('no-site-message').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
};

/**
 * Show error message with retry option
 * @param {string} errorMessage - Error message to display to user
 */
Dashboard.ui.showError = function(errorMessage) {
  document.getElementById('loading-message').style.display = 'none';
  document.getElementById('pools-grid').style.display = 'none';
  document.getElementById('no-site-message').style.display = 'none';
  
  const topControlsContainer = document.querySelector('.top-controls-container');
  if (topControlsContainer) {
    topControlsContainer.style.display = 'none';
  }
  
  // Hide header site info
  const headerSiteInfo = document.getElementById('header-site-info');
  if (headerSiteInfo) {
    headerSiteInfo.style.display = 'none';
  }
  
  const errorDetails = document.getElementById('error-details');
  if (errorDetails) {
    errorDetails.innerHTML = errorMessage;
  }
  document.getElementById('error-message').style.display = 'block';
};

/**
 * Show no site selected state with appropriate messaging
 */
Dashboard.ui.showNoSiteSelected = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Showing no site selected state');
  }
  
  // Hide all other states
  document.getElementById('loading-message').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  document.getElementById('pools-grid').style.display = 'none';
  
  // Show no-site message
  document.getElementById('no-site-message').style.display = 'block';
  
  // Hide top controls
  const topControlsContainer = document.querySelector('.top-controls-container');
  if (topControlsContainer) {
    topControlsContainer.style.display = 'none';
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Hidden top controls for no site selected state');
    }
  }
  
  // Hide header site info
  const headerSiteInfo = document.getElementById('header-site-info');
  if (headerSiteInfo) {
    headerSiteInfo.style.display = 'none';
  }
};

/**
 * Toggle bottom bar visibility with Alt+H keyboard shortcut
 */
Dashboard.ui.toggleBottomBar = function() {
  const instanceState = Dashboard.ui.getInstanceState();
  const bottomBar = document.querySelector('.bottom-bar');
  if (!bottomBar) {
    console.warn('UI: Bottom bar element not found');
    return;
  }
  
  instanceState.bottomBarVisible = !instanceState.bottomBarVisible;
  
  if (instanceState.bottomBarVisible) {
    bottomBar.classList.remove('bottom-bar-hidden');
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Bottom bar shown');
    }
  } else {
    bottomBar.classList.add('bottom-bar-hidden');
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Bottom bar hidden');
    }
  }
};

/**
 * Create combined top controls bar with reorder, search, and reset functionality
 */
Dashboard.ui.createTopControlsBar = function() {
  if (document.querySelector('.top-controls-container')) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Top controls bar already exists');
    }
    return;
  }

  const topControlsContainer = document.createElement('div');
  topControlsContainer.className = 'top-controls-container';
  topControlsContainer.style.display = 'flex';
  const instanceState = Dashboard.ui.getInstanceState();
  topControlsContainer.innerHTML = `
    <div class="top-controls-wrapper">
      <div class="top-controls-left">
        <button id="reorder-toggle" class="reorder-toggle top-control-button" onclick="toggleReorderMode()" title="Click to enable pool drag and drop">Reorder</button>
      </div>
      <div class="top-controls-center">
        <div class="search-filter-wrapper">
          <button id="changedSearchButton" 
                  class="search-filter-clear" 
                  title="Filter for changed members">Changed</button>
          <input type="text" 
                 id="poolSearchInput" 
                 placeholder="Search... BOOLEAN OR (default), AND, NOT..." 
                 value="${instanceState.searchFilter || ''}"
                 class="search-filter-input">
          <button id="clearSearchButton" 
                  class="search-filter-clear" 
                  title="Clear filter">Clear</button>
        </div>
      </div>
      <div class="top-controls-right">
        <button id="reset-state-button" class="reset-state-button top-control-button" onclick="resetAllMemberStates()" title="Click to reset dashboard memory">Reset</button>
      </div>
    </div>
  `;

  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(topControlsContainer, container.firstChild);
  } else {
    console.error('UI: Could not find insertion point for top controls bar');
    return;
  }

  // Add event listeners for search functionality
  const searchInput = document.getElementById('poolSearchInput');
  const clearButton = document.getElementById('clearSearchButton');
  const changedButton = document.getElementById('changedSearchButton');

  if (searchInput && clearButton && changedButton) {
    let searchTimeout;
    let isFirstCall = true;
    
    searchInput.addEventListener('input', function(e) {
      const value = e.target.value;
      
      if (isFirstCall) {
        Dashboard.ui.applyPoolFilter(value);
        isFirstCall = false;
        return;
      }
      
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        Dashboard.ui.applyPoolFilter(value);
      }, 300);
    });

    clearButton.addEventListener('click', function() {
      searchInput.value = '';
      Dashboard.ui.applyPoolFilter('');
      searchInput.focus();
    });

    changedButton.addEventListener('click', function() {
      searchInput.value = 'changed';
      Dashboard.ui.applyPoolFilter('changed');
      searchInput.focus();
    });

    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        Dashboard.ui.applyPoolFilter(e.target.value);
      }
    });

    // Add right-click handler for saved search context menu
    searchInput.addEventListener('contextmenu', Dashboard.ui.showSearchContextMenu);

    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Top controls bar created with search functionality and saved search right-click handler');
    }
  } else {
    console.error('UI: Could not find search input or buttons after creation');
  }
};

/**
 * Add CSS styles for top controls bar layout and appearance
 */
Dashboard.ui.addTopControlsStyles = function() {
  if (document.getElementById('top-controls-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'top-controls-styles';
  style.textContent = `
    .top-controls-container {
      margin: 15px 0 20px 0;
      padding: 0 16px;
      display: flex;
      width: 100%;
    }
    
    .top-controls-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 2400px;
      margin: 0 auto;
      gap: 20px;
    }
    
    .top-controls-left {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    
    .top-controls-center {
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 800px;
      gap: 15px;
    }
    
    .top-controls-right {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    
    .top-controls-center .search-filter-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    
    .top-controls-center .search-filter-input {
      flex: 1;
      padding: 8px 16px;
      font-size: 1.1em;
      border: 2px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-input);
      color: var(--text-primary);
      transition: all 0.2s ease;
      outline: none;
      height: auto;
    }
    
    .top-controls-center .search-filter-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(108, 166, 18, 0.1);
    }
    
    .top-controls-center .search-filter-input::placeholder {
      color: var(--text-muted);
      opacity: 0.7;
    }
    
    .top-controls-center .search-filter-clear {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.1em;
      font-weight: bold;
      transition: all 0.2s ease;
      min-width: 40px;
      height: auto;
      opacity: 0.6;
    }
    
    .top-controls-center .search-filter-clear:hover {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      opacity: 1;
      transform: translateY(-1px);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    .top-controls-center .search-filter-clear:active {
      transform: translateY(0);
    }
    
    .top-control-button {
      background: var(--bg-input);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      padding: 8px 16px;
      font-size: 1.2em;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      width: 140px;
      transition: all 0.2s ease;
      box-shadow: var(--shadow-light), var(--shadow-medium);
      white-space: nowrap;
      line-height: 1.2em;
      text-align: center;
      height: auto;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .top-control-button:hover {
      background: var(--bg-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-medium);
    }

    .top-control-button:active {
      transform: translateY(1px);
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .reorder-toggle.active {
      background: var(--button-warning);
      color: var(--text-primary);
      border-color: var(--button-warning);
    }

    .reorder-toggle.active:hover {
      background: var(--button-warning-hover);
    }

    @media (max-width: 768px) {
      .top-controls-wrapper {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
      }
      
      .top-controls-left,
      .top-controls-right {
        justify-content: center;
        width: auto;
      }
      
      .top-controls-center {
        order: -1;
        max-width: none;
      }
      
      .top-control-button {
        width: 100%;
        max-width: 200px;
        margin: 0 auto;
      }
      
      .top-controls-center .search-filter-wrapper {
        flex-direction: column;
        gap: 8px;
      }
      
      .top-controls-center .search-filter-input,
      .top-controls-center .search-filter-clear {
        width: 100%;
      }
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Capture scroll positions of all tbody elements before DOM update to prevent visual jumps
 * @returns {Object} Map of pool names to their tbody scroll positions
 */
Dashboard.ui.captureScrollPositions = function() {
  const scrollPositions = {};
  const poolContainers = document.querySelectorAll('.pool-container');
  
  poolContainers.forEach(function(container) {
    const poolHeader = container.querySelector('th');
    const tbody = container.querySelector('tbody');
    
    if (poolHeader && tbody) {
      const poolName = poolHeader.textContent.trim();
      scrollPositions[poolName] = tbody.scrollTop;
    }
  });
  
  return scrollPositions;
};

/**
 * Restore scroll positions to tbody elements after DOM update
 * @param {Object} scrollPositions - Map of pool names to their scroll positions
 */
Dashboard.ui.restoreScrollPositions = function(scrollPositions) {
  if (!scrollPositions || Object.keys(scrollPositions).length === 0) {
    return;
  }
  
  // Immediate synchronous restoration to prevent visual jump
  const poolContainers = document.querySelectorAll('.pool-container');
  
  poolContainers.forEach(function(container) {
    const poolHeader = container.querySelector('th');
    const tbody = container.querySelector('tbody');
    
    if (poolHeader && tbody) {
      const poolName = poolHeader.textContent.trim();
      const savedScrollPosition = scrollPositions[poolName];
      
      if (savedScrollPosition !== undefined && savedScrollPosition > 0) {
        // Set scroll position immediately to prevent visual jump
        tbody.scrollTop = savedScrollPosition;
        
        // Also ensure it's set after any potential browser reflow
        requestAnimationFrame(function() {
          if (tbody.scrollTop !== savedScrollPosition) {
            tbody.scrollTop = savedScrollPosition;
          }
        });
      }
    }
  });
};

/**
 * Update grid layout after filter changes to prevent display issues
 */
Dashboard.ui.updateGridLayout = function() {
  const poolsGrid = document.getElementById('pools-grid');
  if (!poolsGrid) return;

  // Force reflow and update dynamic grid
  poolsGrid.style.display = 'none';
  poolsGrid.offsetHeight;
  poolsGrid.style.display = 'grid';
  
  // Apply dynamic grid after reflow
  Dashboard.ui.updateDynamicGrid();
};

// =============================================================================
// SEARCH AND FILTERING FUNCTIONALITY
// =============================================================================

/**
 * Load search filter from session storage for current site
 */
Dashboard.ui.loadSearchFilter = function() {
  const instanceState = Dashboard.ui.getInstanceState();
  const currentSite = Dashboard.state ? Dashboard.state.currentSite : 'default';
  const storageKey = Dashboard.core.getStorageKey('poolSearchFilter_' + currentSite);
  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      instanceState.searchFilter = state.searchTerm || '';
      instanceState.searchFilterActive = state.active || false;
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.log('UI: Loaded search filter:', instanceState.searchFilter, 'Active:', instanceState.searchFilterActive);
      }
    } catch (e) {
      console.error('UI: Error loading search filter:', e);
      instanceState.searchFilter = '';
      instanceState.searchFilterActive = false;
    }
  }
};

/**
 * Save search filter to session storage for current site
 */
Dashboard.ui.saveSearchFilter = function() {
  const instanceState = Dashboard.ui.getInstanceState();
  if (Dashboard.state.currentSite) {
    const filterData = {
      searchTerm: instanceState.searchFilter,
      active: instanceState.searchFilterActive
    };
    const storageKey = Dashboard.core.getStorageKey('poolSearchFilter_' + Dashboard.state.currentSite);
    sessionStorage.setItem(storageKey, JSON.stringify(filterData));
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Saved search filter:', instanceState.searchFilter, 'Active:', instanceState.searchFilterActive);
    }
  }
};

/**
 * Extract visible pool names for pool filtering optimization
 * @returns {Array} Array of actual pool names from visible pools (never aliases)
 */
Dashboard.ui.getVisiblePoolNames = function() {
  const visiblePools = [];
  try {
    const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
    const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    if (currentData.pools && Array.isArray(currentData.pools)) {
      currentData.pools.forEach(function(poolData) {
        // Use existing shouldShowPool logic to determine visibility
        if (Dashboard.ui.shouldShowPool(poolData.name, poolData)) {
          // Use actual pool name (not alias) for backend processing
          visiblePools.push(poolData.name);
        }
      });
    }
  } catch (e) {
    // On error, return empty array (fallback to no headers)
    console.warn('UI: Error extracting visible pool names:', e);
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Extracted', visiblePools.length, 'visible pool names for pool filtering optimization');
  }
  
  return visiblePools;
};

/**
 * Apply pool filter based on search term with real-time updates
 * @param {string} filterTerm - Search term to filter pools by
 */
Dashboard.ui.applyPoolFilter = function(filterTerm) {
  const instanceState = Dashboard.ui.getInstanceState();
  filterTerm = filterTerm.trim();
  instanceState.searchFilter = filterTerm;
  instanceState.searchFilterActive = filterTerm.length > 0;
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Applying pool filter:', filterTerm);
  }

  const poolContainers = document.querySelectorAll('.pool-container');
  let visibleCount = 0;
  instanceState.hiddenPoolCount = 0;

  const cacheKey = Dashboard.core.getStorageKey('currentPoolData_' + Dashboard.state.currentSite);
  const currentData = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
  const poolsData = currentData.pools || [];

  // Search the data directly, not the displayed names
  poolsData.forEach(poolData => {
    // Test the pool data directly with shouldShowPool
    const shouldShow = Dashboard.ui.shouldShowPool(poolData.name, poolData);
    
    // Find the DOM container for this pool by data-pool-name attribute (always uses actual pool name)
    const container = document.querySelector(`.pool-container[data-pool-name="${poolData.name}"]`);
    
    if (container) {
      if (shouldShow) {
        container.style.display = '';
        visibleCount++;
      } else {
        container.style.display = 'none';
        instanceState.hiddenPoolCount++;
      }
    } else {
      if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
        console.warn('UI: Could not find DOM container for pool:', poolData.name);
      }
    }
  });

  Dashboard.ui.updateSearchStatus(visibleCount, instanceState.hiddenPoolCount, filterTerm);
  Dashboard.ui.updateGridLayout();
  Dashboard.ui.saveSearchFilter();
  
  // Update dynamic grid after filter has been applied and visibility set
  Dashboard.ui.updateDynamicGrid();
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log(`UI: Filter applied - ${visibleCount} visible, ${instanceState.hiddenPoolCount} hidden`);
  }
};

/**
 * Check if a pool should be visible based on current filter with simplified search logic
 * @param {string} poolName - Name of the pool (not used for search - kept for compatibility)
 * @param {Object} poolData - Full pool data object containing both actual name and alias
 * @returns {boolean} True if pool should be visible based on current search filter
 */
Dashboard.ui.shouldShowPool = function(poolName, poolData = null) {
  const instanceState = Dashboard.ui.getInstanceState();
  if (!instanceState.searchFilterActive || !instanceState.searchFilter) {
    return true;
  }
  
  const trimmedFilter = instanceState.searchFilter.trim();
  if (trimmedFilter.length === 0) {
    return true;
  }
  
  // Don't use poolName parameter for search - only use poolData
  if (!poolData) {
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.warn('UI: shouldShowPool called without poolData - cannot search');
    }
    return true; // Show pool if no data available
  }
  
  // Parse NOT operators - handle both " NOT " and starting with "NOT " with AND support
  let includeTerms = '';
  let excludeTerms = [];
  
  if (trimmedFilter.toLowerCase().startsWith('not ')) {
    // Starts with "NOT " - check if there's an AND after the first NOT term
    const afterFirstNot = trimmedFilter.substring(4); // Remove "NOT "
    
    // Check if there's an AND in the remaining text
    const andMatch = afterFirstNot.match(/^([^]+?)\s+AND\s+(.+)$/i);
    if (andMatch) {
      // Pattern: "NOT term AND otherterms"
      excludeTerms = [andMatch[1].trim()]; // First term to exclude
      includeTerms = andMatch[2].trim(); // Rest to include
      
      // Check for additional NOT terms in the include part
      const includeNotParts = includeTerms.split(/\s+NOT\s+/i);
      if (includeNotParts.length > 1) {
        includeTerms = includeNotParts[0].trim();
        excludeTerms = excludeTerms.concat(includeNotParts.slice(1));
      }
    } else {
      // Pure exclusion - split by additional NOT terms
      includeTerms = '';
      excludeTerms = afterFirstNot.split(/\s+NOT\s+/i);
    }
  } else {
    // Standard parsing with " NOT " separator
    const notParts = trimmedFilter.split(/\s+NOT\s+/i);
    includeTerms = notParts[0].trim();
    excludeTerms = notParts.slice(1);
  }
  
  // Helper function to check if pool or its members match terms - searches actual pool data only
  const poolMatchesTerms = function(searchText) {
    if (!searchText || searchText.length === 0) {
      return true;
    }
    
    // Split by AND operator first (case insensitive)
    const andParts = searchText.split(/\s+AND\s+/i);
    
    // Each AND part must be found somewhere in the pool's data
    return andParts.every(andPart => {
      const searchTerms = andPart.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      if (searchTerms.length === 0) {
        return true;
      }
      
      // OR logic within this AND part: check if ANY term in this part matches anywhere in pool data
      return searchTerms.some(term => {
        // Check for special "CHANGED" keyword
        if (term === 'changed') {
          if (poolData.members && Dashboard.data && Dashboard.data.hasMemberStatusChanged) {
            return poolData.members.some(member => 
              Dashboard.data.hasMemberStatusChanged(poolData.name, member.ip, member.port)
            );
          }
          return false;
        }
        
        // Search only the actual pool data, never displayed names
        // Check actual pool name
        if (poolData.name && poolData.name.toLowerCase().includes(term)) return true;
        // Check pool alias
        if (poolData.alias && poolData.alias !== null && poolData.alias !== 'null' && poolData.alias.toLowerCase().includes(term)) return true;
        // Check pool status
        if (poolData.status && poolData.status.toLowerCase().includes(term)) return true;
        // Check member data
        if (poolData.members) {
          return poolData.members.some(member => {
            if (member.status && member.status.toLowerCase().includes(term)) return true;
            if (member.ip && member.ip.toLowerCase().includes(term)) return true;
            if (member.hostname && member.hostname !== null && member.hostname.toLowerCase().includes(term)) return true;
            if (member.port && member.port.toString().includes(term)) return true;
            return false;
          });
        }
        return false;
      });
    });
  };
  
  // Handle pure exclusion filters
  const isPureExclusion = includeTerms.trim() === '';
  
  if (isPureExclusion) {
    // For pure exclusion filters, start with "show everything" then exclude
    if (excludeTerms.length > 0) {
      for (let i = 0; i < excludeTerms.length; i++) {
        const excludeTerm = excludeTerms[i].trim();
        if (excludeTerm.length > 0 && poolMatchesTerms(excludeTerm)) {
          return false; // Pool matches an exclude term, so hide it
        }
      }
    }
    return true; // Show pool (doesn't match any exclude terms)
  }
  
  // Handle include + exclude combinations
  // Step 1: Check if pool matches include terms (must match to proceed)
  if (includeTerms.length > 0) {
    if (!poolMatchesTerms(includeTerms)) {
      return false; // Pool doesn't match include terms, so exclude it
    }
  }
  
  // Step 2: Check if pool matches any exclude terms (if it matches, exclude it)
  if (excludeTerms.length > 0) {
    for (let i = 0; i < excludeTerms.length; i++) {
      const excludeTerm = excludeTerms[i].trim();
      if (excludeTerm.length > 0 && poolMatchesTerms(excludeTerm)) {
        return false; // Pool matches an exclude term, so hide it
      }
    }
  }
  
  // Pool matches include terms and doesn't match any exclude terms
  return true;
};

/**
 * Update search filter status display (legacy function for compatibility)
 * @param {number} visibleCount - Number of visible pools
 * @param {number} hiddenCount - Number of hidden pools
 * @param {string} filterTerm - Current filter term
 */
Dashboard.ui.updateSearchStatus = function(visibleCount, hiddenCount, filterTerm) {
  // Search status functionality removed - no longer displays status messages
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    if (filterTerm && filterTerm.length > 0) {
      console.log(`UI: Filter applied - showing ${visibleCount} of ${visibleCount + hiddenCount} pools (${hiddenCount} hidden)`);
    }
  }
};

/**
 * Clear search filter and return to showing all pools
 */
Dashboard.ui.clearPoolFilter = function() {
  const searchInput = document.getElementById('poolSearchInput');
  if (searchInput) {
    searchInput.value = '';
  }
  Dashboard.ui.applyPoolFilter('');
};

// =============================================================================
// SAVED SEARCH FUNCTIONALITY
// =============================================================================

/**
 * Load all saved searches from global cookies
 */
Dashboard.ui.loadSavedSearches = function() {
  const instanceState = Dashboard.ui.getInstanceState();
  instanceState.savedSearches = {};
  for (let i = 1; i <= 5; i++) {
    const cookieName = 'saved_search_' + i;
    const cookieValue = Dashboard.ui.getCookie(cookieName);
    instanceState.savedSearches[i] = cookieValue || '';
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Loaded global saved searches:', instanceState.savedSearches);
  }
};

/**
 * Save search term to specific slot (1-5) using global cookies
 * @param {number} slotNumber - Slot number (1-5)
 * @param {string} searchTerm - Search term to save
 */
Dashboard.ui.saveSavedSearch = function(slotNumber, searchTerm) {
  const instanceState = Dashboard.ui.getInstanceState();
  const cookieName = 'saved_search_' + slotNumber;
  const cookieValue = searchTerm || '';
  
  // Global cookie - not site-specific, 365 days expiration
  document.cookie = cookieName + '=' + encodeURIComponent(cookieValue) + 
    '; Path=/; Max-Age=31536000; Secure;';
  
  // Update local cache
  instanceState.savedSearches[slotNumber] = cookieValue;
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Saved search to slot', slotNumber + ':', cookieValue || '(empty)');
  }
};

/**
 * Get saved search term from specific slot
 * @param {number} slotNumber - Slot number (1-5)
 * @returns {string} Saved search term or empty string
 */
Dashboard.ui.getSavedSearch = function(slotNumber) {
  const instanceState = Dashboard.ui.getInstanceState();
  return instanceState.savedSearches[slotNumber] || '';
};

/**
 * Apply saved search to input field and filter
 * @param {number} slotNumber - Slot number (1-5)
 */
Dashboard.ui.applySavedSearch = function(slotNumber) {
  const searchTerm = Dashboard.ui.getSavedSearch(slotNumber);
  const searchInput = document.getElementById('poolSearchInput');
  
  if (searchInput) {
    searchInput.value = searchTerm;
    Dashboard.ui.applyPoolFilter(searchTerm);
    searchInput.focus();
    
    if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
      console.log('UI: Applied saved search from slot', slotNumber + ':', searchTerm || '(empty)');
    }
  }
};

/**
 * Show right-click context menu for saved searches
 * @param {Event} event - Right-click event
 */
Dashboard.ui.showSearchContextMenu = function(event) {
  event.preventDefault();
  
  // Create context menu if it doesn't exist
  let contextMenu = document.getElementById('searchContextMenu');
  if (!contextMenu) {
    Dashboard.ui.createSearchContextMenu();
    contextMenu = document.getElementById('searchContextMenu');
  }
  
  // Update submenu content with current saved searches
  Dashboard.ui.updateContextMenuContent();
  
  // Position menu at cursor
  contextMenu.style.left = event.clientX + 'px';
  contextMenu.style.top = event.clientY + 'px';
  contextMenu.style.display = 'block';
  
  // Ensure menu stays within viewport
  const rect = contextMenu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (rect.right > viewportWidth) {
    contextMenu.style.left = (event.clientX - rect.width) + 'px';
  }
  
  if (rect.bottom > viewportHeight) {
    contextMenu.style.top = (event.clientY - rect.height) + 'px';
  }
  
  // Add click-outside handler
  setTimeout(() => {
    document.addEventListener('click', function(e) {
      if (!contextMenu.contains(e.target)) {
        Dashboard.ui.hideSearchContextMenu();
      }
    }, { once: true });
  }, 50);
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Showing search context menu at', event.clientX, event.clientY);
  }
};

/**
 * Create context menu HTML structure
 */
Dashboard.ui.createSearchContextMenu = function() {
  const contextMenuHTML = `
    <div id="searchContextMenu" class="search-context-menu" style="display: none;">
      <div class="section-card">
        <div class="section-header">LOAD SEARCH</div>
        <div class="slot-item" data-slot="1" data-parent-action="load">
          <span>Slot 1: (Empty)</span>
          <div class="slot-number">1</div>
        </div>
        <div class="slot-item" data-slot="2" data-parent-action="load">
          <span>Slot 2: (Empty)</span>
          <div class="slot-number">2</div>
        </div>
        <div class="slot-item" data-slot="3" data-parent-action="load">
          <span>Slot 3: (Empty)</span>
          <div class="slot-number">3</div>
        </div>
        <div class="slot-item" data-slot="4" data-parent-action="load">
          <span>Slot 4: (Empty)</span>
          <div class="slot-number">4</div>
        </div>
        <div class="slot-item" data-slot="5" data-parent-action="load">
          <span>Slot 5: (Empty)</span>
          <div class="slot-number">5</div>
        </div>
      </div>
      <div class="section-card">
        <div class="section-header">SAVE SEARCH</div>
        <div class="slot-item" data-slot="1" data-parent-action="save">
          <span>Slot 1: (Empty)</span>
          <div class="slot-number">1</div>
        </div>
        <div class="slot-item" data-slot="2" data-parent-action="save">
          <span>Slot 2: (Empty)</span>
          <div class="slot-number">2</div>
        </div>
        <div class="slot-item" data-slot="3" data-parent-action="save">
          <span>Slot 3: (Empty)</span>
          <div class="slot-number">3</div>
        </div>
        <div class="slot-item" data-slot="4" data-parent-action="save">
          <span>Slot 4: (Empty)</span>
          <div class="slot-number">4</div>
        </div>
        <div class="slot-item" data-slot="5" data-parent-action="save">
          <span>Slot 5: (Empty)</span>
          <div class="slot-number">5</div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', contextMenuHTML);
  
  // Add click handlers to all slot items
  const contextMenu = document.getElementById('searchContextMenu');
  const slotItems = contextMenu.querySelectorAll('[data-slot]');
  slotItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const slot = this.getAttribute('data-slot');
      const parentAction = this.getAttribute('data-parent-action');
      
      if (slot && parentAction) {
        const slotNumber = parseInt(slot);
        
        if (parentAction === 'save') {
          // Save current search to slot
          const searchInput = document.getElementById('poolSearchInput');
          const currentSearch = searchInput ? searchInput.value : '';
          Dashboard.ui.saveSavedSearch(slotNumber, currentSearch);
          
          if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('UI: Saved search to slot', slotNumber + ':', currentSearch || '(empty)');
          }
        } else if (parentAction === 'load') {
          // Load search from slot
          Dashboard.ui.applySavedSearch(slotNumber);
          
          if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
            console.log('UI: Loaded search from slot', slotNumber);
          }
        }
        
        Dashboard.ui.hideSearchContextMenu();
      }
    });
  });
  
  // Prevent clicks on the menu from closing it
  contextMenu.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Created Option A card-based search context menu');
  }
};

/**
 * Update context menu content with current saved searches
 */
Dashboard.ui.updateContextMenuContent = function() {
  const contextMenu = document.getElementById('searchContextMenu');
  if (!contextMenu) return;
  
  for (let i = 1; i <= 5; i++) {
    const savedSearch = Dashboard.ui.getSavedSearch(i);
    const displayText = savedSearch ? savedSearch : '(Empty)';
    
    // Update load section
    const loadItem = contextMenu.querySelector(`[data-parent-action="load"][data-slot="${i}"] span`);
    if (loadItem) {
      loadItem.textContent = `Slot ${i}: ${displayText}`;
    }
    
    // Update save section
    const saveItem = contextMenu.querySelector(`[data-parent-action="save"][data-slot="${i}"] span`);
    if (saveItem) {
      saveItem.textContent = `Slot ${i}: ${displayText}`;
    }
  }
};

/**
 * Handle context menu clicks
 * @param {Event} event - Click event
 */
Dashboard.ui.handleContextMenuClick = function(event) {
  event.stopPropagation();
  
  const target = event.target;
  const slot = target.getAttribute('data-slot');
  const parentAction = target.getAttribute('data-parent-action');
  
  if (slot && parentAction) {
    const slotNumber = parseInt(slot);
    
    if (parentAction === 'save') {
      // Save current search to slot
      const searchInput = document.getElementById('poolSearchInput');
      const currentSearch = searchInput ? searchInput.value : '';
      Dashboard.ui.saveSavedSearch(slotNumber, currentSearch);
    } else if (parentAction === 'load') {
      // Load search from slot
      Dashboard.ui.applySavedSearch(slotNumber);
    }
    
    Dashboard.ui.hideSearchContextMenu();
  }
};

/**
 * Hide search context menu
 */
Dashboard.ui.hideSearchContextMenu = function() {
  const contextMenu = document.getElementById('searchContextMenu');
  if (contextMenu) {
    contextMenu.style.display = 'none';
  }
};

/**
 * Get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string} Cookie value or empty string
 */
Dashboard.ui.getCookie = function(name) {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }
  
  return '';
};

// =============================================================================
// EVENT HANDLING AND USER INTERACTIONS
// =============================================================================

/**
 * Add keyboard shortcuts for search filter and dashboard navigation
 */
Dashboard.ui.addSearchKeyboardShortcuts = function() {
  document.addEventListener('keydown', function(e) {
    // Ctrl+F or Cmd+F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('poolSearchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    
    // Alt+C to filter for changed members
    if (e.altKey && e.key === 'c') {
      e.preventDefault();
      const searchInput = document.getElementById('poolSearchInput');
      if (searchInput) {
        searchInput.value = 'changed';
        Dashboard.ui.applyPoolFilter('changed');
        searchInput.focus();
      }
    }
    
    // Alt+M to toggle view mode (MACRO/MICRO)
    if (e.altKey && e.key === 'm') {
      e.preventDefault();
      if (Dashboard.core && Dashboard.core.toggleViewMode) {
        Dashboard.core.toggleViewMode();
      }
    }
    
    // Alt+X to clear search filter
    if (e.altKey && e.key === 'x') {
      e.preventDefault();
      const searchInput = document.getElementById('poolSearchInput');
      if (searchInput) {
        searchInput.value = '';
        Dashboard.ui.applyPoolFilter('');
        searchInput.focus();
      }
    }
    
    // Alt+T to toggle themes
    if (e.altKey && e.key === 't') {
      e.preventDefault();
      if (Dashboard.core && Dashboard.core.toggleTheme) {
        Dashboard.core.toggleTheme();
      }
    }
    
    // Alt+F to flush dashboard DNS cache
    if (e.altKey && e.key === 'f') {
      e.preventDefault();
      if (Dashboard.client && Dashboard.client.flushDNSCache) {
        Dashboard.client.flushDNSCache();
      }
    }
    
    // Alt+R to resolve dashboard DNS
    if (e.altKey && e.key === 'r') {
      e.preventDefault();
      if (Dashboard.client && Dashboard.client.resolveDNS) {
        Dashboard.client.resolveDNS();
      }
    }
    
    // Alt+L to toggle logger
    if (e.altKey && e.key === 'l') {
      e.preventDefault();
      if (Dashboard.logger && Dashboard.logger.toggleLogger) {
        Dashboard.logger.toggleLogger();
      } else if (Dashboard.ui && Dashboard.ui.toggleLogger) {
        Dashboard.ui.toggleLogger();
      }
    }
    
    // Alt+H to toggle bottom bar visibility
    if (e.altKey && e.key === 'h') {
      e.preventDefault();
      if (Dashboard.ui && Dashboard.ui.toggleBottomBar) {
        Dashboard.ui.toggleBottomBar();
      }
    }
    
    // Alt+S to cycle through site dropdown options
    if (e.altKey && e.key === 's') {
      e.preventDefault();
      if (Dashboard.ui && Dashboard.ui.cycleSiteSelection) {
        Dashboard.ui.cycleSiteSelection();
      }
    }
    
    // Alt+P to cycle through refresh polling options
    if (e.altKey && e.key === 'p') {
      e.preventDefault();
      if (Dashboard.ui && Dashboard.ui.cycleRefreshInterval) {
        Dashboard.ui.cycleRefreshInterval();
      }
    }
    
    // Alt+A to toggle alias display mode
    if (e.altKey && e.key === 'a') {
      e.preventDefault();
      if (Dashboard.core && Dashboard.core.toggleAlias) {
        Dashboard.core.toggleAlias();
      }
    }
    
    // Alt+1-5 to load saved searches
    if (e.altKey && !e.shiftKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
      e.preventDefault();
      const slotNumber = parseInt(e.key);
      Dashboard.ui.applySavedSearch(slotNumber);
    }
    
    // Alt+Shift+1-5 to save current search 
    if (e.altKey && e.shiftKey && ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
      e.preventDefault();
      const slotNumber = parseInt(e.code.replace('Digit', ''));
      const searchInput = document.getElementById('poolSearchInput');
      const currentSearch = searchInput ? searchInput.value : '';
      Dashboard.ui.saveSavedSearch(slotNumber, currentSearch);
    }
    
    // Escape to clear filter and focus search
    if (e.key === 'Escape') {
      const instanceState = Dashboard.ui.getInstanceState();
      if (instanceState.searchFilterActive) {
        const searchInput = document.getElementById('poolSearchInput');
        if (searchInput && document.activeElement === searchInput) {
          Dashboard.ui.clearPoolFilter();
        }
      }
    }
  });
};

/**
 * Cycle through refresh interval options with Alt+P keyboard shortcut
 */
Dashboard.ui.cycleRefreshInterval = function() {
  const validIntervals = [10, 30, 60, 90];
  
  // Get current refresh interval from Dashboard state
  const currentInterval = Dashboard.state ? Dashboard.state.refreshInterval : 30;
  
  // Find current interval index
  let currentIndex = validIntervals.indexOf(currentInterval);
  
  // If current interval not found, start from beginning
  if (currentIndex === -1) {
    currentIndex = 0;
  } else {
    // Move to next interval (with wraparound)
    currentIndex = (currentIndex + 1) % validIntervals.length;
  }
  
  const nextInterval = validIntervals[currentIndex];
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Alt+P cycling refresh interval from', currentInterval + 's to', nextInterval + 's');
  }
  
  // Use Client module changeRefreshInterval function to handle the change
  if (Dashboard.client && Dashboard.client.changeRefreshInterval) {
    Dashboard.client.changeRefreshInterval(nextInterval);
  } else {
    console.warn('UI: Dashboard.client.changeRefreshInterval not available');
  }
};

/**
 * Cycle through site dropdown options with Alt+S keyboard shortcut
 */
Dashboard.ui.cycleSiteSelection = function() {
  const siteSelect = document.getElementById('siteSelect');
  if (!siteSelect) {
    console.warn('UI: Site dropdown not found');
    return;
  }
  
  // Get all options excluding the disabled separator
  const allOptions = Array.from(siteSelect.options).filter(option => !option.disabled);
  
  if (allOptions.length === 0) {
    console.warn('UI: No site options available for cycling');
    return;
  }
  
  // Find current selection index
  const currentValue = siteSelect.value;
  let currentIndex = allOptions.findIndex(option => option.value === currentValue);
  
  // If current selection not found, start from beginning
  if (currentIndex === -1) {
    currentIndex = 0;
  } else {
    // Move to next option (with wraparound)
    currentIndex = (currentIndex + 1) % allOptions.length;
  }
  
  const nextOption = allOptions[currentIndex];
  const nextSite = nextOption.value;
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    const displayName = nextSite || '(clear selection)';
    console.log('UI: Alt+S cycling to site:', displayName);
  }
  
  // Use Client module changeSite function to handle the switch
  if (Dashboard.client && Dashboard.client.changeSite) {
    Dashboard.client.changeSite(nextSite);
  } else {
    console.warn('UI: Dashboard.client.changeSite not available');
  }
};

/**
 * Add CSS styles for search filter (integrated into top controls)
 */
Dashboard.ui.addSearchFilterStyles = function() {
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Search filter styles now integrated into top controls');
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compare IP addresses for sorting (handles both IPv4 and IPv6)
 * @param {string} ip1 - First IP address to compare
 * @param {string} ip2 - Second IP address to compare
 * @returns {number} Sort comparison result (-1, 0, or 1)
 */
Dashboard.ui.compareIPAddresses = function(ip1, ip2) {
  // Handle IPv4 addresses
  if (ip1.includes('.') && ip2.includes('.') && !ip1.includes(':') && !ip2.includes(':')) {
    const parts1 = ip1.split('.').map(num => parseInt(num, 10));
    const parts2 = ip2.split('.').map(num => parseInt(num, 10));
    
    for (let i = 0; i < 4; i++) {
      if (parts1[i] !== parts2[i]) {
        return parts1[i] - parts2[i];
      }
    }
    return 0;
  }
  
  // Handle IPv6 addresses
  if (ip1.includes(':') && ip2.includes(':')) {
    const normalizeIPv6 = function(ipv6) {
      if (ipv6.includes('::')) {
        const parts = ipv6.split('::');
        const leftParts = parts[0] ? parts[0].split(':') : [];
        const rightParts = parts[1] ? parts[1].split(':') : [];
        const missingParts = 8 - leftParts.length - rightParts.length;
        const expandedParts = leftParts.concat(Array(missingParts).fill('0')).concat(rightParts);
        return expandedParts.map(part => part.padStart(4, '0')).join(':');
      }
      return ipv6.split(':').map(part => part.padStart(4, '0')).join(':');
    };
    
    const normalized1 = normalizeIPv6(ip1);
    const normalized2 = normalizeIPv6(ip2);
    return normalized1.localeCompare(normalized2);
  }
  
  // Mixed IPv4/IPv6 - IPv4 comes first
  if (ip1.includes('.') && !ip1.includes(':') && ip2.includes(':')) {
    return -1;
  }
  if (ip2.includes('.') && !ip2.includes(':') && ip1.includes(':')) {
    return 1;
  }
  
  return ip1.localeCompare(ip2);
};

/**
 * Get display name for pool based on alias mode and availability
 * @param {Object} pool - Pool data object with name and alias fields
 * @returns {string} Display name (alias or pool name based on current mode)
 */
Dashboard.ui.getPoolDisplayName = function(pool) {
  // Check if alias mode is enabled and alias is available
  if (Dashboard.state.currentAliasMode && pool.alias && pool.alias !== null && pool.alias !== 'null') {
    // Convert underscores to spaces for alias display
    return pool.alias.replace(/_/g, ' ');
  }
  
  // Fall back to pool name
  return pool.name;
};

/**
 * Get tooltip text for pool display name showing alternate name
 * @param {Object} pool - Pool data object with name and alias fields
 * @returns {string} Tooltip text showing the non-displayed name
 */
Dashboard.ui.getPoolDisplayTooltip = function(pool) {
  // If showing alias, tooltip shows the actual pool name
  if (Dashboard.state.currentAliasMode && pool.alias && pool.alias !== null && pool.alias !== 'null') {
    return 'Pool Name: ' + pool.name;
  }
  
  // If showing pool name, tooltip shows alias if available (convert underscores to spaces)
  if (pool.alias && pool.alias !== null && pool.alias !== 'null') {
    return 'Pool Alias: ' + pool.alias.replace(/_/g, ' ');
  }
  
  // No alias available
  return 'Pool Name: ' + pool.name;
};
/**
 * Ensure backward compatibility with logger functions for legacy code support
 */
Dashboard.ui.ensureLoggerCompatibility = function() {
  if (!Dashboard.ui.toggleLogger) {
    Dashboard.ui.toggleLogger = function() {
      console.warn('UI: Logger module not loaded - toggleLogger called');
      if (Dashboard.logger && Dashboard.logger.toggleLogger) {
        Dashboard.logger.toggleLogger();
      }
    };
  }
  
  if (!Dashboard.ui.addLogEntry) {
    Dashboard.ui.addLogEntry = function() {
      console.warn('UI: Logger module not loaded - addLogEntry called');
      if (Dashboard.logger && Dashboard.logger.addLogEntry) {
        Dashboard.logger.addLogEntry.apply(Dashboard.logger, arguments);
      }
    };
  }
  
  if (!Dashboard.ui.destroyLogger) {
    Dashboard.ui.destroyLogger = function() {
      console.warn('UI: Logger module not loaded - destroyLogger called');
      if (Dashboard.logger && Dashboard.logger.destroyLogger) {
        Dashboard.logger.destroyLogger();
      }
    };
  }
  
  if (!Dashboard.ui.logger) {
    Dashboard.ui.logger = {
      initialized: false,
      visible: false,
      expanded: false
    };
  }
  
  if (window.dashboardConfig && window.dashboardConfig.debugEnabled) {
    console.log('UI: Logger compatibility stubs initialized');
  }
};

console.log('Dashboard UI module loaded successfully');