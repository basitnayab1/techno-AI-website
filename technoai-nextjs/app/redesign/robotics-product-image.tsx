const widths = [320, 480, 640, 768, 1024, 1440];

export default function RoboticsProductImage({ image, alt }: { image: string; alt: string }) {
  const original = `/redesign/hardware/${image}`;
  const portrait = (width: number) => original.replace("-feature.webp", `-portrait-${width}.webp`);
  const candidates = widths.map(width => {
    const src = width === 1440 ? original : original.replace(".webp", `-${width}.webp`);
    return `${src} ${width}w`;
  }).join(", ");
  return <picture>
    <source media="(max-width: 383px)" sizes="100vw" width={640} height={1280}
      srcSet={`${portrait(480)} 480w, ${portrait(640)} 640w`} />
    <source media="(max-width: 760px)" sizes="100vw" width={768} height={1536}
      srcSet={`${portrait(480)} 480w, ${portrait(640)} 640w, ${portrait(768)} 768w`} />
    <img src={original} srcSet={candidates} sizes="100vw"
      width={1440} height={810} alt={alt} loading="lazy" decoding="async" />
  </picture>;
}
