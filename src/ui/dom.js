/**
 * DOM helpers for the UI.
 *
 * Panels are written as HTML strings and applied with patch(), which updates the
 * existing nodes in place instead of replacing them. The game re-renders panels
 * many times a second; patching keeps the button under the player's finger the same
 * element, so clicks are never lost and scroll positions stay put.
 */
(function (FM) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  function syncAttributes(from, to) {
    var i, a;
    for (i = from.attributes.length - 1; i >= 0; i--) {
      a = from.attributes[i];
      if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
    }
    for (i = 0; i < to.attributes.length; i++) {
      a = to.attributes[i];
      if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
    }
    // Live properties that attributes alone do not reset.
    if (from.tagName === 'INPUT' && from.value !== to.value && document.activeElement !== from) from.value = to.value;
    if ('disabled' in from && from.disabled !== to.disabled) from.disabled = to.disabled;
  }

  function sameKind(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType !== 1) return true;
    if (a.tagName !== b.tagName) return false;
    var ka = a.getAttribute('data-key'), kb = b.getAttribute('data-key');
    return ka === kb;
  }

  function patchChildren(parent, next) {
    var cur = parent.firstChild;
    var nxt = next.firstChild;
    while (nxt) {
      var following = nxt.nextSibling;
      if (!cur) {
        parent.appendChild(nxt);
      } else if (sameKind(cur, nxt)) {
        if (cur.nodeType === 1) {
          syncAttributes(cur, nxt);
          patchChildren(cur, nxt);
        } else if (cur.nodeValue !== nxt.nodeValue) {
          cur.nodeValue = nxt.nodeValue;
        }
        cur = cur.nextSibling;
      } else {
        parent.insertBefore(nxt, cur);
        // Drop the old node only if the next new node does not match it either.
        if (!following || !sameKind(cur, following)) {
          var old = cur;
          cur = cur.nextSibling;
          parent.removeChild(old);
        }
      }
      nxt = following;
    }
    while (cur) {
      var n = cur.nextSibling;
      parent.removeChild(cur);
      cur = n;
    }
  }

  var tpl = null;
  /** Makes `el`'s content match `html` with as few DOM changes as possible. */
  function patch(el, html) {
    if (el.__html === html) return;
    el.__html = html;
    tpl = tpl || document.createElement('template');
    tpl.innerHTML = html;
    patchChildren(el, tpl.content);
  }

  /** One click handler for a container: elements with data-act="name" call handlers[name](el, event). */
  function delegate(root, handlers) {
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (!el || !root.contains(el) || el.disabled) return;
      var fn = handlers[el.getAttribute('data-act')];
      if (fn) { e.preventDefault(); fn(el, e); }
    });
  }

  function $(sel, root) { return (root || document).querySelector(sel); }

  FM.Dom = { esc: esc, patch: patch, delegate: delegate, $: $ };
})(typeof window !== 'undefined' ? (window.FM = window.FM || {}) : (global.FM = global.FM || {}));
