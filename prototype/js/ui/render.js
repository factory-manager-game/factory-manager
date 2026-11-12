/**
 * UI rendering.
 * build()  draws every panel's structure for the current language.
 * update() runs every frame: it changes only text, widths and classes,
 *          and redraws a list only when the set of items in it changes,
 *          so buttons are never replaced under the player's finger.
 */
(function (FM) {
  'use strict';

  var t = FM.i18n.t, num = FM.i18n.num, money = FM.i18n.money, pct = FM.i18n.pct;
  var icon = FM.icon;
  var C = FM.CONFIG;

  var MACHINE_ICON = { assembly: 'chip', test: 'check', packaging: 'box' };
  var PRODUCTS = ['headphone', 'speaker'];
  var MATERIALS = ['components', 'casing'];

  var ui = {
    ordersTab: 'offers',
    planProduct: 'headphone',
    buyMat: 'components',
    sigs: {},
    cache: {},
    lastToastId: 0,
    chartKey: ''
  };

  // ---------- helpers ----------

  function $(id) { return document.getElementById(id); }

  function setText(id, text) {
    var el = typeof id === 'string' ? $(id) : id;
    if (el && el.textContent !== text) el.textContent = text;
  }

  function setHTML(id, html) {
    var el = $(id);
    if (el && ui.cache[id] !== html) { el.innerHTML = html; ui.cache[id] = html; }
  }

  function setWidth(id, frac) {
    var el = $(id);
    if (!el) return;
    var w = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + '%';
    if (el.style.width !== w) el.style.width = w;
  }

  function setTone(el, tone, tones) {
    if (typeof el === 'string') el = $(el);
    if (!el) return;
    (tones || ['good', 'warn', 'bad', 'info']).forEach(function (x) { el.classList.toggle('tone-' + x, x === tone); });
  }

  function setDisabled(el, disabled) {
    if (typeof el === 'string') el = $(el);
    if (el && el.disabled !== disabled) el.disabled = disabled;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function productIcon(p) { return icon(p === 'headphone' ? 'headphone' : 'speaker'); }

  function remaining(minutes) {
    if (minutes < 0) return t('time.overdue', { h: num(Math.ceil(-minutes / 60)) });
    if (minutes < 60) return t('time.minutesLeft', { m: num(Math.ceil(minutes)) });
    return t('time.hoursLeft', { h: num(Math.ceil(minutes / 60)) });
  }

  function inLine(state, product) {
    var n = 0;
    ['test', 'packaging'].forEach(function (b) { state.buffers[b].forEach(function (u) { if (u.product === product) n++; }); });
    C.line.forEach(function (id) { var j = state.machines[id].job; if (j && j.product === product) n++; });
    state.queue.forEach(function (b) { if (b.product === product) n += b.qty - b.started; });
    return n;
  }

  // ---------- build ----------

  function seg(act, value, options, extra) {
    return '<div class="seg" role="group">' + options.map(function (o) {
      return '<button type="button" class="seg-b' + (o.v === value ? ' on' : '') + '" data-act="' + act + '" data-v="' + o.v + '"' +
        (extra || '') + '>' + o.label + '</button>';
    }).join('') + '</div>';
  }

  function panel(id, ic, title, body, tools) {
    return '<section class="panel" id="' + id + '"><header class="panel-h"><h2>' + icon(ic) + '<span>' + title + '</span></h2>' +
      (tools ? '<div class="panel-tools">' + tools + '</div>' : '') + '</header><div class="panel-b">' + body + '</div></section>';
  }

  function buildTopbar() {
    $('topbar').innerHTML =
      '<div class="brand"><div class="logo">' + icon('factory') + '</div><div><strong>' + t('app.title') + '</strong><small>' + t('app.subtitle') + '</small></div></div>' +
      '<div class="clock"><div class="clock-row"><span id="day-label"></span><b id="clock"></b></div><div class="bar thin"><i id="day-bar"></i></div></div>' +
      '<div class="speed" role="group">' +
        '<button class="icon-btn" data-act="pause" id="pause-btn" title="' + t('speed.pause') + '"></button>' +
        C.speeds.map(function (s, i) { return '<button class="speed-b" data-act="speed" data-v="' + i + '">' + num(s) + '×</button>'; }).join('') +
      '</div>' +
      '<div class="top-actions">' +
        '<button class="icon-btn" data-act="help" title="' + t('btn.help') + '">' + icon('help') + '</button>' +
        '<button class="lang-btn" data-act="lang">' + icon('globe') + '<span>' + t('lang.switch') + '</span></button>' +
      '</div>';
  }

  function kpiCard(id, ic, label) {
    return '<div class="kpi" id="kpi-' + id + '"><div class="kpi-ic">' + icon(ic) + '</div><div class="kpi-txt"><span class="kpi-l">' + label +
      '</span><b class="kpi-v" id="kpi-' + id + '-v"></b><small class="kpi-s" id="kpi-' + id + '-s"></small></div></div>';
  }

  function buildKpis() {
    $('kpis').innerHTML =
      kpiCard('cash', 'cash', t('kpi.cash')) +
      kpiCard('profit', 'trend', t('kpi.profit')) +
      kpiCard('oee', 'gauge', t('kpi.oee')) +
      kpiCard('quality', 'badge', t('kpi.quality')) +
      kpiCard('inventory', 'warehouse', t('kpi.inventory')) +
      kpiCard('satisfaction', 'smile', t('kpi.satisfaction'));
  }

  function machineCard(id) {
    var modes = ['slow', 'normal', 'fast'].map(function (m) { return { v: m, label: t('mode.' + m) }; });
    return '<article class="machine" id="m-' + id + '">' +
      '<div class="m-top"><div class="m-icon">' + icon(MACHINE_ICON[id]) + icon('gear', 'm-gear') + '</div>' +
        '<div class="m-title"><h3>' + t('machine.' + id) + '</h3><span class="pill" id="m-' + id + '-status"></span></div></div>' +
      '<div class="m-job"><div class="m-line"><span id="m-' + id + '-job"></span><span id="m-' + id + '-pct"></span></div>' +
        '<div class="bar"><i id="m-' + id + '-prog"></i></div></div>' +
      '<div class="m-line"><span>' + t('machine.health') + '</span><b id="m-' + id + '-hv"></b></div>' +
      '<div class="bar thin health"><i id="m-' + id + '-health"></i></div>' +
      '<div class="m-ctrl">' + seg('mode', null, modes, ' data-m="' + id + '"') + '</div>' +
      '<div class="m-line m-ops"><span>' + t('machine.operators') + '</span>' +
        '<div class="stepper"><button type="button" data-act="op" data-m="' + id + '" data-d="-1" aria-label="-">' + icon('minus') + '</button>' +
        '<span class="ops" id="m-' + id + '-ops"></span>' +
        '<button type="button" data-act="op" data-m="' + id + '" data-d="1" aria-label="+">' + icon('plus') + '</button></div></div>' +
      '<div class="m-meta"><span id="m-' + id + '-info"></span><span id="m-' + id + '-util"></span></div>' +
      '<button type="button" class="btn ghost sm full" data-act="maintain" data-m="' + id + '" id="m-' + id + '-maint">' +
        icon('wrench') + t('machine.maintain', { cost: money(C.machine.maintenanceCost) }) + '</button>' +
      '</article>';
  }

  function flowConnector(buffer) {
    return '<div class="flow" id="buf-' + buffer + '"><div class="flow-arrow">' + icon('arrow') + '</div>' +
      '<span class="flow-n" id="buf-' + buffer + '-n"></span><div class="bar thin"><i id="buf-' + buffer + '-bar"></i></div></div>';
  }

  function buildMain() {
    var qcOpts = ['light', 'standard', 'strict'].map(function (m) { return { v: m, label: t('qc.' + m) }; });

    var line = '<div class="line">' + machineCard('assembly') + flowConnector('test') + machineCard('test') +
      flowConnector('packaging') + machineCard('packaging') + '</div>';
    var lineTools = '<span class="tool-l">' + t('qc.label') + '</span>' + seg('qc', null, qcOpts);

    var orders = '<div class="tabs" role="tablist">' +
      '<button class="tab" data-act="tab" data-v="offers" id="tab-offers">' + t('orders.offers') + ' <span class="count" id="tab-offers-n"></span></button>' +
      '<button class="tab" data-act="tab" data-v="active" id="tab-active">' + t('orders.active') + ' <span class="count" id="tab-active-n"></span></button>' +
      '</div><div class="orders" id="orders-list"></div>';

    var plan = '<form class="plan-form" id="plan-form" autocomplete="off">' +
      '<div class="seg" id="plan-product">' + PRODUCTS.map(function (p) {
        return '<button type="button" class="seg-b" data-act="planProduct" data-v="' + p + '">' + productIcon(p) + t('product.' + p) + '</button>';
      }).join('') + '</div>' +
      '<div class="input-row"><label class="field"><span>' + t('plan.qty') + '</span><input id="plan-qty" type="number" inputmode="numeric" min="1" max="200" value="20"></label>' +
      '<button type="submit" class="btn primary">' + icon('plus') + t('plan.add') + '</button></div></form>' +
      '<p class="hint" id="plan-bom"></p><ul class="queue" id="queue-list"></ul>' +
      '<p class="hint subtle">' + icon('info') + t('plan.hint', { m: num(C.setupMinutes) }) + '</p>';

    var wh = '<div class="wh-sec"><div class="sec-h"><h4>' + t('wh.raw') + '</h4><span id="raw-cap"></span></div>' +
      '<div class="bar thin"><i id="raw-cap-bar"></i></div>' +
      '<div class="mat-grid">' + MATERIALS.map(function (m) {
        return '<button type="button" class="mat" data-act="buyMat" data-v="' + m + '" id="mat-' + m + '">' +
          '<span class="mat-n">' + t('mat.' + m) + '</span><b id="mat-' + m + '-v"></b>' +
          '<span class="mat-p"><span>' + t('wh.price') + '</span><span id="mat-' + m + '-p"></span></span></button>';
      }).join('') + '</div>' +
      '<div class="buy-row"><label class="field"><span>' + t('plan.qty') + '</span><input id="buy-qty" type="number" inputmode="numeric" min="1" value="60"></label>' +
      '<button type="button" class="btn primary" data-act="buy" data-exp="0" id="buy-std">' + icon('truck') + '<span><span>' + t('wh.standard') + '</span><small id="buy-std-c"></small></span></button>' +
      '<button type="button" class="btn warn" data-act="buy" data-exp="1" id="buy-exp">' + icon('bolt') + '<span><span>' + t('wh.express', { p: num(C.delivery.express.surcharge * 100) }) + '</span><small id="buy-exp-c"></small></span></button></div>' +
      '<div class="incoming"><span class="mini-h">' + icon('truck') + t('wh.incoming') + '</span><ul id="incoming-list"></ul></div></div>' +
      '<div class="wh-sec"><div class="sec-h"><h4>' + t('wh.finished') + '</h4><span id="fin-cap"></span></div>' +
      '<div class="bar thin"><i id="fin-cap-bar"></i></div>' +
      '<div class="fg-grid">' + PRODUCTS.map(function (p) {
        return '<div class="fg"><div class="fg-top">' + productIcon(p) + '<span>' + t('product.' + p) + '</span><b id="fg-' + p + '-v"></b></div>' +
          '<div class="sell"><input id="sell-' + p + '" type="number" inputmode="numeric" min="1" value="10" aria-label="' + t('plan.qty') + '">' +
          '<button type="button" class="btn ghost sm" data-act="sell" data-v="' + p + '" id="sell-' + p + '-b">' + t('wh.sell') + ' · ' +
          money(C.products[p].marketPrice) + '</button></div></div>';
      }).join('') + '</div>' +
      '<p class="hint subtle">' + t('wh.sellHint') + '</p><p class="hint" id="holding"></p></div>';

    var wf = '<div class="wf-grid">' +
      '<div class="wf"><span>' + t('wf.total') + '</span><b id="wf-total"></b></div>' +
      '<div class="wf"><span>' + t('wf.free') + '</span><b id="wf-free"></b></div>' +
      '<div class="wf"><span>' + t('wf.wage') + '</span><b id="wf-wage"></b></div></div>' +
      '<div class="wf-team" id="wf-team"></div>' +
      '<div class="btn-row"><button type="button" class="btn primary" data-act="hire" id="wf-hire">' + icon('plus') + t('wf.hire', { cost: money(C.workforce.hireCost) }) + '</button>' +
      '<button type="button" class="btn ghost" data-act="fire" id="wf-fire">' + icon('minus') + t('wf.fire', { cost: money(C.workforce.severance) }) + '</button></div>' +
      '<p class="hint subtle">' + icon('info') + t('wf.hint') + '</p>';

    var fin = '<div class="chart-h"><span>' + t('fin.cashChart') + '</span><span class="legend"><i></i>' + money(C.game.goalCash) + '</span></div>' +
      '<div class="chart"><canvas id="cash-chart"></canvas></div>' +
      '<div class="sec-h"><h4>' + t('fin.yesterday') + '</h4></div><div id="pnl"></div>';

    var log = '<ul class="log" id="log-list"></ul>';

    $('main').innerHTML =
      panel('p-line', 'factory', t('panel.line'), line, lineTools) +
      panel('p-orders', 'clipboard', t('panel.orders'), orders) +
      panel('p-plan', 'list', t('panel.plan'), plan) +
      panel('p-wh', 'warehouse', t('panel.warehouse'), wh) +
      panel('p-fin', 'chart', t('panel.finance'), fin) +
      panel('p-wf', 'users', t('panel.workforce'), wf) +
      panel('p-log', 'info', t('panel.log'), log);
  }

  function build() {
    document.documentElement.lang = FM.i18n.getLang();
    document.documentElement.dir = FM.i18n.dir();
    document.title = t('app.title') + ' · Factory Manager';
    ui.sigs = {};
    ui.cache = {};
    ui.chartKey = '';
    buildTopbar();
    buildKpis();
    buildMain();
  }

  // ---------- update ----------

  function updateTopbar(state, app) {
    setText('day-label', t('time.day', { day: num(state.day), total: num(C.game.days) }));
    var ended = state.status !== 'running';
    setText('clock', ended ? '16:00'.replace(/\d/g, function (d) { return num(+d); }) : FM.i18n.clock(state.t));
    setWidth('day-bar', ended ? 1 : (state.t - (state.day - 1) * C.game.minutesPerDay) / C.game.minutesPerDay);

    var pauseHTML = icon(app.paused ? 'play' : 'pause');
    setHTML('pause-btn', pauseHTML);
    var pb = $('pause-btn');
    if (pb) {
      pb.classList.toggle('on', app.paused);
      pb.title = app.paused ? t('speed.play') : t('speed.pause');
    }
    document.querySelectorAll('.speed-b').forEach(function (b) {
      b.classList.toggle('on', !app.paused && Number(b.dataset.v) === app.speedIndex);
    });
  }

  function updateKpis(state) {
    var k = FM.Finance.kpis(state);
    var last = state.history[state.history.length - 1];

    setText('kpi-cash-v', money(state.cash));
    setText('kpi-cash-s', t('kpi.cashSub', { goal: money(C.game.goalCash) }));
    setTone('kpi-cash', state.cash < 0 ? 'bad' : state.cash >= C.game.goalCash ? 'good' : 'info');

    setText('kpi-profit-v', money(k.profit));
    setText('kpi-profit-s', t('kpi.profitSub', { v: last ? money(last.profit) : '—' }));
    setTone('kpi-profit', k.profit >= 0 ? 'good' : 'bad');

    var hasRun = state.t > 0;
    setText('kpi-oee-v', hasRun ? pct(k.oee) : '—');
    setText('kpi-oee-s', t('kpi.oeeSub', { m: k.bottleneck ? t('machine.' + k.bottleneck) : '—' }));
    setTone('kpi-oee', !hasRun ? 'info' : k.oee >= 0.65 ? 'good' : k.oee >= 0.45 ? 'warn' : 'bad');

    setText('kpi-quality-v', pct(k.quality, 1));
    setText('kpi-quality-s', t('kpi.qualitySub', { s: num(state.stats.scrapped), r: num(state.stats.returned) }));
    setTone('kpi-quality', k.quality >= 0.95 ? 'good' : k.quality >= 0.9 ? 'warn' : 'bad');

    setText('kpi-inventory-v', pct(k.fill));
    setText('kpi-inventory-s', t('kpi.inventorySub', { v: pct(k.avgFill) }));
    setTone('kpi-inventory', k.fill <= 0.35 ? 'good' : k.fill <= 0.6 ? 'warn' : 'bad');

    setText('kpi-satisfaction-v', pct(state.satisfaction / 100));
    setText('kpi-satisfaction-s', t('kpi.satisfactionSub', { v: pct(C.game.minSatisfaction / 100) }));
    setTone('kpi-satisfaction', state.satisfaction >= 60 ? 'good' : state.satisfaction >= 35 ? 'warn' : 'bad');
  }

  var STATUS_TONE = {
    running: 'good', idle: 'warn', starved: 'warn', blocked: 'warn', noOperator: 'warn',
    broken: 'bad', maintenance: 'info', setup: 'info'
  };

  function updateMachines(state) {
    C.line.forEach(function (id) {
      var m = state.machines[id];
      var card = $('m-' + id);
      if (!card) return;
      var statusKey = (id === 'assembly' && m.status === 'starved') ? 'status.starvedMat' : 'status.' + m.status;
      setText('m-' + id + '-status', t(statusKey));
      setTone('m-' + id + '-status', STATUS_TONE[m.status]);
      card.classList.toggle('is-running', m.status === 'running');
      card.classList.toggle('is-broken', m.status === 'broken');

      var prog = 0, label = '';
      if (m.down) {
        prog = 1 - m.down.left / m.down.total;
        label = t('status.' + (m.down.reason === 'breakdown' ? 'broken' : m.down.reason)) + ' · ' + remaining(m.down.left);
      } else if (m.job) {
        prog = 1 - m.job.left / m.job.total;
        label = t('machine.making', { p: t('product.' + m.job.product) });
      } else {
        label = '—';
      }
      setText('m-' + id + '-job', label);
      setText('m-' + id + '-pct', m.job || m.down ? pct(prog) : '');
      setWidth('m-' + id + '-prog', prog);
      var progEl = $('m-' + id + '-prog');
      if (progEl) setTone(progEl.parentNode, m.down ? (m.down.reason === 'breakdown' ? 'bad' : 'info') : 'good');

      setText('m-' + id + '-hv', pct(m.health / 100));
      setWidth('m-' + id + '-health', m.health / 100);
      setTone($('m-' + id + '-health').parentNode, m.health > 60 ? 'good' : m.health > 35 ? 'warn' : 'bad');

      card.querySelectorAll('[data-act="mode"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === m.mode); });

      var ops = '';
      for (var i = 0; i < C.machine.maxOperators; i++) ops += '<i class="op' + (i < m.operators ? ' on' : '') + '">' + icon('user') + '</i>';
      setHTML('m-' + id + '-ops', ops);

      var product = (m.job && m.job.product) || m.currentProduct || 'headphone';
      var info;
      if (m.operators === 0) info = t('status.noOperator');
      else if (id === 'assembly') info = t('machine.defect', { v: pct(FM.Production.defectChance(m), 1) });
      else if (id === 'test') info = t('machine.detect', { v: pct(FM.Production.detectionChance(state, m)) });
      else info = t('machine.perUnit', { v: num(FM.Production.unitTime(state, m, product), 1) });
      setText('m-' + id + '-info', info);
      var oee = FM.Finance.machineOee(state, m);
      setText('m-' + id + '-util', t('machine.util') + ' ' + pct(oee.utilization));

      setDisabled('m-' + id + '-maint', !!m.down || state.status !== 'running');
    });

    ['test', 'packaging'].forEach(function (b) {
      var n = state.buffers[b].length;
      setText('buf-' + b + '-n', num(n) + '/' + num(C.bufferCapacity));
      setWidth('buf-' + b + '-bar', n / C.bufferCapacity);
      setTone($('buf-' + b), n >= C.bufferCapacity ? 'bad' : n >= C.bufferCapacity * 0.7 ? 'warn' : 'good');
    });

    document.querySelectorAll('[data-act="qc"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === state.qcMode); });
  }

  // ---------- orders ----------

  function orderCard(state, o, active) {
    var work = o.qty * C.products[o.product].times.assembly / FM.Production.speedFactor(state.machines.assembly.operators ? state.machines.assembly : { mode: 'normal', operators: 1 });
    var head = '<div class="o-head"><span class="o-prod">' + productIcon(o.product) + t('product.' + o.product) + '</span>' +
      '<span class="o-qty">' + t('orders.units', { n: num(o.qty) }) + '</span></div>';
    var grid = '<div class="o-grid">' +
      '<div><small>' + t('orders.total') + '</small><b>' + money(o.qty * o.unitPrice) + '</b><small>' + t('orders.unitPrice', { p: money(o.unitPrice) }) + '</small></div>' +
      '<div><small>' + t('orders.due') + '</small><b>' + FM.i18n.when(o.dueAt) + '</b><small class="due" data-due="' + o.id + '"></small></div></div>';
    var foot;
    if (!active) {
      foot = '<div class="o-foot"><small class="muted">' + t('orders.work', { h: num(work / 60, 1) }) + ' · ' + t('orders.expires') + ': <span data-exp="' + o.id + '"></span></small>' +
        '<div class="btn-row"><button type="button" class="btn ghost sm" data-act="decline" data-id="' + o.id + '">' + t('orders.decline') + '</button>' +
        '<button type="button" class="btn primary sm" data-act="accept" data-id="' + o.id + '">' + t('orders.accept') + '</button></div></div>';
    } else {
      foot = '<div class="o-foot"><small class="stock" data-stock="' + o.id + '"></small>' +
        '<div class="btn-row"><button type="button" class="btn ghost sm" data-act="planOrder" data-id="' + o.id + '">' + icon('list') + t('orders.plan') + '</button>' +
        '<button type="button" class="btn primary sm" data-act="deliver" data-id="' + o.id + '" data-deliver="' + o.id + '">' + icon('truck') + t('orders.deliver') + '</button></div></div>';
    }
    return '<article class="order' + (o.late ? ' late' : '') + '" data-oid="' + o.id + '">' +
      (o.late ? '<span class="late-tag">' + icon('alert') + t('orders.late') + '</span>' : '') + head + grid + foot + '</article>';
  }

  function updateOrders(state) {
    setText('tab-offers-n', num(state.offers.length));
    setText('tab-active-n', num(state.orders.length));
    $('tab-offers').classList.toggle('on', ui.ordersTab === 'offers');
    $('tab-active').classList.toggle('on', ui.ordersTab === 'active');
    var lateCount = state.orders.filter(function (o) { return o.late; }).length;
    $('tab-active').classList.toggle('alert', lateCount > 0);

    var list = ui.ordersTab === 'offers' ? state.offers : state.orders.slice().sort(function (a, b) { return a.dueAt - b.dueAt; });
    var sig = ui.ordersTab + ':' + list.map(function (o) { return o.id + (o.late ? 'L' : ''); }).join(',') + ':' + state.machines.assembly.operators + state.machines.assembly.mode;
    if (ui.sigs.orders !== sig) {
      ui.sigs.orders = sig;
      $('orders-list').innerHTML = list.length
        ? list.map(function (o) { return orderCard(state, o, ui.ordersTab === 'active'); }).join('')
        : '<p class="empty">' + t(ui.ordersTab === 'offers' ? 'orders.emptyOffers' : 'orders.emptyActive') + '</p>';
    }

    list.forEach(function (o) {
      var due = document.querySelector('[data-due="' + o.id + '"]');
      if (due) { setText(due, remaining(o.dueAt - state.t)); due.classList.toggle('neg', o.dueAt < state.t); }
      var exp = document.querySelector('[data-exp="' + o.id + '"]');
      if (exp) setText(exp, remaining(o.expiresAt - state.t));
      var stockEl = document.querySelector('[data-stock="' + o.id + '"]');
      if (stockEl) {
        var have = FM.Market.stockOf(state, o.product);
        setText(stockEl, t('orders.stock', { have: num(Math.min(have, o.qty)), need: num(o.qty) }));
        stockEl.classList.toggle('ready', have >= o.qty);
        var btn = document.querySelector('[data-deliver="' + o.id + '"]');
        setDisabled(btn, have < o.qty || state.status !== 'running');
      }
    });
  }

  // ---------- plan ----------

  function updatePlan(state) {
    document.querySelectorAll('[data-act="planProduct"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === ui.planProduct); });
    var bom = C.products[ui.planProduct].bom;
    setText('plan-bom', t('plan.bom', { p: t('product.' + ui.planProduct), c: num(bom.components), k: num(bom.casing) }));

    var sig = state.queue.map(function (b) { return b.id + ':' + b.qty; }).join(',');
    if (ui.sigs.queue !== sig) {
      ui.sigs.queue = sig;
      $('queue-list').innerHTML = state.queue.length ? state.queue.map(function (b, i) {
        return '<li class="q-item' + (i === 0 ? ' first' : '') + '"><div class="q-main">' + productIcon(b.product) +
          '<div><b>' + t('product.' + b.product) + ' × ' + num(b.qty) + '</b><small data-qprog="' + b.id + '"></small></div></div>' +
          '<div class="bar thin"><i data-qbar="' + b.id + '"></i></div>' +
          '<div class="q-act"><button type="button" class="icon-btn sm" data-act="qUp" data-id="' + b.id + '" title="' + t('plan.up') + '"' + (i === 0 ? ' disabled' : '') + '>' + icon('up') + '</button>' +
          '<button type="button" class="icon-btn sm" data-act="qRemove" data-id="' + b.id + '" title="' + t('plan.remove') + '">' + icon('x') + '</button></div></li>';
      }).join('') : '<li class="empty">' + t('plan.empty') + '</li>';
    }
    state.queue.forEach(function (b) {
      var el = document.querySelector('[data-qprog="' + b.id + '"]');
      if (el) setText(el, t('plan.progress', { done: num(b.started), qty: num(b.qty) }));
      var bar = document.querySelector('[data-qbar="' + b.id + '"]');
      if (bar) bar.style.width = (b.started / b.qty * 100).toFixed(1) + '%';
    });
  }

  // ---------- warehouse ----------

  function updateWarehouse(state) {
    var W = C.warehouse;
    var raw = FM.State.rawTotal(state, true);
    setText('raw-cap', t('wh.capacity', { used: num(raw), cap: num(W.rawCapacity) }));
    setWidth('raw-cap-bar', raw / W.rawCapacity);
    setTone($('raw-cap-bar').parentNode, raw / W.rawCapacity > 0.85 ? 'bad' : raw / W.rawCapacity > 0.6 ? 'warn' : 'good');

    MATERIALS.forEach(function (m) {
      setText('mat-' + m + '-v', num(state.materials[m]));
      var base = C.materials[m].basePrice;
      var diff = state.prices[m] / base - 1;
      var el = $('mat-' + m + '-p');
      setText(el, money(state.prices[m]) + ' (' + (Math.abs(diff) < 0.005 ? '±' : diff > 0 ? '+' : '−') + pct(Math.abs(diff)) + ')');
      setTone(el, diff > 0.05 ? 'bad' : diff < -0.05 ? 'good' : 'info');
      $('mat-' + m).classList.toggle('on', ui.buyMat === m);
      $('mat-' + m).classList.toggle('low', state.materials[m] < 20);
    });

    var qty = parseInt($('buy-qty').value, 10);
    var valid = qty > 0;
    setText('buy-std-c', valid ? money(FM.Market.purchaseCost(state, ui.buyMat, qty, false)) : '—');
    setText('buy-exp-c', valid ? money(FM.Market.purchaseCost(state, ui.buyMat, qty, true)) : '—');

    var sig = state.incoming.map(function (d) { return d.id; }).join(',');
    if (ui.sigs.incoming !== sig) {
      ui.sigs.incoming = sig;
      $('incoming-list').innerHTML = state.incoming.length ? state.incoming.map(function (d) {
        return '<li><span>' + (d.express ? icon('bolt') : icon('truck')) + num(d.qty) + ' ' + t('mat.' + d.material) + '</span>' +
          '<small data-arr="' + d.id + '"></small></li>';
      }).join('') : '<li class="empty">' + t('wh.noIncoming') + '</li>';
    }
    state.incoming.forEach(function (d) {
      var el = document.querySelector('[data-arr="' + d.id + '"]');
      if (el) setText(el, remaining(d.arriveAt - state.t));
    });

    var fin = FM.State.finishedTotal(state);
    setText('fin-cap', t('wh.capacity', { used: num(fin), cap: num(W.finishedCapacity) }));
    setWidth('fin-cap-bar', fin / W.finishedCapacity);
    setTone($('fin-cap-bar').parentNode, fin / W.finishedCapacity > 0.85 ? 'bad' : fin / W.finishedCapacity > 0.6 ? 'warn' : 'good');
    PRODUCTS.forEach(function (p) {
      var n = FM.Market.stockOf(state, p);
      setText('fg-' + p + '-v', num(n));
      setDisabled('sell-' + p + '-b', n === 0 || state.status !== 'running');
    });
    var holding = FM.State.rawTotal(state, false) * W.rawHoldingCost + fin * W.finishedHoldingCost;
    setText('holding', t('wh.holding', { v: money(holding) }));
  }

  // ---------- workforce ----------

  function updateWorkforce(state) {
    var free = FM.State.unassignedWorkers(state);
    setText('wf-total', '\u2066' + num(state.workers) + ' / ' + num(C.workforce.maxWorkers) + '\u2069');
    setText('wf-free', num(free));
    setTone($('wf-free').parentNode, free > 0 ? 'warn' : 'info');
    setText('wf-wage', money(state.workers * C.workforce.wagePerDay));
    var team = '';
    for (var i = 0; i < state.workers; i++) team += '<i class="op' + (i < state.workers - free ? ' on' : ' free') + '">' + icon('user') + '</i>';
    setHTML('wf-team', team);
    setDisabled('wf-hire', state.workers >= C.workforce.maxWorkers || state.status !== 'running');
    setDisabled('wf-fire', free < 1 || state.status !== 'running');
  }

  // ---------- finance ----------

  function updateFinance(state) {
    var perDay = C.game.minutesPerDay / 30;
    var key = state.cashSeries.length + ':' + FM.i18n.getLang() + ':' + ($('cash-chart') ? $('cash-chart').clientWidth : 0);
    if (ui.chartKey !== key) {
      ui.chartKey = key;
      var values = [];
      state.cashSeries.forEach(function (p) { values[Math.round(p.t / 30)] = p.cash; });
      for (var i = 0; i < values.length; i++) if (values[i] === undefined) values[i] = values[i - 1];
      var labels = [];
      var step = C.game.days > 15 ? 5 : 1;
      for (var d = 0; d <= C.game.days; d += step) labels.push({ index: d * perDay, text: num(d) });
      FM.Charts.lineChart($('cash-chart'), {
        values: values,
        maxPoints: C.game.days * perDay + 1,
        color: getComputedStyle(document.documentElement).getPropertyValue('--info').trim() || '#38bdf8',
        goal: C.game.goalCash,
        labels: labels,
        format: function (v) { var k = Math.round(v / 1000); return (k < 0 ? '−' : '') + '$' + num(Math.abs(k)) + 'k'; }
      });
    }

    var sig = state.history.length + FM.i18n.getLang();
    if (ui.sigs.pnl !== sig) {
      ui.sigs.pnl = sig;
      var last = state.history[state.history.length - 1];
      if (!last) { $('pnl').innerHTML = '<p class="empty">' + t('fin.noData') + '</p>'; return; }
      var b = last.breakdown;
      var rows = ['materials', 'wages', 'overhead', 'energy', 'maintenance', 'holding', 'hiring', 'penalties', 'refunds']
        .filter(function (k) { return b[k] > 0; })
        .map(function (k) { return '<li><span>' + t('fin.' + k) + '</span><span class="neg">' + money(-b[k]) + '</span></li>'; }).join('');
      $('pnl').innerHTML = '<ul class="pnl"><li class="rev"><span>' + t('fin.revenue') + ' · ' + t('time.dayShort', { day: num(last.day) }) + '</span><span class="pos">' + money(last.revenue) + '</span></li>' + rows +
        '<li class="net"><span>' + t('fin.net') + '</span><span class="' + (last.profit >= 0 ? 'pos' : 'neg') + '">' + money(last.profit) + '</span></li></ul>';
    }
  }

  // ---------- log & toasts ----------

  var LOG_ICON = { info: 'info', good: 'check', warn: 'alert', bad: 'alert' };

  function updateLog(state) {
    var top = state.log.length ? state.log[0].id : 0;
    var sig = top + FM.i18n.getLang();
    if (ui.sigs.log !== sig) {
      ui.sigs.log = sig;
      $('log-list').innerHTML = state.log.slice(0, 40).map(function (e) {
        return '<li class="tone-' + e.type + '">' + icon(LOG_ICON[e.type]) + '<span>' + esc(FM.i18n.logText(e)) + '</span><time>' + FM.i18n.clock(e.t) + '</time></li>';
      }).join('');
    }
    // popups for important new events
    var fresh = state.log.filter(function (e) { return e.id > ui.lastToastId && e.toast; }).slice(0, 3).reverse();
    if (state.log.length) ui.lastToastId = Math.max(ui.lastToastId, state.log[0].id);
    fresh.forEach(function (e) { toast(FM.i18n.logText(e), e.type); });
  }

  function toast(text, type) {
    var root = $('toasts');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast tone-' + (type || 'info');
    el.innerHTML = icon(LOG_ICON[type] || 'info') + '<span>' + esc(text) + '</span>';
    root.appendChild(el);
    while (root.children.length > 4) root.removeChild(root.firstChild);
    setTimeout(function () { el.classList.add('out'); }, 3600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4000);
  }

  function update(state, app) {
    updateTopbar(state, app);
    updateKpis(state);
    updateMachines(state);
    updateOrders(state);
    updatePlan(state);
    updateWarehouse(state);
    updateWorkforce(state);
    updateFinance(state);
    updateLog(state);
  }

  // ---------- modals ----------

  function modal(html, cls) {
    $('modal-root').innerHTML = '<div class="overlay"><div class="modal ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
  }

  function closeModal() { $('modal-root').innerHTML = ''; }
  function modalOpen() { return !!$('modal-root').firstChild; }

  function showStart() {
    var G = C.game;
    modal('<div class="modal-hero">' + icon('factory') + '</div><h2>' + t('app.title') + '</h2><p class="lead">' +
      t('start.lead', { days: num(G.days), start: money(G.startCash), goal: money(G.goalCash) }) + '</p>' +
      '<ul class="rules">' +
        '<li>' + icon('clipboard') + t('start.rule1') + '</li>' +
        '<li>' + icon('list') + t('start.rule2') + '</li>' +
        '<li>' + icon('flame') + t('start.rule3') + '</li>' +
        '<li>' + icon('alert') + t('start.rule4', { min: pct(G.minSatisfaction / 100) }) + '</li></ul>' +
      '<p class="hint subtle">' + t('start.keys') + '</p>' +
      '<div class="btn-row end"><button class="lang-btn" data-act="lang">' + icon('globe') + '<span>' + t('lang.switch') + '</span></button>' +
      '<button class="btn ghost" data-act="help">' + icon('help') + t('btn.help') + '</button>' +
      '<button class="btn primary lg" data-act="start">' + icon('play') + t('btn.start') + '</button></div>', 'start');
  }

  function showHelp() {
    var items = ['oee', 'bottleneck', 'pm', 'setup', 'qc', 'inv', 'score'];
    modal('<h2>' + icon('help') + t('help.title') + '</h2><p class="lead">' + t('help.flow') + '</p><dl class="concepts">' +
      items.map(function (k) { return '<div><dt>' + t('help.' + k + '.t') + '</dt><dd>' + t('help.' + k + '.d') + '</dd></div>'; }).join('') +
      '</dl><div class="btn-row end"><button class="btn primary" data-act="close">' + t('btn.resume') + '</button></div>', 'help');
  }

  function showEnd(state) {
    var sc = FM.Finance.score(state);
    var won = state.status === 'won';
    var bars = Object.keys(C.score.weights).map(function (k) {
      return '<li><span>' + t('end.parts.' + k) + ' <small>' + pct(C.score.weights[k]) + '</small></span>' +
        '<div class="bar"><i style="width:' + sc.parts[k].toFixed(1) + '%"></i></div><b>' + num(Math.round(sc.parts[k])) + '</b></li>';
    }).join('');
    var st = state.stats;
    modal('<div class="modal-hero ' + (won ? 'won' : 'lost') + '">' + icon(won ? 'trophy' : 'alert') + '</div>' +
      '<h2>' + t(won ? 'end.won' : 'end.lost') + '</h2>' +
      '<p class="lead">' + t('end.' + state.endReason, { goal: money(C.game.goalCash) }) + '</p>' +
      '<div class="score-box"><div><small>' + t('end.score') + '</small><b>' + num(sc.total) + '</b></div>' +
      '<div class="grade grade-' + sc.grade + '"><small>' + t('end.grade') + '</small><b>' + sc.grade + '</b></div>' +
      '<div><small>' + t('kpi.cash') + '</small><b>' + money(state.cash) + '</b></div></div>' +
      '<ul class="score-bars">' + bars + '</ul>' +
      '<p class="hint subtle">' + t('end.stats', { on: num(st.ordersOnTime), late: num(st.ordersLate), cancel: num(st.ordersCancelled), bd: num(st.breakdowns) }) + '</p>' +
      '<div class="btn-row end"><button class="btn primary lg" data-act="restart">' + icon('play') + t('btn.restart') + '</button></div>', 'end');
  }

  FM.UI = {
    state: ui,
    build: build,
    update: update,
    toast: toast,
    showStart: showStart,
    showHelp: showHelp,
    showEnd: showEnd,
    closeModal: closeModal,
    modalOpen: modalOpen,
    inLine: inLine
  };
})(window.FM = window.FM || {});
