"use client";

import { useLoader, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export default function StudioLighting() {
  const scene = useThree(state => state.scene);
  const environment = useLoader(RGBELoader, "/redesign/capabilities/studio-cubeuv.hdr");
  useLayoutEffect(() => {
    environment.mapping = THREE.CubeUVReflectionMapping;
    environment.minFilter = environment.magFilter = THREE.LinearFilter;
    scene.environment = environment;
    return () => { scene.environment = null; };
  }, [environment, scene]);
  return null;
}
