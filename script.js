/* ============================================================
   Письмо для Маши — интерактив
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const intro = document.getElementById('intro');
  const envelope = document.getElementById('envelope');
  const letterView = document.getElementById('letterView');
  const backBtn = document.getElementById('backBtn');
  const progressBar = document.getElementById('progressBar');

  let opened = false;
  let openTimer = null;

  /* ============================================================
     1. Фоновые звёзды и тёплые искры
     ============================================================ */

  const ambient = document.getElementById('ambient');
  const actx = ambient.getContext('2d');
  let aWidth = 0;
  let aHeight = 0;
  let aDpr = 1;
  let stars = [];
  let motes = [];
  let ambientRaf = null;

  const random = (min, max) => min + Math.random() * (max - min);

  function buildAmbient() {
    const starCount = Math.min(110, Math.round((aWidth * aHeight) / 16000));
    const moteCount = Math.min(24, Math.round((aWidth * aHeight) / 90000));

    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * aWidth,
      y: Math.random() * aHeight * 0.78,
      r: random(0.4, 1.7),
      phase: random(0, Math.PI * 2),
      speed: random(0.4, 1.5),
      warm: Math.random() > 0.72
    }));

    motes = Array.from({ length: moteCount }, () => spawnMote(true));
  }

  function spawnMote(anywhere) {
    return {
      x: Math.random() * aWidth,
      y: anywhere ? random(0, aHeight) : aHeight + random(8, 90),
      r: random(0.8, 2.3),
      vx: random(-0.16, 0.16),
      vy: random(-0.34, -0.1),
      alpha: random(0.16, 0.55),
      phase: random(0, Math.PI * 2),
      hue: Math.random() > 0.5 ? '255, 178, 120' : '255, 130, 115'
    };
  }

  function drawAmbient(time) {
    actx.clearRect(0, 0, aWidth, aHeight);

    const t = time || 0;

    for (const s of stars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase));
      actx.beginPath();
      actx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      actx.fillStyle = s.warm
        ? `rgba(255, 218, 170, ${twinkle * 0.75})`
        : `rgba(255, 246, 232, ${twinkle * 0.62})`;
      actx.fill();
    }

    for (const m of motes) {
      const shimmer = 0.55 + 0.45 * Math.sin(t * 0.0012 + m.phase);
      const gradient = actx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5);
      gradient.addColorStop(0, `rgba(${m.hue}, ${m.alpha * shimmer})`);
      gradient.addColorStop(1, `rgba(${m.hue}, 0)`);
      actx.fillStyle = gradient;
      actx.beginPath();
      actx.arc(m.x, m.y, m.r * 5, 0, Math.PI * 2);
      actx.fill();
    }
  }

  function stepAmbient(time) {
    for (const m of motes) {
      m.x += m.vx;
      m.y += m.vy;
      if (m.y < -20) {
        Object.assign(m, spawnMote(false));
      }
      if (m.x < -30) m.x = aWidth + 30;
      if (m.x > aWidth + 30) m.x = -30;
    }
    drawAmbient(time);
    ambientRaf = requestAnimationFrame(stepAmbient);
  }

  function resizeAmbient() {
    aDpr = Math.min(window.devicePixelRatio || 1, 2);
    aWidth = window.innerWidth;
    aHeight = window.innerHeight;
    ambient.width = Math.round(aWidth * aDpr);
    ambient.height = Math.round(aHeight * aDpr);
    ambient.style.width = aWidth + 'px';
    ambient.style.height = aHeight + 'px';
    actx.setTransform(aDpr, 0, 0, aDpr, 0, 0);
    buildAmbient();
    drawAmbient(performance.now());
  }

  resizeAmbient();

  if (reduceMotion) {
    drawAmbient(performance.now());
  } else {
    ambientRaf = requestAnimationFrame(stepAmbient);
  }

  /* ============================================================
     2. Конверт → письмо
     ============================================================ */

  function showLetter() {
    intro.classList.add('is-gone');
    intro.setAttribute('aria-hidden', 'true');
    letterView.classList.add('is-visible');
    letterView.setAttribute('aria-hidden', 'false');
    window.scrollTo(0, 0);
    updateProgress();

    // даём браузеру отрисовать письмо, затем ставим фокус на кнопку «назад»
    window.requestAnimationFrame(() => {
      backBtn.focus({ preventScroll: true });
    });
  }

  function openLetter() {
    if (opened) return;
    opened = true;

    intro.classList.add('is-open');

    if (reduceMotion) {
      showLetter();
      return;
    }

    openTimer = window.setTimeout(showLetter, 1050);
  }

  function closeLetter() {
    if (!opened) return;
    opened = false;

    window.clearTimeout(openTimer);

    letterView.classList.remove('is-visible');
    letterView.setAttribute('aria-hidden', 'true');
    intro.classList.remove('is-gone');
    intro.removeAttribute('aria-hidden');
    window.scrollTo(0, 0);

    // конверт красиво закрывается уже после возврата
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => intro.classList.remove('is-open'));
    });

    envelope.focus({ preventScroll: true });
  }

  envelope.addEventListener('click', openLetter);
  backBtn.addEventListener('click', closeLetter);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && opened) closeLetter();
  });

  /* ============================================================
     3. Прогресс чтения
     ============================================================ */

  let progressTick = false;

  function updateProgress() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.width = (value * 100).toFixed(2) + '%';
    progressTick = false;
  }

  window.addEventListener('scroll', () => {
    if (!progressTick) {
      progressTick = true;
      window.requestAnimationFrame(updateProgress);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeAmbient._t);
    resizeAmbient._t = window.setTimeout(() => {
      resizeAmbient();
      updateProgress();
    }, 160);
  });

  /* ============================================================
     4. Появление блоков письма
     ============================================================ */

  const reveals = Array.from(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      }
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -6% 0px'
    });

    reveals.forEach((el, index) => {
      el.style.transitionDelay = Math.min(index * 55, 330) + 'ms';
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ============================================================
     5. Мелочи
     ============================================================ */

  // если страница восстановлена из кеша — возвращаемся к конверту
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      closeLetter();
      window.scrollTo(0, 0);
    }
  });
})();
