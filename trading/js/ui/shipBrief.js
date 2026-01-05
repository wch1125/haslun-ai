/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SHIP BRIEF — Unified Ship Dialog Component
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * A single, shared dialog for viewing ship/vessel details across all pages.
 * Replaces multiple popup variants with one consistent interface.
 * 
 * Usage:
 *   ShipBrief.open('RKLB', { source: 'fleet' })
 *   ShipBrief.close()
 *   ShipBrief.isOpen()
 * 
 * Events:
 *   window.addEventListener('shipbrief:open', e => console.log(e.detail.ticker))
 *   window.addEventListener('shipbrief:close', e => console.log(e.detail.ticker))
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

window.ShipBrief = (function() {
  'use strict';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  let dialogEl = null;
  let currentTicker = null;
  let previousFocus = null;
  let isVisible = false;
  let options = {};
  
  // Timer references (for cleanup on close)
  let bootTimer = null;
  let barTimer = null;
  let focusTimer = null;
  let closeTimer = null;
  
  // Default fallback sprite
  const DEFAULT_SPRITE = 'assets/ships/Unclaimed-Drone-ship.png';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOUND CONFIGURATION
  // Global flag to enable/disable UI sounds (default: OFF for accessibility)
  // Set window.UI_SOUND_ENABLED = true to enable sounds
  // ═══════════════════════════════════════════════════════════════════════════
  
  function isSoundEnabled() {
    return window.UI_SOUND_ENABLED === true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DIALOG HTML TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  function createDialogHTML() {
    return `
      <div class="ship-brief-backdrop"></div>
      <div class="ship-brief-container" role="dialog" aria-modal="true" aria-labelledby="ship-brief-title">
        <!-- Boot Animation Overlay -->
        <div class="ship-brief-boot" id="ship-brief-boot">
          <div class="ship-brief-boot-line"></div>
          <div class="ship-brief-boot-text">ACCESSING FLEET REGISTRY...</div>
        </div>
        
        <!-- Close Button -->
        <button class="ship-brief-close" id="ship-brief-close" aria-label="Close dialog">
          <span class="ship-brief-close-icon">×</span>
          <span class="ship-brief-close-text">ESC</span>
        </button>
        
        <!-- Main Content -->
        <div class="ship-brief-content">
          <!-- Left Panel: Ship Visual -->
          <div class="ship-brief-visual">
            <div class="ship-brief-display">
              <!-- Scan Frame -->
              <div class="ship-brief-scan-frame">
                <div class="ship-brief-scan-corner tl"></div>
                <div class="ship-brief-scan-corner tr"></div>
                <div class="ship-brief-scan-corner bl"></div>
                <div class="ship-brief-scan-corner br"></div>
                <div class="ship-brief-scan-line"></div>
              </div>
              <!-- Ship Image -->
              <img id="ship-brief-img" src="" alt="" class="ship-brief-img">
            </div>
            
            <!-- Role Badge -->
            <div class="ship-brief-role" id="ship-brief-role">FLAGSHIP</div>
            
            <!-- Status Line -->
            <div class="ship-brief-authority" id="ship-brief-authority">
              <span class="ship-brief-authority-icon">◈</span>
              <span class="ship-brief-authority-text">COMMAND AUTHORITY ACTIVE</span>
            </div>
          </div>
          
          <!-- Right Panel: Ship Data -->
          <div class="ship-brief-data">
            <!-- Identity -->
            <div class="ship-brief-section ship-brief-identity">
              <div class="ship-brief-ticker" id="ship-brief-ticker">RKLB</div>
              <div class="ship-brief-name" id="ship-brief-name">ELECTRON</div>
              <div class="ship-brief-designation" id="ship-brief-designation">FSC-001</div>
            </div>
            
            <!-- Systems Status -->
            <div class="ship-brief-section">
              <div class="ship-brief-section-header">
                <span class="ship-brief-marker">▸</span>
                <span>SYSTEMS STATUS</span>
              </div>
              <div class="ship-brief-stats">
                <div class="ship-brief-stat">
                  <div class="ship-brief-stat-header">
                    <span class="ship-brief-stat-label">HULL INTEGRITY</span>
                    <span class="ship-brief-stat-value" id="ship-brief-hull-val">—</span>
                  </div>
                  <div class="ship-brief-stat-bar">
                    <div class="ship-brief-stat-fill hull" id="ship-brief-hull-bar"></div>
                  </div>
                </div>
                <div class="ship-brief-stat">
                  <div class="ship-brief-stat-header">
                    <span class="ship-brief-stat-label">CARGO HOLD</span>
                    <span class="ship-brief-stat-value" id="ship-brief-cargo-val">—</span>
                  </div>
                  <div class="ship-brief-stat-bar">
                    <div class="ship-brief-stat-fill cargo" id="ship-brief-cargo-bar"></div>
                  </div>
                </div>
                <div class="ship-brief-stat">
                  <div class="ship-brief-stat-header">
                    <span class="ship-brief-stat-label">FUEL RESERVES</span>
                    <span class="ship-brief-stat-value" id="ship-brief-fuel-val">—</span>
                  </div>
                  <div class="ship-brief-stat-bar">
                    <div class="ship-brief-stat-fill fuel" id="ship-brief-fuel-bar"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Operations Data -->
            <div class="ship-brief-section">
              <div class="ship-brief-section-header">
                <span class="ship-brief-marker">▸</span>
                <span>OPERATIONS DATA</span>
              </div>
              <div class="ship-brief-ops">
                <div class="ship-brief-ops-item">
                  <span class="ship-brief-ops-label">POSITION VALUE</span>
                  <span class="ship-brief-ops-value" id="ship-brief-value">—</span>
                </div>
                <div class="ship-brief-ops-item">
                  <span class="ship-brief-ops-label">P&L STATUS</span>
                  <span class="ship-brief-ops-value" id="ship-brief-pnl">—</span>
                </div>
                <div class="ship-brief-ops-item">
                  <span class="ship-brief-ops-label">RETURN</span>
                  <span class="ship-brief-ops-value" id="ship-brief-return">—</span>
                </div>
                <div class="ship-brief-ops-item">
                  <span class="ship-brief-ops-label">MISSION STATUS</span>
                  <span class="ship-brief-ops-value" id="ship-brief-mission">—</span>
                </div>
              </div>
            </div>
            
            <!-- Observation Mode Notice -->
            <div class="ship-brief-notice" id="ship-brief-notice" style="display: none;">
              <span class="ship-brief-notice-icon">◎</span>
              <span class="ship-brief-notice-text">NO POSITION — OBSERVATION MODE</span>
            </div>
          </div>
        </div>
        
        <!-- Footer Actions -->
        <div class="ship-brief-footer">
          <button class="ship-brief-action secondary" id="ship-brief-action-mission">
            <span class="ship-brief-action-icon">⚔</span>
            ASSIGN MISSION
          </button>
          <button class="ship-brief-action primary" id="ship-brief-action-telemetry">
            <span class="ship-brief-action-icon">◈</span>
            VIEW TELEMETRY
          </button>
        </div>
      </div>
    `;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DIALOG CREATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  function ensureDialog() {
    if (dialogEl) return;
    
    dialogEl = document.createElement('div');
    dialogEl.id = 'ship-brief-dialog';
    dialogEl.className = 'ship-brief-dialog';
    dialogEl.innerHTML = createDialogHTML();
    document.body.appendChild(dialogEl);
    
    // Wire up event listeners
    const backdrop = dialogEl.querySelector('.ship-brief-backdrop');
    const closeBtn = dialogEl.querySelector('#ship-brief-close');
    const telemetryBtn = dialogEl.querySelector('#ship-brief-action-telemetry');
    const missionBtn = dialogEl.querySelector('#ship-brief-action-mission');
    
    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    
    telemetryBtn.addEventListener('click', () => {
      if (currentTicker) {
        navigateToTelemetry(currentTicker);
      }
    });
    
    missionBtn.addEventListener('click', () => {
      if (currentTicker) {
        navigateToMissions(currentTicker);
      }
    });
    
    // Keyboard handling
    dialogEl.addEventListener('keydown', handleKeydown);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DATA RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  function resolveShipData(ticker) {
    const data = {
      ticker: ticker,
      name: ticker,
      designation: 'UNK-XXX',
      sector: 'UNKNOWN',
      sprite: DEFAULT_SPRITE,
      color: '#33ff99',
      role: 'UTILITY',
      hasPosition: false,
      value: 0,
      pnl: 0,
      pnlPct: 0,
      shares: 0,
      hull: 50,
      cargo: 0,
      fuel: 50,
      isOperational: true,
      lore: 'Unknown vessel. No registry data available.'
    };
    
    // Get ship names from global
    if (window.SHIP_NAMES && SHIP_NAMES[ticker]) {
      data.name = SHIP_NAMES[ticker].name || ticker;
      data.designation = SHIP_NAMES[ticker].designation || 'UNK-XXX';
    }
    
    // Get sprite from global
    if (window.SHIP_SPRITES && SHIP_SPRITES[ticker]) {
      data.sprite = SHIP_SPRITES[ticker];
    }
    
    // Get ticker color from global
    if (window.tickerColors && tickerColors[ticker]) {
      data.color = tickerColors[ticker];
    }
    
    // Get sector/theme from global
    if (window.tickerThemes && tickerThemes[ticker]) {
      data.sector = tickerThemes[ticker].toUpperCase();
    }
    
    // Get profile data
    if (window.TICKER_PROFILES && TICKER_PROFILES[ticker]) {
      const profile = TICKER_PROFILES[ticker];
      data.lore = profile.briefDescription || profile.overview || data.lore;
    }
    
    // Get position data (check multiple sources)
    let position = null;
    
    // Check DEMO_STOCK_POSITIONS (index.html)
    if (window.DEMO_STOCK_POSITIONS) {
      position = DEMO_STOCK_POSITIONS.find(p => p.ticker === ticker);
    }
    
    // Check holdings from holdings manager if available
    if (!position && window.HoldingsManager) {
      const holdings = HoldingsManager.getAll?.() || [];
      position = holdings.find(h => h.ticker === ticker);
    }
    
    if (position) {
      data.hasPosition = true;
      data.shares = position.shares || 0;
      data.value = (position.shares || 0) * (position.current_price || position.price || 0);
      data.pnl = ((position.current_price || position.price || 0) - (position.entry_price || position.avgCost || 0)) * (position.shares || 0);
      data.pnlPct = position.entry_price ? ((position.current_price - position.entry_price) / position.entry_price * 100) : 0;
      data.isOperational = data.pnlPct >= 0;
      
      // Calculate stats based on position
      data.hull = Math.max(10, Math.min(100, 50 + data.pnlPct * 2));
      
      // Cargo as % of total portfolio
      if (window.DEMO_STOCK_POSITIONS) {
        const totalShares = DEMO_STOCK_POSITIONS.reduce((s, p) => s + (p.shares || 0), 0);
        data.cargo = totalShares > 0 ? Math.round((data.shares / totalShares) * 100) : 0;
      } else {
        data.cargo = Math.min(100, data.shares);
      }
      
      // Fuel is semi-random but deterministic per ticker
      data.fuel = 60 + (ticker.charCodeAt(0) % 30);
    }
    
    // Determine role based on data
    data.role = determineRole(ticker, data);
    
    // Get lore from pixel ship mapping if available
    if (window.mapTickerToPixelShip && window.PIXEL_SHIP_LORE) {
      const shipMeta = mapTickerToPixelShip(ticker, data.sector, data.pnlPct);
      const shipLore = PIXEL_SHIP_LORE[shipMeta?.pattern] || {};
      if (shipLore.label) data.role = shipLore.label;
      if (shipLore.lore) data.lore = shipLore.lore;
    }
    
    return data;
  }
  
  function determineRole(ticker, data) {
    // Flagship: highest value position or RKLB
    if (ticker === 'RKLB') return 'FLAGSHIP';
    
    // Check if this is the highest value position
    if (window.DEMO_STOCK_POSITIONS && data.hasPosition) {
      const sorted = [...DEMO_STOCK_POSITIONS].sort((a, b) => 
        (b.shares * b.current_price) - (a.shares * a.current_price)
      );
      if (sorted[0]?.ticker === ticker) return 'FLAGSHIP';
    }
    
    // Sector-based roles
    const sectorRoles = {
      'SPACE': 'ORBITAL',
      'EVTOL': 'ESCORT',
      'DEFENSE': 'TACTICAL',
      'MEME': 'WILDCARD',
      'MATERIALS': 'HAULER',
      'INDUSTRIAL': 'UTILITY'
    };
    
    return sectorRoles[data.sector] || 'UTILITY';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UI UPDATES
  // ═══════════════════════════════════════════════════════════════════════════
  
  function updateDialog(data) {
    // Set CSS custom property for ship color
    dialogEl.style.setProperty('--ship-color', data.color);
    
    // Ship image
    const img = dialogEl.querySelector('#ship-brief-img');
    img.src = data.sprite;
    img.alt = data.ticker + ' vessel';
    
    // Identity
    const tickerEl = dialogEl.querySelector('#ship-brief-ticker');
    tickerEl.textContent = data.ticker;
    tickerEl.style.color = data.color;
    
    dialogEl.querySelector('#ship-brief-name').textContent = data.name;
    dialogEl.querySelector('#ship-brief-designation').textContent = data.designation;
    
    // Role badge
    const roleEl = dialogEl.querySelector('#ship-brief-role');
    roleEl.textContent = data.role;
    roleEl.style.color = data.color;
    roleEl.style.borderColor = data.color;
    
    // Authority line (show only for flagship or operational)
    const authorityEl = dialogEl.querySelector('#ship-brief-authority');
    if (data.role === 'FLAGSHIP') {
      authorityEl.querySelector('.ship-brief-authority-text').textContent = 'COMMAND AUTHORITY ACTIVE';
      authorityEl.style.display = '';
    } else if (data.hasPosition && data.isOperational) {
      authorityEl.querySelector('.ship-brief-authority-text').textContent = 'SYSTEMS NOMINAL';
      authorityEl.style.display = '';
    } else {
      authorityEl.style.display = 'none';
    }
    
    // Status bars (reset for animation)
    const hullBar = dialogEl.querySelector('#ship-brief-hull-bar');
    const cargoBar = dialogEl.querySelector('#ship-brief-cargo-bar');
    const fuelBar = dialogEl.querySelector('#ship-brief-fuel-bar');
    
    hullBar.style.width = '0%';
    cargoBar.style.width = '0%';
    fuelBar.style.width = '0%';
    
    hullBar.classList.toggle('damaged', !data.isOperational);
    
    dialogEl.querySelector('#ship-brief-hull-val').textContent = data.hasPosition ? data.hull.toFixed(0) + '%' : '—';
    dialogEl.querySelector('#ship-brief-cargo-val').textContent = data.hasPosition ? data.shares + ' UNITS' : '—';
    dialogEl.querySelector('#ship-brief-fuel-val').textContent = data.hasPosition ? data.fuel.toFixed(0) + '%' : '—';
    
    // Operations data
    if (data.hasPosition) {
      dialogEl.querySelector('#ship-brief-value').textContent = '$' + data.value.toLocaleString(undefined, { maximumFractionDigits: 0 });
      
      const pnlEl = dialogEl.querySelector('#ship-brief-pnl');
      pnlEl.textContent = (data.pnl >= 0 ? '+' : '') + '$' + Math.abs(data.pnl).toFixed(0);
      pnlEl.className = 'ship-brief-ops-value ' + (data.pnl >= 0 ? 'positive' : 'negative');
      
      const returnEl = dialogEl.querySelector('#ship-brief-return');
      returnEl.textContent = (data.pnlPct >= 0 ? '+' : '') + data.pnlPct.toFixed(1) + '%';
      returnEl.className = 'ship-brief-ops-value ' + (data.pnlPct >= 0 ? 'positive' : 'negative');
      
      const missionEl = dialogEl.querySelector('#ship-brief-mission');
      missionEl.textContent = data.isOperational ? 'OPERATIONAL' : 'DAMAGED';
      missionEl.className = 'ship-brief-ops-value status-' + (data.isOperational ? 'operational' : 'damaged');
      
      dialogEl.querySelector('#ship-brief-notice').style.display = 'none';
    } else {
      // Observation mode
      dialogEl.querySelector('#ship-brief-value').textContent = '—';
      dialogEl.querySelector('#ship-brief-pnl').textContent = '—';
      dialogEl.querySelector('#ship-brief-pnl').className = 'ship-brief-ops-value';
      dialogEl.querySelector('#ship-brief-return').textContent = '—';
      dialogEl.querySelector('#ship-brief-return').className = 'ship-brief-ops-value';
      dialogEl.querySelector('#ship-brief-mission').textContent = 'STANDBY';
      dialogEl.querySelector('#ship-brief-mission').className = 'ship-brief-ops-value status-standby';
      
      dialogEl.querySelector('#ship-brief-notice').style.display = '';
    }
  }
  
  function animateBars(data) {
    const hullBar = dialogEl.querySelector('#ship-brief-hull-bar');
    const cargoBar = dialogEl.querySelector('#ship-brief-cargo-bar');
    const fuelBar = dialogEl.querySelector('#ship-brief-fuel-bar');
    
    if (data.hasPosition) {
      hullBar.style.width = data.hull + '%';
      cargoBar.style.width = data.cargo + '%';
      fuelBar.style.width = data.fuel + '%';
    } else {
      hullBar.style.width = '50%';
      cargoBar.style.width = '0%';
      fuelBar.style.width = '50%';
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL & FOCUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  function lockScroll() {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('ship-brief-open');
  }
  
  function unlockScroll() {
    document.body.style.overflow = '';
    document.body.classList.remove('ship-brief-open');
  }
  
  function trapFocus() {
    const focusable = dialogEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    
    // Tab trapping
    if (e.key === 'Tab') {
      const focusable = dialogEl.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  
  // Global ESC handler (in case focus is outside dialog)
  function globalKeydown(e) {
    if (e.key === 'Escape' && isVisible) {
      e.preventDefault();
      close();
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  function navigateToTelemetry(ticker) {
    close();
    
    // If on index.html, switch to chart tab and select ticker
    if (window.selectTicker && window.switchTab) {
      selectTicker(ticker);
      switchTab('chart');
    } else {
      // Navigate to index.html with ticker param
      window.location.href = 'index.html?ticker=' + encodeURIComponent(ticker);
    }
  }
  
  function navigateToMissions(ticker) {
    close();
    
    // Navigate to derivatives.html (Mission Command) with ticker
    window.location.href = 'derivatives.html?ticker=' + encodeURIComponent(ticker);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOUND EFFECTS (gated behind UI_SOUND_ENABLED)
  // ═══════════════════════════════════════════════════════════════════════════
  
  function playOpenSound() {
    if (!isSoundEnabled()) return;
    
    if (window.beep) {
      beep(220, 0.1);
      setTimeout(() => beep(330, 0.08), 100);
      setTimeout(() => beep(440, 0.08), 200);
    } else if (window.SoundFX) {
      SoundFX.play('click');
    }
  }
  
  function playCloseSound() {
    if (!isSoundEnabled()) return;
    
    if (window.beep) {
      beep(330, 0.05);
    } else if (window.SoundFX) {
      SoundFX.play('click');
    }
  }
  
  function playBarSound() {
    if (!isSoundEnabled()) return;
    
    if (window.beep) {
      beep(523, 0.05);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Open the ship brief dialog
   * @param {string} ticker - Ticker symbol
   * @param {Object} opts - Options { source: 'fleet'|'telemetry'|'missions', ... }
   */
  function open(ticker, opts = {}) {
    if (!ticker) {
      console.warn('[ShipBrief] No ticker provided');
      return;
    }
    
    ensureDialog();
    
    currentTicker = ticker;
    options = opts;
    
    // Resolve ship data
    const data = resolveShipData(ticker);
    
    // Update dialog content
    updateDialog(data);
    
    // Store previous focus
    previousFocus = document.activeElement;
    
    // Lock scroll
    lockScroll();
    
    // Clear any existing timers from previous open
    clearAllTimers();
    
    // Reset boot animation
    const bootOverlay = dialogEl.querySelector('#ship-brief-boot');
    bootOverlay.classList.remove('done');
    
    // Show dialog
    dialogEl.classList.remove('hidden');
    requestAnimationFrame(() => {
      dialogEl.classList.add('visible');
    });
    
    isVisible = true;
    
    // Play sound
    playOpenSound();
    
    // Add global ESC listener
    document.addEventListener('keydown', globalKeydown);
    
    // Boot animation sequence (tracked for cleanup)
    bootTimer = setTimeout(() => {
      if (!isVisible) return; // Guard against close during animation
      bootOverlay.classList.add('done');
      
      // Animate bars after boot
      barTimer = setTimeout(() => {
        if (!isVisible) return;
        animateBars(data);
        playBarSound();
      }, 200);
      
      // Trap focus after animation
      focusTimer = setTimeout(() => {
        if (!isVisible) return;
        trapFocus();
      }, 100);
    }, 600);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('shipbrief:open', { 
      detail: { ticker, source: opts.source || 'unknown' } 
    }));
    
    // Log if terminal available
    if (window.logTerminal) {
      logTerminal('SHIP BRIEF: ' + ticker + ' [' + data.name + '] accessed');
    }
  }
  
  /**
   * Clear all pending timers
   */
  function clearAllTimers() {
    if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
    if (barTimer) { clearTimeout(barTimer); barTimer = null; }
    if (focusTimer) { clearTimeout(focusTimer); focusTimer = null; }
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  }
  
  /**
   * Close the ship brief dialog
   */
  function close() {
    if (!dialogEl || !isVisible) return;
    
    const closingTicker = currentTicker;
    
    // Clear all pending timers
    clearAllTimers();
    
    // Hide dialog
    dialogEl.classList.remove('visible');
    
    closeTimer = setTimeout(() => {
      dialogEl.classList.add('hidden');
      currentTicker = null;
      isVisible = false;
    }, 300);
    
    // Unlock scroll
    unlockScroll();
    
    // Remove global ESC listener
    document.removeEventListener('keydown', globalKeydown);
    
    // Restore focus
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
    previousFocus = null;
    
    // Play sound
    playCloseSound();
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('shipbrief:close', { 
      detail: { ticker: closingTicker } 
    }));
    
    // Log if terminal available
    if (window.logTerminal) {
      logTerminal('ship brief closed');
    }
  }
  
  /**
   * Check if dialog is currently open
   * @returns {boolean}
   */
  function isOpen() {
    return isVisible;
  }
  
  /**
   * Get current ticker shown in dialog
   * @returns {string|null}
   */
  function getCurrentTicker() {
    return currentTicker;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Alias for backward compatibility
  window.openShipBrief = open;
  window.closeShipBrief = close;
  window.isShipBriefOpen = isOpen;
  
  // Replace legacy openVesselDossier if it exists
  // This allows existing code to continue working
  window.openVesselDossier = function(ticker) {
    open(ticker, { source: 'legacy' });
  };
  
  window.closeVesselDossier = close;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    open,
    close,
    isOpen,
    getCurrentTicker
  };
  
})();
