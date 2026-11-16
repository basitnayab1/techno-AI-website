"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BLUE, INK, materials, modelFor, REAL_POSE, type Model } from "./models";
import { OFFICES, SOLUTIONS } from "./data";

/* ============================== shared helpers ============================== */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function createStage(canvas: HTMLCanvasElement, fov = 35, z = 8) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(0, 0.4, z);
  scene.add(new THREE.HemisphereLight(0xdfefff, INK, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rimA = new THREE.PointLight(BLUE, 140, 40);
  rimA.position.set(-4, 2, -2);
  scene.add(rimA);
  const rimB = new THREE.PointLight(BLUE, 90, 40);
  rimB.position.set(4, -1.5, -3);
  scene.add(rimB);
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const dispose = () => {
    ro.disconnect();
    scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.());
    renderer.dispose();
  };
  return { renderer, scene, camera, dispose };
}

/** Runs frame() every animation frame while `watch` is on screen. */
function runWhileVisible(watch: Element, frame: (t: number, dt: number) => void) {
  const clock = new THREE.Clock();
  let raf = 0;
  let on = false;
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    frame(clock.elapsedTime, dt);
    if (on) raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    on = e.isIntersecting;
    if (on) raf = requestAnimationFrame(tick);
  });
  io.observe(watch);
  return () => {
    on = false;
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}

/** 0..1 scroll progress of a tall (pinned) section. */
function sectionProgress(el: Element) {
  const r = el.getBoundingClientRect();
  const total = Math.max(r.height - window.innerHeight, 1);
  return Math.min(Math.max(-r.top / total, 0), 1);
}

const damp = (a: number, b: number, k: number) => a + (b - a) * k;

/* ============================== hero ============================== */

const DOT_VERT = /* glsl */ `
  uniform float uTime; uniform vec2 uMouse; uniform float uScan; uniform vec2 uScanAt;
  attribute float aRand;
  varying float vLight;
  void main() {
    vec3 p = position;
    float w = sin(p.x * .35 + uTime * .6) * .18 + sin(p.z * .45 + uTime * .45) * .14;
    float dm = distance(p.xz, uMouse);
    float lift = smoothstep(3.2, 0., dm) * .55;
    float ds = distance(p.xz, uScanAt);
    float ring = uScan * smoothstep(.9, 0., abs(ds - uScan * 9.)) ;
    p.y += w + lift + ring * .6;
    vLight = .32 + lift * 1.2 + ring * 1.6 + aRand * .2;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_PointSize = (2.4 + lift * 3. + ring * 3.) * (30. / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const DOT_FRAG = /* glsl */ `
  uniform vec3 uColor; varying float vLight;
  void main() {
    vec2 c = gl_PointCoord - .5;
    if (length(c) > .5) discard;
    vec3 col = mix(uColor, vec3(1.), clamp(vLight - .55, 0., 1.));
    gl_FragColor = vec4(col, clamp(vLight, 0., 1.));
  }`;

/** Real-time hero: placeholder (or real) robot over a field of dots; press & hold to scan. */
export function HeroScene({ particlesOnly = false }: { particlesOnly?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [noGL, setNoGL] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.closest<HTMLElement>(".hero");
    if (!canvas || !host) return;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(canvas, 35, 9);
    } catch {
      setNoGL(true);
      return;
    }
    const { scene, camera, renderer } = stage;
    const mobile = window.innerWidth < 760;

    // dot field
    const COLS = mobile ? 70 : 130;
    const ROWS = mobile ? 50 : 70;
    const pos = new Float32Array(COLS * ROWS * 3);
    const rnd = new Float32Array(COLS * ROWS);
    for (let i = 0; i < COLS; i++)
      for (let j = 0; j < ROWS; j++) {
        const k = i * ROWS + j;
        pos[k * 3] = (i - COLS / 2) * 0.32;
        pos[k * 3 + 1] = 0;
        pos[k * 3 + 2] = (j - ROWS * 0.8) * 0.32;
        rnd[k] = Math.random();
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uScan: { value: 0 },
      uScanAt: { value: new THREE.Vector2(0, 0) },
      uColor: { value: new THREE.Color(BLUE) },
    };
    const field = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({ vertexShader: DOT_VERT, fragmentShader: DOT_FRAG, uniforms, transparent: true, depthWrite: false }),
    );
    field.position.y = -1.7;
    scene.add(field);

    // drone
    const M = materials();
    const robot: Model = modelFor("robot", M);
    robot.group.visible = !particlesOnly;
    scene.add(robot.group);
    const beamMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.6, 48, 1, true), beamMat);
    beam.visible = !particlesOnly;
    scene.add(beam);

    // input
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.7);
    const hit = new THREE.Vector3();
    let holding = false;
    let scan = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      ray.setFromCamera(new THREE.Vector2(mouse.tx, -mouse.ty), camera);
      if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.set(hit.x, hit.z);
    };
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("a,button")) return;
      holding = true;
      host.classList.add("scanning");
    };
    const up = () => {
      holding = false;
      host.classList.remove("scanning");
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    host.addEventListener("pointerleave", () => uniforms.uMouse.value.set(99, 99));

    const frame = (t: number, dt: number) => {
      mouse.x = damp(mouse.x, mouse.tx, 0.05);
      mouse.y = damp(mouse.y, mouse.ty, 0.05);
      const wide = camera.aspect > 1.2;
      const p = Math.min(Math.max(window.scrollY / (host.clientHeight || 1), 0), 1);
      const intro = 1 - Math.pow(1 - Math.min(t / 2.4, 1), 3);

      uniforms.uTime.value = t;
      scan = holding ? Math.min(scan + dt * 0.55, 1) : Math.max(scan - dt * 1.4, 0);
      uniforms.uScan.value = holding ? (t * 0.45) % 1 : scan;

      const d = robot.group;
      robot.update(t);
      const bx = wide ? 2.3 : 0;
      const by = wide ? 0.5 : 1.5;
      d.scale.setScalar(wide ? 1.15 : 0.6);
      d.position.set(bx + (1 - intro) * 6 + mouse.x * 0.5, by + (1 - intro) * 2 + Math.sin(t * 1.3) * 0.12 + p * 2.4 - mouse.y * 0.25, -p * 2);
      d.rotation.set(0.18 + mouse.y * 0.18, -0.5 + mouse.x * 0.55 + Math.sin(t * 0.35) * 0.2, -mouse.x * 0.25 - (1 - intro) * 0.5);
      uniforms.uScanAt.value.set(d.position.x, d.position.z);

      beam.position.set(d.position.x, d.position.y - 1.55, d.position.z);
      beam.scale.set(1, 1, 1);
      beamMat.opacity = scan * 0.22;

      camera.position.set(mouse.x * 0.35, 0.5 - mouse.y * 0.2 + p * 0.8, 9);
      camera.lookAt(0, -0.5, 0);
      renderer.render(scene, camera);
    };
    let stop = () => {};
    if (reduced()) frame(3, 0);
    else stop = runWhileVisible(host, frame);

    return () => {
      stop();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      stage.dispose();
    };
  }, []);

  if (noGL) return null;
  return <canvas ref={ref} className="hero-gl" aria-hidden="true" />;
}

/* ============================== services journey ============================== */

/** Pinned 3D stage: scrolling moves through the six solutions, one model per station. */
export function JourneyScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const section = canvas?.closest<HTMLElement>(".journey");
    if (!canvas || !section) return;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(canvas, 32, 8.5);
    } catch {
      return;
    }
    const { scene, camera, renderer } = stage;
    const M = materials();
    const models = SOLUTIONS.map((s) => modelFor(s.slug, M));
    const holders = models.map((m) => {
      const h = new THREE.Group();
      h.add(m.group);
      h.scale.setScalar(0.001);
      scene.add(h);
      return h;
    });

    // floor rings
    const ringMat = (o: number) => new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: o, side: THREE.DoubleSide });
    const rings = [1.9, 2.5, 3.3].map((r, i) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.012, 128), ringMat(0.55 - i * 0.15));
      m.rotation.x = -Math.PI / 2;
      m.position.y = -1.75;
      scene.add(m);
      return m;
    });
    const tick = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.36, 128, 1, 0, Math.PI / 3), ringMat(0.9));
    tick.rotation.x = -Math.PI / 2;
    tick.position.y = -1.74;
    scene.add(tick);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let shown = -1;
    const n = SOLUTIONS.length;
    const frame = (t: number) => {
      const p = sectionProgress(section);
      const f = Math.min(p * n, n - 0.001);
      const idx = Math.floor(f);
      const local = f - idx; // 0..1 inside a station
      if (idx !== shown) {
        shown = idx;
        section.dataset.active = String(idx);
      }
      section.style.setProperty("--sp", local.toFixed(3));
      section.style.setProperty("--jp", p.toFixed(3));

      mouse.x = damp(mouse.x, mouse.tx, 0.05);
      mouse.y = damp(mouse.y, mouse.ty, 0.05);
      const wide = camera.aspect > 1.1;
      holders.forEach((h, i) => {
        const target = i === idx ? 1 : 0;
        const k = wide ? 1 : 0.62;
        const s = damp(h.scale.x / k, target, 0.1);
        h.scale.setScalar(Math.max(s * k, 0.001));
        h.visible = s > 0.01;
        if (!h.visible) return;
        models[i].update(t);
        const pose = models[i].real ? REAL_POSE[SOLUTIONS[i].slug] : undefined;
        const floorY = pose === "ground" && wide ? -1.75 - (models[i].base ?? 0) * h.scale.x : null; // stand on the rings
        h.position.set(wide ? 1.7 : 0, floorY ?? (wide ? 0 : pose === "ground" ? 0.8 : 1.25) + (pose === "ground" ? 0 : Math.sin(t * 1.1) * (pose ? 0.05 : 0.08)), 0);
        if (pose) {
          // real products: small turn only, so the robot face / drone camera stay in view
          h.rotation.y = -0.55 + local * 0.7 + mouse.x * 0.25 + (1 - s) * 0.8;
          h.rotation.x = (pose === "ground" ? 0.04 : 0.1) + mouse.y * 0.06;
        } else {
          h.rotation.y = local * Math.PI * 0.9 - 0.45 + mouse.x * 0.4 + (1 - s) * 1.6;
          h.rotation.x = 0.12 + mouse.y * 0.15;
        }
      });
      rings.forEach((r, i) => {
        r.position.x = wide ? 1.7 : 0;
        r.rotation.z = t * (0.1 + i * 0.05) * (i % 2 ? -1 : 1);
      });
      tick.position.x = wide ? 1.7 : 0;
      tick.rotation.z = -p * Math.PI * 2;
      camera.position.set(mouse.x * 0.3, 0.6 - mouse.y * 0.2, 8.5);
      camera.lookAt(wide ? 0.6 : 0, 0, 0);
      renderer.render(scene, camera);
    };
    let stop = () => {};
    if (reduced()) {
      section.dataset.active = "0";
      frame(2);
    } else stop = runWhileVisible(section, frame);
    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      stage.dispose();
    };
  }, []);

  return <canvas ref={ref} className="journey-gl" aria-hidden="true" />;
}

/* ============================== globe ============================== */

function latLon(lat: number, lon: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

/** Dotted globe with the three TechnoAi hubs and animated links between them. */
export function GlobeScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(canvas, 30, 9.6);
    } catch {
      return;
    }
    const { scene, camera, renderer } = stage;
    const R = 2;
    const globe = new THREE.Group();
    scene.add(globe);

    const N = 2600;
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      pts[i * 3] = Math.cos(th) * rr * R;
      pts[i * 3 + 1] = y * R;
      pts[i * 3 + 2] = Math.sin(th) * rr * R;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    globe.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.028, transparent: true, opacity: 0.45 })));
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshBasicMaterial({ color: INK, toneMapped: false })));

    const markers = OFFICES.map((o, i) => {
      const v = latLon(o.lat, o.lon, R);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.07 : 0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.position.copy(v);
      globe.add(dot);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 32), new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, side: THREE.DoubleSide }));
      halo.position.copy(v.clone().multiplyScalar(1.002));
      halo.lookAt(v.clone().multiplyScalar(2));
      globe.add(halo);
      return { v, halo };
    });
    const arcs = [
      [0, 1],
      [0, 2],
      [2, 1],
    ].map(([a, b]) => {
      const A = markers[a].v;
      const B = markers[b].v;
      const mid = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.35);
      const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
        new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.9 }),
      );
      globe.add(line);
      const runner = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      globe.add(runner);
      return { curve, runner };
    });

    // face the hubs (lon ~ 45E) towards the camera
    globe.rotation.y = -((45 + 90) * Math.PI) / 180;
    globe.rotation.x = 0.35;
    const base = globe.rotation.y;
    const drag = { on: false, x: 0, v: 0, off: 0 };
    const dn = (e: PointerEvent) => ((drag.on = true), (drag.x = e.clientX));
    const mv = (e: PointerEvent) => {
      if (!drag.on) return;
      drag.v = (e.clientX - drag.x) * 0.006;
      drag.x = e.clientX;
      drag.off += drag.v;
    };
    const upH = () => (drag.on = false);
    canvas.addEventListener("pointerdown", dn);
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", upH);

    const frame = (t: number) => {
      if (!drag.on) drag.off = damp(drag.off, Math.sin(t * 0.15) * 0.35, 0.01);
      globe.rotation.y = base + drag.off;
      markers.forEach((m, i) => m.halo.scale.setScalar(1 + ((t * 0.8 + i * 0.33) % 1) * 2.2));
      markers.forEach((m, i) => ((m.halo.material as THREE.MeshBasicMaterial).opacity = 1 - ((t * 0.8 + i * 0.33) % 1)));
      arcs.forEach((a, i) => a.runner.position.copy(a.curve.getPoint((t * 0.25 + i * 0.3) % 1)));
      renderer.render(scene, camera);
    };
    let stop = () => {};
    if (reduced()) frame(1);
    else stop = runWhileVisible(canvas, frame);
    return () => {
      stop();
      canvas.removeEventListener("pointerdown", dn);
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", upH);
      stage.dispose();
    };
  }, []);

  return <canvas ref={ref} className="globe-gl" aria-label="Globe showing TechnoAi hubs in Abu Dhabi, Prague and Lahore" role="img" />;
}

/* ============================== drone film (closer look) ============================== */

/** Draws the drone film frames on a canvas; frame follows scroll through `.closer`. Phones loop the video. */
export function DroneFilm({ count, dir, poster, video }: { count: number; dir: string; poster: string; video: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"still" | "loop" | "scrub">("still");

  useEffect(() => {
    if (reduced()) return;
    setMode(window.innerWidth < 760 ? "loop" : "scrub");
  }, []);

  useEffect(() => {
    if (mode !== "scrub") return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    const section = canvas?.closest<HTMLElement>(".closer");
    if (!canvas || !ctx || !section) return;
    const frames: (HTMLImageElement | null)[] = new Array(count).fill(null);
    let drawn = -1;
    for (let i = 0; i < count; i++) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        frames[i] = img;
        if (i === 0) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          drawn = -1;
        }
      };
      img.src = `${dir}/f${String(i + 1).padStart(3, "0")}.jpg`;
    }
    let cur = 0;
    const stop = runWhileVisible(section, () => {
      const target = sectionProgress(section) * (count - 1);
      cur = damp(cur, target, 0.15);
      let i = Math.round(cur);
      while (i > 0 && !frames[i]) i--;
      if (frames[i] && i !== drawn) {
        ctx.drawImage(frames[i]!, 0, 0, canvas.width, canvas.height);
        drawn = i;
        canvas.classList.add("ready");
      }
    });
    return stop;
  }, [mode, count, dir]);

  return (
    <>
      {mode === "loop" ? (
        <video className="film" src={video} poster={poster} autoPlay muted loop playsInline />
      ) : (
        <img className="film" src={poster} alt="" />
      )}
      {mode === "scrub" && <canvas ref={ref} className="film film-frames" aria-hidden="true" />}
    </>
  );
}
