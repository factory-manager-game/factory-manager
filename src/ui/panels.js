/**
 * Bottom sheets (orders, production plan, buying, workers, report) and the machine popover.
 * Each render function reads the state and returns an HTML string; FM.Dom.patch applies it.
 * Buttons carry data-act and data-* arguments; app.js maps them to engine actions.
 */
(function (FM) {
  'use strict';

  var T = FM.Text;
  var t = T.t;
  var esc = FM.Dom.esc;
  var I = FM.Icons;
  var M = FM.Market;
  var WF = FM.Workforce;

  function C(state) { return FM.Config.of(state); }
  function has(state, f) { return !!C(state).features[f]; }

  function btn(act, label, opts) {
    opts = opts || {};
    var attrs = ' data-act="' + act + '"';
    Object.keys(opts.data || {}).forEach(function (k) { attrs += ' data-' + k + '="' + esc(opts.data[k]) + '"'; });
    if (opts.disabled) attrs += ' disabled';
    if (opts.title) attrs += ' title="' + esc(opts.title) + '" aria-label="' + esc(opts.title) + '"';
    return '<button type="button" class="btn ' + (opts.cls || '') + '"' + attrs + '>' + label + '</button>';
  }

  function stepper(act, key, value, min, max, step) {
    return '<div class="stepper">' +
      btn(act, I.icon('plus', 18), { cls: 'icon sm', data: { key: key, d: step }, disabled: value + step > max, title: 'بیشتر' }) +
      '<output>' + T.num(value) + '</output>' +
      btn(act, I.icon('minus', 18), { cls: 'icon sm', data: { key: key, d: -step }, disabled: value - step < min, title: 'کمتر' }) +
      '</div>';
  }

  function segmented(act, options, current, data) {
    return '<div class="seg" role="group">' + options.map(function (o) {
      var d = { v: o.value };
      Object.keys(data || {}).forEach(function (k) { d[k] = data[k]; });
      return btn(act, o.label, { cls: o.value === current ? 'on' : '', data: d });
    }).join('') + '</div>';
  }

  function meter(frac, tone) {
    var w = Math.max(0, Math.min(1, frac)) * 100;
    return '<div class="meter ' + (tone || '') + '"><i style="width:' + w.toFixed(1) + '%"></i></div>';
  }

  /** When something is due, in words. */
  function when(at) {
    if (at % FM.util.MINUTES_PER_DAY === 0) return t('time.endOfDay', { d: T.num(at / FM.util.MINUTES_PER_DAY) });
    return t('time.at', { d: T.num(FM.util.splitTime(at).day), clock: T.clock(at) });
  }

  function badges(o) {
    var s = '';
    if (o.tag) s += '<span class="tag big">' + t('tag.' + o.tag) + '</span>';
    if (o.customer) s += '<span class="tag">' + t('customer.' + o.customer) + '</span>';
    else if (o.scripted) s += '<span class="tag">' + t('orders.scripted') + '</span>';
    return s;
  }

  // ---------- pipeline: what is already on its way for each product ----------

  /** Units of a product already started or planned: queue + buffers + jobs in machines. */
  function pipeline(state, product) {
    var n = 0;
    state.queue.forEach(function (b) { if (b.product === product) n += b.qty - b.started; });
    ['test', 'packaging'].forEach(function (k) { state.buffers[k].forEach(function (u) { if (u.product === product) n++; }); });
    Object.keys(state.machines).forEach(function (id) { var j = state.machines[id].job; if (j && j.product === product) n++; });
    return n;
  }

  /** Splits stock and pipeline over active orders by due date; returns { orderId: shortfall }. */
  function coverage(state) {
    var out = {};
    ['headphone', 'speaker'].forEach(function (p) {
      var stock = M.stockOf(state, p);
      var flow = pipeline(state, p);
      state.orders.filter(function (o) { return o.product === p; })
        .sort(function (a, b) { return a.dueAt - b.dueAt || a.id - b.id; })
        .forEach(function (o) {
          var fromStock = Math.min(stock, o.qty); stock -= fromStock;
          var fromFlow = Math.min(flow, o.qty - fromStock); flow -= fromFlow;
          out[o.id] = { stock: fromStock, flow: fromFlow, short: o.qty - fromStock - fromFlow };
        });
    });
    return out;
  }

  // ---------- orders ----------

  function orders(state) {
    var cfg = C(state);
    var s = '<section class="sec"><h3>' + t('orders.offers') + (state.offers.length ? ' <span class="count">' + T.num(state.offers.length) + '</span>' : '') + '</h3>';
    if (!state.offers.length) s += '<p class="empty">' + t('orders.noOffers') + '</p>';
    state.offers.slice().sort(function (a, b) { return a.expiresAt - b.expiresAt; }).forEach(function (o) {
      s += '<article class="card" data-key="offer-' + o.id + '">' +
        '<div class="card-main">' + I.productChip(o.product, 34) +
        '<div><b>' + t('orders.units', { n: T.num(o.qty), product: t('product.' + o.product) }) + '</b> ' + badges(o) +
        '<div class="sub">' + t('orders.each', { p: T.money(o.unitPrice) }) + '، ' + t('orders.total') + ' ' + T.money(o.qty * o.unitPrice) + '</div>' +
        '<div class="sub">' + t('orders.due') + ': ' + when(o.dueAt) + ' (' + t('orders.left', { v: T.duration(o.dueAt - state.t) }) + ')</div>' +
        (o.scripted ? '' : '<div class="sub muted">' + t('orders.expires', { v: T.duration(o.expiresAt - state.t) }) + '</div>') +
        '</div></div>' +
        '<div class="card-actions">' + btn('accept', t('orders.accept'), { cls: 'primary', data: { id: o.id } }) +
        btn('decline', t('orders.decline'), { cls: 'ghost', data: { id: o.id } }) + '</div></article>';
    });
    s += '</section>';

    var cov = coverage(state);
    var list = state.orders.slice().sort(function (a, b) { return a.dueAt - b.dueAt; });
    s += '<section class="sec"><h3>' + t('orders.active') + (list.length ? ' <span class="count">' + T.num(list.length) + '</span>' : '') + '</h3>';
    if (!list.length) s += '<p class="empty">' + t('orders.noActive') + '</p>';
    list.forEach(function (o) {
      var have = M.stockOf(state, o.product);
      var c = cov[o.id];
      var ready = have >= o.qty;
      var late = state.t > o.dueAt;
      s += '<article class="card' + (late ? ' late' : '') + '" data-key="order-' + o.id + '">' +
        '<div class="card-main">' + I.productChip(o.product, 34) +
        '<div class="grow"><b>' + t('orders.units', { n: T.num(o.qty), product: t('product.' + o.product) }) + '</b> ' + badges(o) +
        (late ? ' <span class="tag bad">' + t('orders.late') + '</span>' : '') +
        '<div class="sub">' + t('orders.due') + ': ' + when(o.dueAt) + '، ' +
        (late ? '<span class="bad-text">' + t('orders.overdue', { v: T.duration(state.t - o.dueAt) }) + '</span>' : t('orders.left', { v: T.duration(o.dueAt - state.t) })) + '</div>' +
        '<div class="sub">' + t('orders.stock', { have: T.num(Math.min(have, o.qty)), need: T.num(o.qty) }) +
        (c.flow ? '، ' + t('orders.inFlow', { n: T.num(c.flow) }) : '') + '</div>' +
        meter(Math.min(have, o.qty) / o.qty, ready ? 'good' : late ? 'bad' : '') +
        '</div></div>' +
        '<div class="card-actions">' + btn('deliver', I.icon('truck', 18) + t('orders.deliver'), { cls: 'primary', data: { id: o.id }, disabled: !ready }) +
        (c.short > 0 ? btn('planFor', t('orders.plan') + ' (' + T.num(c.short) + ')', { cls: 'ghost', data: { product: o.product, qty: c.short } }) : '') +
        '</div></article>';
    });
    s += '</section>';

    if (has(state, 'wholesale')) {
      s += '<section class="sec"><h3>' + t('buy.wholesale') + '</h3><p class="hint">' + t('orders.wholesaleHint') + '</p>';
      cfg.features.products.forEach(function (p) {
        var stock = M.stockOf(state, p);
        // Only units no accepted order is waiting for.
        var reserved = 0;
        state.orders.forEach(function (o) { if (o.product === p) reserved += o.qty; });
        var spare = Math.max(0, stock - reserved);
        var n = Math.min(spare, 10);
        s += '<div class="row" data-key="ws-' + p + '">' + I.productChip(p, 28) + '<span class="grow">' + t('product.' + p) + '، ' +
          t('orders.spare', { n: T.num(spare) }) + '، ' + t('orders.each', { p: T.money(cfg.products[p].wholesalePrice) }) + '</span>' +
          btn('sell', t('buy.sell', { n: T.num(n) }), { cls: 'ghost', data: { product: p, qty: n }, disabled: n < 1 }) + '</div>';
      });
      s += '</section>';
    }
    return s;
  }

  // ---------- production plan ----------

  function plan(state, ui) {
    var cfg = C(state);
    var products = cfg.features.products;
    if (products.indexOf(ui.planProduct) < 0) ui.planProduct = products[0];
    var bom = cfg.products[ui.planProduct].bom;
    var canMake = Math.min(Math.floor(state.materials.components / bom.components), Math.floor(state.materials.casing / bom.casing));

    var s = '<section class="sec"><h3>' + t('plan.add') + '</h3>';
    if (products.length > 1) {
      s += segmented('planProduct', products.map(function (p) { return { value: p, label: I.productChip(p, 22) + t('product.' + p) }; }), ui.planProduct);
    }
    s += '<div class="row">' + stepper('planQty', 'plan', ui.planQty, 5, 200, 5) +
      btn('addBatch', I.icon('plus', 18) + t('plan.add'), { cls: 'primary' }) + '</div>' +
      '<p class="hint">' + t('plan.bom', { product: t('product.' + ui.planProduct), c: T.num(bom.components), k: T.num(bom.casing) }) +
      '، ' + t('plan.canMake', { n: T.num(canMake) }) + '</p></section>';

    s += '<section class="sec"><h3>' + t('plan.title') + (state.queue.length ? ' <span class="count">' + T.num(state.queue.length) + '</span>' : '') + '</h3>';
    if (!state.queue.length) s += '<p class="empty">' + t('plan.empty') + '</p>';
    state.queue.forEach(function (b, i) {
      s += '<article class="card compact" data-key="batch-' + b.id + '"><div class="card-main">' + I.productChip(b.product, 30) +
        '<div class="grow"><b>' + t('orders.units', { n: T.num(b.qty), product: t('product.' + b.product) }) + '</b>' +
        '<div class="sub">' + t('plan.progress', { done: T.num(b.started), qty: T.num(b.qty) }) + '</div>' + meter(b.started / b.qty) + '</div>' +
        btn('batchUp', I.icon('up', 18), { cls: 'icon', data: { id: b.id }, disabled: i === 0 || state.queue[i - 1].started > 0, title: t('plan.up') }) +
        btn('batchRemove', I.icon('trash', 18), { cls: 'icon', data: { id: b.id }, title: t('plan.remove') }) + '</div></article>';
    });
    if (products.length > 1) s += '<p class="hint">' + t('plan.setupHint', { m: T.num(cfg.setupMinutes) }) + '</p>';
    return s + '</section>';
  }

  // ---------- buying ----------

  function buy(state, ui) {
    var cfg = C(state);
    var shortage = M.inShortage(state);
    var space = cfg.warehouse.rawCapacity - FM.State.rawTotal(state, true);
    var s = shortage ? '<div class="banner bad">' + I.icon('alert', 18) + t('buy.shortage') + '</div>' : '';
    s += '<p class="hint">' + t('buy.space', { n: T.num(space) }) + '</p>';
    Object.keys(cfg.materials).forEach(function (mat) {
      var qty = ui.buyQty[mat];
      var price = state.prices[mat];
      var hist = state.priceHistory;
      var prev = hist.length > 1 ? hist[hist.length - 2][mat] : null;
      var trend = prev === null || Math.abs(price - prev) < 0.005 ? '' : price > prev ? '<span class="bad-text">▲</span>' : '<span class="good-text">▼</span>';
      var std = M.purchaseCost(state, mat, qty, false);
      var exp = M.purchaseCost(state, mat, qty, true);
      var tooMuch = qty > space;
      s += '<article class="card" data-key="mat-' + mat + '"><div class="card-main"><div class="mat-ic ' + mat + '"></div>' +
        '<div class="grow"><b>' + t('mat.' + mat) + '</b>' +
        '<div class="sub">' + t('buy.stock') + ': ' + T.num(state.materials[mat]) + '، ' + t('buy.price') + ': ' + T.money(price) + ' ' + trend + '</div></div>' +
        stepper('buyQty', mat, qty, 10, cfg.warehouse.rawCapacity, 10) + '</div>' +
        '<div class="card-actions">' +
        btn('buy', t('buy.standard') + '، ' + T.money(std), { cls: 'primary', data: { mat: mat, express: 0 }, disabled: shortage || tooMuch || std > state.cash }) +
        (has(state, 'express') ? btn('buy', I.icon('bolt', 16) + t('buy.express') + '، ' + T.money(exp), { cls: 'ghost', data: { mat: mat, express: 1 }, disabled: tooMuch || exp > state.cash }) : '') +
        '</div></article>';
    });
    s += '<section class="sec"><h3>' + t('buy.incoming') + '</h3>';
    if (!state.incoming.length) s += '<p class="empty">' + t('buy.nothingIncoming') + '</p>';
    state.incoming.slice().sort(function (a, b) { return a.arriveAt - b.arriveAt; }).forEach(function (d) {
      s += '<div class="row" data-key="in-' + d.id + '">' + I.icon('truck', 20) + '<span class="grow">' + T.num(d.qty) + ' ' + t('mat.' + d.material) +
        (d.express ? '، <span class="tag">' + t('buy.expressTag') + '</span>' : '') + (d.delayed ? '، <span class="tag bad">' + t('buy.delayed') + '</span>' : '') +
        '</span><span class="muted">' + t('buy.arrives', { v: T.duration(d.arriveAt - state.t) }) + '</span></div>';
    });
    return s + '</section>';
  }

  // ---------- workers ----------

  function workers(state) {
    var cfg = C(state);
    var F = cfg.workforce.fatigue;
    var stations = [{ value: 'rest', label: t('workers.rest') }].concat(cfg.line.map(function (id) { return { value: id, label: t('machine.' + id) }; }));
    var s = '<div class="kpis">' +
      kpi(t('hud.morale'), T.num(state.morale) + '٪', state.morale < cfg.morale.lowAt ? 'bad' : '') +
      kpi(t('workers.count'), T.num(state.workers.length)) +
      kpi(t('workers.wagesShort'), T.money(state.workers.length * cfg.workforce.wagePerDay)) + '</div>';
    s += '<p class="hint">' + t('workers.moveHint') + '</p>';
    state.workers.forEach(function (w) {
      var present = WF.isPresent(state, w);
      var fat = Math.round(w.fatigue);
      var tone = fat >= F.warnAt ? 'bad' : fat >= F.slowFrom ? 'warn' : 'good';
      s += '<article class="card" data-key="w-' + w.id + '"><div class="card-main"><div class="avatar">' + esc(w.name.charAt(0)) + '</div>' +
        '<div class="grow"><b>' + esc(w.name) + '</b>' +
        (present ? '' : ' <span class="tag bad">' + t('workers.absent', { v: T.clock(w.absentUntil) }) + '</span>') +
        '<div class="sub">' + t('workers.fatigue', { v: T.num(fat) + '٪' }) + '</div>' + meter(fat / 100, tone) + '</div>' +
        (has(state, 'hiring') ? btn('fire', t('workers.fire'), { cls: 'ghost danger', data: { id: w.id }, disabled: state.workers.length <= 1 }) : '') +
        '</div>' + segmented('assign', stations, w.station || 'rest', { id: w.id }) + '</article>';
    });
    if (has(state, 'hiring')) {
      s += '<div class="row">' + btn('hire', I.icon('plus', 18) + t('workers.hire', { cost: T.money(cfg.workforce.hireCost) }), {
        cls: 'primary', disabled: state.workers.length >= cfg.workforce.maxWorkers || cfg.workforce.hireCost > state.cash
      }) + '<span class="muted">' + t('workers.hireHint', { wage: T.money(cfg.workforce.wagePerDay) }) + '</span></div>';
    }
    return s;
  }

  function kpi(label, value, tone) {
    return '<div class="kpi ' + (tone || '') + '"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  // ---------- report ----------

  function report(state) {
    var k = FM.Finance.kpis(state);
    var s = '<div class="kpis">' +
      kpi(t('report.revenue'), T.money(k.revenue)) +
      kpi(t('report.costs'), T.money(k.costs)) +
      kpi(t('report.profit'), T.money(k.profit), k.profit < 0 ? 'bad' : 'good') +
      kpi(t('report.quality'), T.pct(k.quality, 1), k.quality < 0.9 ? 'bad' : '') +
      kpi(t('report.oee', { m: k.bottleneck ? t('machine.' + k.bottleneck) : '—' }), T.pct(k.oee)) +
      kpi(t('report.fill'), T.pct(k.fill)) + '</div>';

    s += '<section class="sec"><h3>' + t('report.costsTitle') + '</h3><div class="bars">';
    var keys = ['materials', 'wages', 'overhead', 'energy', 'maintenance', 'holding', 'hiring', 'penalties', 'refunds'];
    var max = Math.max.apply(null, keys.map(function (c) { return state.totals[c]; }).concat([1]));
    keys.forEach(function (c) {
      var v = state.totals[c];
      if (!v) return;
      s += '<div class="bar-row"><span>' + t('report.cost.' + c) + '</span>' + meter(v / max, c === 'penalties' || c === 'refunds' ? 'bad' : '') + '<b>' + T.money(v) + '</b></div>';
    });
    s += '</div></section>';

    if (state.history.length) {
      s += '<section class="sec"><h3>' + t('report.days') + '</h3><table class="tbl"><thead><tr><th>' + t('report.day') + '</th><th>' +
        t('report.revenue') + '</th><th>' + t('report.costs') + '</th><th>' + t('report.profit') + '</th><th>' + t('hud.cash') + '</th></tr></thead><tbody>';
      state.history.forEach(function (d) {
        s += '<tr><td>' + T.num(d.day) + '</td><td>' + T.money(d.revenue) + '</td><td>' + T.money(d.costs) + '</td><td class="' +
          (d.profit < 0 ? 'bad-text' : 'good-text') + '">' + T.money(d.profit) + '</td><td>' + T.money(d.cash) + '</td></tr>';
      });
      s += '</tbody></table></section>';
    }

    s += '<section class="sec"><h3>' + t('report.log') + '</h3><ul class="log">';
    state.log.slice(0, 30).forEach(function (e) {
      s += '<li class="' + e.type + '" data-key="log-' + e.id + '"><time>' + T.clock(e.t) + '</time><span>' + T.logText(e) + '</span></li>';
    });
    return s + '</ul></section>';
  }

  // ---------- machine popover ----------

  function machine(state, id) {
    var cfg = C(state);
    var m = state.machines[id];
    var P = FM.Production;
    var look = FM.Scene.machineLook(state, m, cfg);
    var product = (m.job && m.job.product) || m.currentProduct || cfg.features.products[0];
    var ops = WF.assignedTo(state, id);
    var o = FM.Finance.machineOee(state, m);
    var unit = P.unitTime(state, m, product);
    var stateText = m.status === 'running' ? t('status.running') : look.text;
    if (m.down) stateText += '، ' + t('orders.left', { v: T.duration(m.down.left) });

    var s = '<header class="pop-head"><b>' + t('machine.' + id) + '</b><span class="dot ' + look.lamp + '"></span><span class="muted">' + stateText + '</span>' +
      btn('closePop', I.icon('close', 18), { cls: 'icon', title: t('panel.close') }) + '</header>';
    s += '<div class="pop-row"><span>' + t('machine.health') + '</span>' + meter(m.health / 100, m.health < cfg.machine.warnHealth ? 'bad' : m.health < 70 ? 'warn' : 'good') +
      '<b>' + T.num(Math.round(m.health)) + '٪</b></div>';
    s += '<div class="pop-row"><span>' + t('machine.operators') + '</span><span class="grow names">' +
      (ops.length ? ops.map(function (w) { return esc(w.name) + (WF.isPresent(state, w) ? '' : ' (' + t('workers.absentShort') + ')'); }).join('، ') : '—') + '</span>' +
      '<div class="stepper">' +
      btn('ops', I.icon('plus', 16), { cls: 'icon sm', data: { m: id, d: 1 }, disabled: ops.length >= cfg.machine.maxOperators, title: t('machine.addOperator') }) +
      '<output>' + T.num(ops.length) + '</output>' +
      btn('ops', I.icon('minus', 16), { cls: 'icon sm', data: { m: id, d: -1 }, disabled: ops.length === 0, title: t('machine.removeOperator') }) + '</div></div>';
    if (cfg.features.modes.length > 1) {
      s += '<div class="pop-row col"><span>' + t('machine.speed') + '</span>' +
        segmented('mode', cfg.features.modes.map(function (md) { return { value: md, label: t('mode.' + md) }; }), m.mode, { m: id }) + '</div>';
    }
    if (id === 'test' && cfg.features.qcModes.length > 1) {
      s += '<div class="pop-row col"><span>' + t('machine.qc') + '</span>' +
        segmented('qc', cfg.features.qcModes.map(function (q) { return { value: q, label: t('qc.' + q) }; }), state.qcMode) + '</div>';
    }
    s += '<ul class="facts">' +
      '<li>' + t('machine.perUnit', { product: t('product.' + product), v: isFinite(unit) ? T.num(unit, 1) : '—' }) + '</li>' +
      (id === 'test' ? '<li>' + t('machine.detect', { v: T.pct(P.detectionChance(state, m)) }) + '</li>'
        : '<li>' + t('machine.defect', { v: T.pct(P.defectChance(state, m), 1) }) + '</li>') +
      '<li>' + t('machine.utilization', { v: T.pct(o.utilization) }) + '</li>' +
      (id !== 'assembly' ? '<li>' + t('machine.queue', { n: T.num(state.buffers[id].length) }) + '</li>' : '') + '</ul>';
    if (cfg.features.maintenance) {
      s += btn('maintain', I.icon('wrench', 18) + t('machine.maintain', { cost: T.money(cfg.machine.maintenanceCost) }), {
        cls: 'ghost wide', data: { m: id }, disabled: !!m.down || cfg.machine.maintenanceCost > state.cash
      });
    }
    return s;
  }

  FM.Panels = { orders: orders, plan: plan, buy: buy, workers: workers, report: report, machine: machine, coverage: coverage, pipeline: pipeline };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
