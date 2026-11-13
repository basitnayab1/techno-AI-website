# TechnoAi website — project notes

The owner talks in Roman Urdu/Hindi. Reply in the same language, keep technical terms in English.

## What this is

A Next.js copy of the live WordPress/Elementor site **https://technoai.ae**.

**Direction changed on 2026-11-12:** the head now wants the site *redesigned* (prototype first):
unique, "AI company" look, simple and well organised, smooth animation, no flashy stuff. See
"Redesign" below. The identical clone stays as-is as the content source and for comparison — the
redesign lives beside it, don't restyle the cloned pages.

```
Techno AI main website/
├── tracking-system-backend-updated-2026-10-27.zip   original Hostinger backup (keep, never delete)
├── site/                 extracted WordPress files (no database dump in the backup)
├── technoai-nextjs/      ← the actual project
└── .claude/launch.json   preview config: "technoai-nextjs" on port 3100
```

Removed on purpose earlier (the owner asked for only the main website): the `track/` React app
(track.technoai.ae), the root `assets/` build and Hostinger's `default.php`. Don't bring them back.

## technoai-nextjs — how it works

- `scripts/clone-site.mjs` crawls the live site (sitemap + links) and saves:
  - `content/pages/*.html` — 96 pages + `_404.html`, exactly as WordPress rendered them
  - `content/routes.json` — URL → file, `content/forms.json` — Elementor Pro form field labels
  - `public/wp-content/**`, `public/wp-includes/**` — all CSS/JS/fonts/images at their original paths
  - Internal URLs are made relative (also inside LiteSpeed's base64 `data:text/javascript` scripts).
    Canonical, og:/twitter: tags and JSON-LD stay absolute to https://technoai.ae on purpose (SEO).
  - It sends LiteSpeed's `_lscache_vary` cookie (from POST guest.vary.php) — without it LiteSpeed
    serves a stripped "guest" page with missing Google Fonts.
  - Files are copied from `../site` (backup) when present, otherwise downloaded.
  - `node scripts/clone-site.mjs --rewrite-only` re-applies URL rewriting + forms.json without network.
- `app/[[...slug]]/route.ts` serves each page HTML (static, pre-rendered at build). Not React pages —
  this keeps Elementor/LiteSpeed output byte-for-byte identical. Unknown paths → site's 404 page.
- `next.config.mjs`: `trailingSlash: true` (WordPress URLs end in `/`).
- Elementor + LiteSpeed JS is "delayed": many elements appear only after the first mouse move/scroll.
  That is normal (same on live). Trigger a scroll before judging a screenshot.

## Redesign (in progress)

- Brief (from the head): copy the whole current site and redesign it; white + brand "black" theme with
  the brand accents; hero image of the home page will be replaced by a video (being made with Basit).
- Brand (from "TechnoAi Brand Identity Final.pdf"): ink `#0f1a1b` (use instead of black — the PDF's
  label on that swatch is a typo), `#9fe7e7`, `#289fb7`, `#146b8c`, white. Typeface Noto Sans
  (Light/Regular/Medium/Bold). Logo motif `//:ai`.
- The redesign IS the home page now (2026-11-13): `/` is rewritten to `/redesign/` in next.config.mjs
  (beforeFiles). The old WordPress home stays reachable at `/old-home/` (alias in route.ts).
  All other URLs still serve the old cloned pages.
- **Current design = "Mission Control" (2026-11-13)**, built after analysing cerebrium.ai, apple.com/apple-vision-pro,
  lusion.co, activetheory.net and unseen.co. Owner's rules: brand font Noto Sans + PDF colours only
  (ink #0f1a1b — page uses it a little darker, #0b1415, owner asked 2026-11-13 — blue #146b8c accent, text white/grey), and **no Magnific generation until the
  whole design is approved** — placeholders are built in code.
- Files in `app/redesign/`:
  - `data.ts` all text/links (copied from the current home page) — `SOLUTIONS[].slug` names the 3D slot.
  - `page.tsx` sections: loader → hero (real-time 3D drone over a dot field, press & hold = scan) →
    statement (words light up with scroll) → closer look (drone film frames scrub, 4 uses) →
    solutions journey (pinned, 6 stations, one 3D model each + rail) → domains + typing "mission log"
    terminal → industries (horizontal scroll) → where we are (3D dotted globe, 3 hubs) → partners
    marquee → CTA → footer with big wordmark.
  - `scenes.tsx` three.js scenes (HeroScene, JourneyScene, GlobeScene, DroneFilm).
  - `models.ts` placeholder models made of primitives (drone, robot, satellite, financial terminal,
    industrial plant, security camera). **To use a real model:** put `public/redesign/models/<slug>.glb`
    and add the slug to `REAL_MODELS` in models.ts — it replaces the placeholder, auto-scaled.
  - `fx.tsx` Lenis smooth scroll, reveal, `[data-progress]` → CSS `--p`, `[data-hscroll]`, Loader, Terminal.
  - `redesign.css` the whole look (one file, no theme override blocks any more).
- Old colour-experiment notes above this line are history; the palette rule is: #0f1a1b + #146b8c only.
- Drone film frames: `public/redesign/hero/f001..f097.jpg` (+ `hero-loop.mp4` for phones), graded with
  hue=h=16,eq=brightness=-0.05:contrast=1.35:saturation=0.85,curves=all='0/0 0.25/0.13 1/1'.
  Source: `public/redesign/hero-source.mp4` (Seedance 2.5, 6,320 credits). Magnific: ask + quote credits
  before every paid generation (models3d_generate ≈ 1,035 credits, image ≈ 65, 8 s video 6,320).
- Visual check: the in-app browser pane throttles/pauses rAF when hidden, so WebGL looks empty there.
  Use headless Chrome via CDP instead (a small node script: launch chrome --headless=new
  --remote-debugging-port, navigate, scroll with `window.lenis.scrollTo(y,{immediate:true})`,
  Page.captureScreenshot) — that is how the 2026-11-13 design was checked at 1440x900 and 390x844.
- Not done yet: real 3D models / extra videos (after approval), inner pages in the new style
  (nav/footer links still open the old cloned pages), "Become a Partner" popup form.

## Forms (work without WordPress)

- `app/wp-admin/admin-ajax.php/route.ts` replaces WordPress admin-ajax for:
  - `elementor_pro_forms_send_form` — Quotation Form (`/request-a-quote/`), Newsletter (8 news posts)
  - `elementor_pro_atomic_forms_send_form` — "Become a Partner" popup (popup id 6549 on home page)
- `lib/form-submissions.ts`: validation (required, email), rate limit 5/IP/10 min, sends email via
  nodemailer SMTP, and appends to `submissions/submissions.jsonl` as a backup.
- SMTP settings go in `technoai-nextjs/.env.local` (template: `.env.example`, Hostinger
  smtp.hostinger.com:465). **Not configured yet** — email sending is untested. The owner fills in the
  password themselves; never ask them to paste it in chat.
- `public/technoai-form-fixes.js` (injected only on pages with the atomic form) fixes bugs that also
  exist on the live site: Areas of Interest / Partnership Type options had value="", Industries
  checkboxes were never copied into the hidden `industries-values` field.

## Not working (needs a real backend)

WooCommerce cart / checkout / my-account login, site search. Shown as static snapshots.

## Commands (inside technoai-nextjs)

```bash
npm run dev        # http://localhost:3100  (port 3000 is taken by Docker on this PC)
npm run build      # don't run while dev server is running — they share .next and pages return 500
npm start
npm run clone      # re-snapshot live site after content changes in WordPress
```

## Verified so far

- `next build` passes, all 96 pages pre-rendered.
- 17 pages compared with live: same page height and title, no failed requests.
- All 3 forms submitted in the browser: success message shown, all fields saved with labels.

## Open items

- SMTP not set up → email not tested (owner said "later").
- Not deployed anywhere yet.
- Git: repo at the project root (this folder), pushed to https://github.com/dev-technoAi/Techno-AI-website
  (PUBLIC repo), branch main. Root .gitignore keeps the backup zip, site/, reference .mp4s and
  personal PDFs out — never commit them.
- The WordPress database was never provided, so the WordPress site itself can't run locally.
