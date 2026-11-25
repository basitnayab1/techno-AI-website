import { attachFooterReveal, revealOnce } from "./section-motion.mjs";
const footer = document.querySelector("footer.fo, footer, body.page-id-5518 .elementor-5518 > [data-id='07d814b']");
if (footer) attachFooterReveal(footer);
// The original Elementor home has hand-authored containers for domains and partners.
const editorial = [
  ".brand-content .brand-section:not(.brand-hero)",
  ".brand-site > .cta",
  "body.page-id-5518 .elementor-5518 > [data-id='0e34e66']",
  "body.page-id-5518 .elementor-5518 > [data-id='6fcebd8']",
];
for (const section of document.querySelectorAll(editorial.join(","))) {
  if (!section.querySelector("form, .woocommerce, [role='dialog']")) revealOnce(section);
}
