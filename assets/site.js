
(() => {
  // one-of-many toggles: [data-group] buttons pick which [data-panel] shows
  document.querySelectorAll('[data-group]').forEach(b => b.addEventListener('click', () => {
    const g = b.dataset.group;
    document.querySelectorAll(`[data-group="${g}"]`).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    document.querySelectorAll(`[data-panel-group="${g}"]`).forEach(p => p.hidden = p.dataset.panel !== b.dataset.value);
    document.dispatchEvent(new CustomEvent('pick', { detail: { group: g, value: b.dataset.value } }));
  }));
  // pick the visitor's platform for download highlighting
  const ua = navigator.userAgent, os = /Windows/.test(ua) ? 'windows' : /Mac OS X|Macintosh/.test(ua) && !/iPhone|iPad/.test(ua) ? 'macos' : /Linux|X11/.test(ua) && !/Android/.test(ua) ? 'linux' : '';
  if (os) document.querySelectorAll(`[data-os="${os}"]`).forEach(a => a.classList.add('best'));
})();
