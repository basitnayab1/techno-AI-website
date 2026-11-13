"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { HeroCanvas } from "./fx";

// Real-time 3D for the redesign. Models are built from three.js primitives (no downloaded files),
// in the brand colours. To use real GLB models later, swap the build* functions for a GLTFLoader.

const INK = 0x0f1a1b;
const AQUA = 0x9fe7e7;
const TEAL = 0x289fb7;
const DEEP = 0x146b8c;

type Model = { group: THREE.Group; update: (t: number) => void };

function materials() {
  return {
    body: new THREE.MeshStandardMaterial({ color: 0x22373a, metalness: 0.75, roughness: 0.32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0a1213, metalness: 0.6, roughness: 0.45 }),
    light: new THREE.MeshStandardMaterial({ color: 0xeaf6f6, metalness: 0.25, roughness: 0.38 }),
    teal: new THREE.MeshStandardMaterial({ color: TEAL, metalness: 0.55, roughness: 0.3, emissive: DEEP, emissiveIntensity: 0.45 }),
    glow: new THREE.MeshStandardMaterial({ color: AQUA, emissive: AQUA, emissiveIntensity: 1.8 }),
    glass: new THREE.MeshBasicMaterial({ color: AQUA, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  };
}
type Mats = ReturnType<typeof materials>;

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/* ------------------------------ Models ------------------------------ */

function buildDrone(M: Mats): Model {
  const g = new THREE.Group();
  const hull = add(g, new THREE.SphereGeometry(0.5, 48, 32), M.body);
  hull.scale.set(1.15, 0.4, 0.82);
  const canopy = add(g, new THREE.SphereGeometry(0.34, 40, 24), M.dark, 0, 0.1, 0.02);
  canopy.scale.set(1.1, 0.5, 0.85);
  add(g, new THREE.BoxGeometry(0.46, 0.035, 0.03), M.glow, 0, 0.02, 0.405); // front light bar
  add(g, new THREE.BoxGeometry(0.2, 0.03, 0.03), M.teal, 0, 0.02, -0.405);

  const rotors: THREE.Group[] = [];
  [45, 135, 225, 315].forEach((deg, i) => {
    const pivot = new THREE.Group();
    pivot.rotation.y = (deg * Math.PI) / 180;
    g.add(pivot);
    const arm = add(pivot, new THREE.CylinderGeometry(0.045, 0.06, 1.05, 16), M.body, 0.82, 0.02, 0);
    arm.rotation.z = Math.PI / 2;
    add(pivot, new THREE.CylinderGeometry(0.12, 0.14, 0.2, 28), M.dark, 1.36, 0.08, 0);
    add(pivot, new THREE.SphereGeometry(0.035, 12, 12), M.glow, 1.36, -0.05, 0);
    const guard = add(pivot, new THREE.TorusGeometry(0.56, 0.014, 8, 72), M.teal, 1.36, 0.2, 0);
    guard.rotation.x = Math.PI / 2;
    const rotor = new THREE.Group();
    rotor.position.set(1.36, 0.2, 0);
    pivot.add(rotor);
    add(rotor, new THREE.BoxGeometry(1.02, 0.012, 0.085), M.light);
    add(rotor, new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16), M.light);
    const disc = add(rotor, new THREE.CircleGeometry(0.52, 48), M.glass);
    disc.rotation.x = -Math.PI / 2;
    rotor.userData.dir = i % 2 ? -1 : 1;
    rotors.push(rotor);
  });

  for (const x of [-0.3, 0.3]) {
    const leg = add(g, new THREE.CylinderGeometry(0.022, 0.022, 0.5, 10), M.dark, x * 1.25, -0.36, 0);
    leg.rotation.z = x > 0 ? 0.35 : -0.35;
    const skid = add(g, new THREE.CylinderGeometry(0.026, 0.026, 0.95, 10), M.dark, x * 1.55, -0.6, 0);
    skid.rotation.x = Math.PI / 2;
  }
  // camera gimbal
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), M.dark, 0, -0.22, 0.2);
  add(g, new THREE.SphereGeometry(0.15, 28, 20), M.dark, 0, -0.34, 0.2);
  const lens = add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 24), M.glow, 0, -0.36, 0.34);
  lens.rotation.x = Math.PI / 2;

  return {
    group: g,
    update: (t) => rotors.forEach((r) => (r.rotation.y = t * 38 * r.userData.dir)),
  };
}

function buildRobot(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.62, 0.78, 0.34, 48), M.dark, 0, -1.45, 0);
  const ring = add(g, new THREE.TorusGeometry(0.71, 0.02, 8, 72), M.glow, 0, -1.4, 0);
  ring.rotation.x = Math.PI / 2;
  add(g, new THREE.CapsuleGeometry(0.52, 0.75, 12, 40), M.light, 0, -0.55, 0);
  const chest = add(g, new THREE.BoxGeometry(0.5, 0.26, 0.05), M.dark, 0, -0.35, 0.5);
  chest.rotation.x = -0.08;
  const bars = [0, 1, 2].map((i) => add(g, new THREE.BoxGeometry(0.09, 0.14, 0.02), M.glow, -0.14 + i * 0.14, -0.35, 0.535));
  add(g, new THREE.CylinderGeometry(0.14, 0.18, 0.16, 24), M.dark, 0, 0.22, 0);

  const head = new THREE.Group();
  head.position.y = 0.72;
  g.add(head);
  const skull = add(head, new THREE.SphereGeometry(0.48, 48, 32), M.light);
  skull.scale.set(1.18, 0.9, 1);
  const visor = add(head, new THREE.CapsuleGeometry(0.17, 0.46, 10, 28), M.dark, 0, 0.02, 0.33);
  visor.rotation.z = Math.PI / 2;
  visor.scale.set(1, 1, 0.75);
  const eyes = [-0.17, 0.17].map((x) => add(head, new THREE.SphereGeometry(0.065, 20, 16), M.glow, x, 0.03, 0.47));
  for (const x of [-0.58, 0.58]) {
    const ear = add(head, new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24), M.teal, x, 0, 0);
    ear.rotation.z = Math.PI / 2;
  }
  add(head, new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), M.dark, 0, 0.56, 0);
  const tip = add(head, new THREE.SphereGeometry(0.05, 16, 12), M.glow, 0, 0.73, 0);

  const arms = [-1, 1].map((s) => {
    const arm = new THREE.Group();
    arm.position.set(s * 0.66, -0.2, 0);
    g.add(arm);
    add(arm, new THREE.SphereGeometry(0.14, 24, 16), M.teal);
    add(arm, new THREE.CapsuleGeometry(0.095, 0.5, 8, 20), M.light, s * 0.06, -0.42, 0);
    add(arm, new THREE.SphereGeometry(0.12, 20, 16), M.dark, s * 0.06, -0.82, 0);
    return arm;
  });

  g.position.y = 0.35;
  g.scale.setScalar(0.92);
  return {
    group: g,
    update: (t) => {
      head.rotation.y = Math.sin(t * 0.9) * 0.45;
      head.rotation.x = Math.sin(t * 0.6) * 0.06;
      const blink = Math.sin(t * 1.7) > 0.985 ? 0.1 : 1;
      eyes.forEach((e) => (e.scale.y = blink));
      arms[0].rotation.x = Math.sin(t * 1.2) * 0.25;
      arms[1].rotation.x = -Math.sin(t * 1.2) * 0.25;
      arms[1].rotation.z = 0.15 + Math.sin(t * 0.8) * 0.1;
      tip.scale.setScalar(1 + Math.sin(t * 4) * 0.25);
      bars.forEach((b, i) => (b.scale.y = 0.5 + Math.abs(Math.sin(t * 3 + i * 1.1)) * 0.9));
    },
  };
}

function buildSatellite(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(0.75, 1, 0.75), M.body);
  add(g, new THREE.BoxGeometry(0.78, 0.06, 0.78), M.teal, 0, 0.3, 0);
  add(g, new THREE.BoxGeometry(0.78, 0.06, 0.78), M.teal, 0, -0.3, 0);
  add(g, new THREE.BoxGeometry(0.3, 0.3, 0.02), M.glow, 0, 0, 0.385);
  const panelMat = new THREE.MeshStandardMaterial({ color: DEEP, metalness: 0.8, roughness: 0.25, emissive: DEEP, emissiveIntensity: 0.35 });
  const lineMat = new THREE.LineBasicMaterial({ color: AQUA, transparent: true, opacity: 0.55 });
  for (const s of [-1, 1]) {
    const strut = add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10), M.light, s * 0.58, 0, 0);
    strut.rotation.z = Math.PI / 2;
    for (const k of [0, 1]) {
      const geo = new THREE.BoxGeometry(0.72, 0.9, 0.025);
      const x = s * (1.18 + k * 0.76);
      add(g, geo, panelMat, x, 0, 0);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.72, 0.9, 3, 4)), lineMat);
      edges.position.set(x, 0, 0.016);
      g.add(edges);
    }
  }
  const dish = add(g, new THREE.SphereGeometry(0.62, 40, 16, 0, Math.PI * 2, 0, Math.PI / 3.2), M.light, 0, 0.2, 0);
  (dish.material as THREE.Material).side = THREE.DoubleSide;
  dish.rotation.x = Math.PI;
  dish.position.y = 1.2;
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), M.dark, 0, 0.85, 0);
  const feed = add(g, new THREE.SphereGeometry(0.06, 16, 12), M.glow, 0, 1.08, 0);
  const rings = [0, 1, 2].map(() => {
    const r = add(g, new THREE.TorusGeometry(0.2, 0.008, 6, 48), M.glass, 0, 1.2, 0);
    r.rotation.x = Math.PI / 2;
    return r;
  });
  g.rotation.set(0.35, 0, 0.3);
  g.scale.setScalar(0.72);
  return {
    group: g,
    update: (t) => {
      feed.scale.setScalar(1 + Math.sin(t * 3) * 0.2);
      rings.forEach((r, i) => {
        const p = (t * 0.5 + i / 3) % 1;
        r.position.y = 1.2 + p * 1.1;
        r.scale.setScalar(0.6 + p * 3.2);
      });
    },
  };
}

function buildChip(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(2.6, 0.08, 2.6), M.dark, 0, -0.1, 0);
  add(g, new THREE.BoxGeometry(1.3, 0.2, 1.3), M.body, 0, 0.04, 0);
  const core = add(g, new THREE.BoxGeometry(0.62, 0.03, 0.62), M.glow.clone(), 0, 0.155, 0);
  const traces: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const side = new THREE.Group();
    side.rotation.y = (i * Math.PI) / 2;
    g.add(side);
    for (let k = -4; k <= 4; k++) {
      add(side, new THREE.BoxGeometry(0.07, 0.05, 0.2), M.light, k * 0.13, -0.02, 0.74);
      if (k % 2 === 0) {
        const len = 0.28 + Math.abs(k) * 0.05;
        traces.push(add(side, new THREE.BoxGeometry(0.02, 0.01, len), M.teal, k * 0.13, -0.055, 0.84 + len / 2));
        add(side, new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12), M.glow, k * 0.13, -0.055, 0.84 + len);
      }
    }
  }
  g.rotation.x = 0.6;
  g.scale.setScalar(1.05);
  return {
    group: g,
    update: (t) => {
      (core.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.sin(t * 2.4) * 0.9;
      core.scale.set(1 + Math.sin(t * 2.4) * 0.04, 1, 1 + Math.sin(t * 2.4) * 0.04);
    },
  };
}

function buildCamera(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 40), M.dark, 0, 1.25, 0);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.5, 14), M.body, 0, 1, 0);
  const head = new THREE.Group();
  head.position.y = 0.62;
  g.add(head);
  add(head, new THREE.SphereGeometry(0.16, 24, 16), M.teal);
  const cam = new THREE.Group();
  cam.rotation.x = 0.35;
  head.add(cam);
  const body = add(cam, new THREE.CapsuleGeometry(0.3, 0.85, 12, 36), M.light, 0, -0.25, 0.25);
  body.rotation.x = Math.PI / 2;
  const hood = add(cam, new THREE.CylinderGeometry(0.33, 0.33, 0.3, 36, 1, true), M.dark, 0, -0.25, 0.9);
  (hood.material as THREE.Material).side = THREE.DoubleSide;
  hood.rotation.x = Math.PI / 2;
  const lens = add(cam, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 32), M.glow, 0, -0.25, 0.86);
  lens.rotation.x = Math.PI / 2;
  const led = add(cam, new THREE.SphereGeometry(0.035, 12, 12), M.glow, 0.2, -0.05, 0.6);
  const beam = add(cam, new THREE.ConeGeometry(1.1, 2.6, 40, 1, true), M.glass, 0, -0.25, 2.25);
  beam.rotation.x = -Math.PI / 2;
  g.position.y = -0.35;
  g.scale.setScalar(0.95);
  return {
    group: g,
    update: (t) => {
      head.rotation.y = Math.sin(t * 0.7) * 0.7;
      led.visible = Math.sin(t * 5) > 0;
    },
  };
}

/* ------------------------------ Stage ------------------------------ */

function createStage(canvas: HTMLCanvasElement, camZ: number) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.5, camZ);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xd8ffff, INK, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.PointLight(AQUA, 60, 30);
  rim.position.set(-4, 2, 3);
  scene.add(rim);
  const back = new THREE.PointLight(TEAL, 90, 30);
  back.position.set(3, -2, -4);
  scene.add(back);

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
    renderer.dispose();
  };
  return { renderer, scene, camera, resize, dispose };
}

/** Runs `frame` every animation frame while the canvas is on screen. */
function loop(canvas: HTMLCanvasElement, frame: (t: number, dt: number) => void) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let raf = 0;
  let on = false;
  const tick = () => {
    frame(clock.elapsedTime, Math.min(clock.getDelta(), 0.05));
    if (on) raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    on = e.isIntersecting && !still;
    if (e.isIntersecting) raf = requestAnimationFrame(tick);
  });
  io.observe(canvas);
  return () => {
    on = false;
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}

/* ------------------------------ Hero ------------------------------ */

/** Hero background: a 3D drone flying over a scanned grid; follows the mouse, climbs on scroll. */
export function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(canvas, 8);
    } catch {
      setFailed(true); // no WebGL -> 2D fallback
      return;
    }
    const { scene, camera, renderer } = stage;
    scene.fog = new THREE.Fog(INK, 9, 30);
    const M = materials();
    const drone = buildDrone(M);
    scene.add(drone.group);

    const beam = add(drone.group, new THREE.ConeGeometry(1.25, 2.4, 48, 1, true), M.glass.clone(), 0, -1.6, 0.2);
    (beam.material as THREE.MeshBasicMaterial).opacity = 0.07;

    const grid = new THREE.GridHelper(80, 80, TEAL, DEEP);
    grid.position.y = -2.4;
    const gm = grid.material as THREE.Material;
    gm.transparent = true;
    gm.opacity = 0.32;
    scene.add(grid);

    const pulses = [0, 1, 2].map(() => {
      const p = add(scene, new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color: AQUA, transparent: true, side: THREE.DoubleSide, depthWrite: false }), 0, -2.38, 0);
      p.rotation.x = -Math.PI / 2;
      return p;
    });

    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = Math.random() * 12 - 2.4;
      pos[i * 3 + 2] = Math.random() * -26 + 5;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: AQUA, size: 0.05, transparent: true, opacity: 0.7, sizeAttenuation: true }));
    scene.add(points);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const host = canvas.parentElement!;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    host.addEventListener("pointermove", onMove);

    let baseX = 0;
    let baseY = 0;
    let scale = 1;
    const layout = () => {
      stage.resize();
      const halfW = Math.tan((17.5 * Math.PI) / 180) * 8 * camera.aspect;
      const wide = camera.aspect > 1.25;
      baseX = wide ? halfW * 0.52 : 0;
      baseY = wide ? 0.35 : 1.75;
      scale = wide ? 1.2 : 0.72;
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(canvas);

    const frame = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const scroll = Math.min(Math.max(window.scrollY / (host.clientHeight || 1), 0), 1);
      const intro = 1 - Math.pow(1 - Math.min(t / 2.2, 1), 3); // fly-in

      const d = drone.group;
      drone.update(t);
      d.scale.setScalar(scale);
      d.position.set(
        baseX + (1 - intro) * 7 + mouse.x * 0.45,
        baseY + (1 - intro) * 2.5 + Math.sin(t * 1.3) * 0.12 + scroll * 3.2 - mouse.y * 0.2,
        Math.sin(t * 0.5) * 0.3 - scroll * 2,
      );
      d.rotation.set(
        0.22 + mouse.y * 0.14 + Math.sin(t * 0.9) * 0.03,
        -0.55 + Math.sin(t * 0.35) * 0.3 + mouse.x * 0.45,
        -mouse.x * 0.22 - (1 - intro) * 0.5 + Math.sin(t * 1.1) * 0.03,
      );

      grid.position.z = (t * 0.6) % 1;
      pulses.forEach((p, i) => {
        const k = (t * 0.28 + i / 3) % 1;
        p.position.x = d.position.x;
        p.scale.setScalar(0.4 + k * 4.5);
        (p.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.5;
      });
      points.rotation.y = t * 0.012 + mouse.x * 0.03;
      camera.position.set(mouse.x * 0.25, 0.5 - mouse.y * 0.15 + scroll * 0.6, 8);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    const stop = loop(canvas, frame);

    return () => {
      stop();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      stage.dispose();
    };
  }, []);

  if (failed) return <HeroCanvas />;
  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}

/* ------------------------------ Technology domains ------------------------------ */

const BUILDERS = [buildDrone, buildRobot, buildSatellite, buildChip, buildCamera];

/** Domain list with a 3D viewer: the model changes with the row being read / hovered. */
export function Domains({ items }: { items: string[][] }) {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const hovering = useRef(false);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const list = listRef.current;
    if (!canvas || !list) return;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(canvas, 7.4);
    } catch {
      canvas.parentElement?.classList.add("no-gl");
      return;
    }
    const { scene, camera, renderer } = stage;
    const M = materials();
    const models = BUILDERS.map((b) => b(M));
    const holders = models.map((m, i) => {
      const h = new THREE.Group();
      h.add(m.group);
      h.scale.setScalar(i === 0 ? 1 : 0.001);
      h.visible = i === 0;
      scene.add(h);
      return h;
    });
    holders[0].rotation.x = 0.3; // show the drone from slightly above

    const floor = add(scene, new THREE.RingGeometry(1.7, 1.72, 96), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.5, side: THREE.DoubleSide }), 0, -1.75, 0);
    floor.rotation.x = -Math.PI / 2;
    const floor2 = add(scene, new THREE.RingGeometry(2.25, 2.26, 96), new THREE.MeshBasicMaterial({ color: AQUA, transparent: true, opacity: 0.22, side: THREE.DoubleSide }), 0, -1.75, 0);
    floor2.rotation.x = -Math.PI / 2;

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const host = canvas.parentElement!;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => (mouse.tx = mouse.ty = 0);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    stage.resize();
    const ro = new ResizeObserver(stage.resize);
    ro.observe(canvas);

    // While scrolling, the row nearest the middle of the screen becomes active.
    const onScroll = () => {
      if (hovering.current) return;
      const mid = window.innerHeight * 0.5;
      let best = -1;
      let bestD = Infinity;
      Array.from(list.children).forEach((li, i) => {
        const r = li.getBoundingClientRect();
        const dd = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      });
      if (best >= 0 && bestD < window.innerHeight * 0.5 && best !== activeRef.current) setActive(best);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let spin = 0;
    const frame = (t: number, dt: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      spin += dt * 0.45;
      holders.forEach((h, i) => {
        const target = i === activeRef.current ? 1 : 0;
        const s = h.scale.x + (target - h.scale.x) * 0.14;
        h.scale.setScalar(Math.max(s, 0.001));
        h.visible = s > 0.02;
        if (!h.visible) return;
        models[i].update(t);
        h.rotation.y = spin + mouse.x * 0.6 + (1 - s) * 2.2;
        h.rotation.x = (i === 0 ? 0.3 : 0.08) + mouse.y * 0.25;
        h.position.y = Math.sin(t * 1.2 + i) * 0.07;
      });
      floor.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03);
      floor2.rotation.z = t * 0.2;
      renderer.render(scene, camera);
    };
    const stop = loop(canvas, frame);

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      stage.dispose();
    };
  }, []);

  const n = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div className="split">
      <div className="stage" data-reveal>
        <canvas ref={canvasRef} aria-hidden="true" />
        <p className="stage-label">
          <span>//: {n(active)}</span>
          {items[active][0]}
        </p>
        <p className="stage-hint">3D · move your mouse</p>
      </div>
      <ol
        className="rows"
        ref={listRef}
        onPointerEnter={() => (hovering.current = true)}
        onPointerLeave={() => (hovering.current = false)}
      >
        {items.map(([title, text], i) => (
          <li
            key={title}
            data-reveal
            className={i === active ? "on" : undefined}
            onPointerEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          >
            <span className="n">{n(i)}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
