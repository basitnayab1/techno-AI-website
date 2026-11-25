import { FooterReveal } from "../section-motion";
import type { Metadata, Viewport } from "next";
import { ROUTE_ARRIVAL } from "../route-arrival";
import { THEME_BOOT_SCRIPT } from "../theme-preference";
import "../brand-font.css";
import "lenis/dist/lenis.css";
import "./chrome.css";
import "../social-footer.css";
import "./home.css";
import "../type-spacing.css";
import "./experience.css";

// Brand typography is self-hosted and shared with the interior pages.

export const metadata: Metadata = {
  metadataBase: new URL("https://technoai.ae"),
  alternates: { canonical: "https://technoai.ae/" },
  title: "TechnoAi Technology, AI and Procurement Company in UAE | TechnoAi",
  description:
    "Advanced technology solutions for mission critical operations: drones, robotics, satellite connectivity, AI hardware and security systems.",
  icons: {
    icon: [
      { url: "/wp-content/uploads/2026/02/icon-logo-512px-100x100.png", sizes: "32x32" },
      { url: "/wp-content/uploads/2026/02/icon-logo-512px-300x300.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = { themeColor: "#030505", colorScheme: "dark" };

export default function RedesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="stylesheet" href="/route-motion.css" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');" + ROUTE_ARRIVAL }} />
      </head>
      <body className="inner-site">{children}<FooterReveal /></body>
    </html>
  );
}
