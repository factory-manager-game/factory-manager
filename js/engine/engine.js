/**
 * Engine entry point: creates a game and advances time.
 * Has no DOM access, so it also runs in Node (see tests/simulate.js).
 */
(function (FM) {
  'use strict';

  function newGame(seed) {
    var state = FM.State.create(seed);
    // two offers waiting on day one, so there is something to do right away
    FM.Market.addOffer(state);
    FM.Market.addOffer(state);
    FM.State.log(state, 'info', 'log.welcome', {});
    return state;
  }

  function stepMinute(state) {
    if (state.status !== 'running') return;
    var C = FM.CONFIG;

    state.t++;
    FM.Market.processIncoming(state);
    FM.Production.step(state);
    FM.Market.stepOrders(state);
    FM.Finance.sample(state);

    if (state.satisfaction <= C.game.minSatisfaction) {
      FM.Finance.end(state, 'lost', 'customers');
      return;
    }
    if (state.t >= state.day * C.game.minutesPerDay) FM.Finance.endOfDay(state);
  }

  /** Advances the game by a whole number of working minutes. */
  function advance(state, minutes) {
    for (var i = 0; i < minutes && state.status === 'running'; i++) stepMinute(state);
  }

  FM.Engine = {
    newGame: newGame,
    advance: advance,
    stepMinute: stepMinute
  };
})(window.FM = window.FM || {});
