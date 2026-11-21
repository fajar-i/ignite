// ============================================================
//  Editor level custom: grid 2D di panel kanan, pratinjau 3D di kiri.
//  Draft disimpan otomatis; bisa dibagikan sebagai kode teks.
// ============================================================
import { LEVELS } from './levels.js';
import { parseLevel } from './world.js';

const ALLOWED = new Set([...'.# ~^SEM123abcXYZ']);
const MAX_W = 16, MAX_D = 12, MIN = 3;
const DIR_ARROW = ['↑', '→', '↓', '←'];
const DIR_NAME = ['Utara', 'Timur', 'Selatan', 'Barat'];

export const BLOCK_OPTIONS = [
  ['move', 'Maju'], ['left', 'Belok Kiri'], ['right', 'Belok Kanan'], ['jump', 'Lompat'],
  ['repeat', 'Ulangi'], ['if', 'Jika'], ['lever', 'Tarik Tuas'], ['wait', 'Tunggu'], ['call', 'Fungsi'],
];

const TOOLS = [
  { key: '.', label: 'Lantai', color: '#6a6f74' },
  { key: '#', label: 'Tembok', color: '#8a7240' },
  { key: ' ', label: 'Lubang', color: '#05090a' },
  { key: '~', label: 'Sungai', color: '#2d6cdf' },
  { key: '^', label: 'Duri', color: '#c8ccd2' },
  { key: 'S', label: 'Start', color: '#3c8dde' },
  { key: 'E', label: 'Pintu', color: '#ffd84a' },
  { key: 'M', label: 'Monster', color: '#9b6bc0' },
  { key: 'lever', label: 'Tuas', color: '#d03a3a', grouped: true },
  { key: 'bridge', label: 'Jembatan', color: '#8a5a2b', grouped: true },
  { key: 'gate', label: 'Gerbang', color: '#9aa3ad', grouped: true },
];

const GROUP_CH = { lever: '123', bridge: 'abc', gate: 'XYZ' };
const cellColor = (ch) => {
  if ('123'.includes(ch)) return '#d03a3a';
  if ('abc'.includes(ch)) return '#8a5a2b';
  if ('XYZ'.includes(ch)) return '#9aa3ad';
  return TOOLS.find((t) => t.key === ch)?.color || '#6a6f74';
};
const cellText = (ch, d) => {
  if (ch === 'S') return DIR_ARROW[d.startDir];
  if (ch === 'E') return '🚪';
  if (ch === 'M') return d.monsterKind === 'golem' ? '🗿' : '👹';
  if (ch === '^') return '▲';
  if ('123'.includes(ch)) return 'T' + ch;
  if ('abc'.includes(ch)) return 'J' + ('abc'.indexOf(ch) + 1);
  if ('XYZ'.includes(ch)) return 'G' + ('XYZ'.indexOf(ch) + 1);
  return '';
};

export function newDraft() {
  return {
    id: 'c' + Date.now().toString(36),
    name: 'Level baruku',
    map: ['#########', '#S.....E#', '#########'].map((r) => r),
    startDir: 1,
    theme: 0,
    blocks: ['move', 'left', 'right', 'jump', 'repeat'],
    limit: 0,
    time: 180,
    monsterKind: 'monster',
    cycle: { awake: 2, sleep: 2 },
    verified: false,
    best: null,
  };
}

export function draftToLevel(d) {
  const t = d.time;
  return {
    id: d.id,
    custom: true,
    name: d.name || 'Tanpa nama',
    concept: 'Level custom',
    engineering: 'Rancangan buatanmu sendiri',
    blocks: BLOCK_OPTIONS.map(([k]) => k).filter((k) => k === 'move' || d.blocks.includes(k)),
    limit: d.limit > 0 ? d.limit : null,
    time: t,
    stars: [Math.round(t * 0.5), Math.round(t * 0.75), Math.round(t * 0.92)],
    theme: (LEVELS[d.theme] || LEVELS[0]).theme,
    map: d.map,
    startDir: d.startDir,
    monsterKind: d.monsterKind,
    monsterCycle: { ...d.cycle },
  };
}

const clampInt = (v, lo, hi, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
};

/** Periksa & rapikan draft (dipakai saat impor). Melempar Error berbahasa Indonesia. */
export function validateDraft(d) {
  if (!Array.isArray(d.map) || d.map.length < MIN || d.map.length > MAX_D) throw new Error(`Tinggi peta harus ${MIN}–${MAX_D}`);
  const w = d.map[0]?.length;
  if (!(w >= MIN && w <= MAX_W)) throw new Error(`Lebar peta harus ${MIN}–${MAX_W}`);
  for (const row of d.map) {
    if (typeof row !== 'string' || row.length !== w) throw new Error('Baris peta tidak sama panjang');
    for (const ch of row) if (!ALLOWED.has(ch)) throw new Error(`Karakter peta tidak dikenal: "${ch}"`);
  }
  const all = d.map.join('');
  if ((all.match(/S/g) || []).length !== 1) throw new Error('Peta harus punya tepat satu Start');
  if ((all.match(/E/g) || []).length !== 1) throw new Error('Peta harus punya tepat satu Pintu');
  parseLevel({ name: d.name, map: d.map });
  d.name = String(d.name || 'Tanpa nama').slice(0, 40);
  d.startDir = clampInt(d.startDir, 0, 3, 1);
  d.theme = clampInt(d.theme, 0, LEVELS.length - 1, 0);
  d.limit = clampInt(d.limit, 0, 99, 0);
  d.time = clampInt(d.time, 30, 600, 180);
  d.monsterKind = d.monsterKind === 'golem' ? 'golem' : 'monster';
  d.cycle = { awake: clampInt(d.cycle?.awake, 1, 6, 2), sleep: clampInt(d.cycle?.sleep, 1, 6, 2) };
  const valid = new Set(BLOCK_OPTIONS.map(([k]) => k));
  d.blocks = (Array.isArray(d.blocks) ? d.blocks : []).filter((b) => valid.has(b));
  return d;
}

// ---------- kode bagikan ----------
const PREFIX = 'MSK1:';
export function encodeDraft(d) {
  const min = { n: d.name, m: d.map, d: d.startDir, t: d.theme, b: d.blocks, l: d.limit, s: d.time, k: d.monsterKind, c: [d.cycle.awake, d.cycle.sleep] };
  const bytes = new TextEncoder().encode(JSON.stringify(min));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return PREFIX + btoa(bin);
}
export function decodeDraft(code) {
  code = String(code || '').trim();
  if (!code.startsWith(PREFIX)) throw new Error('Kode level tidak valid (harus diawali MSK1:)');
  let min;
  try {
    const bin = atob(code.slice(PREFIX.length));
    min = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch { throw new Error('Kode level rusak atau terpotong'); }
  const d = {
    ...newDraft(),
    name: min.n, map: min.m, startDir: min.d, theme: min.t, blocks: min.b,
    limit: min.l, time: min.s, monsterKind: min.k, cycle: { awake: min.c?.[0], sleep: min.c?.[1] },
  };
  return validateDraft(d);
}

// ============================================================
//  UI editor
//  api: { preview(level, opts), save(draft), play(draft), share(draft), close(), toast(msg), sfx(kind) }
// ============================================================
export function createEditor(root, api) {
  let d = null;
  let tool = '.';
  let groupId = 1;
  let painting = false;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function changed({ resetCamera = false } = {}) {
    d.verified = false;
    d.best = null;
    api.save(d);
    renderStatus();
    api.preview(draftToLevel(d), { resetCamera });
  }

  function setCell(x, z, ch) {
    const row = d.map[z];
    d.map[z] = row.slice(0, x) + ch + row.slice(x + 1);
  }

  function toolChar() {
    const t = TOOLS.find((t) => t.key === tool);
    return t.grouped ? GROUP_CH[tool][groupId - 1] : tool;
  }

  function paint(x, z) {
    const cur = d.map[z][x];
    const ch = toolChar();
    if (cur === 'S' && ch === 'S') { d.startDir = (d.startDir + 1) % 4; renderGrid(); syncDirSelect(); changed(); return; }
    if (cur === ch) return;
    if ((cur === 'S' || cur === 'E') && ch !== cur) {
      if (!painting || painting === 'first') api.toast('Start dan Pintu tidak bisa ditimpa. Pindahkan dengan alat Start/Pintu.');
      return;
    }
    if (ch === 'S' || ch === 'E') {
      d.map.forEach((row, zz) => { const xx = row.indexOf(ch); if (xx >= 0) setCell(xx, zz, '.'); });
    }
    setCell(x, z, ch);
    api.sfx('click');
    renderGrid();
    changed();
  }

  function resize(dw, dd) {
    const W = d.map[0].length, D = d.map.length;
    if (dw > 0 && W < MAX_W) d.map = d.map.map((r) => r + '.');
    if (dw < 0 && W > MIN) {
      if (d.map.some((r) => 'SE'.includes(r[W - 1]))) return api.toast('Kolom terakhir berisi Start/Pintu. Pindahkan dulu.');
      d.map = d.map.map((r) => r.slice(0, -1));
    }
    if (dd > 0 && D < MAX_D) d.map = [...d.map, '.'.repeat(W + 0)].map((r) => r.padEnd(d.map[0].length, '.'));
    if (dd < 0 && D > MIN) {
      if (/[SE]/.test(d.map[D - 1])) return api.toast('Baris terakhir berisi Start/Pintu. Pindahkan dulu.');
      d.map = d.map.slice(0, -1);
    }
    renderSize();
    renderGrid();
    changed({ resetCamera: true });
  }

  // ---------- render ----------
  function render() {
    root.innerHTML = `
      <div class="ed-head">
        <h2>Editor level</h2>
        <span class="ed-status" id="edStatus"></span>
      </div>
      <label class="ed-field"><span>Nama</span><input id="edName" maxlength="40"></label>

      <div class="ed-label">Alat <span class="dim">· klik / seret di grid · klik Start lagi untuk memutar arah</span></div>
      <div class="ed-tools" id="edTools"></div>
      <div class="ed-group" id="edGroup">
        <span>Nomor:</span>
        ${[1, 2, 3].map((n) => `<button data-g="${n}">${n}</button>`).join('')}
        <span class="dim">Tuas N menggerakkan Jembatan N &amp; Gerbang N</span>
      </div>

      <div class="ed-size">
        <span>Lebar</span><button data-r="w-">−</button><b id="edW"></b><button data-r="w+">+</button>
        <span>Tinggi</span><button data-r="d-">−</button><b id="edD"></b><button data-r="d+">+</button>
      </div>
      <div class="ed-grid" id="edGrid"></div>

      <details class="ed-settings" open>
        <summary>Pengaturan</summary>
        <div class="ed-form">
          <label><span>Arah start</span><select id="edDir">${DIR_NAME.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></label>
          <label><span>Tema</span><select id="edTheme">${LEVELS.map((l, i) => `<option value="${i}">${esc(l.name)}</option>`).join('')}</select></label>
          <label><span>Waktu (detik)</span><input id="edTime" type="number" min="30" max="600" step="10"></label>
          <label><span>Batas blok (0 = bebas)</span><input id="edLimit" type="number" min="0" max="99"></label>
          <label><span>Jenis monster</span><select id="edKind"><option value="monster">Monster</option><option value="golem">Golem</option></select></label>
          <label><span>Bangun / tidur (giliran)</span><span class="ed-pair"><input id="edAwake" type="number" min="1" max="6"><input id="edSleep" type="number" min="1" max="6"></span></label>
        </div>
        <div class="ed-label">Blok yang tersedia</div>
        <div class="ed-blocks" id="edBlocks"></div>
      </details>

      <div class="ed-actions">
        <button class="run small" id="edPlay">▶ Uji coba</button>
        <button class="btn" id="edShare">Bagikan kode</button>
        <button class="btn" id="edClose">Selesai</button>
      </div>`;

    const $ = (id) => root.querySelector('#' + id);
    $('edName').value = d.name;
    $('edName').addEventListener('input', () => { d.name = $('edName').value; api.save(d); });
    $('edName').addEventListener('change', () => changed());

    const tools = $('edTools');
    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.className = 'ed-tool';
      b.dataset.k = t.key;
      b.innerHTML = `<i style="background:${t.color}"></i>${t.label}`;
      b.onclick = () => { tool = t.key; renderTools(); };
      tools.appendChild(b);
    }
    $('edGroup').querySelectorAll('button').forEach((b) => { b.onclick = () => { groupId = +b.dataset.g; renderTools(); }; });
    root.querySelectorAll('[data-r]').forEach((b) => {
      b.onclick = () => {
        const r = b.dataset.r;
        resize(r === 'w+' ? 1 : r === 'w-' ? -1 : 0, r === 'd+' ? 1 : r === 'd-' ? -1 : 0);
      };
    });

    $('edDir').value = d.startDir;
    $('edDir').onchange = () => { d.startDir = +$('edDir').value; renderGrid(); changed(); };
    $('edTheme').value = d.theme;
    $('edTheme').onchange = () => { d.theme = +$('edTheme').value; changed(); };
    $('edTime').value = d.time;
    $('edTime').onchange = () => { d.time = clampInt($('edTime').value, 30, 600, 180); $('edTime').value = d.time; changed(); };
    $('edLimit').value = d.limit;
    $('edLimit').onchange = () => { d.limit = clampInt($('edLimit').value, 0, 99, 0); $('edLimit').value = d.limit; changed(); };
    $('edKind').value = d.monsterKind;
    $('edKind').onchange = () => { d.monsterKind = $('edKind').value; renderGrid(); changed(); };
    $('edAwake').value = d.cycle.awake;
    $('edSleep').value = d.cycle.sleep;
    const cyc = () => {
      d.cycle = { awake: clampInt($('edAwake').value, 1, 6, 2), sleep: clampInt($('edSleep').value, 1, 6, 2) };
      $('edAwake').value = d.cycle.awake; $('edSleep').value = d.cycle.sleep;
      changed();
    };
    $('edAwake').onchange = cyc;
    $('edSleep').onchange = cyc;

    const blocks = $('edBlocks');
    for (const [k, label] of BLOCK_OPTIONS) {
      const l = document.createElement('label');
      const fixed = k === 'move';
      l.innerHTML = `<input type="checkbox" ${fixed || d.blocks.includes(k) ? 'checked' : ''} ${fixed ? 'disabled' : ''}> ${label}`;
      l.querySelector('input').onchange = (e) => {
        d.blocks = e.target.checked ? [...new Set([...d.blocks, k])] : d.blocks.filter((b) => b !== k);
        changed();
      };
      blocks.appendChild(l);
    }

    $('edPlay').onclick = () => api.play(d);
    $('edShare').onclick = () => api.share(d);
    $('edClose').onclick = () => api.close(d);

    const grid = $('edGrid');
    grid.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.ecell');
      if (!c) return;
      e.preventDefault();
      painting = 'first';
      paint(+c.dataset.x, +c.dataset.z);
      painting = true;
    });
    grid.addEventListener('pointermove', (e) => {
      if (!painting) return;
      const c = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ecell');
      if (c) paint(+c.dataset.x, +c.dataset.z);
    });

    renderTools();
    renderSize();
    renderGrid();
    renderStatus();
  }

  function renderTools() {
    root.querySelectorAll('.ed-tool').forEach((b) => b.classList.toggle('on', b.dataset.k === tool));
    const grouped = TOOLS.find((t) => t.key === tool)?.grouped;
    const g = root.querySelector('#edGroup');
    g.classList.toggle('off', !grouped);
    g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.g === groupId));
  }
  function renderSize() {
    root.querySelector('#edW').textContent = d.map[0].length;
    root.querySelector('#edD').textContent = d.map.length;
  }
  function renderGrid() {
    const grid = root.querySelector('#edGrid');
    const W = d.map[0].length;
    grid.style.gridTemplateColumns = `repeat(${W}, 1fr)`;
    grid.style.maxWidth = `${W * 34}px`;
    grid.innerHTML = d.map.map((row, z) => [...row].map((ch, x) =>
      `<div class="ecell${ch === ' ' ? ' hole' : ''}" data-x="${x}" data-z="${z}" style="background:${cellColor(ch)}">${cellText(ch, d)}</div>`).join('')).join('');
  }
  function syncDirSelect() { const s = root.querySelector('#edDir'); if (s) s.value = d.startDir; }
  function renderStatus() {
    const s = root.querySelector('#edStatus');
    if (!s) return;
    s.textContent = d.verified ? '✓ Sudah diuji' : 'Belum diuji';
    s.className = 'ed-status' + (d.verified ? ' ok' : '');
  }

  window.addEventListener('pointerup', () => { painting = false; });

  return {
    open(draft) {
      d = structuredClone(draft);
      render();
      api.preview(draftToLevel(d), { resetCamera: true });
    },
    get draft() { return d; },
  };
}
