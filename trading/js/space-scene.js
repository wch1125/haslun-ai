
/**
 * GLOBAL SPACE SCENE CONTROLLER
 * Single canvas background that persists across all pages
 * "We are always floating in space"
 */
const SpaceScene = (() => {
  const canvas = document.createElement("canvas");
  canvas.id = "space-scene";
  const ctx = canvas.getContext("2d");

  let stars = [];
  let debris = [];
  let fleetShips = [];
  let mode = "hangar";
  let running = true;
  const isMobile = window.innerWidth < 768;
  let dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  
  // Ship sprites for flybys
  const shipSprites = {};
  const shipTypes = ['RKLB', 'LUNR', 'JOBY', 'ACHR', 'ASTS', 'BKSY', 'GME', 'KTOS'];
  const shipFiles = {
    'RKLB': 'RKLB-flagship-ship.png',
    'LUNR': 'LUNR-lander-ship.png',
    'JOBY': 'JOBY-eVTOL-light-class-ship.png',
    'ACHR': 'ACHR-eVTOL-ship.png',
    'ASTS': 'ASTS-Communications-Relay-Ship.png',
    'BKSY': 'BKSY-recon-ship.png',
    'GME': 'GME-moonshot-ship.png',
    'KTOS': 'KTOS-Fighter-Ship.png'
  };
  let spritesLoaded = false;
  
  // Mode configurations
  const modeConfig = {
    hangar: { starSpeed: 0.15, debrisSpeed: 0.3, debrisCount: 8, starCount: 150, shipFrequency: 0.003, shipSpeed: 0.4 },
    command: { starSpeed: 0.08, debrisSpeed: 0.15, debrisCount: 4, starCount: 120, shipFrequency: 0.001, shipSpeed: 0.2 },
    arcade: { starSpeed: 0.8, debrisSpeed: 1.2, debrisCount: 15, starCount: 200, shipFrequency: 0.008, shipSpeed: 1.2 },
    data: { starSpeed: 0.05, debrisSpeed: 0.1, debrisCount: 2, starCount: 80, shipFrequency: 0.0005, shipSpeed: 0.15 }
  };
  
  // Parallax layers for depth
  const parallaxLayers = [
    { speedMult: 0.3, starSize: 0.5, opacity: 0.3 },  // Far background
    { speedMult: 0.6, starSize: 1.0, opacity: 0.5 },  // Mid
    { speedMult: 1.0, starSize: 1.5, opacity: 0.8 }   // Near
  ];
  
  // Colors
  const starColors = ['#ffffff', '#aaccff', '#ffeecc', '#aaffaa'];
  const debrisColors = ['#33ff99', '#ffb347', '#6688aa'];

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    initStars();
    initDebris();
  }
  
  // Load ship sprites for flybys
  function loadShipSprites() {
    let loaded = 0;
    const total = shipTypes.length;
    
    shipTypes.forEach(type => {
      const img = new Image();
      img.onload = () => {
        shipSprites[type] = img;
        loaded++;
        if (loaded >= total) {
          spritesLoaded = true;
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= total) spritesLoaded = true;
      };
      img.src = `assets/ships/${shipFiles[type]}`;
    });
  }

  function initStars() {
    const config = modeConfig[mode] || modeConfig.hangar;
    stars = [];
    
    // Create stars for each parallax layer
    parallaxLayers.forEach((layer, layerIdx) => {
      const count = isMobile ? Math.floor(config.starCount * 0.4) : Math.floor(config.starCount * 0.6);
      
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          layer: layerIdx,
          size: layer.starSize * (Math.random() * 0.8 + 0.6),
          color: starColors[Math.floor(Math.random() * starColors.length)],
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.02 + 0.005
        });
      }
    });
  }
  
  function initDebris() {
    const config = modeConfig[mode] || modeConfig.hangar;
    const count = isMobile ? Math.floor(config.debrisCount * 0.5) : config.debrisCount;
    
    debris = Array.from({ length: count }, () => createDebris());
  }
  
  function createDebris() {
    return {
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      z: Math.random() * 0.5 + 0.5,
      size: Math.random() * 3 + 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
      type: Math.random() > 0.7 ? 'chunk' : 'debris'
    };
  }
  
  // Fleet flyby ship creation
  function createFleetShip() {
    const availableTypes = Object.keys(shipSprites).filter(t => shipSprites[t]);
    if (availableTypes.length === 0) return null;
    
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const fromLeft = Math.random() > 0.5;
    const depth = Math.random(); // 0 = far, 1 = close
    const scale = 0.15 + depth * 0.35; // 15% to 50% of original size
    
    return {
      type,
      x: fromLeft ? -100 : window.innerWidth + 100,
      y: Math.random() * window.innerHeight * 0.7 + window.innerHeight * 0.1,
      direction: fromLeft ? 1 : -1,
      depth,
      scale,
      opacity: 0.15 + depth * 0.25, // Farther = more faded
      rotation: (fromLeft ? 0 : Math.PI) + (Math.random() - 0.5) * 0.3, // Slight angle variation
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.02 + 0.01
    };
  }
  
  function maybeSpawnFleetShip() {
    if (!spritesLoaded) return;
    
    const config = modeConfig[mode] || modeConfig.hangar;
    const maxShips = isMobile ? 2 : 4;
    
    if (fleetShips.length < maxShips && Math.random() < config.shipFrequency) {
      const ship = createFleetShip();
      if (ship) fleetShips.push(ship);
    }
  }

  function draw() {
    if (!running) return;
    
    const config = modeConfig[mode] || modeConfig.hangar;
    
    // Clear with deep space color
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Draw stars with parallax layers
    stars.forEach(s => {
      const layer = parallaxLayers[s.layer];
      s.y += config.starSpeed * layer.speedMult;
      s.twinkle += s.twinkleSpeed;
      
      if (s.y > window.innerHeight) {
        s.y = 0;
        s.x = Math.random() * window.innerWidth;
      }
      
      const brightness = 0.5 + Math.sin(s.twinkle) * 0.3;
      ctx.globalAlpha = brightness * layer.opacity;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    
    ctx.globalAlpha = 1;
    
    // Draw fleet flyby ships (behind debris)
    maybeSpawnFleetShip();
    
    fleetShips = fleetShips.filter(ship => {
      const config = modeConfig[mode] || modeConfig.hangar;
      const speed = config.shipSpeed * (0.5 + ship.depth * 0.5);
      
      ship.x += ship.direction * speed;
      ship.wobble += ship.wobbleSpeed;
      const wobbleY = Math.sin(ship.wobble) * 3;
      
      // Check if off screen
      if ((ship.direction > 0 && ship.x > window.innerWidth + 150) ||
          (ship.direction < 0 && ship.x < -150)) {
        return false; // Remove
      }
      
      // Draw the ship
      const sprite = shipSprites[ship.type];
      if (sprite) {
        ctx.save();
        ctx.globalAlpha = ship.opacity;
        ctx.translate(ship.x, ship.y + wobbleY);
        ctx.rotate(ship.rotation);
        
        const w = sprite.width * ship.scale;
        const h = sprite.height * ship.scale;
        
        // Draw silhouette effect (darker, slightly blue-tinted)
        ctx.filter = 'brightness(0.3) sepia(1) saturate(0.5) hue-rotate(180deg)';
        ctx.drawImage(sprite, -w/2, -h/2, w, h);
        ctx.filter = 'none';
        
        ctx.restore();
      }
      
      return true; // Keep
    });
    
    ctx.globalAlpha = 1;
    
    // Draw debris
    debris.forEach(d => {
      d.y += d.z * config.debrisSpeed;
      d.rotation += d.rotSpeed;
      
      if (d.y > window.innerHeight + 50) {
        Object.assign(d, createDebris());
        d.y = -30;
      }
      
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.globalAlpha = 0.4 * d.z;
      ctx.fillStyle = d.color;
      
      if (d.type === 'chunk') {
        // Draw angular chunk shape
        ctx.beginPath();
        ctx.moveTo(0, -d.size);
        ctx.lineTo(d.size * 0.8, -d.size * 0.3);
        ctx.lineTo(d.size * 0.5, d.size * 0.7);
        ctx.lineTo(-d.size * 0.6, d.size * 0.4);
        ctx.lineTo(-d.size * 0.7, -d.size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw debris rectangle
        ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size);
      }
      
      ctx.restore();
    });
    
    ctx.globalAlpha = 1;
    
    requestAnimationFrame(draw);
  }

  function setMode(newMode) {
    if (modeConfig[newMode] && newMode !== mode) {
      mode = newMode;
      initDebris();
    }
  }

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) draw();
  });

  window.addEventListener("resize", resize);

  function mount() {
    document.body.prepend(canvas);
    loadShipSprites();
    resize();
    draw();
  }

  return { mount, setMode };
})();

window.SpaceScene = SpaceScene;
