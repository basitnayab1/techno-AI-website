const base = "/redesign/journey/films";

const filmNames: Partial<Record<string, string>> = {
  satellite: "satellite-smooth-v3",
  industry: "industry-locked-v2",
  security: "security-field-v1",
};

export function journeyFilmPoster(slug: string, mobile = false) {
  const suffix = slug === "security" && mobile ? "-mobile" : "";
  return `${base}/${filmNames[slug] ?? slug}${suffix}.webp`;
}

export function journeyFilmVideo(slug: string, mobile = false) {
  let variant = "1080";
  if (slug === "satellite" && !mobile) variant = "4k";
  if (slug === "security" && mobile) variant = "mobile";
  return `${base}/${filmNames[slug] ?? slug}-${variant}.mp4`;
}
