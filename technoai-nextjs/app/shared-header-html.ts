import { headerHtml, NAV } from "./chrome";

// Archived pages are complete HTML responses; match the React header using the same navigation data.
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>';
const openIcon = '<svg class="tai-icon-open" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M3 4h14v2H3zm0 5h14v2H3zm6 5h8v2H9z"/></svg>';
const closeIcon = '<svg class="tai-icon-close" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const header = `<header class="tai-header" data-shared-header>
  <div class="tai-header-bar">
    <a class="tai-brand" href="/" aria-label="Techno AI home"><span class="tai-logo" aria-hidden="true"></span></a>
    <nav class="tai-links tai-direct-links" aria-label="Main">${NAV.map(([label, href]) => `<a class="tai-link" href="${href}"><span class="tai-link-label"><span data-t="${label}">${label}</span></span></a>`).join("")}</nav>
    <button class="theme-toggle" type="button" data-site-theme-toggle aria-label="Switch to light mode" aria-pressed="true">${sun}</button>
    <button class="tai-burger" type="button" data-site-menu-toggle aria-label="Open menu" aria-expanded="false" aria-controls="menu">${openIcon}${closeIcon}</button>
  </div>
</header>`;

export const sharedHeaderHtml = headerHtml.slice(0, headerHtml.indexOf("<header")) + header + headerHtml.slice(headerHtml.indexOf('<div class="menu"'));
