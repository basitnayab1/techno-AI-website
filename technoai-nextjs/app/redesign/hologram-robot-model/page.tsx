import type { Metadata } from "next";
import Preview from "../hologram-robot/preview";
export const metadata: Metadata = { title: "TechnoAI · Reference 3D robot", robots: { index: false, follow: false } };
export default function ModelPreview() { return <Preview generated />; }
