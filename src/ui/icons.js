/**
 * Small inline SVG icons, returned as strings.
 * UI icons use currentColor so CSS decides their colour.
 */
(function (FM) {
  'use strict';

  function ui(paths, size) {
    size = size || 22;
    return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  var UI = {
    back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    cash: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>',
    orders: '<path d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6"/>',
    plan: '<path d="M4 6h16M4 12h10M4 18h6"/><path d="M17 15l3 3-3 3"/>',
    buy: '<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
    workers: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A4.6 4.6 0 0 1 21 18.5"/>',
    report: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    wrench: '<path d="M14.5 5.5a4 4 0 0 0-5.3 5.3L4 16l4 4 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.6-.7-.7-2.6z"/>',
    truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1-4.5-4.2 6.1-.8z"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5h.01"/>',
    box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5L12 12l9-4.5M12 12v9"/>'
  };

  function icon(name, size) { return ui(UI[name], size); }

  /** Product glyph for the floor, centred on 0,0, about 22 units wide. */
  function product(p) {
    if (p === 'speaker') {
      return '<rect x="-10" y="-11" width="20" height="22" rx="5" fill="#FF8A3D"/>' +
        '<circle cx="0" cy="3" r="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="0" cy="-6" r="1.8" fill="#fff"/>';
    }
    return '<rect x="-11" y="-11" width="22" height="22" rx="6" fill="#8B5CF6"/>' +
      '<path d="M-6 3 v-2 a6 6 0 0 1 12 0 v2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<rect x="-7.5" y="1" width="3.5" height="5" rx="1.5" fill="#fff"/><rect x="4" y="1" width="3.5" height="5" rx="1.5" fill="#fff"/>';
  }

  /** Product chip for HTML panels. */
  function productChip(p, size) {
    size = size || 26;
    return '<svg class="pchip" width="' + size + '" height="' + size + '" viewBox="-12 -12 24 24" aria-hidden="true">' + product(p) + '</svg>';
  }

  /** Big glyph shown on each machine's screen. */
  var MACHINE = {
    assembly: '<g stroke="#3D63D6" stroke-width="3" fill="none"><rect x="-14" y="-12" width="28" height="24" rx="4"/><path d="M-8 -18v6M0 -18v6M8 -18v6M-8 12v6M0 12v6M8 12v6"/></g>',
    test: '<g stroke="#16A06E" stroke-width="3.5" fill="none" stroke-linecap="round"><circle cx="-4" cy="-3" r="13"/><path d="M6 7 l12 12"/></g>',
    packaging: '<g stroke="#E08A12" stroke-width="3" fill="none" stroke-linejoin="round"><path d="M-18 -8 L0 -17 L18 -8 V12 L0 21 L-18 12 Z"/><path d="M-18 -8 L0 1 L18 -8 M0 1 V21"/></g>'
  };

  FM.Icons = { icon: icon, product: product, productChip: productChip, machine: function (id) { return MACHINE[id]; } };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
