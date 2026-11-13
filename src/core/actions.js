/**
 * Player actions. Each validates its input and returns { ok: true } or
 * { ok: false, reason: '<text key>' }. Call them through FM.Engine.dispatch so that
 * successful actions are recorded for replay and decision analysis.
 */
(function (FM) {
  'use strict';

  var S = FM.State;
  var M = FM.Market;
  var W = FM.Workforce;

  function C(state) { return FM.Config.of(state); }
  function ok() { return { ok: true }; }
  function fail(reason) { return { ok: false, reason: reason }; }
  function isPositiveInt(n) { return Number.isInteger(n) && n > 0; }
  function running(state) { return state.status === 'running'; }
  function feature(state, name) { return C(state).features[name]; }
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }

  // ---------- materials ----------

  function buyMaterial(state, material, qty, express) {
    var cfg = C(state);
    express = !!express;
    if (!running(state)) return fail('err.gameOver');
    if (!cfg.materials[material]) return fail('err.invalid');
    if (!isPositiveInt(qty) || qty > cfg.warehouse.rawCapacity) return fail('err.qty');
    if (express && !feature(state, 'express')) return fail('err.locked');
    if (!express && M.inShortage(state)) return fail('err.shortage');
    if (S.rawTotal(state, true) + qty > cfg.warehouse.rawCapacity) return fail('err.rawFull');
    var cost = M.purchaseCost(state, material, qty, express);
    if (cost > state.cash) return fail('err.cash');

    S.spend(state, cost, 'materials');
    var lead = cfg.delivery[express ? 'express' : 'standard'].leadMinutes;
    state.incoming.push({ id: S.nextId(state), material: material, qty: qty, arriveAt: state.t + lead, express: express, delayed: false });
    state.rev++;
    S.log(state, 'info', 'log.buy', { qty: qty, mat: material, cost: cost, express: express });
    return ok();
  }

  // ---------- production plan ----------

  var MAX_BATCHES = 8;

  function addBatch(state, product, qty) {
    if (!running(state)) return fail('err.gameOver');
    if (feature(state, 'products').indexOf(product) < 0) return fail('err.invalid');
    if (!isPositiveInt(qty) || qty > 200) return fail('err.qty');
    if (state.queue.length >= MAX_BATCHES) return fail('err.queueFull');
    state.queue.push({ id: S.nextId(state), product: product, qty: qty, started: 0 });
    state.rev++;
    return ok();
  }

  /** Removes the units not started yet; units already in the line keep going. */
  function removeBatch(state, id) {
    var i = findById(state.queue, id);
    if (i < 0) return fail('err.invalid');
    state.queue.splice(i, 1);
    state.rev++;
    return ok();
  }

  function moveBatchUp(state, id) {
    var i = findById(state.queue, id);
    if (i <= 0) return fail('err.invalid');
    if (state.queue[i - 1].started > 0) return fail('err.batchStarted');
    var tmp = state.queue[i - 1];
    state.queue[i - 1] = state.queue[i];
    state.queue[i] = tmp;
    state.rev++;
    return ok();
  }

  // ---------- machines ----------

  function setMode(state, machineId, mode) {
    var m = state.machines[machineId];
    if (!m || feature(state, 'modes').indexOf(mode) < 0) return fail('err.invalid');
    if (m.mode === mode) return fail('err.noChange');
    m.mode = mode;
    state.rev++;
    return ok();
  }

  function maintain(state, machineId) {
    var cfg = C(state);
    var m = state.machines[machineId];
    if (!running(state)) return fail('err.gameOver');
    if (!m) return fail('err.invalid');
    if (!feature(state, 'maintenance')) return fail('err.locked');
    if (m.down) return fail('err.machineBusy');
    if (cfg.machine.maintenanceCost > state.cash) return fail('err.cash');
    S.spend(state, cfg.machine.maintenanceCost, 'maintenance');
    state.stats.maintenances++;
    m.down = { reason: 'maintenance', left: cfg.machine.maintenanceMinutes, total: cfg.machine.maintenanceMinutes };
    m.status = 'maintenance';
    state.rev++;
    S.log(state, 'info', 'log.maintStart', { machine: m.id, cost: cfg.machine.maintenanceCost });
    return ok();
  }

  function setQcMode(state, mode) {
    if (feature(state, 'qcModes').indexOf(mode) < 0) return fail('err.invalid');
    if (state.qcMode === mode) return fail('err.noChange');
    state.qcMode = mode;
    state.rev++;
    return ok();
  }

  // ---------- workforce ----------

  /** Moves a worker to a machine, or to the rest room with station null. */
  function assignWorker(state, workerId, station) {
    var cfg = C(state);
    var i = findById(state.workers, workerId);
    if (i < 0) return fail('err.invalid');
    var w = state.workers[i];
    if (station !== null && !state.machines[station]) return fail('err.invalid');
    if (w.station === station) return fail('err.noChange');
    if (station !== null && W.assignedTo(state, station).length >= cfg.machine.maxOperators) return fail('err.operatorLimit');
    w.station = station;
    state.rev++;
    return ok();
  }

  /** Stepper helper: +1 brings the most rested free worker, -1 sends the most tired one to rest. */
  function changeOperators(state, machineId, delta) {
    if (!state.machines[machineId]) return fail('err.invalid');
    if (delta > 0) {
      var free = W.unassigned(state).filter(function (w) { return W.isPresent(state, w); })
        .sort(function (a, b) { return a.fatigue - b.fatigue || a.id - b.id; });
      if (!free.length) return fail('err.noFreeWorker');
      return assignWorker(state, free[0].id, machineId);
    }
    var here = W.assignedTo(state, machineId).sort(function (a, b) { return b.fatigue - a.fatigue || b.id - a.id; });
    if (!here.length) return fail('err.operatorLimit');
    return assignWorker(state, here[0].id, null);
  }

  function hire(state) {
    var cfg = C(state);
    var WF = cfg.workforce;
    if (!running(state)) return fail('err.gameOver');
    if (!feature(state, 'hiring')) return fail('err.locked');
    if (state.workers.length >= WF.maxWorkers) return fail('err.maxWorkers');
    if (WF.hireCost > state.cash) return fail('err.cash');
    S.spend(state, WF.hireCost, 'hiring');
    var used = state.workers.map(function (w) { return w.name; });
    var free = WF.hiresPool.filter(function (n) { return used.indexOf(n) < 0; });
    var name = free.length ? free[0] : WF.hiresPool[state.hiresUsed % WF.hiresPool.length] + ' ' + (state.hiresUsed + 1);
    state.hiresUsed++;
    state.workers.push({ id: S.nextId(state), name: name, station: null, fatigue: 10, absentUntil: -1, warned: false });
    W.changeMorale(state, cfg.morale.onHire);
    state.rev++;
    S.log(state, 'info', 'log.hired', { name: name, cost: WF.hireCost });
    return ok();
  }

  function fire(state, workerId) {
    var cfg = C(state);
    if (!running(state)) return fail('err.gameOver');
    if (!feature(state, 'hiring')) return fail('err.locked');
    var i = findById(state.workers, workerId);
    if (i < 0) return fail('err.invalid');
    if (state.workers.length <= 1) return fail('err.lastWorker');
    var w = state.workers.splice(i, 1)[0];
    S.spend(state, cfg.workforce.severance, 'hiring');
    W.changeMorale(state, cfg.morale.onFire);
    state.rev++;
    S.log(state, 'warn', 'log.fired', { name: w.name, cost: cfg.workforce.severance });
    return ok();
  }

  // ---------- customers ----------

  function acceptOffer(state, id) {
    if (!running(state)) return fail('err.gameOver');
    var i = findById(state.offers, id);
    if (i < 0) return fail('err.invalid');
    var offer = state.offers.splice(i, 1)[0];
    offer.acceptedAt = state.t;
    offer.late = false;
    state.orders.push(offer);
    state.rev++;
    S.log(state, 'info', 'log.accepted', { product: offer.product, qty: offer.qty });
    return ok();
  }

  function declineOffer(state, id) {
    if (!running(state)) return fail('err.gameOver');
    var i = findById(state.offers, id);
    if (i < 0) return fail('err.invalid');
    var offer = state.offers.splice(i, 1)[0];
    state.stats.offersDeclined++;
    if (offer.scripted) state.stats.scriptedMissed++;
    state.rev++;
    S.log(state, 'info', 'log.declined', { product: offer.product, qty: offer.qty });
    return ok();
  }

  function deliverOrder(state, id) {
    var O = C(state).orders;
    if (!running(state)) return fail('err.gameOver');
    var i = findById(state.orders, id);
    if (i < 0) return fail('err.invalid');
    var o = state.orders[i];
    if (M.stockOf(state, o.product) < o.qty) return fail('err.stock');

    state.orders.splice(i, 1);
    var defective = M.pickUnits(state, o.product, o.qty);
    state.stats.shipped += o.qty;
    state.stats.delivered[o.product] += o.qty;
    if (o.scripted) state.flags.scriptedDelivered = (state.flags.scriptedDelivered || 0) + 1;
    if (o.tag) { state.flags.tagsDelivered = state.flags.tagsDelivered || {}; state.flags.tagsDelivered[o.tag] = true; }

    var factor = 1;
    if (state.t > o.dueAt) {
      var daysLate = Math.ceil((state.t - o.dueAt) / FM.util.MINUTES_PER_DAY);
      factor = Math.max(O.minLatePriceFactor, 1 - daysLate * O.latePenaltyPerDay);
      M.changeSatisfaction(state, O.lateSatisfaction);
      state.stats.ordersLate++;
    } else {
      M.changeSatisfaction(state, O.onTimeSatisfaction);
      state.stats.ordersOnTime++;
    }
    var revenue = Math.round(M.orderValue(o) * factor);
    S.earn(state, revenue);
    S.log(state, factor < 1 ? 'warn' : 'good', factor < 1 ? 'log.deliveredLate' : 'log.delivered',
      { product: o.product, qty: o.qty, revenue: revenue, cut: Math.round((1 - factor) * 100) }, true);

    if (defective > 0) {
      var refund = Math.round(defective * o.unitPrice * (factor + O.returnHandling));
      S.spend(state, refund, 'refunds');
      state.stats.returned += defective;
      M.changeSatisfaction(state, Math.max(O.maxReturnSatisfaction, defective * O.returnSatisfactionPerUnit));
      S.log(state, 'bad', 'log.returns', { n: defective, refund: refund }, true);
    }
    state.rev++;
    return ok();
  }

  function sellWholesale(state, product, qty) {
    var cfg = C(state);
    if (!running(state)) return fail('err.gameOver');
    if (!feature(state, 'wholesale')) return fail('err.locked');
    if (!cfg.products[product]) return fail('err.invalid');
    if (!isPositiveInt(qty)) return fail('err.qty');
    if (M.stockOf(state, product) < qty) return fail('err.stock');
    M.pickUnits(state, product, qty);
    var revenue = qty * cfg.products[product].wholesalePrice;
    S.earn(state, revenue);
    state.stats.soldWholesale += qty;
    state.rev++;
    S.log(state, 'info', 'log.sold', { product: product, qty: qty, revenue: revenue });
    return ok();
  }

  FM.Actions = {
    buyMaterial: buyMaterial,
    addBatch: addBatch,
    removeBatch: removeBatch,
    moveBatchUp: moveBatchUp,
    setMode: setMode,
    maintain: maintain,
    setQcMode: setQcMode,
    assignWorker: assignWorker,
    changeOperators: changeOperators,
    hire: hire,
    fire: fire,
    acceptOffer: acceptOffer,
    declineOffer: declineOffer,
    deliverOrder: deliverOrder,
    sellWholesale: sellWholesale
  };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
