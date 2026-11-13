/**
 * Reference players. Used by the event director's fairness look-ahead and by the
 * balance tests. They act every 30 minutes, only through FM.Engine.dispatch,
 * and see nothing a player could not see (no hidden defect counts).
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var W = FM.Workforce;

  function C(state) { return FM.Config.of(state); }
  function D(state) { return FM.Engine.dispatch.apply(null, arguments); }

  function inLine(state, product) {
    var n = 0;
    ['test', 'packaging'].forEach(function (b) { state.buffers[b].forEach(function (u) { if (u.product === product) n++; }); });
    C(state).line.forEach(function (id) { var j = state.machines[id].job; if (j && j.product === product) n++; });
    state.queue.forEach(function (b) { if (b.product === product) n += b.qty - b.started; });
    return n;
  }

  /** Remaining work per machine in minutes, divided by its present crew. */
  function machineLoads(state) {
    var cfg = C(state);
    var remaining = {};
    cfg.features.products.forEach(function (p) {
      var queued = U.sum(state.queue.filter(function (b) { return b.product === p; }), function (b) { return b.qty - b.started; });
      var bt = state.buffers.test.filter(function (u) { return u.product === p; }).length;
      var bp = state.buffers.packaging.filter(function (u) { return u.product === p; }).length;
      remaining[p] = { assembly: queued, test: queued + bt, packaging: queued + bt + bp };
    });
    var loads = {};
    cfg.line.forEach(function (id) {
      var work = 0;
      cfg.features.products.forEach(function (p) { work += remaining[p][id] * FM.Production.baseTime(state, id, p); });
      var crew = W.operatorsAt(state, id).length;
      loads[id] = { work: work, crew: crew, perHead: crew ? work / crew : Infinity };
    });
    return loads;
  }

  function staff(state, opts) {
    var cfg = C(state);
    var line = cfg.line;

    // 1. No machine without a present operator.
    line.forEach(function (id) {
      if (W.operatorsAt(state, id).length > 0) return;
      var free = W.unassigned(state).filter(function (w) { return W.isPresent(state, w); });
      if (free.length) { D(state, 'assignWorker', free[0].id, id); return; }
      var donor = line.filter(function (x) { return x !== id && W.operatorsAt(state, x).length >= 2; })[0];
      if (donor) {
        var w = W.operatorsAt(state, donor).sort(function (a, b) { return a.fatigue - b.fatigue; })[0];
        D(state, 'assignWorker', w.id, null);
        D(state, 'assignWorker', w.id, id);
      }
    });

    // 2. Rest an exhausted worker when someone fresh can take over.
    state.workers.forEach(function (w) {
      if (!w.station || !W.isPresent(state, w) || w.fatigue < 80) return;
      var fresh = W.unassigned(state).filter(function (x) { return W.isPresent(state, x) && x.fatigue < 50; })[0];
      if (!fresh) return;
      var st = w.station;
      D(state, 'assignWorker', w.id, null);
      D(state, 'assignWorker', fresh.id, st);
    });

    // 3. Second operator on the most loaded machine.
    var loads = machineLoads(state);
    var worst = line.slice().sort(function (a, b) { return loads[b].perHead - loads[a].perHead; })[0];
    if (loads[worst].crew === 1 && loads[worst].work > U.MINUTES_PER_DAY * 0.5 && W.assignedTo(state, worst).length < cfg.machine.maxOperators) {
      var spare = W.unassigned(state).filter(function (w) { return W.isPresent(state, w); })[0];
      if (spare) D(state, 'assignWorker', spare.id, worst);
      // Hiring pays back only over several days: wage x remaining days + hiring cost.
      else if (!opts.noHiring && cfg.features.hiring && state.cash > 3000 && cfg.days - state.day >= 3 &&
               state.workers.length < (opts.maxWorkers || 6) &&
               loads[worst].perHead > U.MINUTES_PER_DAY * 0.8) {
        if (D(state, 'hire').ok) D(state, 'assignWorker', state.workers[state.workers.length - 1].id, worst);
      }
    }
  }

  function buy(state, opts) {
    var cfg = C(state);
    var needC = 0, needK = 0;
    state.queue.forEach(function (b) {
      var bom = cfg.products[b.product].bom;
      needC += (b.qty - b.started) * bom.components;
      needK += (b.qty - b.started) * bom.casing;
    });
    var incoming = { components: 0, casing: 0 };
    state.incoming.forEach(function (d) { incoming[d.material] += d.qty; });
    // Keep a small safety stock only when unplanned orders can arrive.
    var nearEnd = state.day >= cfg.days - 1;
    var safety = opts.safety || (cfg.features.randomOffers && !nearEnd ? { components: 30, casing: 15 } : { components: 4, casing: 2 });
    [['components', needC + safety.components], ['casing', needK + safety.casing]].forEach(function (pair) {
      var mat = pair[0];
      var have = state.materials[mat] + incoming[mat];
      if (have >= pair[1]) return;
      var room = cfg.warehouse.rawCapacity - FM.State.rawTotal(state, true);
      var qty = Math.min(room, Math.ceil((pair[1] - have) / 10) * 10);
      if (qty <= 0) return;
      var urgent = state.materials[mat] < 6;
      var shortage = FM.Market.inShortage(state);
      // In a shortage only express works, at a high price: buy just what the line needs right now.
      if (shortage) {
        if (!urgent || !cfg.features.express) return;
        qty = Math.min(qty, 40);
      }
      var express = cfg.features.express && (opts.alwaysExpress || urgent || shortage);
      var r = D(state, 'buyMaterial', mat, qty, express);
      if (!r.ok && r.reason === 'err.cash') D(state, 'buyMaterial', mat, Math.floor(qty / 2) || 1, express);
    });
  }

  /** Assembly minutes per unit of a product with the current crew. */
  function asmMinutes(state, product) {
    var f = Math.max(0.5, FM.Production.speedFactor(state, state.machines.assembly) || 1);
    return FM.Production.baseTime(state, 'assembly', product) / f;
  }

  /** Scripted orders announced for the next day and a half (the chapter tells the player in advance). */
  function announcedScripted(state) {
    var list = C(state).orders.script || [];
    var out = [];
    for (var i = state.scriptIndex; i < list.length; i++) {
      if (list[i].at - state.t > U.MINUTES_PER_DAY * 1.5) break;
      out.push({ product: list[i].product, qty: list[i].qty, dueAt: U.dayEnd(list[i].dueDay) });
    }
    return out;
  }

  /**
   * Can every order (plus an optional new one) still be finished on time if the
   * line works them in due-date order? Uses assembly time only, with a 20% margin.
   */
  function feasible(state, extra) {
    var list = state.orders.slice().concat(announcedScripted(state));
    if (extra) list.push(extra);
    list.sort(function (a, b) { return a.dueAt - b.dueAt; });
    var stock = { headphone: FM.Market.stockOf(state, 'headphone'), speaker: FM.Market.stockOf(state, 'speaker') };
    var setup = C(state).setupMinutes;
    var current = state.machines.assembly.currentProduct;
    var clock = 0;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var fromStock = Math.min(stock[o.product], o.qty);
      stock[o.product] -= fromStock;
      var units = o.qty - fromStock;
      if (units > 0 && current && current !== o.product) clock += setup;
      if (units > 0) current = o.product;
      clock += units * asmMinutes(state, o.product) * 1.25;
      // finished units still need test and packaging: about one hour of flow time
      if (state.t + clock + 60 > o.dueAt) return false;
    }
    return true;
  }

  /** Desired production sequence: shortfalls in due-date order, same products merged. */
  function desiredPlan(state) {
    var stock = {};
    var cfg = C(state);
    cfg.features.products.forEach(function (p) { stock[p] = FM.Market.stockOf(state, p) + inLineExceptQueue(state, p); });
    var plan = [];
    state.orders.slice().sort(function (a, b) { return a.dueAt - b.dueAt; }).forEach(function (o) {
      var use = Math.min(stock[o.product], o.qty);
      stock[o.product] -= use;
      var short = o.qty - use;
      if (short <= 0) return;
      short += Math.ceil(short * 0.06);              // margin for scrap
      var last = plan[plan.length - 1];
      if (last && last.product === o.product) last.qty += short;
      else plan.push({ product: o.product, qty: short });
    });
    return plan;
  }

  /** Units of a product already past assembly or being assembled (not counting the queue). */
  function inLineExceptQueue(state, product) {
    var n = 0;
    ['test', 'packaging'].forEach(function (b) { state.buffers[b].forEach(function (u) { if (u.product === product) n++; }); });
    C(state).line.forEach(function (id) { var j = state.machines[id].job; if (j && j.product === product) n++; });
    state.queue.forEach(function (b) { if (b.product === product) n += b.started; });
    return n;
  }

  function replan(state) {
    var plan = desiredPlan(state);
    // A batch already started keeps going and counts toward the first matching plan step.
    var started = state.queue.filter(function (b) { return b.started > 0; });
    started.forEach(function (b) {
      var left = b.qty - b.started;
      for (var i = 0; i < plan.length && left > 0; i++) {
        if (plan[i].product !== b.product) continue;
        var take = Math.min(left, plan[i].qty);
        plan[i].qty -= take; left -= take;
      }
    });
    plan = plan.filter(function (x) { return x.qty > 0; });
    var unstarted = state.queue.filter(function (b) { return b.started === 0; });
    var same = unstarted.length === plan.length && unstarted.every(function (b, i) {
      return b.product === plan[i].product && Math.abs(b.qty - plan[i].qty) <= 2;
    });
    if (same) return;
    unstarted.forEach(function (b) { D(state, 'removeBatch', b.id); });
    plan.forEach(function (x) { D(state, 'addBatch', x.product, Math.min(200, x.qty)); });
  }

  /** A sensible player: plans by due date, buys on time, removes the bottleneck, maintains. */
  function smart(state, opts) {
    opts = opts || {};
    var cfg = C(state);
    var qualityGoal = cfg.goals.some(function (g) { return g.type === 'quality'; });

    // Deliver in due-date order; stock that an earlier order is waiting for is not given to a later one.
    var reserved = { headphone: 0, speaker: 0 };
    state.orders.slice().sort(function (a, b) { return a.dueAt - b.dueAt; }).forEach(function (o) {
      if (FM.Market.stockOf(state, o.product) - reserved[o.product] >= o.qty) D(state, 'deliverOrder', o.id);
      else reserved[o.product] += o.qty;
    });

    state.offers.slice().sort(function (a, b) { return a.dueAt - b.dueAt; }).forEach(function (o) {
      if (o.scripted || opts.acceptAll || feasible(state, o)) D(state, 'acceptOffer', o.id);
    });

    replan(state);
    buy(state, opts);

    if (cfg.features.maintenance && !opts.noMaintenance) {
      cfg.line.forEach(function (id) {
        var m = state.machines[id];
        // Defects start at assembly, so that is the machine to keep in top shape when quality counts.
        var limit = qualityGoal && id === 'assembly' ? 90 : 60;
        if (m.health < limit && !m.down && state.cash > 1500) D(state, 'maintain', id);
      });
    }

    if (opts.mode) cfg.line.forEach(function (id) { if (state.machines[id].mode !== opts.mode) D(state, 'setMode', id, opts.mode); });
    // Quality is built in, not inspected in: with a quality goal, assembly runs slower when time allows.
    else if (qualityGoal && cfg.features.modes.indexOf('slow') >= 0) {
      var want = feasible(state) ? 'slow' : 'normal';
      if (state.machines.assembly.mode !== want) D(state, 'setMode', 'assembly', want);
    }
    if (opts.qc && state.qcMode !== opts.qc) D(state, 'setQcMode', opts.qc);

    staff(state, opts);
  }

  function idle() {}

  /** Plays to the end, letting `policy` act every `every` minutes. */
  function playToEnd(state, policy, opts, every) {
    every = every || 30;
    while (state.status === 'running') {
      if (state.t % every === 0) policy(state, opts);
      FM.Engine.stepMinute(state);
    }
    return state;
  }

  FM.Bots = { smart: smart, idle: idle, playToEnd: playToEnd, inLine: inLine, machineLoads: machineLoads };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
