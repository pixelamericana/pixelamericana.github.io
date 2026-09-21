
(() => {
  const SC = {"old-glory": {"title": "Old Glory", "ntp": "#0B1730", "text": "#F4F1EA", "link": "#F4D27A"}, "open-road": {"title": "Open Road", "ntp": "#2E2C64", "text": "#F6E3CC", "link": "#F2A65E"}, "haze-gray": {"title": "Haze Gray", "ntp": "#2A3440", "text": "#E8ECEE", "link": "#FFD100"}, "national-park": {"title": "National Park", "ntp": "#2F6F7E", "text": "#F7EEDC", "link": "#F7E2A6"}, "tranquility-base": {"title": "Tranquility Base", "ntp": "#05070B", "text": "#F2F2F2", "link": "#F0A030"}, "parchment": {"title": "Parchment", "ntp": "#EFE3C8", "text": "#2B1D14", "link": "#9E2B25"}}, ORDER = ["old-glory", "open-road", "haze-gray", "national-park", "tranquility-base", "parchment"];
  // time of day: dawn at sea, morning at the desk, day in the park, sunset on the road, evening flag, night on the Moon
  const SLOTS = [[5,'haze-gray','Dawn'],[8,'parchment','Morning'],[12,'national-park','Afternoon'],[17,'open-road','Sunset'],[20,'old-glory','Evening'],[22,'tranquility-base','Night']];
  const N = 12, FW = 480, FH = 180, BASE = window.PA_FRAMES || document.body.dataset.frames || 'frames/';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let choice = store.get('pa-scene', 'auto');
  const qs = new URLSearchParams(location.search).get('scene'); if (qs && (SC[qs] || qs === 'auto' || qs === 'rotate')) choice = qs;
  let motion = store.get('pa-motion', reduce ? 'off' : 'on');
  // rotate: a different scene on every new tab
  let rot = (parseInt(store.get('pa-rot', '-1'), 10) + 1) % ORDER.length; if (isNaN(rot)) rot = 0;
  if (choice === 'rotate') store.set('pa-rot', String(rot));

  const cv = document.getElementById('art'), ctx = cv.getContext('2d');
  const bar = document.getElementById('bar'), note = document.getElementById('note');
  const imgs = {}; let cur = null, frame = 0;

  function slotFor(h) { if (h < 5) return SLOTS[SLOTS.length - 1]; let s = SLOTS[0]; for (const x of SLOTS) if (h >= x[0]) s = x; return s; }
  function keyNow() {
    if (choice === 'auto') return slotFor(new Date().getHours())[1];
    if (choice === 'rotate') return ORDER[rot];
    return SC[choice] ? choice : 'old-glory';
  }
  function draw() { const im = imgs[cur]; if (im && im.complete && im.naturalWidth) { ctx.imageSmoothingEnabled = false; ctx.drawImage(im, 0, frame * FH, FW, FH, 0, 0, FW, FH); } }
  function apply() {
    const key = keyNow(), c = SC[key];
    if (key !== cur) {
      cur = key; frame = 0;
      if (!imgs[key]) { const im = new Image(); im.onload = () => { if (cur === key) draw(); }; im.src = BASE + key + '.png'; imgs[key] = im; }
      draw();
    }
    document.body.style.background = c.ntp;
    const r = document.documentElement.style; r.setProperty('--ink', c.text); r.setProperty('--accent', c.link);
    const h = c.link.replace('#',''), lum = (0.299*parseInt(h.slice(0,2),16) + 0.587*parseInt(h.slice(2,4),16) + 0.114*parseInt(h.slice(4,6),16)) / 255;
    r.setProperty('--accent-ink', lum > 0.55 ? '#111' : '#FFF6E6');
    note.textContent = choice === 'auto' ? 'Time of day · ' + slotFor(new Date().getHours())[2] + ' · ' + c.title
                     : choice === 'rotate' ? 'New scene every tab · ' + c.title : '';
    bar.querySelectorAll('button[data-k]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === choice)));
    mbtn.setAttribute('aria-pressed', String(motion === 'on'));
    mbtn.textContent = motion === 'on' ? 'Motion on' : 'Motion off';
  }
  function add(k, t) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.textContent = t;
    b.addEventListener('click', () => { choice = k; store.set('pa-scene', k); apply(); }); bar.appendChild(b);
  }
  add('auto', 'Time of day'); add('rotate', 'Every tab');
  const sep = document.createElement('span'); sep.className = 'sep'; sep.setAttribute('aria-hidden', 'true'); bar.appendChild(sep);
  ORDER.forEach(k => add(k, SC[k].title));
  const sep2 = sep.cloneNode(); bar.appendChild(sep2);
  const mbtn = document.createElement('button'); mbtn.type = 'button';
  mbtn.addEventListener('click', () => { motion = motion === 'on' ? 'off' : 'on'; store.set('pa-motion', motion); if (motion === 'off') { frame = 0; draw(); } apply(); });
  bar.appendChild(mbtn);

  setInterval(() => { if (motion === 'on' && !document.hidden) { frame = (frame + 1) % N; draw(); } }, 130);

  const form = document.getElementById('search'), q = document.getElementById('q');
  if (window.chrome && chrome.search && chrome.search.query) {
    // in the extension: search with whatever engine the browser is set to
    q.placeholder = 'Search the web';
    form.addEventListener('submit', e => { e.preventDefault(); const t = q.value.trim(); if (t) chrome.search.query({ text: t, disposition: 'CURRENT_TAB' }); });
  }
  const clock = document.getElementById('clock'), date = document.getElementById('date');
  function tick() {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
    date.textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    if (choice === 'auto') apply();
  }
  apply(); tick(); setInterval(tick, 15000);
})();
