'use strict';

// Outline icons share a 24-unit grid and inherit the surrounding text colour.
const Icons = (() => {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
    inbox: '<path d="m4.5 5 15 0 2 10v4a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19v-4z"/><path d="M3 14.5h5l1.6 3h4.8l1.6-3h5"/>',
    file: '<path d="M14 2.8H6.2a1.8 1.8 0 0 0-1.8 1.8v14.8a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8V8.4z"/><path d="M13.8 3v5.6h5.5M8.5 12.5h7M8.5 16h5"/>',
    fileCheck: '<path d="M13.5 2.8H6A1.7 1.7 0 0 0 4.3 4.5v15A1.7 1.7 0 0 0 6 21.2h11.6a1.7 1.7 0 0 0 1.7-1.7V8.5z"/><path d="M13.5 3v5.6H19M8.4 15l2.3 2.1 4.6-4.7"/>',
    mic: '<rect x="8.5" y="2" width="7" height="13" rx="3.5"/><path d="M5 10.5V12a7 7 0 0 0 14 0v-1.5M12 19v3M8.5 22h7"/>',
    pen: '<path d="m14 6 4 4M4 20l1-5 11.7-11.7a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v6l3.5 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10.5v5m0-8v.1"/>',
    alert: '<path d="M10.3 3.9a2 2 0 0 1 3.4 0l7 12.3a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3z"/><path d="M12 8.5v4.7m0 3v.1"/>',
    calendar: '<rect x="3.3" y="5" width="17.4" height="16" rx="2.5"/><path d="M7.5 2.7v4.6M16.5 2.7v4.6M3.6 10h16.8"/>',
    phone: '<path d="M6.6 3.4 9.5 3l2.2 5.4-2.1 1.9a14 14 0 0 0 4.3 4.3l1.9-2.1 5.3 2.2-.4 3a2.8 2.8 0 0 1-2.8 2.5C10.4 19.5 4.5 13.6 3.8 6.5a2.8 2.8 0 0 1 2.8-3.1z"/>',
    mail: '<rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2"/><path d="m3.5 6 8.5 6.6L20.5 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    right: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    send: '<path d="m21 3-7 18-3.2-7.8L3 10zM10.8 13.2 21 3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.7"/><path d="m16 16 4.5 4.5"/>',
    building: '<path d="M3 21h18M5 21V5l9-2v18M14 9h5v12M8.5 7.5v1m0 2.8v1m0 2.8v1M16.6 12v1m0 3v1"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M8.5 4v16"/>',
    waveform: '<path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>',
    check: '<path d="m4.8 12.3 4.7 4.8 9.7-10.2"/>',
    circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m7.8 12 2.8 3 5.7-6"/>',
    stop: '<rect x="6.2" y="6.2" width="11.6" height="11.6" rx="1.8" fill="currentColor" stroke="none"/>',
    play: '<path d="m7 4.5 13 7.5-13 7.5z"/>',
    form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h3m-3 4h7"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v3.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V16"/>',
    pin: '<path d="M19 10c0 5.3-7 11-7 11S5 15.3 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2.3"/>',
    user: '<circle cx="12" cy="8" r="3.7"/><path d="M4.8 20v-1.8a6.9 6.9 0 0 1 6.9-5.4h.6a6.9 6.9 0 0 1 6.9 5.4V20"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    repeat: '<path d="m17 2.8 3.5 3.4L17 9.5m3-3.3H8A4.5 4.5 0 0 0 3.5 11m3.5 10.2-3.5-3.4L7 14.5m-3 3.3h12a4.5 4.5 0 0 0 4.5-4.8"/>',
    note: '<path d="M4 4h16v12l-4 4H4zM8 8h8m-8 4h6m1.8 8v-4h4"/>',
    activity: '<path d="M2 12h4l3-7 5 14 3-7h5"/>',
    spinner: '<path d="M12 3a9 9 0 1 1-8.4 5.8"/>'
  };
  function svg(name, size = 20) {
    return '<svg aria-hidden="true" class="icon icon-' + name + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  }
  return { svg };
})();
