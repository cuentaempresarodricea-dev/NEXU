# NEXU Landing Page

Vanilla static landing page (Spanish). No frameworks, no build step, no package.json, no tests, no linter.

- **Entry point**: `index.html` — open directly in browser, no server needed.
- **Styling**: `styles.css` — pure CSS with custom properties (`--navy: #092652`, `--teal: #1bb9b5`, `--blue: #2572d1`, `--bg-secondary: #f8f9fc`). Qonto-inspired light design with dark accent sections. Responsive breakpoints at 1024px, 768px, 480px.
- **Scripts**: `script.js` — vanilla JS. Scroll effects, accordion, lightbox, counter animation, PDF generation (jsPDF 2.5.1 via CDN), **canvas scroll-frame animation** (200 frames from `frames/` driven by scroll progress on the hero).
- **Image assets**: `nexu_images/` (22 app screenshots), `frames/` (200 video frames `ezgif-frame-{001..200}.jpg` for hero canvas), `NEXU LOGO BY ESTER X.png` (navbar logo).
- **Sections**: Navbar (logo + nav links) → Hero (canvas frames + overlay) → Problem → Features → How it Works → Pricing (3 tiers: Starter/Growth/Enterprise) → User Guide (accordion + phone mockups + PDF) → Metrics/Testimonials → CTA → Footer.
- **Navbar**: Transparent over hero (via `filter: brightness(0) invert(1)` on logo), switches to white with shadow after 60px scroll. If the logo isn't visible on the dark hero, replace with a light/white variant.
- **No CI/CD, no tests, no formatting tools.** Deploy by copying files to any static host.
- **App name**: "NEXU", always capitalized in text.
