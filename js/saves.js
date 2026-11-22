// ============================================================
//  Slot simpan (profil) ala game lama.
//  Kunci localStorage:
//    kesatria.<k>            -> global (pengaturan, suara, slot aktif)
//    kesatria.s<N>.<k>       -> milik slot N (nama, progres, program, statistik, level custom)
// ============================================================
const ROOT = 'kesatria.';
export const SLOT_COUNT = 3;
const GLOBAL = new Set(['settings', 'muted', 'activeSlot']);
const SAVE_FORMAT = 'eyes-for-the-nameless-save';
const ACCEPTED_FORMATS = new Set([SAVE_FORMAT, 'mata-sang-kesatria-save']);

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };
const lsKeys = () => { try { return Object.keys(localStorage); } catch { return []; } };

let slot = 1;
const keyOf = (k, s = slot) => (GLOBAL.has(k) ? ROOT + k : `${ROOT}s${s}.${k}`);
const slotPrefix = (s) => `${ROOT}s${s}.`;

export function initSaves() {
  // Migrasi: data dari versi tanpa slot dipindahkan ke Slot 1.
  if (lsGet(ROOT + 'activeSlot') === null) {
    for (const k of lsKeys()) {
      if (!k.startsWith(ROOT) || /^kesatria\.s\d+\./.test(k)) continue;
      const short = k.slice(ROOT.length);
      if (GLOBAL.has(short)) continue;
      lsSet(slotPrefix(1) + short, lsGet(k));
      lsDel(k);
    }
    if (lsGet(slotPrefix(1) + 'player') !== null) lsSet(slotPrefix(1) + 'savedAt', JSON.stringify(Date.now()));
    lsSet(ROOT + 'activeSlot', '1');
  }
  const n = Number(JSON.parse(lsGet(ROOT + 'activeSlot') || '1'));
  slot = n >= 1 && n <= SLOT_COUNT ? n : 1;
}

export function store(k, v) {
  lsSet(keyOf(k), JSON.stringify(v));
  if (!GLOBAL.has(k) && k !== 'savedAt') lsSet(keyOf('savedAt'), JSON.stringify(Date.now()));
}
export function load(k, d) {
  try { const v = lsGet(keyOf(k)); return v === null ? d : JSON.parse(v); } catch { return d; }
}
export function remove(k) { lsDel(keyOf(k)); }

export const activeSlot = () => slot;
export function setActiveSlot(n) {
  slot = n;
  lsSet(ROOT + 'activeSlot', JSON.stringify(n));
}
export function touch() { lsSet(keyOf('savedAt'), JSON.stringify(Date.now())); }

function slotEntries(s) {
  const p = slotPrefix(s);
  return lsKeys().filter((k) => k.startsWith(p)).map((k) => [k.slice(p.length), lsGet(k)]);
}
const readSlot = (s, k, d) => { try { const v = lsGet(slotPrefix(s) + k); return v === null ? d : JSON.parse(v); } catch { return d; } };

/** Ringkasan untuk kartu slot. */
export function slotInfo(s) {
  const player = readSlot(s, 'player', null);
  if (!player?.name) return { slot: s, empty: true };
  const progress = { unlocked: 1, stars: {}, ...readSlot(s, 'progress', {}) };
  const stars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  return {
    slot: s, empty: false, name: player.name, stars, unlocked: progress.unlocked,
    done: Object.keys(progress.stars).length, savedAt: readSlot(s, 'savedAt', null),
    customs: readSlot(s, 'custom', []).length,
  };
}

export function clearSlot(s) {
  for (const [k] of slotEntries(s)) lsDel(slotPrefix(s) + k);
}

export function exportSlot(s) {
  return {
    format: SAVE_FORMAT, version: 1, exportedAt: new Date().toISOString(),
    data: Object.fromEntries(slotEntries(s)),
  };
}

/** Validasi file simpanan; lempar Error berbahasa Indonesia bila tidak sah. */
export function parseSaveFile(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('File bukan simpanan yang sah (JSON rusak).'); }
  if (!ACCEPTED_FORMATS.has(obj?.format) || typeof obj.data !== 'object' || !obj.data) throw new Error('File ini bukan simpanan Eyes for the Nameless.');
  const player = (() => { try { return JSON.parse(obj.data.player); } catch { return null; } })();
  if (!player?.name) throw new Error('Simpanan tidak berisi profil pemain.');
  for (const [k, v] of Object.entries(obj.data)) {
    if (typeof v !== 'string' || !/^[\w.-]+$/.test(k)) throw new Error('Isi simpanan tidak dikenali.');
  }
  return obj;
}
export function importInto(s, obj) {
  clearSlot(s);
  for (const [k, v] of Object.entries(obj.data)) lsSet(slotPrefix(s) + k, v);
  lsSet(slotPrefix(s) + 'savedAt', JSON.stringify(Date.now()));
}
