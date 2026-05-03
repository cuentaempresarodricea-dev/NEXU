/* ══════════════════════════════════════
   NEXU — script.js
   Scroll-driven frame animation + 3D parallax
   ══════════════════════════════════════ */

(function () {
  'use strict';

  // ─── CONFIG ───────────────────────────
  const TOTAL_FRAMES    = 200;
  const FRAME_PREFIX    = 'frames/ezgif-frame-';
  const PRELOAD_INITIAL = 15;   // frames preloaded on DOMContentLoaded
  const LERP_FACTOR     = 0.12; // smoothing speed (0–1)

  // ─── STATE ────────────────────────────
  const images      = new Array(TOTAL_FRAMES).fill(null);
  let   currentFrameF = 0;   // float frame index (lerped)
  let   targetFrameF  = 0;   // target frame from scroll
  let   lastRendered  = -1;  // last integer frame drawn
  let   animId        = null;
  let   canvasW = 0, canvasH = 0;
  let   nativeW = 0, nativeH = 0; // from first loaded image

  // ─── ELEMENTS ─────────────────────────
  const canvas        = document.getElementById('frameCanvas');
  const ctx           = canvas.getContext('2d');
  const heroSection   = document.getElementById('hero');
  const progressBar   = document.getElementById('frameProgressBar');
  const navbar        = document.getElementById('navbar');
  const scrollHint    = document.getElementById('scrollHint');

  // ═══════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  /** Zero-padded frame filename — e.g. 3 → "003" */
  function frameUrl(index) {
    const num = String(index + 1).padStart(3, '0');
    return `${FRAME_PREFIX}${num}.jpg`;
  }

  // ═══════════════════════════════════════
  // IMAGE LOADING
  // ═══════════════════════════════════════
  function loadFrame(index) {
    return new Promise((resolve) => {
      if (images[index]) { resolve(images[index]); return; }
      const img = new Image();
      img.onload = () => {
        images[index] = img;
        if (nativeW === 0) {
          nativeW = img.naturalWidth;
          nativeH = img.naturalHeight;
        }
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = frameUrl(index);
    });
  }

  /** Preload a range of frames lazily (non-blocking) */
  function preloadRange(start, end) {
    for (let i = start; i <= Math.min(end, TOTAL_FRAMES - 1); i++) {
      if (!images[i]) loadFrame(i); // fire-and-forget
    }
  }

  /** Initial burst preload */
  async function preloadInitial() {
    const promises = [];
    for (let i = 0; i < PRELOAD_INITIAL; i++) {
      promises.push(loadFrame(i));
    }
    await Promise.all(promises);
    // Draw frame 0 immediately
    drawFrame(0);
    // Then load the rest in the background
    preloadRange(PRELOAD_INITIAL, TOTAL_FRAMES - 1);
  }

  // ═══════════════════════════════════════
  // CANVAS DRAWING
  // ═══════════════════════════════════════
  function resizeCanvas() {
    canvasW = canvas.width  = window.innerWidth;
    canvasH = canvas.height = window.innerHeight;
  }

  function drawFrame(frameIndex) {
    const img = images[frameIndex];
    if (!img) {
      // fallback — try to find a nearby loaded frame
      for (let d = 1; d < 15; d++) {
        const fallback = images[frameIndex - d] || images[frameIndex + d];
        if (fallback) { ctx.drawImage(fallback, 0, 0, canvasW, canvasH); return; }
      }
      return;
    }
    ctx.clearRect(0, 0, canvasW, canvasH);
    // cover-fit
    const scale  = Math.max(canvasW / img.naturalWidth, canvasH / img.naturalHeight);
    const dw     = img.naturalWidth  * scale;
    const dh     = img.naturalHeight * scale;
    const dx     = (canvasW - dw) / 2;
    const dy     = (canvasH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // ═══════════════════════════════════════
  // 3D PARALLAX ON CANVAS
  // ═══════════════════════════════════════
  let parallaxProgress = 0; // 0–1 scroll progress inside hero

  function apply3DTransform(progress) {
    // rotateX: tilts backward as you scroll (0→-8deg), then returns
    const rx   = -8 * Math.sin(progress * Math.PI);
    // scale: slight zoom in the middle
    const sc   = 1 + 0.04 * Math.sin(progress * Math.PI);
    // translateZ via perspective → achieved with scale
    canvas.style.transform = `perspective(900px) rotateX(${rx}deg) scale(${sc})`;
  }

  // ═══════════════════════════════════════
  // SCROLL LOGIC
  // ═══════════════════════════════════════
  function onScroll() {
    const heroTop    = heroSection.offsetTop;
    const heroHeight = heroSection.offsetHeight;
    const scrollY    = window.scrollY;

    // Progress 0→1 through the hero scroll zone
    const raw = (scrollY - heroTop) / (heroHeight - window.innerHeight);
    parallaxProgress = clamp(raw, 0, 1);

    // Frame index 0→(TOTAL-1)
    targetFrameF = parallaxProgress * (TOTAL_FRAMES - 1);

    // Update progress bar
    if (progressBar) progressBar.style.width = (parallaxProgress * 100) + '%';

    // Hide scroll hint after a tiny scroll
    if (scrollHint && scrollY > 80) {
      scrollHint.style.opacity = '0';
      scrollHint.style.transition = 'opacity 0.4s';
    }

    // Preload upcoming frames
    const ahead = Math.floor(targetFrameF);
    preloadRange(ahead + 1, ahead + 20);
  }

  // ═══════════════════════════════════════
  // RENDER LOOP
  // ═══════════════════════════════════════
  function tick() {
    animId = requestAnimationFrame(tick);

    // Lerp current frame toward target
    currentFrameF = lerp(currentFrameF, targetFrameF, LERP_FACTOR);

    const frameIndex = clamp(Math.round(currentFrameF), 0, TOTAL_FRAMES - 1);

    if (frameIndex !== lastRendered) {
      drawFrame(frameIndex);
      lastRendered = frameIndex;
    }

    // 3D transform always updates
    apply3DTransform(parallaxProgress);
  }

  // ═══════════════════════════════════════
  // NAVBAR SCROLL EFFECT
  // ═══════════════════════════════════════
  function updateNavbar() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // ═══════════════════════════════════════
  // SCROLL REVEAL
  // ═══════════════════════════════════════
  function initReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Staggered delay for sibling elements
          const siblings = entry.target.parentElement
            ? Array.from(entry.target.parentElement.children).filter(el => el.classList.contains('reveal'))
            : [];
          const idx = siblings.indexOf(entry.target);
          const delay = idx >= 0 ? idx * 80 : 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => observer.observe(el));
  }

  // ═══════════════════════════════════════
  // COUNTER ANIMATION
  // ═══════════════════════════════════════
  function animateCounters() {
    const counters = document.querySelectorAll('.metric-value');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const dur    = 1800;
        const start  = performance.now();

        function step(now) {
          const p = Math.min((now - start) / dur, 1);
          // Ease-out cubic
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(ease * target).toLocaleString('es-MX', { maximumFractionDigits: 0 });
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => obs.observe(el));
  }

  // ═══════════════════════════════════════
  // HAMBURGER MENU
  // ═══════════════════════════════════════
  function initHamburger() {
    const btn   = document.getElementById('hamburger');
    const links = document.querySelector('.nav-links');
    if (!btn || !links) return;

    btn.addEventListener('click', () => {
      const open = links.style.display === 'flex';
      links.style.display = open ? 'none' : 'flex';
      links.style.flexDirection = 'column';
      links.style.position = 'absolute';
      links.style.top = '70px';
      links.style.left = '0';
      links.style.right = '0';
      links.style.background = 'rgba(10,22,40,0.97)';
      links.style.padding = '24px';
      links.style.gap = '20px';
      links.style.backdropFilter = 'blur(16px)';
    });

    // Close on link click
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => { links.style.display = 'none'; });
    });
  }

  // ═══════════════════════════════════════
  // HERO CONTENT FADE ON SCROLL
  // ═══════════════════════════════════════
  function updateHeroContent() {
    const content = document.getElementById('heroContent');
    if (!content) return;
    // Fade out hero text after 30% of hero scroll
    const fade = 1 - clamp((parallaxProgress - 0.1) / 0.25, 0, 1);
    const offsetY = (1 - fade) * -40;
    content.style.opacity = fade;
    // Preserve the centering transform and add scroll offset
    content.style.transform = `translateX(-50%) translateY(calc(-50% + ${offsetY}px))`;
  }

  // ─── Scroll combined handler ──────────
  function handleScroll() {
    onScroll();
    updateNavbar();
    updateHeroContent();
  }

  // ═══════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════
  async function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    await preloadInitial();

    // Kick off render loop
    tick();

    // Scroll reveal & counters
    initReveal();
    animateCounters();
    initHamburger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
