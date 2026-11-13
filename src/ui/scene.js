/**
 * The factory floor: one SVG drawn once, then updated every frame from the state.
 * Raw materials enter on the right, flow left through assembly → test → packaging,
 * onto the finished-goods shelf and out on the truck.
 */
(function (FM) {
  'use strict';

  var T = FM.Text;
  var I = FM.Icons;
  var NS = 'http://www.w3.org/2000/svg';

  var W = 1280, H = 620;
  var BELT_Y = 341;
  var MACHINES = {
    assembly: { x: 930, body: '#5B86FF', top: '#4369E0', shirt: '#4369E0' },
    test: { x: 620, body: '#2DBE8A', top: '#1FA273', shirt: '#1FA273' },
    packaging: { x: 320, body: '#FFB03B', top: '#F0961A', shirt: '#F0961A' }
  };
  var BUFFERS = { test: { x: 775 }, packaging: { x: 470 } };
  var SHELF = { x: 95, y: 335 };
  var RAW = { x: 1210, y: 330 };
  var BENCH = { x: 1130, y: 540 };
  var LAMP = { green: '#2FBF71', gray: '#A39787', orange: '#F5A524', red: '#E5484D', blue: '#3B82F6' };

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function setText(node, s) { if (node.textContent !== s) node.textContent = s; }
  function setAttr(node, k, v) { v = String(v); if (node.getAttribute(k) !== v) node.setAttribute(k, v); }
  function cls(node, name, on) { node.classList.toggle(name, !!on); }

  // ---------- static drawing ----------

  function staticFloor() {
    var s = '';
    // back wall with windows and the loading door
    s += '<rect x="0" y="0" width="' + W + '" height="150" fill="#F6DDB8"/>';
    [330, 560, 790, 1020].forEach(function (x) {
      s += '<rect x="' + x + '" y="34" width="150" height="70" rx="12" fill="#CBEAF7" stroke="#E7C79A" stroke-width="6"/>' +
        '<path d="M' + (x + 75) + ' 37 V101" stroke="#E7C79A" stroke-width="4"/>';
    });
    s += '<rect x="34" y="20" width="160" height="130" rx="6" fill="#D9BF95"/>';
    for (var i = 0; i < 6; i++) s += '<rect x="42" y="' + (28 + i * 20) + '" width="144" height="12" rx="3" fill="#E6CFA8"/>';
    s += '<rect x="0" y="146" width="' + W + '" height="10" fill="#E7C79A"/>';
    s += '<rect x="0" y="156" width="' + W + '" height="' + (H - 156) + '" fill="#FBEFD9"/>';
    // floor zones
    s += '<rect x="20" y="470" width="200" height="132" rx="14" fill="none" stroke="#F0D5AE" stroke-width="3" stroke-dasharray="12 9"/>';
    s += '<text x="120" y="596" text-anchor="middle" class="floor-caption">بارانداز</text>';
    // conveyor belt
    s += '<rect x="150" y="' + (BELT_Y - 23) + '" width="1000" height="46" rx="23" fill="#4A5568"/>';
    s += '<rect x="160" y="' + (BELT_Y - 17) + '" width="980" height="22" rx="11" fill="#5F6B7E" class="belt-top"/>';
    // finished goods shelf
    s += '<g transform="translate(' + SHELF.x + ',0)">' +
      '<rect x="-55" y="250" width="110" height="170" rx="8" fill="#D8B88E"/>' +
      '<rect x="-55" y="300" width="110" height="7" fill="#B8935F"/><rect x="-55" y="355" width="110" height="7" fill="#B8935F"/>' +
      '<rect x="-55" y="410" width="110" height="10" fill="#B8935F"/></g>';
    // raw material crates
    s += '<g transform="translate(' + RAW.x + ',' + RAW.y + ')">' + crate(-30, -40) + crate(26, -40) + crate(-2, 18) + '</g>';
    // rest area
    s += '<g transform="translate(' + BENCH.x + ',' + BENCH.y + ')">' +
      '<rect x="-110" y="-38" width="220" height="80" rx="16" fill="#F4E3C6"/>' +
      '<rect x="-92" y="6" width="184" height="12" rx="6" fill="#C98B4E"/>' +
      '<rect x="-84" y="18" width="8" height="18" fill="#9A6534"/><rect x="76" y="18" width="8" height="18" fill="#9A6534"/>' +
      '<g transform="translate(92,-22)"><rect x="-12" y="-10" width="20" height="18" rx="4" fill="#fff" stroke="#C98B4E" stroke-width="2"/>' +
      '<path d="M8 -6 h3 a4 4 0 0 1 0 8 h-3" fill="none" stroke="#C98B4E" stroke-width="2"/></g></g>';
    return s;
  }

  function crate(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')"><rect x="-26" y="-26" width="52" height="52" rx="6" fill="#C98B4E"/>' +
      '<rect x="-26" y="-26" width="52" height="52" rx="6" fill="none" stroke="#9A6534" stroke-width="3"/>' +
      '<path d="M-22 -22 L22 22 M22 -22 L-22 22" stroke="#9A6534" stroke-width="3"/></g>';
  }

  function machineMarkup(id) {
    var c = MACHINES[id];
    return '<g class="machine" data-machine="' + id + '" transform="translate(' + c.x + ',0)" tabindex="0" role="button" aria-label="' + T.t('machine.' + id) + '">' +
      '<rect class="hit" x="-96" y="180" width="192" height="230" rx="26" fill="transparent"/>' +
      '<rect class="select-ring" x="-92" y="224" width="184" height="174" rx="28" fill="none" stroke="#FF8A3D" stroke-width="4" stroke-dasharray="10 8"/>' +
      '<ellipse cx="0" cy="392" rx="92" ry="12" fill="#000" opacity=".08"/>' +
      '<g class="body">' +
      '<rect x="-80" y="236" width="160" height="150" rx="22" fill="' + c.body + '"/>' +
      '<rect x="-80" y="236" width="160" height="34" rx="17" fill="' + c.top + '"/>' +
      '<rect class="tint" x="-80" y="236" width="160" height="150" rx="22" fill="#E5484D" opacity="0"/>' +
      '<rect x="-52" y="282" width="104" height="58" rx="12" fill="#FFFFFF" opacity=".94"/>' +
      '<g class="glyph" transform="translate(0,307)">' + I.machine(id) + '</g>' +
      '<text class="screen-text" x="0" y="314" text-anchor="middle"></text>' +
      '<rect x="-44" y="330" width="88" height="5" rx="2.5" fill="#EFE4D3"/>' +
      '<rect class="job-bar" x="-44" y="330" width="0" height="5" rx="2.5" fill="' + c.top + '"/>' +
      '<circle class="lamp" cx="-58" cy="365" r="8" fill="#A39787"/>' +
      '<circle cx="-36" cy="365" r="6" fill="#FFFFFF" opacity=".35"/>' +
      '<rect x="30" y="358" width="30" height="14" rx="7" fill="#FFFFFF" opacity=".35"/>' +
      '</g>' +
      '<g transform="translate(0,206)">' +
      '<rect x="-66" y="-16" width="132" height="30" rx="15" fill="#FFFFFF" stroke="#E9D6B6"/>' +
      '<text x="20" y="5" text-anchor="middle" class="m-label">' + T.t('machine.' + id) + '</text>' +
      '<rect x="-54" y="-3" width="36" height="7" rx="3.5" fill="#F1E3CB"/>' +
      '<rect class="health" x="-54" y="-3" width="36" height="7" rx="3.5" fill="#2FBF71"/></g>' +
      '<g class="badge" transform="translate(70,244)"><circle r="14" fill="#F5A524" stroke="#fff" stroke-width="3"/>' +
      '<text y="6" text-anchor="middle" class="badge-text">!</text></g>' +
      '<g class="smoke"><circle cx="58" cy="236" r="11"/><circle cx="76" cy="222" r="14"/><circle cx="92" cy="236" r="10"/></g>' +
      '<g class="ops"></g>' +
      '</g>';
  }

  function bufferMarkup(id) {
    var b = BUFFERS[id];
    return '<g class="buffer" data-buffer="' + id + '" transform="translate(' + b.x + ',0)">' +
      '<circle class="glow" cx="0" cy="' + BELT_Y + '" r="64" fill="#FF6B6B" opacity="0"/>' +
      '<g class="items"></g>' +
      '<g class="pill" transform="translate(0,250)"><rect x="-46" y="-15" width="92" height="30" rx="15" fill="#FFFFFF" stroke="#E9D6B6"/>' +
      '<text y="6" text-anchor="middle" class="pill-text"></text></g></g>';
  }

  /** Pyramid of up to 6 unit icons on the belt. */
  var SLOTS = [[-24, 0], [0, 0], [24, 0], [-12, -22], [12, -22], [0, -44]];

  function operatorMarkup(w, x, shirt, state, cfg) {
    var absent = !FM.Workforce.isPresent(state, w);
    var tired = w.fatigue >= cfg.workforce.fatigue.warnAt;
    var fat = Math.max(0, Math.min(100, w.fatigue));
    var barColor = fat >= cfg.workforce.fatigue.warnAt ? '#E5484D' : fat >= cfg.workforce.fatigue.slowFrom ? '#F5A524' : '#2FBF71';
    var s = '<g class="op' + (absent ? ' absent' : '') + '" transform="translate(' + x + ',420)">' +
      '<title>' + FM.Dom.esc(w.name) + '</title>' +
      '<ellipse cx="0" cy="44" rx="18" ry="5" fill="#000" opacity=".08"/>' +
      '<rect x="-13" y="12" width="26" height="30" rx="10" fill="' + shirt + '"/>' +
      '<circle cx="0" cy="2" r="12" fill="#F2C29B"/>' +
      '<path d="M-13 0 a13 13 0 0 1 26 0 z" fill="#FFC83D"/><rect x="-15" y="-2" width="30" height="4" rx="2" fill="#F0B020"/>' +
      (tired ? '<path d="M-4 6 h3 M3 6 h3" stroke="#3A2A1E" stroke-width="1.6" stroke-linecap="round"/><path d="M-3 10.5 h6" stroke="#3A2A1E" stroke-width="1.5" stroke-linecap="round"/>'
        : '<circle cx="-4" cy="5" r="1.6" fill="#3A2A1E"/><circle cx="4" cy="5" r="1.6" fill="#3A2A1E"/><path d="M-4 9 q4 3 8 0" stroke="#3A2A1E" stroke-width="1.5" fill="none" stroke-linecap="round"/>') +
      '<rect x="-13" y="50" width="26" height="4" rx="2" fill="#EFE4D3"/><rect x="-13" y="50" width="' + (26 * fat / 100).toFixed(1) + '" height="4" rx="2" fill="' + barColor + '"/>';
    if (tired && !absent) s += '<text class="zzz" x="14" y="-12">z</text>';
    if (absent) s += '<g transform="translate(0,-22)"><rect x="-22" y="-11" width="44" height="20" rx="10" fill="#E5484D"/><text y="4" text-anchor="middle" class="tag-text">غایب</text></g>';
    return s + '</g>';
  }

  // ---------- scene ----------

  function Scene(host, onPick) {
    this.host = host;
    this.onPick = onPick;
    this.svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'floor-svg', role: 'img', 'aria-label': 'کف کارخانه' });
    var html = staticFloor();
    html += '<g class="raw-labels" transform="translate(' + RAW.x + ',' + (RAW.y + 66) + ')"></g>';
    html += '<g class="shelf-items"></g>';
    html += '<g class="bench-ops"></g>';
    html += bufferMarkup('test') + bufferMarkup('packaging');
    Object.keys(MACHINES).forEach(function (id) { html += machineMarkup(id); });
    html += '<g class="tokens"></g>';
    html += '<g class="truck" transform="translate(-260,520)">' + truckMarkup() + '</g>';
    html += '<rect class="hit-area" data-area="raw" x="1150" y="250" width="120" height="180" fill="transparent"/>';
    html += '<rect class="hit-area" data-area="shelf" x="30" y="240" width="130" height="190" fill="transparent"/>';
    html += '<rect class="hit-area" data-area="bench" x="1015" y="495" width="230" height="95" fill="transparent"/>';
    this.svg.innerHTML = html;
    host.appendChild(this.svg);

    var self = this;
    this.m = {};
    Object.keys(MACHINES).forEach(function (id) {
      var g = self.svg.querySelector('[data-machine="' + id + '"]');
      self.m[id] = {
        g: g, tint: g.querySelector('.tint'), glyph: g.querySelector('.glyph'), screen: g.querySelector('.screen-text'),
        bar: g.querySelector('.job-bar'), lamp: g.querySelector('.lamp'), health: g.querySelector('.health'),
        badge: g.querySelector('.badge'), ops: g.querySelector('.ops'), opsKey: ''
      };
    });
    this.b = {};
    Object.keys(BUFFERS).forEach(function (id) {
      var g = self.svg.querySelector('[data-buffer="' + id + '"]');
      self.b[id] = { g: g, glow: g.querySelector('.glow'), items: g.querySelector('.items'), pill: g.querySelector('.pill-text'), key: '' };
    });
    this.rawLabels = this.svg.querySelector('.raw-labels');
    this.shelfItems = this.svg.querySelector('.shelf-items');
    this.benchOps = this.svg.querySelector('.bench-ops');
    this.tokenLayer = this.svg.querySelector('.tokens');
    this.truck = this.svg.querySelector('.truck');
    this.tokens = [];
    this.keys = {};
    this.counters = null;
    this.truckUntil = 0;

    this.svg.addEventListener('click', function (e) {
      var mg = e.target.closest('[data-machine]');
      if (mg) return self.onPick('machine', mg.getAttribute('data-machine'), mg);
      var a = e.target.closest('[data-area]');
      if (a) return self.onPick(a.getAttribute('data-area'));
      self.onPick(null);
    });
    this.svg.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var mg = e.target.closest('[data-machine]');
      if (mg) { e.preventDefault(); self.onPick('machine', mg.getAttribute('data-machine'), mg); }
    });
  }

  function truckMarkup() {
    return '<rect x="0" y="-42" width="120" height="62" rx="8" fill="#FFFFFF" stroke="#E2CFAF" stroke-width="3"/>' +
      '<rect x="12" y="-30" width="96" height="10" rx="5" fill="#FF8A3D"/>' +
      '<path d="M120 -26 h34 l22 22 v24 h-56 z" fill="#5B86FF"/>' +
      '<rect x="128" y="-20" width="24" height="16" rx="3" fill="#CBEAF7"/>' +
      '<circle cx="30" cy="22" r="11" fill="#3B2F25"/><circle cx="30" cy="22" r="4" fill="#D8C7AE"/>' +
      '<circle cx="146" cy="22" r="11" fill="#3B2F25"/><circle cx="146" cy="22" r="4" fill="#D8C7AE"/>';
  }

  Scene.prototype.select = function (id) {
    var self = this;
    Object.keys(this.m).forEach(function (k) { cls(self.m[k].g, 'selected', k === id); });
  };

  /** Visual state of a machine: lamp colour and the word on its screen. */
  function machineLook(state, m, cfg) {
    var warn = m.health < cfg.machine.warnHealth || m.warnedDefects;
    switch (m.status) {
      case 'running': return { lamp: warn ? 'orange' : 'green', text: '', active: true, warn: warn };
      case 'broken': return { lamp: 'red', text: T.t('status.broken'), broken: true, warn: false };
      case 'maintenance': return { lamp: 'blue', text: T.t('status.maintenance'), service: true, warn: false };
      case 'setup': return { lamp: 'blue', text: T.t('status.setup'), service: true, warn: false };
      case 'starved':
        if (m.id === 'assembly') return { lamp: 'gray', text: T.t('status.starvedMat'), idle: true, warn: true, alert: true };
        return { lamp: 'gray', text: T.t('status.starved'), idle: true, warn: warn };
      case 'blocked': return { lamp: 'orange', text: T.t('status.blocked'), idle: true, warn: true, alert: true };
      case 'noOperator': return { lamp: 'gray', text: T.t('status.noOperator'), idle: true, warn: true, alert: true };
      default: return { lamp: 'gray', text: T.t('status.idle'), idle: true, warn: warn };
    }
  }
  Scene.machineLook = machineLook;

  Scene.prototype.update = function (state, now) {
    var cfg = FM.Config.of(state);
    var self = this;

    // machines
    cfg.line.forEach(function (id) {
      var m = state.machines[id];
      var v = self.m[id];
      var look = machineLook(state, m, cfg);
      setAttr(v.lamp, 'fill', LAMP[look.lamp]);
      cls(v.g, 'is-idle', look.idle);
      cls(v.g, 'is-broken', look.broken);
      cls(v.g, 'is-service', look.service);
      cls(v.g, 'is-running', look.active);
      cls(v.badge, 'show', look.warn);
      setAttr(v.badge.querySelector('circle'), 'fill', look.alert || m.health < cfg.machine.warnHealth ? '#E5484D' : '#F5A524');
      setText(v.screen, look.text);
      cls(v.glyph, 'hide', !!look.text);
      var progress = 0;
      if (m.down) progress = 1 - m.down.left / m.down.total;
      else if (m.job) progress = 1 - Math.max(0, m.job.left) / m.job.total;
      setAttr(v.bar, 'width', (88 * Math.max(0, Math.min(1, progress))).toFixed(1));
      setAttr(v.bar, 'fill', m.down ? (m.down.reason === 'breakdown' ? '#E5484D' : '#3B82F6') : MACHINES[id].top);
      var h = Math.max(0, Math.min(100, m.health));
      setAttr(v.health, 'width', (36 * h / 100).toFixed(1));
      setAttr(v.health, 'fill', h < cfg.machine.warnHealth ? '#E5484D' : h < 70 ? '#F5A524' : '#2FBF71');
      setAttr(v.g, 'aria-label', T.t('machine.' + id) + '، ' + T.t('status.' + (m.status === 'starved' && id === 'assembly' ? 'starvedMat' : m.status)));

      // operators: redraw only when something visible changed
      var ops = FM.Workforce.assignedTo(state, id);
      var key = ops.map(function (w) {
        return w.id + ':' + Math.round(w.fatigue / 4) + ':' + (FM.Workforce.isPresent(state, w) ? 1 : 0) + ':' + (w.fatigue >= cfg.workforce.fatigue.warnAt ? 1 : 0);
      }).join('|');
      if (key !== v.opsKey) {
        v.opsKey = key;
        var html = '';
        ops.forEach(function (w, i) {
          var x = ops.length === 1 ? 0 : (i === 0 ? 24 : -24);
          html += operatorMarkup(w, x, MACHINES[id].shirt, state, cfg);
        });
        v.ops.innerHTML = html;
      }
    });

    // buffers between machines
    Object.keys(BUFFERS).forEach(function (id) {
      var buf = state.buffers[id];
      var v = self.b[id];
      var n = buf.length;
      var shown = buf.slice(0, SLOTS.length).map(function (u) { return u.product === 'speaker' ? 's' : 'h'; }).join('');
      var key = n + shown;
      if (key !== v.key) {
        v.key = key;
        var html = '';
        for (var i = 0; i < shown.length; i++) {
          html += '<g transform="translate(' + SLOTS[i][0] + ',' + (BELT_Y - 11 + SLOTS[i][1]) + ')">' + I.product(shown[i] === 's' ? 'speaker' : 'headphone') + '</g>';
        }
        v.items.innerHTML = html;
        setText(v.pill, n ? T.t('scene.queue', { n: T.num(n) }) : T.t('scene.queueEmpty'));
        var fill = n / cfg.bufferCapacity;
        cls(v.g, 'warn', fill > 0.7 && fill < 1);
        cls(v.g, 'full', fill >= 1);
        setAttr(v.glow, 'opacity', fill >= 1 ? 0.16 : fill > 0.7 ? 0.1 : 0);
        setAttr(v.glow, 'fill', fill >= 1 ? '#E5484D' : '#F5A524');
      }
    });

    // raw materials
    var rawKey = state.materials.components + ':' + state.materials.casing + ':' + state.incoming.length;
    if (rawKey !== this.keys.raw) {
      this.keys.raw = rawKey;
      var low = this.lowRaw(state, cfg);
      this.rawLabels.innerHTML =
        '<rect x="-60" y="-14" width="120" height="50" rx="12" fill="#FFFFFF" stroke="' + (low ? '#E5484D' : '#E9D6B6') + '" stroke-width="' + (low ? 2.5 : 1) + '"/>' +
        '<text y="4" text-anchor="middle" class="raw-text">' + T.t('scene.components', { n: T.num(state.materials.components) }) + '</text>' +
        '<text y="26" text-anchor="middle" class="raw-text">' + T.t('scene.casing', { n: T.num(state.materials.casing) }) + '</text>' +
        (state.incoming.length ? '<g transform="translate(0,-150)"><rect x="-50" y="-14" width="100" height="26" rx="13" fill="#3B82F6"/>' +
          '<text y="4" text-anchor="middle" class="tag-text">' + T.t('scene.incoming', { n: T.num(state.incoming.length) }) + '</text></g>' : '');
    }

    // finished goods on the shelf
    var hp = FM.Market.stockOf(state, 'headphone'), sp = FM.Market.stockOf(state, 'speaker');
    var shelfKey = hp + ':' + sp;
    if (shelfKey !== this.keys.shelf) {
      this.keys.shelf = shelfKey;
      var html = '';
      var rows = [282, 337, 392];
      var items = [];
      for (var i = 0; i < Math.min(hp, 6); i++) items.push('headphone');
      for (var j = 0; j < Math.min(sp, 6); j++) items.push('speaker');
      items.slice(0, 9).forEach(function (p, k) {
        html += '<g transform="translate(' + (SHELF.x + 30 - (k % 3) * 30) + ',' + rows[Math.floor(k / 3)] + ') scale(.9)">' + I.product(p) + '</g>';
      });
      html += '<g transform="translate(' + SHELF.x + ',448)"><rect x="-62" y="-16" width="124" height="32" rx="16" fill="#FFFFFF" stroke="#E9D6B6"/>' +
        '<text y="6" text-anchor="middle" class="raw-text">' + T.t('scene.stock', { n: T.num(hp + sp) }) + '</text></g>';
      this.shelfItems.innerHTML = html;
    }

    // people resting
    var resting = state.workers.filter(function (w) { return !w.station; });
    var benchKey = resting.map(function (w) { return w.id + ':' + (FM.Workforce.isPresent(state, w) ? 1 : 0); }).join('|');
    if (benchKey !== this.keys.bench) {
      this.keys.bench = benchKey;
      var bh = '';
      resting.slice(0, 5).forEach(function (w, i) {
        bh += '<g transform="translate(' + (BENCH.x + 70 - i * 36) + ',' + (BENCH.y - 60) + ') scale(.82)">' + operatorMarkup(w, 0, '#A39787', state, cfg).replace('translate(0,420)', 'translate(0,0)') + '</g>';
      });
      bh += '<text x="' + BENCH.x + '" y="' + (BENCH.y + 58) + '" text-anchor="middle" class="floor-caption">' +
        T.t('scene.rest', { n: T.num(resting.length) }) + '</text>';
      this.benchOps.innerHTML = bh;
    }

    this.animate(state, now);
  };

  Scene.prototype.lowRaw = function (state, cfg) {
    var need = { components: 0, casing: 0 };
    state.queue.forEach(function (b) {
      var bom = cfg.products[b.product].bom;
      need.components = Math.max(need.components, bom.components);
      need.casing = Math.max(need.casing, bom.casing);
    });
    return state.queue.length > 0 && (state.materials.components < need.components || state.materials.casing < need.casing);
  };

  // ---------- animation ----------

  var PATHS = {
    assembly: { from: 930 - 70, to: 775 + 40 },
    test: { from: 620 - 70, to: 470 + 40 },
    scrap: { from: 620, to: 620 },
    packaging: { from: 320 - 70, to: SHELF.x + 50 }
  };

  /** Sends small product tokens along the belt when units move between stations. */
  Scene.prototype.animate = function (state, now) {
    var st = state.stats;
    var c = { a: st.assembled, s: st.scrapped, t: state.machines.test.stats.completed, p: st.packed, sh: st.shipped + st.soldWholesale,
      sp: state.finished.speaker.good + state.finished.speaker.defective };
    var prev = this.counters;
    this.counters = c;
    if (prev && !this.reduced) {
      var lastA = state.buffers.test[state.buffers.test.length - 1];
      var lastP = state.buffers.packaging[state.buffers.packaging.length - 1];
      if (c.a > prev.a) this.spawn('assembly', lastA ? lastA.product : 'headphone', now);
      if (c.s > prev.s) this.spawn('scrap', 'headphone', now);
      if (c.t - (c.s - prev.s) > prev.t) this.spawn('test', lastP ? lastP.product : 'headphone', now);
      if (c.p > prev.p) this.spawn('packaging', c.sp > prev.sp ? 'speaker' : 'headphone', now);
      if (c.sh > prev.sh) this.truckUntil = now + 2600;
    }
    // move tokens
    for (var i = this.tokens.length - 1; i >= 0; i--) {
      var k = this.tokens[i];
      var p = (now - k.start) / k.dur;
      if (p >= 1) { k.el.remove(); this.tokens.splice(i, 1); continue; }
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var x = k.from + (k.to - k.from) * e;
      var y = k.scrap ? BELT_Y + 70 * e : BELT_Y - 12 - Math.sin(Math.PI * p) * 10;
      k.el.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + (k.scrap ? 0.8 : 0.9) + ')');
      k.el.setAttribute('opacity', k.scrap ? (1 - p).toFixed(2) : '1');
    }
    // truck: drives in, waits, drives out
    var tx = -260;
    if (now < this.truckUntil) {
      var q = 1 - (this.truckUntil - now) / 2600;
      tx = q < 0.3 ? -260 + (290 * q / 0.3) : q < 0.7 ? 30 : 30 - 290 * (q - 0.7) / 0.3;
    }
    setAttr(this.truck, 'transform', 'translate(' + tx.toFixed(0) + ',520)');
  };

  Scene.prototype.spawn = function (path, product, now) {
    if (this.tokens.length > 24) return;
    var p = PATHS[path];
    var g = el('g', {}, this.tokenLayer);
    g.innerHTML = path === 'scrap'
      ? '<rect x="-11" y="-11" width="22" height="22" rx="6" fill="#E5484D"/><path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>'
      : I.product(product);
    this.tokens.push({ el: g, from: p.from, to: p.to, start: now, dur: 650, scrap: path === 'scrap' });
  };

  Scene.prototype.reset = function () {
    this.tokens.forEach(function (k) { k.el.remove(); });
    this.tokens = [];
    this.counters = null;
    this.keys = {};
    this.truckUntil = 0;
    var self = this;
    Object.keys(this.m).forEach(function (id) { self.m[id].opsKey = ''; });
    Object.keys(this.b).forEach(function (id) { self.b[id].key = ''; });
  };

  /** Screen position of a machine, for placing its popover. */
  Scene.prototype.anchorOf = function (id) {
    var r = this.m[id].g.querySelector('.body').getBoundingClientRect();
    return { x: r.left + r.width / 2, width: r.width, top: r.top, bottom: r.bottom };
  };

  FM.Scene = Scene;
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
