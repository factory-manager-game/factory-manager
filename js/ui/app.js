/**
 * App controller: owns the game state, runs the real-time loop,
 * and turns clicks into engine actions.
 */
(function (FM) {
  'use strict';

  var C = FM.CONFIG;
  var A = FM.Actions;
  var UI = FM.UI;
  var t = FM.i18n.t;

  var app = {
    state: null,
    paused: true,
    speedIndex: 0,
    started: false,
    endShown: false,
    acc: 0,
    last: 0
  };

  var LANG_KEY = 'factory-manager.lang';

  function loadLang() {
    try { return localStorage.getItem(LANG_KEY) || 'fa'; } catch (e) { return 'fa'; }
  }

  function saveLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* storage unavailable: language just isn't remembered */ }
  }

  function newGame() {
    app.state = FM.Engine.newGame();
    app.paused = true;
    app.started = false;
    app.endShown = false;
    app.acc = 0;
    UI.state.lastToastId = app.state.nextId;
    UI.build();
    UI.update(app.state, app);
    UI.showStart();
  }

  function result(r) {
    if (r && !r.ok) UI.toast(t(r.reason), 'bad');
    return r;
  }

  function readQty(id) {
    var el = document.getElementById(id);
    return el ? parseInt(el.value, 10) : NaN;
  }

  function planOrder(id) {
    var s = app.state;
    var o = s.orders.find(function (x) { return x.id === id; });
    if (!o) return;
    var committed = 0;
    s.orders.forEach(function (x) {
      if (x.product === o.product && x.dueAt <= o.dueAt) committed += x.qty;
    });
    var short = committed - FM.Market.stockOf(s, o.product) - UI.inLine(s, o.product);
    short = Math.min(short, o.qty);
    if (short <= 0) { UI.toast(t('orders.covered'), 'info'); return; }
    if (result(A.addBatch(s, o.product, short)).ok) UI.toast(t('orders.planned', { n: FM.i18n.num(short) }), 'good');
  }

  function togglePause() {
    if (!app.started || app.state.status !== 'running') return;
    app.paused = !app.paused;
  }

  function setSpeed(i) {
    if (!app.started || app.state.status !== 'running') return;
    app.speedIndex = i;
    app.paused = false;
  }

  var handlers = {
    pause: togglePause,
    speed: function (d) { setSpeed(Number(d.v)); },
    lang: function () {
      FM.i18n.setLang(FM.i18n.getLang() === 'fa' ? 'en' : 'fa');
      saveLang(FM.i18n.getLang());
      var wasOpen = UI.modalOpen();
      UI.build();
      if (!wasOpen) return;
      if (!app.started) UI.showStart();
      else if (app.endShown) UI.showEnd(app.state);
      else UI.showHelp();
    },
    help: function () { UI.showHelp(); },
    close: function () {
      UI.closeModal();
      if (!app.started) UI.showStart();
    },
    start: function () {
      UI.closeModal();
      app.started = true;
      app.paused = false;
      app.last = performance.now();
    },
    restart: newGame,

    mode: function (d) { result(A.setMode(app.state, d.m, d.v)); },
    op: function (d) { result(A.changeOperators(app.state, d.m, Number(d.d))); },
    maintain: function (d) { result(A.maintain(app.state, d.m)); },
    qc: function (d) { result(A.setQcMode(app.state, d.v)); },

    tab: function (d) { UI.state.ordersTab = d.v; },
    accept: function (d) { result(A.acceptOffer(app.state, Number(d.id))); },
    decline: function (d) { result(A.declineOffer(app.state, Number(d.id))); },
    deliver: function (d) { result(A.deliverOrder(app.state, Number(d.id))); },
    planOrder: function (d) { planOrder(Number(d.id)); },

    planProduct: function (d) { UI.state.planProduct = d.v; },
    qUp: function (d) { result(A.moveBatchUp(app.state, Number(d.id))); },
    qRemove: function (d) { result(A.removeBatch(app.state, Number(d.id))); },

    buyMat: function (d) { UI.state.buyMat = d.v; },
    buy: function (d) { result(A.buyMaterial(app.state, UI.state.buyMat, readQty('buy-qty'), d.exp === '1')); },
    sell: function (d) { result(A.sellToMarket(app.state, d.v, readQty('sell-' + d.v))); },

    hire: function () { result(A.hire(app.state)); },
    fire: function () { result(A.fire(app.state)); }
  };

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var h = handlers[el.dataset.act];
    if (h) { e.preventDefault(); h(el.dataset); UI.update(app.state, app); }
  }

  function onSubmit(e) {
    if (e.target.id === 'plan-form') {
      e.preventDefault();
      result(A.addBatch(app.state, UI.state.planProduct, readQty('plan-qty')));
      UI.update(app.state, app);
    }
  }

  function onKey(e) {
    if (e.target.matches('input, textarea, select')) return;
    if (UI.modalOpen()) {
      if (e.key === 'Escape' && app.started) UI.closeModal();
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
    else if (e.key === '1' || e.key === '۱') setSpeed(0);
    else if (e.key === '2' || e.key === '۲') setSpeed(1);
    else if (e.key === '3' || e.key === '۳') setSpeed(2);
  }

  function frame(now) {
    var dt = Math.min(now - app.last, 250);   // a hidden tab doesn't fast-forward the game
    app.last = now;
    var s = app.state;
    if (app.started && !app.paused && !UI.modalOpen() && s.status === 'running') {
      var minutesPerMs = C.game.minutesPerDay / (C.game.realSecondsPerDay * 1000);
      app.acc += dt * minutesPerMs * C.speeds[app.speedIndex];
      var whole = Math.floor(app.acc);
      if (whole > 0) {
        app.acc -= whole;
        FM.Engine.advance(s, whole);
      }
    }
    UI.update(s, app);
    if (s.status !== 'running' && !app.endShown) {
      app.endShown = true;
      app.paused = true;
      setTimeout(function () { UI.showEnd(s); }, 600);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    FM.i18n.setLang(loadLang());
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', function () { UI.state.chartKey = ''; });
    newGame();
    app.last = performance.now();
    requestAnimationFrame(frame);
  }

  FM.App = app;
  document.addEventListener('DOMContentLoaded', init);
})(window.FM = window.FM || {});
