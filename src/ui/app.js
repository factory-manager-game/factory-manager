/**
 * The browser app: chapter menu, game loop, HUD, dock, sheets, popover, toasts and dialogs.
 * The engine owns the state; this file only reads it and sends player actions through
 * FM.Engine.dispatch so every decision is recorded for replay.
 */
(function (FM) {
  'use strict';

  var T = FM.Text;
  var t = T.t;
  var I = FM.Icons;
  var D = FM.Dom;
  var $ = D.$;

  var MINUTES_PER_SECOND = 2;          // game minutes per real second at 1×
  var SPEEDS = [1, 2, 4];
  var PANEL_INTERVAL = 200;            // ms between panel refreshes
  var TOAST_MS = 4500;

  var app = {
    state: null,
    paused: true,
    speed: 1,
    rate: MINUTES_PER_SECOND,         // tests may raise this to play faster
    acc: 0,
    last: 0,
    lastLogId: 0,
    endShown: false,
    modalOpen: false,
    scene: null,
    nextPanel: 0,
    ui: { sheet: null, machine: null, planProduct: 'headphone', planQty: 10, buyQty: { components: 60, casing: 30 } }
  };

  function cfg() { return FM.Config.of(app.state); }

  // ---------- actions ----------

  function act(name) {
    if (!app.state) return { ok: false };
    var args = Array.prototype.slice.call(arguments, 1);
    var res = FM.Engine.dispatch.apply(null, [app.state, name].concat(args));
    if (!res.ok) toast('bad', t(res.reason));
    refresh();
    return res;
  }

  function num(el, k) { return parseInt(el.getAttribute('data-' + k), 10); }
  function str(el, k) { return el.getAttribute('data-' + k); }

  var handlers = {
    accept: function (el) { act('acceptOffer', num(el, 'id')); },
    decline: function (el) { act('declineOffer', num(el, 'id')); },
    deliver: function (el) { act('deliverOrder', num(el, 'id')); },
    planFor: function (el) {
      var p = str(el, 'product'), q = num(el, 'qty');
      if (act('addBatch', p, q).ok) toast('good', t('orders.planned', { n: T.num(q), product: t('product.' + p) }));
    },
    sell: function (el) { act('sellWholesale', str(el, 'product'), num(el, 'qty')); },
    planProduct: function (el) { app.ui.planProduct = str(el, 'v'); refresh(); },
    planQty: function (el) { app.ui.planQty = Math.max(5, Math.min(200, app.ui.planQty + num(el, 'd'))); refresh(); },
    addBatch: function () { act('addBatch', app.ui.planProduct, app.ui.planQty); },
    batchUp: function (el) { act('moveBatchUp', num(el, 'id')); },
    batchRemove: function (el) { act('removeBatch', num(el, 'id')); },
    buyQty: function (el) {
      var k = str(el, 'key');
      app.ui.buyQty[k] = Math.max(10, Math.min(cfg().warehouse.rawCapacity, app.ui.buyQty[k] + num(el, 'd')));
      refresh();
    },
    buy: function (el) { act('buyMaterial', str(el, 'mat'), app.ui.buyQty[str(el, 'mat')], str(el, 'express') === '1'); },
    assign: function (el) { var v = str(el, 'v'); act('assignWorker', num(el, 'id'), v === 'rest' ? null : v); },
    hire: function () { act('hire'); },
    fire: function (el) {
      var id = num(el, 'id');
      var w = app.state.workers.filter(function (x) { return x.id === id; })[0];
      if (!w) return;
      confirmBox(t('workers.fireTitle', { name: w.name }), t('workers.fireText', { cost: T.money(cfg().workforce.severance) }),
        t('workers.fire'), function () { act('fire', id); });
    },
    ops: function (el) { act('changeOperators', str(el, 'm'), num(el, 'd')); },
    mode: function (el) { act('setMode', str(el, 'm'), str(el, 'v')); },
    qc: function (el) { act('setQcMode', str(el, 'v')); },
    maintain: function (el) { act('maintain', str(el, 'm')); },
    closePop: function () { selectMachine(null); }
  };

  // ---------- screens ----------

  function showScreen(id) {
    ['menu', 'game'].forEach(function (s) { $('#' + s).hidden = s !== id; });
  }

  function renderMenu() {
    var html = '';
    FM.Chapters.list().forEach(function (ch) {
      var c = FM.Config.of(ch.id);
      html += '<button type="button" class="chapter-card' + (ch.id === 'free' ? ' free' : '') + '" data-act="start" data-id="' + ch.id + '">' +
        '<span class="ch-num">' + (ch.number ? T.num(ch.number) : '∞') + '</span>' +
        '<span class="ch-body"><small>' + (ch.number ? t('menu.chapter', { n: T.num(ch.number) }) : t('menu.free')) + '</small>' +
        '<b>' + D.esc(ch.title) + '</b><span>' + D.esc(ch.concept) + '</span></span>' +
        '<span class="ch-days">' + t('menu.days', { n: T.num(c.days) }) + '</span></button>';
    });
    $('#chapters').innerHTML = html;
  }

  function startChapter(id, seed) {
    app.state = FM.Engine.newGame(id, seed);
    app.paused = true;
    app.acc = 0;
    app.endShown = false;
    app.lastLogId = app.state.log.length ? app.state.log[0].id : 0;
    app.ui.sheet = null;
    app.ui.machine = null;
    app.ui.planProduct = cfg().features.products[0];
    $('#toasts').innerHTML = '';
    closeSheet();
    selectMachine(null);
    app.scene.reset();
    showScreen('game');
    var ch = FM.Chapters.get(id);
    $('#hud-title').textContent = ch.number ? t('menu.chapter', { n: T.num(ch.number) }) + ': ' + ch.title : ch.title;
    renderAll(performance.now());
    var intro = app.state.log.filter(function (e) { return e.key.indexOf('log.intro.') === 0; })[0];
    showModal('<div class="mentor"><div class="mentor-face">ا</div><div><small>' + t('mentor.name') + '</small>' +
      '<p>' + (intro ? T.logText(intro) : '') + '</p></div></div>' + goalsList(true) +
      '<div class="modal-actions"><button type="button" class="btn primary big" data-act="modalStart">' + I.icon('play', 18) + t('menu.play') + '</button></div>');
  }

  // ---------- modal ----------

  var modalHandlers = {};
  function showModal(html, extra) {
    app.modalOpen = true;
    modalHandlers = extra || {};
    var m = $('#modal');
    $('#modal-card').innerHTML = html;
    m.hidden = false;
    var first = m.querySelector('.btn.primary') || m.querySelector('button');
    if (first) first.focus();
  }
  function hideModal() { app.modalOpen = false; $('#modal').hidden = true; app.last = performance.now(); }

  function confirmBox(title, text, okLabel, onOk) {
    showModal('<h2>' + D.esc(title) + '</h2><p>' + text + '</p><div class="modal-actions">' +
      '<button type="button" class="btn primary danger" data-act="modalOk">' + D.esc(okLabel) + '</button>' +
      '<button type="button" class="btn ghost" data-act="modalCancel">' + t('modal.cancel') + '</button></div>',
      { modalOk: function () { hideModal(); onOk(); }, modalCancel: hideModal });
  }

  // ---------- HUD ----------

  function goalInfo(g) {
    var p = g.params;
    var money = g.type === 'profit' || g.type === 'cash' || g.type === 'cashAboveStart';
    var ratio = g.type === 'quality' || g.type === 'oee';
    var label;
    if (g.type === 'deliverTag') label = t('goal.deliverTag', { tag: t('tag.' + p.tag) });
    else if (money) label = t('goal.' + g.type, { target: T.money(g.type === 'cashAboveStart' ? g.target - 1 : g.target) });
    else if (ratio) label = t('goal.' + g.type, { target: T.pct(g.target) });
    else if (g.type === 'deliverUnits') label = t('goal.deliverUnits', { target: T.num(g.target) });
    else label = t('goal.' + g.type);
    var value = '';
    if (g.type === 'deliverScripted' || g.type === 'deliverUnits') value = t('goal.of', { v: T.num(g.value), n: T.num(g.target) });
    else if (money) value = T.money(g.value);
    else if (ratio) value = T.pct(g.value, 1);
    var frac = g.type === 'deliverTag' || g.type === 'noCancelled' ? (g.done ? 1 : 0) : g.target > 0 ? g.value / g.target : 0;
    return { label: label, value: value, frac: Math.max(0, Math.min(1, frac)), done: g.done };
  }

  function goalsList(big) {
    var ev = FM.Goals.evaluate(app.state);
    return '<ul class="goals' + (big ? ' big' : '') + '">' + ev.goals.map(function (g) {
      var gi = goalInfo(g);
      return '<li class="' + (gi.done ? 'done' : '') + '"><span class="g-check">' + (gi.done ? I.icon('check', 14) : '') + '</span>' +
        '<span class="g-label">' + gi.label + '</span>' + (gi.value ? '<b>' + gi.value + '</b>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function renderHud() {
    var s = app.state;
    var c = cfg();
    setText('#hud-day', t('hud.day', { day: T.num(s.day), days: T.num(c.days) }));
    var dayFrac = (s.t - FM.util.dayStart(s.day)) / FM.util.MINUTES_PER_DAY;
    var chapterFrac = (s.day - 1 + Math.min(1, dayFrac)) / c.days;
    $('#hud-progress').style.width = (Math.min(1, chapterFrac) * 100).toFixed(1) + '%';
    D.patch($('#hud-goals'), goalsList(false));
    setText('#hud-cash', T.money(s.cash));
    $('#pill-cash').classList.toggle('bad', s.cash < 0);
    setText('#hud-sat', T.num(Math.round(s.satisfaction)) + '٪');
    $('#pill-sat').classList.toggle('bad', s.satisfaction < 40);
    setText('#hud-clock', s.t >= FM.util.dayEnd(s.day) ? '۱۶:۰۰' : T.clock(s.t));
    var pb = $('#btn-pause');
    var paused = app.paused || s.status !== 'running';
    pb.innerHTML = I.icon(paused ? 'play' : 'pause', 18);
    pb.setAttribute('aria-label', paused ? t('hud.play') : t('hud.pause'));
    pb.classList.toggle('on', paused);
    $('#game').classList.toggle('paused', paused);
    setText('#btn-speed', '\u2066' + T.num(app.speed) + '×\u2069');
    $('#btn-speed').setAttribute('aria-label', t('hud.speed', { x: T.num(app.speed) + '×' }));
  }

  function setText(sel, v) { var e = $(sel); if (e.textContent !== v) e.textContent = v; }

  // ---------- dock ----------

  var SHEETS = ['orders', 'plan', 'buy', 'workers', 'report'];

  function dockBadges() {
    var s = app.state;
    var c = cfg();
    var ready = s.orders.filter(function (o) { return FM.Market.stockOf(s, o.product) >= o.qty; }).length;
    var late = s.orders.some(function (o) { return o.late; });
    var b = {
      orders: { n: s.offers.length + ready, tone: late ? 'bad' : s.offers.length ? 'warn' : 'good' },
      plan: { n: needPlan(s) ? 1 : 0, text: '!', tone: 'warn' },
      buy: { n: FM.Market.inShortage(s) || app.scene.lowRaw(s, c) ? 1 : 0, text: '!', tone: 'bad' },
      workers: {
        n: s.workers.filter(function (w) { return !FM.Workforce.isPresent(s, w) || w.fatigue >= c.workforce.fatigue.warnAt; }).length,
        tone: 'warn'
      },
      report: { n: 0 }
    };
    SHEETS.forEach(function (k) {
      var el = $('#dock [data-sheet="' + k + '"] .dock-badge');
      var info = b[k];
      el.hidden = !info.n;
      el.className = 'dock-badge ' + (info.tone || '');
      var txt = info.text || T.num(info.n);
      if (el.textContent !== txt) el.textContent = txt;
    });
  }

  /** True when the line has nothing to make but an accepted order still needs units. */
  function needPlan(s) {
    if (s.queue.length) return false;
    var cov = FM.Panels.coverage(s);
    return s.orders.some(function (o) { return cov[o.id] && cov[o.id].short > 0; });
  }

  function openSheet(name) {
    if (app.ui.sheet === name) return closeSheet();
    app.ui.sheet = name;
    selectMachine(null);
    var sh = $('#sheet');
    sh.hidden = false;
    $('#sheet-title').textContent = t('dock.' + name);
    $('#sheet-body').__html = null;
    $('#sheet-body').innerHTML = '';
    $('#sheet-body').scrollTop = 0;
    document.querySelectorAll('#dock [data-sheet]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-sheet') === name);
      b.setAttribute('aria-pressed', b.getAttribute('data-sheet') === name ? 'true' : 'false');
    });
    refresh();
  }

  function closeSheet() {
    app.ui.sheet = null;
    $('#sheet').hidden = true;
    document.querySelectorAll('#dock [data-sheet]').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  }

  function renderSheet() {
    if (!app.ui.sheet) return;
    D.patch($('#sheet-body'), FM.Panels[app.ui.sheet](app.state, app.ui));
  }

  // ---------- machine popover ----------

  function selectMachine(id) {
    app.ui.machine = id;
    if (app.scene) app.scene.select(id);
    var pop = $('#pop');
    if (!id) { pop.hidden = true; pop.__html = null; return; }
    if (app.ui.sheet) closeSheet();
    pop.hidden = false;
    renderPop();
  }

  function renderPop() {
    var id = app.ui.machine;
    if (!id) return;
    var pop = $('#pop');
    D.patch(pop, FM.Panels.machine(app.state, id));
    if (window.matchMedia('(max-width: 720px)').matches) { pop.style.left = ''; pop.style.top = ''; return; }
    var a = app.scene.anchorOf(id);
    var host = $('#game').getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var cx = a.x - host.left;
    // Beside the machine, on the side with more room, so the machine stays visible.
    var x = cx > host.width / 2 ? cx - a.width / 2 - w - 16 : cx + a.width / 2 + 16;
    x = Math.max(12, Math.min(host.width - w - 12, x));
    var y = (a.top + a.bottom) / 2 - host.top - h / 2;
    y = Math.max(100, Math.min(host.height - h - 86, y));
    pop.style.left = x.toFixed(0) + 'px';
    pop.style.top = y.toFixed(0) + 'px';
  }

  // ---------- toasts ----------

  function toast(type, html) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = html;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, TOAST_MS);
  }

  function pumpLog() {
    var fresh = [];
    var log = app.state.log;
    for (var i = 0; i < log.length && log[i].id > app.lastLogId; i++) fresh.push(log[i]);
    if (!fresh.length) return;
    app.lastLogId = fresh[0].id;
    fresh.reverse().filter(function (e) { return e.toast && e.key !== 'log.chapterWon' && e.key !== 'log.chapterLost'; })
      .slice(-3).forEach(function (e) { toast(e.type, T.logText(e)); });
  }

  // ---------- end of chapter ----------

  function showEnd() {
    app.endShown = true;
    selectMachine(null);
    closeSheet();
    var s = app.state;
    var r = s.result;
    var k = FM.Finance.kpis(s);
    var stars = '';
    for (var i = 1; i <= 3; i++) stars += '<span class="star' + (i <= r.stars ? ' on' : '') + '">' + I.icon('star', 34) + '</span>';
    showModal('<div class="end ' + (r.won ? 'won' : 'lost') + '"><h2>' + t(r.won ? 'end.won' : 'end.lost') + '</h2>' +
      (r.won ? '<div class="stars">' + stars + '</div>' : '') +
      '<p>' + t('end.reason.' + r.reason) + '</p>' + goalsList(true) +
      '<div class="kpis">' +
      '<div class="kpi"><span>' + t('report.profit') + '</span><b>' + T.money(k.profit) + '</b></div>' +
      '<div class="kpi"><span>' + t('report.quality') + '</span><b>' + T.pct(k.quality, 1) + '</b></div>' +
      '<div class="kpi"><span>' + t('end.onTime') + '</span><b>' + T.num(s.stats.ordersOnTime) + ' / ' + T.num(s.stats.ordersOnTime + s.stats.ordersLate + s.stats.ordersCancelled) + '</b></div>' +
      '</div><div class="modal-actions">' +
      '<button type="button" class="btn primary big" data-act="modalAgain">' + t('end.again') + '</button>' +
      '<button type="button" class="btn ghost" data-act="modalMenu">' + t('end.menu') + '</button></div></div>');
  }

  // ---------- loop ----------

  function refresh() { app.nextPanel = 0; }

  function renderAll(now) {
    renderHud();
    app.scene.update(app.state, now);
    dockBadges();
    if (now >= app.nextPanel) {
      renderSheet();
      renderPop();
      app.nextPanel = now + PANEL_INTERVAL;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    var s = app.state;
    if (!s || $('#game').hidden) { app.last = now; return; }
    var dt = Math.min(0.25, Math.max(0, (now - (app.last || now)) / 1000));
    app.last = now;
    if (!app.paused && !app.modalOpen && s.status === 'running') {
      app.acc += dt * app.rate * app.speed;
      var n = Math.floor(app.acc);
      app.acc -= n;
      for (var i = 0; i < n && s.status === 'running'; i++) FM.Engine.stepMinute(s);
      if (n) refresh();
    }
    pumpLog();
    renderAll(now);
    if (s.status !== 'running' && !app.endShown) showEnd();
  }

  // ---------- wiring ----------

  function init() {
    app.scene = new FM.Scene($('#floor'), function (kind, id) {
      if (kind === 'machine') return selectMachine(app.ui.machine === id ? null : id);
      if (kind === 'raw') return openSheet('buy');
      if (kind === 'shelf') return openSheet('orders');
      if (kind === 'bench') return openSheet('workers');
      selectMachine(null);
    });
    app.scene.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderMenu();

    D.delegate($('#chapters'), { start: function (el) { startChapter(str(el, 'id')); } });
    D.delegate($('#sheet'), Object.assign({ closeSheet: closeSheet }, handlers));
    D.delegate($('#pop'), handlers);
    D.delegate($('#modal'), {
      modalStart: function () { hideModal(); app.paused = false; },
      modalAgain: function () { hideModal(); startChapter(app.state.chapterId); },
      modalMenu: function () { hideModal(); app.state = null; showScreen('menu'); },
      modalOk: function (el, e) { if (modalHandlers.modalOk) modalHandlers.modalOk(el, e); },
      modalCancel: function (el, e) { if (modalHandlers.modalCancel) modalHandlers.modalCancel(el, e); }
    });
    D.delegate($('#dock'), { sheet: function (el) { openSheet(str(el, 'sheet')); } });
    D.delegate($('#hud'), {
      pause: function () { if (app.state.status === 'running') app.paused = !app.paused; },
      speed: function () { app.speed = SPEEDS[(SPEEDS.indexOf(app.speed) + 1) % SPEEDS.length]; },
      back: function () {
        if (app.state.status !== 'running') { app.state = null; showScreen('menu'); return; }
        confirmBox(t('menu.leaveTitle'), t('menu.leaveText'), t('menu.leave'), function () { app.state = null; showScreen('menu'); });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!app.state || $('#game').hidden) return;
      if (e.key === 'Escape') {
        if (app.modalOpen && modalHandlers.modalCancel) return modalHandlers.modalCancel();
        if (app.ui.machine) return selectMachine(null);
        if (app.ui.sheet) return closeSheet();
      }
      if (app.modalOpen) return;
      if (e.key === ' ' && (e.target === document.body || e.target.closest('.floor'))) {
        e.preventDefault();
        if (app.state.status === 'running') app.paused = !app.paused;
      }
    });

    showScreen('menu');
    requestAnimationFrame(frame);
    FM.app = app;   // for debugging and browser tests
    app.start = startChapter;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.FM = window.FM || {});
