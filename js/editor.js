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

// Alat menggambar. `hot` = tombol pintas keyboard. `glyph` = penanda selain warna.
const TOOLS = [
  { key: '.', label: 'Lantai', color: '#6a6f74', hot: '1' },
  { key: '#', label: 'Tembok', color: '#8a7240', hot: '2', glyph: '▦' },
  { key: ' ', label: 'Lubang', color: '#05090a', hot: '3' },
  { key: '~', label: 'Sungai', color: '#2d6cdf', hot: '4', glyph: '≈' },
  { key: '^', label: 'Duri', color: '#c8ccd2', hot: '5', glyph: '▲' },
  { key: 'S', label: 'Start', color: '#3c8dde', hot: '6' },
  { key: 'E', label: 'Pintu', color: '#ffd84a', hot: '7' },
  { key: 'M', label: 'Monster', color: '#9b6bc0', hot: '8' },
  { key: 'lever', label: 'Tuas', color: '#d03a3a', grouped: true, hot: '9' },
  { key: 'bridge', label: 'Jembatan', color: '#8a5a2b', grouped: true, hot: '0' },
  { key: 'gate', label: 'Gerbang', color: '#9aa3ad', grouped: true, hot: '-' },
];

const GROUP_CH = { lever: '123', bridge: 'abc', gate: 'XYZ' };
const cellColor = (ch) => {
  if ('123'.includes(ch)) return '#d03a3a';
  if ('abc'.includes(ch)) return '#8a5a2b';
  if ('XYZ'.includes(ch)) return '#9aa3ad';
  return TOOLS.find((t) => t.key === ch)?.color || '#6a6f74';
};
const cellName = (ch) => {
  if ('123'.includes(ch)) return `Tuas ${ch}`;
  if ('abc'.includes(ch)) return `Jembatan ${'abc'.indexOf(ch) + 1}`;
  if ('XYZ'.includes(ch)) return `Gerbang ${'XYZ'.indexOf(ch) + 1}`;
  return TOOLS.find((t) => t.key === ch)?.label || 'Lantai';
};
const cellText = (ch, d) => {
  if (ch === 'S') return DIR_ARROW[d.startDir];
  if (ch === 'E') return '🚪';
  if (ch === 'M') return d.monsterKind === 'golem' ? '🗿' : '👹';
  if ('123'.includes(ch)) return 'T' + ch;
  if ('abc'.includes(ch)) return 'J' + ('abc'.indexOf(ch) + 1);
  if ('XYZ'.includes(ch)) return 'G' + ('XYZ'.indexOf(ch) + 1);
  return TOOLS.find((t) => t.key === ch)?.glyph || '';
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
//  Analisis cepat: peringatan sebelum uji coba.
//  Jangkauan dihitung optimistis: semua tuas dianggap ditarik (kalau blok Tarik
//  Tuas tersedia) dan monster bisa dilewati (kalau blok Jika tersedia).
// ============================================================
export function analyze(d) {
  const lv = draftToLevel(d);
  const def = parseLevel(lv);
  const allow = new Set(lv.blocks);
  const warns = [];
  const leverIds = new Set(def.levers.values());

  const isGolem = lv.monsterKind === 'golem';
  if (def.monsters.length && !allow.has('if')) warns.push('Ada monster, tapi blok Jika tidak tersedia. Monster bangun/tidur acak, jadi pemain butuh sensor.');
  if (def.monsters.length && !allow.has('wait')) warns.push('Ada monster, tapi blok Tunggu tidak tersedia.');
  if (def.monsters.length && isGolem && !allow.has('jump')) warns.push('Ada golem, tapi blok Lompat tidak tersedia. Golem yang tertidur harus dilompati.');
  if (leverIds.size && !allow.has('lever')) warns.push('Ada tuas, tapi blok Tarik Tuas tidak tersedia.');
  const linked = new Set();
  def.cells.flat().forEach((c) => { if (c.kind === 'bridge' || c.kind === 'gate') linked.add(c.id); });
  for (const id of linked) if (!leverIds.has(id)) warns.push(`Jembatan/Gerbang ${id} tidak punya Tuas ${id}.`);

  const open = allow.has('lever') ? leverIds : new Set();
  const cell = (x, z) => def.cells[z]?.[x];
  const isMon = (x, z) => def.monsters.some((m) => m.x === x && m.z === z);
  const stand = (x, z) => {
    const c = cell(x, z);
    if (!c) return false;
    if (isMon(x, z) && (isGolem || !allow.has('if'))) return false;
    if (c.kind === 'floor') return true;
    if (c.kind === 'bridge' || c.kind === 'gate') return open.has(c.id);
    return false;
  };
  const blocksJump = (x, z) => {
    const c = cell(x, z);
    const monBlocks = isMon(x, z) && (!isGolem || !allow.has('if'));
    return !c || c.kind === 'wall' || (c.kind === 'gate' && !open.has(c.id)) || monBlocks;
  };
  const seen = new Set([`${def.start.x},${def.start.z}`]);
  const queue = [def.start];
  while (queue.length) {
    const { x, z } = queue.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [[x + dx, z + dz]];
      if (allow.has('jump') && !blocksJump(x + dx, z + dz)) next.push([x + dx * 2, z + dz * 2]);
      for (const [nx, nz] of next) {
        const k = `${nx},${nz}`;
        if (!seen.has(k) && stand(nx, nz)) { seen.add(k); queue.push({ x: nx, z: nz }); }
      }
    }
  }
  const reachable = seen.has(`${def.exit.x},${def.exit.z}`);
  if (!reachable) warns.unshift('Pintu tidak bisa dicapai dari Start dengan blok yang tersedia.');
  return { warns, reachable };
}

// ============================================================
//  UI editor
//  api: { preview(level, opts), save(draft), play(draft), share(draft), close(draft), toast(msg), sfx(kind) }
//
//  Grid = satu kontrol fokus (roving tabindex): panah/D-pad memindah kursor,
//  Enter/Spasi/A menggambar, Shift+panah menggambar sambil bergerak.
//  Ctrl+Z / Ctrl+Y = urungkan / ulangi. Angka 1-9, 0, - = pilih alat.
// ============================================================
export function createEditor(root, api) {
  let d = null;
  let tool = '.';
  let groupId = 1;
  let painting = false;
  let cursor = { x: 1, z: 1 };
  let undo = [], redo = [];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => root.querySelector('#' + id);
  const snapshot = () => JSON.stringify({ ...d, verified: undefined, best: undefined });

  // ---------- riwayat ----------
  function checkpoint() {
    const s = snapshot();
    if (undo[undo.length - 1] === s) return;
    undo.push(s);
    if (undo.length > 60) undo.shift();
    redo = [];
    renderHistory();
  }
  function restore(from, to) {
    if (!from.length) return;
    to.push(snapshot());
    const s = JSON.parse(from.pop());
    Object.assign(d, s, { verified: false, best: null });
    api.sfx('click');
    render();
    changed({ resetCamera: true });
    focusGrid();
  }

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

  function paint(x, z, { quiet = false } = {}) {
    const cur = d.map[z][x];
    const ch = toolChar();
    if (cur === 'S' && ch === 'S') {
      d.startDir = (d.startDir + 1) % 4;
      renderGrid(); syncFields(); changed();
      return;
    }
    if (cur === ch) return;
    if ((cur === 'S' || cur === 'E') && ch !== cur) {
      if (!quiet) api.toast('Start dan Pintu tidak bisa ditimpa. Pindahkan dengan alat Start/Pintu.');
      return;
    }
    if (ch === 'S' || ch === 'E') d.map.forEach((row, zz) => { const xx = row.indexOf(ch); if (xx >= 0) setCell(xx, zz, '.'); });
    setCell(x, z, ch);
    api.sfx('click');
    renderGrid();
    changed();
  }

  function resize(dw, dd) {
    const W = d.map[0].length, D = d.map.length;
    if (dw < 0 && W > MIN && d.map.some((r) => 'SE'.includes(r[W - 1]))) return api.toast('Kolom terakhir berisi Start/Pintu. Pindahkan dulu.');
    if (dd < 0 && D > MIN && /[SE]/.test(d.map[D - 1])) return api.toast('Baris terakhir berisi Start/Pintu. Pindahkan dulu.');
    if ((dw > 0 && W >= MAX_W) || (dd > 0 && D >= MAX_D) || (dw < 0 && W <= MIN) || (dd < 0 && D <= MIN)) {
      return api.toast(`Ukuran peta ${MIN}×${MIN} sampai ${MAX_W}×${MAX_D}.`);
    }
    checkpoint();
    if (dw > 0) d.map = d.map.map((r) => r + '.');
    if (dw < 0) d.map = d.map.map((r) => r.slice(0, -1));
    if (dd > 0) d.map = [...d.map, '.'.repeat(W)];
    if (dd < 0) d.map = d.map.slice(0, -1);
    cursor.x = Math.min(cursor.x, d.map[0].length - 1);
    cursor.z = Math.min(cursor.z, d.map.length - 1);
    renderSize();
    renderGrid();
    changed({ resetCamera: true });
  }

  function selectTool(key) {
    tool = key;
    renderTools();
    const t = TOOLS.find((t) => t.key === key);
    api.toast(`Alat: ${t.label}${t.grouped ? ' ' + groupId : ''}`);
  }

  // ---------- render ----------
  function render() {
    root.innerHTML = `
      <div class="ed-head">
        <h2>Editor Level</h2>
        <div class="ed-history">
          <button class="btn icon" id="edUndo" title="Urungkan (Ctrl+Z)" aria-label="Urungkan"><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" /></svg></button>
          <button class="btn icon" id="edRedo" title="Ulangi (Ctrl+Y)" aria-label="Ulangi"><svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" /></svg></button>
        </div>
      </div>
      <div class="ed-status-box" id="edStatus" role="status" aria-live="polite"></div>
      <label class="ed-field"><span>Nama</span><input id="edName" maxlength="40"></label>

      <div class="ed-label">Alat <span class="dim">· tombol angka untuk memilih cepat</span></div>
      <div class="ed-tools" id="edTools" role="toolbar" aria-label="Alat menggambar"></div>
      <div class="ed-group" id="edGroup">
        <span>Nomor:</span>
        ${[1, 2, 3].map((n) => `<button data-g="${n}" aria-label="Nomor ${n}">${n}</button>`).join('')}
        <span class="dim">Tuas N menggerakkan Jembatan N &amp; Gerbang N</span>
      </div>

      <div class="ed-size">
        <span>Lebar</span><button data-r="w-" aria-label="Kurangi lebar">−</button><b id="edW"></b><button data-r="w+" aria-label="Tambah lebar">+</button>
        <span>Tinggi</span><button data-r="d-" aria-label="Kurangi tinggi">−</button><b id="edD"></b><button data-r="d+" aria-label="Tambah tinggi">+</button>
      </div>
      <div class="ed-grid" id="edGrid" role="grid" aria-label="Peta level" data-own-arrows></div>
      <p class="ed-help">Klik/seret, atau <kbd>panah</kbd> + <kbd>Enter</kbd>. <kbd>Shift</kbd>+panah menggambar sambil bergerak. Klik Start lagi untuk memutar arah.</p>

      <details class="ed-settings">
        <summary>Pengaturan level</summary>
        <div class="ed-form">
          <label><span>Arah start</span><select id="edDir">${DIR_NAME.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></label>
          <label><span>Tema</span><select id="edTheme">${LEVELS.map((l, i) => `<option value="${i}">${esc(l.name)}</option>`).join('')}</select></label>
          <label><span>Waktu (detik)</span><input id="edTime" type="number" min="30" max="600" step="10"></label>
          <label><span>Batas blok (0 = bebas)</span><input id="edLimit" type="number" min="0" max="99"></label>
          <label><span>Jenis monster</span><select id="edKind"><option value="monster">Monster</option><option value="golem">Golem (lompati saat tidur)</option></select></label>
          <label><span>Bangun / tidur (giliran)</span><span class="ed-pair"><input id="edAwake" type="number" min="1" max="6" aria-label="Giliran bangun"><input id="edSleep" type="number" min="1" max="6" aria-label="Giliran tidur"></span></label>
        </div>
        <div class="ed-label">Blok yang tersedia</div>
        <div class="ed-blocks" id="edBlocks"></div>
      </details>

      <div class="ed-actions">
        <button class="run small" id="edPlay" title="Uji coba (Ctrl+Enter)">▶ Uji coba</button>
        <button class="btn" id="edShare">Bagikan</button>
        <button class="btn" id="edClose" title="Simpan & tutup (Esc)">Selesai</button>
      </div>`;

    $('edName').value = d.name;
    $('edName').addEventListener('focus', checkpoint);
    $('edName').addEventListener('input', () => { d.name = $('edName').value; api.save(d); });
    $('edName').addEventListener('change', () => changed());

    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.className = 'ed-tool';
      b.dataset.k = t.key;
      b.setAttribute('aria-pressed', 'false');
      b.title = `${t.label} (tombol ${t.hot})`;
      b.innerHTML = `<i style="background:${t.color}">${t.glyph || ''}</i><span>${t.label}</span><kbd>${t.hot}</kbd>`;
      b.onclick = () => { tool = t.key; renderTools(); };
      $('edTools').appendChild(b);
    }
    $('edGroup').querySelectorAll('button').forEach((b) => { b.onclick = () => { groupId = +b.dataset.g; renderTools(); }; });
    root.querySelectorAll('[data-r]').forEach((b) => {
      b.onclick = () => {
        const r = b.dataset.r;
        resize(r === 'w+' ? 1 : r === 'w-' ? -1 : 0, r === 'd+' ? 1 : r === 'd-' ? -1 : 0);
      };
    });

    const field = (id, apply) => {
      $(id).addEventListener('focus', checkpoint);
      $(id).addEventListener('change', () => { apply(); renderGrid(); changed(); });
    };
    field('edDir', () => { d.startDir = +$('edDir').value; });
    field('edTheme', () => { d.theme = +$('edTheme').value; });
    field('edTime', () => { d.time = clampInt($('edTime').value, 30, 600, 180); $('edTime').value = d.time; });
    field('edLimit', () => { d.limit = clampInt($('edLimit').value, 0, 99, 0); $('edLimit').value = d.limit; });
    field('edKind', () => { d.monsterKind = $('edKind').value; });
    const cyc = () => {
      d.cycle = { awake: clampInt($('edAwake').value, 1, 6, 2), sleep: clampInt($('edSleep').value, 1, 6, 2) };
      $('edAwake').value = d.cycle.awake; $('edSleep').value = d.cycle.sleep;
    };
    field('edAwake', cyc);
    field('edSleep', cyc);

    for (const [k, label] of BLOCK_OPTIONS) {
      const l = document.createElement('label');
      const fixed = k === 'move';
      l.innerHTML = `<input type="checkbox" ${fixed || d.blocks.includes(k) ? 'checked' : ''} ${fixed ? 'disabled' : ''}> ${label}`;
      l.querySelector('input').onchange = (e) => {
        checkpoint();
        d.blocks = e.target.checked ? [...new Set([...d.blocks, k])] : d.blocks.filter((b) => b !== k);
        changed();
      };
      $('edBlocks').appendChild(l);
    }

    $('edUndo').onclick = () => restore(undo, redo);
    $('edRedo').onclick = () => restore(redo, undo);
    $('edPlay').onclick = () => api.play(d);
    $('edShare').onclick = () => api.share(d);
    $('edClose').onclick = () => api.close(d);

    // ---------- grid: mouse/sentuh ----------
    const grid = $('edGrid');
    grid.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.ecell');
      if (!c) return;
      e.preventDefault();
      checkpoint();
      cursor = { x: +c.dataset.x, z: +c.dataset.z };
      paint(cursor.x, cursor.z);
      painting = true;
      focusGrid();
    });
    grid.addEventListener('pointermove', (e) => {
      if (!painting) return;
      const c = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ecell');
      if (c && grid.contains(c)) { cursor = { x: +c.dataset.x, z: +c.dataset.z }; paint(cursor.x, cursor.z, { quiet: true }); }
    });

    // ---------- grid: keyboard / gamepad ----------
    grid.addEventListener('keydown', (e) => {
      const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (dirs[e.key] && !e.altKey && !e.ctrlKey) {
        const [dx, dz] = dirs[e.key];
        const nx = cursor.x + dx, nz = cursor.z + dz;
        if (nx < 0 || nz < 0 || nx >= d.map[0].length || nz >= d.map.length) return; // tepi: biarkan fokus keluar grid
        e.preventDefault();
        e.stopPropagation();
        cursor = { x: nx, z: nz };
        if (e.shiftKey) { if (!e.repeat) checkpoint(); paint(nx, nz, { quiet: true }); }
        else renderGrid();
        focusGrid();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        checkpoint();
        paint(cursor.x, cursor.z);
        focusGrid();
      }
    });

    renderTools();
    renderSize();
    renderGrid();
    syncFields();
    renderStatus();
    renderHistory();
  }

  function renderTools() {
    root.querySelectorAll('.ed-tool').forEach((b) => {
      const on = b.dataset.k === tool;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const grouped = TOOLS.find((t) => t.key === tool)?.grouped;
    const g = $('edGroup');
    g.classList.toggle('off', !grouped);
    g.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', +b.dataset.g === groupId);
      b.disabled = !grouped;
    });
  }
  function renderSize() {
    $('edW').textContent = d.map[0].length;
    $('edD').textContent = d.map.length;
  }
  function renderGrid() {
    const grid = $('edGrid');
    const W = d.map[0].length;
    const hadFocus = grid.contains(document.activeElement);
    grid.style.gridTemplateColumns = `repeat(${W}, 1fr)`;
    grid.style.maxWidth = `${W * 2.2}rem`;
    grid.innerHTML = d.map.map((row, z) => `<div role="row" class="erow">${[...row].map((ch, x) => {
      const cur = x === cursor.x && z === cursor.z;
      const extra = ch === 'S' ? `, menghadap ${DIR_NAME[d.startDir]}` : '';
      return `<div role="gridcell" class="ecell${ch === ' ' ? ' hole' : ''}${cur ? ' cursor' : ''}" data-x="${x}" data-z="${z}"
        tabindex="${cur ? 0 : -1}" aria-label="${cellName(ch)}${extra}, kolom ${x + 1} baris ${z + 1}"
        style="background:${cellColor(ch)}">${cellText(ch, d)}</div>`;
    }).join('')}</div>`).join('');
    if (hadFocus) focusGrid();
  }
  function focusGrid() {
    root.querySelector('.ecell.cursor')?.focus({ preventScroll: true });
  }
  function syncFields() {
    $('edDir').value = d.startDir;
    $('edTheme').value = d.theme;
    $('edTime').value = d.time;
    $('edLimit').value = d.limit;
    $('edKind').value = d.monsterKind;
    $('edAwake').value = d.cycle.awake;
    $('edSleep').value = d.cycle.sleep;
  }
  function renderHistory() {
    if (!$('edUndo')) return;
    $('edUndo').disabled = !undo.length;
    $('edRedo').disabled = !redo.length;
  }
  function renderStatus() {
    const box = $('edStatus');
    if (!box) return;
    const { warns } = analyze(d);
    const badge = d.verified
      ? '<span class="ed-badge ok">✓ Sudah diuji: level ini terbukti bisa diselesaikan</span>'
      : warns.length
        ? `<span class="ed-badge warn">⚠ ${warns.length} masalah ditemukan</span>`
        : '<span class="ed-badge">Belum diuji: tekan Uji coba untuk membuktikan bisa diselesaikan</span>';
    box.innerHTML = badge + (warns.length ? `<ul>${warns.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '');
  }

  // Pintasan yang berlaku di seluruh editor (kecuali saat mengetik di kolom isian).
  root.addEventListener('keydown', (e) => {
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) && e.target.type !== 'checkbox';
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { if (!typing) { e.preventDefault(); restore(undo, redo); } return; }
    if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { if (!typing) { e.preventDefault(); restore(redo, undo); } return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); api.play(d); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = TOOLS.find((t) => t.hot === e.key);
    if (t) { e.preventDefault(); selectTool(t.key); }
  });
  window.addEventListener('pointerup', () => { painting = false; });

  return {
    open(draft) {
      d = structuredClone(draft);
      undo = []; redo = [];
      const s = d.map.findIndex((r) => r.includes('S'));
      cursor = { x: Math.max(0, d.map[s].indexOf('S')), z: Math.max(0, s) };
      render();
      api.preview(draftToLevel(d), { resetCamera: true });
      setTimeout(focusGrid, 0);
    },
    get draft() { return d; },
  };
}
