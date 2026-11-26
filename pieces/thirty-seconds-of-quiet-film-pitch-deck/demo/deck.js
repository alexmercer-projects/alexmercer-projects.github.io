(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('.frame'));
  var dots = document.querySelector('.bar-dots');
  var count = document.querySelector('.bar-count');
  var total = frames.length;
  var current = 0;
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  frames.forEach(function (f, i) {
    var a = document.createElement('a');
    a.href = '#' + f.id;
    a.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + f.getAttribute('data-name'));
    a.title = (i + 1) + '. ' + f.getAttribute('data-name');
    dots.appendChild(a);
  });
  var dotLinks = dots.querySelectorAll('a');

  function mark(i) {
    current = i;
    count.textContent = pad(i + 1) + ' / ' + total;
    for (var k = 0; k < dotLinks.length; k++) dotLinks[k].setAttribute('aria-current', k === i ? 'true' : 'false');
  }
  mark(0);

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (document.body.classList.contains('presenting')) return;
      entries.forEach(function (e) {
        if (e.isIntersecting) mark(frames.indexOf(e.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    frames.forEach(function (f) { io.observe(f); });
  }

  // Present mode
  var btn = document.querySelector('[data-present]');
  function show(i) {
    i = Math.max(0, Math.min(total - 1, i));
    frames.forEach(function (f, k) { f.classList.toggle('on', k === i); });
    mark(i);
  }
  function enter() {
    document.body.classList.add('presenting');
    show(current);
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
  }
  function leave() {
    document.body.classList.remove('presenting');
    frames.forEach(function (f) { f.classList.remove('on'); });
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    frames[current].scrollIntoView({ block: 'start' });
  }
  if (btn) btn.addEventListener('click', enter);
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && document.body.classList.contains('presenting')) leave();
  });
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('presenting')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); show(current + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(current - 1); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(total - 1);
    else if (e.key === 'Escape') leave();
  });
  document.querySelector('.deck').addEventListener('click', function (e) {
    if (!document.body.classList.contains('presenting') || e.target.closest('a')) return;
    show(e.clientX < window.innerWidth / 3 ? current - 1 : current + 1);
  });
})();
