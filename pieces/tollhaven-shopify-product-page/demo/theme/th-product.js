/*
  Tollhaven product page: wiring. Needs th-product-core.js loaded first.
  One instance per [data-th-product] section.
*/
(function () {
  'use strict';
  var Core = window.TollhavenCore;

  function $(root, sel) { return root.querySelector(sel); }
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function readJSON(root, sel) { var el = $(root, sel); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } }

  function ProductSection(root) {
    this.root = root;
    this.product = readJSON(root, '[data-th-json]');
    this.stock = readJSON(root, '[data-th-stock-json]') || {};
    this.chart = readJSON(root, '[data-th-chart-json]');
    this.moneyFormat = root.dataset.moneyFormat || '${{amount}}';
    this.optionNames = this.product.options.map(function (o) { return typeof o === 'string' ? o : o.name; });
    this.colorIndex = this.optionNames.indexOf(root.dataset.colorOption);
    this.sizeIndex = this.optionNames.indexOf(root.dataset.sizeOption);
    this.form = root.querySelector('#th-form-' + root.dataset.section);
    this.addBtn = $(root, '[data-th-add]');
    this.unit = 'in';
    this.selections = this.readSelections();
    this.bind();
    this.applyURLVariant();
    this.update(false);
    this.initShipping();
    this.initGuide();
    this.initSticky();
    this.initGallery();
  }

  ProductSection.prototype.readSelections = function () {
    var self = this;
    return this.optionNames.map(function (_, i) {
      var checked = $(self.root, '[data-th-option="' + i + '"] input:checked');
      return checked ? checked.value : null;
    });
  };

  ProductSection.prototype.applyURLVariant = function () {
    var id = new URLSearchParams(location.search).get('variant');
    if (!id) return;
    var v = this.product.variants.find(function (x) { return String(x.id) === id; });
    if (!v) return;
    this.selections = v.options.slice();
    this.syncInputs();
  };

  ProductSection.prototype.syncInputs = function () {
    var self = this;
    this.selections.forEach(function (value, i) {
      $$(self.root, '[data-th-option="' + i + '"] input').forEach(function (input) { input.checked = input.value === value; });
    });
  };

  ProductSection.prototype.bind = function () {
    var self = this;
    $$(this.root, '[data-th-option]').forEach(function (fs) {
      fs.addEventListener('change', function (e) {
        if (!e.target.matches('[data-th-value]')) return;
        var i = +fs.dataset.thOption;
        self.selections[i] = e.target.value;
        $(fs, '[data-th-missing]').hidden = true;
        fs.classList.remove('is-missing');
        self.update(true);
      });
    });
    if (this.form) this.form.addEventListener('submit', function (e) { e.preventDefault(); self.add(); });
  };

  ProductSection.prototype.labels = function () {
    var d = this.addBtn.dataset;
    return { add: d.labelAdd, soldout: d.labelSoldout, none: d.labelNone, choose: d.labelChoose };
  };

  ProductSection.prototype.update = function (fromUser) {
    var self = this, product = this.product, sel = this.selections;
    var hide = ($(this.root, '[data-th-picker]') || {}).dataset;
    hide = hide && hide.soldoutStyle === 'hide';

    // option states
    this.optionNames.forEach(function (name, i) {
      var states = Core.valueStates(product, sel, i);
      var fs = $(self.root, '[data-th-option="' + i + '"]');
      $$(fs, 'input').forEach(function (input) {
        var state = states[input.value] || 'none';
        var label = input.nextElementSibling;
        label.classList.toggle('is-soldout', state === 'soldout');
        label.classList.toggle('is-none', state === 'none');
        label.hidden = hide && state !== 'available' && !input.checked;
        var tag = $(label, '[data-th-state]');
        if (tag) tag.textContent = state === 'soldout' ? 'Sold out' : state === 'none' ? 'Not made' : '';
        input.setAttribute('aria-label', input.value + (state === 'soldout' ? ', sold out' : state === 'none' ? ', not made in this combination' : ''));
      });
      var picked = $(fs, '[data-th-picked]');
      if (picked) picked.textContent = sel[i] ? ': ' + sel[i] : '';
    });

    var st = Core.buttonState(product, sel, this.optionNames, this.labels());
    this.state = st;
    var v = st.variant || null;
    this.variant = v;

    // price + button
    var shown = v || product.variants.find(function (x) { return x.options[self.colorIndex] === sel[self.colorIndex]; }) || product.variants[0];
    $(this.root, '[data-th-price-now]').textContent = Core.formatMoney(shown.price, this.moneyFormat);
    var was = $(this.root, '[data-th-price-was]');
    if (was) { was.hidden = !(shown.compare_at_price > shown.price); if (!was.hidden) was.textContent = Core.formatMoney(shown.compare_at_price, this.moneyFormat); }
    $(this.addBtn, '[data-th-add-label]').textContent = st.label;
    $(this.addBtn, '[data-th-add-price]').textContent = st.kind === 'add' ? Core.formatMoney(v.price, this.moneyFormat) : '';
    this.addBtn.disabled = st.disabled;
    this.addBtn.dataset.kind = st.kind;
    var input = $(this.root, '[data-th-variant-input]');
    if (input) { input.disabled = !v; input.value = v ? v.id : ''; }

    // stock note
    var stock = $(this.root, '[data-th-stock]');
    var left = v && this.stock[v.id];
    stock.hidden = !left;
    if (left) stock.textContent = 'Only ' + left + ' left in ' + v.options.slice(1).join(' / ') + '.';

    // back in stock form
    var notify = $(this.root, '[data-th-notify]');
    if (notify) {
      notify.hidden = st.kind !== 'soldout';
      if (st.kind === 'soldout') {
        $(notify, '[data-th-notify-variant]').textContent = v.title;
        $(notify, '[data-th-notify-body]').value = 'Back in stock request: ' + product.title + ' (' + v.title + ', variant ' + v.id + ', SKU ' + (v.sku || 'n/a') + ')';
      }
    }

    // images follow the color
    if (this.colorIndex > -1 && sel[this.colorIndex]) this.showColor(sel[this.colorIndex], fromUser);

    // sticky summary
    var sum = $(this.root, '[data-th-sticky-summary]');
    if (sum) {
      var missing = self.optionNames.filter(function (n, i) { return !sel[i]; }).map(function (n) { return n.toLowerCase(); });
      var picked = sel.filter(Boolean).join(' / ');
      sum.textContent = picked + (missing.length ? (picked ? ' · ' : '') + 'pick a ' + missing.join(' and ') : '');
    }
    var sw = $(this.root, '[data-th-sticky-swatch]');
    if (sw && sel[this.colorIndex]) sw.style.background = 'var(--th-color-' + handle(sel[this.colorIndex]) + ', #bbb)';
    var sb = $(this.root, '[data-th-sticky-add]');
    if (sb) { sb.textContent = st.kind === 'add' ? st.label + ' · ' + Core.formatMoney(v.price, this.moneyFormat) : st.label; sb.disabled = st.disabled; }

    if (fromUser && v && this.root.dataset.updateUrl === 'true' && window.history && history.replaceState) {
      var url = new URL(location.href); url.searchParams.set('variant', v.id); history.replaceState(history.state, '', url.toString());
    }
    this.root.dispatchEvent(new CustomEvent('th:variant:change', { bubbles: true, detail: { variant: v, selections: sel.slice(), state: st.kind } }));
  };

  function handle(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  ProductSection.prototype.flagMissing = function (i) {
    var fs = $(this.root, '[data-th-option="' + i + '"]');
    fs.classList.add('is-missing');
    $(fs, '[data-th-missing]').hidden = false;
    fs.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    var first = $(fs, 'input'); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
  };

  ProductSection.prototype.add = function () {
    var self = this, st = this.state;
    if (st.kind === 'choose') return this.flagMissing(st.missing);
    if (st.kind !== 'add') return;
    var err = $(this.root, '[data-th-error]'); err.hidden = true;
    var detail = { variant: this.variant, quantity: 1, product: this.product };
    var evt = new CustomEvent('th:cart:add', { bubbles: true, cancelable: true, detail: detail });
    // A theme or the demo can handle the add itself by calling preventDefault().
    if (!this.root.dispatchEvent(evt)) return;
    this.addBtn.setAttribute('aria-busy', 'true');
    fetch((this.root.dataset.cartAddUrl || '/cart/add') + '.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: this.variant.id, quantity: 1 }] })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        self.addBtn.removeAttribute('aria-busy');
        if (!res.ok) { err.textContent = res.body.description || 'Could not add to cart. Please try again.'; err.hidden = false; return; }
        var done = new CustomEvent('th:cart:added', { bubbles: true, cancelable: true, detail: { item: res.body } });
        // If no cart drawer picks this up, go to the cart page.
        if (self.root.dispatchEvent(done)) location.href = '/cart';
      })
      .catch(function () { self.addBtn.removeAttribute('aria-busy'); err.textContent = 'Could not reach the store. Check your connection and try again.'; err.hidden = false; });
  };

  /* ----- gallery ----- */

  ProductSection.prototype.showColor = function (color, fromUser) {
    if (this.shownColor === color) return;
    this.shownColor = color;
    var items = $$(this.root, '[data-th-media-item]'), thumbs = $$(this.root, '[data-th-thumb]');
    var any = items.some(function (el) { return el.dataset.color === color; });
    items.forEach(function (el) { el.hidden = any && el.dataset.color !== color; });
    thumbs.forEach(function (el) { el.hidden = any && el.dataset.color !== color; });
    var stage = $(this.root, '[data-th-stage]'); if (stage) stage.scrollLeft = 0;
    this.selectThumb(thumbs.filter(function (t) { return !t.hidden; })[0]);
    this.buildDots();
  };

  ProductSection.prototype.selectThumb = function (thumb) {
    if (!thumb) return;
    $$(this.root, '[data-th-thumb]').forEach(function (t) { t.setAttribute('aria-current', t === thumb ? 'true' : 'false'); });
  };

  ProductSection.prototype.buildDots = function () {
    var dots = $(this.root, '[data-th-dots]'); if (!dots) return;
    var n = $$(this.root, '[data-th-media-item]').filter(function (el) { return !el.hidden; }).length;
    dots.innerHTML = new Array(n + 1).join('<span></span>');
    if (dots.firstChild) dots.firstChild.className = 'is-on';
  };

  ProductSection.prototype.initGallery = function () {
    var self = this, stage = $(this.root, '[data-th-stage]');
    if (!stage) return;
    $$(this.root, '[data-th-thumb]').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var target = $(self.root, '[data-th-media-item][data-media-id="' + thumb.dataset.thThumb + '"]');
        if (target) stage.scrollTo({ left: target.offsetLeft - stage.offsetLeft, top: 0, behavior: 'smooth' });
        if (target && getComputedStyle(stage).overflowX !== 'auto') target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        self.selectThumb(thumb);
      });
    });
    stage.addEventListener('scroll', function () {
      var visible = $$(self.root, '[data-th-media-item]').filter(function (el) { return !el.hidden; });
      var i = Math.round(stage.scrollLeft / Math.max(1, stage.clientWidth));
      $$(self.root, '[data-th-dots] span').forEach(function (d, j) { d.className = j === i ? 'is-on' : ''; });
      var cur = visible[i]; if (cur) self.selectThumb($(self.root, '[data-th-thumb="' + cur.dataset.mediaId + '"]'));
    }, { passive: true });
    this.buildDots();
  };

  /* ----- delivery estimate ----- */

  ProductSection.prototype.initShipping = function () {
    var el = $(this.root, '[data-th-ship]'); if (!el) return;
    var eta = $(el, '[data-th-eta]');
    var cfg = {
      timeZone: el.dataset.timeZone || 'America/New_York',
      cutoffHour: +el.dataset.cutoff || 14,
      transitMin: +el.dataset.transitMin || 2,
      transitMax: +el.dataset.transitMax || 5,
      holidays: (el.dataset.holidays || '').split(/[\s,]+/).filter(Boolean)
    };
    function render() {
      try {
        var w = Core.deliveryWindow(window.TH_NOW ? new Date(window.TH_NOW) : new Date(), cfg);
        var when = w.shipsToday
          ? 'Order in the next <b>' + (w.minutesLeft >= 60 ? Math.floor(w.minutesLeft / 60) + ' h ' : '') + (w.minutesLeft % 60) + ' min</b> and it ships today.'
          : 'Ships ' + Core.formatDay(w.shipDate) + '.';
        eta.innerHTML = when + ' Arrives <b>' + Core.formatDay(w.from) + ' to ' + Core.formatDay(w.to) + '</b> with free standard shipping.';
      } catch (e) { /* keep the fallback text */ }
    }
    render();
    setInterval(render, 60000);
  };

  /* ----- size guide ----- */

  ProductSection.prototype.initGuide = function () {
    var self = this, dlg = $(this.root, '[data-th-guide]');
    if (!dlg) return;
    // Move the dialog to <body> so theme stacking contexts can't clip it.
    document.body.appendChild(dlg);
    this.guide = dlg;
    var opener = null;
    $$(this.root, '[data-th-guide-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        opener = b;
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
        document.documentElement.classList.add('th-lock');
      });
    });
    function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('th-lock'); if (opener) opener.focus(); });
    $(dlg, '[data-th-guide-close]').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

    // tabs
    var tabs = $$(dlg, '[data-th-tab]'), panels = $$(dlg, '[data-th-panel]');
    function select(i, focus) {
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; panels[j].hidden = j !== i; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length;
        if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
          e.preventDefault();
          select(k === 'Home' ? 0 : k === 'End' ? n - 1 : (i + (k === 'ArrowRight' ? 1 : n - 1)) % n, true);
        }
      });
    });

    // units
    $$(dlg, '[data-th-unit]').forEach(function (b) {
      b.addEventListener('click', function () { self.setUnit(b.dataset.thUnit); });
    });
    this.setUnit(/^en-US$/i.test(navigator.language || 'en-US') ? 'in' : 'cm');

    // finder
    var waist = $(dlg, '[data-th-find-waist]'), inseam = $(dlg, '[data-th-find-inseam]'), out = $(dlg, '[data-th-find-result]'), apply = $(dlg, '[data-th-find-apply]');
    function run() {
      if (!self.chart) return;
      var r = Core.recommend(self.chart, { waist: waist.value, inseam: inseam.value, unit: self.unit });
      self.recommendation = r;
      if (!r.size && !r.length) { out.innerHTML = '<p class="th-find__empty">' + (r.notes[0] || 'Your size shows here as you type.') + '</p>'; apply.hidden = true; return; }
      var html = '<div class="th-find__pick">';
      if (r.size) html += '<div><span>Waist</span><strong>' + r.size + '</strong></div>';
      if (r.length) html += '<div><span>Length</span><strong>' + r.length + '</strong></div>';
      html += '</div>';
      r.notes.forEach(function (n) { html += '<p class="th-find__note">' + n + '</p>'; });
      if (r.size && r.length) {
        var sel = self.selections.slice(); sel[self.sizeIndex] = r.size; sel[self.optionNames.indexOf('Length')] = r.length;
        var v = Core.variantFor(self.product, sel);
        var color = sel[self.colorIndex] || '';
        html += '<p class="th-find__avail ' + (v && v.available ? 'is-ok' : 'is-out') + '">' + (v ? (v.available ? 'In stock in ' + color + '.' : 'Sold out in ' + color + '. You can ask to be emailed when it is back.') : 'Not made in this combination.') + '</p>';
      }
      out.innerHTML = html;
      apply.hidden = !(r.size);
    }
    waist.addEventListener('input', run); inseam.addEventListener('input', run);
    this.runFinder = run;
    apply.addEventListener('click', function () {
      var r = self.recommendation; if (!r) return;
      if (r.size) self.selections[self.sizeIndex] = r.size;
      var li = self.optionNames.indexOf('Length'); if (r.length && li > -1) self.selections[li] = r.length;
      self.syncInputs(); self.update(true); close();
    });
  };

  ProductSection.prototype.setUnit = function (unit) {
    var dlg = this.guide, prev = this.unit;
    this.unit = unit;
    $$(dlg, '[data-th-unit]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.thUnit === unit ? 'true' : 'false'); });
    $$(dlg, '[data-th-unit-label]').forEach(function (s) { s.textContent = unit; });
    $$(dlg, '[data-th-measure]').forEach(function (td) {
      var v = td.dataset.thMeasure.split(',').map(Number);
      td.textContent = Core.formatMeasure(v.length > 1 ? v : v[0], unit);
    });
    // convert anything already typed in the finder
    if (prev && prev !== unit) {
      $$(dlg, '[data-th-find] input').forEach(function (i) {
        if (!i.value) return;
        i.value = unit === 'cm' ? Core.toCm(+i.value) : Core.toIn(+i.value);
      });
      $$(dlg, '[data-th-find] input').forEach(function (i, k) { i.placeholder = unit === 'cm' ? (k ? '80' : '81') : (k ? '31.5' : '32'); });
      if (this.runFinder) this.runFinder();
    }
  };

  /* ----- sticky bar ----- */

  ProductSection.prototype.initSticky = function () {
    var bar = $(this.root, '[data-th-sticky]'); if (!bar) return;
    var self = this, queued = false, shown = false;
    var stops = $$(document, '[data-th-sticky-stop], footer.footer, .shopify-section-group-footer-group');
    // Checked on scroll (once per frame) rather than with IntersectionObserver,
    // which can miss a fast fling that jumps the button straight out of view.
    function check() {
      queued = false;
      var vh = window.innerHeight;
      var gone = self.addBtn.getBoundingClientRect().bottom < 0;
      // Tuck away once a footer fills the lower quarter of the screen.
      var atStop = stops.some(function (s) { var r = s.getBoundingClientRect(); return r.top < vh * 0.75 && r.bottom > 0; });
      var show = gone && !atStop;
      if (show === shown) return;
      shown = show;
      bar.classList.toggle('is-on', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(check); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    check();
    $(bar, '[data-th-sticky-add]').addEventListener('click', function () { self.add(); });
  };

  function init() {
    if (!Core) return;
    document.querySelectorAll('[data-th-product]').forEach(function (root) {
      if (!root._th) root._th = new ProductSection(root);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', init);
  window.TollhavenProduct = { init: init };
})();
