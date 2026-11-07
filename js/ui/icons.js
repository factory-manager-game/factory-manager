/**
 * Inline SVG icon set (24x24, stroke based). icon('name', 'extra-class')
 */
(function (FM) {
  'use strict';

  var paths = {
    factory: '<path d="M3 21V11l5 3v-3l5 3v-3l5 3V4h3v17z"/><path d="M7 17h2M12 17h2M17 17h1"/>',
    chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>',
    box: '<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9"/>',
    headphone: '<path d="M4 16v-4a8 8 0 0 1 16 0v4"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    speaker: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><circle cx="12" cy="14.5" r="3.2"/><circle cx="12" cy="7" r="1.2"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    gauge: '<path d="M4 18a8.5 8.5 0 1 1 16 0"/><path d="M12 15l4-5"/><circle cx="12" cy="15" r="1.2"/>',
    badge: '<path d="M12 3l2.4 1.8 3 .2.8 2.9 2.3 2-1 2.9 1 2.8-2.3 2-.8 2.9-3 .2L12 22l-2.4-1.8-3-.2-.8-2.9-2.3-2 1-2.8-1-2.9 2.3-2 .8-2.9 3-.2z"/><path d="M9 12.5l2 2 4-4.5"/>',
    warehouse: '<path d="M3 21V8.5L12 4l9 4.5V21"/><path d="M7 21v-8h10v8M7 17h10"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.8a3.2 3.2 0 0 1 0 6.4M18 14.5a6 6 0 0 1 3 5.5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5L3.5 17.2a1.8 1.8 0 0 0 2.6 2.6l5.7-5.7a4 4 0 0 0 5-5.3l-2.4 2.4-2.3-.4-.4-2.3z"/>',
    truck: '<path d="M2 6h12v10H2zM14 9.5h4l3 3.5v3h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="2.6"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    alert: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.8M12 17.2h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/>',
    bolt: '<path d="M13 2.5L4.5 13.5H11L10 21.5l8.5-11H12z"/>',
    arrow: '<path d="M4 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
    flame: '<path d="M12 21.5c-4 0-6.5-2.6-6.5-6.2 0-3.8 3.4-6 3.9-9.8 2.3 1.6 3.4 3.6 3.6 5.6 1-.8 1.6-2 1.7-3.2 2.4 2 3.8 4.7 3.8 7.4 0 3.6-2.5 6.2-6.5 6.2z"/>'
  };

  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  }

  FM.icon = icon;
})(window.FM = window.FM || {});
