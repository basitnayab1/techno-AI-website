"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { addMotionDetail, buildDrone, materials, preloadModel } from "./models";
import { flightOwnsDrone } from "./drone-handoff";
import { SOLUTIONS } from "./data";

/**
 * Phase 2: the drone flies with the scroll from the end of the hero, across Section 02,
 * and arrives directly into Section 03 (Solutions journey: Aerial & Drone). A fixed, transparent, click-through canvas.
 * Its route is a list of keyframes in screen space (NDC) over the scroll range; the "alive" springs add banking,
 * hover and the reaction to the mouse on top.
 * The same flying drone remains visible throughout the aerial station.
 */
type K = [q: number, x: number, y: number, s: number];
const ROUTE: K[] = [
  // q (0..1 of the scroll range), x, y (screen, -1..1), size (small in section 2, grows big into section 3)
  [0.0, 0.72, 0.4, 1.2],
  [0.12, 0.68, 0.62, 1.3],
  [0.24, 0.7, 0.0, 1.35],
  [0.38, -0.62, -0.1, 1.25],
  [0.52, -0.68, -0.5, 1.3],
  [0.68, 0.6, -0.25, 1.4], // Card 03 in Section 02
  [0.82, 0.52, -0.18, 1.65], // Flying down towards Section 03, beginning to grow
  [0.92, 0.44, -0.16, 2.35], // Entering Section 03, growing big
  [1.0, 0.38, -0.158, 3.05], // Fully arrived in Section 03 Station 01, full size 3.05!
];

const smooth = (t: number) => t * t * (3 - 2 * t);

function along(q: number, isWide: boolean, aspect: number) {
  // Matches exact station 01 apex coordinates across all screen aspect ratios
  const endX = isWide ? Math.min(0.44, Math.max(0.32, 0.674 / Math.max(aspect, 1))) : 0.0;
  const endY = isWide ? -0.158 : 0.32;
  const endS = isWide ? 3.05 : 2.2;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const a = ROUTE[i];
    const b = ROUTE[i + 1];
    if (q <= b[0]) {
      const k = smooth((q - a[0]) / (b[0] - a[0]));
      let bx = b[1];
      let by = b[2];
      let bs = b[3];
      if (i === ROUTE.length - 2) {
        bx = endX;
        by = endY;
        bs = endS;
      }
      return { x: a[1] + (bx - a[1]) * k, y: a[2] + (by - a[2]) * k, s: a[3] + (bs - a[3]) * k };
    }
  }
  return { x: endX, y: endY, s: endS };
}

export default function FlightScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const hero = document.querySelector<HTMLElement>(".hx-hero");
    const journey = document.querySelector<HTMLElement>(".journey");
    if (!hero || !journey) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.debug.checkShaderErrors = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9e4e7, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-2, 4, 3);
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 10);

    const holder = new THREE.Group();
    holder.visible = false;
    scene.add(holder);
    const fallback = buildDrone(materials());
    const fallbackWidth = new THREE.Box3().setFromObject(fallback.group).getSize(new THREE.Vector3()).x;
    fallback.group.scale.setScalar(1 / Math.max(fallbackWidth, 0.01));
    holder.add(fallback.group);
    let modelReady = false;
    let spin: [THREE.Object3D, number][] = [];
    let wrapObj: THREE.Group | null = null;
    let disposed = false;
    preloadModel("drone").then(
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene.clone(true);
        // Journey cleanup can dispose its meshes. The flight owns its GPU resources.
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry = mesh.geometry.clone();
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((material) => material.clone())
            : mesh.material.clone();
        });
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const c = box.getCenter(new THREE.Vector3());
        model.position.set(-c.x, -c.y, -c.z);
        spin = addMotionDetail("drone", model);
        model.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m && m.map && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            m.emissiveMap = m.map;
            m.emissive = new THREE.Color(0.25, 0.25, 0.25);
          }
        });
        const wrap = new THREE.Group();
        wrap.scale.setScalar(1 / size.x); // 1 unit wide
        wrap.add(model);
        modelReady = true;
        wrap.rotation.set(0.12, -0.55, 0); // three-quarter view from slightly above, matches journey station angle
        wrapObj = wrap;
        holder.remove(fallback.group);
        holder.add(wrap);
        // Render compiles this small scene on its next frame. Running compileAsync
        // concurrently with the flight loop can leave a blank canvas during hot updates.
      },
      (err) => console.error("[redesign] flight drone failed to load", err),
    );

    // scroll range: from hero mid-point to the arrival at the journey section
    let range = { a: 0, b: 1 };
    const measure = () => {
      const docY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      const h = hero.getBoundingClientRect();
      const j = journey.getBoundingClientRect();
      range = { a: h.top + docY + h.height * 0.45, b: j.top + docY };
    };
    const bodyRo = new ResizeObserver(measure);
    bodyRo.observe(document.body);
    measure();

    let W = 0;
    let H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / Math.max(H, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      pointer.tx = THREE.MathUtils.clamp(event.clientX / Math.max(W, 1) * 2 - 1, -1, 1);
      pointer.ty = THREE.MathUtils.clamp(1 - event.clientY / Math.max(H, 1) * 2, -1, 1);
    };
    const resetPointer = () => { pointer.tx = 0; pointer.ty = 0; };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("blur", resetPointer);
    const ndc = new THREE.Vector3();
    let raf = 0;
    let wasOn = false;
    let lastT = 0;
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const lenis = (window as unknown as { lenis?: { scroll: number } }).lenis;
      const docY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      const y = lenis ? lenis.scroll : docY;
      const q = (y - range.a) / Math.max(range.b - range.a, 1);

      // Aerial station keeps the flying drone; the journey canvas never draws a second copy.
      const on = q >= -0.05 && flightOwnsDrone(journey, SOLUTIONS.length);
      if (!on) {
        if (wasOn) {
          renderer.clear();
        }
        canvas.style.opacity = "0";
        wasOn = false;
        return;
      }
      wasOn = true;
      const jRect = journey.getBoundingClientRect();
      const aerialProgress = Math.max(0, -jRect.top / Math.max(jRect.height - H, 1) * SOLUTIONS.length);
      canvas.style.opacity = String(Math.min(1, Math.max(0, (1 - aerialProgress) / 0.12)));

      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, Math.max(0, t - lastT));
      lastT = t;
      const follow = 1 - Math.exp(-6 * dt);
      pointer.x += (pointer.tx - pointer.x) * follow;
      pointer.y += (pointer.ty - pointer.y) * follow;
      const isWide = W / Math.max(H, 1) > 1.1;
      const p = along(Math.max(0, Math.min(q, 1.0)), isWide, camera.aspect);
      const halfW = halfH * camera.aspect;
      const small = W < 760 ? 0.6 : 1;

      let px = p.x;
      let py = p.y;
      if (q >= 1) {
        // Continue the flight through the aerial station as the visitor scrolls.
        px += Math.sin(aerialProgress * Math.PI * 2) * (isWide ? 0.10 : 0.045);
        py += Math.sin(aerialProgress * Math.PI) * 0.12;
        px += Math.sin(t * 0.45) * 0.012;
        py += Math.sin(t * 0.9) * 0.015;
        px += pointer.x * 0.045;
        py += pointer.y * 0.035;
      }

      holder.position.set(px * halfW, py * halfH, 0);
      holder.scale.setScalar(p.s * small * Math.min(1.35, Math.max(0.75, halfW * 0.35)));
      holder.visible = true;
      if (wrapObj) {
        const rotK = Math.max(0, Math.min(1, (q - 0.68) / 0.32));
        const rotX = 0.18 + (0.12 - 0.18) * rotK;
        const rotY = -0.52 + (-0.55 - -0.52) * rotK;
        const response = THREE.MathUtils.smoothstep(q, 0.8, 1);
        const bank = q >= 1 ? Math.sin(aerialProgress * Math.PI * 2) : 0;
        wrapObj.rotation.set(rotX - pointer.y * 0.14 * response, rotY + pointer.x * 0.28 * response + bank * 0.18, -pointer.x * 0.10 * response - bank * 0.08);
      }
      ndc.copy(holder.position).project(camera);
      if (!modelReady) fallback.update(t);
      spin.forEach(([o, sp]) => (o.rotation.z += dt * sp));
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      disposed = true;
      bodyRo.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("blur", resetPointer);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="flight-gl" aria-hidden="true" />;
}
