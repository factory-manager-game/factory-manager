/**
 * Player actions. Every action validates its input and returns
 * { ok: true } or { ok: false, reason: '<i18n key>' }.
 * The UI only ever changes the game through these functions.
 */
(function (FM) {
  'use strict';

  var S = FM.State;
  var M = FM.Market;

  function cfg() { return FM.CONFIG; }
  function ok() { return { ok: true }; }
  function fail(reason) { return { ok: false, reason: reason }; }

  function isPositiveInt(n) { return Number.isInteger(n) && n > 0; }

  function running(state) { return state.status === 'running'; }

  // ---------- materials ----------

  function buyMaterial(state, material, qty, express) {
    var C = cfg();
    if (!running(state)) return fail('err.gameOver');
    if (!C.materials[material]) return fail('err.invalid');
    if (!isPositiveInt(qty)) return fail('err.qty');
    if (S.rawTotal(state, true) + qty > C.warehouse.rawCapacity) return fail('err.rawFull');
    var cost = M.purchaseCost(state, material, qty, express);
    if (cost > state.cash) return fail('err.cash');

    S.spend(state, cost, 'materials');
    var lead = C.delivery[express ? 'express' : 'standard'].leadMinutes;
    state.incoming.push({ id: S.nextId(state), material: material, qty: qty, arriveAt: state.t + lead, express: !!express });
    S.log(state, 'info', 'log.buy', { qty: qty, mat: material, cost: cost, express: !!express });
    return ok();
  }

  // ---------- production plan ----------

  var MAX_BATCHES = 8;

  function addBatch(state, product, qty) {
    if (!running(state)) return fail('err.gameOver');
    if (!cfg().products[product]) return fail('err.invalid');
    if (!isPositiveInt(qty) || qty > 200) return fail('err.qty');
    if (state.queue.length >= MAX_BATCHES) return fail('err.queueFull');
    state.queue.push({ id: S.nextId(state), product: product, qty: qty, started: 0 });
    state.rev++;
    return ok();
  }

  /** Removes the units not started yet; units already in the line keep going. */
  function removeBatch(state, id) {
    var i = state.queue.findIndex(function (b) { return b.id === id; });
    if (i < 0) return fail('err.invalid');
    state.queue.splice(i, 1);
    state.rev++;
    return ok();
  }

  function moveBatchUp(state, id) {
    var i = state.queue.findIndex(function (b) { return b.id === id; });
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
    if (!m || !cfg().machineModes[mode]) return fail('err.invalid');
    m.mode = mode;
    return ok();
  }

  function changeOperators(state, machineId, delta) {
    var m = state.machines[machineId];
    if (!m) return fail('err.invalid');
    var next = m.operators + delta;
    if (next < 0 || next > cfg().machine.maxOperators) return fail('err.operatorLimit');
    if (delta > 0 && S.unassignedWorkers(state) < delta) return fail('err.noFreeWorker');
    m.operators = next;
    state.rev++;
    return ok();
  }

  function maintain(state, machineId) {
    var C = cfg();
    var m = state.machines[machineId];
    if (!running(state)) return fail('err.gameOver');
    if (!m) return fail('err.invalid');
    if (m.down) return fail('err.machineBusy');
    if (C.machine.maintenanceCost > state.cash) return fail('err.cash');
    S.spend(state, C.machine.maintenanceCost, 'maintenance');
    state.stats.maintenances++;
    m.down = { reason: 'maintenance', left: C.machine.maintenanceMinutes, total: C.machine.maintenanceMinutes };
    m.status = 'maintenance';
    S.log(state, 'info', 'log.maintStart', { machine: m.id, cost: C.machine.maintenanceCost });
    return ok();
  }

  function setQcMode(state, mode) {
    if (!cfg().quality.qcModes[mode]) return fail('err.invalid');
    state.qcMode = mode;
    return ok();
  }

  // ---------- workforce ----------

  function hire(state) {
    var W = cfg().workforce;
    if (!running(state)) return fail('err.gameOver');
    if (state.workers >= W.maxWorkers) return fail('err.maxWorkers');
    if (W.hireCost > state.cash) return fail('err.cash');
    S.spend(state, W.hireCost, 'hiring');
    state.workers++;
    state.rev++;
    S.log(state, 'info', 'log.hired', { cost: W.hireCost });
    return ok();
  }

  function fire(state) {
    var W = cfg().workforce;
    if (!running(state)) return fail('err.gameOver');
    if (S.unassignedWorkers(state) < 1) return fail('err.unassignFirst');
    S.spend(state, W.severance, 'hiring');
    state.workers--;
    state.rev++;
    S.log(state, 'info', 'log.fired', { cost: W.severance });
    return ok();
  }

  // ---------- customers ----------

  function acceptOffer(state, id) {
    if (!running(state)) return fail('err.gameOver');
    var i = state.offers.findIndex(function (o) { return o.id === id; });
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
    var i = state.offers.findIndex(function (o) { return o.id === id; });
    if (i < 0) return fail('err.invalid');
    var offer = state.offers.splice(i, 1)[0];
    state.stats.offersDeclined++;
    state.rev++;
    S.log(state, 'info', 'log.declined', { product: offer.product, qty: offer.qty });
    return ok();
  }

  function deliverOrder(state, id) {
    var O = cfg().orders;
    if (!running(state)) return fail('err.gameOver');
    var i = state.orders.findIndex(function (o) { return o.id === id; });
    if (i < 0) return fail('err.invalid');
    var o = state.orders[i];
    if (M.stockOf(state, o.product) < o.qty) return fail('err.stock');

    state.orders.splice(i, 1);
    var defective = M.pickUnits(state, o.product, o.qty);
    state.stats.shipped += o.qty;

    var factor = 1;
    if (state.t > o.dueAt) {
      var daysLate = Math.ceil((state.t - o.dueAt) / cfg().game.minutesPerDay);
      factor = Math.max(O.minLatePriceFactor, 1 - daysLate * O.latePenaltyPerDay);
      M.changeSatisfaction(state, O.lateSatisfaction);
      state.stats.ordersLate++;
    } else {
      M.changeSatisfaction(state, O.onTimeSatisfaction);
      state.stats.ordersOnTime++;
    }
    var revenue = Math.round(o.qty * o.unitPrice * factor);
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

  /** Sells surplus stock to wholesalers at a low price. No reputation effect. */
  function sellToMarket(state, product, qty) {
    var C = cfg();
    if (!running(state)) return fail('err.gameOver');
    if (!C.products[product]) return fail('err.invalid');
    if (!isPositiveInt(qty)) return fail('err.qty');
    if (M.stockOf(state, product) < qty) return fail('err.stock');
    M.pickUnits(state, product, qty);
    var revenue = qty * C.products[product].marketPrice;
    S.earn(state, revenue);
    state.stats.soldMarket += qty;
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
    changeOperators: changeOperators,
    maintain: maintain,
    setQcMode: setQcMode,
    hire: hire,
    fire: fire,
    acceptOffer: acceptOffer,
    declineOffer: declineOffer,
    deliverOrder: deliverOrder,
    sellToMarket: sellToMarket
  };
})(window.FM = window.FM || {});
