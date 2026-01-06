// =========================================================================
// COCKPIT NAVIGATION CONTROLLER (Optimized)
// Three pillars: HANGAR | BATTLE ARENA | NEWS
// Version: 2.0 - Fixed initialization, mobile touch, accessibility
// =========================================================================

(function() {
  'use strict';

  // Ship sprites fallback map (in case SHIP_SPRITES isn't loaded yet)
  const SPRITE_FALLBACK = {
    RKLB: 'assets/ships/static/RKLB-flagship-ship.png',
    ACHR: 'assets/ships/static/ACHR-eVTOL-ship.png',
    LUNR: 'assets/ships/static/LUNR-lander-ship.png',
    JOBY: 'assets/ships/static/JOBY-eVTOL-light-class-ship.png',
    ASTS: 'assets/ships/static/ASTS-Communications-Relay-Ship.png',
    BKSY: 'assets/ships/static/BKSY-recon-ship.png',
    GME: 'assets/ships/static/GME-moonshot-ship.png',
    GE: 'assets/ships/static/GE-Stealth-Bomber-ship.png',
    KTOS: 'assets/ships/static/KTOS-Fighter-Ship.png',
    LHX: 'assets/ships/static/LHX-Drone-ship.png',
    PL: 'assets/ships/static/PL-scout-ship.png',
    RDW: 'assets/ships/static/RDW-Hauler-ship.png',
    RTX: 'assets/ships/static/RTX-Officer-Class-Ship.png',
    COHR: 'assets/ships/static/COHR-Glass-Reflector-ship.png',
    EVEX: 'assets/ships/static/EVEX-Transport-Ship.png'
  };
  
  const DEFAULT_SPRITE = 'assets/ships/static/RKLB-flagship-ship.png';

  const CockpitNav = {
    currentPanel: 'hangar',
    selectedShip: 'RKLB',
    ships: ['RKLB', 'ACHR', 'LUNR', 'JOBY', 'ASTS', 'BKSY', 'GME', 'GE', 'KTOS', 'LHX', 'PL', 'RDW', 'RTX', 'COHR', 'EVEX'],
    _initialized: false,
    _currentOpponent: null,
    
    // Get sprite URL with proper fallbacks
    getSprite(ticker) {
      if (window.SHIP_SPRITES && window.SHIP_SPRITES[ticker]) {
        return window.SHIP_SPRITES[ticker];
      }
      return SPRITE_FALLBACK[ticker] || DEFAULT_SPRITE;
    },
    
    init() {
      if (this._initialized) return;
      this._initialized = true;
      
      // Add cockpit-active class to body
      document.body.classList.add('cockpit-active');
      
      this.bindNavigation();
      this.initHangar();
      this.initBattleArena();
      this.initNews();
      
      // Properly show hangar panel (fix the display:none conflict)
      this.switchPanel('hangar');
      
      // Keyboard shortcuts (use different keys to avoid conflict with accessibility.js)
      document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Use Shift+1/2/3 for cockpit nav to avoid conflicts
        if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
          if (e.key === '!') { e.preventDefault(); this.switchPanel('hangar'); }
          if (e.key === '@') { e.preventDefault(); this.switchPanel('battle'); }
          if (e.key === '#') { e.preventDefault(); this.switchPanel('news'); }
        }
        
        // B for battle (unchanged)
        if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          this.launchBattle();
        }
      });
      
      console.log('[CockpitNav] Initialized - 3 Panel Architecture Active');
    },
    
    bindNavigation() {
      document.querySelectorAll('.hud-btn').forEach(btn => {
        // Support both click and touch
        const handler = (e) => {
          e.preventDefault();
          const panel = btn.dataset.panel;
          if (panel) this.switchPanel(panel);
        };
        
        btn.addEventListener('click', handler);
        btn.addEventListener('touchend', handler, { passive: false });
      });
    },
    
    switchPanel(panel) {
      this.currentPanel = panel;
      
      // Update HUD buttons
      document.querySelectorAll('.hud-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.panel === panel);
        btn.setAttribute('aria-selected', btn.dataset.panel === panel ? 'true' : 'false');
      });
      
      // Hide ALL old tab panels
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      
      // Hide all cockpit panels first
      document.querySelectorAll('.cockpit-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
        p.setAttribute('aria-hidden', 'true');
      });
      
      // Show the appropriate panel
      let targetPanel = null;
      
      if (panel === 'hangar') {
        targetPanel = document.getElementById('hangar-panel-new');
      } else if (panel === 'battle') {
        targetPanel = document.getElementById('battle-panel');
        this.showBattleReady();
      } else if (panel === 'news') {
        targetPanel = document.getElementById('news-panel');
        this.populateNewsFeed();
      }
      
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block';
        targetPanel.setAttribute('aria-hidden', 'false');
      }
      
      // Hide sidebar on mobile
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && window.innerWidth < 1024) {
        sidebar.style.display = 'none';
      }
      
      // Announce panel change to screen readers
      this.announceToScreenReader(`${panel} panel now active`);
    },
    
    // Accessibility helper
    announceToScreenReader(message) {
      let announcer = document.getElementById('cockpit-announcer');
      if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = 'cockpit-announcer';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
        document.body.appendChild(announcer);
      }
      announcer.textContent = message;
    },
    
    // -------------------------------------------------------------------------
    // HANGAR - Ship Display & Stats
    // -------------------------------------------------------------------------
    initHangar() {
      this.renderShipSelector();
      this.updateShipDisplay();
    },
    
    renderShipSelector() {
      const grid = document.getElementById('ship-selector-grid');
      if (!grid) return;
      
      grid.innerHTML = this.ships.map(ticker => {
        const sprite = this.getSprite(ticker);
        return `
          <button class="ship-selector-btn ${ticker === this.selectedShip ? 'active' : ''}" 
                  data-ticker="${ticker}" 
                  title="Select ${ticker}"
                  aria-label="Select ${ticker} ship"
                  aria-pressed="${ticker === this.selectedShip}">
            <img src="${sprite}" 
                 alt="${ticker}" 
                 loading="lazy" 
                 width="36" 
                 height="36">
          </button>
        `;
      }).join('');
      
      grid.querySelectorAll('.ship-selector-btn').forEach(btn => {
        const handler = (e) => {
          e.preventDefault();
          this.selectShip(btn.dataset.ticker);
        };
        btn.addEventListener('click', handler);
        btn.addEventListener('touchend', handler, { passive: false });
      });
    },
    
    selectShip(ticker) {
      this.selectedShip = ticker;
      
      document.querySelectorAll('.ship-selector-btn').forEach(btn => {
        const isSelected = btn.dataset.ticker === ticker;
        btn.classList.toggle('active', isSelected);
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
      
      this.updateShipDisplay();
      
      // Announce selection
      this.announceToScreenReader(`${ticker} selected`);
    },
    
    updateShipDisplay() {
      const ticker = this.selectedShip;
      const tele = window.ShipTelemetry?.getTelemetry?.(ticker) || {};
      const sprite = this.getSprite(ticker);
      const shipClass = window.ShipTelemetry?.getSuggestedClass?.(ticker) || 'UNKNOWN CLASS';
      
      // Update sprite
      const spriteEl = document.getElementById('hangar-ship-sprite');
      if (spriteEl) {
        spriteEl.src = sprite;
        spriteEl.alt = `${ticker} ship`;
      }
      
      // Update nameplate
      const tickerEl = document.getElementById('hangar-ship-ticker');
      const classEl = document.getElementById('hangar-ship-class');
      if (tickerEl) tickerEl.textContent = ticker;
      if (classEl) classEl.textContent = shipClass;
      
      // Update stats
      this.updateStatBars(tele);
      
      // Update battle preview
      this.updateBattlePreview();
    },
    
    updateStatBars(tele) {
      const stats = {
        'thrust': { value: tele.thrustPotential || 0.5, label: 'THRUST' },
        'stability': { value: tele.maneuverStability || 0.5, label: 'STABILITY' },
        'hull': { value: tele.hullResilience || 0.5, label: 'HULL' },
        'signal': { value: tele.signalClarity || 0.5, label: 'SIGNAL' },
        'chop': { value: tele.chopSensitivity || 0.5, label: 'VOLATILITY' }
      };
      
      Object.entries(stats).forEach(([key, stat]) => {
        const bar = document.getElementById(`stat-bar-${key}`);
        const value = document.getElementById(`stat-value-${key}`);
        const pct = Math.round(stat.value * 100);
        
        if (bar) {
          bar.style.width = `${pct}%`;
          bar.setAttribute('aria-valuenow', pct);
        }
        if (value) value.textContent = pct;
      });
      
      // Regime bias
      const regimeEl = document.getElementById('ship-regime');
      if (regimeEl) {
        const regime = tele.regimeBias || 'RANGE';
        regimeEl.textContent = regime.toUpperCase();
        regimeEl.className = `regime-badge regime-${regime.toLowerCase()}`;
      }
    },
    
    // -------------------------------------------------------------------------
    // BATTLE ARENA
    // -------------------------------------------------------------------------
    initBattleArena() {
      const startBtn = document.getElementById('battle-start-btn');
      if (startBtn) {
        startBtn.addEventListener('click', () => this.launchBattle());
        startBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.launchBattle();
        }, { passive: false });
      }
      
      const randomBtn = document.getElementById('battle-random-btn');
      if (randomBtn) {
        randomBtn.addEventListener('click', () => this.randomizeOpponent());
        randomBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.randomizeOpponent();
        }, { passive: false });
      }
    },
    
    showBattleReady() {
      this.updateBattlePreview();
    },
    
    updateBattlePreview() {
      const playerSprite = document.getElementById('battle-player-sprite');
      const playerTicker = document.getElementById('battle-player-ticker');
      const opponentSprite = document.getElementById('battle-opponent-sprite');
      const opponentTicker = document.getElementById('battle-opponent-ticker');
      
      const playerShip = this.selectedShip;
      
      // Only get new opponent if we don't have one
      if (!this._currentOpponent || this._currentOpponent === playerShip) {
        this._currentOpponent = this.getRandomOpponent(playerShip);
      }
      
      if (playerSprite) playerSprite.src = this.getSprite(playerShip);
      if (playerTicker) playerTicker.textContent = playerShip;
      if (opponentSprite) opponentSprite.src = this.getSprite(this._currentOpponent);
      if (opponentTicker) opponentTicker.textContent = this._currentOpponent;
    },
    
    getRandomOpponent(exclude) {
      const pool = this.ships.filter(s => s !== exclude);
      return pool[Math.floor(Math.random() * pool.length)] || 'ACHR';
    },
    
    randomizeOpponent() {
      this._currentOpponent = this.getRandomOpponent(this.selectedShip);
      
      const opponentSprite = document.getElementById('battle-opponent-sprite');
      const opponentTicker = document.getElementById('battle-opponent-ticker');
      
      if (opponentSprite) opponentSprite.src = this.getSprite(this._currentOpponent);
      if (opponentTicker) opponentTicker.textContent = this._currentOpponent;
      
      this.announceToScreenReader(`Opponent changed to ${this._currentOpponent}`);
    },
    
    launchBattle() {
      const player = this.selectedShip;
      const opponent = this._currentOpponent || this.getRandomOpponent(player);
      
      if (window.BeyArena) {
        window.BeyArena.open(player, opponent);
      } else {
        console.warn('[CockpitNav] BeyArena not loaded');
        this.announceToScreenReader('Battle arena loading');
      }
    },
    
    // -------------------------------------------------------------------------
    // NEWS Feed
    // -------------------------------------------------------------------------
    initNews() {
      // Defer population until panel is shown
    },
    
    populateNewsFeed() {
      const feed = document.getElementById('news-feed');
      if (!feed) return;
      
      const newsItems = this.generateNewsItems();
      
      feed.innerHTML = newsItems.map((item, idx) => `
        <article class="news-card" role="article" aria-labelledby="news-title-${idx}">
          <div class="news-card-icon ${item.type}" aria-hidden="true">${item.icon}</div>
          <div class="news-card-content">
            <div class="news-card-type ${item.type}">${item.typeLabel}</div>
            <h3 class="news-card-title" id="news-title-${idx}">${item.title}</h3>
            <p class="news-card-body">${item.body}</p>
            <time class="news-card-time">${item.time}</time>
          </div>
        </article>
      `).join('');
      
      // Set ARIA live region on feed
      feed.setAttribute('aria-live', 'polite');
    },
    
    generateNewsItems() {
      const items = [];
      const tele = window.ShipTelemetry;
      
      // Find top performers by thrust
      if (tele) {
        const allTele = tele.getAllTelemetry?.() || {};
        const sorted = Object.entries(allTele)
          .sort((a, b) => (b[1].thrustPotential || 0) - (a[1].thrustPotential || 0));
        
        if (sorted[0]) {
          items.push({
            type: 'alert',
            typeLabel: 'TOP PERFORMER',
            icon: '🚀',
            title: `${sorted[0][0]} Leading Fleet Thrust Rankings`,
            body: `With a thrust potential of ${Math.round((sorted[0][1].thrustPotential || 0) * 100)}%, this vessel is currently the most aggressive in the fleet.`,
            time: 'Updated moments ago'
          });
        }
        
        // Find most stable
        const stableSorted = Object.entries(allTele)
          .sort((a, b) => (b[1].maneuverStability || 0) - (a[1].maneuverStability || 0));
        
        if (stableSorted[0]) {
          items.push({
            type: '',
            typeLabel: 'STABILITY REPORT',
            icon: '⚖️',
            title: `${stableSorted[0][0]} Maintains Steadiest Course`,
            body: `Maneuver stability at ${Math.round((stableSorted[0][1].maneuverStability || 0) * 100)}%. Recommended for defensive arena strategies.`,
            time: '3 minutes ago'
          });
        }
        
        // Find most chaotic
        const chaoticSorted = Object.entries(allTele)
          .filter(([_, t]) => t.regimeBias === 'chaotic');
        
        if (chaoticSorted.length > 0) {
          items.push({
            type: 'lore',
            typeLabel: 'VOLATILITY WARNING',
            icon: '⚡',
            title: `Chaotic Regime Detected: ${chaoticSorted.map(c => c[0]).join(', ')}`,
            body: 'These vessels are experiencing turbulent market conditions. Expect erratic arena behavior and burst potential.',
            time: '7 minutes ago'
          });
        }
      }
      
      // Static lore items
      items.push({
        type: 'lore',
        typeLabel: 'FLEET LORE',
        icon: '📜',
        title: 'The RKLB Doctrine',
        body: '"In the void between earnings calls, only thrust matters." — Admiral Electron, 3rd Fleet Commander',
        time: '1 hour ago'
      });
      
      items.push({
        type: '',
        typeLabel: 'SYSTEM',
        icon: '🛠️',
        title: 'Battle Arena Now Online',
        body: 'The new telemetry-driven arena system is active. Ship stats directly influence battle physics. May the best telemetry win.',
        time: '2 hours ago'
      });
      
      items.push({
        type: 'lore',
        typeLabel: 'INTERCEPTED TRANSMISSION',
        icon: '📡',
        title: '"They\'re not stocks, they\'re souls."',
        body: 'Unverified transmission detected from Sector GME. Analysts remain skeptical. Retail pilots remain diamond-handed.',
        time: '4 hours ago'
      });
      
      return items;
    }
  };
  
  // Expose globally
  window.CockpitNav = CockpitNav;
  
  // Initialize on DOM ready (no delay needed with proper initialization)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CockpitNav.init());
  } else {
    // DOM already ready
    CockpitNav.init();
  }
  
})();
