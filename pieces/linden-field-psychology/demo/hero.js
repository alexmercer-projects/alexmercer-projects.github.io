/*
  Home page only: the cloud video in the top section.
*/
const film = document.getElementById('film'), last = document.getElementById('last');

// People who ask their device for less motion get the first frame and no movement
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  film.removeAttribute('autoplay');
  film.querySelectorAll('source').forEach(s => s.remove());
  film.load();
} else {
  film.setAttribute('autoplay', '');
  film.preload = 'auto';
  film.play().catch(() => {});
}

// Hold the final frame on top and dissolve it as the film restarts,
// so the loop has no visible jump
film.loop = false;
film.addEventListener('ended', () => {
  try {
    last.width = film.videoWidth;
    last.height = film.videoHeight;
    last.getContext('2d').drawImage(film, 0, 0);
    last.style.transition = 'none';
    last.style.opacity = 1;
  } catch (e) { /* no dissolve, just loop */ }
  film.currentTime = 0;
  film.play().catch(() => {});
  film.addEventListener('timeupdate', () => {
    last.style.transition = 'opacity 1.2s linear';
    last.style.opacity = 0;
  }, { once: true });
});
