/**
 * Market: material prices and deliveries, scripted and random customer offers, orders.
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;

  function C(state) { return FM.Config.of(state); }

  // ---------- materials ----------

  /** Daily random walk of material prices (only when the chapter enables it). */
  function updatePrices(state) {
    var cfg = C(state);
    state.priceHistory.push({ components: state.prices.components, casing: state.prices.casing });
    if (!cfg.features.priceDrift) return;
    Object.keys(cfg.materials).forEach(function (k) {
      var m = cfg.materials[k];
      var next = state.prices[k] * (1 + U.randRange(state, -m.dailyDrift, m.dailyDrift));
      state.prices[k] = U.round2(U.clamp(next, m.basePrice * m.min, m.basePrice * m.max));
    });
  }

  function inShortage(state) { return state.t < state.shortageUntil; }

  function surcharge(state, express) {
    var cfg = C(state);
    if (!express) return cfg.delivery.standard.surcharge;
    return inShortage(state) ? cfg.events.materialShortage.surcharge : cfg.delivery.express.surcharge;
  }

  function purchaseCost(state, material, qty, express) {
    return Math.round(qty * state.prices[material] * (1 + surcharge(state, express)));
  }

  function processIncoming(state) {
    for (var i = state.incoming.length - 1; i >= 0; i--) {
      var d = state.incoming[i];
      if (state.t >= d.arriveAt) {
        state.materials[d.material] += d.qty;
        state.incoming.splice(i, 1);
        S.log(state, 'good', 'log.arrived', { qty: d.qty, mat: d.material });
      }
    }
  }

  // ---------- offers ----------

  function offersPerDay(state) {
    var O = C(state).orders;
    var demand = O.baseOffersPerDay + (state.day - 1) * O.offersGrowthPerDay;
    return demand * (0.6 + state.satisfaction / 100 * 0.8);
  }

  function randomOffer(state, priceBonus) {
    var cfg = C(state);
    var O = cfg.orders;
    var mix = {};
    cfg.features.products.forEach(function (p) { mix[p] = O.productMix[p]; });
    var product = U.weightedPick(state, mix);
    var range = O.qty[product];
    var qty = Math.max(range[0], Math.round(U.randInt(state, range[0], range[1]) / 5) * 5);
    var dueDays = U.randInt(state, O.dueDays[0], O.dueDays[1]);
    var factor = U.randRange(state, O.priceSpread[0], O.priceSpread[1]) + (dueDays <= 2 ? O.rushBonus : 0) + (priceBonus || 0);
    return {
      id: S.nextId(state), product: product, qty: qty,
      unitPrice: Math.round(cfg.products[product].basePrice * factor),
      createdAt: state.t, expiresAt: state.t + O.offerLifetime,
      dueAt: state.t + dueDays * U.MINUTES_PER_DAY, scripted: false, tag: null
    };
  }

  function addOffer(state, offer) {
    state.offers.push(offer);
    state.rev++;
    S.log(state, 'info', 'log.newOffer', { product: offer.product, qty: offer.qty, price: offer.unitPrice }, true);
  }

  /** Scripted orders from the chapter appear as offers at their time and stay open until due. */
  function releaseScripted(state) {
    var list = C(state).orders.script || [];
    while (state.scriptIndex < list.length && list[state.scriptIndex].at <= state.t) {
      var o = list[state.scriptIndex++];
      var cfg = C(state);
      addOffer(state, {
        id: S.nextId(state), product: o.product, qty: o.qty,
        unitPrice: o.unitPrice || cfg.products[o.product].basePrice,
        createdAt: state.t, expiresAt: U.dayEnd(o.dueDay), dueAt: U.dayEnd(o.dueDay),
        scripted: true, tag: o.tag || null, customer: o.customer || null
      });
    }
  }

  // ---------- orders ----------

  function orderValue(o) { return o.qty * o.unitPrice; }

  function changeSatisfaction(state, delta) {
    state.satisfaction = U.clamp(Math.round((state.satisfaction + delta) * 10) / 10, 0, 100);
  }

  function stepOrders(state) {
    var cfg = C(state);
    var O = cfg.orders;

    releaseScripted(state);

    for (var i = state.offers.length - 1; i >= 0; i--) {
      var off = state.offers[i];
      if (state.t >= off.expiresAt) {
        state.offers.splice(i, 1);
        state.stats.offersExpired++;
        if (off.scripted) state.stats.scriptedMissed++;
        state.rev++;
        S.log(state, off.scripted ? 'warn' : 'info', 'log.offerExpired', { product: off.product, qty: off.qty });
      }
    }

    for (var j = state.orders.length - 1; j >= 0; j--) {
      var o = state.orders[j];
      if (!o.late && state.t > o.dueAt) {
        o.late = true;
        state.rev++;
        S.log(state, 'warn', 'log.orderLate', { product: o.product, qty: o.qty }, true);
      }
      if (state.t > o.dueAt + O.cancelAfterLateMinutes) {
        var fee = Math.round(orderValue(o) * O.cancelPenalty);
        S.spend(state, fee, 'penalties');
        changeSatisfaction(state, O.cancelSatisfaction);
        state.stats.ordersCancelled++;
        if (o.scripted) state.stats.scriptedMissed++;
        state.orders.splice(j, 1);
        state.rev++;
        S.log(state, 'bad', 'log.cancelled', { product: o.product, qty: o.qty, fee: fee }, true);
      }
    }

    if (cfg.features.randomOffers && state.offers.length < O.maxOpenOffers) {
      if (U.rand(state) < offersPerDay(state) / U.MINUTES_PER_DAY) addOffer(state, randomOffer(state));
    }
  }

  /** Takes qty units from finished stock; returns how many were (secretly) defective. */
  function pickUnits(state, product, qty) {
    var stock = state.finished[product];
    var defective = 0;
    for (var i = 0; i < qty; i++) {
      var total = stock.good + stock.defective;
      if (U.rand(state) < stock.defective / total) { stock.defective--; defective++; }
      else stock.good--;
    }
    return defective;
  }

  function stockOf(state, product) {
    var s = state.finished[product];
    return s.good + s.defective;
  }

  FM.Market = {
    updatePrices: updatePrices,
    inShortage: inShortage,
    purchaseCost: purchaseCost,
    processIncoming: processIncoming,
    stepOrders: stepOrders,
    randomOffer: randomOffer,
    addOffer: addOffer,
    offersPerDay: offersPerDay,
    orderValue: orderValue,
    changeSatisfaction: changeSatisfaction,
    pickUnits: pickUnits,
    stockOf: stockOf,
    releaseScripted: releaseScripted
  };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
