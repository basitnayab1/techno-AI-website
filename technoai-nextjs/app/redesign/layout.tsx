import { FooterReveal } from "../section-motion";
import type { Metadata } from "next";
import { ROUTE_ARRIVAL } from "../route-arrival";
import { THEME_BOOT_SCRIPT } from "../theme-preference";
import { Noto_Sans } from "next/font/google";
import "./redesign.css";
import "./mission-white.css";
import "./three-colour.css"; // 3-colour white theme, no gradients
import "./effects.css"; // site-wide scroll reveals + hover lift/shadow (loaded last)
import "./footer.css";
import "../social-footer.css";

// Brand typeface (TechnoAi Brand Identity): Noto Sans — Light / Regular / Medium / Bold.
const noto = Noto_Sans({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TechnoAi Technology, AI and Procurement Company in UAE | TechnoAi",
  description:
    "AI, robotics, and computing hardware for real world operations. Explore integrated systems, edge AI, automation, and deployment support.",
  icons: {
    icon: [
      { url: "/wp-content/uploads/2026/02/icon-logo-512px-100x100.png", type: "image/png", sizes: "100x100" },
      { url: "/wp-content/uploads/2026/02/icon-logo-512px-300x300.png", type: "image/png", sizes: "300x300" },
    ],
  },
};

export default function RedesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="stylesheet" href="/route-motion.css" />
        <script dangerouslySetInnerHTML={{ __html: ROUTE_ARRIVAL }} />
      </head>
      {/* browser extensions (e.g. Grammarly) add attributes to <body> before React loads: not a real mismatch */}
      <body className={noto.className} suppressHydrationWarning>{children}<FooterReveal /></body>
    </html>
  );
}

