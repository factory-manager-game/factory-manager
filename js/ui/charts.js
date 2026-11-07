/**
 * Tiny dependency-free canvas line chart.
 * lineChart(canvas, { values, labels, color, goal, format })
 */
(function (FM) {
  'use strict';

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function lineChart(canvas, opts) {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var values = opts.values;
    if (!values.length) return;

    var pad = { l: 52, r: 10, t: 10, b: 20 };
    var all = values.concat(opts.goal !== undefined ? [opts.goal] : []).concat([0]);
    var min = Math.min.apply(null, all);
    var max = Math.max.apply(null, all);
    if (max === min) max = min + 1;
    var span = max - min;
    min -= span * 0.05; max += span * 0.08;

    var x = function (i) { return pad.l + (values.length === 1 ? 0 : i / (opts.maxPoints - 1)) * (w - pad.l - pad.r); };
    var y = function (v) { return pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b); };

    var grid = css('--chart-grid') || 'rgba(255,255,255,.07)';
    var muted = css('--text-3') || '#8892a6';
    ctx.direction = 'ltr';
    ctx.font = '11px ' + (css('--font') || 'sans-serif');
    ctx.fillStyle = muted;
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';

    for (var g = 0; g <= 3; g++) {
      var v = min + (max - min) * g / 3;
      var gy = y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
      ctx.fillText(opts.format(v), pad.l - 6, gy);
    }

    if (opts.goal !== undefined) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = css('--accent');
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(pad.l, y(opts.goal)); ctx.lineTo(w - pad.r, y(opts.goal)); ctx.stroke();
      ctx.restore();
    }

    if (min < 0) {
      ctx.save();
      ctx.strokeStyle = css('--danger');
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(pad.l, y(0)); ctx.lineTo(w - pad.r, y(0)); ctx.stroke();
      ctx.restore();
    }

    // area
    var color = opts.color;
    var grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));
    for (var i = 1; i < values.length; i++) ctx.lineTo(x(i), y(values[i]));
    ctx.lineTo(x(values.length - 1), h - pad.b);
    ctx.lineTo(x(0), h - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));
    for (var j = 1; j < values.length; j++) ctx.lineTo(x(j), y(values[j]));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    var last = values.length - 1;
    ctx.beginPath();
    ctx.arc(x(last), y(values[last]), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // x labels (days)
    if (opts.labels) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = muted;
      opts.labels.forEach(function (lab) {
        ctx.fillText(lab.text, x(lab.index), h - 4);
      });
    }
  }

  FM.Charts = { lineChart: lineChart };
})(window.FM = window.FM || {});
