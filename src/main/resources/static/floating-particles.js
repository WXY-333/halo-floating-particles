(function () {
  var config = window.__HALO_FLOATING_PARTICLES__ || {};
  var effect = config.effect || "snow";
  var cursorEffect = config.cursorEffect || "none";
  var count = clampNumber(config.count, 80, 20, 200);
  var color = typeof config.color === "string" ? config.color : "#ffffff";
  var opacity = clampNumber(config.opacity, 0.55, 0.1, 1);
  var speed = clampNumber(config.speed, 1, 0.2, 3);
  var canvasId = "halo-floating-particles-canvas";
  var rippleFallbackStarted = false;

  cleanupOldCanvases();

  var useWebglRipple = cursorEffect === "ripple" && window.WebGLRenderingContext;
  if (useWebglRipple) {
    startRipplePreset();
  }

  var needsCanvas = effect !== "none" || cursorEffect === "fireworks" || cursorEffect === "ripple";
  if (!needsCanvas) {
    return;
  }

  var canvas = document.createElement("canvas");
  canvas.id = canvasId;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "2147483647";
  canvas.style.mixBlendMode = effect === "fireflies" || effect === "ripple" || cursorEffect !== "none" ? "screen" : "normal";
  document.documentElement.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  var width = 0;
  var height = 0;
  var particles = [];
  var ripples = [];
  var fireworks = [];
  var animationId = 0;
  var lastRippleTime = 0;
  var pageRippleTimer = 0;
  var fireworkLongPressed = false;
  var fireworkPressTimer = 0;
  var fireworkMultiplier = 0;
  var fireworkNormal = { x: 0, y: 0 };
  var fireworkColours = ["#F73859", "#14FFEC", "#00E0FF", "#FF99FE", "#FAF15D"];

  function cleanupOldCanvases() {
    removeElementById(canvasId);
    removeElementById("sakura");
    removeElementById("halo-ripple-preset-canvas");
    if (window.__HALO_RIPPLE_PRESET__) {
      window.__HALO_RIPPLE_PRESET__.destroy();
      window.__HALO_RIPPLE_PRESET__ = null;
    }
  }

  function removeElementById(id) {
    var element = document.getElementById(id);
    if (element) {
      element.remove();
    }
  }

  function clampNumber(value, fallback, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      number = fallback;
    }
    return Math.max(min, Math.min(number, max));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getStaticBase() {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
      return currentScript.src.replace(/floating-particles\.js(?:\?.*)?$/, "");
    }
    return "/plugins/floating-particles/assets/static/";
  }

  function startRipplePreset() {
    import(getStaticBase() + "ripple-preset.js")
      .then(function (module) {
        module.startHaloRipplePreset({
          color: color,
          opacity: opacity,
          speed: speed
        });
      })
      .catch(function (error) {
        console.warn("Failed to start WebGL ripple preset.", error);
        useWebglRipple = false;
        startRippleFallback();
      });
  }

  function resize() {
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function createParticle() {
    var base = {
      x: random(0, width),
      y: random(0, height),
      alpha: random(opacity * 0.35, opacity),
      drift: random(-0.35, 0.35) * speed,
      phase: random(0, Math.PI * 2)
    };

    if (effect === "bubbles") {
      base.radius = random(5, 18);
      base.vx = random(-0.18, 0.18) * speed;
      base.vy = -random(0.35, 1.1) * speed;
      return base;
    }

    if (effect === "stars") {
      base.radius = random(1, 3.2);
      base.vx = random(-0.12, 0.12) * speed;
      base.vy = random(-0.08, 0.12) * speed;
      base.twinkle = random(0.01, 0.035);
      return base;
    }

    if (effect === "fireflies") {
      base.radius = random(2, 4.8);
      base.vx = random(-0.45, 0.45) * speed;
      base.vy = random(-0.35, 0.25) * speed;
      base.twinkle = random(0.018, 0.045);
      base.alpha = random(0.12, opacity);
      return base;
    }

    if (effect === "sakura") {
      base.radius = random(7, 15);
      base.vx = random(-0.35, 0.45) * speed;
      base.vy = random(0.38, 1.05) * speed;
      base.spin = random(-0.035, 0.035) * speed;
      base.angle = random(0, Math.PI * 2);
      base.swing = random(0.5, 1.6) * speed;
      base.alpha = random(opacity * 0.45, opacity);
      return base;
    }

    base.radius = random(2, 6);
    base.vx = random(-0.25, 0.25) * speed;
    base.vy = random(0.45, 1.35) * speed;
    return base;
  }

  function resetParticle(particle) {
    particle.x = random(0, width);
    if (effect === "bubbles" || effect === "fireflies") {
      particle.y = height + random(5, 60);
    } else {
      particle.y = -random(5, 60);
    }
  }

  function updateParticle(particle, index) {
    particle.phase += effect === "snow" ? 0.01 : particle.twinkle || 0.015;
    particle.x += particle.vx + Math.sin(particle.phase) * particle.drift;
    particle.y += particle.vy;

    if (effect === "sakura") {
      particle.angle += particle.spin;
      particle.x += Math.sin(particle.phase * 1.4) * particle.swing;
      if (particle.y > height + 80 || particle.x < -100 || particle.x > width + 100) {
        resetParticle(particle);
        particle.y = -random(10, 120 + index);
      }
      return;
    }

    if (effect === "stars") {
      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;
      return;
    }

    if (effect === "bubbles" || effect === "fireflies") {
      if (particle.y < -80 || particle.x < -80 || particle.x > width + 80) {
        resetParticle(particle);
      }
      return;
    }

    if (particle.y > height + 80 || particle.x < -80 || particle.x > width + 80) {
      resetParticle(particle);
      particle.y = -random(5, 80 + index);
    }
  }

  function drawParticle(particle) {
    ctx.save();

    var alpha = particle.alpha;
    if (effect === "stars" || effect === "fireflies") {
      alpha = Math.max(0.08, particle.alpha * (0.55 + Math.sin(particle.phase) * 0.45));
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = effect === "fireflies" ? "#ffe887" : color;
    ctx.strokeStyle = color;

    if (effect === "bubbles") {
      ctx.globalAlpha = alpha * 0.5;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.18;
      ctx.fill();
    } else if (effect === "sakura") {
      drawSakuraPetal(particle, alpha);
    } else if (effect === "fireflies") {
      drawFirefly(particle);
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFirefly(particle) {
    var gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      particle.radius * 5
    );
    gradient.addColorStop(0, "#fff8b3");
    gradient.addColorStop(0.35, "#ffe887");
    gradient.addColorStop(1, "rgba(255, 232, 135, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSakuraPetal(particle, alpha) {
    var radius = particle.radius;
    var fold = 0.65 + Math.sin(particle.phase) * 0.25;

    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);
    ctx.scale(fold, 1);
    ctx.globalAlpha = alpha;

    var gradient = ctx.createRadialGradient(
      -radius * 0.25,
      -radius * 0.35,
      radius * 0.1,
      0,
      0,
      radius * 1.2
    );
    gradient.addColorStop(0, "#fff1f7");
    gradient.addColorStop(0.55, "#ffb7cc");
    gradient.addColorStop(1, "#f28ab0");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(radius * 0.9, -radius * 0.6, radius * 0.95, radius * 0.35, 0, radius);
    ctx.bezierCurveTo(-radius * 0.95, radius * 0.35, -radius * 0.9, -radius * 0.6, 0, -radius);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.65);
    ctx.quadraticCurveTo(radius * 0.12, 0, 0, radius * 0.65);
    ctx.stroke();
  }

  function addRipple(x, y, strength) {
    ripples.push({
      x: x,
      y: y,
      radius: 0,
      maxRadius: random(24, 56) * strength,
      speed: random(0.9, 1.8) * speed,
      alpha: opacity,
      lineWidth: random(0.7, 1.4),
      color: color,
      glow: false
    });

    if (ripples.length > 28) {
      ripples.shift();
    }
  }

  function addPageRipple(x, y) {
    addRipple(x, y, 0.58);
  }

  function setupRippleEvents() {
    window.addEventListener("pointermove", function (event) {
      var now = performance.now();
      if (now - lastRippleTime < 80) {
        return;
      }
      lastRippleTime = now;
      addRipple(event.clientX, event.clientY, 0.28);
    }, { passive: true });

    window.addEventListener("click", function (event) {
      addRipple(event.clientX, event.clientY, 0.58);
    }, { passive: true });
  }

  function startRippleFallback() {
    if (rippleFallbackStarted || cursorEffect !== "ripple") {
      return;
    }
    rippleFallbackStarted = true;
    setupRippleEvents();
  }

  function startPageRipples() {
    if (effect !== "ripple" || pageRippleTimer) {
      return;
    }

    addPageRipple(
      random(width * 0.18, width * 0.82),
      random(height * 0.18, height * 0.82)
    );

    pageRippleTimer = window.setInterval(function () {
      if (document.hidden) {
        return;
      }
      addPageRipple(
        random(width * 0.08, width * 0.92),
        random(height * 0.12, height * 0.88)
      );
    }, Math.max(760, 1450 / speed));
  }

  function updateRipple(ripple) {
    ripple.radius += ripple.speed;
    ripple.alpha *= 0.982;
  }

  function drawRipple(ripple) {
    var progress = ripple.radius / ripple.maxRadius;
    var alpha = ripple.alpha * (1 - progress);
    if (alpha <= 0) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineWidth = ripple.lineWidth;
    ctx.strokeStyle = hexToRgba(ripple.color || color, Math.max(0, alpha));
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (ripple.glow) {
      ctx.globalAlpha = alpha * 0.24;
      ctx.lineWidth = ripple.lineWidth * 3.2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = alpha * 0.28;
    ctx.lineWidth = ripple.lineWidth * 0.7;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function setupFireworkEvents() {
    window.addEventListener("mousedown", function (event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      addFireworkBurst(randomInt(10, 20), event.clientX, event.clientY);
      fireworkLongPressed = false;
      window.clearTimeout(fireworkPressTimer);
      fireworkPressTimer = window.setTimeout(function () {
        fireworkLongPressed = true;
      }, 500);
    }, { passive: true });

    window.addEventListener("mouseup", function (event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      window.clearTimeout(fireworkPressTimer);
      if (fireworkLongPressed) {
        addFireworkBurst(
          randomInt(50 + Math.ceil(fireworkMultiplier), 100 + Math.ceil(fireworkMultiplier)),
          event.clientX,
          event.clientY
        );
        fireworkLongPressed = false;
      }
    }, { passive: true });

    window.addEventListener("blur", function () {
      window.clearTimeout(fireworkPressTimer);
      fireworkLongPressed = false;
    }, { passive: true });
  }

  function addFireworkBurst(amount, x, y) {
    for (var i = 0; i < amount; i++) {
      var angle = Math.PI * 2 * Math.random();
      var multiplier = fireworkLongPressed
        ? random(14 + fireworkMultiplier, 15 + fireworkMultiplier)
        : random(6, 12);
      var velocity = (multiplier + Math.random() * 0.5) * speed;
      fireworks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: random(8, 12) + 3 * Math.random(),
        angle: angle,
        color: fireworkColours[Math.floor(Math.random() * fireworkColours.length)]
      });
    }

    if (fireworks.length > 420) {
      fireworks.splice(0, fireworks.length - 420);
    }
  }

  function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
  }

  function updateFirework(ball) {
    ball.x += ball.vx - fireworkNormal.x;
    ball.y += ball.vy - fireworkNormal.y;
    fireworkNormal.x = -2 / Math.max(width, 1) * Math.sin(ball.angle);
    fireworkNormal.y = -2 / Math.max(height, 1) * Math.cos(ball.angle);
    ball.radius -= 0.3;
    ball.vx *= 0.9;
    ball.vy *= 0.9;
  }

  function drawFirework(ball) {
    if (ball.radius <= 0) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = opacity;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function isFireworkVisible(ball) {
    return ball.radius > 0 &&
      ball.x + ball.radius >= 0 &&
      ball.x - ball.radius <= width &&
      ball.y + ball.radius >= 0 &&
      ball.y - ball.radius <= height;
  }

  function hexToRgba(hex, alpha) {
    var normalized = hex.replace("#", "");
    var number = parseInt(normalized, 16);
    var r = number >> 16 & 255;
    var g = number >> 8 & 255;
    var b = number & 255;
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    if (effect !== "none" && effect !== "ripple") {
      particles.forEach(function (particle, index) {
        updateParticle(particle, index);
        drawParticle(particle);
      });
    }

    if (effect === "ripple" || (cursorEffect === "ripple" && !useWebglRipple)) {
      ripples = ripples.filter(function (ripple) {
        updateRipple(ripple);
        drawRipple(ripple);
        return ripple.radius < ripple.maxRadius && ripple.alpha > 0.02;
      });
    }

    if (cursorEffect === "fireworks") {
      fireworks = fireworks.filter(function (ball) {
        updateFirework(ball);
        drawFirework(ball);
        return isFireworkVisible(ball);
      });

      if (fireworkLongPressed) {
        fireworkMultiplier += 0.2;
      } else if (fireworkMultiplier > 0) {
        fireworkMultiplier = Math.max(0, fireworkMultiplier - 0.4);
      }
    }

    animationId = window.requestAnimationFrame(render);
  }

  function init() {
    resize();

    if (effect !== "none" && effect !== "ripple") {
      particles = Array.from({ length: count }, createParticle);
    }

    startPageRipples();

    if (cursorEffect === "ripple" && !useWebglRipple) {
      startRippleFallback();
    }

    if (cursorEffect === "fireworks") {
      setupFireworkEvents();
    }

    window.addEventListener("resize", resize);
    render();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      window.clearInterval(pageRippleTimer);
      pageRippleTimer = 0;
      window.cancelAnimationFrame(animationId);
    } else {
      startPageRipples();
      render();
    }
  });

  init();
})();
