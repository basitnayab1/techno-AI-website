"use client";
import { useMemo,useEffect,useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { CompanionPose } from "./companion-motion";

/** Silent smile / open / rounded visemes, driven by the common greeting timeline. */
export default function ExpressiveMouth({motion,mask=false}:{motion:React.RefObject<CompanionPose>;mask?:boolean}) {
  const smile=useRef<T.Group>(null),open=useRef<T.Group>(null);
  const curve=useMemo(()=>new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({length:28},(_,i)=>{const x=-.13+i/27*.26;return new T.Vector3(x,-.045*(1-(x/.13)**2),0)})),40,.011,6,false),[]);
  useEffect(()=>()=>curve.dispose(),[curve]);
  useFrame(()=>{const p=motion.current;if(smile.current){smile.current.visible=p.mouth<.16;smile.current.scale.x=p.lipWidth}if(open.current){open.current.visible=p.mouth>=.12;open.current.scale.set(p.lipWidth,.18+p.mouth*1.05,1)}});
  return <group>{mask&&<mesh position-z={-.003} scale={[.155,.075,1]}><circleGeometry args={[1,48]}/><meshBasicMaterial color="#001522"/></mesh>}<group ref={smile}><mesh geometry={curve}><meshBasicMaterial color="#72f9ee" toneMapped={false}/></mesh></group><group ref={open} position-y={-.022}><mesh scale={[.09,.07,1]}><circleGeometry args={[1,48]}/><meshBasicMaterial color="#000d18"/></mesh><mesh scale={[1.15,1,1]} position-z={.002}><torusGeometry args={[.075,.009,6,48]}/><meshBasicMaterial color="#72f9ee" toneMapped={false}/></mesh></group></group>;
}
