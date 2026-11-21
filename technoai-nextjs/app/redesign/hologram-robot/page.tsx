import type { Metadata } from "next";
import Preview from "./preview";

export const metadata: Metadata = { title: "Hologram robot · TechnoAI preview", robots: { index: false, follow: false } };

export default function HologramRobotPreview() {
  return <Preview />;
}
