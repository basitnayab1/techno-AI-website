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
- Sample home page: `app/redesign/` → http://localhost:3100/redesign/
  (`layout.tsx` own root layout + font, `page.tsx` content arrays, `redesign.css`, `fx.tsx` = scroll
  reveal + hero canvas animation). Text/links/logos are taken from the current home page, not rewritten.
- Direction from the owner (2026-11-12, after the first sample): wants a "full 3D" site like the
  reference reels he saved in the project root (`WhatsApp Video *.mp4` — references only, not assets):
  a realistic product film that plays with the scroll. Do it section by section, hero first, then one
  visual per service (the 6 solutions: Financial, Drone, Robotics, Satellite, Industrial, Security).
- Look (owner, 2026-11-12, reference: "WhatsApp Video ... 7.02.32 PM.mp4", a dark product site with soft
  orange glow): the WHOLE site is dark with soft glow, same concept but only brand colours — page
  background ink #0f1a1b, glow/accents aqua/teal/deep, never orange. Implemented as the "Dark glow
  theme" block at the end of redesign.css. This replaces the earlier white-background sample (the
  head's brief said white + black theme — the owner chose dark; raise it if the head objects).
- Correction from the owner (same day): not several teal tints — near-black page with a gradient/glow
  of ONE colour only (like the reference: black + one orange). Now: page #080c0d, single accent
  --accent #289fb7 (aqua/deep are aliased to it) in the "One-colour glow" block at the end of
  redesign.css. Waiting for his OK on this look / which brand colour is the one.
- FINAL palette (owner, 2026-11-12, latest): ONLY two colours — ink #0f1a1b (page) and blue #146b8c
  (glow, buttons, borders, icons). Text is white/grey (#146b8c is too dark for small text). See the
  "Two brand colours only" block at the end of redesign.css; it overrides the earlier theme blocks.
- Then "black zyada": page is now near-black #030505 (block "More black" at the end of redesign.css),
  #146b8c only as soft glow spots/buttons. Video grade for ALL generated visuals is now:
  hue=h=16,eq=brightness=-0.05:contrast=1.35:saturation=0.85,curves=all='0/0 0.25/0.13 1/1'
  (replaces the older hue=h=8 below).
- Hero (done): `app/redesign/hero-scrub.tsx` draws `public/redesign/hero/f001..f097.jpg` on a canvas,
  frame follows scroll progress of `.hero-scroll` (230vh, pinned), writes CSS var `--p` used by the
  text. Phones (<=640px) loop `public/redesign/hero-loop.mp4` instead; reduced motion = still image.
  Right side: services rail (6 icons, Drone active; others currently just link to their pages).
- Assets are generated with the owner's Magnific account (he approved; ask before each paid
  generation and quote credits). Hero: image (65 credits) -> Seedance 2.5 image-to-video, 8 s, 1080p
  (6,320 credits), prompt = slow orbit + push-in on a hovering drone, dark studio.
  Then: `ffmpeg -i src.mp4 -vf "hue=h=8,fps=12,scale=1600:-2" -q:v 5 hero/f%03d.jpg`
  (`hue=h=8` moves the green-ish render to the brand teal; keep it for every generated visual).
  Original video kept at `public/redesign/hero-source.mp4`.
- `app/redesign/three-scenes.tsx` (three.js procedural models) is written but NOT used — the owner
  wants the realistic generated look instead. Delete it (and the `three` dependency) if still unused.
- Next: owner feedback on the hero, then generate a visual per service and make the rail switch them.
  Nav/footer links still open the old-design pages; "Become a Partner" links to `/partners/`.
- The preview pane pauses CSS animations/rAF while hidden — text looking invisible in a screenshot
  there is not a bug.

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
- Not deployed anywhere yet; no git repo initialised.
- The WordPress database was never provided, so the WordPress site itself can't run locally.
