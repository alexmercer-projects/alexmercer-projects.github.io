/*
  Shared behavior for every page: the phone menu, the header edge, the booking bar
  and the specialty sections. Nothing here sends or collects any data.
*/

// Phone menu: opens and closes the full-screen link sheet
const toggle = document.querySelector('.toggle'), sheet = document.getElementById('sheet');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  sheet.hidden = !open;
  document.body.classList.toggle('menu-open', open);
}
toggle.addEventListener('click', () => setMenu(sheet.hidden));
sheet.addEventListener('click', e => { if (e.target.closest('a') || e.target === sheet) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) { setMenu(false); toggle.focus(); } });
matchMedia('(min-width: 1000px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

// The header gets a thin line once the page scrolls under it
const edge = () => document.querySelector('.bar').classList.toggle('moved', scrollY > 8);
edge();
addEventListener('scroll', edge, { passive: true });

// One booking button at a time: the header button and the phone booking bar
// step in only while no large "Request an appointment" button is on screen
const dock = document.querySelector('.dock'), seen = new Set();
const watch = new IntersectionObserver(list => {
  list.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
  dock.classList.toggle('up', !seen.size);
  document.body.classList.toggle('cta-seen', !!seen.size);
}, { rootMargin: '-84px 0px 0px 0px', threshold: .5 });
const large = document.querySelectorAll('.btn-lg');
large.length ? large.forEach(b => watch.observe(b)) : dock.classList.add('up');

// Wide screens show every specialty open. Phones fold them, with the first one open.
const folds = document.querySelectorAll('.unfold details'), wide = matchMedia('(min-width: 861px)');
const unfold = () => folds.forEach((d, i) => { d.open = wide.matches || i === 0; });
unfold();
wide.addEventListener('change', unfold);
