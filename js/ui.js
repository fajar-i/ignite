// ============================================================
//  UI shell: screen stack, focus trap, navigasi keyboard & gamepad.
//
//  - Overlay (.overlay) yang terlihat = layar di atas stack. Hanya layar teratas
//    yang menerima input; sisanya dibuat `inert` (fokus & mouse terkunci).
//  - Saat layar dibuka: fokus ke [data-autofocus] atau kontrol pertama.
//    Saat ditutup: fokus kembali ke elemen yang tadi membukanya.
//  - Panah keyboard / D-pad / stik kiri memindah fokus secara spasial.
//  - Gamepad (layout standar): A = pilih, B = kembali, Y = jalankan, X = petunjuk,
//    LB/RB = geser blok terpilih naik/turun, Start = pengaturan.
//    Di grid editor: D-pad gerak kursor, tahan RT sambil D-pad = menggambar.
// ============================================================

const FOCUSABLE = [
  'button:not([disabled])', 'a[href]', 'input:not([disabled]):not([type=hidden])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

// checkVisibility() juga menolak isi <details> yang tertutup (content-visibility: hidden),
// yang tetap punya kotak layout tetapi tidak bisa difokus.
const isShown = (el) => {
  if (!el || !el.getClientRects().length) return false;
  if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true });
  return getComputedStyle(el).visibility !== 'hidden';
};

export function initUI({ app, overlays, actions }) {
  const stack = []; // [{ el, returnTo }]
  let padMode = false;

  const top = () => (stack.length ? stack[stack.length - 1].el : app);
  const focusables = (scope) => [...scope.querySelectorAll(FOCUSABLE)].filter((el) => isShown(el) && !el.closest('[inert]'));

  function setPad(on) {
    if (padMode === on) return;
    padMode = on;
    document.body.classList.toggle('pad-nav', on);
  }

  function focusEl(el) {
    if (!el) return;
    el.focus({ focusVisible: true, preventScroll: false });
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  function focusFirst(scope = top()) {
    const auto = [...scope.querySelectorAll('[data-autofocus]')].find((el) => isShown(el) && !el.closest('[inert]'));
    focusEl(auto || focusables(scope)[0]);
  }

  function sync() {
    const t = top();
    app.inert = stack.length > 0;
    for (const o of overlays) o.inert = o !== t;
  }

  // Overlay muncul/hilang -> push/pop stack otomatis.
  const mo = new MutationObserver((muts) => {
    for (const { target: el } of muts) {
      const open = !el.hidden;
      const i = stack.findIndex((s) => s.el === el);
      if (open && i < 0) {
        stack.push({ el, returnTo: document.activeElement });
        sync();
        setTimeout(() => focusFirst(el), 0);
      } else if (!open && i >= 0) {
        const [s] = stack.splice(i, 1);
        sync();
        setTimeout(() => {
          const back = s.returnTo;
          if (back && document.contains(back) && isShown(back) && !back.closest('[inert]') && top().contains(back)) focusEl(back);
          else if (stack.length || padMode) focusFirst();
        });
      }
    }
  });
  for (const o of overlays) {
    mo.observe(o, { attributes: true, attributeFilter: ['hidden'] });
    if (!o.hidden) stack.push({ el: o, returnTo: null });
  }
  sync();
  setTimeout(() => { if (stack.length) focusFirst(); }, 0);

  // ---------- navigasi spasial ----------
  function move(dir) {
    const scope = top();
    const items = focusables(scope);
    if (!items.length) return;
    const cur = document.activeElement;
    if (!cur || cur === document.body || !scope.contains(cur)) return focusFirst(scope);
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ranked = [];
    for (const el of items) {
      if (el === cur || el.contains(cur)) continue; // lewati diri sendiri & induknya
      const b = el.getBoundingClientRect();
      const dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
      const along = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
      const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 2) continue;
      ranked.push([along + across * 2.2, el]);
    }
    ranked.sort((a, b) => a[0] - b[0]);
    // ambil kandidat terdekat yang benar-benar menerima fokus
    for (const [, el] of ranked) {
      focusEl(el);
      if (document.activeElement === el) return;
    }
  }

  const isTextLike = (el) => el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
    || (el.tagName === 'INPUT' && !['button', 'checkbox', 'radio'].includes(el.type)));

  document.addEventListener('keydown', (e) => {
    const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (dirs[e.key] && !e.altKey && !e.ctrlKey && !e.metaKey && !isTextLike(document.activeElement)) {
      e.preventDefault();
      move(dirs[e.key]);
    }
    if (e.key === 'Escape') { e.preventDefault(); actions.back(); }
  });
  window.addEventListener('mousemove', () => setPad(false), { passive: true });
  window.addEventListener('keydown', (e) => { if (e.key.startsWith('Arrow') || e.key === 'Tab') setPad(true); });

  // ---------- gamepad ----------
  let padIndex = null, prev = [], lastDir = null, lastMove = 0, raf = 0;

  function stepValue(el, delta) {
    if (delta > 0) el.stepUp(); else el.stepDown();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function activate() {
    const a = document.activeElement;
    if (!a || a === document.body || !top().contains(a)) return focusFirst();
    if (a.tagName === 'SELECT') {
      a.selectedIndex = (a.selectedIndex + 1) % a.options.length;
      a.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (a.tagName === 'INPUT' && (a.type === 'number' || a.type === 'range')) {
      stepValue(a, 1);
    } else if (a.tagName === 'BUTTON' || a.tagName === 'A' || a.type === 'checkbox') {
      a.click();
    } else {
      a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  }

  function sendKey(key, opts = {}) {
    const a = document.activeElement;
    (a && a !== document.body ? a : document).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  }

  function loop() {
    const gp = padIndex != null ? navigator.getGamepads?.()[padIndex] : null;
    if (!gp) { raf = 0; return; }
    const b = gp.buttons.map((x) => x.pressed);
    const hit = (i) => b[i] && !prev[i];
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    let dir = null;
    if (b[12] || ay < -0.6) dir = 'up';
    else if (b[13] || ay > 0.6) dir = 'down';
    else if (b[14] || ax < -0.6) dir = 'left';
    else if (b[15] || ax > 0.6) dir = 'right';
    const now = performance.now();
    if (dir && (dir !== lastDir || now - lastMove > 200)) {
      setPad(true);
      const a = document.activeElement;
      if (a?.tagName === 'INPUT' && (a.type === 'range' || a.type === 'number') && (dir === 'left' || dir === 'right')) {
        stepValue(a, dir === 'right' ? 1 : -1);
      } else if (a?.closest?.('[data-own-arrows]')) {
        // kontrol komposit (mis. grid editor) mengurus panahnya sendiri; di tepi, fokus keluar
        const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir];
        const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: !!b[7] });
        a.dispatchEvent(ev);
        if (!ev.defaultPrevented) move(dir);
      } else move(dir);
      lastMove = now;
    }
    lastDir = dir;
    if (hit(0)) { setPad(true); activate(); }
    if (hit(1)) actions.back();
    if (hit(2)) actions.hint();
    if (hit(3)) actions.run();
    if (hit(4)) sendKey('ArrowUp', { altKey: true });
    if (hit(5)) sendKey('ArrowDown', { altKey: true });
    if (hit(9)) actions.menu();
    prev = b;
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('gamepadconnected', (e) => {
    padIndex = e.gamepad.index;
    setPad(true);
    actions.toast?.('Gamepad terhubung: A pilih · B kembali · Y jalankan · X petunjuk');
    if (!document.activeElement || document.activeElement === document.body) focusFirst();
    if (!raf) raf = requestAnimationFrame(loop);
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad.index === padIndex) padIndex = null;
  });

  return {
    focusFirst,
    get top() { return top(); },
    get depth() { return stack.length; },
  };
}
