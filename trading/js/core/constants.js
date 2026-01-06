/**
 * ═══════════════════════════════════════════════════════════════════
 * PARALLAX CONSTANTS
 * Centralized configuration for the entire application
 * ═══════════════════════════════════════════════════════════════════
 */

window.PARALLAX = window.PARALLAX || {};

window.PARALLAX.CONSTANTS = {
  // ═══════════════════════════════════════════════════════════════════
  // STORAGE KEYS
  // ═══════════════════════════════════════════════════════════════════
  STORAGE: {
    STATE_KEY: 'parallax_state_v1',
    MISSIONS_KEY: 'parallax_missions_v1',
    PROGRESSION_KEY: 'parallax_progression_v1',
    SETTINGS_KEY: 'parallax_settings_v1'
  },

  // ═══════════════════════════════════════════════════════════════════
  // BREAKPOINTS (matches CSS)
  // ═══════════════════════════════════════════════════════════════════
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280,
    WIDE: 1600
  },

  // ═══════════════════════════════════════════════════════════════════
  // ROUTES / NAVIGATION
  // ═══════════════════════════════════════════════════════════════════
  ROUTES: {
    TELEMETRY: '#telemetry',
    OPERATIONS: '#operations',
    TRAINING: '#training',
    MISSIONS: '#missions',
    DERIVATIVES: 'derivatives.html'
  },

  // ═══════════════════════════════════════════════════════════════════
  // ANIMATION TIMING (ms)
  // ═══════════════════════════════════════════════════════════════════
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    CHART_TRANSITION: 400,
    PANEL_TRANSITION: 250,
    LOADING_MIN_DISPLAY: 1500
  },

  // ═══════════════════════════════════════════════════════════════════
  // CHART DEFAULTS
  // ═══════════════════════════════════════════════════════════════════
  CHART: {
    DEFAULT_TIMEFRAME: '3M',
    RIBBON_PERIODS: [8, 13, 21, 34, 55, 89],
    MACD_FAST: 12,
    MACD_SLOW: 26,
    MACD_SIGNAL: 9,
    RSI_PERIOD: 14
  },

  // ═══════════════════════════════════════════════════════════════════
  // COLOR PALETTE
  // ═══════════════════════════════════════════════════════════════════
  COLORS: {
    // Primary phosphor colors
    PHOSPHOR_GREEN: '#33ff99',
    PHOSPHOR_AMBER: '#ffb347',
    PHOSPHOR_CYAN: '#47d4ff',
    PHOSPHOR_MAGENTA: '#ff4fd8',
    PHOSPHOR_VIOLET: '#b388ff',
    
    // Status colors
    POSITIVE: '#33ff99',
    NEGATIVE: '#ff6b6b',
    NEUTRAL: '#888888',
    WARNING: '#ffb347',
    
    // UI colors
    BACKGROUND: '#0a0f14',
    PANEL_BG: '#0d1117',
    BORDER: '#1a2332',
    TEXT_PRIMARY: '#e0e0e0',
    TEXT_SECONDARY: '#888888'
  },

  // ═══════════════════════════════════════════════════════════════════
  // FLIGHT SCENE DEFAULTS
  // ═══════════════════════════════════════════════════════════════════
  FLIGHT: {
    LOADING_MAX_SHIPS: 16,
    LOADING_MAX_SHIPS_MOBILE: 8,
    FLEET_MAX_SHIPS: 10,
    TRAIL_LENGTH: 12,
    TRAIL_LENGTH_MOBILE: 4,
    BASE_SPEED: 0.8
  },

  // ═══════════════════════════════════════════════════════════════════
  // MISSION SYSTEM
  // ═══════════════════════════════════════════════════════════════════
  MISSIONS: {
    MAX_ACTIVE: 3,
    COOLDOWN_MS: 300000, // 5 minutes
    XP_BASE: 100,
    TYPES: ['RECON', 'PATROL', 'ESCORT', 'STRIKE', 'SALVAGE']
  },

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═══════════════════════════════════════════════════════════════════
  FEATURES: {
    ENABLE_AUDIO: true,
    ENABLE_CRT_EFFECTS: true,
    ENABLE_SHIP_ANIMATIONS: true,
    ENABLE_MISSIONS: true,
    ENABLE_TRAINING: true,
    DEBUG_MODE: false
  },

  // ═══════════════════════════════════════════════════════════════════
  // API / DATA REFRESH
  // ═══════════════════════════════════════════════════════════════════
  DATA: {
    REFRESH_INTERVAL_MS: 60000, // 1 minute
    STALE_THRESHOLD_MS: 300000, // 5 minutes
    MAX_HISTORY_POINTS: 500
  }
};

// Shorthand alias
window.PX = window.PARALLAX.CONSTANTS;

// Freeze to prevent accidental modification
Object.freeze(window.PARALLAX.CONSTANTS);
Object.freeze(window.PARALLAX.CONSTANTS.STORAGE);
Object.freeze(window.PARALLAX.CONSTANTS.BREAKPOINTS);
Object.freeze(window.PARALLAX.CONSTANTS.ROUTES);
Object.freeze(window.PARALLAX.CONSTANTS.ANIMATION);
Object.freeze(window.PARALLAX.CONSTANTS.CHART);
Object.freeze(window.PARALLAX.CONSTANTS.COLORS);
Object.freeze(window.PARALLAX.CONSTANTS.FLIGHT);
Object.freeze(window.PARALLAX.CONSTANTS.MISSIONS);
Object.freeze(window.PARALLAX.CONSTANTS.FEATURES);
Object.freeze(window.PARALLAX.CONSTANTS.DATA);

console.log('📐 PARALLAX constants loaded');
