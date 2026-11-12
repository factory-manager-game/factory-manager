'use strict';
var FM = require('../load');

/** New game for a chapter with a fixed seed. */
function game(chapterId, seed) { return FM.Engine.newGame(chapterId || 'free', seed === undefined ? 12345 : seed); }

/** Plays a full chapter with the smart bot. */
function botGame(chapterId, seed, opts) {
  var s = game(chapterId, seed);
  FM.Bots.playToEnd(s, FM.Bots.smart, opts);
  return s;
}

/** Throws if any number anywhere in the state is NaN or infinite. */
function assertFinite(obj, where) {
  where = where || 'state';
  if (typeof obj === 'number') { if (!isFinite(obj) && obj !== -Infinity) throw new Error('Not finite at ' + where + ': ' + obj); return; }
  if (obj && typeof obj === 'object') Object.keys(obj).forEach(function (k) { assertFinite(obj[k], where + '.' + k); });
}

module.exports = { FM: FM, game: game, botGame: botGame, assertFinite: assertFinite, CHAPTERS: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'free'] };
