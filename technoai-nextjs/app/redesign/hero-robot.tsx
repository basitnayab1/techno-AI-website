"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import HeroReferenceModel from "./hero-reference-model";

const PATH_RADIUS = .88;
const END_ANGLE = Math.asin(.52 / PATH_RADIUS);

// Half-cosine acceleration/deceleration, with a steady pace between the ends.
function progress(time: number, duration: number) {
  const ramp = .45;
  const distance = (t: number) => (t - ramp / Math.PI * Math.sin(Math.PI * t / ramp)) / 2;
  const t = THREE.MathUtils.clamp(time, 0, duration);
  return t < ramp ? distance(t) / (duration - ramp)
    : t > duration - ramp ? 1 - distance(duration - t) / (duration - ramp)
    : (t - ramp / 2) / (duration - ramp);
}

function route(time: number) {
  const t = time % 24.4;
  if (t < 4.8) return { phase: "walk-center", angle: -END_ANGLE * (1 - progress(t, 4.8)), direction: 1 };
  if (t < 6.2) return { phase: "jump-center", angle: 0, direction: 0 };
  if (t < 11) return { phase: "walk-right", angle: END_ANGLE * progress(t - 6.2, 4.8), direction: 1 };
  if (t < 13) return { phase: "hello", angle: END_ANGLE, direction: 0 };
  if (t < 14) return { phase: "turn-left", angle: END_ANGLE, direction: -1 };
  if (t < 23.2) return { phase: "walk-left", angle: END_ANGLE * (1 - 2 * progress(t - 14, 9.2)), direction: -1 };
  return { phase: "turn-right", angle: -END_ANGLE, direction: 1 };
}

/** The existing reference companion stays on the hero pedestal, in the same canvas. */
export default function HeroRobot({ active, still }: { active: boolean; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const previousPhase = useRef("");
  const previousAngle = useRef(-END_ANGLE);
  const locomotion = useRef({ gait: 0, stride: 0 });
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
    delete gl.domElement.dataset.heroRobotX;
    const stage = gl.domElement.closest<HTMLElement>(".hx-stage");
    stage?.removeAttribute("data-robot-greeting");
  }, [gl]);
  useFrame((_, delta) => {
    if (!ready || !group.current) return;
    const dt = Math.min(delta, .05);
    if (active && !still) elapsed.current += dt;
    const { phase, angle, direction } = still ? { phase: "rest", angle: 0, direction: 0 } : route(elapsed.current);
    const moving = phase.startsWith("walk-");
    if (phase !== previousPhase.current) {
      previousPhase.current = phase;
      setWalking(moving);
      if (phase === "hello") setTalkToken(value => value + 1);
      if (phase === "jump-center") setJumpToken(value => value + 1);
      gl.domElement.dataset.heroRobot = phase;
    }
    // Follow the front rim, leaving enough disc underneath both feet at each end.
    group.current.position.x = PATH_RADIUS * Math.sin(angle);
    group.current.position.z = PATH_RADIUS * Math.cos(angle);
    if (active && !still) {
      const distance = Math.abs(angle - previousAngle.current) * PATH_RADIUS;
      const heading = direction === 0 ? 0 : direction * Math.PI / 2 + angle;
      const previousHeading = group.current.rotation.y;
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, heading, 6, dt);
      // Small planted steps during the turn, rather than rotating on frozen feet.
      const pivot = phase.startsWith("turn-") || phase === "hello" ? Math.abs(group.current.rotation.y - previousHeading) * .1 : 0;
      locomotion.current.gait += (distance + pivot) / .15 * Math.PI * 2;
      const stride = moving ? Math.min(1, distance / Math.max(dt, .001) / .12) : Math.min(.45, pivot / Math.max(dt, .001) / .12);
      locomotion.current.stride = THREE.MathUtils.damp(locomotion.current.stride, stride, 10, dt);
    }
    previousAngle.current = angle;
    gl.domElement.dataset.heroRobotX = group.current.position.x.toFixed(3);
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
  return <group ref={group} name="hero-pedestal-robot" position={[still ? 0 : -.52, -1.4325, still ? PATH_RADIUS : PATH_RADIUS * Math.cos(END_ANGLE)]}
    rotation-y={still ? 0 : Math.PI / 2 - END_ANGLE} scale={.25}>
    <HeroReferenceModel paused={!active || still} walking={walking}
      locomotion={locomotion} jumpToken={jumpToken} talkToken={talkToken} onReady={onReady} onError={onError} />
  </group>;
}
