
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
  let mode = "hangar";
  let running = true;
  const isMobile = window.innerWidth < 768;
  let dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  
  // Mode configurations
  const modeConfig = {
    hangar: { starSpeed: 0.15, debrisSpeed: 0.3, debrisCount: 8, starCount: 150 },
    command: { starSpeed: 0.08, debrisSpeed: 0.15, debrisCount: 4, starCount: 120 },
    arcade: { starSpeed: 0.8, debrisSpeed: 1.2, debrisCount: 15, starCount: 200 },
    data: { starSpeed: 0.05, debrisSpeed: 0.1, debrisCount: 2, starCount: 80 }
  };
  
  // Colors
  const starColors = ['#ffffff', '#aaccff', '#ffeecc', '#aaffaa'];
  const debrisColors = ['#33ff99', '#ffb347', '#6688aa'];

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Reinitialize stars on resize
    initStars();
    initDebris();
  }

  function initStars() {
    const config = modeConfig[mode] || modeConfig.hangar;
    const count = isMobile ? Math.floor(config.starCount * 0.6) : config.starCount;
    
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 0.8 + 0.2,
      size: Math.random() * 1.5 + 0.5,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.01
    }));
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
      type: Math.random() > 0.7 ? 'ship' : 'debris'
    };
  }

  function draw() {
    if (!running) return;
    
    const config = modeConfig[mode] || modeConfig.hangar;
    
    // Clear with deep space color
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Draw stars with twinkle
    stars.forEach(s => {
      s.y += s.z * config.starSpeed;
      s.twinkle += s.twinkleSpeed;
      
      if (s.y > window.innerHeight) {
        s.y = 0;
        s.x = Math.random() * window.innerWidth;
      }
      
      const brightness = 0.5 + Math.sin(s.twinkle) * 0.3;
      ctx.globalAlpha = brightness * s.z;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    
    ctx.globalAlpha = 1;
    
    // Draw debris/distant ships
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
      
      if (d.type === 'ship') {
        // Draw simple ship shape
        ctx.beginPath();
        ctx.moveTo(0, -d.size * 2);
        ctx.lineTo(d.size, d.size);
        ctx.lineTo(-d.size, d.size);
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw debris chunk
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
      // Smoothly adjust star/debris counts
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
    resize();
    draw();
  }

  return { mount, setMode };
})();

window.SpaceScene = SpaceScene;
