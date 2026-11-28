const choices = [...document.querySelectorAll('.spread-choice')];
const panels = [...document.querySelectorAll('.spread-panel')];
const steps = [...document.querySelectorAll('[data-step]')];
const pages = [...document.querySelectorAll('.contents [data-open]')];
const reader = document.querySelector('#reader');
const image = document.querySelector('#reader-image');
const paper = document.querySelector('.reader-paper');
const zoom = document.querySelector('#zoom');
const turns = [...reader.querySelectorAll('[data-turn]')];
let spread = choices.findIndex(link => link.getAttribute('aria-current') === 'true');
let page = 1;
let opener;

function showSpread(index) {
  spread = Math.max(0, Math.min(index, choices.length - 1));
  choices.forEach((choice, i) => {
    choice.setAttribute('aria-current', String(i === spread));
    panels[i].hidden = i !== spread;
  });
  for (const button of steps) {
    button.disabled = spread + Number(button.dataset.step) < 0 ||
      spread + Number(button.dataset.step) >= choices.length;
  }
  document.querySelector('#spread-status').textContent = 'Spread ' + (spread + 1) + ' of ' + choices.length;
}
choices.forEach((link, i) => link.addEventListener('click', event => {
  event.preventDefault();
  showSpread(i);
}));
steps.forEach(button => button.addEventListener('click', () => showSpread(spread + Number(button.dataset.step))));
showSpread(spread);

function setZoom(enlarged) {
  paper.classList.toggle('zoomed', enlarged);
  zoom.setAttribute('aria-pressed', String(enlarged));
  paper.scrollTo(0, 0);
}
function showPage(number) {
  page = Math.max(1, Math.min(number, pages.length));
  const name = pages[page - 1].lastChild.textContent;
  image.src = 'pages/page-' + String(page).padStart(2, '0') + '.webp';
  image.alt = 'Page ' + page + ', ' + name;
  document.querySelector('#reader-name').textContent = name;
  document.querySelector('#page-status').textContent = 'Page ' + page + ' of ' + pages.length;
  turns[0].disabled = page === 1;
  turns[1].disabled = page === pages.length;
  setZoom(false);
}
document.addEventListener('click', event => {
  const link = event.target.closest('[data-open]');
  if (!link || typeof reader.showModal !== 'function' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  opener = link;
  showPage(Number(link.dataset.open));
  reader.showModal();
  document.body.style.overflow = 'hidden';
  reader.querySelector('.close').focus();
});
reader.addEventListener('close', () => {
  document.body.style.overflow = '';
  opener?.focus({ preventScroll: true });
});
turns.forEach(button => button.addEventListener('click', () => showPage(page + Number(button.dataset.turn))));
zoom.addEventListener('click', () => setZoom(zoom.getAttribute('aria-pressed') !== 'true'));
reader.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPage(page + (event.key === 'ArrowRight' ? 1 : -1));
  } else if (event.key === 'Tab') {
    const controls = [...reader.querySelectorAll('button:not(:disabled),[tabindex="0"]')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
