/**
 * Market: raw-material prices and deliveries, customer offers and orders.
 */
(function (FM) {
  'use strict';

  var U = FM.util;
  var S = FM.State;

  function cfg() { return FM.CONFIG; }

  // ---------- materials ----------

  /** Random walk of material prices, once per day. */
  function updatePrices(state) {
    var mats = cfg().materials;
    Object.keys(mats).forEach(function (k) {
      var m = mats[k];
      var next = state.prices[k] * (1 + U.randRange(state, -m.dailyDrift, m.dailyDrift));
      state.prices[k] = U.round2(U.clamp(next, m.basePrice * m.min, m.basePrice * m.max));
    });
  }

  function purchaseCost(state, material, qty, express) {
    var d = cfg().delivery[express ? 'express' : 'standard'];
    return Math.round(qty * state.prices[material] * (1 + d.surcharge));
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
    var O = cfg().orders;
    var demand = O.baseOffersPerDay + (state.day - 1) * O.offersGrowthPerDay;
    var reputation = 0.6 + (state.satisfaction / 100) * 0.8;   // 0.6x .. 1.4x
    return demand * reputation;
  }

  function createOffer(state) {
    var C = cfg();
    var O = C.orders;
    var product = U.weightedPick(state, O.productMix);
    var range = O.qty[product];
    var qty = Math.round(U.randInt(state, range[0], range[1]) / 5) * 5 || range[0];
    var dueDays = U.randInt(state, O.dueDays[0], O.dueDays[1]);
    var factor = U.randRange(state, O.priceSpread[0], O.priceSpread[1]);
    if (dueDays <= 2) factor += O.rushBonus;
    var unitPrice = Math.round(C.products[product].basePrice * factor);

    return {
      id: S.nextId(state),
      product: product,
      qty: qty,
      unitPrice: unitPrice,
      createdAt: state.t,
      expiresAt: state.t + O.offerLifetime,
      dueAt: state.t + dueDays * C.game.minutesPerDay
    };
  }

  function addOffer(state) {
    var offer = createOffer(state);
    state.offers.push(offer);
    S.log(state, 'info', 'log.newOffer', { product: offer.product, qty: offer.qty, price: offer.unitPrice }, true);
  }

  // ---------- orders ----------

  function orderValue(order) {
    return order.qty * order.unitPrice;
  }

  function stepOrders(state) {
    var C = cfg();
    var O = C.orders;

    // offers expire
    for (var i = state.offers.length - 1; i >= 0; i--) {
      if (state.t >= state.offers[i].expiresAt) {
        S.log(state, 'info', 'log.offerExpired', { product: state.offers[i].product, qty: state.offers[i].qty });
        state.offers.splice(i, 1);
      }
    }

    // accepted orders become late, then get cancelled
    for (var j = state.orders.length - 1; j >= 0; j--) {
      var o = state.orders[j];
      if (!o.late && state.t > o.dueAt) {
        o.late = true;
        S.log(state, 'warn', 'log.orderLate', { id: o.id, product: o.product, qty: o.qty }, true);
      }
      if (state.t > o.dueAt + O.cancelAfterLateMinutes) {
        var fee = Math.round(orderValue(o) * O.cancelPenalty);
        S.spend(state, fee, 'penalties');
        changeSatisfaction(state, O.cancelSatisfaction);
        state.stats.ordersCancelled++;
        state.orders.splice(j, 1);
        S.log(state, 'bad', 'log.cancelled', { id: o.id, product: o.product, qty: o.qty, fee: fee }, true);
      }
    }

    // new offers arrive at random
    if (state.offers.length < O.maxOpenOffers) {
      var chance = offersPerDay(state) / C.game.minutesPerDay;
      if (U.rand(state) < chance) addOffer(state);
    }
  }

  function changeSatisfaction(state, delta) {
    state.satisfaction = U.clamp(Math.round((state.satisfaction + delta) * 10) / 10, 0, 100);
  }

  /** Takes qty units from finished stock; returns how many of them were (secretly) defective. */
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
    purchaseCost: purchaseCost,
    processIncoming: processIncoming,
    stepOrders: stepOrders,
    addOffer: addOffer,
    offersPerDay: offersPerDay,
    orderValue: orderValue,
    changeSatisfaction: changeSatisfaction,
    pickUnits: pickUnits,
    stockOf: stockOf
  };
})(window.FM = window.FM || {});
