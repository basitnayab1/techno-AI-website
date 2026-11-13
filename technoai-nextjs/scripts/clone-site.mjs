// Crawls the live technoai.ae site and snapshots every page (rendered HTML) plus every
// site-hosted asset (CSS, JS, fonts, images) into this Next.js project.
//
//   node scripts/clone-site.mjs
//
// Output:
//   content/pages/*.html   rewritten page HTML (internal URLs made relative)
//   content/routes.json    { "/path/": "file.html" }
//   public/**              assets at their original paths (/wp-content/..., /wp-includes/...)
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://technoai.ae";
const HOST = "technoai.ae";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP = path.resolve(ROOT, "..", "site"); // extracted WordPress backup (used before downloading)
const PAGES_DIR = path.join(ROOT, "content", "pages");
const PUBLIC_DIR = path.join(ROOT, "public");
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
};
const MAX_PAGES = 400;
const CONCURRENCY = 6;

// Paths that are WordPress back-end or dynamic endpoints, never pages to snapshot.
const SKIP_PAGE = /^\/(wp-admin|wp-json|wp-login|xmlrpc|feed|comments\/feed|wp-content|wp-includes)|\/feed\/$|\/(cart|checkout|my-account)\/.+/;

const unescapeUrl = (s) => s.replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&#0?38;/g, "&");
const hasExt = (p) => /\.[a-z0-9]{2,5}$/i.test(p);

function normalizePagePath(p) {
  p = p.split("#")[0].split("?")[0];
  if (!p.startsWith("/")) p = "/" + p;
  if (!p.endsWith("/")) p += "/";
  return p.replace(/\/{2,}/g, "/");
}
const pageFileName = (p) => (p === "/" ? "index" : p.replace(/^\/|\/$/g, "").replace(/\//g, "__")) + ".html";

// LiteSpeed "guest mode" serves a stripped first-visit page (no Google Fonts, etc.) and then asks the
// browser to POST guest.vary.php and reload. Get that vary cookie up front so we snapshot the full page.
async function getVaryCookie() {
  const r = await fetch(`${ORIGIN}/wp-content/plugins/litespeed-cache/guest.vary.php`, { method: "POST", headers: HEADERS });
  const c = (r.headers.getSetCookie?.() || []).map((s) => s.split(";")[0]).join("; ");
  if (c) HEADERS.Cookie = c;
  console.log(c ? "Got LiteSpeed vary cookie." : "No vary cookie (guest mode off?).");
}

// Elementor loads some frontend chunks on demand (not referenced in the HTML). Copy them from the backup.
async function copyElementorRuntime() {
  const dirs = [
    ["wp-content/plugins/elementor/assets/js", /\.min\.js$/],
    ["wp-content/plugins/elementor/assets/lib", /\.(js|css|woff2?|ttf|svg|eot)$/],
    ["wp-content/plugins/elementor-pro/assets/js", /\.min\.js$/],
    // Referenced from inline CSS with commas in the file name (e.g. Inter-VariableFont_slnt,wght.woff2)
    ["wp-content/plugins/woocommerce/assets/fonts", /\.(woff2?|ttf|eot|svg)$/],
  ];
  let n = 0;
  for (const [dir, keep] of dirs) {
    const src = path.join(BACKUP, dir);
    if (!existsSync(src)) continue;
    for (const ent of await fs.readdir(src, { recursive: true, withFileTypes: true })) {
      if (!ent.isFile() || !keep.test(ent.name)) continue;
      const f = path.relative(src, path.join(ent.parentPath, ent.name));
      const dest = path.join(PUBLIC_DIR, dir, f);
      if (existsSync(dest)) continue;
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(path.join(src, f), dest);
      n++;
    }
  }
  console.log(`Copied ${n} Elementor runtime files.`);
}

async function fetchRetry(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS, redirect: "follow" });
      return r;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
}

async function pool(items, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) await worker(items[i++]);
  }));
}

// ---------- 1. Pages ----------
const assetUrls = new Set();
const pages = new Map(); // path -> html
const queue = [];
const seen = new Set();

function enqueue(p) {
  p = normalizePagePath(p);
  if (seen.has(p) || SKIP_PAGE.test(p) || hasExt(p.slice(0, -1))) return;
  seen.add(p);
  queue.push(p);
}

function collectFromHtml(html) {
  // Absolute site URLs, plain or JSON-escaped (https:\/\/technoai.ae\/...)
  const re = /(?:https?:)?(?:\\?\/){2}(?:www\.)?technoai\.ae((?:\\?\/)[^"'\s)<>,\\]*(?:\\\/[^"'\s)<>,\\]*)*)/g;
  for (const m of html.matchAll(re)) {
    const p = unescapeUrl(m[1]).split("#")[0];
    const clean = p.split("?")[0];
    if (hasExt(clean)) { if (!clean.endsWith(".php")) assetUrls.add(clean); }
    else enqueue(clean);
  }
  // Root-relative references
  for (const m of html.matchAll(/(?:src|href|data-src|data-srcset|srcset|content)=["'](\/[^"'\/][^"']*)["']/g)) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0].split("?")[0].split("#")[0];
      if (!u.startsWith("/")) continue;
      if (hasExt(u)) { if (!u.endsWith(".php")) assetUrls.add(u); } else enqueue(u);
    }
  }
}

async function loadSitemap() {
  const idx = await (await fetchRetry(`${ORIGIN}/sitemap_index.xml`)).text();
  for (const [, sm] of idx.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const xml = await (await fetchRetry(sm)).text();
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = new URL(loc);
      if (u.hostname.endsWith(HOST) && !hasExt(u.pathname)) enqueue(u.pathname);
    }
  }
}

async function crawlPages() {
  await loadSitemap();
  enqueue("/");
  while (queue.length && pages.size < MAX_PAGES) {
    const batch = queue.splice(0, CONCURRENCY);
    await Promise.all(batch.map(async (p) => {
      const r = await fetchRetry(ORIGIN + p);
      const finalPath = new URL(r.url).pathname;
      const ct = r.headers.get("content-type") || "";
      if (!r.ok || !ct.includes("text/html")) { console.log(`  skip ${p} (${r.status})`); return; }
      if (normalizePagePath(finalPath) !== p) { console.log(`  redirect ${p} -> ${finalPath}`); enqueue(finalPath); return; }
      const html = await r.text();
      pages.set(p, html);
      collectFromHtml(html);
      console.log(`  page ${pages.size}: ${p}`);
    }));
  }
  // 404 page
  const r404 = await fetchRetry(`${ORIGIN}/__nextjs-clone-404-probe__/`);
  const html404 = await r404.text();
  collectFromHtml(html404);
  return html404;
}

// ---------- 2. Assets ----------
const doneAssets = new Set();

async function saveAsset(p) {
  if (doneAssets.has(p)) return;
  doneAssets.add(p);
  let decoded;
  try { decoded = decodeURIComponent(p); } catch { decoded = p; }
  const dest = path.join(PUBLIC_DIR, decoded);
  if (!dest.startsWith(PUBLIC_DIR)) return;
  let buf;
  const local = path.join(BACKUP, decoded);
  if (!existsSync(dest)) {
    // litespeed/ holds generated combined files that may differ from the backup — always download those.
    if (!p.startsWith("/wp-content/litespeed/") && existsSync(local)) {
      buf = await fs.readFile(local);
    } else {
      const r = await fetchRetry(ORIGIN + p);
      if (!r.ok) { console.log(`  missing asset ${p} (${r.status})`); return; }
      buf = Buffer.from(await r.arrayBuffer());
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
  } else buf = await fs.readFile(dest);

  if (p.endsWith(".css")) {
    const css = buf.toString("utf8");
    const refs = [];
    for (const [, raw] of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) refs.push(raw);
    for (const [, raw] of css.matchAll(/@import\s+['"]([^'"]+)['"]/g)) refs.push(raw);
    const nested = [];
    for (const raw of refs) {
      if (raw.startsWith("data:") || raw.startsWith("#")) continue;
      let u;
      try { u = new URL(raw, ORIGIN + p); } catch { continue; }
      if (!u.hostname.endsWith(HOST)) continue;
      nested.push(u.pathname);
    }
    if (css.includes(HOST)) await fs.writeFile(dest, rewrite(css));
    await pool(nested, saveAsset);
  } else if (p.endsWith(".js") && buf.includes(HOST)) {
    await fs.writeFile(dest, rewrite(buf.toString("utf8")));
  }
}

// ---------- 3. Rewrite ----------
function rewrite(text) {
  return text
    .replace(/https?:\\\/\\\/(?:www\.)?technoai\.ae(?=\\\/|["'])/g, "")
    .replace(/https?:\/\/(?:www\.)?technoai\.ae(?=[\/"'?#\s<)])/g, "")
    .replace(/(["'(\s])\/\/(?:www\.)?technoai\.ae(?=\/)/g, "$1");
}

// Keep SEO/social tags absolute (they must point at the real domain); make everything else relative.
function rewriteHtml(html) {
  const keep = [];
  const protect = (s) => { keep.push(s); return `\u0000KEEP${keep.length - 1}\u0000`; };
  html = html
    .replace(/<link[^>]+rel=["'](?:canonical|alternate|shortlink)["'][^>]*>/gi, protect)
    .replace(/<meta[^>]+(?:property|name)=["'](?:og:|twitter:)[^>]*>/gi, protect)
    .replace(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, protect);
  html = rewrite(html);
  // LiteSpeed inlines small scripts as base64 data: URIs (Elementor config with ajaxurl/assets URLs, etc.)
  html = html.replace(/data:text\/javascript;base64,([A-Za-z0-9+/=]+)/g, (m, b64) => {
    const js = Buffer.from(b64, "base64").toString("utf8");
    const out = rewrite(js);
    return out === js ? m : `data:text/javascript;base64,${Buffer.from(out, "utf8").toString("base64")}`;
  });
  return html.replace(/\u0000KEEP(\d+)\u0000/g, (_, i) => keep[+i]);
}

// Field labels of every Elementor Pro form, so form submissions can be emailed with readable labels.
function extractForms(routes, readPage) {
  const forms = {};
  const decode = (s) => s.replace(/&#0?38;|&amp;/g, "&").replace(/&#8211;/g, "–").replace(/&quot;/g, '"').trim();
  for (const [route, file] of Object.entries(routes)) {
    const html = readPage(file);
    for (const m of html.matchAll(/<form class="elementor-form"[^>]*name="([^"]*)"[\s\S]*?<\/form>/g)) {
      const form = m[0];
      const postId = form.match(/name="post_id" value="([^"]*)"/)?.[1];
      const formId = form.match(/name="form_id" value="([^"]*)"/)?.[1];
      if (!postId || !formId) continue;
      const fields = {};
      for (const f of form.matchAll(/name="form_fields\[([^\]]+)\]"[^>]*?(?:placeholder="([^"]*)")?[^>]*>/g)) {
        const key = f[1];
        const label = form.match(new RegExp(`<label[^>]*for="form-field-${key}"[^>]*>([^<]*)<`))?.[1];
        fields[key] = { label: decode(label || f[2] || key), required: new RegExp(`name="form_fields\\[${key}\\]"[^>]*required`).test(form) };
      }
      forms[`${postId}:${formId}`] = { name: decode(m[1]), page: route, fields };
    }
  }
  return forms;
}

// --rewrite-only: re-apply URL rewriting to already-saved pages (no network).
if (process.argv.includes("--rewrite-only")) {
  const routes = JSON.parse(await fs.readFile(path.join(ROOT, "content", "routes.json"), "utf8"));
  const files = [...Object.values(routes), "_404.html"];
  for (const f of files) {
    const p = path.join(PAGES_DIR, f);
    await fs.writeFile(p, rewriteHtml(await fs.readFile(p, "utf8")));
  }
  const { readFileSync } = await import("node:fs");
  const forms = extractForms(routes, (f) => readFileSync(path.join(PAGES_DIR, f), "utf8"));
  await fs.writeFile(path.join(ROOT, "content", "forms.json"), JSON.stringify(forms, null, 2));
  console.log(`Rewrote ${files.length} pages, found ${Object.keys(forms).length} forms.`);
  process.exit(0);
}

// ---------- main ----------
await getVaryCookie();
console.log("Crawling pages...");
const html404 = await crawlPages();
await fs.rm(PAGES_DIR, { recursive: true, force: true });
await fs.mkdir(PAGES_DIR, { recursive: true });
const routes = {};
for (const [p, html] of [...pages].sort()) {
  const file = pageFileName(p);
  routes[p] = file;
  await fs.writeFile(path.join(PAGES_DIR, file), rewriteHtml(html));
}
await fs.writeFile(path.join(PAGES_DIR, "_404.html"), rewriteHtml(html404));
await fs.writeFile(path.join(ROOT, "content", "routes.json"), JSON.stringify(routes, null, 2));
const forms = extractForms(routes, (f) => rewriteHtml(pages.get(Object.keys(routes).find((r) => routes[r] === f))));
await fs.writeFile(path.join(ROOT, "content", "forms.json"), JSON.stringify(forms, null, 2));
console.log(`Saved ${pages.size} pages.`);

console.log(`Saving ${assetUrls.size} assets...`);
await pool([...assetUrls], saveAsset);
await copyElementorRuntime();
console.log(`Done. ${doneAssets.size} assets processed.`);
