
const SpaceScene = (() => {
  const canvas = document.createElement("canvas");
  canvas.id = "space-scene";
  const ctx = canvas.getContext("2d");

  let stars = [];
  let mode = "hangar";
  let running = true;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initStars(count = 80) {
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 0.5 + 0.5
    }));
  }

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#aaa";
    stars.forEach(s => {
      s.y += s.z * (mode === "arcade" ? 1.5 : 0.3);
      if (s.y > window.innerHeight) s.y = 0;
      ctx.fillRect(s.x, s.y, 1, 1);
    });

    requestAnimationFrame(draw);
  }

  function setMode(newMode) {
    mode = newMode;
  }

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) draw();
  });

  window.addEventListener("resize", resize);

  function mount() {
    document.body.prepend(canvas);
    resize();
    initStars();
    draw();
  }

  return { mount, setMode };
})();

window.SpaceScene = SpaceScene;
