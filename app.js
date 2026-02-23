import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const canvas = document.getElementById("scene");
const videoEl = document.getElementById("webcam");
const gestureValueEl = document.getElementById("gestureValue");
const actionValueEl = document.getElementById("actionValue");
const modeValueEl = document.getElementById("modeValue");
const fpsValueEl = document.getElementById("fpsValue");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const startOverlayEl = document.getElementById("startOverlay");
const startBtnEl = document.getElementById("startBtn");

const isMobile = window.matchMedia("(max-width: 900px)").matches;

const SATURN_PARTICLES = isMobile ? 180000 : 360000;
const STAR_COUNT = isMobile ? 7000 : 12000;
const NEBULA_COUNT = isMobile ? 90 : 150;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030306, 0.00016);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.set(0, 0, 100);
camera.lookAt(0, 0, 0);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.24, 0.6, 0.86);
composer.addPass(bloomPass);

const ambient = new THREE.AmbientLight(0x6071a0, 0.26);
const key = new THREE.PointLight(0xffe0a8, 1.1, 1500, 1.4);
key.position.set(170, 120, 130);
const fill = new THREE.PointLight(0x5e88ff, 0.25, 1800, 1.5);
fill.position.set(-280, -120, -340);
scene.add(ambient, key, fill);

let saturnParticles;
let saturnUniforms;
let starUniforms;
let stars;
let nebula;
let planetGroup;

modeValueEl.textContent = "Ready";
actionValueEl.textContent = "点击开始体验";

function createSaturnParticles() {
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(SATURN_PARTICLES * 3);
  const colors = new Float32Array(SATURN_PARTICLES * 3);
  const sizes = new Float32Array(SATURN_PARTICLES);
  const opacities = new Float32Array(SATURN_PARTICLES);
  const orbitSpeeds = new Float32Array(SATURN_PARTICLES);
  const isRing = new Float32Array(SATURN_PARTICLES);
  const randomIds = new Float32Array(SATURN_PARTICLES);

  const bodyColors = [
    new THREE.Color("#e3dac5"),
    new THREE.Color("#c9a070"),
    new THREE.Color("#b18a59"),
    new THREE.Color("#eadfcb"),
  ];

  const colorRingC = new THREE.Color("#2c2824");
  const colorRingBInner = new THREE.Color("#ccbfa4");
  const colorRingBOuter = new THREE.Color("#ddcfbd");
  const colorCassini = new THREE.Color("#0c0b0b");
  const colorRingA = new THREE.Color("#989188");
  const colorRingF = new THREE.Color("#b7b1a6");

  const PLANET_RADIUS = 18;
  const bodyCount = Math.floor(SATURN_PARTICLES * 0.26);

  for (let i = 0; i < SATURN_PARTICLES; i += 1) {
    const j = i * 3;
    randomIds[i] = Math.random();

    if (i < bodyCount) {
      isRing[i] = 0;
      orbitSpeeds[i] = 0;

      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const shellJitter = 0.9 + Math.random() * 0.15;

      const x = PLANET_RADIUS * shellJitter * Math.sin(phi) * Math.cos(theta);
      const rawY = PLANET_RADIUS * shellJitter * Math.cos(phi);
      const z = PLANET_RADIUS * shellJitter * Math.sin(phi) * Math.sin(theta);
      const y = rawY * 0.9;

      let lat = (rawY / (PLANET_RADIUS * shellJitter) + 1) * 0.5;
      lat = clamp(lat, 0, 1);
      const bandNoise = Math.cos(lat * 42) * 0.7 + Math.cos(lat * 17 + 1.5) * 0.35;
      let colIndex = Math.floor(lat * 4 + bandNoise);
      colIndex = ((colIndex % 4) + 4) % 4;
      const c = bodyColors[colIndex];

      positions[j] = x;
      positions[j + 1] = y;
      positions[j + 2] = z;

      colors[j] = c.r;
      colors[j + 1] = c.g;
      colors[j + 2] = c.b;

      sizes[i] = 0.72 + Math.random() * 0.74;
      opacities[i] = 0.45 + Math.random() * 0.35;
    } else {
      isRing[i] = 1;

      let zoneRand = Math.random();
      let ringRadius;
      let ringColor;
      let pointSize;
      let pointAlpha;

      if (zoneRand < 0.15) {
        ringRadius = PLANET_RADIUS * (1.235 + Math.random() * (1.525 - 1.235));
        ringColor = colorRingC;
        pointSize = 0.42;
        pointAlpha = 0.16;
      } else if (zoneRand < 0.65) {
        const t = Math.random();
        ringRadius = PLANET_RADIUS * (1.525 + t * (1.95 - 1.525));
        ringColor = colorRingBInner.clone().lerp(colorRingBOuter, t);
        pointSize = 0.6 + Math.random() * 0.5;
        pointAlpha = 0.35 + Math.random() * 0.24;
      } else if (zoneRand < 0.69) {
        ringRadius = PLANET_RADIUS * (1.95 + Math.random() * (2.025 - 1.95));
        ringColor = colorCassini;
        pointSize = 0.28;
        pointAlpha = 0.04;
      } else if (zoneRand < 0.99) {
        ringRadius = PLANET_RADIUS * (2.025 + Math.random() * (2.27 - 2.025));
        ringColor = colorRingA;
        pointSize = 0.46 + Math.random() * 0.36;
        pointAlpha = 0.18 + Math.random() * 0.2;
      } else {
        ringRadius = PLANET_RADIUS * (2.32 + Math.random() * 0.02);
        ringColor = colorRingF;
        pointSize = 0.72;
        pointAlpha = 0.22;
      }

      const theta = Math.random() * Math.PI * 2;
      const x = ringRadius * Math.cos(theta);
      const z = ringRadius * Math.sin(theta);
      const thickness = ringRadius > PLANET_RADIUS * 2.3 ? 0.36 : 0.14;
      const y = (Math.random() - 0.5) * thickness;

      positions[j] = x;
      positions[j + 1] = y;
      positions[j + 2] = z;

      colors[j] = ringColor.r;
      colors[j + 1] = ringColor.g;
      colors[j + 2] = ringColor.b;

      sizes[i] = pointSize;
      opacities[i] = pointAlpha;
      orbitSpeeds[i] = 7.8 / Math.sqrt(ringRadius);
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("opacityAttr", new THREE.BufferAttribute(opacities, 1));
  geometry.setAttribute("orbitSpeed", new THREE.BufferAttribute(orbitSpeeds, 1));
  geometry.setAttribute("isRing", new THREE.BufferAttribute(isRing, 1));
  geometry.setAttribute("aRandomId", new THREE.BufferAttribute(randomIds, 1));

  saturnUniforms = {
    uTime: { value: 0 },
    uScale: { value: 1.0 },
    uSpread: { value: 0.04 },
    uRotationX: { value: 0.4 },
    uChaos: { value: 0 },
    uBrightness: { value: 0.58 },
    uPointScale: { value: renderer.getPixelRatio() },
  };

  const material = new THREE.ShaderMaterial({
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: saturnUniforms,
    transparent: true,
    vertexShader: `
      attribute float size;
      attribute vec3 customColor;
      attribute float opacityAttr;
      attribute float orbitSpeed;
      attribute float isRing;
      attribute float aRandomId;

      varying vec3 vColor;
      varying float vDist;
      varying float vOpacity;
      varying float vScaleFactor;
      varying float vIsRing;
      varying float vChaos;

      uniform float uTime;
      uniform float uScale;
      uniform float uSpread;
      uniform float uRotationX;
      uniform float uChaos;
      uniform float uPointScale;

      mat2 rotate2d(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      float hash(float n) {
        return fract(sin(n) * 43758.5453123);
      }

      void main() {
        float lod = clamp((uScale - 0.2) / 2.35, 0.0, 1.0);
        float visibilityThreshold = 0.52 + pow(lod, 1.25) * 0.44;

        if (aRandomId > visibilityThreshold) {
          gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }

        vec3 pos = position;

        if (isRing > 0.5) {
          float angleOffset = uTime * orbitSpeed * 0.19;
          vec2 rotatedXZ = rotate2d(angleOffset) * pos.xz;
          pos.x = rotatedXZ.x;
          pos.z = rotatedXZ.y;
          vec2 radial = normalize(pos.xz + vec2(0.0001));
          pos.x += radial.x * uSpread * (0.45 + aRandomId);
          pos.z += radial.y * uSpread * (0.45 + aRandomId);
          pos.y += (hash(aRandomId * 91.0) - 0.5) * uSpread * 0.22;
        } else {
          float bodyAngle = uTime * 0.026;
          vec2 rotatedXZ = rotate2d(bodyAngle) * pos.xz;
          pos.x = rotatedXZ.x;
          pos.z = rotatedXZ.y;
          vec3 radial = normalize(pos + vec3(0.0001));
          pos += radial * (uSpread * 0.32 * (0.35 + aRandomId));
        }

        float cx = cos(uRotationX);
        float sx = sin(uRotationX);
        float ry = pos.y * cx - pos.z * sx;
        float rz = pos.y * sx + pos.z * cx;
        pos.y = ry;
        pos.z = rz;

        vec4 mvPosition = modelViewMatrix * vec4(pos * uScale, 1.0);
        float dist = -mvPosition.z;
        vDist = dist;

        float chaosIntensity = uChaos * smoothstep(26.0, 7.0, dist);
        if (chaosIntensity > 0.001 && dist > 0.1) {
          float hf = uTime * 34.0;
          float noiseX = sin(hf + pos.x * 9.0) * hash(pos.y + aRandomId);
          float noiseY = cos(hf + pos.y * 8.0) * hash(pos.x + aRandomId * 2.0);
          float noiseZ = sin(hf * 0.7 + pos.z * 7.0) * hash(pos.z + aRandomId * 3.0);
          vec3 noiseVec = vec3(noiseX, noiseY, noiseZ) * chaosIntensity * mix(0.8, 2.2, isRing);
          mvPosition.xyz += noiseVec;
        }

        gl_Position = projectionMatrix * mvPosition;

        float pointSize = size * (280.0 / max(dist, 0.1));
        if (isRing < 0.5 && dist < 65.0) {
          pointSize *= 0.76;
        }

        gl_PointSize = clamp(pointSize * uPointScale, 0.0, 36.0);

        vColor = customColor;
        vOpacity = opacityAttr;
        vScaleFactor = uScale;
        vIsRing = isRing;
        vChaos = chaosIntensity;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vDist;
      varying float vOpacity;
      varying float vScaleFactor;
      varying float vIsRing;
      varying float vChaos;

      uniform float uBrightness;

      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float r = dot(cxy, cxy);
        if (r > 1.0) discard;

        float glow = smoothstep(1.0, 0.3, r);

        float t = clamp((vScaleFactor - 0.2) / 2.35, 0.0, 1.0);
        vec3 deepGold = vec3(0.28, 0.19, 0.07);
        vec3 baseColor = mix(deepGold, vColor, smoothstep(0.12, 0.92, t));

        float brightness = (0.32 + 0.95 * t) * uBrightness;
        float density = mix(0.22, 0.72, smoothstep(0.0, 0.58, t));

        vec3 finalColor = baseColor * brightness;

        if (vDist < 48.0) {
          float closeMix = 1.0 - (vDist / 48.0);
          if (vIsRing < 0.5) {
            vec3 deepTex = pow(vColor, vec3(1.35)) * 1.35;
            finalColor = mix(finalColor, deepTex, closeMix * 0.7);
          } else {
            finalColor += vec3(0.09, 0.08, 0.07) * closeMix;
          }
        }

        finalColor += vec3(0.16, 0.2, 0.26) * vChaos * 0.22;

        float depthAlpha = 1.0;
        if (vDist < 12.0) {
          depthAlpha = smoothstep(0.0, 12.0, vDist);
        }

        float alpha = glow * vOpacity * density * depthAlpha;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
  });

  saturnParticles = new THREE.Points(geometry, material);
  saturnParticles.rotation.z = THREE.MathUtils.degToRad(26.73);
  scene.add(saturnParticles);
}

function createStars() {
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(STAR_COUNT * 3);
  const starCols = new Float32Array(STAR_COUNT * 3);
  const starSizes = new Float32Array(STAR_COUNT);

  const palette = [
    new THREE.Color("#a7bcff"),
    new THREE.Color("#ffffff"),
    new THREE.Color("#ffcc87"),
    new THREE.Color("#f9f1e0"),
  ];

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const z = -(420 + Math.random() * 3000);
    const spread = 260 + Math.abs(z) * 0.42;
    const x = (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * spread * 0.62;

    const j = i * 3;
    starPos[j] = x;
    starPos[j + 1] = y;
    starPos[j + 2] = z;

    const c = palette[Math.floor(Math.random() * palette.length)];
    starCols[j] = c.r;
    starCols[j + 1] = c.g;
    starCols[j + 2] = c.b;

    starSizes[i] = 0.8 + Math.random() * 2.0;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("customColor", new THREE.BufferAttribute(starCols, 3));
  starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

  starUniforms = {
    uTime: { value: 0 },
    uPointScale: { value: renderer.getPixelRatio() },
  };

  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float size;
      attribute vec3 customColor;
      varying vec3 vColor;
      uniform float uPointScale;

      void main() {
        vColor = customColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(-mvPosition.z, 0.1);
        float psize = size * (760.0 / dist);
        gl_PointSize = clamp(psize * uPointScale, 0.3, 3.8);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uTime;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float r = dot(cxy, cxy);
        if (r > 1.0) discard;

        float noise = random(gl_FragCoord.xy);
        float twinkle = 0.82 + 0.18 * sin(uTime * 1.9 + noise * 8.0);

        float glow = pow(1.0 - r, 1.6);
        gl_FragColor = vec4(vColor * twinkle, glow * 0.65);
      }
    `,
  });

  stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const nebGeo = new THREE.BufferGeometry();
  const nebPos = new Float32Array(NEBULA_COUNT * 3);
  const nebCols = new Float32Array(NEBULA_COUNT * 3);
  const nebSizes = new Float32Array(NEBULA_COUNT);

  for (let i = 0; i < NEBULA_COUNT; i += 1) {
    const z = -(760 + Math.random() * 2300);
    const spread = 420 + Math.abs(z) * 0.35;
    const x = (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * spread * 0.45;

    const j = i * 3;
    nebPos[j] = x;
    nebPos[j + 1] = y;
    nebPos[j + 2] = z;

    const c = new THREE.Color().setHSL(0.58 + Math.random() * 0.22, 0.72, 0.1);
    nebCols[j] = c.r;
    nebCols[j + 1] = c.g;
    nebCols[j + 2] = c.b;

    nebSizes[i] = 300 + Math.random() * 500;
  }

  nebGeo.setAttribute("position", new THREE.BufferAttribute(nebPos, 3));
  nebGeo.setAttribute("customColor", new THREE.BufferAttribute(nebCols, 3));
  nebGeo.setAttribute("size", new THREE.BufferAttribute(nebSizes, 1));

  const nebMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPointScale: { value: renderer.getPixelRatio() },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 customColor;
      varying vec3 vColor;
      uniform float uPointScale;

      void main() {
        vColor = customColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(-mvPosition.z, 0.1);
        gl_PointSize = clamp(size * (900.0 / dist) * uPointScale, 8.0, 55.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float r = dot(cxy, cxy);
        if (r > 1.0) discard;

        float glow = pow(1.0 - r, 2.25);
        gl_FragColor = vec4(vColor, glow * 0.075);
      }
    `,
  });

  nebula = new THREE.Points(nebGeo, nebMat);
  scene.add(nebula);
}

function createBackgroundPlanets() {
  planetGroup = new THREE.Group();
  scene.add(planetGroup);

  const vertex = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vView = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragment = `
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float noiseScale;
    uniform vec3 lightDir;
    uniform float atmosphere;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vView;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 st) {
      float value = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amp * noise(st);
        st *= 2.0;
        amp *= 0.5;
      }
      return value;
    }

    void main() {
      float n = fbm(vUv * noiseScale);
      vec3 albedo = mix(color1, color2, n);

      vec3 nrm = normalize(vNormal);
      vec3 l = normalize(lightDir);
      float diff = max(dot(nrm, l), 0.06);

      vec3 viewDir = normalize(vView);
      float fresnel = pow(1.0 - max(dot(viewDir, nrm), 0.0), 3.0);

      vec3 finalColor = albedo * diff + atmosphere * vec3(0.45, 0.58, 1.0) * fresnel;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function addPlanet(c1, c2, nScale, pos, radius, atmo) {
    const geo = new THREE.SphereGeometry(radius, 38, 38);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(c1) },
        color2: { value: new THREE.Color(c2) },
        noiseScale: { value: nScale },
        lightDir: { value: new THREE.Vector3(1, 0.4, 1) },
        atmosphere: { value: atmo },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    planetGroup.add(mesh);
  }

  addPlanet("#b43c0a", "#d36a30", 7.5, new THREE.Vector3(-310, 125, -450), 10, 0.26);
  addPlanet("#001f4f", "#ffffff", 5.2, new THREE.Vector3(360, -110, -620), 14, 0.56);
  addPlanet("#616161", "#adadad", 12.0, new THREE.Vector3(-180, -210, -360), 6, 0.1);
}

createSaturnParticles();
createStars();
createBackgroundPlanets();

let stableGesture = "none";
let candidateGesture = "none";
let candidateFrames = 0;
let handSeenAt = 0;
let isHandDetected = false;
let lastHand = null;
let handsStarted = false;

let targetScale = 1.0;
let currentScale = 1.0;
let targetSpread = 0.04;
let currentSpread = 0.04;
let targetRotX = 0.4;
let currentRotX = 0.4;
let targetSpinBoost = 0;
let currentSpinBoost = 0;
let targetWarp = 1.0;
let currentWarp = 1.0;
let targetBrightness = 0.58;
let currentBrightness = 0.58;
let chaosKick = 0;
let chaosCurrent = 0;

let cinematicMode = false;
let hyperUntil = 0;
let autoIdle = 0;

let fpsFrames = 0;
let fpsLast = performance.now();

const gestureCalib = {
  openMin: Number.POSITIVE_INFINITY,
  openMax: Number.NEGATIVE_INFINITY,
  pinchMin: Number.POSITIVE_INFINITY,
  pinchMax: Number.NEGATIVE_INFINITY,
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function fingerExtended(lm, tip, pip, wrist = 0) {
  return dist(lm[tip], lm[wrist]) > dist(lm[pip], lm[wrist]) * 1.08;
}

function adaptiveNormalize(value, minKey, maxKey, lowPad = 0.18, highPad = 0.12) {
  if (!Number.isFinite(gestureCalib[minKey])) {
    gestureCalib[minKey] = value;
    gestureCalib[maxKey] = value;
  }

  gestureCalib[minKey] = Math.min(gestureCalib[minKey], value);
  gestureCalib[maxKey] = Math.max(gestureCalib[maxKey], value);

  const adapt = 0.0025;
  gestureCalib[minKey] += (value - gestureCalib[minKey]) * adapt;
  gestureCalib[maxKey] += (value - gestureCalib[maxKey]) * adapt;

  const range = Math.max(0.08, gestureCalib[maxKey] - gestureCalib[minKey]);
  const low = gestureCalib[minKey] + range * lowPad;
  const high = gestureCalib[maxKey] - range * highPad;
  return clamp((value - low) / Math.max(0.06, high - low), 0, 1);
}

function readMetrics(lm) {
  const palm = dist(lm[0], lm[9]) + 1e-5;

  const idxExt = fingerExtended(lm, 8, 6);
  const midExt = fingerExtended(lm, 12, 10);
  const ringExt = fingerExtended(lm, 16, 14);
  const pinkyExt = fingerExtended(lm, 20, 18);

  const thumbReach = dist(lm[4], lm[0]) / (dist(lm[2], lm[0]) + 1e-5);
  const thumbExt = thumbReach > 1.05;

  const opennessRaw = clamp(
    ((dist(lm[8], lm[0]) + dist(lm[12], lm[0]) + dist(lm[16], lm[0]) + dist(lm[20], lm[0])) / (4 * palm) - 0.9) / 0.95,
    0,
    1
  );

  const pinchRaw = dist(lm[4], lm[8]) / palm;

  return {
    idxExt,
    midExt,
    ringExt,
    pinkyExt,
    thumbExt,
    opennessRaw,
    pinchRaw,
    pointerX: lm[8].x,
    pointerY: lm[8].y,
    palmY: lm[9].y,
    palmX: lm[9].x,
  };
}

function classify(metrics) {
  if (metrics.pinchRaw < 0.45 && metrics.midExt && metrics.ringExt && metrics.pinkyExt) return "ok";
  if (metrics.pinchRaw < 0.58 && (metrics.thumbExt || metrics.idxExt)) return "pinch";
  if (metrics.thumbExt && metrics.idxExt && !metrics.midExt && !metrics.ringExt && !metrics.pinkyExt) return "lshape";
  if (metrics.idxExt && metrics.midExt && metrics.ringExt && metrics.pinkyExt && metrics.thumbExt && metrics.openness > 0.72) return "open";
  if (metrics.idxExt && metrics.midExt && !metrics.ringExt && !metrics.pinkyExt) return "victory";
  if (metrics.idxExt && !metrics.midExt && !metrics.ringExt && metrics.pinkyExt) return "rock";
  if (metrics.idxExt && !metrics.midExt && !metrics.ringExt && !metrics.pinkyExt) return "point";
  if (metrics.idxExt && metrics.midExt && metrics.ringExt && !metrics.pinkyExt) return "trident";
  if (!metrics.idxExt && !metrics.midExt && !metrics.ringExt && !metrics.pinkyExt && metrics.openness < 0.34) return "fist";
  return "none";
}

function onGestureEnter(gesture, now) {
  if (gesture === "victory") {
    cinematicMode = !cinematicMode;
  }
  if (gesture === "trident") {
    hyperUntil = now + 2500;
  }
  if (gesture === "fist") {
    chaosKick = 1.0;
  }
}

function updateStableGesture(rawGesture, now) {
  if (rawGesture === candidateGesture) {
    candidateFrames += 1;
  } else {
    candidateGesture = rawGesture;
    candidateFrames = 1;
  }

  if (candidateFrames >= 3 && stableGesture !== candidateGesture) {
    stableGesture = candidateGesture;
    onGestureEnter(stableGesture, now);
  }
}

const GESTURE_LABELS = {
  none: "None",
  open: "Open",
  pinch: "Pinch",
  fist: "Fist",
  point: "Point",
  lshape: "L",
  victory: "Victory",
  trident: "Trident",
  ok: "OK",
  rock: "Rock",
};

function applyGesture(g, m, now) {
  if (g === "open") {
    targetScale = lerp(1.05, 2.38, m.openness);
    targetSpread = lerp(0.04, 1.05, m.openness);
    targetSpinBoost = 0;
    targetRotX = lerp(-0.3, 0.65, 1 - m.palmY);
    targetWarp = lerp(1.0, 1.2, m.openness);
    targetBrightness = lerp(0.54, 0.92, m.openness);
    actionValueEl.textContent = "张掌: 放大+扩散";
    return;
  }

  if (g === "pinch") {
    const t = m.pinchNorm;
    targetScale = lerp(0.58, 2.18, t);
    targetSpread = lerp(0.02, 0.78, t);
    targetSpinBoost = 0;
    targetRotX = lerp(-0.2, 0.6, 1 - m.palmY);
    targetWarp = lerp(1.18, 0.92, t);
    targetBrightness = lerp(0.86, 0.34, t);
    actionValueEl.textContent = "捏合: 缩小";
    return;
  }

  if (g === "fist") {
    chaosKick = 1.0;
    targetScale = 1.95;
    targetSpread = 1.18;
    targetSpinBoost = 0.25;
    targetWarp = 1.35;
    targetBrightness = 0.86;
    actionValueEl.textContent = "握拳: 混沌";
    return;
  }

  if (g === "point") {
    targetRotX = lerp(-0.62, 0.9, 1 - m.pointerY);
    targetSpinBoost = 0;
    targetScale = clamp(targetScale, 0.55, 1.8);
    targetSpread = clamp(targetSpread, 0.03, 0.42);
    targetWarp = 1.0;
    actionValueEl.textContent = "单指: 倾角";
    return;
  }

  if (g === "lshape") {
    targetScale = clamp(targetScale, 0.8, 2.0);
    targetSpread = clamp(targetSpread, 0.05, 0.7);
    targetSpinBoost = lerp(1.2, -1.2, m.palmX);
    targetRotX = lerp(-0.2, 0.6, 1 - m.palmY);
    targetWarp = 1.08;
    actionValueEl.textContent = "L手势: 旋转环带";
    return;
  }

  if (g === "victory") {
    targetSpinBoost = 0;
    actionValueEl.textContent = cinematicMode ? "V: 电影机位" : "V: 手动机位";
    return;
  }

  if (g === "trident") {
    targetWarp = 2.0;
    targetSpread = 0.52;
    targetSpinBoost = 0.8;
    targetBrightness = 0.9;
    actionValueEl.textContent = "三指: 跃迁";
    return;
  }

  if (g === "ok") {
    targetScale = 1.0;
    targetSpread = 0.03;
    targetSpinBoost = 0;
    targetWarp = 0.95;
    targetBrightness = 0.62;
    actionValueEl.textContent = "OK: 稳定轨道";
    return;
  }

  if (g === "rock") {
    targetScale = 1.45;
    targetSpread = 0.32;
    targetSpinBoost = 1.1;
    targetWarp = 1.58;
    targetBrightness = 0.74;
    actionValueEl.textContent = "摇滚: 环旋加速";
    return;
  }

  if (now - handSeenAt < 700) {
    actionValueEl.textContent = "自由手势";
  }
}

function initHands() {
  if (handsStarted) return;
  handsStarted = true;

  if (!window.Hands || !window.Camera) {
    modeValueEl.textContent = "MediaPipe Missing";
    return;
  }

  const hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.64,
    minTrackingConfidence: 0.6,
  });

  hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lm = results.multiHandLandmarks[0];
      const now = performance.now();
      handSeenAt = now;
      isHandDetected = true;
      lastHand = lm;

      const metrics = readMetrics(lm);
      metrics.openness = adaptiveNormalize(metrics.opennessRaw, "openMin", "openMax", 0.2, 0.12);
      metrics.pinchNorm = adaptiveNormalize(metrics.pinchRaw, "pinchMin", "pinchMax", 0.18, 0.14);
      const raw = classify(metrics);
      updateStableGesture(raw, now);
      applyGesture(stableGesture, metrics, now);

      gestureValueEl.textContent = GESTURE_LABELS[stableGesture] || "None";
      return;
    }

    isHandDetected = false;
    lastHand = null;
  });

  const cam = new window.Camera(videoEl, {
    width: isMobile ? 360 : 640,
    height: isMobile ? 270 : 480,
    onFrame: async () => {
      await hands.send({ image: videoEl });
    },
  });

  cam
    .start()
    .then(() => {
      modeValueEl.textContent = "Camera Live";
      actionValueEl.textContent = "等待手势";
    })
    .catch(() => {
      modeValueEl.textContent = "Camera Blocked";
      actionValueEl.textContent = "摄像头权限";
    });
}

function startExperience() {
  if (startOverlayEl) {
    startOverlayEl.classList.add("hidden");
  }

  actionValueEl.textContent = "初始化中";
  modeValueEl.textContent = "Starting";
  initHands();
}

if (startBtnEl) {
  startBtnEl.addEventListener("click", startExperience);
}

fullscreenBtn.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    return;
  }
  await document.exitFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  fullscreenBtn.textContent = document.fullscreenElement ? "退出全屏" : "全屏沉浸";
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  const pr = renderer.getPixelRatio();
  saturnUniforms.uPointScale.value = pr;
  starUniforms.uPointScale.value = pr;
});

let lastFrame = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  const elapsed = now * 0.001;

  if (!isHandDetected || now - handSeenAt > 1400) {
    autoIdle += dt * 0.95;
    targetScale = 0.9 + Math.sin(autoIdle) * 0.2;
    targetSpread = 0.05 + Math.sin(autoIdle * 0.9) * 0.03;
    targetSpinBoost = 0;
    targetRotX = 0.3 + Math.sin(autoIdle * 0.33) * 0.18;
    targetWarp = 1.0;
    targetBrightness = 0.5 + Math.sin(autoIdle * 0.4) * 0.08;

    stableGesture = "none";
    candidateGesture = "none";
    candidateFrames = 0;
    gestureCalib.openMin = Number.POSITIVE_INFINITY;
    gestureCalib.openMax = Number.NEGATIVE_INFINITY;
    gestureCalib.pinchMin = Number.POSITIVE_INFINITY;
    gestureCalib.pinchMax = Number.NEGATIVE_INFINITY;
    gestureValueEl.textContent = "None";
    actionValueEl.textContent = "自动巡航";
    modeValueEl.textContent = "Auto";
  } else {
    modeValueEl.textContent = cinematicMode ? "Cinematic" : "Manual";
  }

  if (now < hyperUntil) {
    targetWarp = Math.max(targetWarp, 2.05);
    chaosKick = Math.max(chaosKick, 0.34);
  }

  currentScale += (targetScale - currentScale) * 0.11;
  currentSpread += (targetSpread - currentSpread) * 0.12;
  currentSpinBoost += (targetSpinBoost - currentSpinBoost) * 0.12;
  currentRotX += (targetRotX - currentRotX) * 0.1;
  currentWarp += (targetWarp - currentWarp) * 0.08;
  currentBrightness += (targetBrightness - currentBrightness) * 0.11;

  chaosKick *= 0.91;
  const scaleChaos = smoothstep(1.95, 2.45, currentScale);
  const chaosTarget = clamp(scaleChaos + chaosKick, 0, 1);
  chaosCurrent += (chaosTarget - chaosCurrent) * 0.16;

  let camXTarget = 0;
  let camYTarget = 0;
  let camZTarget = lerp(110, 56, smoothstep(0.2, 2.5, currentScale));

  if (cinematicMode) {
    const c = elapsed * 0.17;
    camXTarget = Math.sin(c) * 18;
    camYTarget = Math.sin(c * 0.63) * 8;
    camZTarget += Math.cos(c) * 4;
  } else if (lastHand) {
    camXTarget = lerp(7, -7, lastHand[9].x);
    camYTarget = lerp(8, -5, lastHand[9].y);
  }

  camera.position.x += (camXTarget - camera.position.x) * 0.06;
  camera.position.y += (camYTarget - camera.position.y) * 0.06;
  camera.position.z += (camZTarget - camera.position.z) * 0.07;
  camera.lookAt(0, 0, 0);

  saturnUniforms.uTime.value = elapsed * currentWarp;
  saturnUniforms.uScale.value = currentScale;
  saturnUniforms.uSpread.value = currentSpread;
  saturnUniforms.uRotationX.value = currentRotX;
  saturnUniforms.uChaos.value = chaosCurrent;
  saturnUniforms.uBrightness.value = currentBrightness;

  starUniforms.uTime.value = elapsed;

  if (stars) stars.rotation.y = elapsed * 0.004;
  if (nebula) nebula.rotation.y = elapsed * 0.002;
  if (planetGroup) {
    for (let i = 0; i < planetGroup.children.length; i += 1) {
      planetGroup.children[i].rotation.y = elapsed * (0.04 + i * 0.02);
    }
    planetGroup.rotation.y = Math.sin(elapsed * 0.05) * 0.03;
  }

  saturnParticles.rotation.y += dt * (0.03 + 0.1 * chaosCurrent + currentSpinBoost * 0.22);

  const exposure = clamp(0.34 + currentBrightness * 0.56, 0.28, 1.05);
  renderer.toneMappingExposure = exposure;

  key.intensity = lerp(0.8, 1.9, currentBrightness);
  fill.intensity = lerp(0.14, 0.42, currentBrightness);

  bloomPass.threshold = lerp(0.92, 0.8, currentBrightness);
  bloomPass.radius = lerp(0.5, 0.72, currentBrightness);
  bloomPass.strength = clamp(0.08 + currentBrightness * 0.34 + chaosCurrent * 0.18, 0.08, 0.62);

  fpsFrames += 1;
  if (now - fpsLast > 600) {
    const fps = (fpsFrames * 1000) / (now - fpsLast);
    fpsValueEl.textContent = `${fps.toFixed(0)}`;
    fpsFrames = 0;
    fpsLast = now;

    if (fps < 26 && renderer.getPixelRatio() > 1) {
      renderer.setPixelRatio(1);
      composer.setPixelRatio(1);
      saturnUniforms.uPointScale.value = 1;
      starUniforms.uPointScale.value = 1;
    }
  }

  composer.render();
}

requestAnimationFrame(animate);
