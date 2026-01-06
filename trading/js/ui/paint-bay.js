/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PARALLAX - Ship Paint Bay
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Color customization system using watercolor glazing color theory.
 * Users pick 2-3 base colors, and the system generates harmonious palettes
 * that get applied to ship sprites via canvas pixel manipulation.
 * 
 * Color theory from: Haslun Watercolor Lab (glazing simulation)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

window.PaintBay = (function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR THEORY ENGINE (adapted from watercolor lab)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transparency coefficients for glazing simulation
   * Higher = more opaque, less of underlying color shows through
   */
  const TRANSPARENCY_MAP = {
    'transparent': 0.45,
    'semi-transparent': 0.55,
    'semi-opaque': 0.70,
    'opaque': 0.85,
  };

  /**
   * Convert hex color to RGB array
   */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  /**
   * Convert RGB values to hex string
   */
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
      .map(x => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  /**
   * Linear interpolation between two colors
   */
  function lerpColor(colorA, colorB, t) {
    const rgbA = hexToRgb(colorA);
    const rgbB = hexToRgb(colorB);
    const mixed = rgbA.map((a, i) => Math.round(a + (rgbB[i] - a) * t));
    return rgbToHex(...mixed);
  }

  /**
   * Simulate watercolor glazing - layering transparent colors
   * This creates more natural color mixing than simple RGB averaging
   */
  function glazeColors(baseHex, topHex, transparency = 'semi-transparent') {
    const baseRgb = hexToRgb(baseHex);
    const topRgb = hexToRgb(topHex);
    const opacity = TRANSPARENCY_MAP[transparency];

    let result;
    if (transparency === 'opaque') {
      // Opaque: simple alpha blend
      result = baseRgb.map((v, i) => v * (1 - opacity * 0.8) + topRgb[i] * opacity * 0.8);
    } else {
      // Transparent: multiplicative (subtractive) mixing
      const mult = baseRgb.map((v, i) => (v / 255) * (topRgb[i] / 255) * 255);
      result = baseRgb.map((v, i) => v * (1 - opacity) + (mult[i] * 0.6 + topRgb[i] * 0.4) * opacity);
    }

    return rgbToHex(...result);
  }

  /**
   * Convert RGB to HSL
   */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  /**
   * Convert HSL to RGB
   */
  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Adjust lightness of a hex color
   */
  function adjustLightness(hex, amount) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(...rgb);
    hsl[2] = Math.max(0, Math.min(100, hsl[2] + amount));
    const newRgb = hslToRgb(...hsl);
    return rgbToHex(...newRgb);
  }

  /**
   * Adjust saturation of a hex color
   */
  function adjustSaturation(hex, amount) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(...rgb);
    hsl[1] = Math.max(0, Math.min(100, hsl[1] + amount));
    const newRgb = hslToRgb(...hsl);
    return rgbToHex(...newRgb);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PALETTE GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a 7-color palette from 2 base colors using glazing theory
   */
  function generatePaletteFrom2(colorA, colorB) {
    const paper = '#FCFAF5'; // Simulated paper base

    // Glaze combinations
    const aOnPaper = glazeColors(paper, colorA, 'semi-transparent');
    const bOnPaper = glazeColors(paper, colorB, 'semi-transparent');
    const aOverB = glazeColors(bOnPaper, colorA, 'semi-transparent');
    const bOverA = glazeColors(aOnPaper, colorB, 'semi-transparent');
    const midGlaze = lerpColor(aOverB, bOverA, 0.5);

    return {
      name: 'Dual Glaze',
      colors: [
        { role: 'primary', hex: colorA, name: 'Primary' },
        { role: 'secondary', hex: colorB, name: 'Secondary' },
        { role: 'glaze-ab', hex: aOverB, name: 'Primary/Secondary Glaze' },
        { role: 'glaze-ba', hex: bOverA, name: 'Secondary/Primary Glaze' },
        { role: 'mid', hex: midGlaze, name: 'Mid Tone' },
        { role: 'highlight', hex: adjustLightness(midGlaze, 25), name: 'Highlight' },
        { role: 'shadow', hex: adjustLightness(midGlaze, -30), name: 'Shadow' },
      ]
    };
  }

  /**
   * Generate a 9-color palette from 3 base colors using glazing theory
   */
  function generatePaletteFrom3(colorA, colorB, colorC) {
    const paper = '#FCFAF5';

    // Single layers
    const aOnPaper = glazeColors(paper, colorA, 'semi-transparent');
    const bOnPaper = glazeColors(paper, colorB, 'semi-transparent');
    const cOnPaper = glazeColors(paper, colorC, 'semi-transparent');

    // Pairwise glazes
    const ab = glazeColors(aOnPaper, colorB, 'semi-transparent');
    const ac = glazeColors(aOnPaper, colorC, 'semi-transparent');
    const bc = glazeColors(bOnPaper, colorC, 'semi-transparent');

    // Triple glaze (all three)
    const abc = glazeColors(ab, colorC, 'semi-transparent');

    return {
      name: 'Triple Glaze',
      colors: [
        { role: 'primary', hex: colorA, name: 'Primary' },
        { role: 'secondary', hex: colorB, name: 'Secondary' },
        { role: 'tertiary', hex: colorC, name: 'Tertiary' },
        { role: 'glaze-ab', hex: ab, name: 'Primary/Secondary' },
        { role: 'glaze-ac', hex: ac, name: 'Primary/Tertiary' },
        { role: 'glaze-bc', hex: bc, name: 'Secondary/Tertiary' },
        { role: 'glaze-abc', hex: abc, name: 'Triple Blend' },
        { role: 'highlight', hex: adjustLightness(abc, 30), name: 'Highlight' },
        { role: 'shadow', hex: adjustLightness(abc, -35), name: 'Deep Shadow' },
      ]
    };
  }

  /**
   * Generate palette based on input colors
   */
  function generatePalette(colors) {
    if (colors.length === 1) {
      // Monochromatic from single color
      const base = colors[0];
      return {
        name: 'Monochrome',
        colors: [
          { role: 'primary', hex: base, name: 'Base' },
          { role: 'light-1', hex: adjustLightness(base, 15), name: 'Light' },
          { role: 'light-2', hex: adjustLightness(base, 30), name: 'Lighter' },
          { role: 'highlight', hex: adjustLightness(base, 45), name: 'Highlight' },
          { role: 'dark-1', hex: adjustLightness(base, -15), name: 'Dark' },
          { role: 'dark-2', hex: adjustLightness(base, -30), name: 'Darker' },
          { role: 'shadow', hex: adjustLightness(base, -45), name: 'Shadow' },
        ]
      };
    } else if (colors.length === 2) {
      return generatePaletteFrom2(colors[0], colors[1]);
    } else if (colors.length >= 3) {
      return generatePaletteFrom3(colors[0], colors[1], colors[2]);
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPRITE COLORIZATION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze sprite to find dominant colors
   * Returns array of { hex, count, brightness } sorted by count
   */
  function analyzeSprite(imageData) {
    const colorCounts = {};
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels
      if (a < 128) continue;

      // Quantize colors (reduce precision to group similar colors)
      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;

      const hex = rgbToHex(qr, qg, qb);
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    // Convert to array and sort
    const colors = Object.entries(colorCounts)
      .map(([hex, count]) => {
        const rgb = hexToRgb(hex);
        const brightness = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255;
        return { hex, count, brightness };
      })
      .sort((a, b) => b.count - a.count);

    return colors;
  }

  /**
   * Create a color mapping from original sprite colors to palette colors
   */
  function createColorMap(originalColors, palette) {
    const colorMap = new Map();
    const paletteColors = palette.colors;

    // Sort original colors by brightness
    const sortedOriginal = [...originalColors].sort((a, b) => a.brightness - b.brightness);

    // Sort palette colors by brightness
    const sortedPalette = [...paletteColors].sort((a, b) => {
      const bA = hexToRgb(a.hex).reduce((sum, v, i) => sum + v * [0.299, 0.587, 0.114][i], 0) / 255;
      const bB = hexToRgb(b.hex).reduce((sum, v, i) => sum + v * [0.299, 0.587, 0.114][i], 0) / 255;
      return bA - bB;
    });

    // Map each original color to a palette color based on brightness
    sortedOriginal.forEach((original, index) => {
      // Find nearest palette color by brightness
      const targetIndex = Math.floor((index / sortedOriginal.length) * sortedPalette.length);
      const paletteColor = sortedPalette[Math.min(targetIndex, sortedPalette.length - 1)];
      colorMap.set(original.hex, paletteColor.hex);
    });

    return colorMap;
  }

  /**
   * Apply palette to sprite image data
   * Returns new ImageData with recolored pixels
   */
  function applyPaletteToSprite(imageData, colorMap) {
    const newData = new Uint8ClampedArray(imageData.data);

    for (let i = 0; i < newData.length; i += 4) {
      const r = newData[i];
      const g = newData[i + 1];
      const b = newData[i + 2];
      const a = newData[i + 3];

      // Skip transparent
      if (a < 128) continue;

      // Quantize to find in map
      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;
      const originalHex = rgbToHex(qr, qg, qb);

      // Look up replacement color
      const newHex = colorMap.get(originalHex);
      if (newHex) {
        const newRgb = hexToRgb(newHex);

        // Preserve relative brightness variations
        const origBrightness = (r + g + b) / 3;
        const quantBrightness = (qr + qg + qb) / 3;
        const brightnessDiff = origBrightness - quantBrightness;

        newData[i] = Math.min(255, Math.max(0, newRgb[0] + brightnessDiff));
        newData[i + 1] = Math.min(255, Math.max(0, newRgb[1] + brightnessDiff));
        newData[i + 2] = Math.min(255, Math.max(0, newRgb[2] + brightnessDiff));
      }
    }

    return new ImageData(newData, imageData.width, imageData.height);
  }

  /**
   * Recolor a sprite image with a given palette
   * @param {HTMLImageElement|HTMLCanvasElement} source - Original sprite
   * @param {Array<string>} baseColors - 1-3 hex colors chosen by user
   * @returns {Promise<HTMLCanvasElement>} - Recolored sprite as canvas
   */
  async function recolorSprite(source, baseColors) {
    return new Promise((resolve, reject) => {
      try {
        // Create canvas from source
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Handle Image vs Canvas
        if (source instanceof HTMLImageElement) {
          canvas.width = source.naturalWidth || source.width;
          canvas.height = source.naturalHeight || source.height;
        } else {
          canvas.width = source.width;
          canvas.height = source.height;
        }

        ctx.drawImage(source, 0, 0);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Analyze original colors
        const originalColors = analyzeSprite(imageData);

        // Generate palette from user colors
        const palette = generatePalette(baseColors);
        if (!palette) {
          reject(new Error('Could not generate palette'));
          return;
        }

        // Create color mapping
        const colorMap = createColorMap(originalColors, palette);

        // Apply new colors
        const newImageData = applyPaletteToSprite(imageData, colorMap);

        // Put back on canvas
        ctx.putImageData(newImageData, 0, 0);

        resolve(canvas);
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESET PALETTES
  // ═══════════════════════════════════════════════════════════════════════════

  const PRESET_SCHEMES = [
    {
      id: 'phosphor',
      name: 'Phosphor Green',
      description: 'Classic terminal aesthetic',
      colors: ['#33FF99', '#1A332E']
    },
    {
      id: 'plasma',
      name: 'Plasma Core',
      description: 'Hot reactor energy',
      colors: ['#FF6B35', '#FFD93D', '#4ECDC4']
    },
    {
      id: 'void',
      name: 'Void Walker',
      description: 'Deep space purple',
      colors: ['#7B2CBF', '#3C096C', '#10002B']
    },
    {
      id: 'solar',
      name: 'Solar Flare',
      description: 'Sun-powered warmth',
      colors: ['#FF6B6B', '#FFE66D']
    },
    {
      id: 'arctic',
      name: 'Arctic Operations',
      description: 'Cold precision',
      colors: ['#48CAE4', '#CAF0F8', '#023E8A']
    },
    {
      id: 'rust',
      name: 'Rust Belt',
      description: 'Industrial decay',
      colors: ['#A44A3F', '#D4A373', '#463F3A']
    },
    {
      id: 'neon',
      name: 'Neon District',
      description: 'Cyberpunk glow',
      colors: ['#F72585', '#4CC9F0', '#7209B7']
    },
    {
      id: 'forest',
      name: 'Forest Camouflage',
      description: 'Natural concealment',
      colors: ['#2D5016', '#8B9A46', '#3D2914']
    },
    {
      id: 'gold',
      name: 'Golden Fleet',
      description: 'Prestige livery',
      colors: ['#FFD700', '#B8860B', '#1C1C1C']
    },
    {
      id: 'stealth',
      name: 'Stealth Mode',
      description: 'Low visibility',
      colors: ['#2B2D42', '#8D99AE', '#14213D']
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // UI COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  let currentShipImage = null;
  let currentBaseColors = ['#33FF99', '#1A332E'];
  let previewCanvas = null;

  /**
   * Render the Paint Bay modal UI
   */
  function renderUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="paint-bay-modal">
        <div class="paint-bay-header">
          <h2>⚙ PAINT BAY</h2>
          <p class="paint-bay-subtitle">Customize ship livery using watercolor color theory</p>
        </div>
        
        <div class="paint-bay-content">
          <div class="paint-bay-left">
            <div class="color-picker-section">
              <h3>Base Colors</h3>
              <p class="picker-hint">Choose 2-3 colors to generate palette</p>
              
              <div class="color-slots">
                <div class="color-slot" data-index="0">
                  <input type="color" id="color-slot-0" value="${currentBaseColors[0] || '#33FF99'}">
                  <span class="slot-label">Primary</span>
                </div>
                <div class="color-slot" data-index="1">
                  <input type="color" id="color-slot-1" value="${currentBaseColors[1] || '#1A332E'}">
                  <span class="slot-label">Secondary</span>
                </div>
                <div class="color-slot" data-index="2">
                  <input type="color" id="color-slot-2" value="${currentBaseColors[2] || '#000000'}" ${currentBaseColors.length < 3 ? 'disabled' : ''}>
                  <span class="slot-label">Tertiary <small>(optional)</small></span>
                  <label class="slot-toggle">
                    <input type="checkbox" id="use-third-color" ${currentBaseColors.length >= 3 ? 'checked' : ''}>
                    Use
                  </label>
                </div>
              </div>
            </div>
            
            <div class="preset-section">
              <h3>Preset Schemes</h3>
              <div class="preset-grid">
                ${PRESET_SCHEMES.map(scheme => `
                  <button class="preset-btn" data-scheme="${scheme.id}" title="${scheme.description}">
                    <div class="preset-colors">
                      ${scheme.colors.map(c => `<span style="background: ${c}"></span>`).join('')}
                    </div>
                    <span class="preset-name">${scheme.name}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            
            <div class="generated-palette">
              <h3>Generated Palette</h3>
              <div id="palette-preview" class="palette-preview"></div>
            </div>
          </div>
          
          <div class="paint-bay-right">
            <div class="ship-preview-section">
              <h3>Preview</h3>
              <div class="ship-preview-container">
                <canvas id="paint-bay-preview" class="ship-preview-canvas"></canvas>
                <div id="preview-loading" class="preview-loading hidden">Applying colors...</div>
              </div>
            </div>
            
            <div class="ship-select-section">
              <h3>Select Ship</h3>
              <select id="paint-bay-ship-select" class="ship-select-dropdown">
                <option value="">-- Choose a ship --</option>
              </select>
            </div>
            
            <div class="action-buttons">
              <button id="apply-paint" class="btn-primary">Apply to Ship</button>
              <button id="reset-paint" class="btn-secondary">Reset</button>
              <button id="export-paint" class="btn-secondary">Export PNG</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize canvas
    previewCanvas = document.getElementById('paint-bay-preview');
    
    // Bind events
    bindEvents();
    
    // Populate ship dropdown
    populateShipDropdown();
    
    // Initial palette render
    updatePalettePreview();
  }

  /**
   * Bind all event listeners
   */
  function bindEvents() {
    // Color inputs
    document.querySelectorAll('.color-slot input[type="color"]').forEach((input, index) => {
      input.addEventListener('input', () => {
        updateBaseColor(index, input.value);
      });
    });

    // Third color toggle
    const thirdToggle = document.getElementById('use-third-color');
    if (thirdToggle) {
      thirdToggle.addEventListener('change', () => {
        const thirdInput = document.getElementById('color-slot-2');
        thirdInput.disabled = !thirdToggle.checked;
        
        if (thirdToggle.checked) {
          if (currentBaseColors.length < 3) {
            currentBaseColors.push(thirdInput.value);
          }
        } else {
          currentBaseColors = currentBaseColors.slice(0, 2);
        }
        
        updatePalettePreview();
        updateShipPreview();
      });
    }

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const schemeId = btn.dataset.scheme;
        const scheme = PRESET_SCHEMES.find(s => s.id === schemeId);
        if (scheme) {
          applyPreset(scheme);
        }
      });
    });

    // Ship dropdown
    const shipSelect = document.getElementById('paint-bay-ship-select');
    if (shipSelect) {
      shipSelect.addEventListener('change', async () => {
        const shipPath = shipSelect.value;
        if (shipPath) {
          await loadShipForPreview(shipPath);
        }
      });
    }

    // Action buttons
    document.getElementById('apply-paint')?.addEventListener('click', handleApplyPaint);
    document.getElementById('reset-paint')?.addEventListener('click', handleReset);
    document.getElementById('export-paint')?.addEventListener('click', handleExport);
  }

  /**
   * Update a base color slot
   */
  function updateBaseColor(index, hex) {
    currentBaseColors[index] = hex.toUpperCase();
    updatePalettePreview();
    updateShipPreview();
  }

  /**
   * Apply a preset color scheme
   */
  function applyPreset(scheme) {
    currentBaseColors = [...scheme.colors];

    // Update UI inputs
    scheme.colors.forEach((color, i) => {
      const input = document.getElementById(`color-slot-${i}`);
      if (input) {
        input.value = color;
        input.disabled = false;
      }
    });

    // Handle third color toggle
    const thirdToggle = document.getElementById('use-third-color');
    if (thirdToggle) {
      thirdToggle.checked = scheme.colors.length >= 3;
      document.getElementById('color-slot-2').disabled = scheme.colors.length < 3;
    }

    updatePalettePreview();
    updateShipPreview();
  }

  /**
   * Update the generated palette preview
   */
  function updatePalettePreview() {
    const container = document.getElementById('palette-preview');
    if (!container) return;

    const palette = generatePalette(currentBaseColors);
    if (!palette) {
      container.innerHTML = '<p class="no-palette">Select colors to generate palette</p>';
      return;
    }

    container.innerHTML = `
      <div class="palette-name">${palette.name}</div>
      <div class="palette-swatches">
        ${palette.colors.map(c => `
          <div class="palette-swatch" style="background: ${c.hex}" title="${c.name}: ${c.hex}">
            <span class="swatch-hex">${c.hex}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Populate ship selection dropdown
   */
  function populateShipDropdown() {
    const select = document.getElementById('paint-bay-ship-select');
    if (!select) return;

    // Get ships from existing data if available
    const ships = window.SHIP_DATA || [
      { ticker: 'RKLB', name: 'Flagship' },
      { ticker: 'LUNR', name: 'Lander' },
      { ticker: 'JOBY', name: 'eVTOL' },
      { ticker: 'ACHR', name: 'eVTOL' },
      { ticker: 'GME', name: 'Moonshot' },
      { ticker: 'BKSY', name: 'Recon' },
    ];

    ships.forEach(ship => {
      const option = document.createElement('option');
      option.value = `assets/ships/animated/${ship.ticker}/${ship.ticker}_base.png`;
      option.textContent = `${ship.ticker} - ${ship.name || ship.ticker}`;
      select.appendChild(option);
    });
  }

  /**
   * Load a ship image for preview
   */
  async function loadShipForPreview(imagePath) {
    const loadingEl = document.getElementById('preview-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        currentShipImage = img;
        await updateShipPreview();
        if (loadingEl) loadingEl.classList.add('hidden');
        resolve();
      };
      
      img.onerror = () => {
        console.error('[PaintBay] Failed to load ship:', imagePath);
        if (loadingEl) loadingEl.classList.add('hidden');
        reject(new Error('Failed to load ship image'));
      };
      
      img.src = imagePath;
    });
  }

  /**
   * Update the ship preview with current colors
   */
  async function updateShipPreview() {
    if (!currentShipImage || !previewCanvas) return;

    try {
      const recolored = await recolorSprite(currentShipImage, currentBaseColors);
      
      // Scale up for display (pixel art)
      const ctx = previewCanvas.getContext('2d');
      const scale = 3;
      previewCanvas.width = recolored.width * scale;
      previewCanvas.height = recolored.height * scale;
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(recolored, 0, 0, previewCanvas.width, previewCanvas.height);
    } catch (err) {
      console.error('[PaintBay] Preview error:', err);
    }
  }

  /**
   * Handle apply paint button
   */
  function handleApplyPaint() {
    // Emit event for other systems to pick up
    const event = new CustomEvent('paintbay:apply', {
      detail: {
        colors: [...currentBaseColors],
        palette: generatePalette(currentBaseColors)
      }
    });
    document.dispatchEvent(event);
    
    // Visual feedback
    const btn = document.getElementById('apply-paint');
    if (btn) {
      btn.textContent = '✓ Applied!';
      setTimeout(() => { btn.textContent = 'Apply to Ship'; }, 1500);
    }
  }

  /**
   * Handle reset button
   */
  function handleReset() {
    currentBaseColors = ['#33FF99', '#1A332E'];
    
    document.getElementById('color-slot-0').value = '#33FF99';
    document.getElementById('color-slot-1').value = '#1A332E';
    document.getElementById('color-slot-2').value = '#000000';
    document.getElementById('color-slot-2').disabled = true;
    document.getElementById('use-third-color').checked = false;
    
    updatePalettePreview();
    updateShipPreview();
  }

  /**
   * Handle export button
   */
  function handleExport() {
    if (!previewCanvas) return;

    const link = document.createElement('a');
    link.download = `ship-custom-${Date.now()}.png`;
    link.href = previewCanvas.toDataURL('image/png');
    link.click();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Core functions
    generatePalette,
    glazeColors,
    lerpColor,
    recolorSprite,
    
    // UI
    renderUI,
    applyPreset,
    
    // Data
    PRESET_SCHEMES,
    TRANSPARENCY_MAP,
    
    // State access
    getCurrentColors: () => [...currentBaseColors],
    getCurrentPalette: () => generatePalette(currentBaseColors),
  };

})();

// Auto-init if container exists
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('paint-bay-container');
  if (container) {
    PaintBay.renderUI('paint-bay-container');
  }
});
