(function () {
  'use strict';
  function boot() {
    UI.applyTheme(); UI.applyMotionPref();
    document.getElementById('themeToggle').addEventListener('click', () => { const s = StateStore.getSettings(); const next = s.theme === 'dark' ? 'light' : (s.theme === 'light' ? 'auto' : 'dark'); StateStore.setSettings({ theme: next }); UI.applyTheme(); });
    document.getElementById('userBtn').addEventListener('click', () => { const u = StateStore.getUser(); location.hash = u ? '#/account' : '#/auth'; });
    document.getElementById('navToggle').addEventListener('click', () => { const sidenav = document.getElementById('sidenav'); const scrim = document.getElementById('scrim'); const open = sidenav.classList.contains('open'); if(open) { sidenav.classList.remove('open'); scrim.classList.remove('show'); document.getElementById('navToggle').setAttribute('aria-expanded','false'); } else { sidenav.classList.add('open'); scrim.classList.add('show'); document.getElementById('navToggle').setAttribute('aria-expanded','true'); } });
    document.getElementById('scrim').addEventListener('click', () => { document.getElementById('sidenav').classList.remove('open'); document.getElementById('scrim').classList.remove('show'); document.getElementById('navToggle').setAttribute('aria-expanded','false'); });
    window.addEventListener('hashchange', () => UI.route());
    if (!location.hash) location.hash = '#/dashboard';
    UI.route();
    if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
