import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { LEVELS } from './levels.js';
import { initUI } from './ui.js';
import { BLOCK_INFO } from './blocks-info.js';
import { CREDITS, TEAM } from './credits.js';
import { createBackground } from './bgfx.js';
import {
  initSaves, store, load, remove as removeSaved, activeSlot, setActiveSlot, touch, SLOT_COUNT,
  slotInfo, clearSlot, exportSlot, parseSaveFile, importInto,
} from './saves.js';
import { createEditor, newDraft, draftToLevel, encodeDraft, decodeDraft } from './editor.js';
import { World, DIRS, CONDITIONS } from './world.js';
import { interpret, LimitError, fromCompact, newId, bumpId, childLists, countBlocks } from './interpreter.js';
import {
  GAME_TITLE, SPEAKERS, PROLOG, EPILOG, EPILOG_MOODS, STAGE_INTRO, HINTS, FAIL_LINES, WIN_LINES, EFFECT_LINES,
} from './story.js';
import { MODELS, TEXTURES } from './assets-config.js';

initSaves(); // pilih slot aktif & migrasi data lama, sebelum ada yang membaca simpanan

// Konfigurasi model 3D & tekstur papan berada di js/assets-config.js
const KNIGHT_MODEL = MODELS.knight;
const PRINCESS_MODEL = MODELS.princess;
const MONSTER_MODEL = MODELS.monster;
const GOLEM_MODEL = MODELS.golem;

const H = 0.5; // tinggi lantai

// ------------------------------------------------------------
//  Three.js setup
// ------------------------------------------------------------
const viewport = document.getElementById('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.prepend(renderer.domElement);
// Latar shader sihir di belakang dunia 3D (diatur per tema bab).
const bgfx = createBackground(viewport, { reducedMotion: () => document.body.classList.contains('rm') });

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.panSpeed = 0.85;
controls.enableDamping = true;
controls.minZoom = 0.6;
controls.maxZoom = 3;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI * 0.42;

const CAM_DEFAULT_TARGET = new THREE.Vector3(0, 0.4, 0);
const CAM_DEFAULT_POS = new THREE.Vector3(10, 10, 10);
const CAM_DEFAULT_ZOOM = 1;
let panBounds = { x: 3.5, z: 3.5 };
let camResetAnim = null;
const camKeys = new Set();
const _camFwd = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3(0, 1, 0);

function clampCameraTarget() {
  const tx = THREE.MathUtils.clamp(controls.target.x, -panBounds.x, panBounds.x);
  const ty = CAM_DEFAULT_TARGET.y;
  const tz = THREE.MathUtils.clamp(controls.target.z, -panBounds.z, panBounds.z);
  const dx = tx - controls.target.x;
  const dy = ty - controls.target.y;
  const dz = tz - controls.target.z;
  if (dx || dy || dz) {
    controls.target.set(tx, ty, tz);
    camera.position.x += dx;
    camera.position.y += dy;
    camera.position.z += dz;
  }
}

function resetCameraView({ instant = false } = {}) {
  if (instant || document.body.classList.contains('rm')) {
    camResetAnim = null;
    controls.target.copy(CAM_DEFAULT_TARGET);
    camera.position.copy(CAM_DEFAULT_POS);
    camera.zoom = CAM_DEFAULT_ZOOM;
    camera.updateProjectionMatrix();
    controls.update();
    return;
  }
  camResetAnim = {
    elapsed: 0,
    duration: 0.35,
    fromTarget: controls.target.clone(),
    fromPos: camera.position.clone(),
    fromZoom: camera.zoom,
  };
}
controls.addEventListener('start', () => { camResetAnim = null; });

const hemi = new THREE.HemisphereLight(0xd8f0ee, 0x0a1d20, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(-5, 12, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
sun.shadow.bias = -0.0008;
scene.add(sun);
const lantern = new THREE.PointLight(0xffc080, 6, 4.5, 1.6); // cahaya kecil di sekitar kesatria
scene.add(lantern);

let fit = { hw: 5, hh: 3 };
// Dunia 3D penuh layar, tapi papan dipusatkan di area yang tidak tertutup panel & bar atas.
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  const panel = document.querySelector('.code-panel');
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const desktop = window.innerWidth > 900;
  const coverX = desktop && panel ? panel.offsetWidth + rem * 2 : 0; // panel kanan
  const coverY = desktop ? rem * 4.5 : rem * 3.5; // bar atas
  const visW = Math.max(240, w - coverX), visH = Math.max(200, h - coverY);
  const v = Math.max(fit.hh * (h / visH), (fit.hw / (visW / visH)) * (h / visH));
  const aspect = w / h;
  const dx = (coverX / 2 / w) * (2 * v * aspect);
  const dy = (coverY / 2 / h) * (2 * v);
  camera.left = -v * aspect + dx; camera.right = v * aspect + dx;
  camera.top = v + dy; camera.bottom = -v + dy;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
window.addEventListener('resize', resize);

// ------------------------------------------------------------
//  State game
// ------------------------------------------------------------
let stage = LEVELS[0];
let world = new World(stage);
const board = new THREE.Group();
scene.add(board);
const parts = { bridges: new Map(), gates: new Map(), levers: new Map(), spikes: new Map(), monsters: [] };

const worldX = (x) => x - (world.def.W - 1) / 2;
const worldZ = (z) => z - (world.def.D - 1) / 2;
const angleFor = (dir) => Math.atan2(DIRS[dir][0], DIRS[dir][1]);
const key = (x, z) => `${x},${z}`;

// ------------------------------------------------------------
//  Board
// ------------------------------------------------------------
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const lighten = (hex, l) => new THREE.Color(hex).offsetHSL(0, 0, l);

const textureLoader = new THREE.TextureLoader();
const texCache = new Map();
const cachedTextures = new Set();

function resolveTexSlot(spec) {
  if (!spec) return null;
  if (typeof spec === 'string') return { url: spec };
  return spec.url ? spec : null;
}

function loadBoardTexture(spec) {
  const { url, repeat } = spec;
  const cacheKey = `${url}|${Array.isArray(repeat) ? repeat.join(',') : ''}`;
  if (!texCache.has(cacheKey)) {
    const tex = textureLoader.load(
      url,
      undefined,
      undefined,
      (err) => console.error('Gagal memuat tekstur papan:', url, err),
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (Array.isArray(repeat)) tex.repeat.set(repeat[0] ?? 1, repeat[1] ?? 1);
    cachedTextures.add(tex);
    texCache.set(cacheKey, tex);
  }
  return texCache.get(cacheKey);
}

function texturedStd(fallbackColor, texSpec, extra = {}) {
  const slot = resolveTexSlot(texSpec);
  if (!slot) return std(fallbackColor, extra);
  const map = loadBoardTexture(slot);
  const color = slot.tint === 'theme' ? fallbackColor : (slot.tint ?? 0xffffff);
  return std(color, { ...extra, map });
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.userData?.fromModelCache) return;
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => {
      if (m.map && m.map !== zzTexture && !cachedTextures.has(m.map)) m.map.dispose();
      m.dispose();
    });
  });
  g.clear();
}

let zzTexture = null;
function getZzTexture() {
  if (zzTexture) return zzTexture;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 44px Nunito, sans-serif';
  g.fillStyle = '#cfe3ff';
  g.fillText('z', 18, 52); g.font = 'bold 32px Nunito, sans-serif'; g.fillText('z', 52, 34); g.font = 'bold 22px Nunito, sans-serif'; g.fillText('z', 80, 18);
  zzTexture = new THREE.CanvasTexture(c);
  return zzTexture;
}

let boardGen = 0;
function buildBoard({ resetCamera = true } = {}) {
  boardGen++;
  disposeGroup(board);
  parts.bridges.clear(); parts.gates.clear(); parts.levers.clear(); parts.spikes.clear(); parts.monsters = [];

  const th = stage.theme;
  const tx = { ...TEXTURES.default, ...(TEXTURES.stages?.[stage.id] || {}) };
  const { W, D, cells } = world.def;
  const topM = texturedStd(lighten(th.top, 0), tx.floor), sideM = texturedStd(th.side, tx.floorSide);
  const wallTop = texturedStd(lighten(th.wall, 0.08), tx.wallTop), wallSide = texturedStd(th.wall, tx.wall);
  const edgeM = new THREE.LineBasicMaterial({ color: lighten(th.top, 0.18), transparent: true, opacity: 0.4 });
  const waterM = texturedStd(th.river || '#2d6cdf', tx.water, { emissive: th.river || '#2d6cdf', emissiveIntensity: 0.18, transparent: true, opacity: 0.85, roughness: 0.3 });
  const bedM = std(lighten(th.side, -0.05));
  const metalM = texturedStd(0xc8ccd2, tx.metal, { metalness: 0.7, roughness: 0.35 });
  const woodM = texturedStd(0x8a5a2b, tx.wood);
  const goldM = texturedStd(0xe0b04a, tx.gold, { metalness: 0.6, roughness: 0.4 });

  const tileGeo = new THREE.BoxGeometry(1, H, 1);
  const tileEdges = new THREE.EdgesGeometry(tileGeo);
  const WALL_H = 0.85;
  const wallGeo = new THREE.BoxGeometry(1, WALL_H, 1);
  const wallEdges = new THREE.EdgesGeometry(wallGeo);

  const addTile = (x, z) => {
    const m = new THREE.Mesh(tileGeo, [sideM, sideM, topM, sideM, sideM, sideM]);
    m.position.set(worldX(x), H / 2, worldZ(z));
    m.castShadow = m.receiveShadow = true;
    m.add(new THREE.LineSegments(tileEdges, edgeM));
    board.add(m);
  };
  const addWater = (x, z) => {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 1), bedM);
    bed.position.set(worldX(x), 0.06, worldZ(z));
    bed.receiveShadow = true;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), waterM);
    w.rotation.x = -Math.PI / 2;
    w.position.set(worldX(x), 0.28, worldZ(z));
    w.userData.water = true;
    board.add(bed, w);
  };

  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const c = cells[z][x];
      const wx = worldX(x), wz = worldZ(z);
      if (c.kind === 'hole') continue;
      if (c.kind === 'wall') {
        const m = new THREE.Mesh(wallGeo, [wallSide, wallSide, wallTop, wallSide, wallSide, wallSide]);
        m.position.set(wx, WALL_H / 2, wz);
        m.castShadow = m.receiveShadow = true;
        m.add(new THREE.LineSegments(wallEdges, edgeM));
        board.add(m);
        continue;
      }
      if (c.kind === 'river' || c.kind === 'bridge') {
        addWater(x, z);
        if (c.kind === 'bridge') {
          const plank = new THREE.Group();
          for (let i = -1; i <= 1; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.96), woodM);
            p.position.x = i * 0.31;
            p.castShadow = p.receiveShadow = true;
            plank.add(p);
          }
          plank.position.set(wx, 0.05, wz);
          plank.userData = { yOpen: H - 0.05, yClosed: -0.1 };
          plank.userData.target = plank.userData.yClosed;
          board.add(plank);
          if (!parts.bridges.has(c.id)) parts.bridges.set(c.id, []);
          parts.bridges.get(c.id).push(plank);
        }
        continue;
      }
      addTile(x, z);

      if (c.kind === 'spikes') {
        const g = new THREE.Group();
        for (const [ox, oz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, 0]]) {
          const s = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), metalM);
          s.position.set(ox, 0.15, oz);
          s.castShadow = true;
          g.add(s);
        }
        g.position.set(wx, H, wz);
        board.add(g);
        parts.spikes.set(key(x, z), g);
      }
      if (c.kind === 'gate') {
        const g = new THREE.Group();
        for (let i = -2; i <= 2; i++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.07), metalM);
          bar.position.set(i * 0.2, 0.55, 0);
          bar.castShadow = true;
          g.add(bar);
        }
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.09), metalM);
        cross.position.y = 0.85;
        g.add(cross);
        // orientasi palang tegak lurus arah lewat
        const open = (dx, dz) => cells[z + dz]?.[x + dx] && cells[z + dz][x + dx].kind !== 'wall';
        if (open(0, -1) || open(0, 1)) g.rotation.y = 0; else g.rotation.y = Math.PI / 2;
        g.position.set(wx, H, wz);
        g.userData = { yOpen: H - 1.15, yClosed: H, target: H };
        board.add(g);
        if (!parts.gates.has(c.id)) parts.gates.set(c.id, []);
        parts.gates.get(c.id).push(g);
      }
      if (c.lever) {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.22), std(0x3a3a3a));
        base.position.y = 0.05;
        const pivot = new THREE.Group();
        pivot.position.y = 0.1;
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42), metalM);
        stick.position.y = 0.21;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06), std(0xd03a3a));
        knob.position.y = 0.43;
        pivot.add(stick, knob);
        pivot.rotation.z = 0.6;
        pivot.userData.target = 0.6;
        g.add(base, pivot);
        g.position.set(wx + 0.28, H, wz - 0.28);
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        board.add(g);
        if (!parts.levers.has(c.lever)) parts.levers.set(c.lever, []);
        parts.levers.get(c.lever).push(pivot);
      }
      if (c.exit) {
        const g = new THREE.Group();
        const postGeo = new THREE.BoxGeometry(0.1, 1.0, 0.1);
        const l = new THREE.Mesh(postGeo, goldM); l.position.set(-0.4, 0.5, 0);
        const r = new THREE.Mesh(postGeo, goldM); r.position.set(0.4, 0.5, 0);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.12), goldM); top.position.y = 1.0;
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.7, 0.92),
          new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
        );
        glow.position.y = 0.48;
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.7), std(0xffe08a, { emissive: 0xffc040, emissiveIntensity: 0.8 }));
        pad.position.y = 0.015;
        g.add(l, r, top, glow, pad);
        g.traverse((o) => { if (o.isMesh && o !== glow) o.castShadow = true; });
        // gerbang menghadap petak yang bisa dilewati
        const nb = [[1, 0], [-1, 0]].some(([dx, dz]) => { const n = cells[z + dz]?.[x + dx]; return n && n.kind !== 'wall' && n.kind !== 'river'; });
        g.rotation.y = nb ? Math.PI / 2 : 0;
        g.position.set(wx, H, wz);
        board.add(g);
      }
    }
  }

  // monster / golem
  const start = world.def.start;
  world.def.monsters.forEach((m) => {
    const actor = stage.monsterKind === 'golem' ? buildGolem() : buildMonster();
    actor.group.position.set(worldX(m.x), H, worldZ(m.z));
    actor.group.rotation.y = Math.atan2(start.x - m.x, start.z - m.z);
    board.add(actor.group);
    parts.monsters.push(actor);
  });

  // tema
  viewport.style.background = `radial-gradient(ellipse at 50% 40%, ${lighten(th.bg, 0.05).getStyle()}, ${th.bg})`;
  bgfx.setTheme(th);
  hemi.color.set(lighten(th.light, 0.1));
  lantern.color.set(th.light);
  sun.color.set(lighten(th.light, 0.15));

  const s = W + D;
  fit = { hw: s * 0.38 + 0.4, hh: s * 0.23 + 1.0 };
  panBounds = { x: Math.max(1.5, W / 2 - 0.2), z: Math.max(1.5, D / 2 - 0.2) };
  if (resetCamera) {
    resetCameraView({ instant: true });
  } else {
    clampCameraTarget();
  }
  camera.updateProjectionMatrix();
  resize();
}

// ------------------------------------------------------------
//  Aktor
// ------------------------------------------------------------
const knight = new THREE.Group(); // posisi & arah di grid
const knightBody = new THREE.Group(); // animasi kecil (bump, jatuh, dll)
knight.add(knightBody);
scene.add(knight);
const knightMats = [];

function buildKnight() {
  const g = new THREE.Group();
  const armor = std(0xb8c2cc, { metalness: 0.55, roughness: 0.4 });
  knightMats.length = 0;
  knightMats.push(armor);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.34, 8, 20), armor);
  body.position.y = 0.42;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.228, 0.08, 24), std(0x7a1f2b)); // penutup mata (kesatria buta)
  band.position.y = 0.66;
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 10), std(0xc0392b));
  plume.position.y = 0.92;
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.2), std(0x2f5c8a));
  shield.position.set(0.24, 0.42, 0.05);
  g.add(body, band, plume, shield);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.isPlaceholder = true;
  return g;
}

function buildPrincess() {
  const g = new THREE.Group();
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 16), std(0xf28ab2));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), std(0xf5d0b5));
  head.position.y = 0.18;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.05, 6), std(0xe0b04a, { metalness: 0.6 }));
  crown.position.y = 0.28;
  g.add(dress, head, crown);
  // Sengaja TIDAK memberi bayangan: petunjuk halus plot twist.
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  g.position.set(...(PRINCESS_MODEL.offset ?? [0, 0.62, -0.24]));
  g.userData.isPlaceholder = true;
  return g;
}

function buildMonster() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const skin = std(0x6b5b7a, { roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.3, 8, 16), skin);
  torso.position.y = 0.4;
  const eyeM = std(0x220000, { emissive: 0xff3030, emissiveIntensity: 2 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeM); e1.position.set(-0.08, 0.55, 0.19);
  const e2 = e1.clone(); e2.position.x = 0.08;
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), std(0xd9d2c0));
  horn.position.set(0, 0.8, 0);
  body.add(torso, e1, e2, horn);
  body.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return finishActor(group, body, eyeM, 1.05);
}

function buildGolem() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const stone = std(0x7d7a72, { roughness: 1 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.46), stone); torso.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.32), stone); head.position.y = 0.88;
  const armGeo = new THREE.BoxGeometry(0.16, 0.5, 0.18);
  const a1 = new THREE.Mesh(armGeo, stone); a1.position.set(-0.42, 0.4, 0);
  const a2 = a1.clone(); a2.position.x = 0.42;
  const eyeM = std(0x001020, { emissive: 0x40c0ff, emissiveIntensity: 2.2 });
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.02), eyeM); eye.position.set(0, 0.9, 0.17);
  body.add(torso, head, a1, a2, eye);
  body.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return finishActor(group, body, eyeM, 1.3);
}

function finishActor(group, body, eyeM, zzY) {
  const zz = new THREE.Sprite(new THREE.SpriteMaterial({ map: getZzTexture(), transparent: true, depthWrite: false }));
  zz.scale.set(0.5, 0.25, 1);
  zz.position.y = zzY;
  group.add(body, zz);
  return { group, body, eyeM, zz, k: 0, target: 0, lunge: 0 };
}

// File model dimuat sekali lalu di-clone (aman untuk model ber-skeleton).
const modelCache = new Map();
function loadRaw(url) {
  if (!modelCache.has(url)) {
    const isFbx = /\.fbx$/i.test(url);
    const p = (isFbx ? new FBXLoader() : new GLTFLoader()).loadAsync(url)
      .then((r) => (isFbx ? { scene: r, animations: r.animations } : { scene: r.scene, animations: r.animations }));
    p.catch(() => modelCache.delete(url));
    modelCache.set(url, p);
  }
  return modelCache.get(url);
}

// Buang perpindahan posisi Hips (root motion) di sumbu X/Z agar karakter tetap di petaknya.
function stripRootMotion(clip) {
  if (clip.userData?.stripped) return clip;
  for (const t of clip.tracks) {
    if (!/(Hips|rootx)\.position$/i.test(t.name)) continue;
    const v = t.values;
    // Sumbu tegak = komponen dengan nilai awal terbesar (tinggi pinggul dari lantai).
    // Mixamo (Hips): Y. Auto-Rig Pro dari Blender (rootx, armature Z-up): Z.
    // Sumbu tegak dipertahankan (naik-turun pinggul, lonjakan lompat); dua sumbu datar dibekukan.
    const up = [0, 1, 2].reduce((a, b) => (Math.abs(v[b]) > Math.abs(v[a]) ? b : a), 0);
    for (let i = 0; i < v.length; i += 3) {
      for (let k = 0; k < 3; k++) if (k !== up) v[i + k] = v[k];
    }
  }
  clip.userData = { ...clip.userData, stripped: true };
  return clip;
}

async function loadModel(cfg) {
  const raw = await loadRaw(cfg.url);
  const model = cloneSkinned(raw.scene);
  model.traverse((o) => {
    o.userData.fromModelCache = true;
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    for (const m of [].concat(o.material)) if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
  });
  // rotationX: koreksi model Z-up (mis. ekspor Blender tanpa konversi sumbu) -> -Math.PI / 2
  model.rotation.set(cfg.rotationX ?? 0, cfg.rotationY ?? 0, 0, 'YXZ');

  // Skala otomatis dari tinggi model (Mixamo memakai satuan cm).
  const measure = () => {
    model.updateMatrixWorld(true);
    model.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
    return new THREE.Box3().setFromObject(model);
  };
  let box = measure();
  const h = box.max.y - box.min.y;
  const s = cfg.scale ?? (h > 0 && Number.isFinite(h) ? (cfg.height ?? 1) / h : 0.01);
  model.scale.multiplyScalar(s);
  box = measure();
  const c = box.getCenter(new THREE.Vector3());
  model.position.x -= c.x;
  model.position.z -= c.z;
  model.position.y += -box.min.y + (cfg.yOffset ?? 0);

  const wrap = new THREE.Group();
  wrap.add(model);
  return { wrap, model, animations: raw.animations };
}

let mixer = null;
let walkAction = null;
let walkPair = []; // dua salinan klip Walk yang bergantian agar Walk -> Walk juga ter-crossfade
let jumpAction = null;
let moveAction = null; // aksi gerak yang sedang dipakai (jalan atau lompat)
let walkRate = 0; // 0 = diam, >0 = kecepatan animasi jalan
let idleAction = null;
const blendW = new Map(); // bobot campuran per klip (lihat loop render)
const BLEND_SPEED = 12;    // makin besar makin cepat transisinya (12 ≈ 0,25 detik)
let princessObj = buildPrincess();
let knightHasEmbeddedPrincess = false;
function setKnightObject(obj, { withPrincess = true } = {}) {
  knightBody.clear();
  knightBody.add(obj);
  if (withPrincess) knightBody.add(princessObj);
}
setKnightObject(buildKnight());

function findClip(anims, selector) {
  if (!Array.isArray(anims) || anims.length === 0) return null;
  if (typeof selector === 'string') return anims.find((a) => a.name === selector) ?? null;
  if (typeof selector === 'number') return anims[selector] ?? null;
  return null;
}

function syncPrincessAttachment() {
  knightBody.remove(princessObj);
  if (!knightHasEmbeddedPrincess) knightBody.add(princessObj);
}

let knightModelGen = 0;
let princessModelGen = 0;

async function applyKnightModel() {
  const gen = ++knightModelGen;
  if (!KNIGHT_MODEL.url) {
    knightHasEmbeddedPrincess = false;
    mixer = null; walkAction = null; idleAction = null; jumpAction = null; moveAction = null; walkPair = []; blendW.clear();
    setKnightObject(buildKnight(), { withPrincess: true });
    return;
  }
  try {
    const { wrap, model, animations } = await loadModel(KNIGHT_MODEL);
    if (gen !== knightModelGen) return;

    let walkAnims = animations;
    if (KNIGHT_MODEL.walkUrl) {
      try { walkAnims = (await loadRaw(KNIGHT_MODEL.walkUrl)).animations; }
      catch (e) { console.error('Gagal memuat animasi jalan, pakai klip bawaan model:', e); }
      if (gen !== knightModelGen) return;
    }

    let idleClip = null;
    if (KNIGHT_MODEL.idleUrl) {
      try {
        const idleAnims = (await loadRaw(KNIGHT_MODEL.idleUrl)).animations;
        idleClip = findClip(idleAnims, KNIGHT_MODEL.idleClip ?? 0);
      } catch (e) { console.error('Gagal memuat animasi idle:', e); }
      if (gen !== knightModelGen) return;
    }

    knightMats.length = 0;
    model.traverse((o) => {
      if (o.isMesh) for (const m of [].concat(o.material)) if (m.emissive) knightMats.push(m);
    });
    knightHasEmbeddedPrincess = !!KNIGHT_MODEL.includesPrincess;
    setKnightObject(wrap, { withPrincess: !knightHasEmbeddedPrincess });
    mixer = null; walkAction = null; idleAction = null; jumpAction = null; moveAction = null; walkPair = []; blendW.clear();

    const clip = findClip(walkAnims, KNIGHT_MODEL.walkClip ?? 0);
    if (clip) {
      mixer = new THREE.AnimationMixer(model);
      const walkClipStripped = stripRootMotion(clip);
      walkAction = mixer.clipAction(walkClipStripped);
      walkAction.play();
      // salinan kedua (klip di-clone agar menjadi aksi terpisah di mixer)
      const walkB = mixer.clipAction(walkClipStripped.clone());
      walkB.play();
      walkPair = [walkAction, walkB];
    }
    if (!idleClip && KNIGHT_MODEL.idleClip != null) {
      const candidate = findClip(animations, KNIGHT_MODEL.idleClip);
      if (candidate && candidate !== clip) idleClip = candidate;
    }
    if (idleClip) {
      mixer ??= new THREE.AnimationMixer(model);
      idleAction = mixer.clipAction(stripRootMotion(idleClip));
      idleAction.play();
      walkAction?.setEffectiveWeight(0);
    }
    const jumpClipObj = findClip(animations, KNIGHT_MODEL.jumpClip);
    if (jumpClipObj) {
      mixer ??= new THREE.AnimationMixer(model);
      jumpAction = mixer.clipAction(stripRootMotion(jumpClipObj));
      // sekali putar per perintah Lompat, lalu tertahan di pose mendarat
      jumpAction.setLoop(THREE.LoopOnce, 1);
      jumpAction.clampWhenFinished = true;
      jumpAction.setEffectiveWeight(0);
    }
    mixer?.update(0);
  } catch (e) {
    console.error('Gagal memuat model kesatria:', e);
    showToast('Model kesatria gagal dimuat, memakai placeholder');
  }
}

async function applyPrincessModel() {
  const gen = ++princessModelGen;
  if (!PRINCESS_MODEL.url) {
    if (!princessObj.userData?.isPlaceholder) {
      knightBody.remove(princessObj);
      princessObj = buildPrincess();
    }
    syncPrincessAttachment();
    return;
  }
  try {
    const { wrap } = await loadModel(PRINCESS_MODEL);
    if (gen !== princessModelGen) return;
    // Sengaja TIDAK memberi bayangan: petunjuk halus plot twist.
    wrap.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    wrap.position.set(...(PRINCESS_MODEL.offset ?? [0, 0.62, -0.24]));
    knightBody.remove(princessObj);
    princessObj = wrap;
    syncPrincessAttachment();
  } catch (e) {
    console.error('Gagal memuat model putri:', e);
    showToast('Model putri gagal dimuat, memakai placeholder');
  }
}

async function applyCustomModels() {
  await Promise.all([applyKnightModel(), applyPrincessModel()]);
}
applyCustomModels();
// Dari console:
//   setKnightModel({ url: 'assets/models/knight.glb', walkClip: 'Walk', idleClip: 'Idle', jumpClip: 'Jump', includesPrincess: true })
//   setPrincessModel({ url: 'assets/models/princess.glb', height: 0.35, offset: [0, 0.62, -0.24] })
//   setMonsterModel({ url: 'assets/models/monster.glb', height: 0.9 })
//   setGolemModel({ url: 'assets/models/golem.glb', height: 1.1 })
//   setBoardTextures({ floor: 'assets/textures/floor.png' })
window.setKnightModel = async (cfg) => { Object.assign(KNIGHT_MODEL, cfg); await applyKnightModel(); };
window.setPrincessModel = async (cfg) => { Object.assign(PRINCESS_MODEL, cfg); await applyPrincessModel(); };
window.setMonsterModel = async (cfg) => { Object.assign(MONSTER_MODEL, cfg); buildBoard({ resetCamera: false }); syncWorld(true); await applyMonsterModels(); };
window.setGolemModel = async (cfg) => { Object.assign(GOLEM_MODEL, cfg); buildBoard({ resetCamera: false }); syncWorld(true); await applyMonsterModels(); };
window.setBoardTextures = async (patch, stageId = null) => {
  if (stageId != null) {
    TEXTURES.stages[stageId] = { ...(TEXTURES.stages[stageId] || {}), ...patch };
  } else {
    Object.assign(TEXTURES.default, patch);
  }
  buildBoard({ resetCamera: false });
  syncWorld(true);
  await applyMonsterModels();
};

function setActorAnim(a, asleep, instant = false) {
  if (!a?.anim) return;
  const { mixer: mMixer, actions, blend } = a.anim;
  const prev = a.anim.asleep;
  a.anim.asleep = asleep;
  if (instant) {
    a.anim.attacking = false;
    const target = (asleep ? actions.sleep : actions.idle) || actions.idle || actions.sleep;
    a.anim.active = target;
    for (const act of Object.values(actions)) {
      if (!act) continue;
      if (act === target) { act.reset().play(); act.setEffectiveWeight(1); blend.set(act, 1); }
      else { act.setEffectiveWeight(0); blend.set(act, 0); }
    }
    mMixer.update(0);
    return;
  }
  if (a.anim.attacking || prev === asleep) return;
  if (asleep) {
    if (actions.toSleep) { actions.toSleep.reset().play(); a.anim.active = actions.toSleep; }
    else if (actions.sleep) { actions.sleep.play(); a.anim.active = actions.sleep; }
  } else {
    if (actions.toIdle) { actions.toIdle.reset().play(); a.anim.active = actions.toIdle; }
    else if (actions.idle) { actions.idle.play(); a.anim.active = actions.idle; }
  }
}

function playActorAttack(a) {
  if (!a?.anim?.actions.attack) return;
  a.anim.attacking = true;
  a.anim.actions.attack.reset().play();
  a.anim.active = a.anim.actions.attack;
}

// Monster/golem custom: dipasang ulang tiap board dibangun.
async function applyMonsterModels() {
  const cfg = stage.monsterKind === 'golem' ? GOLEM_MODEL : MONSTER_MODEL;
  if (!cfg.url) return;
  const gen = boardGen;
  try {
    for (const a of parts.monsters) {
      const { wrap, model, animations } = await loadModel(cfg);
      if (gen !== boardGen) return;
      const keep = a.body.children.filter((c) => c.material === a.eyeM);
      a.body.clear();
      a.body.add(wrap, ...keep.map((k) => { k.visible = false; return k; }));

      const clips = {
        idle: findClip(animations, cfg.idleClip),
        sleep: findClip(animations, cfg.sleepClip),
        toSleep: findClip(animations, cfg.toSleepClip),
        toIdle: findClip(animations, cfg.toIdleClip),
        attack: findClip(animations, cfg.attackClip),
      };
      if (Object.values(clips).some(Boolean)) {
        const mMixer = new THREE.AnimationMixer(model);
        const mkAction = (c, once = false) => {
          if (!c) return null;
          const act = mMixer.clipAction(c);
          if (once) {
            act.setLoop(THREE.LoopOnce, 1);
            act.clampWhenFinished = true;
          }
          act.play();
          act.setEffectiveWeight(0);
          return act;
        };
        const actions = {
          idle: mkAction(clips.idle, false),
          sleep: mkAction(clips.sleep, false),
          toSleep: mkAction(clips.toSleep, true),
          toIdle: mkAction(clips.toIdle, true),
          attack: mkAction(clips.attack, true),
        };
        a.anim = { mixer: mMixer, actions, active: null, asleep: null, attacking: false, blend: new Map() };
        a.body.rotation.z = 0;
        a.body.position.y = 0;
        setActorAnim(a, a.target === 1, true);
      } else {
        a.anim = null;
      }
    }
  } catch (e) { console.error('Gagal memuat model monster:', e); }
}

// ------------------------------------------------------------
//  Sinkron tampilan dengan World
// ------------------------------------------------------------
let knightAngle = 0;
function placeKnight() {
  const { x, z } = world;
  knight.position.set(worldX(x), H, worldZ(z));
  knightAngle = angleFor(world.dir);
  knight.rotation.y = knightAngle;
  knightBody.position.set(0, 0, 0);
  knightBody.rotation.set(0, 0, 0);
  knightBody.scale.set(1, 1, 1);
  knight.visible = true;
  setKnightFlash(0);
}

function syncWorld(instant = false) {
  world.monsters.forEach((m, i) => {
    const a = parts.monsters[i];
    if (!a) return;
    const asleep = world.asleep(m);
    a.target = asleep ? 1 : 0;
    if (instant) a.k = a.target;
    setActorAnim(a, asleep, instant);
  });
  for (const [id, list] of parts.bridges) for (const p of list) {
    p.userData.target = world.active.has(id) ? p.userData.yOpen : p.userData.yClosed;
    if (instant) p.position.y = p.userData.target;
  }
  for (const [id, list] of parts.gates) for (const g of list) {
    g.userData.target = world.active.has(id) ? g.userData.yOpen : g.userData.yClosed;
    if (instant) g.position.y = g.userData.target;
  }
  for (const [id, list] of parts.levers) for (const pivot of list) {
    pivot.userData.target = world.active.has(id) ? -0.6 : 0.6;
    if (instant) pivot.rotation.z = pivot.userData.target;
  }
}

function setKnightFlash(v) {
  for (const m of knightMats) { m.emissive.setRGB(v, 0, 0); }
}

const SENSOR_LABELS = { trap: 'Jebakan', monster: 'Monster', sleep: 'Tidur' };
const sensorTexCache = new Map();
function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
function getSensorTexture(cond, result) {
  const k = `${cond}:${result ? 1 : 0}`;
  if (sensorTexCache.has(k)) return sensorTexCache.get(k);
  const c = document.createElement('canvas');
  c.width = 360; c.height = 124;
  const g = c.getContext('2d');
  const ok = !!result;
  const accent = ok ? '#2f7a44' : '#a8342a';
  const border = ok ? '#49a863' : '#d65347';

  // gelembung perkamen + ekor panah bawah
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)';
  g.shadowBlur = 10;
  g.shadowOffsetY = 4;
  roundRectPath(g, 14, 10, 332, 86, 22);
  g.fillStyle = '#fbf1d6';
  g.fill();
  g.restore();

  // ekor kecil menunjuk ke kesatria/putri
  g.beginPath();
  g.moveTo(166, 95);
  g.lineTo(180, 114);
  g.lineTo(194, 95);
  g.closePath();
  g.fillStyle = '#fbf1d6';
  g.fill();

  // bingkai luar
  roundRectPath(g, 14, 10, 332, 86, 22);
  g.lineWidth = 4;
  g.strokeStyle = border;
  g.stroke();

  // teks kondisi (kiri)
  g.fillStyle = '#3b2a1a';
  g.font = '700 28px "Segoe UI", system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillText(`${SENSOR_LABELS[cond] || cond}?`, 32, 53);

  // pil hasil (kanan: ✓ YA / ✗ TIDAK)
  roundRectPath(g, 198, 25, 134, 56, 28);
  g.fillStyle = accent;
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = '800 25px "Segoe UI", system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(ok ? '✓ YA' : '✗ TIDAK', 265, 54);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  sensorTexCache.set(k, tex);
  return tex;
}

const sensorBubbleMat = new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false });
const sensorBubble = new THREE.Sprite(sensorBubbleMat);
sensorBubble.visible = false;
sensorBubble.renderOrder = 10;
scene.add(sensorBubble);

const sensorRingMat = new THREE.MeshBasicMaterial({
  color: 0x46b864, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
});
const sensorRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.665, 4), sensorRingMat);
sensorRing.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
sensorRing.visible = false;
sensorRing.renderOrder = 5;
scene.add(sensorRing);

function hideSensorFx() {
  sensorBubble.visible = false;
  sensorRing.visible = false;
}

async function showSensorEval(cond, result, token) {
  const reduced = document.body.classList.contains('rm');
  sensorBubbleMat.map = getSensorTexture(cond, result);
  sensorBubbleMat.needsUpdate = true;
  sensorBubble.visible = true;

  const f = world.frontPos();
  const fc = world.cell(f.x, f.z);
  const ringY = fc?.kind === 'wall' ? 0.88 : H + 0.025;
  sensorRingMat.color.setHex(result ? 0x46b864 : 0xd94e43);
  sensorRing.position.set(worldX(f.x), ringY, worldZ(f.z));
  sensorRing.visible = true;

  const baseX = knight.position.x;
  const baseZ = knight.position.z;
  const baseY = H + 1.56;
  await tween(dur(360), (t) => {
    const alpha = reduced
      ? 1
      : t < 0.2 ? t / 0.2
      : t > 0.78 ? Math.max(0, (1 - t) / 0.22)
      : 1;
    const pop = reduced ? 1 : t < 0.22 ? lerp(0.62, 1.06, ease(t / 0.22)) : lerp(1.06, 1, Math.min(1, (t - 0.22) / 0.2));
    const lift = reduced ? 0 : t * 0.14;
    sensorBubble.position.set(baseX, baseY + lift, baseZ);
    sensorBubble.scale.set(1.55 * pop, 0.54 * pop, 1);
    sensorBubbleMat.opacity = alpha;

    const ringScale = reduced ? 1 : 0.94 + Math.sin(Math.PI * t) * 0.1;
    sensorRing.scale.set(ringScale, ringScale, 1);
    sensorRingMat.opacity = alpha * 0.8;
  }, token);
  hideSensorFx();
}

function resetVisual() {
  hideSensorFx();
  placeKnight();
  syncWorld(true);
  for (const g of parts.spikes.values()) g.scale.set(1, 1, 1);
}

// ------------------------------------------------------------
//  Loop render
// ------------------------------------------------------------
let paused = false;
let simTime = 0;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (paused) { renderer.render(scene, camera); return; }
  simTime += dt;
  const t = simTime;
  const f = Math.min(1, dt * 7);
  if (mixer) {
    if (idleAction) {
      // Auto blend in/out: setiap klip punya bobot sendiri yang bergerak halus ke targetnya
      // (Idle <-> Walk <-> Jump), kira-kira 0,25 detik per transisi. Jumlah bobot tetap 1.
      const active = walkRate > 0 ? (moveAction || walkAction) : idleAction;
      const k = 1 - Math.exp(-dt * BLEND_SPEED);
      for (const act of [idleAction, ...walkPair, jumpAction]) {
        if (!act) continue;
        const w0 = blendW.get(act) ?? (act === idleAction ? 1 : 0);
        const w = w0 + ((act === active ? 1 : 0) - w0) * k;
        blendW.set(act, w);
        act.setEffectiveWeight(w);
        if (act === active && act !== idleAction && walkRate > 0) act.setEffectiveTimeScale(walkRate);
      }
      mixer.update(dt);
    } else if (walkRate > 0) mixer.update(dt * walkRate);
  }
  const gSpeed = Math.max(1, SPEEDS[+speedEl.value - 1] * 0.85);
  const gBlend = 1 - Math.exp(-dt * 14);
  for (const a of parts.monsters) {
    a.k += (a.target - a.k) * f;
    if (a.anim) {
      const { mixer: mMixer, actions, blend } = a.anim;
      a.body.rotation.z = 0;
      a.body.position.y = 0;
      a.body.position.z = actions.attack ? 0 : a.lunge;
      for (const act of Object.values(actions)) {
        if (!act) continue;
        const isOneShot = act === actions.toSleep || act === actions.toIdle || act === actions.attack;
        const w0 = blend.get(act) ?? 0;
        const w = w0 + ((act === a.anim.active ? 1 : 0) - w0) * gBlend;
        blend.set(act, w);
        act.setEffectiveWeight(w);
        act.setEffectiveTimeScale(isOneShot ? gSpeed : 1);
      }
      mMixer.update(dt);
      const done = (act) => act && act.time >= act.getClip().duration - 0.03;
      if (a.anim.attacking && done(actions.attack)) {
        a.anim.attacking = false;
        const next = (a.anim.asleep ? actions.sleep : actions.idle) || actions.idle || actions.sleep;
        if (next) { next.play(); a.anim.active = next; }
      } else if (a.anim.active === actions.toSleep && done(actions.toSleep)) {
        const next = (a.anim.asleep ? actions.sleep : actions.idle) || actions.idle;
        if (next) { next.play(); a.anim.active = next; }
      } else if (a.anim.active === actions.toIdle && done(actions.toIdle)) {
        const next = (!a.anim.asleep ? actions.idle : actions.sleep) || actions.sleep;
        if (next) { next.play(); a.anim.active = next; }
      }
    } else {
      a.body.rotation.z = a.k * 1.35;
      a.body.position.y = -a.k * 0.12 + (1 - a.k) * Math.abs(Math.sin(t * 3)) * 0.03;
      a.body.position.z = a.lunge;
    }
    a.eyeM.emissiveIntensity = (1 - a.k) * 2.2;
    a.zz.visible = a.k > 0.6;
    a.zz.position.x = Math.sin(t * 2) * 0.05;
    a.zz.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
  }
  board.children.forEach((o) => {
    if (o.userData.target !== undefined) o.position.y += (o.userData.target - o.position.y) * f;
    if (o.userData.water) o.position.y = 0.28 + Math.sin(t * 2 + o.position.x + o.position.z) * 0.015;
  });
  for (const list of parts.levers.values()) for (const p of list) p.rotation.z += (p.userData.target - p.rotation.z) * f;
  lantern.position.set(knight.position.x, knight.position.y + 1.1, knight.position.z);
  if (camResetAnim) {
    camResetAnim.elapsed += dt;
    const u = ease(Math.min(1, camResetAnim.elapsed / camResetAnim.duration));
    controls.target.lerpVectors(camResetAnim.fromTarget, CAM_DEFAULT_TARGET, u);
    camera.position.lerpVectors(camResetAnim.fromPos, CAM_DEFAULT_POS, u);
    camera.zoom = lerp(camResetAnim.fromZoom, CAM_DEFAULT_ZOOM, u);
    camera.updateProjectionMatrix();
    if (u >= 1) camResetAnim = null;
  } else if (camKeys.size > 0) {
    if (!titleEl.hidden || editing || anyOverlayOpen()) {
      camKeys.clear();
    } else {
      _camFwd.set(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z);
      if (_camFwd.lengthSq() > 1e-6) {
        _camFwd.normalize();
        _camRight.crossVectors(_camFwd, _camUp).normalize();
        const fMove = (camKeys.has('w') ? 1 : 0) - (camKeys.has('s') ? 1 : 0);
        const rMove = (camKeys.has('d') ? 1 : 0) - (camKeys.has('a') ? 1 : 0);
        if (fMove || rMove) {
          const len = Math.hypot(fMove, rMove);
          const step = (6.5 / camera.zoom) * dt / len;
          const dx = (_camFwd.x * fMove + _camRight.x * rMove) * step;
          const dz = (_camFwd.z * fMove + _camRight.z * rMove) * step;
          controls.target.x += dx; controls.target.z += dz;
          camera.position.x += dx; camera.position.z += dz;
        }
      }
    }
  }
  controls.update();
  clampCameraTarget();
  renderer.render(scene, camera);
});

// ------------------------------------------------------------
//  Animasi aksi kesatria
// ------------------------------------------------------------
let runToken = 0;
const SPEEDS = [0.5, 1, 1.7, 2.8, 5];
const speedEl = document.getElementById('speed');
const dur = (ms) => ms / SPEEDS[+speedEl.value - 1];
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function tween(ms, fn, token) {
  return new Promise((resolve) => {
    let acc = 0;
    let prev = performance.now();
    const step = (now) => {
      if (token !== runToken) return resolve(false);
      const dt = Math.min(100, now - prev);
      prev = now;
      if (!paused) {
        acc += dt;
        const t = Math.min(1, acc / ms);
        fn(t);
        if (t >= 1) return resolve(true);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

let walkStopTimer = 0;
async function travel(ev, token) {
  clearTimeout(walkStopTimer); // langkah berikutnya menyambung tanpa kembali ke pose diam
  const from = knight.position.clone();
  const to = new THREE.Vector3(worldX(ev.to.x), H, worldZ(ev.to.z));
  const jump = ev.type === 'jump';
  const arc = jump ? (jumpAction ? 0.12 : 0.7) : 0; // klip Jump sudah membawa lonjakan tubuh sendiri
  const ms = dur(jump ? (KNIGHT_MODEL.jumpMs ?? 560) : (KNIGHT_MODEL.walkMs ?? 420));
  // satu petak = satu langkah kaki = 1/walkSteps klip
  if (jump && jumpAction) {
    // klip lompat diputar penuh sekali selama lompatan
    moveAction = jumpAction;
    jumpAction.reset().play(); // mulai dari awal; LoopOnce mencegah lompatan kedua
    walkRate = jumpAction.getClip().duration / (ms / 1000);
  } else if (walkAction) {
    const steps = KNIGHT_MODEL.walkSteps || 2;
    if (steps === 1) {
      // klip penuh per petak: pakai salinan Walk yang lain mulai dari frame 0,
      // salinan sebelumnya memudar keluar (crossfade Walk -> Walk)
      // ganti salinan bila yang sekarang masih terlihat (bobot > 0), supaya tidak meloncat ke frame 0
      if (walkPair.length === 2 && (blendW.get(walkAction) ?? 0) > 0.05) {
        walkAction = walkPair[0] === moveAction ? walkPair[1] : walkPair[0];
      }
      walkAction.reset().play();
    }
    moveAction = walkAction;
    walkRate = (walkAction.getClip().duration / steps) / (ms / 1000);
  }
  await tween(ms, (t) => {
    // jalan: kecepatan tetap agar langkah beruntun mengalir; lompat: percepat-perlambat
    const e = jump ? ease(t) : t;
    knight.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e) + Math.sin(Math.PI * t) * arc, lerp(from.z, to.z, e));
    if (!jump && !walkAction) knightBody.position.y = Math.abs(Math.sin(Math.PI * 2 * t)) * 0.05;
  }, token);
  // beri jeda singkat sebelum kembali ke idle: bila perintah berikutnya juga bergerak,
  // animasi jalan tetap menyambung.
  if (jump && jumpAction) walkRate = 0; // lompat selesai: langsung kembali ke idle
  else walkStopTimer = setTimeout(() => { walkRate = 0; }, 180);
  knightBody.position.y = 0;
}

async function bump(token) {
  await tween(dur(360), (t) => {
    knightBody.position.z = Math.sin(Math.PI * t) * 0.15;
    knightBody.rotation.z = Math.sin(Math.PI * 4 * t) * 0.08 * (1 - t);
  }, token);
  knightBody.position.z = 0; knightBody.rotation.z = 0;
}

async function animateEvent(ev, token) {
  switch (ev.result) {
    case 'turn': {
      sfx('turn');
      const from = knightAngle, to = from - ev.delta * (Math.PI / 2);
      await tween(dur(300), (t) => { knight.rotation.y = lerp(from, to, ease(t)); }, token);
      knightAngle = to;
      break;
    }
    case 'move':
      sfx(ev.type === 'jump' ? 'jump' : 'step');
      await travel(ev, token);
      if (ev.type === 'jump') sfx('land');
      break;
    case 'bump':
      if (ev.golem) showToast('Golem batu menghalangi! Gunakan Lompat saat ia tertidur.');
      sfx('bump');
      await bump(token);
      break;
    case 'wait':
      sfx('wait');
      await tween(dur(420), (t) => { knightBody.scale.y = 1 - Math.sin(Math.PI * 2 * t) * 0.04; }, token);
      knightBody.scale.y = 1;
      break;
    case 'lever':
      sfx('lever');
      syncWorld();
      await tween(dur(420), (t) => { knightBody.scale.y = 1 - Math.sin(Math.PI * t) * 0.12; }, token);
      knightBody.scale.y = 1;
      break;
    case 'nolever':
      showToast('Tidak ada tuas di petak ini');
      sfx('bump');
      await bump(token);
      break;
    case 'fall':
      sfx(ev.type === 'jump' ? 'jump' : 'step');
      await travel(ev, token);
      sfx(ev.river ? 'splash' : 'fall');
      await tween(dur(600), (t) => {
        knight.position.y = H - t * t * 2.6;
        knightBody.rotation.x = t * 0.8;
      }, token);
      knight.visible = false;
      break;
    case 'trap': {
      await travel(ev, token);
      sfx('trap');
      const sp = parts.spikes.get(key(ev.to.x, ev.to.z));
      await tween(dur(420), (t) => {
        if (sp) sp.scale.y = 1 + Math.sin(Math.PI * Math.min(1, t * 2)) * 0.9;
        setKnightFlash(Math.sin(Math.PI * t) * 0.8);
        knightBody.rotation.x = -t * 1.2;
      }, token);
      break;
    }
    case 'caught': {
      if (ev.from.x !== ev.to.x || ev.from.z !== ev.to.z) await travel(ev, token);
      sfx('caught');
      const a = parts.monsters[ev.monster];
      playActorAttack(a);
      await tween(dur(480), (t) => {
        if (a) a.lunge = Math.sin(Math.PI * t) * 0.25;
        setKnightFlash(Math.sin(Math.PI * t) * 0.8);
        knightBody.rotation.x = -t * 1.3;
      }, token);
      if (a) a.lunge = 0;
      break;
    }
  }
}

// ------------------------------------------------------------
//  Suara: semua dari file audio (kredit di readme). Tidak ada lagi nada sintesis.
//  Jenis suara tanpa file -> sunyi (lihat SOUND_TODO).
// ------------------------------------------------------------
let muted = false;
let actx = null;
const audio = () => {
  actx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
};

// file: nama file di assets/sfx, gain: volume dasar, rate: kecepatan putar (mengubah nada)
const SAMPLES = {
  click: { file: 'click.mp3', gain: 0.25 },             // tombol, tambah/geser blok
  turn:  { file: 'move/turn.mp3', gain: 0.2 },         // kesatria berbelok (langkah rumput)
  eval:  { file: 'click.mp3', gain: 0.2, rate: 1.6 },   // putri menjawab sensor
  chime: { file: 'click.mp3', gain: 0.3, rate: 0.8 },   // tombol Simpan sekarang
  win:   { file: 'win.mp3', gain: 0.7 },                // bab/level selesai
  newcard: { file: 'win.mp3', gain: 0.7 },              // kartu "Blok Baru!" muncul
  // Gerakan kesatria: "12 Player Movement SFX" oleh leohpaz (CC BY 4.0), dikonversi & dinormalisasi.
  step:   { file: 'move/step.mp3', gain: 0.3 },         // Maju (langkah batu)
  jump:   { file: 'move/jump.mp3', gain: 0.35 },        // Lompat
  land:   { file: 'move/land.mp3', gain: 0.3 },         // mendarat setelah lompat
  bump:   { file: 'move/land.mp3', gain: 0.35, rate: 0.85 }, // menabrak tembok
  lever:  { file: 'move/lever.mp3', gain: 0.4 },        // tarik tuas (langkah kayu)
  trap:   { file: 'move/hit.mp3', gain: 0.4 },          // kena duri
  caught: { file: 'move/attack.mp3', gain: 0.45 },      // ditangkap monster
  fall:   { file: 'move/dive.mp3', gain: 0.4 },         // jatuh ke lubang
  splash: { file: 'move/splash.mp3', gain: 0.45 },      // tercebur sungai racun
  fail:   { file: 'fail.mp3', gain: 0.4 },              // program gagal ("oopsies", wefgf, Pixabay)
  reveal: { file: 'move/dive.mp3', gain: 0.55, rate: 0.52 }, // hentakan rendah saat plot twist epilog
};
// Tanpa suara: wait (diam di tempat).
const buffers = {};
let samplesLoading = false;
function loadSamples() {
  if (samplesLoading) return;
  samplesLoading = true;
  for (const file of new Set(Object.values(SAMPLES).map((x) => x.file))) {
    const url = 'assets/sfx/' + file;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((b) => audio().decodeAudioData(b))
      .then((buf) => { buffers[file] = buf; })
      .catch((e) => console.warn('Gagal memuat suara', url, e));
  }
}
// Muat pada interaksi pertama (AudioContext butuh gestur pengguna).
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, loadSamples, { once: true, capture: true });

function sfx(kind) {
  if (muted || settings.sfx <= 0) return;
  const def = SAMPLES[kind];
  if (!def) return;
  try {
    loadSamples();
    const buf = buffers[def.file];
    if (!buf) return;
    const ctx = audio();
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = def.rate || 1;
    g.gain.value = def.gain * (settings.sfx / 100);
    src.connect(g).connect(ctx.destination);
    src.start();
  } catch { /* audio tidak tersedia */ }
}

// Musik: menu.mp3 di layar utama, game.mp3 di dalam bab (kredit di readme).
// vol = volume dasar; game.mp3 ~7 dB lebih keras dari menu.mp3, jadi dasarnya lebih kecil.
const makeTrack = (file, vol) => {
  const a = new Audio('assets/sfx/' + file);
  a.loop = true; a.preload = 'auto';
  return { a, vol };
};
const menuTrack = makeTrack('menu.mp3', 0.5);
const gameTrack = makeTrack('game.mp3', 0.15);
let musicOn = true; // dimatikan sementara oleh stopMusic (mis. saat epilog)
let epilogSilent = false;
function updateMusic() {
  const onTitle = !titleEl.hidden;
  const allowed = !muted && settings.music > 0 && !epilogSilent;
  const duck = paused && document.getElementById('settingsOverlay')?.hidden ? 0.4 : 1;
  for (const [t, want, mult] of [[menuTrack, allowed && onTitle, 1], [gameTrack, allowed && !onTitle && musicOn, duck]]) {
    t.a.volume = Math.min(1, t.vol * (settings.music / 100) * mult);
    if (want && t.a.paused) t.a.play().catch(() => { /* menunggu gestur pertama */ });
    else if (!want && !t.a.paused) t.a.pause();
  }
}
function startMusic() { musicOn = true; updateMusic(); }
function stopMusic() { musicOn = false; updateMusic(); }
// Browser memblokir autoplay sampai ada interaksi; coba lagi pada klik/tombol pertama.
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => updateMusic(), { once: true, capture: true });

const muteIcon = document.getElementById('muteIcon');
function renderMute() {
  muteIcon.innerHTML = muted
    ? '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><line x1="22" x2="16" y1="9" y2="15" /><line x1="16" x2="22" y1="9" y2="15" />' // lucide: volume-x
    : '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" />'; // lucide: volume-2
}
document.getElementById('btnMute').onclick = () => {
  muted = !muted;
  store('muted', muted);
  renderMute();
  if (!muted) audio();
  updateMusic();
};

// ------------------------------------------------------------
//  Penyimpanan
// ------------------------------------------------------------
// Kunci disimpan per slot profil (lihat saves.js); pengaturan & suara berlaku global.
const progress = () => ({ unlocked: 1, stars: {}, ...load('progress', {}) });

// ------------------------------------------------------------
//  Profil pemain, statistik, pengaturan
// ------------------------------------------------------------
const player = { name: '', ...load('player', {}) };
const playerName = () => player.name || 'Pembaca';
const personalize = (text) => String(text).replaceAll('{pemain}', playerName());
const stats = { runs: 0, wins: 0, fails: 0, ...load('stats', {}) };
const bumpStat = (k) => { stats[k] = (stats[k] || 0) + 1; store('stats', stats); };

const settings = { text: 'm', music: 60, sfx: 80, contrast: false, readable: false, motion: false, bgfx: true, ...load('settings', {}) };
const TEXT_SCALE = { s: 0.9, m: 1, l: 1.15, xl: 1.3 };
function applySettings() {
  document.documentElement.style.setProperty('--fs', TEXT_SCALE[settings.text] || 1);
  document.body.classList.toggle('hc', !!settings.contrast);
  document.body.classList.toggle('rf', !!settings.readable);
  document.body.classList.toggle('rm', !!settings.motion);
  bgfx.setEnabled(settings.bgfx !== false);
  requestAnimationFrame(resize);
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const chapterOf = (lv) => `BAB ${ROMAN[lv.id] || lv.id}`;

// gelar berdasarkan total bintang
const RANKS = [
  [0, 'Pembaca Pemula'], [4, 'Juru Arah'], [8, 'Penjaga Langkah'], [12, 'Insinyur Muda'], [15, 'Arsitek Kastil'],
];
function rankFor(stars) {
  let i = 0;
  while (i < RANKS.length - 1 && stars >= RANKS[i + 1][0]) i++;
  return { title: RANKS[i][1], next: RANKS[i + 1] || null, from: RANKS[i][0] };
}

// ------------------------------------------------------------
//  Editor blok
// ------------------------------------------------------------
// Ikon blok: Lucide (https://lucide.dev, lisensi ISC; lihat assets/licenses/lucide-LICENSE.txt)
const ICONS = {
  move: '<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />', // lucide: arrow-up
  right: '<polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" />', // lucide: corner-up-right
  left: '<polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />', // lucide: corner-up-left
  jump: '<path d="m17 11-5-5-5 5" /><path d="m17 18-5-5-5 5" />', // lucide: chevrons-up
  repeat: '<path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />', // lucide: repeat
  if: '<path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" />', // lucide: split
  lever: '<path d="M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z" /><path d="M6 15v-2" /><path d="M12 15V9" /><circle cx="12" cy="6" r="3" />', // lucide: joystick
  wait: '<path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />', // lucide: hourglass
  call: '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />', // lucide: braces
};
const BLOCKS = {
  move: { label: 'Maju', cat: 'move' },
  left: { label: 'Belok Kiri', cat: 'move' },
  right: { label: 'Belok Kanan', cat: 'move' },
  jump: { label: 'Lompat', cat: 'move' },
  repeat: { label: 'Ulangi', cat: 'ctrl' },
  if: { label: 'Jika', cat: 'cond' },
  lever: { label: 'Tarik Tuas', cat: 'act' },
  wait: { label: 'Tunggu', cat: 'act' },
  call: { label: 'Panggil Fungsi', cat: 'fn' },
};
const ICON_LOCK = '<svg class="lock-ico" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>'; // lucide: lock
const svg = (t) => `<svg viewBox="0 0 24 24">${ICONS[t]}</svg>`;
const catVar = (t) => `var(--c-${BLOCKS[t].cat})`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let program = [];
let fnBody = [];
let fnName = 'Fungsi';
let activeList = 'main';
let running = false;
let drag = null; // { kind: 'new', type } | { kind: 'move', id }

const programEl = document.getElementById('program');
const paletteEl = document.getElementById('palette');
const hasFn = () => stage.blocks.includes('call');

function newNode(type) {
  if (type === 'repeat') return { id: newId(), type, count: 2, body: [] };
  if (type === 'if') return { id: newId(), type, cond: 'monster', then: [], else: [] };
  return { id: newId(), type };
}

function findNode(id, lists = [program, fnBody]) {
  for (const list of lists) {
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.id === id) return { node: n, list, index: i };
      const r = findNode(id, childLists(n));
      if (r) return r;
    }
  }
  return null;
}
function getList(listId) {
  if (listId === 'main') return program;
  if (listId === 'fn') return fnBody;
  const [id, part] = listId.split(':');
  const f = findNode(+id);
  if (!f) return program;
  return part ? f.node[part] : f.node.body;
}
const ownerOf = (listId) => (listId === 'main' || listId === 'fn' ? null : +listId.split(':')[0]);
function containsList(node, listId) {
  const owner = ownerOf(listId);
  if (owner == null) return false;
  if (node.id === owner) return true;
  return childLists(node).some((l) => l.some((c) => containsList(c, listId)));
}
const totalBlocks = () => countBlocks(program) + (hasFn() ? countBlocks(fnBody) : 0);
function canAdd() {
  if (stage.limit && totalBlocks() >= stage.limit) {
    showToast(`Batas ${stage.limit} blok tercapai. Coba pakai ${stage.blocks.includes('call') ? 'Fungsi' : 'Ulangi'}!`);
    sfx('bump');
    return false;
  }
  return true;
}

function addInstruction(type) {
  if (running || !canAdd()) return;
  const n = newNode(type);
  getList(activeList).push(n);
  if (type === 'repeat') activeList = String(n.id);
  if (type === 'if') activeList = `${n.id}:then`;
  sfx('click');
  changed();
}

function deleteNode(id) {
  const f = findNode(id);
  if (!f) return;
  if (containsList(f.node, activeList)) activeList = 'main';
  f.list.splice(f.index, 1);
  changed();
}

function changed() {
  failCauseId = null; // program diubah -> tanda "sebab" lama tidak berlaku
  saveProgram();
  renderProgram();
  updateHud();
}

function renderPalette() {
  paletteEl.innerHTML = '';
  const prev = LEVELS[LEVELS.indexOf(stage) - 1];
  for (const type of stage.blocks) {
    const b = document.createElement('button');
    const introduced = prev ? !prev.blocks.includes(type) : !stage.custom; // blok yang dikenalkan di bab ini
    b.className = 'pal-btn' + (introduced ? ' new' : '');
    b.style.setProperty('--cat', catVar(type));
    b.draggable = true;
    b.innerHTML = `${svg(type)}<span>${BLOCKS[type].label}</span>`;
    b.title = prev && !prev.blocks.includes(type) ? 'Blok baru!' : BLOCKS[type].label;
    b.onclick = () => addInstruction(type);
    b.addEventListener('dragstart', (e) => {
      if (running) return e.preventDefault();
      drag = { kind: 'new', type };
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('text/plain', type);
    });
    b.addEventListener('dragend', endDrag);
    paletteEl.appendChild(b);
  }
}

function renderProgram(focusId) {
  const scroll = programEl.scrollTop;
  // pertahankan fokus keyboard/gamepad pada blok yang sama setelah render ulang
  const act = document.activeElement;
  const keepId = focusId ?? (programEl.contains(act) ? act.closest('.pitem')?.dataset.id : null);
  programEl.innerHTML = '';
  const main = document.createElement('div');
  main.className = 'main-wrap';
  if (stage.initialProgram && programOwner === stage.id && !load('hiddenNotes', []).includes(stage.id)) {
    main.insertAdjacentHTML('beforeend', `<div class="plan-note">
      <button class="note-close" type="button" title="Tutup catatan" aria-label="Tutup catatan">×</button>
      <b>Rencana dari putri</b> — berisi 3 bug, bukan kodemu dari bab lain.
      Ingat: <b>golem batu harus dilompati saat tertidur</b> (bukan Maju).
      Jalankan, lihat di mana kesatria gagal, lalu perbaiki.
      <span>Tombol "Muat ulang program" mengembalikan rencana ini.</span></div>`);
    // Ditutup sekali = tidak muncul lagi untuk bab ini (per slot simpan).
    main.querySelector('.note-close').onclick = () => {
      store('hiddenNotes', [...new Set([...load('hiddenNotes', []), stage.id])]);
      sfx('click');
      renderProgram();
      programEl.querySelector('.pitem')?.focus();
    };
  }
  if (hasFn()) main.insertAdjacentHTML('beforeend', '<div class="list-label">Program utama</div>');
  main.appendChild(renderList(program, 'main'));
  programEl.appendChild(main);

  if (hasFn()) {
    const fw = document.createElement('div');
    fw.className = 'fn-wrap';
    fw.innerHTML = `<div class="list-label">${svg('call')} Fungsi <input id="fnNameInput" maxlength="20" value="${esc(fnName)}" title="Nama fungsi"></div>`;
    const input = fw.querySelector('input');
    input.addEventListener('change', () => { fnName = input.value.trim() || 'Fungsi'; changed(); });
    fw.appendChild(renderList(fnBody, 'fn'));
    programEl.appendChild(fw);
  }
  programEl.scrollTop = scroll;
  if (keepId != null) programEl.querySelector(`.pitem[data-id="${keepId}"]`)?.focus({ preventScroll: false });
}

function moveNode(id, delta) {
  const f = findNode(id);
  if (!f) return;
  const j = f.index + delta;
  if (j < 0 || j >= f.list.length) return;
  [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]];
  sfx('click');
  changed();
}

const listName = (listId) => {
  if (listId === 'main') return 'program utama';
  if (listId === 'fn') return `fungsi ${fnName}`;
  const [id, part] = listId.split(':');
  const n = findNode(+id)?.node;
  return part === 'else' ? 'bagian "lainnya"' : n?.type === 'if' ? 'bagian "maka"' : 'isi Ulangi';
};

function renderList(list, listId) {
  const el = document.createElement('div');
  el.className = 'plist';
  el.dataset.list = listId;
  if (listId === activeList) el.classList.add('active');
  if (!list.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = listId === 'main' ? 'Letakkan blok di sini'
      : listId === 'fn' ? 'Klik di sini, lalu isi fungsi' : 'Klik di sini, lalu tambah blok';
    el.appendChild(e);
  }
  list.forEach((n, i) => el.appendChild(renderNode(n, i)));

  el.addEventListener('click', (e) => {
    if (e.target.closest('.plist') !== el) return;
    if (e.target.closest('.pitem')?.parentElement === el) return;
    activeList = listId;
    renderProgram();
  });
  el.addEventListener('dragover', (e) => {
    if (!drag) return;
    e.stopPropagation();
    if (drag.kind === 'move') {
      const f = findNode(drag.id);
      if (f && containsList(f.node, listId)) { dropGhost?.remove(); ghostKey = ''; return; } // tidak boleh masuk ke dirinya sendiri
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.kind === 'new' ? 'copy' : 'move';
    showDropLine(el, dropIndex(el, e.clientY));
  });
  el.addEventListener('drop', (e) => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    const idx = dropIndex(el, e.clientY);
    const target = getList(listId);
    if (drag.kind === 'new') {
      if (canAdd()) {
        const n = newNode(drag.type);
        target.splice(idx, 0, n);
        if (n.type === 'repeat') activeList = String(n.id);
        if (n.type === 'if') activeList = `${n.id}:then`;
      }
    } else {
      const f = findNode(drag.id);
      if (f) {
        let i = idx;
        if (f.list === target && f.index < idx) i--;
        f.list.splice(f.index, 1);
        target.splice(i, 0, f.node);
      }
    }
    endDrag();
    changed();
  });
  return el;
}

function renderNode(n, i) {
  const el = document.createElement('div');
  el.className = 'pitem';
  el.dataset.id = n.id;
  if (n.id === failCauseId) el.classList.add('cause');
  el.draggable = true;
  el.tabIndex = 0;
  el.setAttribute('role', 'listitem');
  el.setAttribute('aria-label', `${i + 1}. ${n.type === 'call' ? 'Panggil ' + fnName : BLOCKS[n.type].label}`);
  el.title = 'Delete: hapus · Alt+↑/↓: geser' + (n.type === 'repeat' || n.type === 'if' ? ' · Enter: isi blok ini' : '');
  el.addEventListener('keydown', (e) => {
    if (e.target !== el || running) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const f = findNode(n.id);
      const next = f && (f.list[f.index + 1] || f.list[f.index - 1]);
      deleteNode(n.id);
      if (next) programEl.querySelector(`.pitem[data-id="${next.id}"]`)?.focus();
      else runBtn.focus();
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      moveNode(n.id, e.key === 'ArrowUp' ? -1 : 1);
    } else if ((e.key === 'Enter' || e.key === ' ') && (n.type === 'repeat' || n.type === 'if')) {
      e.preventDefault();
      activeList = n.type === 'repeat' ? String(n.id) : `${n.id}:then`;
      if (n.type === 'if' && e.shiftKey) activeList = `${n.id}:else`;
      renderProgram(n.id);
      showToast(`Blok baru akan masuk ke ${listName(activeList)}. Esc untuk kembali.`);
    }
  });
  el.style.setProperty('--cat', catVar(n.type));
  const del = '<button class="del" title="Hapus">×</button>';
  const num = `<span class="num">${i + 1}</span>`;

  if (n.type === 'repeat') {
    el.classList.add('box');
    el.innerHTML = `<div class="rhead">${num}${svg('repeat')}<span>Ulangi</span>
      <input type="number" min="1" max="20" value="${n.count}" title="jumlah ulang"><span class="lbl">kali</span>${del}</div>`;
    const input = el.querySelector('input');
    input.addEventListener('change', () => {
      n.count = Math.max(1, Math.min(20, Math.round(+input.value) || 1));
      input.value = n.count;
      saveProgram();
    });
    const body = renderList(n.body, String(n.id));
    body.classList.add('rbody');
    el.appendChild(body);
  } else if (n.type === 'if') {
    el.classList.add('box');
    const opts = Object.entries(CONDITIONS)
      .map(([k, v]) => `<option value="${k}" ${k === n.cond ? 'selected' : ''}>${v}</option>`).join('');
    el.innerHTML = `<div class="rhead">${num}${svg('if')}<span>Jika</span><select title="kondisi">${opts}</select><span>maka</span>${del}</div>`;
    const sel = el.querySelector('select');
    sel.addEventListener('change', () => { n.cond = sel.value; saveProgram(); });
    const thenEl = renderList(n.then, `${n.id}:then`);
    thenEl.classList.add('rbody');
    const elseLbl = document.createElement('div');
    elseLbl.className = 'else-label';
    elseLbl.textContent = 'lainnya';
    const elseEl = renderList(n.else, `${n.id}:else`);
    elseEl.classList.add('rbody');
    el.append(thenEl, elseLbl, elseEl);
  } else if (n.type === 'call') {
    el.innerHTML = `${num}${svg('call')}<span class="lbl">Panggil <b>${esc(fnName)}</b></span>${del}`;
  } else {
    el.innerHTML = `${num}${svg(n.type)}<span class="lbl">${BLOCKS[n.type].label}</span>${del}`;
  }
  for (const inp of el.querySelectorAll(':scope > .rhead input, :scope > .rhead select')) {
    inp.addEventListener('mousedown', (e) => e.stopPropagation());
    inp.addEventListener('click', (e) => e.stopPropagation());
  }
  el.querySelector('.del').addEventListener('click', (e) => { e.stopPropagation(); if (!running) deleteNode(n.id); });
  el.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    if (running || ['INPUT', 'SELECT'].includes(document.activeElement?.tagName) && el.contains(document.activeElement)) return e.preventDefault();
    drag = { kind: 'move', id: n.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(n.id));
    // dipasang satu frame kemudian (agar gambar seret tidak ikut pudar), tapi hanya bila seret masih berlangsung
    requestAnimationFrame(() => { if (drag?.kind === 'move' && drag.id === n.id) el.classList.add('dragging'); });
  });
  el.addEventListener('dragend', endDrag);
  return el;
}

// ---------- pratinjau posisi jatuh: blok bayangan ----------
// Blok bayangan (.drop-ghost) bukan .pitem, jadi tidak ikut dihitung dropIndex.
let dropGhost = null;
let ghostKey = '';
function dropIndex(listEl, y) {
  const items = [...listEl.children].filter((c) => c.classList.contains('pitem'));
  for (let i = 0; i < items.length; i++) {
    const r = items[i].getBoundingClientRect();
    if (y < r.top + r.height / 2) return i;
  }
  return items.length;
}
function ghostContent(listEl, idx) {
  const moving = drag.kind === 'move' ? findNode(drag.id) : null;
  const n = moving?.node;
  const type = n ? n.type : drag.type;
  const label = type === 'repeat' ? `Ulangi ${n?.count ?? 2} kali`
    : type === 'if' ? `Jika ${CONDITIONS[n?.cond ?? 'monster']}`
    : type === 'call' ? `Panggil ${fnName}`
    : BLOCKS[type].label;
  const inner = n ? childLists(n).reduce((s, l) => s + countBlocks(l), 0) : 0;
  // nomor akhir: kalau dipindah ke bawah di daftar yang sama, posisinya bergeser satu
  const sameList = moving && moving.list === getList(listEl.dataset.list);
  const pos = sameList && moving.index < idx ? idx : idx + 1;
  return {
    type,
    html: `<span class="num">${pos}</span>${svg(type)}<span class="lbl">${esc(label)}</span>`
      + (inner ? `<span class="ghost-tag">+${inner} di dalam</span>` : '')
      + `<span class="ghost-tag">${moving ? 'pindah ke sini' : 'baru'}</span>`,
  };
}
function showDropLine(listEl, idx) {
  programEl.classList.remove('will-delete');
  const items = [...listEl.children].filter((c) => c.classList.contains('pitem'));
  const key = `${listEl.dataset.list}:${idx}`;
  if (!dropGhost) {
    dropGhost = document.createElement('div');
    dropGhost.className = 'drop-ghost';
    dropGhost.setAttribute('aria-hidden', 'true');
  }
  if (key !== ghostKey || !dropGhost.isConnected) {
    const { type, html } = ghostContent(listEl, idx);
    dropGhost.style.setProperty('--cat', catVar(type));
    dropGhost.innerHTML = html;
    ghostKey = key;
  }
  const before = items[idx] || null;
  if (dropGhost.parentNode !== listEl || dropGhost.nextSibling !== before) listEl.insertBefore(dropGhost, before);
}
function endDrag() {
  drag = null;
  ghostKey = '';
  dropGhost?.remove();
  programEl.classList.remove('will-delete');
  document.querySelectorAll('.pitem.dragging').forEach((e) => e.classList.remove('dragging'));
}
// seret blok keluar area program = hapus (pratinjau: bayangan hilang, program diberi tanda hapus)
document.addEventListener('dragover', (e) => {
  if (drag?.kind !== 'move') return;
  e.preventDefault();
  dropGhost?.remove();
  ghostKey = '';
  programEl.classList.add('will-delete');
});
document.addEventListener('drop', (e) => {
  if (drag?.kind === 'move' && !programEl.contains(e.target)) { e.preventDefault(); deleteNode(drag.id); }
  endDrag();
});

const maxId = (list) => list.reduce((m, n) => Math.max(m, n.id, ...childLists(n).map(maxId)), 0);
// Program selalu disimpan ke stage pemiliknya (yang memuatnya), bukan `stage` yang sedang
// tampil: pratinjau editor mengganti `stage` tanpa mengganti program.
let programOwner = null;
// Kode bab cerita hanya disimpan setelah bab itu meraih 3 bintang. Sebelum itu pemain
// harus menyusun ulang dari awal setiap kali membuka bab, untuk mengejar 3 bintang.
// Level custom selalu disimpan (tidak ada bintang untuk dikejar).
function keepsCode(id) {
  if (!LEVELS.some((l) => l.id === id)) return true;
  return (progress().stars[id] || 0) >= 3;
}
function saveProgram() {
  if (programOwner == null) return;
  if (!keepsCode(programOwner)) { removeSaved('prog.' + programOwner); return; }
  store('prog.' + programOwner, { program, fnBody, fnName });
}
function loadProgram() {
  programOwner = stage.id;
  const saved = keepsCode(stage.id) ? load('prog.' + stage.id, null) : null;
  if (saved) {
    program = saved.program || [];
    fnBody = saved.fnBody || [];
    fnName = saved.fnName || stage.fnName || 'Fungsi';
  } else {
    program = stage.initialProgram ? fromCompact(stage.initialProgram) : [];
    fnBody = [];
    fnName = stage.fnName || 'Fungsi';
  }
  bumpId(Math.max(maxId(program), maxId(fnBody)));
  activeList = 'main';
}

document.getElementById('btnClear').onclick = () => {
  if (running) return;
  program = stage.initialProgram ? fromCompact(stage.initialProgram) : [];
  fnBody = [];
  activeList = 'main';
  changed();
};

// ------------------------------------------------------------
//  HUD: timer, bintang, jumlah blok
// ------------------------------------------------------------
const timerEl = document.getElementById('timer');
const starGoalEl = document.getElementById('starGoal');
const blockEl = document.getElementById('blockCount');
let elapsed = 0;
let stageDone = false;
let blockingUI = 0; // >0 saat cutscene/dialog pembuka tampil
let timeUpWarned = false;
const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const starsFor = (t) => (t < stage.stars[0] ? 3 : t < stage.stars[1] ? 2 : t < stage.stars[2] ? 1 : 0);

function updateHud() {
  const left = stage.time - elapsed;
  // Tulis ke DOM hanya bila nilainya berubah. Peringatan tidak hanya lewat warna: ada ikon/teks juga.
  const put = (el, prop, v) => { if (el[prop] !== v) el[prop] = v; };
  put(timerEl, 'textContent', left <= 0 ? '⏱ Waktu habis' : left < 20 ? `⚠ ${fmt(left)}` : `⏱ ${fmt(left)}`);
  put(timerEl, 'className', 'chip' + (left <= 0 ? ' over' : left < 20 ? ' warn' : ''));
  const s = starsFor(elapsed);
  const nextDrop = s > 0 ? stage.stars[3 - s] - elapsed : 0;
  put(starGoalEl, 'innerHTML', s > 0
    ? `<span class="star">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span> <span class="dim">sisa ${fmt(nextDrop)}</span>`
    : '<span class="star">☆☆☆</span> <span class="dim">tanpa bintang</span>');
  const n = totalBlocks();
  const full = stage.limit && n >= stage.limit;
  put(blockEl, 'textContent', stage.limit ? `Blok ${n}/${stage.limit}${full ? ' · penuh' : ''}` : `Blok ${n}`);
  put(blockEl, 'className', 'chip' + (full ? ' warn' : ''));
}

let lastTick = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  const menuOpen = !document.getElementById('pauseOverlay').hidden || !document.getElementById('slotOverlay').hidden || !document.getElementById('blockOverlay').hidden || !document.getElementById('dialogOverlay').hidden || !document.getElementById('askOverlay').hidden || !document.getElementById('profileOverlay').hidden || !document.getElementById('settingsOverlay').hidden || !document.getElementById('stageOverlay').hidden;
  const active = !paused && !running && !editing && !stageDone && !menuOpen && blockingUI === 0 && document.getElementById('titleOverlay').hidden && document.visibilityState === 'visible';
  if (!active) return;
  elapsed += dt;
  if (elapsed >= stage.time && !timeUpWarned) {
    timeUpWarned = true;
    sfx('fail');
    showToast('Waktu habis! Kamu tetap bisa menyelesaikan stage, tapi tanpa bintang.');
  }
  updateHud();
}, 200);

// ------------------------------------------------------------
//  Menjalankan program
// ------------------------------------------------------------
const runBtn = document.getElementById('btnRun');
let failCount = 0;
let failCauseId = null; // blok penyebab kegagalan terakhir (ditandai "Sebab")

function highlight(id) {
  programEl.querySelectorAll('.pitem.running').forEach((e) => e.classList.remove('running'));
  if (id == null) return;
  const el = programEl.querySelector(`.pitem[data-id="${id}"]`);
  if (el) { el.classList.add('running'); el.scrollIntoView({ block: 'nearest' }); }
}
function flashEval(id, result) {
  const el = programEl.querySelector(`.pitem[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove('eval-true', 'eval-false');
  el.classList.add(result ? 'eval-true' : 'eval-false');
  el.scrollIntoView({ block: 'nearest' });
  setTimeout(() => el.classList.remove('eval-true', 'eval-false'), 700);
}

function setRunning(v) {
  running = v;
  runBtn.disabled = v;
  programEl.style.pointerEvents = v ? 'none' : '';
}

async function run() {
  if (running || stageDone) return;
  if (!program.length) return showToast('Tambahkan blok dulu');
  bumpStat('runs');
  closeDialog();
  const token = ++runToken;
  world.reset();
  resetVisual();
  setRunning(true);
  failCauseId = null;
  programEl.querySelectorAll('.pitem.cause').forEach((e) => e.classList.remove('cause'));
  let reason = null;
  let causeId = null, lastId = null, golemBumpId = null;
  try {
    for (const y of interpret(program, fnBody, world)) {
      if (token !== runToken) return;
      lastId = y.node.id;
      if (y.kind === 'eval') {
        highlight(y.node.id);
        flashEval(y.node.id, y.result);
        sfx('eval');
        await showSensorEval(y.node.cond, y.result, token);
        continue;
      }
      if (y.kind === 'call') {
        highlight(y.node.id);
        await tween(dur(200), () => {}, token);
        continue;
      }
      highlight(y.node.id);
      const ev = world.step(y.node.type);
      await animateEvent(ev, token);
      if (token !== runToken) return;
      syncWorld();
      if (ev.golem && golemBumpId == null) golemBumpId = y.node.id;
      if (ev.result === 'fall') reason = ev.river ? 'river' : 'fall';
      else if (ev.result === 'trap' || ev.result === 'caught') reason = ev.result;
      if (reason && causeId == null) causeId = y.node.id;
      await tween(dur(80), () => {}, token);
    }
  } catch (e) {
    if (!(e instanceof LimitError)) throw e;
    reason = e.kind;
  }
  if (token !== runToken) return;
  highlight(null);
  setRunning(false);
  if (world.status === 'won') onWin();
  else onFail(reason || (golemBumpId != null ? 'golem' : 'incomplete'), causeId ?? golemBumpId ?? lastId);
}

// Sub-tema "sebab akibat": sebutkan blok penyebab dan akibatnya, lalu tandai bloknya.
function causeText(reason, id) {
  const f = id != null ? findNode(id) : null;
  if (!f) return null;
  const label = f.node.type === 'call' ? `Panggil ${fnName}` : BLOCKS[f.node.type].label;
  const where = f.list === fnBody ? ` di Fungsi "${fnName}"` : f.list === program ? '' : ' (di dalam blok lain)';
  const blok = `blok ${f.index + 1} "${label}"${where}`;
  return reason === 'incomplete' ? `program berhenti setelah ${blok}` : blok;
}
function onFail(reason, causeId) {
  sfx('fail');
  failCount++;
  bumpStat('fails');
  const hint = hintsFor(stage)[Math.min(failCount, 3) - 1];
  const sebab = causeText(reason, causeId);
  failCauseId = sebab ? causeId : null;
  if (failCauseId != null) programEl.querySelector(`.pitem[data-id="${failCauseId}"]`)?.classList.add('cause');
  const lines = [['princess', FAIL_LINES[reason]], ['princess', hint]];
  if (sebab) lines.unshift(['narrator', `Sebab: ${sebab}. → Akibat: ${EFFECT_LINES[reason]}.`]);
  say(lines);
}

function onWin() {
  stageDone = true;
  sfx('win');
  bumpStat('wins');
  const s = starsFor(elapsed);
  if (stage.custom) {
    const dft = customs().find((c) => c.id === stage.id);
    if (dft) { dft.verified = true; dft.best = Math.max(dft.best ?? 0, s); saveCustom(dft); }
  } else {
    const p = progress();
    p.stars[stage.id] = Math.max(p.stars[stage.id] || 0, s);
    p.unlocked = Math.max(p.unlocked, Math.min(LEVELS.length, stage.id + 1));
    store('progress', p);
    saveProgram(); // 3 bintang -> kode pemenang mulai disimpan
  }
  document.getElementById('winStars').innerHTML =
    `${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span>`;
  document.getElementById('winTitle').textContent = stage.custom ? 'Level selesai!' : `${chapterOf(stage)} selesai!`;
  document.getElementById('winText').textContent =
    `Bagus sekali, ${playerName()}! Waktu menyusun ${fmt(elapsed)} · ${totalBlocks()} blok. "${WIN_LINES[stage.id] ?? 'Level buatanmu berhasil diselesaikan!'}"` +
    (!stage.custom && !keepsCode(stage.id) ? ' Kodemu belum disimpan: susun ulang dari awal untuk meraih 3 bintang!' : '');
  document.getElementById('winEng').innerHTML =
    `<b>Konsep:</b> ${stage.concept}<br><b>Engineering:</b> ${stage.engineering}` +
    (stage.subtheme ? `<br><b>Sub-tema:</b> ${stage.subtheme}` : '') +
    '<br><i>Setiap langkah kecilmu adalah sebab; pintu yang terbuka adalah akibatnya.</i>';
  document.getElementById('btnNext').textContent = stage.custom ? 'Edit level ›' : stage.id === LEVELS.length ? 'Epilog ›' : 'Bab berikutnya ›';
  setTimeout(() => { document.getElementById('winOverlay').hidden = false; }, 500);
}

function stop() {
  runToken++;
  highlight(null);
  setRunning(false);
  world.reset();
  resetVisual();
}

runBtn.onclick = run;
document.getElementById('btnReset').onclick = stop;
speedEl.value = load('speed', 2);
speedEl.oninput = () => store('speed', +speedEl.value);

// ------------------------------------------------------------
//  Dialog putri, toast, cutscene
// ------------------------------------------------------------
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

const dialogEl = document.getElementById('dialog');
const dialogOverlay = document.getElementById('dialogOverlay');
const dlgCast = document.getElementById('dlgCast');
const dlgActorLeft = document.getElementById('dlgActorLeft');
const dlgActorRight = document.getElementById('dlgActorRight');
const dlgPopCard = dialogOverlay.querySelector('.dialog-card');
const dlgPopKicker = document.getElementById('dlgPopKicker');
const dlgPopIcon = document.getElementById('dlgPopIcon');
const dlgPopName = document.getElementById('dlgPopName');
const dlgPopText = document.getElementById('dlgPopText');
const dlgPopBody = document.getElementById('dlgPopBody');
const dlgPopDots = document.getElementById('dlgPopDots');
const dlgPopPrev = document.getElementById('dlgPopPrev');
const dlgPopNext = document.getElementById('dlgPopNext');
const dlgPopSkip = document.getElementById('dlgPopSkip');

const brokenPortraits = new Set();
for (const sp of Object.values(SPEAKERS)) {
  if (sp?.portrait) { const im = new Image(); im.src = sp.portrait; }
}
function renderPortraitCircle(el, sp) {
  if (!el) return;
  if (!sp?.portrait || brokenPortraits.has(sp.portrait)) { el.innerHTML = sp?.icon || ''; return; }
  if (el.querySelector('img.portrait-img')?.getAttribute('src') === sp.portrait) return;
  const img = document.createElement('img');
  img.className = 'portrait-img';
  img.alt = '';
  img.decoding = 'async';
  img.onerror = () => { brokenPortraits.add(sp.portrait); el.innerHTML = sp.icon || ''; };
  img.src = sp.portrait;
  el.replaceChildren(img);
}
renderPortraitCircle(document.getElementById('hintSeal'), SPEAKERS.princess);

function syncActor(slotEl, speakerKey, isActive) {
  const asp = speakerKey ? SPEAKERS[speakerKey] : null;
  if (!asp?.portrait || brokenPortraits.has(asp.portrait)) {
    slotEl.hidden = true;
    slotEl.classList.remove('enter', 'active', 'inactive', 'flip');
    delete slotEl.dataset.speaker;
    return false;
  }
  const wasHidden = slotEl.hidden;
  const img = slotEl.querySelector('.dlg-sprite');
  if (img.getAttribute('src') !== asp.portrait) {
    img.onerror = () => {
      brokenPortraits.add(asp.portrait);
      slotEl.hidden = true;
      if (![dlgActorLeft, dlgActorRight].some((el) => !el.hidden)) dlgCast.hidden = true;
      if (dialogState && dialogState.lines[dialogState.i]?.[0] === speakerKey) {
        dlgPopCard.dataset.hasSprite = '0';
        dlgPopCard.dataset.side = 'center';
        dlgPopIcon.hidden = false;
        renderPortraitCircle(dlgPopIcon, asp);
      }
    };
    img.src = asp.portrait;
  }
  slotEl.dataset.speaker = speakerKey;
  slotEl.classList.toggle('flip', !!asp.flip);
  slotEl.classList.toggle('active', isActive);
  slotEl.classList.toggle('inactive', !isActive);
  slotEl.hidden = false;
  if (wasHidden) {
    slotEl.classList.remove('enter');
    void slotEl.offsetWidth;
    slotEl.classList.add('enter');
  }
  return true;
}

let dialogState = null;
function say(lines, { blocking = false } = {}) {
  closeDialog();
  return new Promise((resolve) => {
    dialogState = { lines, i: 0, resolve, blocking, lastSpeaker: null };
    if (blocking) blockingUI++;
    dialogEl.classList.toggle('blocking', blocking);
    showLine();
  });
}
function showLine() {
  const { lines, i, blocking } = dialogState;
  const [who, text] = lines[i];
  const sp = SPEAKERS[who];
  if (blocking) {
    dialogEl.hidden = true;
    dlgPopKicker.textContent = stage.custom ? stage.name : `${chapterOf(stage)} · ${stage.name}`;
    dlgPopCard.dataset.speaker = who;

    const hasPic = (k) => !!(SPEAKERS[k]?.portrait && !brokenPortraits.has(SPEAKERS[k].portrait));
    const sideOf = (k) => SPEAKERS[k]?.side || 'center';
    const distinctSides = new Set(lines.filter(([w]) => hasPic(w)).map(([w]) => sideOf(w)));
    const layout = distinctSides.size > 1 ? 'duo' : 'solo';
    dlgCast.dataset.layout = layout;

    let leftKey = null, rightKey = null;
    for (let k = 0; k <= i; k++) {
      const w = lines[k][0];
      if (!hasPic(w)) continue;
      if (sideOf(w) === 'right') rightKey = w;
      else leftKey = w;
    }
    const leftShown = syncActor(dlgActorLeft, leftKey, who === leftKey);
    const rightShown = syncActor(dlgActorRight, rightKey, who === rightKey);
    dlgCast.hidden = !leftShown && !rightShown;

    const activeHasSprite = (who === leftKey && leftShown) || (who === rightKey && rightShown);
    dlgPopCard.dataset.hasSprite = activeHasSprite ? '1' : '0';
    dlgPopCard.dataset.side = activeHasSprite && layout === 'duo' ? sideOf(who) : 'center';
    dlgPopIcon.hidden = activeHasSprite;
    if (!activeHasSprite) {
      renderPortraitCircle(dlgPopIcon, sp);
      if (dialogState.lastSpeaker !== who) {
        dlgPopIcon.style.animation = 'none';
        void dlgPopIcon.offsetWidth;
        dlgPopIcon.style.animation = '';
      }
    }
    dialogState.lastSpeaker = who;

    dlgPopName.textContent = sp.name;
    dlgPopText.textContent = personalize(text);
    dlgPopText.style.animation = 'none';
    void dlgPopText.offsetWidth;
    dlgPopText.style.animation = '';
    dlgPopBody.scrollTop = 0;
    dlgPopDots.innerHTML = lines.length > 1
      ? lines.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')
      : '';
    dlgPopPrev.style.visibility = i === 0 ? 'hidden' : 'visible';
    dlgPopNext.textContent = i < lines.length - 1 ? 'Lanjut ›' : 'Mulai!';
    if (dialogOverlay.hidden) dialogOverlay.hidden = false;
    return;
  }
  dialogOverlay.hidden = true;
  renderPortraitCircle(document.getElementById('dlgIcon'), sp);
  document.getElementById('dlgName').textContent = sp.name;
  document.getElementById('dlgText').textContent = personalize(text);
  document.getElementById('dlgNext').textContent = i < lines.length - 1 ? 'Lanjut ›' : 'Tutup';
  dialogEl.hidden = false;
}
function closeDialog() {
  if (!dialogState) return;
  const s = dialogState;
  dialogState = null;
  if (s.blocking) blockingUI--;
  dialogEl.hidden = true;
  dialogOverlay.hidden = true;
  dlgActorLeft.hidden = true;
  dlgActorRight.hidden = true;
  dlgCast.hidden = true;
  s.resolve();
}
document.getElementById('dlgNext').onclick = () => {
  if (!dialogState) return;
  sfx('click');
  if (dialogState.i < dialogState.lines.length - 1) { dialogState.i++; showLine(); } else closeDialog();
};
dlgPopNext.onclick = () => {
  if (!dialogState) return;
  sfx('click');
  if (dialogState.i < dialogState.lines.length - 1) { dialogState.i++; showLine(); } else closeDialog();
};
dlgPopPrev.onclick = () => {
  if (!dialogState || dialogState.i <= 0) return;
  sfx('click');
  dialogState.i--;
  showLine();
  if (dialogState.i === 0) dlgPopNext.focus();
};
dlgPopSkip.onclick = () => {
  if (!dialogState) return;
  sfx('click');
  closeDialog();
};
document.getElementById('btnHint').onclick = () => {
  sfx('click');
  say([['princess', hintsFor(stage)[Math.min(failCount, 2)]]]);
};

const storyEl = document.getElementById('storyOverlay');
const storyCardEl = storyEl.querySelector('.story-card');
const storyArtEl = document.getElementById('storyArt');
const storyFlashEl = document.getElementById('storyFlash');

function playStory(label, slides, { moods = null, silenceMusic = false, finishLabel = 'Selesai' } = {}) {
  blockingUI++;
  if (silenceMusic) { epilogSilent = true; updateMusic(); }
  return new Promise((resolve) => {
    let i = 0;
    const show = () => {
      document.getElementById('storyLabel').textContent = label;
      const p = document.getElementById('storyText');
      p.textContent = personalize(slides[i]);
      p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
      if (moods) {
        const mood = moods[i] || '';
        storyEl.dataset.mood = mood;
        if (mood === 'reveal') {
          sfx('reveal');
          storyCardEl.classList.remove('shake'); void storyCardEl.offsetWidth; storyCardEl.classList.add('shake');
          storyFlashEl.classList.remove('go'); void storyFlashEl.offsetWidth; storyFlashEl.classList.add('go');
        } else {
          storyCardEl.classList.remove('shake');
          storyFlashEl.classList.remove('go');
        }
      }
      document.getElementById('storyDots').textContent = `${i + 1} / ${slides.length}`;
      document.getElementById('storyNext').textContent = i < slides.length - 1 ? 'Lanjut ›' : finishLabel;
    };
    const done = () => {
      storyEl.hidden = true;
      storyEl.removeAttribute('data-mood');
      storyEl.classList.remove('is-epilog');
      storyCardEl.classList.remove('shake');
      storyFlashEl.classList.remove('go');
      storyArtEl.hidden = true;
      blockingUI--;
      if (silenceMusic) { epilogSilent = false; updateMusic(); }
      document.getElementById('storyNext').onclick = null;
      document.getElementById('storySkip').onclick = null;
      resolve();
    };
    document.getElementById('storyNext').onclick = () => {
      const nextIdx = i + 1;
      if (!(moods && moods[nextIdx] === 'reveal')) sfx('click');
      if (++i < slides.length) show(); else done();
    };
    document.getElementById('storySkip').onclick = done;
    storyArtEl.hidden = !moods;
    storyEl.classList.toggle('is-epilog', !!moods);
    storyEl.hidden = false;
    show();
  });
}

const hasFinishedCampaign = () => {
  const lastId = LEVELS[LEVELS.length - 1]?.id;
  return progress().stars[lastId] != null || !!load('seenEpilog', false);
};
async function playEpilog({ finishLabel = 'Kembali ke Sampul' } = {}) {
  await playStory('Epilog', EPILOG, {
    moods: EPILOG_MOODS,
    silenceMusic: true,
    finishLabel,
  });
  store('seenEpilog', true);
  renderTitle();
}

// ------------------------------------------------------------
//  Alur stage
// ------------------------------------------------------------
const CUSTOM_HINTS = [
  'Putar kamera dengan menyeret untuk melihat peta dari sudut lain. Rencanakan jalurnya dulu.',
  'Pecah jalur menjadi bagian kecil. Ada pola yang berulang? Gunakan Ulangi atau Fungsi.',
  'Kalau ada monster, tanyakan padaku: Jika monster tertidur, Maju; lainnya Tunggu.',
];
const hintsFor = (lv) => HINTS[lv.id] || CUSTOM_HINTS;

// introduceBlocks: tampilkan kartu blok yang dikenalkan di bab ini walau sudah pernah dilihat
// (dipakai tombol "Bab berikutnya").
async function startLevel(lv, { intro = true, introduceBlocks = false } = {}) {
  runToken++;
  setRunning(false);
  highlight(null);
  closePause();
  closeDialog();
  exitEditor();
  if (stage !== lv) bgfx.boost(); // latar berputar cepat 1 detik saat ganti bab
  stage = lv;
  world = new World(stage);
  if (!lv.custom) store('last', LEVELS.indexOf(lv));
  document.getElementById('stageTitle').textContent = lv.custom ? 'LEVEL CUSTOM' : chapterOf(stage);
  document.getElementById('btnEditLevel').hidden = !lv.custom;
  document.getElementById('stageSub').textContent = stage.name;
  document.getElementById('concept').innerHTML =
    `Konsep: <b>${esc(stage.concept)}</b><br>Engineering: <b>${esc(stage.engineering)}</b>` +
    (stage.subtheme ? `<br>Sub-tema: <b>${esc(stage.subtheme)}</b>` : '');
  document.getElementById('clearLabel').textContent = stage.initialProgram ? 'Muat ulang program' : 'Hapus semua';
  buildBoard();
  applyMonsterModels();
  resetVisual();
  loadProgram();
  renderPalette();
  renderProgram();
  elapsed = 0;
  failCount = 0;
  stageDone = false;
  timeUpWarned = false;
  updateHud();
  startMusic();
  if (!intro) return;
  // Kartu "Blok Baru!" langsung saat bab dibuka, sebelum dialog cerita.
  const seen = new Set(load('seenBlocks', []));
  const prev = LEVELS[LEVELS.indexOf(lv) - 1];
  const introducedHere = (b) => (prev ? !prev.blocks.includes(b) : !lv.custom);
  const fresh = lv.blocks.filter((b) => !seen.has(b) || (introduceBlocks && introducedHere(b)));
  if (fresh.length) {
    store('seenBlocks', [...new Set([...seen, ...fresh])]); // tandai saat ditampilkan, agar tidak muncul ulang
    await showBlockCards(fresh, { isNew: true });
    if (stage !== lv || !titleEl.hidden) return; // pemain sudah pindah bab atau kembali ke sampul saat kartu terbuka
  }
  if (STAGE_INTRO[stage.id]) await say(STAGE_INTRO[stage.id], { blocking: true });
  else if (lv.custom) say([['princess', `Level buatan: "${lv.name}". Ayo kita coba!`]]);
}

// ------------------------------------------------------------
//  Kartu blok baru / kamus blok
// ------------------------------------------------------------
const SHORT_TYPE = { maju: 'move', kiri: 'left', kanan: 'right', lompat: 'jump', tuas: 'lever', tunggu: 'wait', panggil: 'call' };
function miniList(list, hl, fnLabel) { return list.map((it, i) => miniNode(it, i, hl, fnLabel)).join(''); }
function miniNode(it, i, hl, fnLabel) {
  const num = `<span class="num">${i + 1}</span>`;
  if (typeof it === 'string') {
    const t = SHORT_TYPE[it];
    const lbl = t === 'call' ? `Panggil <b>${esc(fnLabel)}</b>` : BLOCKS[t].label;
    return `<div class="pitem${t === hl ? ' hl' : ''}" role="listitem" style="--cat:${catVar(t)}">${num}${svg(t)}<span class="lbl">${lbl}</span></div>`;
  }
  const [kind, a, b, c] = it;
  if (kind === 'ulangi') {
    return `<div class="pitem box${hl === 'repeat' ? ' hl' : ''}" role="listitem" style="--cat:${catVar('repeat')}">
      <div class="rhead">${num}${svg('repeat')}<span>Ulangi <b>${a}</b> kali</span></div>
      <div class="plist rbody">${miniList(b, hl, fnLabel)}</div></div>`;
  }
  return `<div class="pitem box${hl === 'if' ? ' hl' : ''}" role="listitem" style="--cat:${catVar('if')}">
    <div class="rhead">${num}${svg('if')}<span>Jika <b>${CONDITIONS[a]}</b> maka</span></div>
    <div class="plist rbody">${miniList(b, hl, fnLabel)}</div>
    <div class="else-label">lainnya</div>
    <div class="plist rbody">${miniList(c || [], hl, fnLabel)}</div></div>`;
}

const blockOverlay = document.getElementById('blockOverlay');
let blockCardsDone = null;
function showBlockCards(types, { isNew }) {
  blockCardsDone?.();
  const list = types.filter((t) => BLOCK_INFO[t]);
  if (!list.length) return Promise.resolve();
  let i = 0;
  const $ = (id) => document.getElementById(id);
  const draw = () => {
    const t = list[i];
    const info = BLOCK_INFO[t];
    const card = blockOverlay.querySelector('.block-card');
    card.style.setProperty('--cat', catVar(t));
    $('bkKicker').textContent = isNew ? (list.length > 1 ? `BLOK BARU! ${i + 1}/${list.length}` : 'BLOK BARU!') : `KAMUS BLOK ${i + 1}/${list.length}`;
    $('bkKicker').classList.toggle('dict', !isNew);
    const icon = $('bkIcon');
    icon.innerHTML = svg(t);
    icon.style.animation = 'none'; void icon.offsetWidth; icon.style.animation = '';
    $('bkName').textContent = BLOCKS[t].label;
    $('bkDesc').textContent = info.desc;
    const fnLabel = info.fnName || fnName;
    $('bkExample').innerHTML = miniList(info.example, t, fnLabel)
      + (info.fn ? `<div class="fn-def"><div class="list-label">${svg('call')} Fungsi ${esc(fnLabel)}</div>${miniList(info.fn, t, fnLabel)}</div>` : '');
    $('bkNote').textContent = info.note;
    $('bkTip').textContent = info.tip;
    $('bkDots').innerHTML = list.length > 1 ? list.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('') : '';
    // sembunyikan tanpa menghilangkan tempatnya, agar tombol Lanjut tidak bergeser
    $('bkPrev').style.visibility = i === 0 ? 'hidden' : 'visible';
    $('bkBody').scrollTop = 0;
    $('bkNext').textContent = i < list.length - 1 ? 'Lanjut ›' : isNew ? 'Mengerti!' : 'Tutup';
  };
  return new Promise((resolve) => {
    blockCardsDone = () => {
      blockCardsDone = null;
      blockOverlay.hidden = true;
      document.querySelectorAll('.pal-btn.new').forEach((b) => b.classList.add('flash'));
      resolve();
    };
    $('bkPrev').onclick = () => { if (i > 0) { i--; draw(); sfx('click'); $('bkNext').focus(); } };
    $('bkNext').onclick = () => { sfx('click'); if (i < list.length - 1) { i++; draw(); } else blockCardsDone(); };
    draw();
    if (isNew) sfx('newcard');
    blockOverlay.hidden = false;
  });
}
document.getElementById('btnBlockInfo').onclick = () => {
  // blok yang baru di bab ini tampil lebih dulu
  const prev = LEVELS[LEVELS.indexOf(stage) - 1];
  const isFresh = (t) => prev && !prev.blocks.includes(t);
  const order = [...stage.blocks.filter(isFresh), ...stage.blocks.filter((t) => !isFresh(t))];
  showBlockCards(order, { isNew: false });
};
blockOverlay.onclick = (e) => { if (e.target === blockOverlay) blockCardsDone?.(); };
const loadStage = (index, opts) => startLevel(LEVELS[index], opts);

// ------------------------------------------------------------
//  Level custom + editor
// ------------------------------------------------------------
const customs = () => load('custom', []);
function saveCustom(d) {
  const list = customs();
  const i = list.findIndex((c) => c.id === d.id);
  if (i >= 0) list[i] = structuredClone(d); else list.push(structuredClone(d));
  store('custom', list);
}
function deleteCustom(id) {
  store('custom', customs().filter((c) => c.id !== id));
  removeSaved('prog.' + id);
}

const titleEl = document.getElementById('titleOverlay');
// Layar utama memakai latar versi berkilau tanpa dunia 3D; saat bermain kembali ke versi tenang.
function syncTitleBg(instant = false) {
  requestAnimationFrame(layoutMenuPlane);
  const onTitle = !titleEl.hidden;
  document.body.classList.toggle('on-title', onTitle);
  bgfx.setPreset(onTitle ? 'menu' : 'game', { instant });
  updateMusic(); // volume menu vs. di dalam bab
}
new MutationObserver(() => syncTitleBg()).observe(titleEl, { attributes: true, attributeFilter: ['hidden'] });
syncTitleBg(true);
const stageOverlay = document.getElementById('stageOverlay');
const winOverlay = document.getElementById('winOverlay');

let editing = false;
const editor = createEditor(document.getElementById('editorView'), {
  preview(level, { resetCamera }) {
    stage = level;
    world = new World(level);
    buildBoard({ resetCamera });
    applyMonsterModels();
    resetVisual();
    document.getElementById('stageSub').textContent = level.name;
  },
  save: saveCustom,
  play(d) { saveCustom(d); startLevel(draftToLevel(d)); },
  share(d) { shareCode(encodeDraft(d)); },
  close(d) { saveCustom(d); exitEditor(); startLevel(draftToLevel(d), { intro: false }); openStages(); },
  toast: (m) => showToast(m),
  sfx,
});

function enterEditor(draft) {
  runToken++;
  setRunning(false);
  closeDialog();
  editing = true;
  document.body.classList.add('editing');
  document.getElementById('btnEditLevel').hidden = true;
  titleEl.hidden = true;
  stageOverlay.hidden = true;
  winOverlay.hidden = true;
  document.getElementById('stageTitle').textContent = 'EDITOR';
  document.getElementById('concept').innerHTML = 'Mode editor: gambar peta di panel kanan.<br>Pratinjau 3D diperbarui otomatis.';
  editor.open(draft);
}
function exitEditor() {
  if (!editing) return;
  editing = false;
  document.body.classList.remove('editing');
}

// ------------------------------------------------------------
//  Modal in-game (pengganti confirm/prompt bawaan browser): ikut screen stack,
//  fokus terkunci, bisa dipakai keyboard & gamepad.
//  ask({ title, text, input: 'line' | 'area' | null, value, readonly, ok, cancel, danger })
//  -> Promise: string (input), true (konfirmasi), atau null (batal).
// ------------------------------------------------------------
const askEl = document.getElementById('askOverlay');
let askResolve = null;
function ask({ title, text = '', input = null, value = '', readonly = false, ok = 'OK', cancel = 'Batal', danger = false, placeholder = '' }) {
  askResolve?.(null);
  const line = document.getElementById('askLine');
  const area = document.getElementById('askArea');
  const okBtn = document.getElementById('askOk');
  const cancelBtn = document.getElementById('askCancel');
  document.getElementById('askTitle').textContent = title;
  document.getElementById('askText').textContent = text;
  document.getElementById('askError').textContent = '';
  line.hidden = input !== 'line';
  area.hidden = input !== 'area';
  const field = input === 'line' ? line : input === 'area' ? area : null;
  if (field) { field.value = value; field.readOnly = readonly; field.placeholder = placeholder; }
  okBtn.textContent = ok;
  okBtn.classList.toggle('danger-run', danger);
  cancelBtn.textContent = cancel;
  cancelBtn.hidden = cancel == null;
  // fokus awal: kolom isian; untuk aksi berbahaya, tombol Batal (lebih aman)
  for (const el of [line, area, okBtn, cancelBtn]) el.removeAttribute('data-autofocus');
  (field && !readonly ? field : danger ? cancelBtn : okBtn).setAttribute('data-autofocus', '');
  askEl.hidden = false;
  if (field && readonly) setTimeout(() => field.select(), 0);
  return new Promise((resolve) => {
    askResolve = (v) => { askResolve = null; askEl.hidden = true; resolve(v); };
  });
}
// validasi opsional sebelum menutup: kembalikan pesan error untuk menahan modal tetap terbuka
let askValidate = null;
document.getElementById('askOk').onclick = () => {
  const line = document.getElementById('askLine'), area = document.getElementById('askArea');
  const v = !line.hidden ? line.value : !area.hidden ? area.value : true;
  const err = askValidate?.(v);
  if (err) { document.getElementById('askError').textContent = err; return; }
  askResolve?.(v);
};
document.getElementById('askCancel').onclick = () => askResolve?.(null);
document.getElementById('askLine').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('askOk').click(); });
askEl.onclick = (e) => { if (e.target === askEl) askResolve?.(null); };

async function shareCode(code) {
  const r = await ask({
    title: 'Bagikan level',
    text: 'Kirim kode ini ke temanmu. Mereka cukup menempelkannya lewat "Impor kode".',
    input: 'area', value: code, readonly: true, ok: 'Salin kode', cancel: 'Tutup',
  });
  if (r == null) return;
  try {
    await navigator.clipboard.writeText(code);
    showToast('Kode level disalin!');
  } catch {
    showToast('Tidak bisa menyalin otomatis. Pilih teksnya lalu tekan Ctrl+C.');
  }
}
async function importCode() {
  askValidate = (v) => { try { decodeDraft(v); return null; } catch (e) { return e.message; } };
  const code = await ask({
    title: 'Impor level', text: 'Tempel kode level dari temanmu.', input: 'area',
    placeholder: 'MSK1:…', ok: 'Impor',
  });
  askValidate = null;
  if (code == null) return;
  const d = decodeDraft(code);
  d.id = 'c' + Date.now().toString(36);
  saveCustom(d);
  showToast(`Level "${d.name}" berhasil diimpor`);
  openStages();
}

function openStages() {
  const grid = document.getElementById('stageGrid');
  const p = progress();
  grid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    const locked = lv.id > p.unlocked;
    const st = p.stars[lv.id];
    b.className = 'stage-card' + (lv === stage && titleEl.hidden ? ' current' : '');
    b.disabled = locked;
    b.innerHTML = `<span class="no">${locked ? ICON_LOCK : ''}${chapterOf(lv)}</span>
      <span class="nm">${lv.name}</span><span class="cp">${lv.concept}</span>
      <span class="st">${st != null ? '★'.repeat(st) + '☆'.repeat(3 - st) : '&nbsp;'}</span>`;
    b.onclick = () => { stageOverlay.hidden = true; titleEl.hidden = true; audio(); loadStage(i); };
    grid.appendChild(b);
  });

  const cg = document.getElementById('customGrid');
  cg.innerHTML = '';
  const list = customs();
  if (!list.length) cg.innerHTML = '<p class="empty-custom">Belum ada level buatan. Buat sendiri atau impor kode dari teman.</p>';
  for (const d of list) {
    const card = document.createElement('div');
    card.className = 'stage-card custom' + (stage.id === d.id && titleEl.hidden ? ' current' : '');
    const size = `${d.map[0].length}×${d.map.length}`;
    card.innerHTML = `<span class="nm">${esc(d.name)}</span>
      <span class="cp">${size} · ${d.verified ? '✓ sudah diuji' : 'belum diuji'}</span>
      <span class="st">${d.best != null ? '★'.repeat(d.best) + '☆'.repeat(3 - d.best) : '&nbsp;'}</span>
      <div class="card-actions">
        <button class="run small" data-a="play">Main</button>
        <button class="btn" data-a="edit">Edit</button>
        <button class="btn" data-a="share" title="Salin kode">Kode</button>
        <button class="btn danger" data-a="del" title="Hapus level"><svg viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg></button>
      </div>`;
    card.querySelector('[data-a=play]').onclick = () => { stageOverlay.hidden = true; titleEl.hidden = true; audio(); startLevel(draftToLevel(d)); };
    card.querySelector('[data-a=edit]').onclick = () => { audio(); enterEditor(d); };
    card.querySelector('[data-a=share]').onclick = () => shareCode(encodeDraft(d));
    card.querySelector('[data-a=del]').setAttribute('aria-label', `Hapus level ${d.name}`);
    card.querySelector('[data-a=del]').onclick = async () => {
      const yes = await ask({
        title: 'Hapus level?', danger: true, ok: 'Hapus permanen',
        text: `Level "${d.name}" akan dihapus dari perangkat ini dan tidak bisa dikembalikan. Bagikan kodenya dulu kalau ingin menyimpan salinan.`,
      });
      if (!yes) return;
      deleteCustom(d.id);
      showToast(`Level "${d.name}" dihapus`);
      openStages();
    };
    cg.appendChild(card);
  }
  document.getElementById('btnStageEpilog').hidden = !hasFinishedCampaign();
  stageOverlay.hidden = false;
}
function newLevel() { audio(); const d = newDraft(); saveCustom(d); enterEditor(d); }
document.getElementById('btnStages').onclick = openStages;
document.getElementById('btnTitleStages').onclick = openStages;
document.getElementById('btnStageEpilog').onclick = async () => {
  stageOverlay.hidden = true;
  audio();
  await playEpilog({ finishLabel: 'Tutup' });
};
document.getElementById('btnCloseStages').onclick = () => { stageOverlay.hidden = true; };
stageOverlay.onclick = (e) => { if (e.target === stageOverlay) stageOverlay.hidden = true; };
document.getElementById('btnNewLevel').onclick = newLevel;
document.getElementById('btnEditLevel').onclick = () => {
  const d = customs().find((c) => c.id === stage.id);
  if (d) enterEditor(d);
};
document.getElementById('btnImport').onclick = importCode;
document.getElementById('btnTitleEditor').onclick = newLevel;

document.getElementById('btnStay').onclick = () => {
  winOverlay.hidden = true;
  startLevel(stage, { intro: false });
};
document.getElementById('btnNext').onclick = async () => {
  winOverlay.hidden = true;
  if (stage.custom) {
    const d = customs().find((c) => c.id === stage.id);
    return d ? enterEditor(d) : openStages();
  }
  const i = LEVELS.indexOf(stage);
  if (i < LEVELS.length - 1) return loadStage(i + 1, { introduceBlocks: true });
  stopMusic();
  await playEpilog({ finishLabel: 'Kembali ke Sampul' });
  titleEl.hidden = false;
};

document.getElementById('gameTitle').textContent = GAME_TITLE;
document.title = GAME_TITLE;
// ---------- sampul: nama pemain ----------
const nameInput = document.getElementById('nameInput');
// ---------- Menu utama ----------
// Render tim (assets/menu/scene.webp: kartu judul + kesatria, latar transparan) diperbesar di kiri,
// panel tombol perkamen biasa (datar) di kanan. Layar sempit: render di atas, tombol di bawah.
const MENU_ART = {
  w: 1920, h: 1080,
  content: [178, 455, 1133, 973], // kotak isi render: kartu judul + kesatria
};

function layoutMenuPlane() {
  const scene = document.getElementById('menuScene');
  if (!scene || titleEl.hidden) return;
  const art = document.getElementById('menuArt');
  const vw = scene.clientWidth, vh = scene.clientHeight;
  const wide = vw >= 900 && vw / vh >= 1.15;
  // Panel tombol selalu datar/tegak (lebih nyaman dibaca). Layar lebar: render di kiri, panel di kanan.
  scene.classList.add('menu-flat');
  scene.classList.toggle('menu-wide', wide);
  if (!wide) { art.style.cssText = ''; return; }
  // render (kartu + kesatria) diperbesar di sisi kiri, maksimal 56% lebar / 78% tinggi layar
  const [cx0, cy0, cx1, cy1] = MENU_ART.content;
  const sc = Math.min((vw * 0.50) / (cx1 - cx0), (vh * 0.70) / (cy1 - cy0));
  const ox = vw * 0.32 - ((cx0 + cx1) / 2) * sc;
  const oy = vh * 0.52 - ((cy0 + cy1) / 2) * sc;
  art.style.cssText = `width:${MENU_ART.w * sc}px;height:${MENU_ART.h * sc}px;left:${ox}px;top:${oy}px`;
}
window.addEventListener('resize', layoutMenuPlane);

function renderTitle() {
  const has = !!player.name;
  document.getElementById('nameField').hidden = has;
  const w = document.getElementById('welcomeText');
  w.hidden = !has;
  if (has) {
    const info = slotInfo(activeSlot());
    w.innerHTML = `Selamat datang kembali, <b>${esc(player.name)}</b>.<br>
      <span class="slot-meta">Slot ${activeSlot()} · ${chapterOf({ id: Math.min(info.unlocked, LEVELS.length) })} · <span class="st">★</span> ${info.stars}/${LEVELS.length * 3}</span>`;
  }
  const playBtn = document.getElementById('btnPlay');
  playBtn.textContent = has ? 'LANJUTKAN' : 'MULAI PETUALANGAN';
  playBtn.classList.toggle('long', !has); // label panjang -> huruf lebih kecil agar muat di lembar
  document.getElementById('btnEpilog').hidden = !hasFinishedCampaign();
  layoutMenuPlane();
}
function setName(n) {
  player.name = n.trim().slice(0, 20);
  store('player', player);
}
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('btnPlay').click(); });

document.getElementById('btnPlay').onclick = async () => {
  // Nama boleh kosong (mis. pemain gamepad tanpa keyboard) -> "Pembaca", bisa diganti di Profil.
  if (!player.name) setName(nameInput.value.trim() || 'Pembaca');
  renderTitle();
  audio();
  titleEl.hidden = true;
  if (!load('seenProlog', false)) {
    await playStory('Prolog', PROLOG);
    store('seenProlog', true);
  }
  const p = progress();
  const last = load('last', 0);
  loadStage(Math.min(last, p.unlocked - 1));
};
document.getElementById('btnProlog').onclick = async () => {
  audio();
  await playStory('Prolog', PROLOG);
  store('seenProlog', true);
};
document.getElementById('btnEpilog').onclick = async () => {
  audio();
  await playEpilog({ finishLabel: 'Tutup' });
};

// ------------------------------------------------------------
//  Mulai
// ------------------------------------------------------------
// ---------- profil ----------
const profileOverlay = document.getElementById('profileOverlay');
function openProfile() {
  const p = progress();
  const total = LEVELS.reduce((s, lv) => s + (p.stars[lv.id] || 0), 0);
  const max = LEVELS.length * 3;
  const done = LEVELS.filter((lv) => p.stars[lv.id] != null).length;
  const cl = customs();
  const r = rankFor(total);
  document.getElementById('profileAvatar').textContent = playerName()[0].toUpperCase();
  document.getElementById('profileName').textContent = playerName();
  document.getElementById('profileRank').innerHTML = `Gelar: <b>${r.title}</b>`;
  const pct = r.next ? ((total - r.from) / (r.next[0] - r.from)) * 100 : 100;
  document.getElementById('rankFill').style.width = `${Math.max(4, pct)}%`;
  document.getElementById('rankNext').textContent = r.next
    ? `${r.next[0] - total} bintang lagi untuk menjadi "${r.next[1]}"`
    : 'Gelar tertinggi! Semua bintang terkumpul.';
  const tile = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
  document.getElementById('statGrid').innerHTML = [
    tile(`${total}/${max}`, 'bintang'),
    tile(`${done}/${LEVELS.length}`, 'bab selesai'),
    tile(stats.runs, 'kali dijalankan'),
    tile(stats.wins, 'kemenangan'),
    tile(cl.length, 'level dibuat'),
    tile(cl.filter((c) => c.verified).length, 'level teruji'),
  ].join('');
  document.getElementById('chapterStars').innerHTML = LEVELS.map((lv) => {
    const st = p.stars[lv.id];
    const right = lv.id > p.unlocked ? '<span class="lock">terkunci</span>'
      : st != null ? `<span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>` : '<span class="lock">belum selesai</span>';
    return `<div><span>${chapterOf(lv)} · ${esc(lv.name)}</span>${right}</div>`;
  }).join('');
  profileOverlay.hidden = false;
}
document.getElementById('btnTitleProfile').onclick = openProfile;

// ---------- Kredit ----------
const creditsOverlay = document.getElementById('creditsOverlay');
function openCredits() {
  const link = (it) => (it.url
    ? `<a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.who)}</a>`
    : esc(it.who));
  const team = TEAM.length
    ? `<section class="cr-group"><h3>Tim</h3><ul>${TEAM.map((m) =>
      `<li><b>${esc(m.name)}</b><span>${esc(m.role)}</span></li>`).join('')}</ul></section>`
    : '';
  document.getElementById('creditsBody').innerHTML = team + CREDITS.map((g) =>
    `<section class="cr-group"><h3>${esc(g.group)}</h3><ul>${g.items.map((it) =>
      `<li><b>${esc(it.what)}</b><span>${link(it)} · ${esc(it.license)}</span></li>`).join('')}</ul></section>`).join('');
  creditsOverlay.hidden = false;
}
document.getElementById('btnTitleCredits').onclick = openCredits;
document.getElementById('btnCloseCredits').onclick = () => { creditsOverlay.hidden = true; };
creditsOverlay.onclick = (e) => { if (e.target === creditsOverlay) creditsOverlay.hidden = true; };

// ---------- Panduan Kontrol ----------
const controlsOverlay = document.getElementById('controlsOverlay');
function openControls() {
  camKeys.clear();
  controlsOverlay.hidden = false;
  sfx('click');
}
document.getElementById('btnControls').onclick = openControls;
document.getElementById('camHelp').onclick = openControls;
document.getElementById('btnCloseControls').onclick = () => { sfx('click'); controlsOverlay.hidden = true; };
controlsOverlay.onclick = (e) => { if (e.target === controlsOverlay) { sfx('click'); controlsOverlay.hidden = true; } };

document.getElementById('btnCloseProfile').onclick = () => { profileOverlay.hidden = true; };
profileOverlay.onclick = (e) => { if (e.target === profileOverlay) profileOverlay.hidden = true; };
// ---------- slot simpan: muat, profil baru, hapus, simpan, ekspor/impor ----------
const slotOverlay = document.getElementById('slotOverlay');
const fmtSaved = (t) => (t ? new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

// Muat ulang objek profil di memori dari slot aktif.
function reloadProfileState() {
  for (const k of Object.keys(player)) delete player[k];
  Object.assign(player, { name: '' }, load('player', {}));
  for (const k of Object.keys(stats)) delete stats[k];
  Object.assign(stats, { runs: 0, wins: 0, fails: 0 }, load('stats', {}));
}
function switchToSlot(s) {
  setActiveSlot(s);
  reloadProfileState();
  goToMenu(); // kembali ke sampul dengan profil yang baru dimuat
  loadStage(Math.min(load('last', 0), progress().unlocked - 1), { intro: false });
}

// mode: 'load' (muat/ganti) atau 'new' (pilih slot untuk profil baru)
function openSlots(mode = 'load') {
  const list = document.getElementById('slotList');
  document.getElementById('slotTitle').textContent = mode === 'new' ? 'Profil Baru' : 'Muat Profil';
  document.getElementById('slotSub').textContent = mode === 'new'
    ? 'Pilih slot untuk petualangan baru. Slot terisi akan ditimpa.'
    : 'Pilih profil untuk dilanjutkan. Progres tersimpan otomatis di setiap slot.';
  list.innerHTML = '';
  for (let s = 1; s <= SLOT_COUNT; s++) {
    const info = slotInfo(s);
    const isActive = s === activeSlot() && !info.empty;
    const card = document.createElement('div');
    card.className = 'slot' + (info.empty ? ' empty' : '') + (isActive ? ' active' : '');
    card.setAttribute('role', 'listitem');
    if (info.empty) {
      card.innerHTML = `<div class="avatar">${s}</div>
        <div><div class="slot-no">SLOT ${s}</div><div class="slot-name">Slot kosong</div>
        <div class="slot-time">Belum ada petualangan</div></div>
        <div class="slot-actions"><button class="run small" data-a="new">Profil baru</button></div>`;
    } else {
      const r = rankFor(info.stars);
      card.innerHTML = `<div class="avatar">${esc(info.name[0].toUpperCase())}</div>
        <div><div class="slot-no">SLOT ${s}${isActive ? '<span class="slot-badge">AKTIF</span>' : ''}</div>
        <div class="slot-name">${esc(info.name)}</div>
        <div class="slot-meta">${r.title} · ${chapterOf({ id: Math.min(info.unlocked, LEVELS.length) })} · <span class="st">★</span> ${info.stars}/${LEVELS.length * 3}${info.customs ? ` · ${info.customs} level buatan` : ''}</div>
        <div class="slot-time">Disimpan ${fmtSaved(info.savedAt)}</div></div>
        <div class="slot-actions">
          ${mode === 'new'
            ? '<button class="btn danger" data-a="new">Timpa</button>'
            : `<button class="run small" data-a="load">${isActive ? 'Lanjutkan' : 'Muat'}</button>`}
          <button class="btn danger" data-a="del" aria-label="Hapus profil ${esc(info.name)}" title="Hapus profil">
            <svg viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg></button>
        </div>`;
    }
    card.querySelector('[data-a=load]')?.addEventListener('click', () => {
      slotOverlay.hidden = true;
      if (s !== activeSlot()) { switchToSlot(s); showToast(`Profil "${info.name}" dimuat`); }
      else goToMenu();
    });
    card.querySelector('[data-a=new]')?.addEventListener('click', () => newProfileIn(s, info));
    card.querySelector('[data-a=del]')?.addEventListener('click', async () => {
      const yes = await ask({
        title: 'Hapus profil?', danger: true, ok: 'Hapus permanen',
        text: `Profil "${info.name}" di Slot ${s} beserta semua progres dan level buatannya akan dihapus dan tidak bisa dikembalikan. Ekspor dulu kalau ingin menyimpan salinan.`,
      });
      if (!yes) return;
      clearSlot(s);
      if (s === activeSlot()) { reloadProfileState(); renderTitle(); }
      showToast(`Slot ${s} dikosongkan`);
      openSlots(mode);
    });
    list.appendChild(card);
  }
  document.getElementById('btnExportSave').disabled = slotInfo(activeSlot()).empty;
  slotOverlay.hidden = false;
}

async function newProfileIn(s, info) {
  if (!info.empty) {
    const yes = await ask({
      title: `Timpa Slot ${s}?`, danger: true, ok: 'Timpa',
      text: `Profil "${info.name}" dan semua progresnya akan diganti dengan petualangan baru.`,
    });
    if (!yes) return;
  }
  askValidate = (v) => (v.trim() ? null : 'Nama tidak boleh kosong');
  const name = await ask({ title: 'Profil baru', text: `Siapa namamu, pembaca? (Slot ${s})`, input: 'line', placeholder: 'Tulis namamu', ok: 'Mulai petualangan' });
  askValidate = null;
  if (!name) return;
  clearSlot(s);
  setActiveSlot(s);
  store('player', { name: name.trim().slice(0, 20) });
  reloadProfileState();
  slotOverlay.hidden = true;
  goToMenu();
  document.getElementById('btnPlay').click(); // langsung mulai: prolog lalu Bab I
}

document.getElementById('btnLoadProfile').onclick = () => { profileOverlay.hidden = true; openSlots('load'); };
document.getElementById('btnNewProfile').onclick = () => {
  profileOverlay.hidden = true;
  const empty = Array.from({ length: SLOT_COUNT }, (_, i) => slotInfo(i + 1)).find((x) => x.empty);
  // ada slot kosong -> langsung pakai; semua penuh -> pilih slot untuk ditimpa
  if (empty) newProfileIn(empty.slot, empty); else openSlots('new');
};
document.getElementById('btnSaveNow').onclick = () => {
  saveProgram();
  store('player', player);
  store('stats', stats);
  touch();
  sfx('chime');
  showToast(`Progres tersimpan di Slot ${activeSlot()} · ${fmtSaved(Date.now())}`);
  // Toast tertutup overlay Daftar bab, jadi konfirmasi juga tampil di tombolnya.
  const b = document.getElementById('btnSaveNow');
  clearTimeout(b._t);
  b.textContent = `Tersimpan di Slot ${activeSlot()} ✓`;
  b._t = setTimeout(() => { b.textContent = 'Simpan sekarang'; }, 2000);
};
document.getElementById('btnCloseSlots').onclick = () => { slotOverlay.hidden = true; };
slotOverlay.onclick = (e) => { if (e.target === slotOverlay) slotOverlay.hidden = true; };

// Ekspor: unduh file .json berisi seluruh isi slot aktif.
document.getElementById('btnExportSave').onclick = () => {
  saveProgram();
  const data = exportSlot(activeSlot());
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const safe = (player.name || 'profil').replace(/[^\w-]+/g, '_');
  a.href = URL.createObjectURL(blob);
  a.download = `eyes-for-the-nameless-${safe}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('File simpanan diunduh');
};
// Impor: baca file .json, masukkan ke slot kosong (atau timpa slot aktif setelah konfirmasi).
document.getElementById('btnImportSave').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let obj;
  try { obj = parseSaveFile(await file.text()); } catch (err) { showToast(err.message); return; }
  const name = JSON.parse(obj.data.player).name;
  let target = Array.from({ length: SLOT_COUNT }, (_, i) => slotInfo(i + 1)).find((x) => x.empty)?.slot;
  if (!target) {
    const yes = await ask({
      title: 'Semua slot terisi', danger: true, ok: `Timpa Slot ${activeSlot()}`,
      text: `Simpanan "${name}" akan menimpa profil di Slot ${activeSlot()}. Lanjutkan?`,
    });
    if (!yes) return;
    target = activeSlot();
  }
  importInto(target, obj);
  slotOverlay.hidden = true;
  switchToSlot(target);
  showToast(`Profil "${name}" diimpor ke Slot ${target}`);
};

document.getElementById('btnRename').onclick = async () => {
  askValidate = (v) => (v.trim() ? null : 'Nama tidak boleh kosong');
  const n = await ask({ title: 'Ganti nama', text: 'Nama ini dipakai narator dan putri untuk menyapamu.', input: 'line', value: player.name, ok: 'Simpan' });
  askValidate = null;
  if (n) { setName(n); renderTitle(); openProfile(); }
};

// ---------- pengaturan & menu jeda ----------
const pauseOverlay = document.getElementById('pauseOverlay');
const settingsOverlay = document.getElementById('settingsOverlay');
function openSettings() {
  document.querySelectorAll('#setText button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.text));
  document.getElementById('setMusic').value = settings.music;
  document.getElementById('setSfx').value = settings.sfx;
  document.getElementById('setContrast').checked = settings.contrast;
  document.getElementById('setReadable').checked = !!settings.readable;
  document.getElementById('setMotion').checked = settings.motion;
  document.getElementById('setBgfx').checked = settings.bgfx !== false;
  settingsOverlay.hidden = false;
  updateMusic();
}
function openPause() {
  if (!titleEl.hidden) return;
  paused = true;
  document.getElementById('pauseSub').textContent = editing
    ? 'Mode Editor Level'
    : `${stage.custom ? 'LEVEL CUSTOM' : chapterOf(stage)} · ${stage.name}${running ? ' (program berjalan)' : ''}`;
  document.getElementById('btnPauseRestart').hidden = editing;
  pauseOverlay.hidden = false;
  updateMusic();
  sfx('click');
}
function closePause() {
  if (!paused && pauseOverlay.hidden) return;
  paused = false;
  pauseOverlay.hidden = true;
  updateMusic();
}
const saveSettings = () => { store('settings', settings); applySettings(); };
document.querySelectorAll('#setText button').forEach((b) => {
  b.onclick = () => { settings.text = b.dataset.v; saveSettings(); openSettings(); };
});
document.getElementById('setMusic').oninput = (e) => { settings.music = +e.target.value; saveSettings(); updateMusic(); };
document.getElementById('setSfx').oninput = (e) => { settings.sfx = +e.target.value; saveSettings(); };
document.getElementById('setSfx').onchange = () => sfx('click');
document.getElementById('setContrast').onchange = (e) => { settings.contrast = e.target.checked; saveSettings(); };
document.getElementById('setReadable').onchange = (e) => { settings.readable = e.target.checked; saveSettings(); };
document.getElementById('setMotion').onchange = (e) => { settings.motion = e.target.checked; saveSettings(); };
document.getElementById('setBgfx').onchange = (e) => { settings.bgfx = e.target.checked; saveSettings(); };
document.getElementById('btnTitleSettings').onclick = openSettings;
document.getElementById('btnCloseSettings').onclick = () => { settingsOverlay.hidden = true; updateMusic(); };
settingsOverlay.onclick = (e) => { if (e.target === settingsOverlay) { settingsOverlay.hidden = true; updateMusic(); } };

document.getElementById('btnPause').onclick = openPause;
document.getElementById('btnResume').onclick = () => { sfx('click'); closePause(); };
document.getElementById('btnPauseRestart').onclick = () => { sfx('click'); closePause(); startLevel(stage, { intro: false }); };
document.getElementById('btnPauseSettings').onclick = () => { sfx('click'); openSettings(); };
document.getElementById('btnPauseControls').onclick = openControls;
document.getElementById('btnPauseHome').onclick = () => { sfx('click'); goToMenu(); };
pauseOverlay.onclick = (e) => { if (e.target === pauseOverlay) { sfx('click'); closePause(); } };

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'p' || e.ctrlKey || e.altKey || e.metaKey) return;
  const a = document.activeElement;
  if (a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName)) return;
  if (!titleEl.hidden || editing) return;
  if (!pauseOverlay.hidden && settingsOverlay.hidden && controlsOverlay.hidden && askEl.hidden) {
    e.preventDefault();
    sfx('click');
    closePause();
  } else if (!anyOverlayOpen()) {
    e.preventDefault();
    openPause();
  }
});

// ---------- shell UI: screen stack, fokus, keyboard & gamepad ----------
// "Kembali" (Esc / tombol B): tutup layar teratas, lalu dialog, lalu keluar dari wadah blok, lalu buka jeda.
function goBack() {
  if (!askEl.hidden) { askResolve?.(null); return; }
  if (!creditsOverlay.hidden) { creditsOverlay.hidden = true; return; }
  if (!controlsOverlay.hidden) { controlsOverlay.hidden = true; return; }
  if (!blockOverlay.hidden) { blockCardsDone?.(); return; }
  if (!slotOverlay.hidden) { slotOverlay.hidden = true; return; }
  if (!dialogOverlay.hidden) { closeDialog(); return; }
  if (!settingsOverlay.hidden) { settingsOverlay.hidden = true; updateMusic(); return; }
  if (!profileOverlay.hidden) { profileOverlay.hidden = true; return; }
  if (!stageOverlay.hidden) { stageOverlay.hidden = true; return; }
  if (!pauseOverlay.hidden) { closePause(); return; }
  if (!winOverlay.hidden) { document.getElementById('btnStay').click(); return; }
  if (!storyEl.hidden) { document.getElementById('storySkip').click(); return; }
  if (!titleEl.hidden) return;
  if (dialogState) { document.getElementById('dlgNext').click(); return; }
  if (editing) {
    // jangan tutup editor saat Esc dipakai untuk keluar dari kolom isian
    const a = document.activeElement;
    if (a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName)) { a.blur(); document.querySelector('#editorView .ecell.cursor')?.focus(); return; }
    document.querySelector('#editorView #edClose')?.click();
    return;
  }
  if (activeList !== 'main') {
    const owner = ownerOf(activeList);
    activeList = 'main';
    renderProgram(owner);
    showToast('Blok baru kembali masuk ke program utama');
    return;
  }
  openPause();
}
// Kembali ke menu utama (sampul). Program & level custom sudah tersimpan otomatis.
function goToMenu() {
  paused = false;
  runToken++;
  setRunning(false);
  highlight(null);
  closeDialog();
  askResolve?.(null);
  blockCardsDone?.();
  if (editing) {
    if (editor.draft) saveCustom(editor.draft);
    exitEditor();
  }
  for (const o of [pauseOverlay, settingsOverlay, profileOverlay, stageOverlay, winOverlay, slotOverlay, creditsOverlay, controlsOverlay]) o.hidden = true;
  world.reset();
  resetVisual();
  stopMusic();
  renderTitle();
  titleEl.hidden = false;
}

const isOpen = (id) => !document.getElementById(id).hidden;
const overlays = [...document.querySelectorAll('.overlay')];
const anyOverlayOpen = () => overlays.some((o) => !o.hidden);

document.getElementById('btnCenterCam').onclick = () => { sfx('click'); resetCameraView(); };
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const a = document.activeElement;
  if (a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName)) return;
  if (!titleEl.hidden) return;
  const k = e.key.toLowerCase();
  if (k === '?' || k === 'h') {
    if (!controlsOverlay.hidden) { e.preventDefault(); sfx('click'); controlsOverlay.hidden = true; }
    else if (!anyOverlayOpen()) { e.preventDefault(); openControls(); }
    return;
  }
  if (editing || anyOverlayOpen()) return;
  if (k === 'c') { e.preventDefault(); sfx('click'); resetCameraView(); }
  else if (k.length === 1 && 'wasd'.includes(k)) { camResetAnim = null; camKeys.add(k); }
});
document.addEventListener('keyup', (e) => { camKeys.delete(e.key.toLowerCase()); });
window.addEventListener('blur', () => { camKeys.clear(); });
initUI({
  app: document.querySelector('.app'),
  overlays,
  actions: {
    back: goBack,
    run: () => { if (anyOverlayOpen() || editing) return; runBtn.click(); },
    hint: () => { if (!anyOverlayOpen() && !editing) document.getElementById('btnHint').click(); },
    menu: () => {
      if (!titleEl.hidden) {
        if (isOpen('settingsOverlay')) settingsOverlay.hidden = true;
        else openSettings();
        return;
      }
      if (isOpen('settingsOverlay')) { settingsOverlay.hidden = true; updateMusic(); return; }
      if (!pauseOverlay.hidden) { closePause(); return; }
      if (!anyOverlayOpen()) openPause();
    },
    toast: (m) => showToast(m),
  },
});

applySettings();
renderTitle();
muted = load('muted', false);
renderMute();
updateMusic();
loadStage(Math.min(load('last', 0), progress().unlocked - 1), { intro: false });
document.body.classList.remove('booting'); // layar muat selesai
