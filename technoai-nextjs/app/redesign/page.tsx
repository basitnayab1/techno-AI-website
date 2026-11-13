import { DOMAINS, DRONE_FILM, FOOTER, INDUSTRIES, NAV, OFFICES, PARTNERS, SOCIAL, SOLUTIONS, UP } from "./data";
import { Loader, Motion, Terminal } from "./fx";
import { DroneFilm, GlobeScene, HeroScene, JourneyScene } from "./scenes";

// New TechnoAi home page ("Mission Control"). Text and links come from the current technoai.ae
// home page. Brand: Noto Sans, ink #0f1a1b + blue #146b8c (TechnoAi Brand Identity PDF).
// 3D: placeholder models built in code (models.ts) until real .glb files are added.

const ICONS: Record<string, React.ReactNode> = {
  financial: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></>,
  drone: <><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M7 8l2.5 1.5M17 8l-2.5 1.5M7 16l2.5-1.5M17 16l-2.5-1.5" /></>,
  robot: <><rect x="4.5" y="8" width="15" height="11" rx="3" /><path d="M12 8V4.5M2.5 12.5v3M21.5 12.5v3M9.5 16h5" /><circle cx="12" cy="3.5" r="1" /><circle cx="9" cy="12.5" r="1" /><circle cx="15" cy="12.5" r="1" /></>,
  satellite: <><path d="M9.5 9.5l5 5M11 8l5 5-2.5 2.5-5-5zM8.5 5.5L5 9l2.5 2.5M18.5 15.5L15 19l-2.5-2.5M4 15a5 5 0 005 5M4 18.5A1.5 1.5 0 005.5 20M15.5 6.5l2-2" /></>,
  industry: <><path d="M3 20V10l5.5 3.5V10l5.5 3.5V5h4v15zM3 20h18M7.5 16.5h1M12 16.5h1M16.5 16.5h1" /></>,
  security: <><path d="M12 3l7.5 2.8v5.4c0 4.4-3 8-7.5 9.8-4.5-1.8-7.5-5.4-7.5-9.8V5.8z" /><path d="M9 12l2.2 2.2L15.5 10" /></>,
};

const STATEMENT =
  "Not every project needs more technology. It needs the right combination of systems, delivered and integrated properly.";

// The four uses named in the site's own "Drones & UAV Systems" text.
const DRONE_USES = ["Inspection", "Mapping", "Surveillance", "Mission support"];

const LOG = [
  "$ technoai deploy --mission critical-site",
  "› Drones & UAV Systems ........ ready",
  "› AI & Robotics ............... ready",
  "› Satellite Communication ..... linked",
  "› AI Hardware ................. online",
  "› Security & Monitoring ....... armed",
  "✓ All systems integrated.",
];

const num = (i: number) => String(i + 1).padStart(2, "0");

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ name, className = "ico" }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      <span aria-hidden="true">//:</span>
      {children}
    </p>
  );
}

/** Splits a heading into words that rise in one after another. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          <span className="w" style={{ ["--i" as string]: from + i }}>
            <span>{w}</span>
          </span>{" "}
        </span>
      ))}
    </>
  );
}

export default function Home() {
  const words = STATEMENT.split(" ");
  return (
    <>
      <Loader preload={[DRONE_FILM.poster, `${DRONE_FILM.dir}/f001.jpg`, `${UP}/2026/07/Logo.svg`]} />
      <Motion />
      <div className="glow" aria-hidden="true"><i /><i /></div>

      <header className="hd">
        <div className="wrap hd-in">
          <a className="logo" href="/" aria-label="TechnoAi home" />
          <nav className="nav" aria-label="Main">
            {NAV.map(([label, href]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </nav>
          <a className="btn btn-blue hd-cta" href="/request-a-quote/">Start a Project</a>
          <details className="menu">
            <summary aria-label="Menu"><span /><span /></summary>
            <div className="menu-panel">
              {NAV.map(([label, href]) => (
                <a key={href} href={href}>{label}</a>
              ))}
              <a className="btn btn-blue" href="/request-a-quote/">Start a Project</a>
            </div>
          </details>
        </div>
      </header>

      <main>
        {/* 1 ── Hero: real-time 3D drone over an AI dot field */}
        <section className="hero">
          <HeroScene />
          <div className="hero-fade" aria-hidden="true" />
          <div className="wrap hero-in">
            <Eyebrow>TechnoAi Advanced Solutions</Eyebrow>
            <h1>
              <Words text="Advanced Technology Solutions" />
              <span className="dim"><Words text="for Mission Critical Operations" from={3} /></span>
            </h1>
            <p className="lead rise" style={{ ["--d" as string]: "0.7s" }}>
              Delivering drones, robotics, satellite connectivity, AI hardware, security systems and
              infrastructure technology for government, enterprise and industrial sectors.
            </p>
            <div className="actions rise" style={{ ["--d" as string]: "0.85s" }}>
              <a className="btn btn-blue" href="/request-a-quote/">Start a Project <Arrow /></a>
              <a className="btn btn-line" href="#solutions">Explore Solutions</a>
            </div>
          </div>
          <div className="wrap hero-foot">
            <p className="hold"><i aria-hidden="true" /> Press &amp; hold to scan</p>
            <p className="scroll-cue">Scroll</p>
          </div>
        </section>

        {/* 2 ── Statement: words light up with the scroll (Apple) */}
        <section className="statement" data-progress>
          <div className="wrap sticky">
            <Eyebrow>Solutions Built Around Real Operations</Eyebrow>
            <p className="big" style={{ ["--n" as string]: words.length }}>
              {words.map((w, i) => (
                <span key={i} style={{ ["--i" as string]: i }}>{w} </span>
              ))}
            </p>
          </div>
        </section>

        {/* 3 ── Closer look: drone film plays with the scroll */}
        <section className="closer" data-progress data-steps={DRONE_USES.length}>
          <div className="sticky">
            <div className="wrap closer-in">
              <div className="closer-text">
                <Eyebrow>Take a closer look</Eyebrow>
                <h2>{DOMAINS[0][0]}</h2>
                <p>{DOMAINS[0][1]}</p>
                <ol className="uses">
                  {DRONE_USES.map((u, i) => (
                    <li key={u} data-i={i}>
                      <span className="n">{num(i)}</span>
                      {u}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="film-box">
                <DroneFilm count={DRONE_FILM.frames} dir={DRONE_FILM.dir} poster={DRONE_FILM.poster} video={DRONE_FILM.video} />
                <div className="film-bar"><i /></div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 ── Solutions journey: one 3D station per solution (Unseen) */}
        <section className="journey" id="solutions" data-active="0">
          <div className="sticky">
            <JourneyScene />
            <div className="wrap journey-in">
              <div className="journey-head">
                <Eyebrow>TechnoAi Solutions</Eyebrow>
                <p className="count"><b /> / {num(SOLUTIONS.length - 1)}</p>
              </div>
              <div className="stations">
                {SOLUTIONS.map((s, i) => (
                  <article className="station" data-i={i} key={s.slug}>
                    <span className="n">{num(i)}</span>
                    <h2>{s.title}</h2>
                    <p>{s.text}</p>
                    <a className="btn btn-line" href={s.href}>Learn More <Arrow /></a>
                  </article>
                ))}
              </div>
              <nav className="rail" aria-label="Solutions">
                {SOLUTIONS.map((s, i) => (
                  <a key={s.slug} href={s.href} data-i={i} aria-label={s.title}>
                    <Icon name={s.slug} />
                    <span>{s.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </section>

        {/* 5 ── Technology domains + live mission log (Cerebrium) */}
        <section className="wrap sec domains">
          <div className="domains-text">
            <div data-reveal>
              <Eyebrow>Technology Domains</Eyebrow>
              <h2>Integrated Technologies for Advanced Projects</h2>
              <p className="sub">
                TechnoAi brings together hardware, software, communication systems, and field-ready
                technologies to support complex operational requirements.
              </p>
            </div>
            <ol className="rows">
              {DOMAINS.map(([title, text], i) => (
                <li key={title} data-reveal>
                  <span className="n">{num(i)}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a className="btn btn-blue" href="/all-products/" data-reveal>View All Products <Arrow /></a>
          </div>
          <div className="domains-side" data-reveal>
            <Terminal lines={LOG} />
          </div>
        </section>

        {/* 6 ── Industries: horizontal scroll */}
        <section className="industries" data-progress data-hscroll>
          <div className="sticky">
            <div className="wrap ind-head">
              <Eyebrow>Industries We Serve</Eyebrow>
              <h2>Built for Sectors Where Reliability Matters</h2>
              <p className="sub">
                TechnoAi supports organizations that need advanced technology for monitoring, security,
                communication, automation, and field operations.
              </p>
            </div>
            <div className="h-track">
              {INDUSTRIES.map(([title, text, href], i) => (
                <a className="ind" href={href} key={href}>
                  <span className="n">{num(i)}</span>
                  <span className="ind-big" aria-hidden="true">{num(i)}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <span className="more">Learn More <Arrow /></span>
                </a>
              ))}
            </div>
            <div className="wrap h-bar" aria-hidden="true"><i /></div>
          </div>
        </section>

        {/* 7 ── Where we are: globe with the three hubs */}
        <section className="wrap sec where">
          <div className="where-text" data-reveal>
            <Eyebrow>Where We Are</Eyebrow>
            <h2>One team across three hubs</h2>
            <ul className="offices">
              {OFFICES.map((o, i) => (
                <li key={o.name}>
                  <span className="n">{num(i)}</span>
                  <div>
                    <strong>{o.name}</strong>
                    {o.place}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="where-globe" data-reveal>
            <GlobeScene />
          </div>
        </section>

        {/* 8 ── Partners */}
        <section className="sec partners">
          <div className="wrap center-head" data-reveal>
            <Eyebrow>Trusted by Organizations</Eyebrow>
            <h2>Technology Partners &amp; Clients</h2>
            <p className="sub">
              TechnoAi works with leading organizations across defense, security, maritime,
              infrastructure, research, and advanced technology sectors.
            </p>
          </div>
          <div className="marquee" data-reveal>
            <div className="track">
              {[...PARTNERS, ...PARTNERS].map(([name, src], i) => (
                <img key={i} src={`${UP}/${src}`} alt={i < PARTNERS.length ? name : ""} loading="lazy" />
              ))}
            </div>
          </div>
          <div className="wrap actions center" data-reveal>
            <a className="btn btn-blue" href="/partners/">All Partners <Arrow /></a>
            <a className="btn btn-line" href="/partners/">Become a Partner</a>
          </div>
        </section>

        {/* 9 ── Call to action */}
        <section className="wrap">
          <div className="cta" data-reveal>
            <p>
              TechnoAi pioneers advanced solutions in drones, satellite communication, and AI-driven
              technologies, delivering seamless connectivity and innovation for businesses worldwide.
            </p>
            <a className="btn btn-white" href="/request-a-quote/">Start a Project <Arrow /></a>
          </div>
        </section>
      </main>

      <footer className="ft">
        <div className="wrap ft-grid">
          <div className="ft-brand">
            <span className="logo logo-lg" role="img" aria-label="TechnoAi" />
            <p>Redefining Intelligence</p>
          </div>
          {FOOTER.map(([title, links]) => (
            <nav key={title} aria-label={title}>
              <h4>{title}</h4>
              {links.map(([label, href]) => (
                <a key={href} href={href}>{label}</a>
              ))}
            </nav>
          ))}
        </div>
        <div className="wrap ft-bottom">
          <span>technoai.ae</span>
          <div>
            {SOCIAL.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>
            ))}
          </div>
        </div>
        <div className="ft-word" aria-hidden="true">technoai</div>
      </footer>
    </>
  );
}
