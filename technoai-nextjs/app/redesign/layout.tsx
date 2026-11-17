import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./redesign.css";
import "./mission-white.css";
import "./three-colour.css"; // 3-colour white theme, no gradients (loaded last)

// Brand typeface (TechnoAi Brand Identity): Noto Sans — Light / Regular / Medium / Bold.
const noto = Noto_Sans({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TechnoAi Technology, AI and Procurement Company in UAE - TechnoAi",
  description:
    "AI, robotics, and computing hardware for real-world operations. Explore integrated systems, edge AI, automation, and deployment support.",
};

export default function RedesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={noto.className}>{children}</body>
    </html>
  );
}

