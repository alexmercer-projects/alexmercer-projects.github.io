/* Demo-only wiring around the real section: a pretend cart, the "Try" chips,
   the notify form, and scroll reveals. The section's own code is in theme/. */
(function () {
  'use strict';
  var root = document.querySelector('[data-th-product]');
  var Core = window.TollhavenCore;
  var cart = [];
  var drawer = document.querySelector('[data-drawer]');
  var lastFocus = null;

  function money(c) { return Core.formatMoney(c); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function renderCart() {
    var total = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var count = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    var c = document.querySelector('[data-cart-count]');
    c.textContent = 'Cart (' + count + ')'; c.setAttribute('aria-label', 'Cart, ' + count + ' items');
    var ship = root.querySelector('[data-th-ship]');
    var fs = Core.freeShipping(total, +(ship && ship.dataset.freeCents) || 10000);
    document.querySelector('[data-drawer-ship]').innerHTML = (fs.qualifies ? '<b>Free shipping unlocked.</b>' : 'You\'re <b>' + money(fs.leftCents) + '</b> away from free shipping.') + '<div class="drawer__bar"><i style="width:' + Math.round(fs.progress * 100) + '%"></i></div>';
    document.querySelector('[data-drawer-items]').innerHTML = cart.map(function (i) {
      return '<li class="drawer__item"><img src="' + esc(i.img) + '" alt=""><div><b>' + esc(i.title) + '</b><span>' + esc(i.variant) + '</span><div class="drawer__qty">Qty ' + i.qty + '</div></div><span class="drawer__price">' + money(i.price * i.qty) + '</span></li>';
    }).join('');
    document.querySelector('[data-drawer-total]').textContent = money(total);
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add('th-lock');
    drawer.querySelector('.drawer__panel').focus();
  }
  function closeDrawer() {
    drawer.hidden = true;
    document.documentElement.classList.remove('th-lock');
    if (lastFocus) lastFocus.focus();
  }
  drawer.querySelectorAll('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

  // The section asks before it posts to /cart/add.js; the demo answers instead.
  root.addEventListener('th:cart:add', function (e) {
    e.preventDefault();
    var v = e.detail.variant, color = v.options[0].toLowerCase();
    var line = cart.find(function (i) { return i.id === v.id; });
    if (line) line.qty += 1;
    else cart.push({ id: v.id, title: e.detail.product.title, variant: v.title, price: v.price, qty: 1, img: 'img/field-chino-' + color + '-front.svg' });
    renderCart(); openDrawer();
  });

  // Back-in-stock form: in a store this posts to the contact inbox. Here it stays put.
  var notifyForm = root.querySelector('.th-notify__form');
  if (notifyForm) notifyForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = notifyForm.querySelector('input[type=email]');
    if (!email.checkValidity()) { email.reportValidity(); return; }
    var p = document.createElement('p');
    p.className = 'th-notify__done';
    p.setAttribute('role', 'status');
    p.textContent = 'Saved (demo only). In a store, this request goes to the contact inbox tagged back-in-stock.';
    notifyForm.replaceWith(p);
  });

  // Try chips
  function pick(i, value) {
    var input = root.querySelector('[data-th-option="' + i + '"] input[value="' + value + '"]');
    if (input && !input.checked) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  function show(sel) {
    var el = root.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
  var tries = {
    olive: function () { pick(0, 'Olive'); show('[data-th-option="1"]'); },
    none: function () { pick(0, 'Khaki'); pick(1, '38'); show('[data-th-option="2"]'); },
    soldout: function () { pick(0, 'Khaki'); pick(1, '32'); pick(2, 'Regular'); show('[data-th-buy]'); },
    low: function () { pick(0, 'Navy'); pick(1, '32'); pick(2, 'Regular'); show('[data-th-buy]'); },
    guide: function () { var b = root.querySelector('[data-th-guide-open]'); if (b) b.click(); }
  };
  document.querySelectorAll('[data-try]').forEach(function (b) {
    b.addEventListener('click', function () { tries[b.dataset.try](); });
  });

  // Reveal on scroll
  if (document.documentElement.classList.contains('anim') && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }
  renderCart();
})();
