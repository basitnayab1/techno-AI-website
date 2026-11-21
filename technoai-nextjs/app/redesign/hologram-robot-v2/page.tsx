import type { Metadata } from "next";
import Preview from "../hologram-robot/preview";

export const metadata: Metadata = { title: "Hologram robot · Reference study", robots: { index: false, follow: false } };
export default function ReferencePreview() { return <Preview reference />; }
