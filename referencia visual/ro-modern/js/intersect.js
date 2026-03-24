// ============================================================
// Liberty — intersect.js
// Fade-in via IntersectionObserver ao scrollar
// ============================================================
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) {
    // Fallback: mostrar tudo se sem suporte
    document.querySelectorAll('.fade-in').forEach(function (el) {
      el.classList.add('visible');
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in').forEach(function (el) {
    observer.observe(el);
  });
})();
