// ============================================================
//  Interpreter blok: mengubah susunan blok menjadi aliran perintah.
//  Generator -> kondisi dibaca saat itu juga (setelah perintah
//  sebelumnya dijalankan), jadi sensor selalu melihat dunia terkini.
// ============================================================

export const LIMITS = { maxSteps: 400, maxDepth: 12 };

export class LimitError extends Error {
  constructor(kind) {
    super(kind === 'depth' ? 'Fungsi memanggil dirinya terlalu dalam' : 'Terlalu banyak langkah');
    this.kind = kind;
  }
}

let nextId = 1;
export const newId = () => nextId++;
export const bumpId = (n) => { nextId = Math.max(nextId, n + 1); };

/** Format ringkas (dipakai di data level) -> node dengan id.
 *  'maju' | 'kiri' | 'kanan' | 'lompat' | 'tuas' | 'tunggu' | 'panggil'
 *  ['ulangi', n, [...]]   ['jika', 'trap'|'monster'|'sleep', [...maka], [...lainnya]] */
const SHORT = { maju: 'move', kiri: 'left', kanan: 'right', lompat: 'jump', tuas: 'lever', tunggu: 'wait', panggil: 'call' };
export function fromCompact(list) {
  return list.map((item) => {
    if (typeof item === 'string') return { id: newId(), type: SHORT[item] };
    const [kind, a, b, c] = item;
    if (kind === 'ulangi') return { id: newId(), type: 'repeat', count: a, body: fromCompact(b) };
    if (kind === 'jika') return { id: newId(), type: 'if', cond: a, then: fromCompact(b), else: fromCompact(c || []) };
    throw new Error('Blok tidak dikenal: ' + kind);
  });
}

export const childLists = (n) => (n.type === 'repeat' ? [n.body] : n.type === 'if' ? [n.then, n.else] : []);
export const countBlocks = (list) => list.reduce((s, n) => s + 1 + childLists(n).reduce((a, l) => a + countBlocks(l), 0), 0);

/**
 * yield { kind: 'cmd', node }            -> pemanggil menjalankan world.step(node.type)
 * yield { kind: 'eval', node, result }   -> kondisi Jika dievaluasi
 * yield { kind: 'call', node }           -> fungsi dipanggil
 */
export function* interpret(program, fnBody, world, limits = LIMITS) {
  let steps = 0;
  function* runList(list, depth) {
    for (const n of list) {
      if (world.status !== 'playing') return;
      if (++steps > limits.maxSteps) throw new LimitError('steps');
      if (n.type === 'repeat') {
        for (let i = 0; i < n.count; i++) {
          if (world.status !== 'playing') return;
          yield* runList(n.body, depth);
        }
      } else if (n.type === 'if') {
        const result = world.check(n.cond);
        yield { kind: 'eval', node: n, result };
        yield* runList(result ? n.then : n.else, depth);
      } else if (n.type === 'call') {
        if (depth >= limits.maxDepth) throw new LimitError('depth');
        yield { kind: 'call', node: n };
        yield* runList(fnBody || [], depth + 1);
      } else {
        yield { kind: 'cmd', node: n };
      }
    }
  }
  yield* runList(program, 0);
}

/** Jalankan tanpa animasi (untuk validator & tes). */
export function simulate(program, fnBody, world) {
  try {
    for (const y of interpret(program, fnBody, world)) {
      if (y.kind === 'cmd') world.step(y.node.type);
    }
  } catch (e) {
    if (!(e instanceof LimitError)) throw e;
    return { status: 'limit', world };
  }
  return { status: world.status, world };
}
