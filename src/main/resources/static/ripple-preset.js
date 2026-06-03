import * as THREE from "./vendor/three.module.min.js";

export function startHaloRipplePreset(config = {}) {
  if (window.__HALO_RIPPLE_PRESET__) {
    window.__HALO_RIPPLE_PRESET__.destroy();
  }
  window.__HALO_RIPPLE_PRESET__ = new HaloRipplePreset(config);
}

class HaloRipplePreset {
  constructor(config) {
    this.config = {
      color: config.color || "#ffffff",
      opacity: clampNumber(config.opacity, 0.55, 0.1, 1),
      speed: clampNumber(config.speed, 1, 0.2, 3),
      resolution: 256,
      damping: 0.984,
      tension: 0.016,
      rippleRadius: 5,
      autoDrops: config.autoDrops === true,
      interactive: config.interactive !== false
    };
    this.lastMouseTime = 0;
    this.animationId = 0;
    this.autoDropTimer = 0;
    this.disposed = false;
    this.pointerMoveHandler = this.onPointerMove.bind(this);
    this.clickHandler = this.onClick.bind(this);
    this.resizeHandler = this.onResize.bind(this);
    this.init();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.canvas = this.renderer.domElement;
    this.canvas.id = "halo-ripple-preset-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.position = "fixed";
    this.canvas.style.inset = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "2147483647";
    this.canvas.style.mixBlendMode = this.config.autoDrops ? "normal" : "screen";
    document.documentElement.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
    this.clock = new THREE.Clock();

    this.initWater();
    this.initPlane();
    this.bindEvents();
    this.startAutoDrops();
    this.tick();
  }

  initWater() {
    var size = this.config.resolution * this.config.resolution;
    this.current = new Float32Array(size);
    this.previous = new Float32Array(size);
    this.waterTexture = new THREE.DataTexture(
      this.current,
      this.config.resolution,
      this.config.resolution,
      THREE.RedFormat,
      THREE.FloatType
    );
    this.waterTexture.minFilter = THREE.LinearFilter;
    this.waterTexture.magFilter = THREE.LinearFilter;
    this.waterTexture.needsUpdate = true;
  }

  initPlane() {
    var rgb = hexToRgb(this.config.color);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        waterTexture: { value: this.waterTexture },
        time: { value: 0 },
        opacity: { value: this.config.opacity },
        color: { value: new THREE.Vector3(rgb.r / 255, rgb.g / 255, rgb.b / 255) }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D waterTexture;
        uniform float time;
        uniform float opacity;
        uniform vec3 color;
        varying vec2 vUv;

        void main() {
          float h = texture2D(waterTexture, vUv).r;
          float wave = smoothstep(0.012, 0.18, abs(h));
          float ring = pow(wave, 0.75);
          vec2 p = vUv - 0.5;
          float shimmer = 0.72 + 0.28 * sin((p.x + p.y) * 20.0 + time * 1.8);
          vec3 tint = mix(color, vec3(0.58, 0.86, 1.0), 0.45);
          float alpha = ring * opacity * 0.75 * shimmer;

          gl_FragColor = vec4(tint * (0.6 + ring * 0.8), alpha);
        }
      `
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
  }

  bindEvents() {
    if (this.config.interactive) {
      window.addEventListener("pointermove", this.pointerMoveHandler, { passive: true });
      window.addEventListener("click", this.clickHandler, { passive: true });
    }
    window.addEventListener("resize", this.resizeHandler);
  }

  startAutoDrops() {
    if (!this.config.autoDrops) {
      return;
    }

    this.addRipple(
      random(window.innerWidth * 0.18, window.innerWidth * 0.82),
      random(window.innerHeight * 0.18, window.innerHeight * 0.82),
      0.36,
      4
    );

    this.autoDropTimer = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      this.addRipple(
        random(window.innerWidth * 0.08, window.innerWidth * 0.92),
        random(window.innerHeight * 0.12, window.innerHeight * 0.88),
        0.36,
        4
      );
    }, Math.max(760, 1450 / this.config.speed));
  }

  onPointerMove(event) {
    var now = performance.now();
    if (now - this.lastMouseTime < 70) {
      return;
    }
    this.lastMouseTime = now;
    this.addRipple(event.clientX, event.clientY, 0.14);
  }

  onClick(event) {
    this.addRipple(event.clientX, event.clientY, 0.46);
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addRipple(x, y, strength, radiusOverride) {
    var resolution = this.config.resolution;
    var texX = Math.floor((x / window.innerWidth) * resolution);
    var texY = Math.floor((1 - y / window.innerHeight) * resolution);
    var radius = radiusOverride || this.config.rippleRadius;
    var radiusSquared = radius * radius;

    for (var i = -radius; i <= radius; i++) {
      for (var j = -radius; j <= radius; j++) {
        var distanceSquared = i * i + j * j;
        if (distanceSquared > radiusSquared) {
          continue;
        }

        var posX = texX + i;
        var posY = texY + j;
        if (posX < 0 || posX >= resolution || posY < 0 || posY >= resolution) {
          continue;
        }

        var index = posY * resolution + posX;
        var distance = Math.sqrt(distanceSquared);
        var ripple = Math.cos((distance / radius) * Math.PI * 0.5) * strength;
        this.previous[index] += ripple;
      }
    }
  }

  updateWater() {
    var resolution = this.config.resolution;
    var safeTension = Math.min(this.config.tension * this.config.speed, 0.05);

    for (var y = 1; y < resolution - 1; y++) {
      for (var x = 1; x < resolution - 1; x++) {
        var index = y * resolution + x;
        var top = this.previous[index - resolution];
        var bottom = this.previous[index + resolution];
        var left = this.previous[index - 1];
        var right = this.previous[index + 1];

        this.current[index] = (top + bottom + left + right) / 2 - this.current[index];
        this.current[index] = this.current[index] * this.config.damping + this.previous[index] * (1 - this.config.damping);
        this.current[index] += (0 - this.previous[index]) * safeTension;
        this.current[index] = Math.max(-1, Math.min(1, this.current[index]));
      }
    }

    var temp = this.current;
    this.current = this.previous;
    this.previous = temp;
    this.waterTexture.image.data = this.current;
    this.waterTexture.needsUpdate = true;
  }

  tick() {
    if (this.disposed) {
      return;
    }
    this.updateWater();
    this.material.uniforms.time.value += this.clock.getDelta();
    this.renderer.render(this.scene, this.camera);
    this.animationId = window.requestAnimationFrame(() => this.tick());
  }

  destroy() {
    this.disposed = true;
    window.cancelAnimationFrame(this.animationId);
    window.clearInterval(this.autoDropTimer);
    window.removeEventListener("pointermove", this.pointerMoveHandler);
    window.removeEventListener("click", this.clickHandler);
    window.removeEventListener("resize", this.resizeHandler);
    this.mesh?.geometry?.dispose();
    this.material?.dispose();
    this.waterTexture?.dispose();
    this.renderer?.dispose();
    this.canvas?.remove();
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

function hexToRgb(hex) {
  var normalized = String(hex || "#ffffff").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    normalized = "ffffff";
  }
  var number = parseInt(normalized, 16);
  return {
    r: number >> 16 & 255,
    g: number >> 8 & 255,
    b: number & 255
  };
}
