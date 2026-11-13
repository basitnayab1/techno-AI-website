import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// 3D models for the redesign.
// Every slot first looks for a real model at /redesign/models/<slug>.glb (to be generated later).
// Until that file exists, a placeholder built from simple shapes is shown in the brand colours.

export const BLUE = 0x146b8c; // brand blue (PDF)
export const INK = 0x0b1415; // brand ink #0f1a1b, a little darker

export type Model = { group: THREE.Group; update: (t: number) => void };

export function materials() {
  return {
    body: new THREE.MeshStandardMaterial({ color: 0x2a3436, metalness: 0.7, roughness: 0.34 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x111819, metalness: 0.55, roughness: 0.45 }),
    light: new THREE.MeshStandardMaterial({ color: 0xe9eef0, metalness: 0.2, roughness: 0.4 }),
    blue: new THREE.MeshStandardMaterial({ color: BLUE, metalness: 0.5, roughness: 0.35, emissive: BLUE, emissiveIntensity: 0.35 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: BLUE, emissiveIntensity: 2.6 }),
    glass: new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  };
}
export type Mats = ReturnType<typeof materials>;

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/* ------------------------------ placeholders ------------------------------ */

export function buildDrone(M: Mats): Model {
  const g = new THREE.Group();
  const hull = add(g, new THREE.SphereGeometry(0.5, 48, 32), M.body);
  hull.scale.set(1.15, 0.4, 0.82);
  const canopy = add(g, new THREE.SphereGeometry(0.34, 40, 24), M.dark, 0, 0.1, 0.02);
  canopy.scale.set(1.1, 0.5, 0.85);
  add(g, new THREE.BoxGeometry(0.46, 0.035, 0.03), M.glow, 0, 0.02, 0.405);
  const rotors: THREE.Group[] = [];
  [45, 135, 225, 315].forEach((deg, i) => {
    const pivot = new THREE.Group();
    pivot.rotation.y = (deg * Math.PI) / 180;
    g.add(pivot);
    const arm = add(pivot, new THREE.CylinderGeometry(0.045, 0.06, 1.05, 16), M.body, 0.82, 0.02, 0);
    arm.rotation.z = Math.PI / 2;
    add(pivot, new THREE.CylinderGeometry(0.12, 0.14, 0.2, 28), M.dark, 1.36, 0.08, 0);
    add(pivot, new THREE.SphereGeometry(0.035, 12, 12), M.glow, 1.36, -0.05, 0);
    const guard = add(pivot, new THREE.TorusGeometry(0.56, 0.014, 8, 72), M.blue, 1.36, 0.2, 0);
    guard.rotation.x = Math.PI / 2;
    const rotor = new THREE.Group();
    rotor.position.set(1.36, 0.2, 0);
    pivot.add(rotor);
    add(rotor, new THREE.BoxGeometry(1.02, 0.012, 0.085), M.light);
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
  add(g, new THREE.SphereGeometry(0.15, 28, 20), M.dark, 0, -0.34, 0.2);
  const lens = add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 24), M.glow, 0, -0.36, 0.34);
  lens.rotation.x = Math.PI / 2;
  return { group: g, update: (t) => rotors.forEach((r) => (r.rotation.y = t * 38 * r.userData.dir)) };
}

export function buildRobot(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.62, 0.78, 0.34, 48), M.dark, 0, -1.45, 0);
  const ring = add(g, new THREE.TorusGeometry(0.71, 0.02, 8, 72), M.glow, 0, -1.4, 0);
  ring.rotation.x = Math.PI / 2;
  add(g, new THREE.CapsuleGeometry(0.52, 0.75, 12, 40), M.light, 0, -0.55, 0);
  add(g, new THREE.BoxGeometry(0.5, 0.26, 0.05), M.dark, 0, -0.35, 0.5);
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
  const arms = [-1, 1].map((s) => {
    const arm = new THREE.Group();
    arm.position.set(s * 0.66, -0.2, 0);
    g.add(arm);
    add(arm, new THREE.SphereGeometry(0.14, 24, 16), M.blue);
    add(arm, new THREE.CapsuleGeometry(0.095, 0.5, 8, 20), M.light, s * 0.06, -0.42, 0);
    add(arm, new THREE.SphereGeometry(0.12, 20, 16), M.dark, s * 0.06, -0.82, 0);
    return arm;
  });
  g.position.y = 0.3;
  g.scale.setScalar(0.9);
  return {
    group: g,
    update: (t) => {
      head.rotation.y = Math.sin(t * 0.9) * 0.45;
      eyes.forEach((e) => (e.scale.y = Math.sin(t * 1.7) > 0.985 ? 0.1 : 1));
      arms[0].rotation.x = Math.sin(t * 1.2) * 0.25;
      arms[1].rotation.x = -Math.sin(t * 1.2) * 0.25;
      bars.forEach((b, i) => (b.scale.y = 0.5 + Math.abs(Math.sin(t * 3 + i * 1.1)) * 0.9));
    },
  };
}

export function buildSatellite(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(0.75, 1, 0.75), M.body);
  add(g, new THREE.BoxGeometry(0.78, 0.06, 0.78), M.blue, 0, 0.3, 0);
  add(g, new THREE.BoxGeometry(0.78, 0.06, 0.78), M.blue, 0, -0.3, 0);
  add(g, new THREE.BoxGeometry(0.3, 0.3, 0.02), M.glow, 0, 0, 0.385);
  const panelMat = new THREE.MeshStandardMaterial({ color: BLUE, metalness: 0.8, roughness: 0.25, emissive: BLUE, emissiveIntensity: 0.25 });
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  for (const s of [-1, 1]) {
    const strut = add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10), M.light, s * 0.58, 0, 0);
    strut.rotation.z = Math.PI / 2;
    for (const k of [0, 1]) {
      const x = s * (1.18 + k * 0.76);
      add(g, new THREE.BoxGeometry(0.72, 0.9, 0.025), panelMat, x, 0, 0);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.72, 0.9, 3, 4)), lineMat);
      edges.position.set(x, 0, 0.016);
      g.add(edges);
    }
  }
  const dishMat = M.light.clone();
  dishMat.side = THREE.DoubleSide;
  const dish = add(g, new THREE.SphereGeometry(0.62, 40, 16, 0, Math.PI * 2, 0, Math.PI / 3.2), dishMat, 0, 1.2, 0);
  dish.rotation.x = Math.PI;
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

/** Financial: payment terminal with a card sliding in and a live "transaction" screen. */
export function buildFinancial(M: Mats): Model {
  const g = new THREE.Group();
  const base = add(g, new THREE.BoxGeometry(1.25, 0.22, 1.9), M.body, 0, -0.6, 0);
  base.rotation.x = -0.12;
  const body = add(g, new THREE.BoxGeometry(1.1, 2.0, 0.28), M.dark, 0, 0.25, -0.1);
  body.rotation.x = -0.32;
  const screen = add(g, new THREE.PlaneGeometry(0.86, 0.62), M.blue.clone(), 0, 0.72, 0.1);
  screen.rotation.x = -0.32;
  const keys: THREE.Mesh[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++) {
      const k = add(g, new THREE.BoxGeometry(0.2, 0.04, 0.12), r === 3 && c === 2 ? M.glow : M.light, -0.27 + c * 0.27, 0.02 - r * 0.2, 0.1 + r * 0.065);
      k.rotation.x = -0.32;
      keys.push(k);
    }
  const card = new THREE.Group();
  g.add(card);
  add(card, new THREE.BoxGeometry(0.86, 0.02, 0.55), M.light);
  add(card, new THREE.BoxGeometry(0.14, 0.022, 0.1), M.blue, -0.24, 0.002, -0.05);
  add(card, new THREE.BoxGeometry(0.86, 0.022, 0.08), M.dark, 0, 0.002, 0.17);
  g.scale.setScalar(0.95);
  return {
    group: g,
    update: (t) => {
      const k = (Math.sin(t * 0.8) + 1) / 2;
      card.position.set(0, 1.55 - k * 0.55, 0.55 - k * 0.2);
      card.rotation.set(-0.9 + k * 0.5, 0.2, 0);
      (screen.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + k * 1.4;
    },
  };
}

/** Industrial: small plant with tanks, chimney and pulsing pipeline nodes. */
export function buildIndustry(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(2.0, 2.0, 0.08, 64), M.dark, 0, -1.2, 0);
  const ring = add(g, new THREE.TorusGeometry(2.0, 0.015, 6, 96), M.glow, 0, -1.15, 0);
  ring.rotation.x = Math.PI / 2;
  add(g, new THREE.BoxGeometry(1.5, 0.9, 1.0), M.body, -0.3, -0.71, 0);
  for (let i = 0; i < 3; i++) {
    const roof = add(g, new THREE.BoxGeometry(0.5, 0.06, 1.0), M.light, -0.8 + i * 0.5, -0.2, 0);
    roof.rotation.z = 0.35;
  }
  const tanks = [0, 1].map((i) => add(g, new THREE.CylinderGeometry(0.32, 0.32, 1.3, 32), M.light, 0.95, -0.5, -0.4 + i * 0.75));
  tanks.forEach((tk) => add(tk, new THREE.TorusGeometry(0.33, 0.02, 8, 40), M.blue).rotation.set(Math.PI / 2, 0, 0));
  add(g, new THREE.CylinderGeometry(0.12, 0.16, 1.9, 24), M.dark, -0.85, 0.2, -0.3);
  const top = add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.08, 24), M.glow, -0.85, 1.16, -0.3);
  const pipe = add(g, new THREE.CylinderGeometry(0.05, 0.05, 1.4, 12), M.blue, 0.4, -0.15, 0.55);
  pipe.rotation.z = Math.PI / 2;
  const nodes = [0, 1, 2, 3].map((i) => add(g, new THREE.SphereGeometry(0.06, 16, 12), M.glow, -0.2 + i * 0.4, -0.15, 0.55));
  const puffs = [0, 1, 2].map(() => add(g, new THREE.SphereGeometry(0.16, 16, 12), M.glass, -0.85, 1.3, -0.3));
  g.scale.setScalar(0.95);
  return {
    group: g,
    update: (t) => {
      nodes.forEach((n, i) => n.scale.setScalar(0.6 + Math.max(0, Math.sin(t * 3 - i * 0.8)) * 0.9));
      (top.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + Math.sin(t * 2) * 0.8;
      puffs.forEach((p, i) => {
        const k = (t * 0.35 + i / 3) % 1;
        p.position.y = 1.3 + k * 1.1;
        p.scale.setScalar(0.6 + k * 2.2);
      });
    },
  };
}

/** Security: pan-tilt camera with a scanning view cone. */
export function buildSecurity(M: Mats): Model {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 40), M.dark, 0, 1.25, 0);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.5, 14), M.body, 0, 1, 0);
  const head = new THREE.Group();
  head.position.y = 0.62;
  g.add(head);
  add(head, new THREE.SphereGeometry(0.16, 24, 16), M.blue);
  const cam = new THREE.Group();
  cam.rotation.x = 0.35;
  head.add(cam);
  const body = add(cam, new THREE.CapsuleGeometry(0.3, 0.85, 12, 36), M.light, 0, -0.25, 0.25);
  body.rotation.x = Math.PI / 2;
  const hoodMat = M.dark.clone();
  hoodMat.side = THREE.DoubleSide;
  const hood = add(cam, new THREE.CylinderGeometry(0.33, 0.33, 0.3, 36, 1, true), hoodMat, 0, -0.25, 0.9);
  hood.rotation.x = Math.PI / 2;
  const lens = add(cam, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 32), M.glow, 0, -0.25, 0.86);
  lens.rotation.x = Math.PI / 2;
  const led = add(cam, new THREE.SphereGeometry(0.035, 12, 12), M.glow, 0.2, -0.05, 0.6);
  const beam = add(cam, new THREE.ConeGeometry(1.1, 2.6, 40, 1, true), M.glass, 0, -0.25, 2.25);
  beam.rotation.x = -Math.PI / 2;
  g.position.y = -0.35;
  return {
    group: g,
    update: (t) => {
      head.rotation.y = Math.sin(t * 0.7) * 0.7;
      led.visible = Math.sin(t * 5) > 0;
    },
  };
}

export const BUILDERS: Record<string, (M: Mats) => Model> = {
  financial: buildFinancial,
  drone: buildDrone,
  robot: buildRobot,
  satellite: buildSatellite,
  industry: buildIndustry,
  security: buildSecurity,
};

/* ------------------------------ real models (later) ------------------------------ */

const loader = new GLTFLoader();

/**
 * Slots that have a real model in public/redesign/models/<slug>.glb.
 * Add the slug here after putting the file there (empty = placeholders everywhere).
 */
export const REAL_MODELS: string[] = [];

/**
 * Returns the placeholder at once and, if /redesign/models/<slug>.glb exists, swaps the real model
 * into the same group when it has loaded (scaled to the placeholder's size, centred).
 */
export function modelFor(slug: string, M: Mats): Model {
  const ph = BUILDERS[slug](M);
  const holder = new THREE.Group();
  holder.add(ph.group);
  const model: Model = { group: holder, update: ph.update };
  if (!REAL_MODELS.includes(slug)) return model;
  const url = `/redesign/models/${slug}.glb`;
  Promise.resolve()
    .then(() => {
      loader.load(url, (gltf) => {
        const real = gltf.scene;
        const size = new THREE.Box3().setFromObject(ph.group).getSize(new THREE.Vector3()).length();
        const box = new THREE.Box3().setFromObject(real);
        real.position.sub(box.getCenter(new THREE.Vector3()));
        const wrap = new THREE.Group();
        wrap.add(real);
        wrap.scale.setScalar(size / box.getSize(new THREE.Vector3()).length());
        holder.remove(ph.group);
        holder.add(wrap);
        const mixer = gltf.animations.length ? new THREE.AnimationMixer(real) : null;
        gltf.animations.forEach((a) => mixer!.clipAction(a).play());
        let last = 0;
        model.update = (t) => {
          mixer?.update(Math.max(0, t - last));
          last = t;
        };
      });
    })
    .catch(() => {});
  return model;
}
