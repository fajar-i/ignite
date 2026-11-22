// ============================================================
//  World: aturan grid murni (tanpa DOM / Three.js).
//  Dipakai oleh game (main.js) dan validator (tools/validate.mjs).
// ============================================================

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // utara, timur, selatan, barat

export const CONDITIONS = {
  trap: 'Ada jebakan di depan?',
  monster: 'Ada monster di depan?',
  sleep: 'Monster tertidur?',
};

// Karakter peta:
//  #  tembok          .  lantai          (spasi) lubang
//  ~  sungai/parit    ^  duri (jebakan)  S  start   E  pintu keluar
//  M  monster         1-9 tuas (id)      a-i jembatan milik tuas 1-9
//  X Y Z  gerbang milik tuas 1 2 3
export function parseLevel(level) {
  const rows = level.map;
  const D = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  const cells = [];
  const levers = new Map();
  const monsters = [];
  let start = null, exit = null;

  for (let z = 0; z < D; z++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const ch = rows[z][x] ?? ' ';
      let cell = { kind: 'floor' };
      if (ch === '#') cell = { kind: 'wall' };
      else if (ch === ' ') cell = { kind: 'hole' };
      else if (ch === '~') cell = { kind: 'river' };
      else if (ch === '^') cell = { kind: 'spikes' };
      else if (ch === 'S') start = { x, z };
      else if (ch === 'E') { exit = { x, z }; cell = { kind: 'floor', exit: true }; }
      else if (ch === 'M') monsters.push({ x, z });
      else if (ch >= '1' && ch <= '9') { levers.set(`${x},${z}`, +ch); cell = { kind: 'floor', lever: +ch }; }
      else if (ch >= 'a' && ch <= 'i') cell = { kind: 'bridge', id: ch.charCodeAt(0) - 96 };
      else if ('XYZ'.includes(ch)) cell = { kind: 'gate', id: 'XYZ'.indexOf(ch) + 1 };
      row.push(cell);
    }
    cells.push(row);
  }
  if (!start || !exit) throw new Error(`Level "${level.name}" butuh S dan E`);
  return { W, D, cells, levers, monsters, start, exit };
}

export class World {
  constructor(level) {
    this.level = level;
    this.def = parseLevel(level);
    this.isGolem = level.monsterKind === 'golem';
    this.cycle = level.monsterCycle || { awake: 2, sleep: 2 };
    this.reset();
  }

  /** offsets: fase awal tiap monster. Kosong = acak (monster tidak bisa dihafal). */
  reset(offsets) {
    const period = this.cycle.awake + this.cycle.sleep;
    this.x = this.def.start.x;
    this.z = this.def.start.z;
    this.dir = this.level.startDir ?? 1;
    this.tick = 0;
    this.active = new Set();
    this.status = 'playing'; // playing | won | lost
    this.monsters = this.def.monsters.map((m, i) => ({
      ...m,
      offset: offsets?.[i] ?? Math.floor(Math.random() * period),
    }));
  }

  cell(x, z) {
    if (z < 0 || z >= this.def.D || x < 0 || x >= this.def.W) return null;
    return this.def.cells[z][x];
  }
  isOpen(c) { return this.active.has(c.id); }
  monsterAt(x, z) { return this.monsters.find((m) => m.x === x && m.z === z) || null; }
  asleep(m) {
    const p = (this.tick + m.offset) % (this.cycle.awake + this.cycle.sleep);
    return p >= this.cycle.awake;
  }
  frontPos(n = 1) {
    const [dx, dz] = DIRS[this.dir];
    return { x: this.x + dx * n, z: this.z + dz * n };
  }

  /** Bahaya bila diinjak (lubang, sungai, duri, jembatan belum turun). */
  isDanger(c) {
    if (!c) return false;
    return c.kind === 'hole' || c.kind === 'river' || c.kind === 'spikes' || (c.kind === 'bridge' && !this.isOpen(c));
  }
  isBlocked(c) {
    return !c || c.kind === 'wall' || (c.kind === 'gate' && !this.isOpen(c));
  }

  check(cond) {
    const f = this.frontPos();
    const m = this.monsterAt(f.x, f.z);
    if (cond === 'trap') return this.isDanger(this.cell(f.x, f.z));
    if (cond === 'monster') return !!m;
    if (cond === 'sleep') return !!m && this.asleep(m);
    return false;
  }

  // Masuk ke petak (x,z). Mengembalikan hasil tanpa menaikkan tick.
  enter(x, z) {
    const c = this.cell(x, z);
    if (this.isBlocked(c)) return { result: 'bump' };
    const m = this.monsterAt(x, z);
    if (m && this.isGolem && this.asleep(m)) return { result: 'bump', golem: true };
    this.x = x; this.z = z;
    if (m && !this.asleep(m)) return { result: 'caught', monster: this.monsters.indexOf(m) };
    if (c.kind === 'hole') return { result: 'fall' };
    if (c.kind === 'river' || (c.kind === 'bridge' && !this.isOpen(c))) return { result: 'fall', river: true };
    if (c.kind === 'spikes') return { result: 'trap' };
    return { result: 'move' };
  }

  /** Jalankan satu perintah. type: move | jump | left | right | lever | wait */
  step(type) {
    const from = { x: this.x, z: this.z };
    let ev = { type, from };
    if (type === 'left') { this.dir = (this.dir + 3) % 4; ev.result = 'turn'; ev.delta = -1; }
    else if (type === 'right') { this.dir = (this.dir + 1) % 4; ev.result = 'turn'; ev.delta = 1; }
    else if (type === 'wait') ev.result = 'wait';
    else if (type === 'lever') {
      const id = this.def.levers.get(`${this.x},${this.z}`);
      if (id == null) ev.result = 'nolever';
      else {
        if (this.active.has(id)) this.active.delete(id); else this.active.add(id);
        ev.result = 'lever'; ev.id = id; ev.open = this.active.has(id);
      }
    } else if (type === 'move') {
      const f = this.frontPos();
      ev = { ...ev, ...this.enter(f.x, f.z) };
    } else if (type === 'jump') {
      const mid = this.frontPos(1), land = this.frontPos(2);
      const mc = this.cell(mid.x, mid.z);
      const midM = this.monsterAt(mid.x, mid.z);
      if (this.isBlocked(mc)) ev.result = 'bump';
      else if (midM) {
        if (this.isGolem) {
          if (this.asleep(midM)) ev = { ...ev, ...this.enter(land.x, land.z) };
          else { ev.result = 'caught'; ev.monster = this.monsters.indexOf(midM); }
        } else {
          ev.result = 'bump';
        }
      } else ev = { ...ev, ...this.enter(land.x, land.z) };
    }
    ev.to = { x: this.x, z: this.z };
    ev.dir = this.dir;
    if (!['caught', 'fall', 'trap'].includes(ev.result)) {
      const curM = this.monsterAt(this.x, this.z);
      if (curM && !this.asleep(curM)) {
        ev.result = 'caught';
        ev.monster = this.monsters.indexOf(curM);
      }
    }
    this.tick++;
    if (['caught', 'fall', 'trap'].includes(ev.result)) this.status = 'lost';
    else if (this.x === this.def.exit.x && this.z === this.def.exit.z) this.status = 'won';
    ev.status = this.status;
    return ev;
  }
}
