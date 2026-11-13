import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./redesign.css";

// Brand typeface (TechnoAi Brand Identity): Noto Sans — Light / Regular / Medium / Bold.
const noto = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TechnoAi Technology, AI and Procurement Company in UAE - TechnoAi",
  description:
    "Advanced technology solutions for mission critical operations: drones, robotics, satellite connectivity, AI hardware and security systems.",
};

export default function RedesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={noto.className}>{children}</body>
    </html>
  );
}
