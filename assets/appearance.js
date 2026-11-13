'use strict';
(() => {
  const key = 'cognalys.theme';
  const root = document.documentElement;
  let theme = 'dark';
  try { if (localStorage.getItem(key) === 'light') theme = 'light'; } catch {}

  function apply(value) {
    theme = value;
    root.dataset.theme = theme;
    const dark = theme === 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d1421' : '#f5f7fb');
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const label = dark ? 'Mode jour' : 'Mode nuit';
      button.querySelector('[data-theme-label]').textContent = label;
      button.setAttribute('aria-label', 'Activer le ' + label.toLowerCase());
      button.title = 'Activer le ' + label.toLowerCase();
    });
  }

  apply(theme);
  document.addEventListener('DOMContentLoaded', () => apply(theme), { once: true });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-theme-toggle]')) {
      apply(theme === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem(key, theme); } catch {}
    }
    if (event.target.closest('[data-reload-app]')) location.reload();
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue === 'light' ? 'light' : 'dark');
  });
})();
