(function () {
  var config = window.__HALO_FLOATING_PARTICLES__ || {};
  var effect = config.effect || "snow";
  var cursorEffect = config.cursorEffect || "none";
  var count = clampNumber(config.count, 80, 20, 200);
  var color = typeof config.color === "string" ? config.color : "#ffffff";
  var opacity = clampNumber(config.opacity, 0.55, 0.1, 1);
  var speed = clampNumber(config.speed, 1, 0.2, 3);
  var canvasId = "halo-floating-particles-canvas";
  var webglTailCanvasId = "halo-webgl-cursor-tail-canvas";
  var rippleFallbackStarted = false;

  cleanupOldCanvases();

  var useWebglRipple = (effect === "ripple" || cursorEffect === "ripple") && window.WebGLRenderingContext;
  if (useWebglRipple) {
    startRipplePreset();
  }

  var needsCanvas = effect !== "none" ||
    ["fireworks", "ripple", "trail", "stars", "preset-stars", "hearts", "halo", "webgl-tail"].indexOf(cursorEffect) !== -1;
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
  canvas.style.mixBlendMode = effect === "fireflies" || (cursorEffect === "ripple" && effect !== "ripple") ? "screen" : "normal";
  document.documentElement.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  var width = 0;
  var height = 0;
  var particles = [];
  var ripples = [];
  var fireworks = [];
  var cursorParticles = [];
  var animationId = 0;
  var lastRippleTime = 0;
  var lastCursorParticleTime = 0;
  var pageRippleTimer = 0;
  var cursorX = -9999;
  var cursorY = -9999;
  var lastPresetStarX = -9999;
  var lastPresetStarY = -9999;
  var cursorHaloVisible = false;
  var fireworkLongPressed = false;
  var fireworkPressTimer = 0;
  var fireworkMultiplier = 0;
  var fireworkNormal = { x: 0, y: 0 };
  var fireworkColours = ["#F73859", "#14FFEC", "#00E0FF", "#FF99FE", "#FAF15D"];
  var webglTail = null;

  function cleanupOldCanvases() {
    removeElementById(canvasId);
    removeElementById("sakura");
    removeElementById("halo-ripple-preset-canvas");
    removeElementById(webglTailCanvasId);
    if (window.__HALO_RIPPLE_PRESET__) {
      window.__HALO_RIPPLE_PRESET__.destroy();
      window.__HALO_RIPPLE_PRESET__ = null;
    }
    if (window.__HALO_WEBGL_CURSOR_TAIL__) {
      window.__HALO_WEBGL_CURSOR_TAIL__.destroy();
      window.__HALO_WEBGL_CURSOR_TAIL__ = null;
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
          speed: speed,
          autoDrops: effect === "ripple",
          interactive: cursorEffect === "ripple"
        });
      })
      .catch(function (error) {
        console.warn("Failed to start WebGL ripple preset.", error);
        useWebglRipple = false;
        startPageRipples();
        startRippleFallback();
      });
  }

  function startWebglCursorTail() {
    var tailCanvas = document.createElement("canvas");
    tailCanvas.id = webglTailCanvasId;
    tailCanvas.setAttribute("aria-hidden", "true");
    tailCanvas.style.position = "fixed";
    tailCanvas.style.inset = "0";
    tailCanvas.style.width = "100%";
    tailCanvas.style.height = "100%";
    tailCanvas.style.pointerEvents = "none";
    tailCanvas.style.zIndex = "2147483646";
    tailCanvas.style.mixBlendMode = "screen";
    document.documentElement.appendChild(tailCanvas);

    var gl = tailCanvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false
    });
    if (!gl) {
      tailCanvas.remove();
      return null;
    }

    var vertexShader = createWebglShader(gl, gl.VERTEX_SHADER, [
      "attribute vec2 a_position;",
      "attribute float a_age;",
      "attribute float a_size;",
      "attribute float a_color;",
      "uniform vec2 u_resolution;",
      "varying float v_age;",
      "varying float v_color;",
      "void main() {",
      "  vec2 zeroToOne = a_position / u_resolution;",
      "  vec2 clip = zeroToOne * 2.0 - 1.0;",
      "  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);",
      "  gl_PointSize = max(2.0, a_size * (1.0 - a_age * 0.68));",
      "  v_age = a_age;",
      "  v_color = a_color;",
      "}"
    ].join("\n"));
    var fragmentShader = createWebglShader(gl, gl.FRAGMENT_SHADER, [
      "precision mediump float;",
      "uniform vec3 u_colorA;",
      "uniform vec3 u_colorB;",
      "uniform vec3 u_colorC;",
      "varying float v_age;",
      "varying float v_color;",
      "void main() {",
      "  vec2 centered = gl_PointCoord - vec2(0.5);",
      "  float dist = length(centered);",
      "  float core = smoothstep(0.28, 0.02, dist);",
      "  float glow = smoothstep(0.5, 0.04, dist) * 0.52;",
      "  float alpha = (core + glow) * pow(1.0 - v_age, 1.35);",
      "  vec3 color = mix(u_colorA, u_colorB, smoothstep(0.0, 0.7, v_color));",
      "  color = mix(color, u_colorC, smoothstep(0.55, 1.0, v_color));",
      "  gl_FragColor = vec4(color, alpha);",
      "}"
    ].join("\n"));
    var program = createWebglProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      tailCanvas.remove();
      return null;
    }

    var buffer = gl.createBuffer();
    var stride = 5 * 4;
    var positionLocation = gl.getAttribLocation(program, "a_position");
    var ageLocation = gl.getAttribLocation(program, "a_age");
    var sizeLocation = gl.getAttribLocation(program, "a_size");
    var colorLocation = gl.getAttribLocation(program, "a_color");
    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    var colorALocation = gl.getUniformLocation(program, "u_colorA");
    var colorBLocation = gl.getUniformLocation(program, "u_colorB");
    var colorCLocation = gl.getUniformLocation(program, "u_colorC");
    var palette = webglTailPalette();
    var points = [];
    var animationFrame = 0;
    var disposed = false;
    var ratio = 1;
    var tailWidth = 0;
    var tailHeight = 0;
    var lastX = -1;
    var lastY = -1;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(ageLocation);
    gl.vertexAttribPointer(ageLocation, 1, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(sizeLocation);
    gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 1, gl.FLOAT, false, stride, 4 * 4);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    function resizeTail() {
      ratio = Math.max(window.devicePixelRatio || 1, 1);
      tailWidth = window.innerWidth;
      tailHeight = window.innerHeight;
      tailCanvas.width = Math.floor(tailWidth * ratio);
      tailCanvas.height = Math.floor(tailHeight * ratio);
      gl.viewport(0, 0, tailCanvas.width, tailCanvas.height);
    }

    function pushTailPoint(x, y) {
      points.push({
        x: x,
        y: y,
        age: 0,
        size: random(34, 68) * ratio,
        color: Math.random()
      });
      if (points.length > 150) {
        points.splice(0, points.length - 150);
      }
    }

    function onPointerMove(event) {
      var x = event.clientX;
      var y = event.clientY;
      if (lastX < 0 || lastY < 0) {
        lastX = x;
        lastY = y;
        pushTailPoint(x, y);
        return;
      }

      var dx = x - lastX;
      var dy = y - lastY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.max(1, Math.min(8, Math.ceil(distance / 18)));
      for (var i = 1; i <= steps; i++) {
        var progress = i / steps;
        pushTailPoint(lastX + dx * progress, lastY + dy * progress);
      }
      lastX = x;
      lastY = y;
    }

    function onClick() {
      palette = webglTailPalette(true);
    }

    function renderTail() {
      if (disposed) {
        return;
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      var fade = 0.014 / Math.max(0.65, Math.sqrt(speed));
      points = points.filter(function (point) {
        point.age += fade;
        return point.age < 1;
      });

      if (points.length) {
        var data = new Float32Array(points.length * 5);
        points.forEach(function (point, index) {
          var offset = index * 5;
          data[offset] = point.x;
          data[offset + 1] = point.y;
          data[offset + 2] = point.age;
          data[offset + 3] = point.size;
          data[offset + 4] = point.color;
        });
        gl.useProgram(program);
        gl.uniform2f(resolutionLocation, tailWidth, tailHeight);
        gl.uniform3fv(colorALocation, palette[0]);
        gl.uniform3fv(colorBLocation, palette[1]);
        gl.uniform3fv(colorCLocation, palette[2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, points.length);
      }

      animationFrame = window.requestAnimationFrame(renderTail);
    }

    function destroyTail() {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeTail);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
      tailCanvas.remove();
    }

    resizeTail();
    window.addEventListener("resize", resizeTail, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    renderTail();

    return {
      destroy: destroyTail
    };
  }

  function createWebglShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Failed to compile cursor WebGL shader.", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createWebglProgram(gl, vertexShader, fragmentShader) {
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Failed to link cursor WebGL program.", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function webglTailPalette(randomize) {
    var palettes = [
      ["#f967fb", "#53bc28", "#6958d5"],
      ["#83f36e", "#fe8a2e", "#ff008a"],
      ["#14ffec", "#00e0ff", "#ff99fe"],
      ["#fff4a8", "#8fd8ff", "#ff7eb3"]
    ];
    var selected = palettes[randomize ? Math.floor(Math.random() * palettes.length) : 0];
    if (color && color.toLowerCase() !== "#ffffff" && !randomize) {
      selected = [color, "#53bc28", "#6958d5"];
    }
    return selected.map(hexToRgbUnit);
  }

  function hexToRgbUnit(hex) {
    var normalized = hex.replace("#", "");
    var number = parseInt(normalized, 16);
    return [
      (number >> 16 & 255) / 255,
      (number >> 8 & 255) / 255,
      (number & 255) / 255
    ];
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

    if (effect === "meteors") {
      base.x = random(-width * 0.4, width);
      base.y = random(-height * 0.25, height * 0.55);
      base.length = random(80, 170);
      base.lineWidth = random(1.2, 2.2);
      base.vx = random(5.5, 10.5) * speed;
      base.vy = random(2.6, 5.2) * speed;
      base.alpha = random(opacity * 0.45, opacity);
      base.wait = random(0, 220);
      return base;
    }

    if (effect === "leaves") {
      base.radius = random(8, 16);
      base.vx = random(-0.45, 0.65) * speed;
      base.vy = random(0.35, 1.05) * speed;
      base.angle = random(0, Math.PI * 2);
      base.spin = random(-0.035, 0.035) * speed;
      base.swing = random(0.6, 1.8) * speed;
      base.hue = random(26, 48);
      base.alpha = random(opacity * 0.48, opacity);
      return base;
    }

    if (effect === "network") {
      base.radius = random(1.4, 3.2);
      base.vx = random(-0.35, 0.35) * speed;
      base.vy = random(-0.28, 0.28) * speed;
      base.alpha = random(opacity * 0.45, opacity);
      return base;
    }

    if (effect === "stardust") {
      base.radius = random(0.7, 2.2);
      base.vx = random(-0.18, 0.18) * speed;
      base.vy = random(-0.12, 0.18) * speed;
      base.twinkle = random(0.008, 0.025);
      base.alpha = random(opacity * 0.18, opacity * 0.72);
      return base;
    }

    if (effect === "confetti") {
      base.width = random(5, 10);
      base.height = random(8, 16);
      base.vx = random(-0.55, 0.75) * speed;
      base.vy = random(0.55, 1.35) * speed;
      base.angle = random(0, Math.PI * 2);
      base.spin = random(-0.09, 0.09) * speed;
      base.swing = random(0.3, 1.2) * speed;
      base.color = randomConfettiColor();
      base.alpha = random(opacity * 0.55, opacity);
      return base;
    }

    if (effect === "rain") {
      base.length = random(12, 28);
      base.vx = random(-0.65, -0.25) * speed;
      base.vy = random(4.2, 7.2) * speed;
      base.alpha = random(opacity * 0.25, opacity * 0.65);
      base.lineWidth = random(0.7, 1.3);
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
    } else if (effect === "meteors") {
      particle.x = random(-width * 0.55, width * 0.7);
      particle.y = random(-height * 0.35, height * 0.35);
      particle.wait = random(30, 260);
    } else if (effect === "rain") {
      particle.x = random(0, width + 120);
      particle.y = -random(20, 160);
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

    if (effect === "meteors") {
      particle.x -= particle.vx + Math.sin(particle.phase) * particle.drift;
      particle.y -= particle.vy;

      if (particle.wait > 0) {
        particle.wait -= 1;
        return;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x > width + particle.length || particle.y > height + particle.length) {
        resetParticle(particle);
      }
      return;
    }

    if (effect === "leaves") {
      particle.angle += particle.spin;
      particle.x += Math.sin(particle.phase * 1.35) * particle.swing;
      if (particle.y > height + 80 || particle.x < -100 || particle.x > width + 100) {
        resetParticle(particle);
        particle.y = -random(10, 120 + index);
      }
      return;
    }

    if (effect === "network") {
      if (particle.x < 0 || particle.x > width) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > height) {
        particle.vy *= -1;
      }
      particle.x = Math.max(0, Math.min(width, particle.x));
      particle.y = Math.max(0, Math.min(height, particle.y));
      return;
    }

    if (effect === "stardust") {
      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;
      return;
    }

    if (effect === "confetti") {
      particle.angle += particle.spin;
      particle.x += Math.sin(particle.phase * 1.7) * particle.swing;
      if (particle.y > height + 80 || particle.x < -80 || particle.x > width + 80) {
        resetParticle(particle);
        particle.y = -random(10, 120 + index);
      }
      return;
    }

    if (effect === "rain") {
      if (particle.y > height + 60 || particle.x < -120) {
        resetParticle(particle);
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
    if (effect === "stars" || effect === "fireflies" || effect === "stardust") {
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
    } else if (effect === "meteors") {
      drawMeteor(particle, alpha);
    } else if (effect === "leaves") {
      drawLeaf(particle, alpha);
    } else if (effect === "stardust") {
      drawStardust(particle, alpha);
    } else if (effect === "confetti") {
      drawConfetti(particle, alpha);
    } else if (effect === "rain") {
      drawRain(particle, alpha);
    } else if (effect === "fireflies") {
      drawFirefly(particle);
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function randomConfettiColor() {
    var palette = ["#ff5a7a", "#ffd166", "#36c5f0", "#8cf27f", "#c084fc", "#ffffff"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function drawNetworkLines() {
    var maxDistance = Math.min(150, Math.max(90, width * 0.12));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var first = particles[i];
        var second = particles[j];
        var dx = first.x - second.x;
        var dy = first.y - second.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
          continue;
        }

        var lineAlpha = opacity * (1 - distance / maxDistance) * 0.42;
        ctx.strokeStyle = hexToRgba(color, lineAlpha);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(second.x, second.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawMeteor(particle, alpha) {
    if (particle.wait > 0) {
      return;
    }

    var tailX = particle.x - particle.length;
    var tailY = particle.y - particle.length * 0.48;
    var gradient = ctx.createLinearGradient(particle.x, particle.y, tailX, tailY);
    gradient.addColorStop(0, hexToRgba(color, alpha));
    gradient.addColorStop(0.25, hexToRgba(color, alpha * 0.45));
    gradient.addColorStop(1, hexToRgba(color, 0));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = gradient;
    ctx.lineWidth = particle.lineWidth;
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLeaf(particle, alpha) {
    var radius = particle.radius;
    var leafColor = "hsla(" + particle.hue + ", 78%, 52%, " + alpha + ")";

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);
    ctx.scale(0.75 + Math.sin(particle.phase) * 0.18, 1);
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(radius * 0.95, -radius * 0.45, radius * 0.75, radius * 0.65, 0, radius);
    ctx.bezierCurveTo(-radius * 0.75, radius * 0.65, -radius * 0.95, -radius * 0.45, 0, -radius);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = "rgba(255, 248, 210, 0.8)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.75);
    ctx.quadraticCurveTo(radius * 0.08, 0, 0, radius * 0.72);
    ctx.stroke();
    ctx.restore();
  }

  function drawStardust(particle, alpha) {
    var glow = particle.radius * 5;
    var gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, glow);
    gradient.addColorStop(0, hexToRgba(color, alpha));
    gradient.addColorStop(0.45, hexToRgba(color, alpha * 0.35));
    gradient.addColorStop(1, hexToRgba(color, 0));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawConfetti(particle, alpha) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-particle.width / 2, -particle.height / 2, particle.width, Math.max(1, particle.height * 0.22));
    ctx.restore();
  }

  function drawRain(particle, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = hexToRgba(color.toLowerCase() === "#ffffff" ? "#8fd8ff" : color, alpha);
    ctx.lineWidth = particle.lineWidth;
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x - particle.length * 0.35, particle.y + particle.length);
    ctx.stroke();
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
    addRipple(x, y, 0.46);
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

  function setupCursorParticleEvents() {
    window.addEventListener("pointermove", function (event) {
      cursorX = event.clientX;
      cursorY = event.clientY;
      cursorHaloVisible = true;

      var now = performance.now();
      if (now - lastCursorParticleTime < 36) {
        return;
      }
      lastCursorParticleTime = now;

      if (cursorEffect === "trail") {
        addCursorTrail(cursorX, cursorY);
      } else if (cursorEffect === "stars") {
        addCursorStars(cursorX, cursorY);
      } else if (cursorEffect === "preset-stars" && shouldAddPresetStar(cursorX, cursorY)) {
        addPresetCursorStar(cursorX, cursorY);
        lastPresetStarX = cursorX;
        lastPresetStarY = cursorY;
      }
    }, { passive: true });

    window.addEventListener("click", function (event) {
      if (cursorEffect === "hearts") {
        addCursorHeart(event.clientX, event.clientY);
      }
    }, { passive: true });

    window.addEventListener("mouseleave", function () {
      cursorHaloVisible = false;
    }, { passive: true });
  }

  function addCursorTrail(x, y) {
    cursorParticles.push({
      type: "trail",
      x: x + random(-4, 4),
      y: y + random(-4, 4),
      vx: random(-0.35, 0.35) * speed,
      vy: random(-0.35, 0.35) * speed,
      radius: random(4, 8),
      alpha: Math.max(0.55, opacity),
      color: color.toLowerCase() === "#ffffff" ? "#8fd8ff" : color
    });
    trimCursorParticles();
  }

  function addCursorStars(x, y) {
    var amount = Math.round(random(2, 4));
    for (var i = 0; i < amount; i++) {
      cursorParticles.push({
        type: "star",
        x: x + random(-8, 8),
        y: y + random(-8, 8),
        vx: random(-0.75, 0.75) * speed,
        vy: random(-1.1, 0.25) * speed,
        radius: random(4, 7),
        angle: random(0, Math.PI * 2),
        spin: random(-0.08, 0.08) * speed,
        alpha: Math.max(0.65, opacity),
        color: randomStarColor()
      });
    }
    trimCursorParticles();
  }

  function addCursorHeart(x, y) {
    var amount = Math.round(random(5, 9));
    for (var i = 0; i < amount; i++) {
      cursorParticles.push({
        type: "heart",
        x: x + random(-10, 10),
        y: y + random(-6, 8),
        vx: random(-0.8, 0.8) * speed,
        vy: random(-2.2, -0.85) * speed,
        radius: random(8, 14),
        angle: random(-0.35, 0.35),
        alpha: Math.max(0.75, opacity),
        color: randomHeartColor()
      });
    }
    trimCursorParticles();
  }

  function shouldAddPresetStar(x, y) {
    var dx = x - lastPresetStarX;
    var dy = y - lastPresetStarY;
    return Math.sqrt(dx * dx + dy * dy) >= 50;
  }

  function addPresetCursorStar(x, y) {
    cursorParticles.push({
      type: "preset-star",
      x: x,
      y: y + random(-20, 20),
      vx: random(-0.25, 0.25) * speed,
      vy: random(0.9, 1.7) * speed,
      radius: randomPresetStarSize(),
      angleX: random(0, Math.PI * 2),
      angleY: random(0, Math.PI * 2),
      spinX: random(0.08, 0.18) * speed,
      spinY: random(0.08, 0.18) * speed,
      alpha: Math.max(0.72, opacity),
      life: 0,
      maxLife: 1000,
      color: randomPresetStarColor()
    });
    trimCursorParticles();
  }

  function trimCursorParticles() {
    if (cursorParticles.length > 260) {
      cursorParticles.splice(0, cursorParticles.length - 260);
    }
  }

  function randomStarColor() {
    var palette = ["#ffffff", "#fff4a8", "#8fd8ff", "#ffd1f3"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function randomHeartColor() {
    var palette = ["#ff5a7a", "#ff7eb3", "#ff99ac", "#ff4d6d"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function randomPresetStarColor() {
    var palette = ["#E23636", "#F9F3EE", "#E1F8DC", "#B8AFE6", "#AEE1CD", "#5EB0E5"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function randomPresetStarSize() {
    var sizes = [13, 17, 10, 21];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }

  function updateCursorParticle(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.alpha *= particle.type === "heart" ? 0.976 : 0.94;

    if (particle.type === "trail") {
      particle.radius *= 0.965;
    } else if (particle.type === "star") {
      particle.angle += particle.spin;
      particle.vy += 0.018 * speed;
      particle.radius *= 0.982;
    } else if (particle.type === "heart") {
      particle.vy += 0.012 * speed;
      particle.radius *= 0.992;
    } else if (particle.type === "preset-star") {
      particle.life += 16.7;
      var progress = Math.min(1, particle.life / particle.maxLife);
      particle.alpha = Math.max(0, Math.max(0.72, opacity) * (1 - progress));
      particle.angleX += particle.spinX;
      particle.angleY += particle.spinY;
      particle.radius *= 0.994;
    }
  }

  function drawCursorParticle(particle) {
    if (particle.alpha <= 0.02 || particle.radius <= 0.4) {
      return;
    }

    if (particle.type === "trail") {
      drawCursorTrail(particle);
    } else if (particle.type === "star") {
      drawCursorStar(particle);
    } else if (particle.type === "heart") {
      drawCursorHeart(particle);
    } else if (particle.type === "preset-star") {
      drawPresetCursorStar(particle);
    }
  }

  function drawCursorTrail(particle) {
    var gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 3.4);
    gradient.addColorStop(0, hexToRgba(particle.color, particle.alpha));
    gradient.addColorStop(0.45, hexToRgba(particle.color, particle.alpha * 0.35));
    gradient.addColorStop(1, hexToRgba(particle.color, 0));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCursorStar(particle) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var radius = i % 2 === 0 ? particle.radius : particle.radius * 0.42;
      var angle = -Math.PI / 2 + i * Math.PI / 5;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPresetCursorStar(particle) {
    var scaleX = Math.max(0.24, Math.abs(Math.cos(particle.angleY)));
    var scaleY = Math.max(0.35, Math.abs(Math.cos(particle.angleX)));

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.scale(scaleX, scaleY);
    ctx.rotate((particle.angleX + particle.angleY) * 0.18);
    ctx.globalAlpha = particle.alpha;
    ctx.font = particle.radius + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255, 255, 255, 0.55)";
    ctx.shadowBlur = particle.radius * 0.8;
    ctx.fillStyle = particle.color;
    ctx.fillText("\u2726", 0, 0);
    ctx.restore();
  }

  function drawCursorHeart(particle) {
    var size = particle.radius / 18;

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);
    ctx.scale(size, size);
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-18, -6, -12, -22, 0, -12);
    ctx.bezierCurveTo(12, -22, 18, -6, 0, 8);
    ctx.fill();
    ctx.restore();
  }

  function drawCursorHalo() {
    if (!cursorHaloVisible || cursorEffect !== "halo") {
      return;
    }

    var radius = 34;
    var gradient = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, radius);
    var haloColor = color.toLowerCase() === "#ffffff" ? "#8fd8ff" : color;
    gradient.addColorStop(0, hexToRgba(haloColor, opacity * 0.22));
    gradient.addColorStop(0.45, hexToRgba(haloColor, opacity * 0.12));
    gradient.addColorStop(1, hexToRgba(haloColor, 0));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(haloColor, opacity * 0.38);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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
        radius: randomInt(8, 12) + 3 * Math.random(),
        angle: angle,
        color: fireworkColours[Math.floor(Math.random() * fireworkColours.length)]
      });
    }

    if (fireworks.length > 620) {
      fireworks.splice(0, fireworks.length - 620);
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

      if (effect === "network") {
        drawNetworkLines();
      }
    }

    if ((effect === "ripple" || cursorEffect === "ripple") && !useWebglRipple) {
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
    } else if (fireworkMultiplier >= 0) {
      fireworkMultiplier = Math.max(0, fireworkMultiplier - 0.4);
      }
    }

    if (cursorEffect === "trail" || cursorEffect === "stars" ||
      cursorEffect === "preset-stars" || cursorEffect === "hearts") {
      cursorParticles = cursorParticles.filter(function (particle) {
        updateCursorParticle(particle);
        drawCursorParticle(particle);
        return particle.alpha > 0.025 && particle.radius > 0.5;
      });
    }

    drawCursorHalo();

    animationId = window.requestAnimationFrame(render);
  }

  function init() {
    resize();

    if (effect !== "none" && effect !== "ripple") {
      particles = Array.from({ length: count }, createParticle);
    }

    if (!useWebglRipple) {
      startPageRipples();
    }

    if (cursorEffect === "ripple" && !useWebglRipple) {
      startRippleFallback();
    }

    if (cursorEffect === "fireworks") {
      setupFireworkEvents();
    }

    if (cursorEffect === "webgl-tail") {
      webglTail = window.WebGLRenderingContext ? startWebglCursorTail() : null;
      if (webglTail) {
        window.__HALO_WEBGL_CURSOR_TAIL__ = webglTail;
      } else {
        cursorEffect = "trail";
      }
    }

    if (cursorEffect === "trail" || cursorEffect === "stars" ||
      cursorEffect === "preset-stars" || cursorEffect === "hearts" || cursorEffect === "halo") {
      setupCursorParticleEvents();
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
