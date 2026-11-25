"use client";

import { useIPhone } from "./iphone";
import "./iphone-journey-poster.css";

const posters = {
  drone: { src: "/redesign/journey/drone-iphone.webp", width: 1440, height: 960 },
  robot: { src: "/redesign/journey/robot-iphone.webp", width: 1024, height: 1200 },
};

export default function IPhoneJourneyPoster({ slug }: { slug: string }) {
  const show = useIPhone();

  if (!show || (slug !== "drone" && slug !== "robot")) return null;
  return <img className="jx-model-poster" {...posters[slug]} alt="" loading="lazy" decoding="async" />;
}
