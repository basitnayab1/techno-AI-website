import "./ai-hardware.css";
import HardwareVideo from "./hardware-video";

const platforms = [
  { title: "NVIDIA Jetson", detail: "Edge AI and accelerated computing", href: "/seeed-studio-2/" },
  { title: "Seeed Studio", detail: "XIAO boards for embedded development", href: "/seeed-studio-xiao/" },
  { title: "Raspberry Pi", detail: "Single board computers for prototyping", href: "/raspberry-pi/" },
];

export default function AiHardware() {
  return (
    <section id="ai-hardware" className="hw" aria-labelledby="hw-title">
      <div className="hw-visual">
        <HardwareVideo />
        <div className="wrap hw-heading">
          <h2 id="hw-title">AI Hardware &amp; Edge Computing</h2>
        </div>
      </div>
      <div className="wrap hw-layout">
        <div className="hw-copy">
          <p>Explore the processors, embedded boards, and development kits that run AI close to where data is collected.</p>
          <ul className="hw-platforms">
            {platforms.map(({ title, detail, href }) => (
              <li key={title}>
                <a href={href}>
                  <span><strong>{title}</strong><small>{detail}</small></span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
          <a className="btn btn-line" href="/dev-kits/">Browse development kits <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  );
}
