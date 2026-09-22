/* Pixel Americana New Tab. Same file runs in the Chrome/Firefox extension and on the website.
   Scenes come from registry.json (built by build.py from library/). Music from music.json. */
(() => {
  const CFG = Object.assign({ assets: '', music: 'music/', home: 'index.html' }, window.PA_CONFIG || {});
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    json(k, d) { try { return JSON.parse(this.get(k, '')) ?? d; } catch (e) { return d; } }
  };
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
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
      b.setAttribute('aria-pressed', String(name === cat)); b.innerHTML = '';
      b.append(name); const sp = document.createElement('span'); sp.className = 'n'; sp.textContent = n; b.append(sp);
      b.addEventListener('click', () => { cat = name; store.set('pa-cat', cat); renderChips(); renderGrid(); });
      return b;
    }));
  }
  function renderGrid() {
    const t = q.value.trim().toLowerCase();
    const list = REG.filter(s => (cat === 'All' || (cat === 'Favorites' ? favs.has(s.slug) : s.category === cat)) &&
      (!t || (s.title + ' ' + s.category + ' ' + (s.tags || []).join(' ') + ' ' + s.line).toLowerCase().includes(t)));
    if (!list.length) {
      const li = document.createElement('li'); li.className = 'empty';
      li.textContent = cat === 'Favorites' && !t ? 'No favorites yet. Tap the star on any scene to keep it here.' : 'No scenes match that search.';
      grid.replaceChildren(li); return;
    }
    grid.replaceChildren(...list.map(s => {
      const li = document.createElement('li'); li.className = 'card' + (cur && cur.slug === s.slug ? ' current' : ''); li.dataset.slug = s.slug;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pick';
      const im = document.createElement('img'); im.src = CFG.assets + 'thumbs/' + s.slug + '.webp'; im.alt = ''; im.loading = 'lazy'; im.width = 240; im.height = 135;
      const tt = document.createElement('span'); tt.className = 't'; tt.textContent = s.title;
      const cc = document.createElement('span'); cc.className = 'c'; cc.textContent = s.category + (s.mode ? ' · ' + s.mode : '');
      b.append(im, tt, cc); b.addEventListener('click', () => { setScene(s.slug, true); dlg.close(); });
      const f = document.createElement('button'); f.type = 'button'; f.className = 'fav'; f.textContent = '★';
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

  /* ── music: nothing plays until pressed; only one tab plays at a time ── */
  const audio = new Audio(); audio.preload = 'none';
  let TR = [], ti = parseInt(store.get('pa-track', '0'), 10) || 0;
  const pbar = $('player-bar'), play = $('m-play'), bc = ('BroadcastChannel' in window) ? new BroadcastChannel('pa-music') : null;
  audio.volume = parseFloat(store.get('pa-vol', '0.6')) || 0.6; $('m-vol').value = audio.volume;
  function paintTrack() {
    const t = TR[ti]; if (!t) return;
    $('m-title').textContent = t.title; $('m-perf').textContent = t.performer + ' · ' + t.year;
    const cr = $('m-credit'); cr.href = t.source; cr.textContent = 'Source: ' + t.archive;
  }
  function load(i) { ti = (i + TR.length) % TR.length; store.set('pa-track', String(ti)); audio.src = CFG.music + TR[ti].file; paintTrack(); }
  function setPlaying(on) { play.setAttribute('aria-label', on ? 'Pause' : 'Play'); play.querySelector('.glyph').textContent = on ? '❚❚' : '▶'; play.setAttribute('aria-pressed', String(on)); }
  play.addEventListener('click', () => {
    if (!TR.length) return;
    pbar.classList.add('open');
    if (!audio.src) load(ti);
    if (audio.paused) { audio.play().catch(() => setPlaying(false)); if (bc) bc.postMessage('playing'); } else audio.pause();
  });
  $('m-next').addEventListener('click', () => { const was = !audio.paused; load(ti + 1); if (was) audio.play().catch(() => {}); });
  $('m-prev').addEventListener('click', () => { const was = !audio.paused; load(ti - 1); if (was) audio.play().catch(() => {}); });
  $('m-vol').addEventListener('input', e => { audio.volume = +e.target.value; store.set('pa-vol', e.target.value); });
  $('m-close').addEventListener('click', () => { audio.pause(); pbar.classList.remove('open'); });
  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => { load(ti + 1); audio.play().catch(() => {}); });
  audio.addEventListener('timeupdate', () => { $('m-prog').style.width = (audio.duration ? 100 * audio.currentTime / audio.duration : 0) + '%'; });
  audio.addEventListener('error', () => { if (audio.src) $('m-perf').textContent = 'Could not load this track. Check your connection.'; });
  if (bc) bc.onmessage = e => { if (e.data === 'playing' && !audio.paused) audio.pause(); };

  /* ── search: the browser's own engine inside the extension ── */
  const form = $('search'), qq = $('q');
  const api = (window.browser && browser.search) ? browser.search : (window.chrome && chrome.search) ? chrome.search : null;
  if (api) {
    qq.placeholder = 'Search the web';
    form.addEventListener('submit', e => {
      e.preventDefault(); const t = qq.value.trim(); if (!t) return;
      if (api.query) api.query({ text: t, disposition: 'CURRENT_TAB' }); else api.search({ query: t, disposition: 'CURRENT_TAB' });
    });
  }

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
    if (e.target.matches('input') || dlg.open) return;
    if (e.key === 'g') { e.preventDefault(); $('open-gallery').click(); }
  });
  paintMotion();
  Promise.all([
    fetch(CFG.assets + 'registry.json').then(r => r.json()),
    fetch(CFG.assets + 'music.json').then(r => r.json()).catch(() => ({ tracks: [] }))
  ]).then(([reg, mus]) => {
    REG = reg.scenes; REG.forEach(s => BY[s.slug] = s);
    const qs = new URLSearchParams(location.search).get('scene');
    setScene(BY[qs] ? qs : store.get('pa-scene', REG[0].slug), !!BY[qs]);
    TR = mus.tracks || []; if (TR.length) { if (ti >= TR.length) ti = 0; paintTrack(); } else pbar.hidden = true;
  });
})();
