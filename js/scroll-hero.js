/* Global Connections — 01 hero: one shot (dark corridor → lobby → Gia) drawn frame by frame as the page scrolls.
   Needs js/site.js first. Scroll progress p through .gc-scrollhero (top of the section at the top of the screen → its
   bottom at the bottom) picks frame round(p * 182); the drawn frame eases toward it in requestAnimationFrame.
   Each [data-cap="a b c d"] fades in over p a→b and out over c→d (--v opacity, --y shift); the buttons work only
   while their caption is on. Frames load in the background after the poster: every 8th first, then the rest;
   until a frame arrives the nearest loaded one is drawn. Under reduced motion nothing runs: CSS shows the still. */
(() => {
  const hero = document.querySelector('[data-gc-scrollhero]');
  const reduce = window.GiaSite ? window.GiaSite.reduce : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!hero || reduce) return;
  const stage = hero.querySelector('.gc-scrollhero__stage');
  const canvas = hero.querySelector('.gc-scrollhero__canvas');
  const poster = hero.querySelector('.gc-scrollhero__poster img');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!stage || !ctx) return;

  const LAST = 182, LERP = 0.15, SHIFT = 24, PARALLEL = 6;
  const FOCUS_END = 0.72; // Gia's side at the end, for screens that see less than half the frame
  const set = window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
  const src = (i) => `assets/scroll-hero/${set}/f${String(i).padStart(3, '0')}.webp`;
  const frames = new Array(LAST + 1).fill(null);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  const caps = [...hero.querySelectorAll('[data-cap]')].map((el) => {
    const [a, b, c, d] = el.dataset.cap.split(' ').map(Number);
    const actions = el.querySelector('[data-cap-actions]');
    return { el, a, b, c, d, actions, links: actions ? [...actions.querySelectorAll('a, button')] : [], v: -1, y: null, on: null };
  });
  const setOn = (cap, on) => {
    if (cap.on === on) return;
    cap.on = on;
    cap.el.classList.toggle('is-on', on);
    if (!cap.actions) return;
    cap.actions.inert = !on;
    cap.links.forEach((a) => { if (on) a.removeAttribute('tabindex'); else a.tabIndex = -1; });
  };
  const updateCaps = (p) => caps.forEach((cap) => {
    const v = p < cap.a ? 0 : p < cap.b ? (p - cap.a) / (cap.b - cap.a) : p <= cap.c ? 1 : p < cap.d ? 1 - (p - cap.c) / (cap.d - cap.c) : 0;
    const vr = Math.round(v * 1000) / 1000;
    const y = Math.round((p < cap.b ? 1 - vr : vr - 1) * SHIFT * 10) / 10; // comes up from below, leaves upward
    if (vr !== cap.v) { cap.v = vr; cap.el.style.setProperty('--v', vr); }
    if (y !== cap.y) { cap.y = y; cap.el.style.setProperty('--y', y + 'px'); }
    setOn(cap, vr > 0.5);
  });

  /* ---------- Canvas: object-fit: cover, focus 50% (or Gia's side on narrow screens) 20% ---------- */
  let cw = 0, ch = 0, drawn = -1, drawnFx = -1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (w === canvas.width && h === canvas.height && cw) return; // phones: the URL bar resizes the window, not the stage
    cw = r.width; ch = r.height;
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    drawn = -1;
  };
  const nearest = (i) => {
    for (let d = 0; d <= LAST; d++) {
      if (i - d >= 0 && frames[i - d]) return i - d;
      if (i + d <= LAST && frames[i + d]) return i + d;
    }
    return -1;
  };
  const draw = (i, p) => {
    const k = nearest(i);
    if (k < 0 || !cw || !ch) return;
    const img = frames[k];
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const dw = iw * s, dh = ih * s;
    const fx = cw / dw < 0.5 ? 0.5 + (FOCUS_END - 0.5) * smooth(0.6, 1, p) : 0.5;
    const fxr = Math.round(fx * 1000) / 1000;
    if (k === drawn && fxr === drawnFx) return;
    drawn = k; drawnFx = fxr;
    ctx.drawImage(img, (cw - dw) * fxr, (ch - dh) * 0.2, dw, dh);
  };

  /* ---------- Scroll: the handler only moves the target; rAF eases the drawn frame toward it ---------- */
  let top = 0, run = 1, target = 0, cur = 0, shownP = -1, raf = 0;
  const measure = () => {
    top = hero.getBoundingClientRect().top + window.scrollY;
    run = Math.max(1, hero.offsetHeight - stage.offsetHeight);
  };
  const render = () => {
    const p = cur / LAST;
    draw(Math.round(cur), p);
    if (p !== shownP) { shownP = p; updateCaps(p); }
  };
  const tick = () => {
    raf = 0;
    cur += (target - cur) * LERP;
    if (Math.abs(target - cur) < 0.02) cur = target;
    render();
    if (cur !== target) raf = requestAnimationFrame(tick);
  };
  const onScroll = () => {
    target = clamp((window.scrollY - top) / run, 0, 1) * LAST;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const refresh = () => { resize(); measure(); onScroll(); render(); }; // draw now: resizing cleared the canvas

  /* ---------- Frames: after the poster, every 8th first, then the rest, a few at a time ---------- */
  const order = [];
  for (let i = 0; i <= LAST; i += 8) order.push(i);
  order.push(LAST);
  for (let i = 0; i <= LAST; i++) order.push(i);
  const queue = [...new Set(order)];
  const loadNext = () => {
    const i = queue.shift();
    if (i === undefined) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = src(i);
    const ready = img.decode ? img.decode() : new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; });
    ready.then(() => { frames[i] = img; if (!raf) draw(Math.round(cur), cur / LAST); }, () => {}).then(loadNext);
  };
  const startLoading = () => { for (let k = 0; k < PARALLEL; k++) loadNext(); };

  hero.classList.add('is-armed');
  refresh();
  cur = target; // no easing on the first paint (e.g. a reload halfway down the page)
  render();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', refresh);
  if (poster && !poster.complete) {
    poster.addEventListener('load', startLoading, { once: true });
    poster.addEventListener('error', startLoading, { once: true });
  } else startLoading();
})();
