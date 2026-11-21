/*
  Tollhaven product page: the decisions, with no DOM.
  Loaded by the theme before th-product.js, and by the tests in Node.
*/
(function (root) {
  'use strict';

  /* ---------- variants ---------- */

  // selections: one entry per option, a value string or null when not picked yet
  function variantFor(product, selections) {
    if (!selections || selections.some(function (s) { return s == null; })) return null;
    for (var i = 0; i < product.variants.length; i++) {
      var v = product.variants[i];
      var ok = true;
      for (var j = 0; j < selections.length; j++) {
        if (v.options[j] !== selections[j]) { ok = false; break; }
      }
      if (ok) return v;
    }
    return null;
  }

  // For one option, how each value looks given what is picked in the others.
  // 'available'  at least one matching variant can be bought
  // 'soldout'    matching variants exist but none can be bought
  // 'none'       no variant is made with this combination
  function valueStates(product, selections, optionIndex) {
    var values = optionValues(product, optionIndex);
    var out = {};
    values.forEach(function (value) {
      var found = false, available = false;
      product.variants.forEach(function (v) {
        if (v.options[optionIndex] !== value) return;
        for (var j = 0; j < v.options.length; j++) {
          if (j === optionIndex) continue;
          if (selections[j] != null && v.options[j] !== selections[j]) return;
        }
        found = true;
        if (v.available) available = true;
      });
      out[value] = available ? 'available' : (found ? 'soldout' : 'none');
    });
    return out;
  }

  function optionValues(product, optionIndex) {
    var seen = [];
    product.variants.forEach(function (v) {
      var value = v.options[optionIndex];
      if (seen.indexOf(value) === -1) seen.push(value);
    });
    return seen;
  }

  // The label the buy button should show, in order of what is missing.
  function buttonState(product, selections, optionNames, labels) {
    labels = labels || {};
    for (var i = 0; i < selections.length; i++) {
      if (selections[i] == null) {
        return { disabled: false, kind: 'choose', missing: i,
          label: (labels.choose || 'Choose a {option}').replace('{option}', optionNames[i].toLowerCase()) };
      }
    }
    var v = variantFor(product, selections);
    if (!v) return { disabled: true, kind: 'none', label: labels.none || 'Not made in this size' };
    if (!v.available) return { disabled: true, kind: 'soldout', label: labels.soldout || 'Sold out', variant: v };
    return { disabled: false, kind: 'add', label: labels.add || 'Add to cart', variant: v };
  }

  /* ---------- size ---------- */

  var CM_PER_IN = 2.54;
  function toCm(inches) { return Math.round(inches * CM_PER_IN); }
  function toIn(cm) { return Math.round((cm / CM_PER_IN) * 4) / 4; }

  function formatMeasure(value, unit) {
    if (Array.isArray(value)) return formatMeasure(value[0], unit) + '–' + formatMeasure(value[1], unit);
    if (unit === 'cm') return String(toCm(value));
    var q = Math.round(value * 4), whole = Math.floor(q / 4), frac = ['', '¼', '½', '¾'][q % 4];
    return (whole ? String(whole) : (frac ? '' : '0')) + frac;
  }

  // chart.body.waist: [[min,max], ...] in inches, one per size in chart.sizes
  // chart.lengths: [{ name, inseam, fits: [min,max] }]
  // input: { waist, inseam, unit: 'in'|'cm' }
  function recommend(chart, input) {
    var unit = input.unit === 'cm' ? 'cm' : 'in';
    var waist = Number(input.waist), inseam = Number(input.inseam);
    var res = { size: null, alt: null, length: null, notes: [] };
    if (waist > 0) {
      if (unit === 'cm') waist = waist / CM_PER_IN;
      var ranges = chart.body.waist;
      var idx = -1;
      for (var i = 0; i < ranges.length; i++) {
        if (waist >= ranges[i][0] - 0.01 && waist <= ranges[i][1] + 0.01) { idx = i; break; }
        if (waist < ranges[i][0]) { idx = i; res.between = true; break; }
      }
      if (idx === -1) {
        res.notes.push('That is above the largest size in this style.');
      } else if (waist < ranges[0][0] - 1) {
        res.notes.push('That is below the smallest size in this style.');
      } else {
        res.size = chart.sizes[idx];
        if (res.between && idx > 0) {
          res.alt = chart.sizes[idx - 1];
          res.notes.push('You are between ' + res.alt + ' and ' + res.size + '. Take ' + res.size + ' for room, or ' + res.alt + ' if you like a close fit; the waistband has about ½ in of give.');
        } else if (waist > ranges[idx][1] - 0.26 && idx < ranges.length - 1) {
          res.alt = chart.sizes[idx + 1];
          res.notes.push('You are at the top of ' + res.size + '. If you wear it low or like room, ' + res.alt + ' also works.');
        }
      }
    }
    if (inseam > 0) {
      if (unit === 'cm') inseam = inseam / CM_PER_IN;
      var best = null, bestGap = Infinity;
      chart.lengths.forEach(function (l) {
        var gap = inseam < l.fits[0] ? l.fits[0] - inseam : inseam > l.fits[1] ? inseam - l.fits[1] : 0;
        if (gap < bestGap) { bestGap = gap; best = l; }
      });
      res.length = best.name;
      if (bestGap > 0.75) res.notes.push('Your inseam is outside our lengths; ' + best.name + ' is the closest and can be hemmed or let down about 1 in.');
    }
    return res;
  }

  /* ---------- delivery ---------- */

  // Calendar parts of a moment in the store's time zone.
  function zonedParts(date, timeZone) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    var p = {};
    f.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, hour: +p.hour, minute: +p.minute };
  }

  function ymd(d) { return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }

  function isWorkday(d, holidays) {
    var dow = d.getUTCDay();
    return dow !== 0 && dow !== 6 && holidays.indexOf(ymd(d)) === -1;
  }

  function addWorkdays(d, n, holidays) {
    var x = new Date(d.getTime());
    while (n > 0) { x.setUTCDate(x.getUTCDate() + 1); if (isWorkday(x, holidays)) n--; }
    return x;
  }

  // cfg: { timeZone, cutoffHour, transitMin, transitMax, holidays: ['YYYY-MM-DD'] }
  // Orders before the cutoff on a workday ship that day; otherwise the next workday.
  function deliveryWindow(now, cfg) {
    var holidays = cfg.holidays || [];
    var p = zonedParts(now, cfg.timeZone);
    var today = new Date(Date.UTC(p.y, p.m - 1, p.d));
    var beforeCutoff = p.hour < cfg.cutoffHour;
    var ship = (isWorkday(today, holidays) && beforeCutoff) ? today : addWorkdays(today, 1, holidays);
    var minutesLeft = null;
    if (ship.getTime() === today.getTime()) minutesLeft = (cfg.cutoffHour - p.hour) * 60 - p.minute;
    return {
      shipDate: ymd(ship),
      shipsToday: minutesLeft != null,
      minutesLeft: minutesLeft,
      from: ymd(addWorkdays(ship, cfg.transitMin, holidays)),
      to: ymd(addWorkdays(ship, cfg.transitMax, holidays))
    };
  }

  function formatDay(isoDay, withWeekday) {
    var d = new Date(isoDay + 'T12:00:00Z');
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: withWeekday === false ? undefined : 'short', month: 'short', day: 'numeric' }).format(d);
  }

  /* ---------- money and shipping ---------- */

  function formatMoney(cents, format) {
    var amount = (cents / 100).toFixed(2).replace(/\.00$/, '');
    return (format || '${{amount}}').replace(/\{\{\s*amount\w*\s*\}\}/, amount);
  }

  function freeShipping(subtotalCents, thresholdCents) {
    var left = Math.max(0, thresholdCents - subtotalCents);
    return { qualifies: left === 0, leftCents: left, progress: thresholdCents ? Math.min(1, subtotalCents / thresholdCents) : 1 };
  }

  var Core = {
    variantFor: variantFor, valueStates: valueStates, optionValues: optionValues, buttonState: buttonState,
    toCm: toCm, toIn: toIn, formatMeasure: formatMeasure, recommend: recommend,
    deliveryWindow: deliveryWindow, formatDay: formatDay, zonedParts: zonedParts,
    formatMoney: formatMoney, freeShipping: freeShipping
  };
  if (typeof module === 'object' && module.exports) module.exports = Core;
  else root.TollhavenCore = Core;
})(typeof self !== 'undefined' ? self : this);
