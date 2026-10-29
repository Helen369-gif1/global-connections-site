/* Global Connections — standalone one-page site (index.html) — page script. Needs js/site.js and js/components.js first.
   01 hero chat preview and 04 example dialogue (step-by-step playback, Replay), 02 story cards (pinned row, cards join on scroll),
   03 area selector (ARIA tabs, marker highlight; pinned scene, tabs switch on scroll), 06 prompt chips and the demo answer.
   Without JS or under reduced motion every block shows its final state. Missing elements never throw. */
(() => {
  const reduce = window.GiaSite ? window.GiaSite.reduce : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Per-visit rule (DS 10): play when the element comes into view, reset once it has left the screen completely.
  const onVisit = (el, play, reset, threshold = 0.35) => {
    if (!('IntersectionObserver' in window)) { play(); return; }
    let played = false;
    new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting && en.intersectionRatio >= threshold && !played) { played = true; play(); }
    }), { threshold }).observe(el);
    new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting && played) { played = false; reset(); }
    }), { threshold: 0 }).observe(el);
  };

  /* ---------- 03 Area selector (declared first: the hero mini cards open an area) ---------- */
  const areas = document.querySelector('[data-gc-areas]');
  const areaTabs = areas ? [...areas.querySelectorAll('[role="tab"]')] : [];
  const markPanel = (panel) => {
    if (!panel) return;
    panel.classList.remove('is-marked');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-marked')));
  };
  const selectArea = (tab, { focus = false } = {}) => {
    if (!tab || tab.getAttribute('aria-selected') === 'true') { if (focus && tab) tab.focus(); return; }
    areaTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !on;
      if (on && !reduce) {
        panel.classList.remove('is-entering'); void panel.offsetWidth; panel.classList.add('is-entering');
        markPanel(panel);
      }
    });
    if (focus) tab.focus();
    tab.scrollIntoView && window.matchMedia('(max-width: 960px)').matches && tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  };

  /* 03 pinned scene: scroll progress p through .gc-can__pin picks the tab: [0, 1/3) Save, [1/3, 2/3) Earn extra,
     [2/3, 1] Work & goals. A click, an arrow key or a hero mini card selects the tab at once and scrolls smoothly to
     the middle of its third; scroll-driven switching waits until the page gets there (or the visitor scrolls).
     Not pinned at 960px and below, when the card photo would be shorter than MIN_PHOTO_H, under reduced motion
     or without subgrid: tabs switch on click as before. */
  const can = areas && areas.closest('[data-gc-can]');
  const canPin = can && can.querySelector('.gc-can__pin');
  const canStage = can && can.querySelector('.gc-can__stage');
  const canHead = can && can.querySelector('.gc-can__head');
  const canList = areas && areas.querySelector('.gc-areas__list');
  const canPanels = areaTabs.map((t) => document.getElementById(t.getAttribute('aria-controls'))).filter(Boolean);
  const narrowMQ = window.matchMedia('(max-width: 960px)');
  const MIN_PHOTO_H = 140; // below this the stage is too short for the card: keep the plain layout
  let canPinned = false, canStuck = false, canRaf = 0, goingTo = null, goingTimer = 0;

  const canTop = () => parseFloat(getComputedStyle(canStage).top) || 0;
  const canProgress = () => {
    const r = canPin.getBoundingClientRect();
    const run = r.height - canStage.offsetHeight;
    return run > 0 ? Math.min(1, Math.max(0, (canTop() - r.top) / run)) : 0;
  };
  const areaFor = (p) => Math.min(areaTabs.length - 1, Math.floor(p * areaTabs.length));
  const canUpdate = () => {
    canRaf = 0;
    if (!canPinned) return;
    const p = canProgress();
    canStuck = p > 0 && p < 1;
    const k = areaFor(p);
    if (goingTo !== null) { if (k !== goingTo) return; goingTo = null; }
    selectArea(areaTabs[k]);
  };
  const canScroll = () => { if (!canRaf) canRaf = requestAnimationFrame(canUpdate); };
  const stopGoing = () => { if (goingTo === null) return; goingTo = null; clearTimeout(goingTimer); canScroll(); };
  // Returns true when the scene fits pinned (call with .is-pinned on); sets --can-photo-h
  const measureCan = () => {
    can.style.removeProperty('--can-photo-h');
    const st = getComputedStyle(canStage);
    const avail = canStage.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
    const left = canHead.offsetHeight + (parseFloat(st.rowGap) || 0) + canList.offsetHeight;
    const was = canPanels.map((p) => p.hidden);
    canPanels.forEach((p) => { p.hidden = false; });
    let fixed = 0, photo = Infinity;
    canPanels.forEach((p) => {
      const box = p.querySelector('.media-frame__box');
      const h = box ? box.offsetHeight : 0;
      fixed = Math.max(fixed, p.offsetHeight - h);
      if (box) photo = Math.min(photo, h);
    });
    canPanels.forEach((p, i) => { p.hidden = was[i]; });
    const photoH = Math.floor(Math.min(photo, avail - fixed));
    if (left > avail || photoH < MIN_PHOTO_H) return false;
    can.style.setProperty('--can-photo-h', photoH + 'px');
    return true;
  };
  const setCanPinned = (on) => {
    if (on === canPinned) return;
    const before = can.getBoundingClientRect();
    const top = canPinned ? canTop() : 0;
    const stuck = canPinned && canStuck;
    canPinned = on;
    canStuck = false;
    can.classList.toggle('is-pinned', on);
    if (!on) { can.style.removeProperty('--can-photo-h'); stopGoing(); }
    // Keep the page still (instant: the page sets scroll-behavior: smooth). Unpinning while the stage was stuck
    // brings the scene under the header; with the section above the screen the content below stays put.
    if (stuck) window.scrollBy({ top: canPin.getBoundingClientRect().top - top, behavior: 'instant' });
    else if (before.bottom <= 0) window.scrollBy({ top: can.getBoundingClientRect().bottom - before.bottom, behavior: 'instant' });
  };
  const canRefresh = () => {
    let fits = false;
    if (!narrowMQ.matches) {
      const was = canPinned;
      can.classList.add('is-pinned');
      fits = measureCan();
      if (!was) can.classList.remove('is-pinned');
    }
    setCanPinned(fits);
    canScroll();
  };
  // Pinned: select now, then scroll to the middle of the tab's third
  const openArea = (tab, opts) => {
    if (!tab || !canPinned) { selectArea(tab, opts); return; }
    const k = areaTabs.indexOf(tab);
    selectArea(tab, opts);
    const r = canPin.getBoundingClientRect();
    const run = r.height - canStage.offsetHeight;
    goingTo = k;
    clearTimeout(goingTimer);
    goingTimer = setTimeout(stopGoing, 2000);
    window.scrollTo({ top: window.scrollY + r.top - canTop() + run * (k + 0.5) / areaTabs.length, behavior: 'smooth' });
  };
  if (can && canPin && canStage && canHead && canList && canPanels.length && !reduce
    && window.CSS && CSS.supports('grid-template-rows', 'subgrid')) {
    canRefresh();
    window.addEventListener('scroll', canScroll, { passive: true });
    window.addEventListener('resize', canRefresh);
    ['wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, stopGoing, { passive: true }));
    window.addEventListener('scrollend', stopGoing);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(canRefresh);
  }

  if (areas && areaTabs.length) {
    if (!reduce) {
      areas.classList.add('is-armed');
      onVisit(areas, () => markPanel(areas.querySelector('[role="tabpanel"]:not([hidden])')),
        () => areas.querySelectorAll('.is-marked').forEach((p) => p.classList.remove('is-marked')), 0.2);
    }
    areaTabs.forEach((t, i) => {
      t.addEventListener('click', () => openArea(t));
      let hoverTimer = null;
      t.addEventListener('mouseenter', () => {
        if (!fine.matches || canPinned) return; // pinned: the scroll position owns the tab
        hoverTimer = setTimeout(() => selectArea(t), 140);
      });
      t.addEventListener('mouseleave', () => { clearTimeout(hoverTimer); });
      t.addEventListener('keydown', (e) => {
        const n = areaTabs.length;
        let k = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') k = (i + 1) % n;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') k = (i - 1 + n) % n;
        else if (e.key === 'Home') k = 0;
        else if (e.key === 'End') k = n - 1;
        if (k === null) return;
        e.preventDefault();
        openArea(areaTabs[k], { focus: true });
      });
    });
  }
  document.querySelectorAll('.gc-mini[data-area]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (canPinned) e.preventDefault();
      openArea(document.getElementById('gc-tab-' + a.dataset.area));
    });
  });

  /* ---------- 01 / 04 Chat playback ---------- */
  const WORKING = /think|search|compar|prepar|check|look/i;
  const setupChat = (chat) => {
    const steps = [...chat.querySelectorAll('.gc-step')].sort((a, b) => a.dataset.step - b.dataset.step);
    const stateEl = chat.querySelector('[data-chat-state]');
    const scroller = chat.querySelector('[data-chat-scroll]');
    const name = chat.dataset.gcChat;
    const index = document.querySelectorAll('.gc-index [data-index]');
    const offers = chat.querySelectorAll('.gc-offer');
    let run = 0;

    const setState = (word) => {
      if (!stateEl || !word) return;
      stateEl.textContent = word;
      stateEl.classList.toggle('is-working', WORKING.test(word));
      stateEl.classList.toggle('is-ready', !WORKING.test(word) && word !== 'listening');
    };
    const setIndex = (n) => index.forEach((li) => {
      const k = Number(li.dataset.index);
      li.classList.toggle('is-done', k < n);
      li.classList.toggle('is-now', k === n);
    });
    const follow = (el) => {
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 2) return;
      const top = el.offsetTop + el.offsetHeight - scroller.clientHeight + 16;
      scroller.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    };
    const applyStep = (el) => {
      if (el.dataset.selectOffer) offers.forEach((o) => o.classList.toggle('is-selected', o.dataset.offer === el.dataset.selectOffer));
      if (el.dataset.laterOffer) offers.forEach((o) => { if (o.dataset.offer === el.dataset.laterOffer) o.classList.add('is-later'); });
      if (el.dataset.indexStep) setIndex(Number(el.dataset.indexStep));
    };
    const finish = () => {
      run++;
      chat.classList.remove('is-armed');
      steps.forEach((el) => { el.classList.add('is-shown'); if (el.hasAttribute('data-typing')) el.classList.remove('is-on'); else applyStep(el); });
      const last = steps.filter((el) => !el.hasAttribute('data-typing')).pop();
      setState(name === 'hero' ? 'found 3 options' : ((last && last.dataset.state) || 'ready'));
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    };
    const reset = () => {
      run++;
      chat.classList.add('is-armed');
      steps.forEach((el) => { el.classList.remove('is-shown'); if (el.hasAttribute('data-typing')) el.classList.remove('is-on'); });
      offers.forEach((o) => o.classList.remove('is-selected', 'is-later'));
      if (index.length && name === 'example') setIndex(0);
      setState('listening');
      if (scroller) scroller.scrollTop = 0;
    };
    const play = async () => {
      reset();
      const id = run;
      await wait(name === 'hero' ? 1200 : 400);
      for (const el of steps) {
        if (id !== run) return;
        if (el.hasAttribute('data-typing')) {
          setState('thinking');
          el.classList.add('is-on', 'is-shown');
          follow(el);
          await wait(1000);
          if (id !== run) return;
          el.classList.remove('is-on');
          continue;
        }
        const isUser = el.classList.contains('bubble--user');
        if (el.dataset.selectOffer) { applyStep({ dataset: { selectOffer: el.dataset.selectOffer } }); await wait(900); if (id !== run) return; }
        el.classList.add('is-shown');
        applyStep(el);
        setState(isUser ? 'thinking' : (el.dataset.state || (el.closest('.gc-minis') ? null : 'ready')));
        follow(el);
        const inMinis = !!el.closest('.gc-minis');
        await wait(inMinis ? 260 : el.classList.contains('gc-log') ? 750 : el.classList.contains('gc-reply') ? 1500 : 1000);
      }
      if (id === run && name === 'hero') setState('found 3 options');
    };

    if (reduce) { finish(); return { play: finish }; }
    reset();
    onVisit(chat, play, reset, name === 'hero' ? 0.5 : 0.35);
    return { play };
  };
  const players = {};
  document.querySelectorAll('[data-gc-chat]').forEach((chat) => { players[chat.dataset.gcChat] = setupChat(chat); });
  document.querySelectorAll('[data-chat-replay]').forEach((btn) => {
    const p = players[btn.dataset.chatReplay];
    if (!p || reduce) { btn.hidden = true; return; }
    btn.addEventListener('click', () => p.play());
  });

  /* ---------- Strip dots (04 offer cards) ---------- */
  const bindDots = (track, dotsBox) => {
    if (!track || !dotsBox) return;
    const dots = [...dotsBox.querySelectorAll('i')];
    const count = dotsBox.querySelector('[data-dots-count]');
    const items = [...track.children];
    let raf = 0;
    const update = () => {
      raf = 0;
      const left = track.getBoundingClientRect().left;
      let k = 0, best = Infinity;
      items.forEach((it, i) => { const d = Math.abs(it.getBoundingClientRect().left - left - parseFloat(getComputedStyle(track).paddingLeft || 0)); if (d < best) { best = d; k = i; } });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) k = items.length - 1;
      dots.forEach((d, i) => d.classList.toggle('is-on', i === k));
      if (count) count.textContent = (k + 1) + ' of ' + items.length;
    };
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(update); });
  };

  /* ---------- 02 Story cards: pinned row, cards join one at a time as the section scrolls ----------
     Scroll progress p through .gc-how__pin adds card 2, 3, 4 at 0.20 / 0.42 / 0.64. Each add or remove is a 600 ms
     time-based step: the new card grows from its top-right corner (or shrinks back into it), the others move to their
     new places (FLIP: measured before and after the change). Steps run one after another until the row matches p.
     Above 768px the group stays centered; on phones the row shifts so the newest card is centered. */
  const how = document.querySelector('[data-gc-how]');
  const howPin = how && how.querySelector('.gc-how__pin');
  const howStage = how && how.querySelector('.gc-how__stage');
  const howTrack = how && how.querySelector('.gc-stories__track');
  if (howPin && howStage && howTrack && !reduce && typeof howTrack.animate === 'function') {
    const cards = [...howTrack.querySelectorAll('.gc-story')];
    const head = how.querySelector('.gc-how__head');
    const row = howTrack.parentElement;
    const srList = how.querySelector('[data-gc-stories-sr]');
    const phoneMQ = window.matchMedia('(max-width: 768px)');
    const STEPS = [0.20, 0.42, 0.64];
    const DUR = 600, EASE = 'cubic-bezier(.65, 0, .35, 1)';
    const MIN_CARD_H = 280; // below this the stage is too short to pin (landscape phones): keep the grid
    let pinned = false, shown = 1, target = 1, cardW = 264, gap = 16, running = [], raf = 0;

    const progress = () => {
      const r = howPin.getBoundingClientRect();
      const run = r.height - howStage.offsetHeight;
      const top = parseFloat(getComputedStyle(howStage).top) || 0;
      return run > 0 ? Math.min(1, Math.max(0, (top - r.top) / run)) : 0;
    };
    const countFor = (p) => 1 + STEPS.filter((s) => p >= s).length;
    const mark = () => cards.forEach((c, i) => {
      c.classList.remove('is-leaving');
      c.classList.toggle('is-out', i >= shown);
      c.classList.toggle('is-newest', i === shown - 1);
    });
    // Phones only: shift the row so the newest card is centered in the stage
    const place = () => {
      howTrack.style.transform = pinned && phoneMQ.matches
        ? `translateX(${howStage.clientWidth / 2 - cardW / 2 - (shown - 1) * (cardW + gap)}px)` : '';
    };
    // Returns the card height that fits; the lead-to-cards gap never shrinks
    const measure = () => {
      gap = parseFloat(getComputedStyle(howTrack).columnGap) || 16;
      const box = row.getBoundingClientRect().width - (parseFloat(getComputedStyle(row).paddingLeft) || 0) * 2;
      cardW = Math.floor(phoneMQ.matches ? Math.min(300, window.innerWidth - 48) : Math.min(264, (box - 3 * gap) / 4));
      const st = getComputedStyle(howStage);
      const avail = howStage.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom)
        - (head ? head.offsetHeight : 0) - (parseFloat(getComputedStyle(row).marginTop) || 0);
      const cardH = Math.floor(Math.min(480, avail));
      how.style.setProperty('--card-w', cardW + 'px');
      how.style.setProperty('--card-h', cardH + 'px');
      return cardH;
    };
    const step = () => {
      if (!pinned || running.length || shown === target) return;
      const adding = target > shown;
      const card = cards[adding ? shown : shown - 1];
      const others = cards.slice(0, adding ? shown : shown - 1);
      const before = others.map((c) => c.getBoundingClientRect().left);
      const cardBefore = card.getBoundingClientRect();
      if (adding) { shown++; card.classList.remove('is-out'); } else { shown--; card.classList.add('is-leaving'); }
      cards.forEach((c, i) => c.classList.toggle('is-newest', i === shown - 1));
      place();
      const opts = { duration: DUR, easing: EASE, fill: 'forwards' };
      const moves = others.map((c, i) => {
        const dx = before[i] - c.getBoundingClientRect().left;
        return c.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], opts);
      });
      let grow;
      if (adding) grow = card.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], opts);
      else {
        // The leaving card is out of the flow now: keep it on its old spot while it shrinks
        const r = card.getBoundingClientRect();
        const at = `translate(${cardBefore.left - r.left}px, ${cardBefore.top - r.top}px)`;
        grow = card.animate([{ transform: `${at} scale(1)` }, { transform: `${at} scale(0)` }], opts);
      }
      running = [grow, ...moves];
      Promise.allSettled(running.map((a) => a.finished)).then(() => {
        if (!adding) { card.classList.remove('is-leaving'); card.classList.add('is-out'); }
        running.forEach((a) => a.cancel());
        running = [];
        step();
      });
    };
    const update = () => {
      raf = 0;
      if (!pinned) return;
      target = countFor(progress());
      step();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const setPinned = (on) => {
      if (on === pinned) return;
      pinned = on;
      running.forEach((a) => a.finish());
      how.classList.toggle('is-pinned', on);
      if (on) howTrack.setAttribute('aria-hidden', 'true'); else howTrack.removeAttribute('aria-hidden');
      if (srList) srList.hidden = !on;
      if (on) { shown = target = countFor(progress()); mark(); }
      else cards.forEach((c) => c.classList.remove('is-out', 'is-leaving', 'is-newest'));
      place();
    };
    const refresh = () => {
      running.forEach((a) => a.finish());
      setPinned(true);
      if (measure() < MIN_CARD_H) { setPinned(false); return; }
      place();
      onScroll();
    };
    refresh();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }
  bindDots(document.querySelector('.gc-offers__track'), document.querySelector('.gc-offers .gc-dots'));

  /* ---------- 06 Prompt chips and the demo answer ---------- */
  const form = document.getElementById('gc-ask');
  const input = document.getElementById('gc-ask-input');
  const answer = document.getElementById('gc-answer');
  if (form && input && answer) {
    const text = answer.querySelector('[data-answer-text]');
    const cta = answer.querySelector('[data-answer-cta]');
    const chips = [...document.querySelectorAll('.gc-prompt')];
    const REPLIES = {
      save: 'Happy to help. Tell me what you buy most often, and I’ll look for discounts and rewards that apply, without changing what you like.',
      earn: 'Sure. I’ll look for short surveys and tasks that fit about 20 minutes, and show the estimated reward, requirements and conditions before you start.',
      compare: 'Let’s do it. Share your current plan and price, and I’ll compare it with other plans, including better terms with your current provider.',
      projects: 'Tell me about your experience and how much time you have. I’ll look for projects that match and explain the workload and terms before you decide.',
      typed: 'Thanks, I’ll take that into account. I’ll ask a follow-up question if I need one, look for options that fit and explain each one before you decide.',
      empty: 'Hi, I’m Gia. Tell me what you’d like to achieve: save, earn extra or put your experience to work. I’ll look for options that fit you.'
    };
    chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
    const show = (key, withCta) => {
      text.textContent = REPLIES[key] || REPLIES.typed;
      const wasHidden = answer.hidden;
      answer.hidden = false;
      if (cta && withCta) cta.hidden = false;
      if (!reduce && wasHidden) { answer.classList.remove('is-entering'); void answer.offsetWidth; answer.classList.add('is-entering'); }
    };
    chips.forEach((c) => c.addEventListener('click', () => {
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      input.value = c.textContent.trim();
      show(c.dataset.prompt, false);
      input.focus();
    }));
    input.addEventListener('input', () => {
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x.textContent.trim() === input.value.trim())));
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      const chip = chips.find((x) => x.textContent.trim() === v);
      show(v ? (chip ? chip.dataset.prompt : 'typed') : 'empty', true);
    });
  }
})();

/* Standalone shell: mark the section in view in the header links, shrink the header after the first screen. */
(() => {
  const header = document.querySelector('.gcs-header');
  if (!header) return;
  const links = [...document.querySelectorAll('.gcs-header .site-nav a[href^="#"], .mobile-menu .mm a[href^="#"]')];
  const sections = [...document.querySelectorAll('main > section[id]')];
  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle('is-compact', window.scrollY > 80);
    const line = window.innerHeight * 0.45;
    const hit = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= line && r.bottom > line; });
    const id = hit ? (hit.dataset.nav || hit.id) : null;
    links.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'));
  };
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  update();
})();
