// ============================================================
//  Latar sihir dongeng: double domain warping + debu peri.
//  Canvas WebGL sendiri di belakang dunia 3D (renderer Three transparan).
//  - setTheme(theme): palet berganti halus (TRANSITION detik)
//  - boost(): animasi dipercepat selama BOOST detik (dipakai saat ganti bab)
// ============================================================

// Preset parameter shader. "menu" = versi berkilau (layar utama), "game" = tenang (saat bermain).
export const PRESETS = {
  menu: { scale: 2.40, warp: 2.35, speed: 0.40, glow: 1.00, dust: 1.05 },
  game: { scale: 3.65, warp: 1.05, speed: 0.20, glow: 0.40, dust: 0.55 },
};
const PARAMS = ['scale', 'warp', 'speed', 'glow', 'dust'];
const TRANSITION = 1.0; // detik, perpindahan warna
const BOOST = 1.0;      // detik, percepatan saat ganti bab
const BOOST_PEAK = 7;   // kecepatan puncak = 1 + BOOST_PEAK kali normal
const FPS_CAP = 30;     // latar bergerak pelan; 30 FPS sudah halus dan menghemat GPU separuh

// Tingkat kualitas, diturunkan otomatis bila FPS halaman rendah.
// pixels: batas jumlah piksel render (lalu diregangkan CSS), dust: debu peri aktif.
const QUALITY = [
  { pixels: 900 * 520, dust: true },
  { pixels: 640 * 370, dust: true },
  { pixels: 480 * 280, dust: false },
  { pixels: 320 * 185, dust: false },
];
const LOW_FPS = 40;      // di bawah ini (rata-rata) kualitas turun satu tingkat
const SAMPLE_SEC = 2.5;  // lama jendela pengukuran
const WARMUP_SEC = 3;    // abaikan detik awal (loading model, kompilasi shader)

// Palet per bab: [deep, mid, glow, accent, dust] (RGB 0..1)
export const PALETTES = {
  // Hutan Peri Senja (preset asli)
  senja:  [[0.055, 0.035, 0.145], [0.220, 0.105, 0.415], [0.635, 0.225, 0.545], [0.380, 0.815, 0.920], [1.000, 0.870, 0.520]],
  ambar:  [[0.070, 0.040, 0.030], [0.300, 0.150, 0.075], [0.760, 0.380, 0.180], [0.980, 0.700, 0.380], [1.000, 0.880, 0.600]],
  biru:   [[0.020, 0.040, 0.140], [0.060, 0.140, 0.420], [0.180, 0.360, 0.850], [0.400, 0.850, 1.000], [0.850, 0.930, 1.000]],
  perak:  [[0.030, 0.055, 0.100], [0.100, 0.195, 0.320], [0.300, 0.450, 0.700], [0.700, 0.850, 1.000], [0.950, 0.950, 1.000]],
  rimba:  [[0.020, 0.065, 0.050], [0.060, 0.215, 0.150], [0.180, 0.520, 0.360], [0.650, 1.000, 0.550], [1.000, 0.950, 0.550]],
  mawar:  [[0.090, 0.040, 0.120], [0.320, 0.120, 0.300], [0.850, 0.380, 0.450], [1.000, 0.700, 0.550], [1.000, 0.900, 0.750]],
};

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 iResolution;
uniform float uTime;
uniform float uDust;
uniform vec3 COL_DEEP, COL_MID, COL_GLOW, COL_ACCENT, COL_DUST;

uniform float SCALE, WARP_STRENGTH, DREAM_GLOW, DUST_INTENSITY;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.53);
  return fract(p.x * p.y);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0, amp = 0.5, norm = 0.0;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amp * noise(p); norm += amp;
    p = rot * p * 2.03 + vec2(17.1, 31.7);
    amp *= 0.5;
  }
  return value / norm;
}

vec3 fairyDustLayer(vec2 uv, float densityScale, float driftSpeed, float time, float seed, float bokehFactor) {
  vec2 p = uv * densityScale;
  p.y -= time * driftSpeed;
  p.x += sin(time * 0.25 + seed * 3.1) * 0.35;
  vec2 gv = fract(p) - 0.5;
  vec2 id = floor(p);
  vec3 accum = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 cellId = id + offset;
      vec2 rnd = hash22(cellId + seed * 19.37);
      float spawn = hash21(cellId + seed * 7.13);
      if (spawn < 0.52) continue;
      float phase = rnd.x * 6.28318 + seed * 4.0;
      vec2 pos = offset + (rnd - 0.5) * 0.72;
      pos.x += sin(time * (0.75 + rnd.y * 0.85) + phase) * 0.14;
      pos.y += cos(time * (0.60 + rnd.x * 0.70) + phase * 1.3) * 0.10;
      vec2 dVec = gv - pos;
      float dist = length(dVec);
      float twinkle = 0.45 + 0.55 * sin(time * (2.2 + rnd.y * 3.4) + phase * 2.1);
      twinkle = twinkle * twinkle;
      float size = mix(0.65, 1.35, rnd.y);
      float core = exp(-dist * dist * (145.0 / (size * size)));
      float halo = exp(-dist * (7.5 / (size * bokehFactor))) * 0.34;
      float starX = exp(-abs(dVec.x) * (42.0 / size)) * exp(-abs(dVec.y) * (8.5 / size));
      float starY = exp(-abs(dVec.y) * (42.0 / size)) * exp(-abs(dVec.x) * (8.5 / size));
      float sparkle = (starX + starY) * 0.28 * smoothstep(0.62, 1.0, spawn) * twinkle;
      vec3 pCol = mix(COL_DUST, COL_ACCENT, smoothstep(0.55, 0.96, rnd.x) * 0.55);
      vec3 hotCenter = mix(pCol, vec3(1.0, 0.98, 0.94), 0.75);
      float intensity = (0.45 + 0.85 * twinkle) * smoothstep(0.52, 0.98, spawn);
      accum += hotCenter * (core * 1.15 + sparkle) * intensity;
      accum += pCol * halo * intensity;
    }
  }
  return accum;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  float minRes = min(iResolution.x, iResolution.y);
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / minRes;
  vec2 screenUV = fragCoord / iResolution.xy;
  float t = uTime;

  // Double domain warping
  vec2 p = uv * SCALE;
  vec2 q = vec2(
    fbm(p + vec2(t * 0.06, -t * 0.04)),
    fbm(p + vec2(5.2, 1.3) + vec2(-t * 0.05, t * 0.07)));
  vec2 r = vec2(
    fbm(p + WARP_STRENGTH * q + vec2(1.7, 9.2) + vec2(t * 0.11, -t * 0.08)),
    fbm(p + WARP_STRENGTH * q + vec2(8.3, 2.8) + vec2(-t * 0.09, t * 0.10)));
  vec2 silkyFold = vec2(sin(r.y * 3.8 + q.x * 2.2), cos(r.x * 3.8 - q.y * 2.2)) * (0.065 * WARP_STRENGTH);
  float f = fbm(p + WARP_STRENGTH * r + silkyFold);

  // Kabut & kilau iridescent
  vec3 mist = mix(COL_DEEP, COL_MID, smoothstep(0.18, 0.72, f));
  float qLen = length(q);
  float swirlMask = smoothstep(0.32, 0.88, r.x * 0.65 + f * 0.45);
  mist = mix(mist, COL_GLOW, swirlMask * 0.68);
  float depthValley = 1.0 - smoothstep(0.22, 0.56, r.y * 0.6 + qLen * 0.35);
  mist = mix(mist, COL_DEEP * 0.78, depthValley * 0.58);

  float ridgeA = 1.0 - abs(f * 2.0 - 1.0);
  float ridgeB = 1.0 - abs(r.x * 2.0 - 1.0);
  float ridgeGlow = pow(max(ridgeA, 0.0), 3.2) * 0.72 + pow(max(ridgeB, 0.0), 4.0) * 0.48;
  float iridPhase = f * 3.2 + r.y * 2.4 - q.x * 1.6 + t * 0.12;
  vec3 iridTint = mix(COL_ACCENT, COL_DUST, 0.5 + 0.5 * sin(iridPhase * 3.14159));
  iridTint = mix(iridTint, COL_GLOW * 1.25, 0.25 + 0.25 * cos(iridPhase * 2.1));
  mist += iridTint * ridgeGlow * 0.46 * DREAM_GLOW;
  float dreamCloud = smoothstep(0.56, 0.90, f) * smoothstep(0.35, 0.85, qLen);
  mist += mix(COL_GLOW, COL_ACCENT, 0.5) * dreamCloud * 0.28 * DREAM_GLOW;

  // 3 lapis debu peri (dimatikan di kualitas rendah)
  if (uDust > 0.5) {
  vec3 dustFar  = fairyDustLayer(uv, 6.2, 0.11, t, 1.0, 0.85) * 0.45;
  vec3 dustMid  = fairyDustLayer(uv, 3.9, 0.19, t, 2.7, 1.10) * 0.82;
  vec3 dustNear = fairyDustLayer(uv, 2.3, 0.30, t, 5.4, 1.45) * 0.65;
  mist += (dustFar + dustMid + dustNear) * DUST_INTENSITY;
  }

  // Vinyet & tone mapping lembut
  vec2 vPos = screenUV - 0.5;
  mist *= clamp(1.0 - dot(vPos, vPos) * 0.62, 0.42, 1.05);
  mist = mist / (1.0 + mist * 0.22);
  mist = pow(max(mist, vec3(0.0)), vec3(0.96));
  gl_FragColor = vec4(clamp(mist, 0.0, 1.0), 1.0);
}`;

const NAMES = ['COL_DEEP', 'COL_MID', 'COL_GLOW', 'COL_ACCENT', 'COL_DUST'];
const ease = (k) => k * k * (3 - 2 * k);
const clonePal = (p) => p.map((c) => c.slice());

/** Palet untuk tema bab: theme.sky (nama di PALETTES atau array), selain itu "senja". */
export function paletteFor(theme) {
  const s = theme?.sky;
  if (Array.isArray(s)) return s;
  return PALETTES[s] || PALETTES.senja;
}

export function createBackground(container, { reducedMotion = () => false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'bgfx';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
  const noop = { setTheme() {}, boost() {}, setPreset() {}, setEnabled() {}, quality: () => -1, canvas: null };
  if (!gl) return noop; // fallback: gradien CSS di .viewport tetap tampil

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('bgfx shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return noop;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('bgfx link:', gl.getProgramInfoLog(prog)); return noop; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'iResolution');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uCols = NAMES.map((n) => gl.getUniformLocation(prog, n));
  const uDust = gl.getUniformLocation(prog, 'uDust');
  const uParam = {
    scale: gl.getUniformLocation(prog, 'SCALE'), warp: gl.getUniformLocation(prog, 'WARP_STRENGTH'),
    glow: gl.getUniformLocation(prog, 'DREAM_GLOW'), dust: gl.getUniformLocation(prog, 'DUST_INTENSITY'),
  };

  container.prepend(canvas);

  let from = clonePal(PALETTES.senja), to = clonePal(PALETTES.senja), cur = clonePal(PALETTES.senja);
  let mixT = 1;        // 0..1 progres transisi warna
  let pFrom = { ...PRESETS.game }, pTo = { ...PRESETS.game }, pCur = { ...PRESETS.game };
  let presetT = 1;     // 0..1 progres transisi preset
  let boostT = 1;      // 0..1 progres percepatan
  let time = 18;       // sama dengan offset +18 di shader asli
  let last = performance.now();
  let sinceDraw = Infinity;
  let level = 0;
  let enabled = true;
  let raf = 0;
  // pengukur FPS seluruh halaman (dunia 3D + latar)
  let warm = 0, sampleT = 0, sampleN = 0;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    const scale = Math.min(1, Math.sqrt(QUALITY[level].pixels / (w * h)));
    const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }

  function measure(rawDt) {
    // Abaikan jeda panjang: tab tersembunyi, loading, atau debugger.
    if (document.hidden || rawDt > 0.25) { sampleT = sampleN = 0; return; }
    if (warm < WARMUP_SEC) { warm += rawDt; return; }
    sampleT += rawDt; sampleN++;
    if (sampleT < SAMPLE_SEC) return;
    const fps = sampleN / sampleT;
    sampleT = sampleN = 0;
    if (fps < LOW_FPS && level < QUALITY.length - 1) {
      level++;
      warm = WARMUP_SEC - 1; // beri jeda 1 detik sebelum mengukur lagi
      console.info(`[latar] FPS ${fps.toFixed(0)} -> kualitas turun ke tingkat ${level}`);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.1);
    last = now;
    measure(rawDt);

    const rm = reducedMotion();
    if (mixT < 1) mixT = rm ? 1 : Math.min(1, mixT + dt / TRANSITION);
    if (boostT < 1) boostT = rm ? 1 : Math.min(1, boostT + dt / BOOST);
    if (presetT < 1) presetT = rm ? 1 : Math.min(1, presetT + dt / TRANSITION);
    const pk = ease(presetT);
    for (const k of PARAMS) pCur[k] = pFrom[k] + (pTo[k] - pFrom[k]) * pk;
    // Kurva lonceng: naik lalu turun mulus dalam BOOST detik.
    const mult = boostT < 1 ? 1 + BOOST_PEAK * Math.sin(Math.PI * boostT) : 1;
    time += dt * pCur.speed * mult * (rm ? 0.15 : 1);

    // Batasi gambar ke FPS_CAP; waktu & transisi tetap dihitung tiap frame.
    sinceDraw += rawDt;
    if (sinceDraw < 1 / FPS_CAP - 0.004) return;
    sinceDraw = 0;

    resize();
    const k = ease(mixT);
    for (let i = 0; i < 5; i++) for (let c = 0; c < 3; c++) cur[i][c] = from[i][c] + (to[i][c] - from[i][c]) * k;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.uniform1f(uDust, QUALITY[level].dust ? 1 : 0);
    gl.uniform1f(uParam.scale, pCur.scale);
    gl.uniform1f(uParam.warp, pCur.warp);
    gl.uniform1f(uParam.glow, pCur.glow);
    gl.uniform1f(uParam.dust, pCur.dust);
    cur.forEach((c, i) => gl.uniform3f(uCols[i], c[0], c[1], c[2]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  raf = requestAnimationFrame(frame);

  return {
    canvas,
    setTheme(theme) {
      const next = paletteFor(theme);
      if (next.every((c, i) => c.every((v, j) => Math.abs(v - to[i][j]) < 1e-4))) return;
      from = clonePal(cur);
      to = clonePal(next);
      mixT = 0;
    },
    boost() { boostT = 0; },
    /** Ganti preset ("menu" / "game") dengan transisi halus. */
    setPreset(name, { instant = false } = {}) {
      const next = PRESETS[name];
      if (!next || PARAMS.every((k) => pTo[k] === next[k])) return;
      pFrom = instant ? { ...next } : { ...pCur }; pTo = { ...next }; presetT = instant ? 1 : 0;
    },
    /** Matikan/nyalakan latar. Saat mati: canvas disembunyikan, tidak ada render sama sekali. */
    setEnabled(on) {
      on = !!on;
      if (on === enabled) return;
      enabled = on;
      canvas.hidden = !on;
      if (on) {
        last = performance.now(); sinceDraw = Infinity; warm = 0; sampleT = sampleN = 0;
        mixT = 1; // langsung ke palet terkini
        raf = requestAnimationFrame(frame);
      } else cancelAnimationFrame(raf);
    },
    quality: () => level,
  };
}
