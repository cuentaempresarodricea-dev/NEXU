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

/* ══════════════════════════════════════
   GUÍA DE USUARIO — Accordion + Lightbox + PDF
   ══════════════════════════════════════ */

// ── ACCORDION ─────────────────────────
document.querySelectorAll('.guide-module-header').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var module = this.closest('.guide-module');
    var isOpen = module.classList.contains('open');
    // Close all
    document.querySelectorAll('.guide-module').forEach(function(m) {
      m.classList.remove('open');
      m.querySelector('.guide-module-header').setAttribute('aria-expanded', 'false');
    });
    // Open clicked if it was closed
    if (!isOpen) {
      module.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── LIGHTBOX ──────────────────────────
(function() {
  var lb      = document.getElementById('lightbox');
  var lbImg   = document.getElementById('lightboxImg');
  var lbCap   = document.getElementById('lightboxCaption');
  var lbClose = document.getElementById('lightboxClose');
  if (!lb) return;

  function openLightbox(src, caption) {
    lbImg.src = src;
    lbImg.alt = caption;
    lbCap.textContent = caption;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  document.querySelectorAll('.phone-mockup').forEach(function(mockup) {
    mockup.addEventListener('click', function() {
      openLightbox(this.dataset.img, this.dataset.caption);
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', function(e) {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });
})();

// ── PDF GENERATION ────────────────────
window.generateNexuPDF = function() {
  var jsPDFLib = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFLib) {
    alert('La librería PDF aún se está cargando. Intenta de nuevo en un momento.');
    return;
  }

  var btn = document.getElementById('downloadPdfTop');
  if (btn) { btn.textContent = 'Generando PDF…'; btn.disabled = true; }

  var modules = [
    {
      num: '01', title: 'Menú Principal',
      desc: 'Grid de 6 módulos: PRÉSTAMOS, CLIENTES, NUEVO PRÉSTAMO, ESTADÍSTICAS, PAGOS PENDIENTES y RUTA HOY. Punto de entrada central de la app.',
      images: ['nexu_images/image1.png', 'nexu_images/image2.png'],
      captions: ['Vista 1 — Parte superior', 'Vista 2 — Parte inferior']
    },
    {
      num: '02', title: 'Módulo de Clientes',
      desc: 'Lista de cartera con tarjetas de cliente. Formulario: ID automático, Nombre, DPI, Dirección, Teléfono, Email, GPS y foto.',
      images: ['nexu_images/image3.png', 'nexu_images/image4.png', 'nexu_images/image5.png'],
      captions: ['Lista de cartera', 'Formulario datos personales', 'Formulario GPS y foto']
    },
    {
      num: '03', title: 'Módulo de Préstamos',
      desc: 'Lista de créditos activos, formulario (monto, interés, modalidad), cuotas calculadas automáticamente y detalle PENDIENTE/PAGADO.',
      images: ['nexu_images/image6.png', 'nexu_images/image7.png', 'nexu_images/image8.png', 'nexu_images/image9.png', 'nexu_images/image10.png', 'nexu_images/image11.png'],
      captions: ['Lista créditos activos', 'Formulario Condiciones', 'Formulario Cuotas y total', 'Formulario GPS', 'Detalle Info y cuotas', 'Detalle Cuotas y resumen']
    },
    {
      num: '04', title: 'Módulo de Cajas',
      desc: 'Caja activa con saldo, ingresos, salidas y capital en campo en tiempo real. Historial contable y detalle de movimiento individual.',
      images: ['nexu_images/image12.png', 'nexu_images/image13.png', 'nexu_images/image14.png'],
      captions: ['Caja activa', 'Historial de transacciones', 'Detalle de movimiento']
    },
    {
      num: '05', title: 'Módulo de Pagos',
      desc: 'Pagos Pendientes: cuotas no cobradas para gestión de mora. Próximos Pagos: calendario de cobros futuros.',
      images: ['nexu_images/image15.png', 'nexu_images/image16.png'],
      captions: ['Cuotas por cobrar', 'Calendario de cobros futuros']
    },
    {
      num: '06', title: 'Estadísticas',
      desc: 'Panel ejecutivo: capital prestado, recuperado, pendiente y ganancias esperadas. Reporte diario.',
      images: ['nexu_images/image17.png'],
      captions: ['Resumen financiero diario']
    },
    {
      num: '07', title: 'Módulo de Ruta Hoy',
      desc: 'Rutas: Empleado 1, Admin, General, Pagos Recibidos. Cada ruta muestra clientes con monto de cuota y botón de cobro.',
      images: ['nexu_images/image18.png', 'nexu_images/image19.png', 'nexu_images/image20.png', 'nexu_images/image21.png', 'nexu_images/image22.png'],
      captions: ['Menú de rutas', 'Ruta Empleado 1', 'Ruta Admin', 'Ruta General', 'Pagos Recibidos Hoy']
    }
  ];

  // Load all images as base64 first
  function loadImgB64(src) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve({ b64: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = function() { resolve(null); };
      img.src = src;
    });
  }

  // Gather all unique image paths
  var allPaths = [];
  modules.forEach(function(m) { m.images.forEach(function(p) { if (allPaths.indexOf(p) === -1) allPaths.push(p); }); });

  Promise.all(allPaths.map(loadImgB64)).then(function(results) {
    var imgMap = {};
    allPaths.forEach(function(p, i) { imgMap[p] = results[i]; });

    var doc = new jsPDFLib({ orientation: 'p', unit: 'mm', format: 'a4' });
    var PW = 210, PH = 297;
    var margin = 16;
    var usableW = PW - margin * 2;

    // ── COVER PAGE ──
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, PW, PH, 'F');
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin, 40, 30, 30, 6, 6, 'F');
    doc.setTextColor(10, 22, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('N', margin + 15, 60, { align: 'center' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(36);
    doc.text('NEXU', margin + 38, 60);
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129);
    doc.text('Guía de Usuario', margin, 85);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Documentación oficial de la plataforma de gestión de préstamos.', margin, 94);
    doc.text('Versión 1.0 — ' + new Date().toLocaleDateString('es-GT'), margin, 101);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.line(margin, 110, PW - margin, 110);

    // ── MODULES ──
    modules.forEach(function(mod) {
      doc.addPage();
      // Header bar
      doc.setFillColor(10, 22, 40);
      doc.rect(0, 0, PW, PH, 'F');
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, PW, 18, 'F');
      doc.setTextColor(10, 22, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('NEXU — Guía de Usuario', margin, 11);
      doc.setTextColor(10, 22, 40);
      doc.setFontSize(9);
      doc.text('Módulo ' + mod.num + ': ' + mod.title, PW - margin, 11, { align: 'right' });

      // Module title
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(mod.num + '. ' + mod.title, margin, 30);

      // Description
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      var lines = doc.splitTextToSize(mod.desc, usableW);
      doc.text(lines, margin, 38);

      // Images
      var yPos = 38 + lines.length * 5 + 6;
      var cols = mod.images.length === 1 ? 1 : 2;
      var imgW = cols === 1 ? 60 : (usableW - 8) / 2;

      mod.images.forEach(function(src, idx) {
        var data = imgMap[src];
        if (!data) return;
        var ratio = data.h / data.w;
        var imgH = imgW * ratio;

        var col = idx % cols;
        var row = Math.floor(idx / cols);
        var xPos = margin + col * (imgW + 8);
        var rowY = yPos + row * (imgH + 14);

        if (rowY + imgH > PH - 20) {
          doc.addPage();
          doc.setFillColor(10, 22, 40);
          doc.rect(0, 0, PW, PH, 'F');
          rowY = 20;
        }

        // Phone frame rect
        doc.setFillColor(26, 31, 46);
        doc.setDrawColor(45, 54, 80);
        doc.roundedRect(xPos - 2, rowY - 2, imgW + 4, imgH + 4, 4, 4, 'FD');
        doc.addImage(data.b64, 'PNG', xPos, rowY, imgW, imgH);

        // Caption
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(mod.captions[idx] || '', xPos + imgW / 2, rowY + imgH + 5, { align: 'center' });
      });

      // Footer
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.2);
      doc.line(margin, PH - 12, PW - margin, PH - 12);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text('NEXU — nexuapp.com', margin, PH - 7);
      doc.text('Página ' + doc.internal.getCurrentPageInfo().pageNumber, PW - margin, PH - 7, { align: 'right' });
    });

    doc.save('NEXU_Guia_Usuario.pdf');

    // Reset buttons
    var btnTop = document.getElementById('downloadPdfTop');
    var btnBot = document.getElementById('downloadPdfBottom');
    var resetLabel = '⬇ Descargar Guía Completa en PDF';
    if (btnTop) { btnTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/></svg> Descargar Guía Completa en PDF'; btnTop.disabled = false; }
    if (btnBot) { btnBot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/></svg> Descargar Guía Completa en PDF'; btnBot.disabled = false; }
  });
};
