'use strict';

// Outline icons share a 24-unit grid and inherit the surrounding text colour.
const Icons = (() => {
  const paths = {
    file: '<path d="M14 2.8H6.2a1.8 1.8 0 0 0-1.8 1.8v14.8a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8V8.4z"/><path d="M13.8 3v5.6h5.5M8.5 12.5h7M8.5 16h5"/>',
    mic: '<rect x="8.5" y="2" width="7" height="13" rx="3.5"/><path d="M5 10.5V12a7 7 0 0 0 14 0v-1.5M12 19v3M8.5 22h7"/>',
    pen: '<path d="m14 6 4 4M4 20l1-5 11.7-11.7a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19z"/>',
    right: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    send: '<path d="m21 3-7 18-3.2-7.8L3 10zM10.8 13.2 21 3"/>',
    stop: '<rect x="6.2" y="6.2" width="11.6" height="11.6" rx="1.8" fill="currentColor" stroke="none"/>',
    form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h3m-3 4h7"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v3.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  };
  function svg(name, size = 20) {
    return '<svg aria-hidden="true" class="icon icon-' + name + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  }
  return { svg };
})();
