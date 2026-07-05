# NEXU Landing Page

Vanilla static landing page (Spanish). No frameworks, no build step, no package.json, no tests, no linter.

- **Entry point**: `index.html` — open directly in browser, no server needed.
- **Styling**: `styles.css` — pure CSS with custom properties (`--navy: #092652`, `--teal: #1bb9b5`, `--blue: #2572d1`, `--bg-secondary: #f8f9fc`). Qonto-inspired light design with dark accent sections. Responsive breakpoints at 1024px, 768px, 480px.
- **Scripts**: `script.js` — vanilla JS. Scroll effects, accordion, lightbox, counter animation, PDF generation (jsPDF 2.5.1 via CDN).
- **Image assets**: `nexu_images/` (22 app screenshots), `mujer sosteniendo el celular con el logo de NEXU.png` (hero image), `NEXU LOGO BY ESTER X.png` (navbar logo).
- **Sections**: Navbar (logo + nav links) → Hero (white split layout with image) → Problem → Features → How it Works → Pricing (3 tiers: Starter/Growth/Enterprise, 15-day free trial) → User Guide (accordion + phone mockups + PDF) → Metrics/Testimonials → CTA → Footer.
- **Footer links**: Instagram (`nexu__app`), Soporte (Calendly), Términos/Privacidad/Seguridad (Ester X SA page), Hecho por Ester X SA.
- **No CI/CD, no tests, no formatting tools.** Deploy by copying files to any static host.
- **App name**: "NEXU", always capitalized in text.
