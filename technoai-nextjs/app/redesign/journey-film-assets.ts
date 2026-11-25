const base = "/redesign/journey/films";

const filmNames: Partial<Record<string, string>> = {
  satellite: "satellite-earth-4921411",
  industry: "industry-plant",
  financial: "financial-analysis",
  security: "security-shield-6225508",
};

export function journeyFilmPoster(slug: string) {
  return `${base}/${filmNames[slug] ?? slug}.webp`;
}

export const journeyWebmType = 'video/webm; codecs="vp9"';

export function journeyFilmVideo(slug: string, variant: "1080" | "2k" | "4k" = "1080", format: "mp4" | "webm" = "mp4") {
  return `${base}/${filmNames[slug] ?? slug}-${variant}.${format}`;
}

export function journeyFilmWebm(slug: string) {
  return slug === "industry" || slug === "security" ? journeyFilmVideo(slug, "1080", "webm") : undefined;
}
