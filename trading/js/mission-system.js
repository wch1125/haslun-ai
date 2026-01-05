/**
 * HASLUN-BOT Mission System
 * NMS-inspired expedition system for derivatives training
 * 
 * Derived stats from TradingView 45m data:
 * - Hull: trend stability / structural integrity
 * - Firepower: volatility / thrust  
 * - Sensors: flow quality / signal clarity
 * - Fuel: time tolerance / patience buffer
 * - Threat: regime risk / storm probability
 */

const MissionSystem = (function() {
  'use strict';
  
  const STORAGE_KEY = 'HASLUN_MISSIONS_V1';
  const DEFAULT_LOOKBACK = 32; // bars for stat computation
  
  // ═══════════════════════════════════════════════════════════════════
  // MISSION ARCHETYPES
  // ═══════════════════════════════════════════════════════════════════
  
  const MISSION_TYPES = {
    RECON: {
      id: 'RECON',
      name: 'RECON SWEEP',
      icon: '🛰️',
      concept: 'Teaches regime/flow awareness',
      description: 'Scout the sector for signal clarity and flow patterns. High sensor readings improve success.',
      teaches: 'How to read market flow and identify regime changes before committing capital.',
      bettingOn: 'Information quality and timing',
      durationBands: ['45m', '4H', '1D'],
      idealConditions: { sensors: 'high', threat: 'low-moderate' },
      riskProfile: 'Low capital at risk, high information value'
    },
    CARGO: {
      id: 'CARGO',
      name: 'CARGO RUN',
      icon: '📦',
      concept: 'Teaches theta/time cost',
      description: 'Transport value across time. Stable hull and fuel reserves are critical for the journey.',
      teaches: 'How time decay (theta) erodes option value, and why patience has a cost.',
      bettingOn: 'Time passage without adverse movement',
      durationBands: ['1D', '1W', '2W'],
      idealConditions: { hull: 'high', fuel: 'high', threat: 'low' },
      riskProfile: 'Moderate capital, success requires discipline'
    },
    ESCORT: {
      id: 'ESCORT',
      name: 'ESCORT FORMATION',
      icon: '🛡️',
      concept: 'Teaches structure/hedging reduces variance',
      description: 'Protect the convoy with coordinated positioning. Spreads and hedges reduce damage exposure.',
      teaches: 'How structured positions (spreads) trade upside for reduced risk.',
      bettingOn: 'Defined risk/reward within a range',
      durationBands: ['1W', '2W', '1M'],
      idealConditions: { hull: 'moderate-high', threat: 'moderate' },
      riskProfile: 'Capped loss, capped gain, high probability'
    },
    STRIKE: {
      id: 'STRIKE',
      name: 'DEEP SPACE STRIKE',
      icon: '⚔️',
      concept: 'Teaches convexity/asymmetry sizing',
      description: 'High-risk assault on distant targets. Requires firepower and directional conviction.',
      teaches: 'How to size asymmetric bets where small losses can lead to large gains.',
      bettingOn: 'Large directional movement',
      durationBands: ['1W', '2W', '1M'],
      idealConditions: { firepower: 'high', hull: 'directionally clear' },
      riskProfile: 'High risk of total loss, potential for outsized returns'
    },
    HARVEST: {
      id: 'HARVEST',
      name: 'HARVEST OPERATION',
      icon: '🌾',
      concept: 'Teaches range/mean reversion / premium intuition',
      description: 'Extract value from stable zones. Low volatility and clear boundaries maximize yield.',
      teaches: 'How to profit from range-bound conditions by selling premium.',
      bettingOn: 'Price staying within a defined range',
      durationBands: ['45m', '1D', '1W'],
      idealConditions: { firepower: 'low-moderate', threat: 'low' },
      riskProfile: 'High win rate, occasional large losses'
    }
  };
  
  // ═══════════════════════════════════════════════════════════════════
  // STAT DERIVATION FROM INDICATOR DATA
  // ═══════════════════════════════════════════════════════════════════
  
  /**
   * Compute linear regression slope over an array of values
   */
  function linearRegressionSlope(values) {
    const n = values.length;
    if (n < 2) return 0;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
  
  /**
   * Count sign flips in an array of values
   */
  function countSignFlips(values) {
    let flips = 0;
    for (let i = 1; i < values.length; i++) {
      if ((values[i] >= 0) !== (values[i-1] >= 0)) {
        flips++;
      }
    }
    return flips;
  }
  
  /**
   * Normalize a value to 0-100 range with min/max
   */
  function normalize(value, min, max) {
    if (max === min) return 50;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }
  
  /**
   * Clamp a value between min and max
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Compute HULL stat (0-100): trend stability / structural integrity
   * Uses: Kernel Regression slope consistency, distance from G200
   * PATCHED v1.1: Fixed KRE array alignment bug
   */
  function computeHull(bars) {
    const n = bars.length;
    if (n < 5) return { value: 50, why: 'Insufficient data' };
    
    // 1. KRE slope consistency (only on valid KRE points, maintaining order)
    const kreSeries = [];
    for (const b of bars) {
      if (b.kernelRegression != null && !isNaN(b.kernelRegression)) {
        kreSeries.push(b.kernelRegression);
      }
    }
    const kreSlope = kreSeries.length >= 2 ? linearRegressionSlope(kreSeries) : 0;
    const slopeScore = Math.min(Math.abs(kreSlope) * 500, 50); // Cap contribution at 50
    
    // 2. Chop penalty: sign flips in (close - KRE) using ALIGNED bars
    const deviations = [];
    for (const b of bars) {
      if (b.close != null && b.kernelRegression != null && !isNaN(b.kernelRegression)) {
        deviations.push(b.close - b.kernelRegression);
      }
    }
    const chopFlips = deviations.length >= 2 ? countSignFlips(deviations) : 0;
    const chopPenalty = Math.min(chopFlips * 3, 30); // Max 30 point penalty
    
    // 3. Anchor: how close is current price to G200 (scan backwards for latest valid)
    const latestClose = bars[n - 1].close;
    let latestG200 = null;
    for (let i = n - 1; i >= 0; i--) {
      if (bars[i].G200 != null && !isNaN(bars[i].G200)) {
        latestG200 = bars[i].G200;
        break;
      }
    }
    if (latestG200 == null) latestG200 = latestClose;
    
    const anchorDist = Math.abs((latestClose - latestG200) / latestClose);
    const anchorScore = Math.max(0, 30 - anchorDist * 200); // Closer to G200 = higher score
    
    // Combine: base 40 + slope contribution + anchor - chop penalty
    const rawHull = 40 + slopeScore + anchorScore - chopPenalty;
    const hull = clamp(Math.round(rawHull), 0, 100);
    
    // Build explanation
    const slopeDir = kreSlope > 0.001 ? 'upward' : kreSlope < -0.001 ? 'downward' : 'flat';
    const chopDesc = chopFlips <= 5 ? 'low chop' : chopFlips <= 10 ? 'moderate chop' : 'high chop';
    const anchorDesc = anchorDist < 0.03 ? 'close to G200' : anchorDist < 0.08 ? 'moderate distance from G200' : 'far from G200';
    
    return {
      value: hull,
      why: `KRE slope ${slopeDir}; ${chopDesc} (${chopFlips} flips); ${anchorDesc}`
    };
  }
  
  /**
   * Compute FIREPOWER stat (0-100): volatility / thrust
   * Uses: ATR proxy (high-low)/close, MACD Histogram magnitude
   * PATCHED v1.1: NaN prevention when histogram data is missing
   */
  function computeFirepower(bars) {
    const n = bars.length;
    if (n < 5) return { value: 50, why: 'Insufficient data' };
    
    // 1. ATR proxy: mean (high-low)/close
    let atrSum = 0;
    let atrCount = 0;
    for (const bar of bars) {
      if (bar.high != null && bar.low != null && bar.close != null && bar.close !== 0) {
        atrSum += (bar.high - bar.low) / bar.close;
        atrCount++;
      }
    }
    const avgATR = atrCount > 0 ? atrSum / atrCount : 0.03; // Default to mid-range
    // Typical ATR ratio is 0.01-0.08 for these stocks
    const atrScore = normalize(avgATR, 0.01, 0.06) * 0.6; // 60% weight
    
    // 2. MACD Histogram magnitude (with NaN guard)
    const histValues = [];
    for (const bar of bars) {
      if (bar.histogram != null && !isNaN(bar.histogram)) {
        histValues.push(Math.abs(bar.histogram));
      }
    }
    
    let histScore = 0;
    let avgHist = 0;
    let histDesc = 'momentum unavailable';
    
    if (histValues.length > 0) {
      avgHist = histValues.reduce((a, b) => a + b, 0) / histValues.length;
      // Typical histogram range 0-0.5
      histScore = normalize(avgHist, 0, 0.3) * 0.4; // 40% weight
      histDesc = avgHist < 0.1 ? 'weak momentum' : avgHist < 0.2 ? 'moderate momentum' : 'strong momentum';
    }
    
    const firepower = clamp(Math.round(atrScore + histScore), 0, 100);
    
    // Explanation
    const atrDesc = avgATR < 0.02 ? 'low range' : avgATR < 0.04 ? 'moderate range' : 'high range';
    
    return {
      value: firepower,
      why: `${atrDesc} (${(avgATR * 100).toFixed(1)}% ATR); ${histDesc}`
    };
  }
  
  /**
   * Compute SENSORS stat (0-100): flow quality / signal clarity
   * Uses: Volume / Volume MA consistency
   */
  function computeSensors(bars) {
    const n = bars.length;
    if (n < 5) return { value: 50, why: 'Insufficient data' };
    
    // Volume vs Volume MA ratio
    let aboveMACount = 0;
    let totalRatio = 0;
    let validCount = 0;
    
    for (const bar of bars) {
      if (bar.volume != null && bar.volumeMA != null && bar.volumeMA > 0) {
        const ratio = bar.volume / bar.volumeMA;
        totalRatio += ratio;
        validCount++;
        if (ratio > 1) aboveMACount++;
      }
    }
    
    if (validCount === 0) return { value: 50, why: 'No volume data' };
    
    const avgRatio = totalRatio / validCount;
    const aboveMAPercent = aboveMACount / validCount;
    
    // Score: combination of average ratio and consistency above MA
    // avgRatio of 1.0 = neutral, 1.5+ = strong
    const ratioScore = normalize(avgRatio, 0.7, 1.5) * 0.5;
    const consistencyScore = aboveMAPercent * 50;
    
    const sensors = clamp(Math.round(ratioScore + consistencyScore), 0, 100);
    
    // Explanation
    const flowDesc = avgRatio < 0.9 ? 'below-average flow' : avgRatio < 1.1 ? 'neutral flow' : 'above-average flow';
    const consistDesc = aboveMAPercent < 0.4 ? 'inconsistent' : aboveMAPercent < 0.6 ? 'mixed' : 'consistent';
    
    return {
      value: sensors,
      why: `${flowDesc} (${avgRatio.toFixed(2)}x MA); ${consistDesc} (${Math.round(aboveMAPercent * 100)}% above MA)`
    };
  }
  
  /**
   * Compute FUEL stat (0-100): time tolerance / patience buffer
   * Uses: Bars since last Buy/Sell signal, trend persistence
   * PATCHED v1.1: Fixed KRE array alignment bug
   */
  function computeFuel(bars) {
    const n = bars.length;
    if (n < 5) return { value: 50, why: 'Insufficient data' };
    
    // Find bars since last signal (Buy or Sell)
    let barsSinceSignal = n; // Default to full lookback if no signal found
    for (let i = n - 1; i >= 0; i--) {
      // Buy/Sell are typically signal values or null/0
      const hasBuy = bars[i].buy != null && bars[i].buy !== 0 && !isNaN(bars[i].buy);
      const hasSell = bars[i].sell != null && bars[i].sell !== 0 && !isNaN(bars[i].sell);
      if (hasBuy || hasSell) {
        barsSinceSignal = n - 1 - i;
        break;
      }
    }
    
    // More bars since signal = trend has persisted = more fuel
    // 32 bars ≈ 1 day at 45m, signal every few days is normal
    const persistenceScore = normalize(barsSinceSignal, 0, 32) * 0.6;
    
    // Also factor in low chop using ALIGNED bars (same fix as computeHull)
    const deviations = [];
    for (const b of bars) {
      if (b.close != null && b.kernelRegression != null && !isNaN(b.kernelRegression)) {
        deviations.push(b.close - b.kernelRegression);
      }
    }
    const chopFlips = deviations.length >= 2 ? countSignFlips(deviations) : 0;
    const lowChopBonus = Math.max(0, 40 - chopFlips * 4); // Fewer flips = more fuel
    
    const fuel = clamp(Math.round(persistenceScore + lowChopBonus), 0, 100);
    
    // Explanation
    const persistDesc = barsSinceSignal < 5 ? 'recent signal' : barsSinceSignal < 15 ? 'signal aging' : 'mature trend';
    const chopDesc = chopFlips <= 5 ? 'steady path' : chopFlips <= 10 ? 'some turbulence' : 'choppy conditions';
    
    return {
      value: fuel,
      why: `${persistDesc} (${barsSinceSignal} bars ago); ${chopDesc}`
    };
  }
  
  /**
   * Compute THREAT stat (0-100): regime risk / storm probability
   * Uses: Band proximity (A1-F5), histogram flip frequency
   */
  function computeThreat(bars) {
    const n = bars.length;
    if (n < 5) return { value: 50, why: 'Insufficient data' };
    
    const latest = bars[n - 1];
    
    // 1. Band proximity: how close to envelope extremes
    const bandKeys = [
      'A1', 'A2', 'A3', 'A4', 'A5',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'C1', 'C2', 'C3', 'C4', 'C5',
      'D1', 'D2', 'D3', 'D4', 'D5',
      'E1', 'E2', 'E3', 'E4', 'E5',
      'F1', 'F2', 'F3', 'F4', 'F5'
    ];
    
    const bandValues = bandKeys.map(k => latest[k]).filter(v => v != null && !isNaN(v));
    
    let bandProximityScore = 50; // Default neutral
    if (bandValues.length > 0) {
      const lower = Math.min(...bandValues);
      const upper = Math.max(...bandValues);
      const close = latest.close;
      
      if (upper > lower) {
        const pos = (close - lower) / (upper - lower); // 0-1
        // Threat increases as pos approaches 0 or 1
        const distFromCenter = Math.abs(pos - 0.5) * 2; // 0 at center, 1 at edges
        bandProximityScore = distFromCenter * 50; // 0-50 contribution
      }
    }
    
    // 2. Histogram flip rate (chop)
    const histValues = bars.map(b => b.histogram).filter(v => v != null);
    const flipRate = countSignFlips(histValues);
    const flipScore = normalize(flipRate, 0, n / 2) * 30; // 0-30 contribution
    
    // 3. High firepower adds to threat (volatile = dangerous)
    const firepower = computeFirepower(bars).value;
    const volContribution = (firepower / 100) * 20; // 0-20 contribution
    
    const threat = clamp(Math.round(bandProximityScore + flipScore + volContribution), 0, 100);
    
    // Explanation
    const bandDesc = bandProximityScore < 20 ? 'mid-range' : bandProximityScore < 35 ? 'approaching bands' : 'near band extreme';
    const flipDesc = flipRate <= 5 ? 'stable regime' : flipRate <= 12 ? 'some chop' : 'high chop';
    
    return {
      value: threat,
      why: `${bandDesc}; histogram ${flipDesc} (${flipRate} flips); volatility ${firepower < 40 ? 'low' : firepower < 70 ? 'moderate' : 'elevated'}`
    };
  }
  
  /**
   * Compute all environment stats for a ticker
   */
  async function computeEnvironment(ticker, lookback = DEFAULT_LOOKBACK) {
    const bars = await IndicatorLoader.getRecentBars(ticker, lookback);
    
    if (bars.length < 5) {
      throw new Error(`Insufficient data for ${ticker}: only ${bars.length} bars`);
    }
    
    const hull = computeHull(bars);
    const firepower = computeFirepower(bars);
    const sensors = computeSensors(bars);
    const fuel = computeFuel(bars);
    const threat = computeThreat(bars);
    
    return {
      ticker: ticker,
      computedAt: new Date().toISOString(),
      barsUsed: bars.length,
      
      hull: hull.value,
      firepower: firepower.value,
      sensors: sensors.value,
      fuel: fuel.value,
      threat: threat.value,
      
      why: {
        hull: hull.why,
        firepower: firepower.why,
        sensors: sensors.why,
        fuel: fuel.why,
        threat: threat.why
      },
      
      // Latest price info for context
      latestBar: {
        time: new Date(bars[bars.length - 1].time * 1000).toISOString(),
        close: bars[bars.length - 1].close,
        volume: bars[bars.length - 1].volume
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // MISSION RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════
  
  /**
   * Compute difficulty (1-3 stars) for a mission type given environment
   * PATCHED v1.1: Recon difficulty now reacts to Sensors as spec requires
   */
  function computeDifficulty(missionType, env) {
    const t = env.threat;
    const h = env.hull;
    const f = env.fuel;
    const fp = env.firepower;
    const s = env.sensors;
    
    switch (missionType) {
      case 'RECON': {
        // Difficulty rises with Threat, falls with high Sensors, rises with low Sensors
        let stars = t > 60 ? 3 : t > 35 ? 2 : 1;
        
        // Strong sensors reduce difficulty (easier to scout when signals are clear)
        if (s >= 70 && stars > 1) stars -= 1;
        // Weak sensors increase difficulty (harder to navigate noisy data)
        if (s <= 35 && stars < 3) stars += 1;
        
        return stars;
      }
        
      case 'CARGO':
        // Difficulty rises with Threat and low Fuel
        const cargoRisk = t * 0.5 + (100 - f) * 0.5;
        return cargoRisk > 60 ? 3 : cargoRisk > 35 ? 2 : 1;
        
      case 'ESCORT':
        // Moderate threat is ideal; extreme threat = harder
        return t > 70 || t < 20 ? 2 : 1; // Sweet spot is 20-70
        
      case 'STRIKE':
        // Difficulty rises with Threat
        return t > 65 ? 3 : t > 40 ? 2 : 1;
        
      case 'HARVEST':
        // Difficulty rises with Firepower/Threat
        const harvestRisk = fp * 0.5 + t * 0.5;
        return harvestRisk > 55 ? 3 : harvestRisk > 35 ? 2 : 1;
        
      default:
        return 2;
    }
  }
  
  /**
   * Compute suitability score (0-100) for a mission type given environment
   */
  function computeSuitability(missionType, env) {
    const { hull, firepower, sensors, fuel, threat } = env;
    
    switch (missionType) {
      case 'RECON':
        // Wants: high sensors, low-moderate threat
        return (sensors * 0.5) + ((100 - threat) * 0.3) + (fuel * 0.2);
        
      case 'CARGO':
        // Wants: high hull, high fuel, low threat
        return (hull * 0.35) + (fuel * 0.35) + ((100 - threat) * 0.3);
        
      case 'ESCORT':
        // Wants: moderate-high hull, moderate threat (not too calm, not too stormy)
        const threatPenalty = Math.abs(threat - 45) * 0.5; // Optimal around 45
        return (hull * 0.5) + (50 - threatPenalty) + (sensors * 0.2);
        
      case 'STRIKE':
        // Wants: high firepower, clear hull direction
        return (firepower * 0.5) + (hull * 0.3) + ((100 - threat) * 0.2);
        
      case 'HARVEST':
        // Wants: low firepower, low threat
        return ((100 - firepower) * 0.4) + ((100 - threat) * 0.4) + (sensors * 0.2);
        
      default:
        return 50;
    }
  }
  
  /**
   * Generate "why now" explanation for a mission recommendation
   */
  function generateWhyNow(missionType, env) {
    const { hull, firepower, sensors, fuel, threat } = env;
    
    switch (missionType) {
      case 'RECON':
        if (sensors >= 60) return 'Flow signals are clear—good conditions for reconnaissance.';
        if (threat < 40) return 'Low threat environment allows for safe scouting.';
        return 'Standard conditions for sector reconnaissance.';
        
      case 'CARGO':
        if (hull >= 60 && fuel >= 60) return 'Stable trend with high fuel reserves—ideal for time-based transport.';
        if (threat < 35) return 'Calm sector reduces journey risk.';
        return 'Conditions acceptable for cargo operations.';
        
      case 'ESCORT':
        if (threat >= 30 && threat <= 60) return 'Moderate threat level—hedged formations add value here.';
        if (hull >= 55) return 'Solid hull integrity supports structured positioning.';
        return 'Standard escort formation conditions.';
        
      case 'STRIKE':
        if (firepower >= 65) return 'High volatility provides thrust for directional assault.';
        if (hull >= 60 && firepower >= 50) return 'Clear trend direction with adequate firepower.';
        return 'Conditions support tactical strike operations.';
        
      case 'HARVEST':
        if (firepower <= 40 && threat <= 40) return 'Low volatility, low threat—prime harvesting conditions.';
        if (sensors >= 55) return 'Clear flow signals help identify range boundaries.';
        return 'Range conditions may support premium collection.';
        
      default:
        return 'Standard operating conditions.';
    }
  }
  
  /**
   * Generate mission recommendations for all types given an environment
   */
  function generateRecommendations(env) {
    const recommendations = [];
    
    for (const [key, type] of Object.entries(MISSION_TYPES)) {
      const suitability = computeSuitability(key, env);
      const difficulty = computeDifficulty(key, env);
      const whyNow = generateWhyNow(key, env);
      
      recommendations.push({
        type: key,
        ...type,
        suitability: Math.round(suitability),
        difficulty: difficulty,
        whyNow: whyNow,
        recommended: suitability >= 55
      });
    }
    
    // Sort by suitability (highest first)
    recommendations.sort((a, b) => b.suitability - a.suitability);
    
    return recommendations;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // MISSION LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════
  
  /**
   * Generate a unique mission ID
   */
  function generateMissionId() {
    return 'MSN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  
  /**
   * Create a new mission (planning state)
   */
  function createMission(ticker, type, options = {}) {
    const missionType = MISSION_TYPES[type];
    if (!missionType) throw new Error(`Unknown mission type: ${type}`);
    
    return {
      id: generateMissionId(),
      createdAt: new Date().toISOString(),
      ticker: ticker.toUpperCase(),
      type: type,
      typeName: missionType.name,
      icon: missionType.icon,
      
      difficulty: options.difficulty || 2,
      duration: options.duration || { unit: '1D', targetBars: 32 },
      
      thesis: {
        primary: options.thesis || missionType.bettingOn,
        notes: options.notes || ''
      },
      
      env: options.env || null, // Snapshot of environment at creation
      
      status: 'PLANNING',
      startedAt: null,
      completedAt: null,
      outcome: null,
      log: [
        { time: new Date().toISOString(), event: 'Mission created', type: 'system' }
      ]
    };
  }
  
  /**
   * Load missions from localStorage
   */
  function loadMissions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[MissionSystem] Failed to load missions:', e);
      return [];
    }
  }
  
  /**
   * Save missions to localStorage
   */
  function saveMissions(missions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
    } catch (e) {
      console.error('[MissionSystem] Failed to save missions:', e);
    }
  }
  
  /**
   * Add a log entry to a mission
   */
  function addMissionLog(missionId, event, type = 'info') {
    const missions = loadMissions();
    const mission = missions.find(m => m.id === missionId);
    if (mission) {
      mission.log.push({ time: new Date().toISOString(), event, type });
      saveMissions(missions);
    }
  }
  
  /**
   * Get mission type info
   */
  function getMissionType(type) {
    return MISSION_TYPES[type] || null;
  }
  
  /**
   * Get all mission types
   */
  function getAllMissionTypes() {
    return Object.values(MISSION_TYPES);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════
  
  return {
    // Stat computation
    computeEnvironment,
    
    // Mission recommendations
    generateRecommendations,
    computeSuitability,
    computeDifficulty,
    
    // Mission lifecycle
    createMission,
    loadMissions,
    saveMissions,
    addMissionLog,
    generateMissionId,
    
    // Mission type info
    getMissionType,
    getAllMissionTypes,
    MISSION_TYPES,
    
    // Constants
    DEFAULT_LOOKBACK
  };
  
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MissionSystem;
}
