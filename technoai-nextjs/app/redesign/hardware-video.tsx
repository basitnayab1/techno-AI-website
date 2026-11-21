"use client";

import { useEffect, useRef, useState } from "react";

export default function HardwareVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const pausedByUser = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const portrait = matchMedia("(max-width: 760px) and (orientation: portrait)");
    const updatePoster = () => {
      video.poster = `/redesign/hardware/scene-${portrait.matches ? "portrait" : "landscape"}.webp`;
    };
    updatePoster();
    let visible = false;
    const syncPlayback = () => {
      if (visible && !document.hidden && !reducedMotion.matches && !pausedByUser.current) {
        video.play().catch(() => {});
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= .5;
      syncPlayback();
    }, { threshold: .5 });

    observer.observe(video);
    const changeFormat = () => {
      updatePoster();
      video.load();
      syncPlayback();
    };
    portrait.addEventListener("change", changeFormat);
    reducedMotion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      observer.disconnect();
      portrait.removeEventListener("change", changeFormat);
      reducedMotion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, []);

  return (
    <>
    <video
      ref={ref}
      muted
      loop
      playsInline
      disablePictureInPicture
      preload="none"
      poster="/redesign/hardware/scene-landscape.webp"
      onPlaying={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      aria-label="NVIDIA Jetson Thor, Seeed Studio XIAO and Raspberry Pi product showcase"
    >
      <source media="(max-width: 760px) and (orientation: portrait)" src="/redesign/hardware/scene-portrait.mp4" type="video/mp4" />
      <source src="/redesign/hardware/scene-landscape.mp4" type="video/mp4" />
    </video>
    <button className="hw-motion-toggle" type="button" onClick={() => {
      const video = ref.current;
      if (!video) return;
      pausedByUser.current = !video.paused;
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    }}>{playing ? "Pause motion" : "Play motion"}</button>
    </>
  );
}
