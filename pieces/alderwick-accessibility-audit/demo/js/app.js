/* Alderwick audit demo: severity filter (progressive enhancement) and fade-ins. */
(function () {
  var root = document.documentElement;
  var filter = document.querySelector('.filter');
  var rows = [].slice.call(document.querySelectorAll('.ft tbody tr'));
  var status = document.getElementById('find-status');
  if (filter) {
    filter.hidden = false;
    var btns = [].slice.call(filter.querySelectorAll('button'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var sev = b.getAttribute('data-sev'), n = 0;
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        rows.forEach(function (r) { var on = sev === 'all' || r.getAttribute('data-sev') === sev; r.hidden = !on; if (on) n++; });
        status.textContent = 'Showing ' + n + (sev === 'all' ? ' findings' : ' ' + sev + ' finding' + (n === 1 ? '' : 's'));
      });
    });
    // a link to a finding that's filtered out shows everything again
    window.addEventListener('hashchange', function () {
      var t = document.getElementById(location.hash.slice(1));
      if (t && t.hidden) btns[0].click();
    });
  }
  if (root.classList.contains('anim') && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    [].slice.call(document.querySelectorAll('.rv')).forEach(function (el, i) { el.style.transitionDelay = (i % 5) * 45 + 'ms'; io.observe(el); });
  }
})();
