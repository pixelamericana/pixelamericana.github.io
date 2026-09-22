/* Pixel Americana New Tab. Same file runs in the Chrome/Firefox extension and on the website.
   Scenes come from registry.json (built by build.py from library/). */
(() => {
  const CFG = Object.assign({ assets: '', home: 'index.html' }, window.PA_CONFIG || {});
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    json(k, d) { try { return JSON.parse(this.get(k, '')) ?? d; } catch (e) { return d; } }
  };
  const X = (window.browser && browser.runtime && browser.runtime.id) ? browser : (window.chrome && chrome.runtime && chrome.runtime.id) ? chrome : null;
  const IS_EXT = !!X, IS_FIREFOX = typeof browser !== 'undefined' && !!(browser.runtime && browser.runtime.getBrowserInfo);
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = $('art'), ctx = cv.getContext('2d');
  let REG = [], BY = {}, cur = null, img = null, frame = 0, timer = null;
  let motion = store.get('pa-motion', reduce ? 'off' : 'on');
  let favs = new Set(store.json('pa-favs', []));

  /* ── scene rendering ─────────────────────────────── */
  function draw() {
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, frame * 270, 480, 270, 0, 0, 480, 270);
  }
  function lumOf(hex) { const h = hex.replace('#', ''); return (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255; }
  function setScene(slug, save) {
    const s = BY[slug] || REG[0]; if (!s) return;
    cur = s; frame = 0;
    if (save) store.set('pa-scene', s.slug);
    const r = document.documentElement.style;
    r.setProperty('--bg', s.bg); r.setProperty('--ink', s.text); r.setProperty('--accent', s.accent);
    r.setProperty('--accent-ink', lumOf(s.accent) > 0.55 ? '#111' : '#FFF6E6'); r.setProperty('--pos', s.position || '50% 100%');
    document.documentElement.dataset.light = String(lumOf(s.bg) > 0.6);
    const im = new Image(); im.onload = () => { if (cur === s) { img = im; draw(); } }; im.src = CFG.assets + 'scenes/' + s.slug + '.webp';
    clearInterval(timer);
    timer = setInterval(() => { if (motion === 'on' && !document.hidden && img) { frame = (frame + 1) % s.frames; draw(); } }, s.ms || 130);
    $('scene-name').textContent = s.title;
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('current', c.dataset.slug === s.slug));
  }

  /* ── gallery ─────────────────────────────────────── */
  const dlg = $('gallery'), grid = $('grid'), chips = $('chips'), q = $('g-search');
  let cat = store.get('pa-cat', 'All');
  function cats() {
    const m = new Map(); REG.forEach(s => m.set(s.category, (m.get(s.category) || 0) + 1));
    return [['All', REG.length], ['Favorites', REG.filter(s => favs.has(s.slug)).length], ...[...m.entries()].sort()];
  }
  function renderChips() {
    chips.replaceChildren(...cats().map(([name, n]) => {
      const b = el('button', 'chip'); b.type = 'button';
      b.setAttribute('aria-pressed', String(name === cat));
      b.append(name, el('span', 'n', n));
      b.addEventListener('click', () => { cat = name; store.set('pa-cat', cat); renderChips(); renderGrid(); });
      return b;
    }));
  }
  function renderGrid() {
    const t = q.value.trim().toLowerCase();
    const list = REG.filter(s => (cat === 'All' || (cat === 'Favorites' ? favs.has(s.slug) : s.category === cat)) &&
      (!t || (s.title + ' ' + s.category + ' ' + (s.tags || []).join(' ') + ' ' + s.line).toLowerCase().includes(t)));
    if (!list.length) {
      grid.replaceChildren(el('li', 'empty', cat === 'Favorites' && !t ? 'No favorites yet. Tap the star on any scene to keep it here.' : 'No scenes match that search.'));
      return;
    }
    grid.replaceChildren(...list.map(s => {
      const li = el('li', 'card' + (cur && cur.slug === s.slug ? ' current' : '')); li.dataset.slug = s.slug;
      const b = el('button', 'pick'); b.type = 'button';
      const im = el('img'); im.src = CFG.assets + 'thumbs/' + s.slug + '.webp'; im.alt = ''; im.loading = 'lazy'; im.width = 240; im.height = 135;
      b.append(im, el('span', 't', s.title), el('span', 'c', s.category + (s.mode ? ' · ' + s.mode : '')));
      b.addEventListener('click', () => { setScene(s.slug, true); dlg.close(); });
      const f = el('button', 'fav', '★'); f.type = 'button';
      f.setAttribute('aria-pressed', String(favs.has(s.slug))); f.setAttribute('aria-label', (favs.has(s.slug) ? 'Remove ' : 'Add ') + s.title + ' to favorites');
      f.addEventListener('click', e => {
        e.stopPropagation(); favs.has(s.slug) ? favs.delete(s.slug) : favs.add(s.slug);
        store.set('pa-favs', JSON.stringify([...favs])); renderChips(); renderGrid();
      });
      li.append(b, f); return li;
    }));
  }
  $('open-gallery').addEventListener('click', () => { renderChips(); renderGrid(); dlg.showModal(); q.focus(); });
  $('g-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  q.addEventListener('input', renderGrid);

  const mbtn = $('motion');
  function paintMotion() { mbtn.setAttribute('aria-pressed', String(motion === 'on')); mbtn.querySelector('span').textContent = motion === 'on' ? 'Motion on' : 'Motion off'; }
  mbtn.addEventListener('click', () => { motion = motion === 'on' ? 'off' : 'on'; store.set('pa-motion', motion); if (motion === 'off') { frame = 0; draw(); } paintMotion(); });

  /* ── favicons: the browser's own cache inside Chrome, Google's favicon service elsewhere ── */
  function favicon(url, size) {
    if (IS_EXT && !IS_FIREFOX && X.runtime.getURL) {
      const u = new URL(X.runtime.getURL('/_favicon/')); u.searchParams.set('pageUrl', url); u.searchParams.set('size', String(size)); return u.toString();
    }
    try { return 'https://www.google.com/s2/favicons?sz=' + (size * 2) + '&domain_url=' + encodeURIComponent(new URL(url).origin); } catch (e) { return ''; }
  }
  function iconImg(url, label, size) {
    const w = el('span', 'fi'); const im = el('img'); im.alt = ''; im.width = size; im.height = size; im.src = favicon(url, size);
    im.onerror = () => { im.remove(); w.textContent = (label || '?').trim().charAt(0).toUpperCase(); w.classList.add('letter'); };
    w.append(im); return w;
  }

  /* ── top right: Gmail · Images · apps · account (like google.com) ── */
  const APPS = [
    ['Account', 'https://myaccount.google.com/'], ['Search', 'https://www.google.com/'], ['Maps', 'https://maps.google.com/'],
    ['YouTube', 'https://www.youtube.com/'], ['Gemini', 'https://gemini.google.com/'], ['News', 'https://news.google.com/'],
    ['Gmail', 'https://mail.google.com/mail/'], ['Meet', 'https://meet.google.com/'], ['Chat', 'https://chat.google.com/'],
    ['Contacts', 'https://contacts.google.com/'], ['Drive', 'https://drive.google.com/'], ['Calendar', 'https://calendar.google.com/'],
    ['Translate', 'https://translate.google.com/'], ['Photos', 'https://photos.google.com/'], ['Play', 'https://play.google.com/'],
    ['Docs', 'https://docs.google.com/document/'], ['Sheets', 'https://docs.google.com/spreadsheets/'], ['Slides', 'https://docs.google.com/presentation/'],
    ['Keep', 'https://keep.google.com/'], ['Classroom', 'https://classroom.google.com/'], ['Shopping', 'https://shopping.google.com/'],
    ['Finance', 'https://www.google.com/finance/'], ['Books', 'https://books.google.com/'], ['Earth', 'https://earth.google.com/'],
  ];
  const appsBtn = $('apps-btn'), apps = $('apps');
  let appsBuilt = false;
  function toggleApps(show) {
    if (show && !appsBuilt) {
      const ul = el('ul', 'apps-grid');
      APPS.forEach(([n, u]) => { const li = el('li'); const a = el('a'); a.href = u; a.append(iconImg(u, n, 32), el('span', null, n)); li.append(a); ul.append(li); });
      const more = el('a', 'apps-more', 'More from Google'); more.href = 'https://about.google/products/';
      apps.append(ul, more); appsBuilt = true;
    }
    apps.hidden = !show; appsBtn.setAttribute('aria-expanded', String(show));
  }
  appsBtn.addEventListener('click', e => { e.stopPropagation(); toggleApps(apps.hidden); });
  document.addEventListener('click', e => { if (!apps.hidden && !apps.contains(e.target)) toggleApps(false); });

  // account: Chrome can tell an extension which Google account the browser is signed in to (email only, never a password)
  const avatar = $('avatar'), letter = $('avatar-letter');
  function paintAccount(email) {
    if (email) {
      letter.textContent = email.charAt(0).toUpperCase(); avatar.title = 'Google Account\n' + email; avatar.classList.add('signed-in');
      const hue = [...email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7); avatar.style.setProperty('--av', `hsl(${hue} 55% 42%)`);
      avatar.href = 'https://myaccount.google.com/?authuser=' + encodeURIComponent(email);
      $('g-gmail').href = 'https://mail.google.com/mail/u/?authuser=' + encodeURIComponent(email);
    } else { letter.textContent = ''; avatar.classList.remove('signed-in'); }
  }
  try {
    if (IS_EXT && X.identity && X.identity.getProfileUserInfo) {
      const cb = info => paintAccount(info && info.email);
      const r = X.identity.getProfileUserInfo({ accountStatus: 'ANY' }, cb);
      if (r && r.then) r.then(cb, () => paintAccount(''));
    } else paintAccount('');
  } catch (e) { paintAccount(''); }

  /* ── shortcuts (most visited, like Chrome's own new tab) ── */
  const tiles = $('tiles'), tToggle = $('tiles-toggle');
  let showTiles = store.get('pa-tiles', 'on') === 'on', hiddenTiles = new Set(store.json('pa-tiles-hidden', []));
  const topSitesApi = IS_EXT && X.topSites && X.topSites.get ? X.topSites : null;
  function renderTiles() {
    if (!topSitesApi) return;
    tToggle.hidden = false; tToggle.setAttribute('aria-pressed', String(showTiles));
    tiles.hidden = !showTiles; if (!showTiles) return;
    const done = list => {
      const items = (list || []).filter(s => /^https?:/.test(s.url) && !hiddenTiles.has(s.url)).slice(0, 8);
      tiles.replaceChildren(...items.map(s => {
        const li = el('li', 'tile'); const a = el('a'); a.href = s.url; a.title = s.title || s.url;
        let host = ''; try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch (e) {}
        a.append(iconImg(s.url, s.title || host, 24), el('span', 'tl', s.title || host));
        const x = el('button', 'tile-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + (s.title || host));
        x.addEventListener('click', e => { e.preventDefault(); hiddenTiles.add(s.url); store.set('pa-tiles-hidden', JSON.stringify([...hiddenTiles])); renderTiles(); });
        li.append(a, x); return li;
      }));
      tiles.hidden = !items.length;
    };
    try { const r = topSitesApi.get(done); if (r && r.then) r.then(done); } catch (e) {}
  }
  tToggle.addEventListener('click', () => { showTiles = !showTiles; store.set('pa-tiles', showTiles ? 'on' : 'off'); renderTiles(); });

  /* ── search ── */
  const form = $('search'), qq = $('q'), clearBtn = $('q-clear'), wrap = $('q-wrap');
  const searchApi = IS_EXT ? (X.search || null) : null;
  const looksLikeUrl = t => /^[a-z]+:\/\/\S+$/i.test(t) || (/^[^\s/]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(t) && !/^\d+(\.\d+)?$/.test(t)) || /^localhost(:\d+)?(\/\S*)?$/i.test(t);
  let recent = store.json('pa-recent', []);
  function remember(t) { recent = [t, ...recent.filter(x => x !== t)].slice(0, 12); store.set('pa-recent', JSON.stringify(recent)); }
  function go(t, how) {
    t = (t || '').trim(); if (!t) return;
    if (how !== 'ai' && looksLikeUrl(t)) { location.href = /^[a-z]+:\/\//i.test(t) ? t : 'https://' + t; return; }
    remember(t);
    if (how === 'ai') { location.href = 'https://www.google.com/search?udm=50&q=' + encodeURIComponent(t); return; }
    if (searchApi) {
      if (searchApi.query) searchApi.query({ text: t, disposition: 'CURRENT_TAB' });
      else searchApi.search({ query: t, disposition: 'CURRENT_TAB' });
    } else location.href = 'https://www.google.com/search?q=' + encodeURIComponent(t);
  }
  form.addEventListener('submit', e => { e.preventDefault(); const pick = sugActive >= 0 ? sugItems[sugActive] : null; closeSug(); pick ? pickSug(pick) : go(qq.value); });
  $('ai-mode').addEventListener('click', () => { const t = qq.value.trim(); if (t) go(t, 'ai'); else location.href = 'https://www.google.com/search?udm=50'; });
  clearBtn.addEventListener('click', () => { qq.value = ''; clearBtn.hidden = true; closeSug(); qq.focus(); });

  // suggestions: Google's suggest endpoint (the same one Chrome's address bar uses)
  const sugBox = $('suggest');
  let sugItems = [], sugActive = -1, sugSeq = 0, typed = '';
  function closeSug() { sugBox.hidden = true; sugBox.replaceChildren(); qq.setAttribute('aria-expanded', 'false'); wrap.classList.remove('open'); sugActive = -1; qq.removeAttribute('aria-activedescendant'); }
  function pickSug(s) { if (s.kind === 'nav') location.href = s.text; else { qq.value = s.text; go(s.text); } }
  const ICON = {
    search: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    recent: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.9 3.9L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z"/></svg>',
    nav: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4H4.26zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.07 16zm2.95-8H5.07a7.99 7.99 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.02 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4h-3.38z"/></svg>'
  };
  function paintSug() {
    sugBox.replaceChildren(...sugItems.map((s, i) => {
      const li = el('li'); li.setAttribute('role', 'option'); li.id = 'sg-' + i; li.className = 'sg-' + s.kind;
      li.setAttribute('aria-selected', String(i === sugActive));
      const ic = el('span', 'sg-ic'); ic.innerHTML = ICON[s.kind] || ICON.search;
      const tx = el('span', 'sg-t');
      // Google-style: what you typed stays normal weight, the completion is bold
      const low = s.text.toLowerCase(), pre = typed.toLowerCase();
      if (s.kind === 'query' && pre && low.startsWith(pre) && low !== pre) { tx.append(s.text.slice(0, pre.length)); tx.append(el('b', null, s.text.slice(pre.length))); }
      else tx.textContent = s.label || s.text;
      li.append(ic, tx);
      if (s.kind === 'nav' && s.label) tx.append(el('span', 'sg-url', ' — ' + s.text.replace(/^https?:\/\/(www\.)?/, '')));
      if (s.kind === 'recent') {
        const rm = el('button', 'sg-rm', 'Remove'); rm.type = 'button'; rm.tabIndex = -1;
        rm.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); recent = recent.filter(r => r !== s.text); store.set('pa-recent', JSON.stringify(recent)); showRecent(); });
        li.append(rm);
      }
      li.addEventListener('mousedown', e => { e.preventDefault(); closeSug(); pickSug(s); });
      li.addEventListener('mousemove', () => { if (sugActive !== i) { sugActive = i; markActive(); } });
      return li;
    }));
    const open = !!sugItems.length;
    sugBox.hidden = !open; wrap.classList.toggle('open', open); qq.setAttribute('aria-expanded', String(open));
    markActive();
  }
  function markActive() {
    [...sugBox.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === sugActive)));
    if (sugActive >= 0) qq.setAttribute('aria-activedescendant', 'sg-' + sugActive); else qq.removeAttribute('aria-activedescendant');
  }
  function showRecent() {
    typed = ''; sugItems = recent.slice(0, 8).map(t => ({ kind: 'recent', text: t })); sugActive = -1; paintSug();
  }
  function parseSug(term, data) {
    const words = data[1] || [], desc = data[2] || [], meta = data[4] || {}, types = meta['google:suggesttype'] || [];
    const out = [];
    const rec = recent.filter(r => r.toLowerCase().startsWith(term.toLowerCase()) && r.toLowerCase() !== term.toLowerCase()).slice(0, 2);
    rec.forEach(r => out.push({ kind: 'recent', text: r }));
    words.forEach((w, i) => {
      if (out.some(o => o.text.toLowerCase() === String(w).toLowerCase())) return;
      if (types[i] === 'NAVIGATION') out.push({ kind: 'nav', text: w, label: desc[i] || '' });
      else out.push({ kind: 'query', text: w });
    });
    return out.slice(0, 8);
  }
  function jsonp(url) {
    return new Promise((res, rej) => {
      const cb = '__paSug' + (++sugSeq), s = document.createElement('script');
      const done = () => { delete window[cb]; s.remove(); };
      window[cb] = d => { done(); res(d); }; s.onerror = () => { done(); rej(); };
      s.src = url + '&callback=' + cb; document.head.append(s); setTimeout(() => { if (window[cb]) { done(); rej(); } }, 4000);
    });
  }
  let sugAbort = null;
  async function fetchSug(term) {
    const base = 'https://suggestqueries.google.com/complete/search?client=chrome&hl=' + encodeURIComponent(navigator.language || 'en') + '&q=' + encodeURIComponent(term);
    let data;
    try {
      if (IS_EXT) {
        if (sugAbort) sugAbort.abort(); sugAbort = new AbortController();
        const r = await fetch(base, { signal: sugAbort.signal, credentials: 'omit' });
        // the endpoint answers in the user's charset; decode as text then parse
        data = JSON.parse(await r.text());
      } else data = await jsonp(base);
    } catch (e) { return; /* offline, blocked or superseded: no suggestions, never fatal */ }
    if (qq.value.trim() !== term) return;
    typed = term; sugItems = parseSug(term, data); sugActive = -1; paintSug();
  }
  let sugTimer = null;
  qq.addEventListener('input', () => {
    const t = qq.value.trim(); clearBtn.hidden = !qq.value;
    clearTimeout(sugTimer);
    if (!t) { recent.length ? showRecent() : closeSug(); return; }
    sugTimer = setTimeout(() => fetchSug(t), 90);
  });
  const maybeRecent = () => { if (!qq.value.trim() && recent.length && sugBox.hidden) showRecent(); };
  qq.addEventListener('focus', maybeRecent); qq.addEventListener('mousedown', maybeRecent);
  qq.addEventListener('keydown', e => {
    if (sugBox.hidden) { if (e.key === 'ArrowDown' && !qq.value.trim() && recent.length) { e.preventDefault(); showRecent(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); sugActive = sugActive + 1 >= sugItems.length ? -1 : sugActive + 1; markActive(); if (sugActive >= 0 && sugItems[sugActive].kind !== 'nav') qq.value = sugItems[sugActive].text; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sugActive = sugActive - 1 < -1 ? sugItems.length - 1 : sugActive - 1; markActive(); if (sugActive >= 0 && sugItems[sugActive].kind !== 'nav') qq.value = sugItems[sugActive].text; else if (sugActive < 0 && typed) qq.value = typed; }
    else if (e.key === 'Escape') { if (typed) qq.value = typed; closeSug(); }
    else if (e.key === 'Delete' && e.shiftKey && sugActive >= 0 && sugItems[sugActive].kind === 'recent') {
      e.preventDefault(); const t = sugItems[sugActive].text; recent = recent.filter(r => r !== t); store.set('pa-recent', JSON.stringify(recent)); showRecent();
    }
  });
  qq.addEventListener('blur', () => setTimeout(closeSug, 120));

  /* ── voice search ── */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voice = $('voice'), vText = $('voice-text');
  let rec = null;
  function stopVoice() { voice.hidden = true; if (rec) { try { rec.abort(); } catch (e) {} rec = null; } }
  $('mic').addEventListener('click', () => {
    if (!SR) { location.href = 'https://www.google.com/?hl=' + encodeURIComponent(navigator.language || 'en') + '#voice'; return; }
    rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1;
    voice.hidden = false; vText.textContent = 'Listening…'; voice.classList.remove('err');
    let final = '';
    rec.onresult = ev => {
      let interim = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript; }
      vText.textContent = final || interim || 'Listening…';
    };
    rec.onerror = ev => {
      voice.classList.add('err');
      vText.textContent = ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'Microphone access is blocked. Allow it in the address-bar icon, then try again.'
        : ev.error === 'no-speech' ? "Didn't catch that. Click the mic to try again." : ev.error === 'network' ? 'Voice search needs an internet connection.' : 'Voice search stopped (' + ev.error + ').';
    };
    rec.onend = () => { rec = null; if (final.trim()) { voice.hidden = true; qq.value = final.trim(); go(final.trim()); } };
    try { rec.start(); } catch (e) { stopVoice(); }
  });
  $('voice-x').addEventListener('click', stopVoice);
  $('voice-mic').addEventListener('click', () => { stopVoice(); $('mic').click(); });

  /* ── Google Lens ── */
  const lensPop = $('lens-pop'), lensFile = $('lens-file'), lensDrop = $('lens-drop');
  function lensOpen(show) { lensPop.hidden = !show; if (show) closeSug(); }
  function lensUpload(file) {
    if (!file || !/^image\//.test(file.type)) return;
    const f = $('lens-post'); f.replaceChildren();
    f.action = 'https://lens.google.com/v3/upload?hl=' + encodeURIComponent(navigator.language || 'en') + '&st=' + Date.now();
    const inp = document.createElement('input'); inp.type = 'file'; inp.name = 'encoded_image';
    const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; f.append(inp);
    lensDrop.classList.add('busy'); lensDrop.querySelector('p').textContent = 'Uploading…';
    f.submit();
  }
  $('lens').addEventListener('click', e => { e.stopPropagation(); lensOpen(lensPop.hidden); });
  $('lens-x').addEventListener('click', () => lensOpen(false));
  $('lens-pick').addEventListener('click', () => lensFile.click());
  lensFile.addEventListener('change', () => lensUpload(lensFile.files[0]));
  $('lens-url').addEventListener('submit', e => { e.preventDefault(); const u = $('lens-url-in').value.trim(); if (u) location.href = 'https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(u); });
  ['dragenter', 'dragover'].forEach(t => lensDrop.addEventListener(t, e => { e.preventDefault(); lensDrop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => lensDrop.addEventListener(t, e => { e.preventDefault(); lensDrop.classList.remove('over'); }));
  lensDrop.addEventListener('drop', e => lensUpload(e.dataTransfer.files[0]));
  document.addEventListener('paste', e => {
    if (lensPop.hidden) return;
    const it = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); lensUpload(it.getAsFile()); }
  });
  document.addEventListener('click', e => { if (!lensPop.hidden && !lensPop.contains(e.target) && e.target !== $('lens')) lensOpen(false); });

  /* ── clock ── */
  const clock = $('clock'), date = $('date');
  function tick() {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
    date.textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  tick(); setInterval(tick, 10000);

  /* ── boot ── */
  $('home').href = CFG.home;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!lensPop.hidden) lensOpen(false); if (!voice.hidden) stopVoice(); if (!apps.hidden) toggleApps(false); }
    if (e.target.matches('input, textarea') || dlg.open) return;
    if (e.key === 'g') { e.preventDefault(); $('open-gallery').click(); }
    if (e.key === '/') { e.preventDefault(); qq.focus(); }
  });
  paintMotion(); renderTiles();
  fetch(CFG.assets + 'registry.json').then(r => r.json()).then(reg => {
    REG = reg.scenes; REG.forEach(s => BY[s.slug] = s);
    const qs = new URLSearchParams(location.search).get('scene');
    setScene(BY[qs] ? qs : store.get('pa-scene', REG[0].slug), !!BY[qs]);
  });
})();
