/**
 * Chapter registry. Each chapter file calls FM.Chapters.register({...}).
 * A chapter's `config` is merged over the base config (src/core/config.js).
 */
(function (FM) {
  'use strict';

  var list = [];
  var byId = {};

  function register(def) {
    if (!def || !def.id) throw new Error('Chapter needs an id');
    if (byId[def.id]) throw new Error('Duplicate chapter: ' + def.id);
    byId[def.id] = def;
    list.push(def);
    list.sort(function (a, b) { return a.order - b.order; });
  }

  function get(id) {
    if (!byId[id]) throw new Error('Unknown chapter: ' + id);
    return byId[id];
  }

  FM.Chapters = { register: register, get: get, list: function () { return list.slice(); } };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
