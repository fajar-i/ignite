// Validasi otomatis: setiap stage wajib bisa diselesaikan oleh solusi acuannya,
// untuk SEMUA kemungkinan fase monster. Jalankan: node tools/validate.mjs
import { LEVELS } from '../js/levels.js';
import { World } from '../js/world.js';
import { fromCompact, simulate, countBlocks } from '../js/interpreter.js';

let failed = 0;

function offsetCombos(n, period) {
  if (n === 0) return [[]];
  const rest = offsetCombos(n - 1, period);
  const out = [];
  for (let o = 0; o < period; o++) for (const r of rest) out.push([o, ...r]);
  return out;
}

for (const lv of LEVELS) {
  const world = new World(lv);
  const period = world.cycle.awake + world.cycle.sleep;
  const combos = offsetCombos(world.def.monsters.length, period);
  const prog = fromCompact(lv.solution);
  const fn = lv.solutionFn ? fromCompact(lv.solutionFn) : [];
  const blocks = countBlocks(prog) + countBlocks(fn);

  let ok = 0;
  for (const offs of combos) {
    world.reset(offs);
    const r = simulate(prog, fn, world);
    if (r.status === 'won') ok++;
    else console.log(`  stage ${lv.id} offsets ${offs}: ${r.status} at (${world.x},${world.z})`);
  }
  const limitOk = lv.limit == null || blocks <= lv.limit;
  const pass = ok === combos.length && limitOk;
  if (!pass) failed++;
  console.log(`${pass ? 'OK  ' : 'FAIL'} Stage ${lv.id} ${lv.name}: ${ok}/${combos.length} menang, ${blocks} blok${lv.limit ? ` (batas ${lv.limit})` : ''}`);

  if (lv.initialProgram) {
    let buggyWins = 0;
    for (const offs of combos) {
      world.reset(offs);
      if (simulate(fromCompact(lv.initialProgram), [], world).status === 'won') buggyWins++;
    }
    const bugOk = buggyWins === 0;
    if (!bugOk) failed++;
    console.log(`${bugOk ? 'OK  ' : 'FAIL'}   program bawaan (berbug) menang ${buggyWins}/${combos.length} (harus 0)`);
  }
}

process.exit(failed ? 1 : 0);
