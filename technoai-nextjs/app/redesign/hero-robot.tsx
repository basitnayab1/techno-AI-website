"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import HeroReferenceModel from "./hero-reference-model";

/** The existing reference companion stays on the hero pedestal, in the same canvas. */
export default function HeroRobot({ active, still }: { active: boolean; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const previousPhase = useRef("");
  const [ready, setReady] = useState(false);
  const [walking, setWalking] = useState(false);
  const [jumpToken, setJumpToken] = useState(0);
  const [talkToken, setTalkToken] = useState(0);
  const { gl, camera, size, invalidate } = useThree();
  const anchor = useRef(new THREE.Vector3());
  const onReady = useCallback(() => { setReady(true); invalidate(); }, [invalidate]);
  const onError = useCallback(() => { gl.domElement.dataset.heroRobot = "error"; }, [gl]);
  useEffect(() => () => {
    delete gl.domElement.dataset.heroRobot;
    const stage = gl.domElement.closest<HTMLElement>(".hx-stage");
    stage?.removeAttribute("data-robot-greeting");
  }, [gl]);
  useFrame((_, delta) => {
    if (!ready || !group.current) return;
    if (active && !still) elapsed.current += Math.min(delta, .05);
    // One relaxed cycle: walk, greet, walk, hop, rest. Never driven by scroll.
    const t = elapsed.current % 18;
    const phase = still ? "rest" : t < 5 ? "walk" : t < 7 ? "hello" : t < 12 ? "walk" : t < 13 ? "jump" : "rest";
    if (phase !== previousPhase.current) {
      previousPhase.current = phase;
      setWalking(phase === "walk");
      if (phase === "hello") setTalkToken(value => value + 1);
      if (phase === "jump") setJumpToken(value => value + 1);
      gl.domElement.dataset.heroRobot = phase;
    }
    // Footprint stays inside the top disc, including both feet and the small hop.
    if (active && !still && phase === "walk") group.current.position.x = Math.sin(elapsed.current * .55) * .22;
    group.current.updateWorldMatrix(true, false);
    anchor.current.set(0, 2.25, 0).applyMatrix4(group.current.matrixWorld).project(camera);
    const stage = gl.domElement.closest<HTMLElement>(".hx-stage");
    if (stage) {
      stage.style.setProperty("--robot-x", `${(anchor.current.x * .5 + .5) * size.width}px`);
      stage.style.setProperty("--robot-y", `${(-anchor.current.y * .5 + .5) * size.height}px`);
      stage.dataset.robotGreeting = String(active && !still && phase === "hello");
    }
  }, -3);
  // The pedestal inherits IntelligenceCore's +0.22 world-height offset.
  // Include it here so the reference model's soles meet the top disc.
  return <group ref={group} position={[0, -1.4325, .88]} scale={.25}>
    <HeroReferenceModel paused={!active || still} walking={walking}
      jumpToken={jumpToken} talkToken={talkToken} onReady={onReady} onError={onError} />
  </group>;
}
