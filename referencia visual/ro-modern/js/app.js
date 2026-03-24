// ============================================================
// Liberty — app.js
// Navbar scroll, menu mobile, tabs, scroll suave
// ============================================================
(function () {
  'use strict';

  // --- Preloader: remover após carregamento ---
  var preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', function () {
      setTimeout(function () {
        preloader.classList.add('loaded');
      }, 400);
    });
    // Fallback: remover após 3s mesmo se load não disparar
    setTimeout(function () {
      if (preloader) preloader.classList.add('loaded');
    }, 3000);
  }

  // --- Navbar: blur ao scrollar ---
  var navbar = document.getElementById('navbar');
  if (navbar) {
    var onScroll = function () {
      if (window.scrollY > 20) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // estado inicial
  }

  // --- Menu mobile (hamburger) ---
  var hamburger  = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      var bars = hamburger.querySelectorAll('span');
      if (open) {
        bars[0].style.transform = 'translateY(7px) rotate(45deg)';
        bars[1].style.opacity   = '0';
        bars[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        bars[0].style.transform = '';
        bars[1].style.opacity   = '';
        bars[2].style.transform = '';
      }
    });

    // Fechar ao clicar fora
    document.addEventListener('click', function (e) {
      if (navbar && !navbar.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        var bars = hamburger.querySelectorAll('span');
        bars[0].style.transform = '';
        bars[1].style.opacity   = '';
        bars[2].style.transform = '';
      }
    });
  }

  // --- Scroll suave para anchors internos (delegação global) ---
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash === '#') return;
    var target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Fechar menu mobile se aberto
    var mm = document.getElementById('mobile-menu');
    if (mm) mm.classList.remove('open');
  });

})();

// --- Relógio do servidor (GMT-3, estilo yanis) ---
(function () {
  function updateServerTime() {
    var now = new Date();
    var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    var server = new Date(utc + (-3 * 3600000));
    var h = String(server.getHours()).padStart(2, '0');
    var m = String(server.getMinutes()).padStart(2, '0');
    var s = String(server.getSeconds()).padStart(2, '0');
    var el = document.getElementById('server-time');
    if (el) el.textContent = h + ':' + m + ':' + s;
  }
  setInterval(updateServerTime, 1000);
  updateServerTime();
})();

function switchTab(event, tabId) {
  var container = event.target.closest('.card') || document;
  container.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
  container.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
  event.target.classList.add('active');
  var el = document.getElementById(tabId);
  if (el) el.classList.add('active');
}

// --- Carrossel de Classes — drag + auto-scroll ---
(function () {
  var carousel = document.getElementById('classCarousel');
  if (!carousel) return;

  // Drag-to-scroll
  var isDown = false, startX, scrollLeft;

  carousel.addEventListener('mousedown', function (e) {
    isDown = true;
    carousel.classList.add('dragging');
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });
  carousel.addEventListener('mouseleave', function () {
    isDown = false;
    carousel.classList.remove('dragging');
  });
  carousel.addEventListener('mouseup', function () {
    isDown = false;
    carousel.classList.remove('dragging');
  });
  carousel.addEventListener('mousemove', function (e) {
    if (!isDown) return;
    e.preventDefault();
    var x = e.pageX - carousel.offsetLeft;
    var walk = (x - startX) * 1.5;
    carousel.scrollLeft = scrollLeft - walk;
  });

  // Auto-scroll (pausa no hover)
  var autoSpeed = 1;
  var paused = false;
  var autoScrollRAF;

  function autoScroll() {
    if (!paused) {
      carousel.scrollLeft += autoSpeed;
      // Loop: se chegou ao final, volta ao início suavemente
      if (carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 2) {
        carousel.scrollLeft = 0;
      }
    }
    autoScrollRAF = requestAnimationFrame(autoScroll);
  }

  carousel.addEventListener('mouseenter', function () { paused = true; });
  carousel.addEventListener('mouseleave', function () { paused = false; });
  carousel.addEventListener('touchstart', function () { paused = true; }, { passive: true });
  carousel.addEventListener('touchend', function () {
    setTimeout(function () { paused = false; }, 2000);
  });

  // Iniciar auto-scroll
  autoScrollRAF = requestAnimationFrame(autoScroll);

  // Esconder hint após primeira interação
  var hint = document.querySelector('.carousel-hint');
  if (hint) {
    carousel.addEventListener('scroll', function () {
      if (carousel.scrollLeft > 50 && hint.style.opacity !== '0') {
        hint.style.transition = 'opacity 0.5s ease';
        hint.style.opacity = '0';
        setTimeout(function () { hint.style.display = 'none'; }, 500);
      }
    }, { passive: true });
  }
})();
