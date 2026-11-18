# Jilan Apps Official — Design System

Business website: `https://jilanapps.github.io/jilan-store/business/`
Stack: vanilla HTML + CSS (static GitHub Pages — no build step, no framework).
Font: **Plus Jakarta Sans** (Google Fonts, weights 400 / 600 / 700 / 800), fallback `system-ui, sans-serif`.

## 1. Design tokens (`style.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0f1e` | Page background (deep navy) |
| `--bg-2` | `#0f172a` | Alternate section background |
| `--surface` | `#111c33` | Cards, panels |
| `--surface-2` | `#16233f` | Raised / hover surface |
| `--gold` | `#e8b93c` | Primary accent, buttons, highlights |
| `--gold-soft` | `#f3d47c` | Gold text on dark, soft highlights |
| `--gold-deep` | `#c9962a` | Gold gradient end, pill text on gold |
| `--text` | `#f1f5f9` | Headings, primary text |
| `--muted` | `#a9b2c6` | Body text, secondary text |
| `--line` | `rgba(255,255,255,.08)` | Card borders |
| `--line-soft` | `rgba(255,255,255,.14)` | Stronger borders, inputs |
| `--wa` | `#25d366` | WhatsApp green (CTAs only) |
| `--wa-dark` | `#1da851` | WhatsApp hover |
| `--radius` | `16px` | Cards, panels |
| `--radius-lg` | `22px` | Hero phone, dev card |
| `--shadow-sm` | `0 4px 14px rgba(2,6,23,.35)` | Cards at rest |
| `--shadow-md` | `0 12px 34px rgba(2,6,23,.5)` | Cards on hover / hero phone |
| `--shadow-lg` | `0 24px 60px rgba(2,6,23,.6)` | Dev card, dropdown menu |

## 2. Type scale

| Token | Value | Use |
|---|---|---|
| `--fs-display` | `clamp(40px, 6.4vw, 64px)` | Hero headline (`.hero h1`) |
| `--fs-h1` | `clamp(30px, 5vw, 46px)` | Page-hero titles (inner pages) |
| `--fs-h2` | `clamp(28px, 4.4vw, 38px)` | Section titles (`.section-head h2`) |
| `--fs-h3` | `18px` | Card titles (`.card h3`, `.work-card h3`) |
| `--fs-body` | `16px` | Body text, `line-height: 1.75` |

Headings: weight 800, `letter-spacing: -.02em`, gold `<span>` inside for the
accent word. Eyebrow/kicker labels: 12–12.5px, weight 800, uppercase,
`letter-spacing: 4px`, gold. Section subtitles: 17px, muted, max-width 640px,
centred when the section head is centred.

## 3. Layout

- `.container` — `width: min(1120px, 92%)`, centred. Wide variant `.wide` = 1180px.
- Sections — `padding: 84px 0`. Alternate backgrounds: default `--bg`,
  `.section-alt` = `--bg-2` (used for stats band, process, dev card, CTA).
- Grids — `.grid-3` (3 cols, `minmax(0,1fr)`), `.grid-2`, `.work-grid`
  (2 cols, wide card spans both), `.steps-grid`, `.footer-inner`
  (`1.6fr 1fr 1.2fr`). All collapse to 1 column at the 900px / 640px
  breakpoints.
- **Mobile-first breakpoints:** `900px` (grids → 1–2 cols, hero → 1 col),
  `860px` (hamburger menu on), `640px` (single column, full-width CTAs,
  smaller hero padding).

## 4. Components

- **Header / nav** (`.nav`, sticky, `backdrop-filter: blur(14px)`,
  `background: rgba(10,15,30,.82)`): brand logo 46px (gold ring, glow shadow)
  + two-line wordmark ("Jilan Apps" / "Official" in gold, letterspaced).
  Desktop links 15px, weight 600, muted → white on hover, gold underline
  (`.active`). Nav CTA = gold pill button.
- **Hamburger** (`.nav-toggle`, shown ≤860px): 44×42px bordered button,
  3 white bars; toggles `.nav.open` on the header. Open state: `.nav-links`
  becomes an absolute dropdown panel (`top: 100%`, surface background,
  `shadow-lg`, links stacked 17px, CTA full-width). JS also closes the menu
  on link click and keeps `aria-expanded` / `aria-label` in sync.
- **Buttons** — `.btn` (pill, `padding: 15px 26px`, weight 800, 15.5px).
  `.btn-gold` (gold gradient `linear-gradient(180deg,#f3d47c,#e8b93c 55%,#d9a92f)`,
  dark text, hover lift + brighter gradient), `.btn-wa` (WhatsApp green),
  `.btn-ghost` (transparent, 1px border, hover fills surface). All lift
  `translateY(-2px)` with shadow on hover; `:focus-visible` gets a 3px gold
  outline.
- **Hero** (`.hero`): two-column grid (`1.05fr .95fr`), radial gold/blue
  glows + decorative `.orb`s. Left: kicker, display headline, subtext,
  CTA row, trust row (gold ✓ items). Right: `.hero-visual` with a CSS-only
  **phone mockup** (`.phone`, 290px, rounded 44px, gold hairline border,
  notch, Rah-e-Noor mini app screen: header, Today list, Prayer Times,
  gold "Open App" button) and two floating badges (`.hero-badge-1`
  "Live on Google Play" with green dot, `.hero-badge-2` "200+ apps built").
- **Cards** (`.card`, `.work-card`, `.step`, `.svc`): surface background,
  1px `--line` border, `--radius`, `--shadow-sm`; hover lifts `-5px`,
  border turns `rgba(232,185,60,.45)`, shadow becomes `--shadow-md`.
  Gold pill badges (`.pill`) label cards: "Live on Google Play",
  "Paid Solution", "Free Welfare App".
- **Stats band** (`.stats`): 3 columns, gold 40px numbers (count-up on
  scroll via `data-count`), muted labels.
- **Dev card** (`.dev-card`, max-width 560px): photo 132px in gold ring,
  name, role, social icon row (FB blue, TikTok black, WhatsApp green),
  email link, "Tech Links" grid (YouTube / Facebook / Instagram / Threads /
  TikTok / Website — Jilan Apps links only).
- **Footer** (`.footer-inner` 3 cols + `.footer-bottom` bar): brand + blurb,
  Explore links, Contact (WhatsApp +92 305 7867149, email, Fiverr).
- **Reveal on scroll**: elements with `.reveal` start at `opacity: 0`,
  `translateY(26px)` and fade in via IntersectionObserver (`.in` class,
  0.7s ease). `prefers-reduced-motion` disables the animation and the
  count-up.

## 5. Rules

- Dark navy brand feel throughout — no light sections.
- Never invent testimonials or client quotes (none exist in the repo —
  no testimonials section).
- Keep all facts, links, numbers and WhatsApp numbers exactly as they are.
- Keep the AdSense script and the schema.org JSON-LD in `index.html`.
- No new external assets (logo.png and dr-asif.jpg only); no `muse` string
  anywhere.
