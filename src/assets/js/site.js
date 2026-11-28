// Alex Mercer Projects: small progressive enhancements. The site works without this file.
(function () {
  'use strict';

  // ----- Work grid: filters and "show all" -----
  var grid = document.getElementById('work-grid');
  if (grid) {
    var items = Array.prototype.slice.call(grid.children);
    var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var moreWrap = document.getElementById('more');
    var moreBtn = moreWrap ? moreWrap.querySelector('button') : null;
    var status = document.getElementById('grid-status');
    var initial = parseInt(grid.getAttribute('data-initial') || '9', 10);
    var expanded = false;
    var moreHtml = moreBtn ? moreBtn.innerHTML : '';
    var lessHtml = moreBtn ? moreBtn.getAttribute('data-less') : '';
    var current = 'all';

    var apply = function (announce) {
      var shown = 0;
      var featuredCount = items.filter(function (li) { return li.hasAttribute('data-featured'); }).length;
      items.forEach(function (li) {
        // In "All", a featured piece is hidden from the grid because it already sits large above it.
        var isFeatured = li.hasAttribute('data-featured');
        var match = current === 'all' ? !isFeatured : li.getAttribute('data-group') === current;
        var visible = match && (current !== 'all' || expanded || shown < initial);
        li.hidden = !visible;
        if (visible) shown++;
      });
      var total = current === 'all' ? items.length : shown;
      if (moreWrap) moreWrap.hidden = current !== 'all' || (items.length - featuredCount) <= initial;
      if (moreBtn) {
        moreBtn.innerHTML = expanded ? lessHtml : moreHtml;
        moreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
      if (status && announce) {
        status.textContent = current === 'all'
          ? (expanded ? 'All ' + items.length + ' pieces.' : 'Showing ' + (shown + featuredCount) + ' of ' + items.length + ' pieces.')
          : 'Showing ' + total + (total === 1 ? ' piece' : ' pieces') + ' in this category.';
      }
    };

    var choose = function (chip, announce) {
      current = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      apply(announce);
    };
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        choose(chip, true);
        // Keep the address in step, so a filtered view can be linked to (index.html#spreadsheets).
        var slug = chip.getAttribute('data-slug');
        if (window.history && history.replaceState) history.replaceState(null, '', slug ? '#' + slug : '#work');
      });
    });

    // index.html#websites, #spreadsheets, #ads, #writing or #automation opens the work with that filter on.
    var fromHash = function () {
      var slug = (location.hash || '').slice(1).toLowerCase();
      if (slug === 'automations') slug = 'automation';
      if (!slug) return;
      var chip = chips.filter(function (c) { return c.getAttribute('data-slug') === slug; })[0];
      if (chip) choose(chip, true);
    };
    window.addEventListener('hashchange', fromHash);

    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        expanded = !expanded;
        apply(true);
        if (expanded) {
          var rest = items.filter(function (li) { return !li.hasAttribute('data-featured'); });
          var next = rest[initial] && rest[initial].querySelector('a');
          if (next) next.focus({ preventScroll: false });
        } else {
          moreBtn.scrollIntoView({ block: 'center' });
        }
      });
    }
    apply(false);
    fromHash();
  }

  // ----- Phone menu: close after choosing a link, on Escape, or on a tap outside -----
  Array.prototype.forEach.call(document.querySelectorAll('details.menu'), function (menu) {
    var summary = menu.querySelector('summary');
    menu.addEventListener('click', function (e) { if (e.target.closest('.menu__panel a')) menu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); } });
    document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  });

  // ----- Copy email -----
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    var text = btn.getAttribute('data-copy');
    var label = btn.querySelector('.copy-label');
    var statusEl = document.getElementById(btn.getAttribute('data-status') || '');
    var original = label ? label.textContent : '';
    var done = function (ok) {
      if (label) label.textContent = ok ? 'Copied' : original;
      if (statusEl) statusEl.textContent = ok ? 'Email address copied.' : 'Copy failed. The address is ' + text + '.';
      window.setTimeout(function () {
        if (label) label.textContent = original;
        if (statusEl) statusEl.textContent = '';
      }, 2600);
    };
    btn.addEventListener('click', function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
      } else { fallback(); }
    });
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
  });
})();
