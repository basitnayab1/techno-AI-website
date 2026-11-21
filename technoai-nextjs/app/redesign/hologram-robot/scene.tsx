"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as T from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { sampleStep,solveLeg,useCompanionMotion, type CompanionPose, type MotionControls } from "./companion-motion";
import ExpressiveMouth from "./expressive-mouth";

const AQUA = "#9fe7e7";
const BLUE = "#289fb7";
const MotionPaused = createContext(false);
const vertex = `varying vec3 n; varying vec3 view; varying vec3 p; void main(){p=position;n=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(position,1.);view=normalize(-v.xyz);gl_Position=projectionMatrix*v;}`;
const fragment = `uniform float time;uniform float strength;varying vec3 n;varying vec3 view;varying vec3 p;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(view))),2.4);float scan=pow(.5+.5*sin(p.y*135.-time*2.5),18.);float pulse=.86+.14*sin(time*1.6);vec3 color=mix(vec3(.04,.37,.58),vec3(.42,.96,1.),rim);gl_FragColor=vec4(color,(.055+rim*.44+scan*.035)*strength*pulse);}`;

function roundShape(w: number,h: number,r: number) {
  const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}

function Shell({geometry,strength=1}:{geometry:T.BufferGeometry;strength?:number}) {
  const mat=useRef<T.ShaderMaterial>(null);
  const paused=useContext(MotionPaused);
  const uniforms=useMemo(()=>({time:{value:0},strength:{value:strength}}),[strength]);
  useFrame((_,dt)=>{if(mat.current&&!paused)mat.current.uniforms.time.value+=Math.min(dt,.05)});
  return <mesh geometry={geometry}><shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} side={T.DoubleSide} blending={T.AdditiveBlending} /></mesh>;
}

function Trace({points,radius=.009,opacity=1}:{points:T.Vector3[];radius?:number;opacity?:number}) {
  const geo=useMemo(()=>new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(20,points.length*2),radius,5,false),[points,radius]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return <mesh geometry={geo}><meshBasicMaterial color={AQUA} transparent opacity={opacity} toneMapped={false} depthWrite={false} /></mesh>;
}

function RoundPanel({w,h,d,r=.25}:{w:number;h:number;d:number;r?:number}) {
  const shape=useMemo(()=>roundShape(w,h,r),[w,h,r]);
  const geo=useMemo(()=>{const g=new T.ExtrudeGeometry(shape,{depth:d,steps:1,bevelEnabled:true,bevelSegments:4,bevelSize:.04,bevelThickness:.04,curveSegments:16});g.translate(0,0,-d/2);return g},[shape,d]);
  const points=useMemo(()=>shape.getPoints(64).map(p=>new T.Vector3(p.x,p.y,d/2+.04)),[shape,d]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return <group><Shell geometry={geo}/><Trace points={points}/><group position-z={-d-.08}><Trace points={points} radius={.005} opacity={.3}/></group></group>;
}

function Orb({scale=[1,1,1],radius=1}:{scale?:[number,number,number];radius?:number}) {
  const geo=useMemo(()=>new T.SphereGeometry(radius,32,24),[radius]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return <group scale={scale}><Shell geometry={geo}/><mesh geometry={geo}><meshBasicMaterial color={BLUE} wireframe transparent opacity={.065} depthWrite={false}/></mesh></group>;
}

function Ring({radius,tube=.01}:{radius:number;tube?:number}) {
  return <mesh><torusGeometry args={[radius,tube,6,64]}/><meshBasicMaterial color={AQUA} toneMapped={false}/></mesh>;
}

function Eye({x,look,blink}:{x:number;look:React.RefObject<{x:number;y:number}>;blink:React.RefObject<number>}) {
  const eye=useRef<T.Group>(null),pupil=useRef<T.Group>(null);
  useFrame(()=>{if(eye.current)eye.current.scale.y=blink.current;if(pupil.current){pupil.current.position.x=look.current.x*.075;pupil.current.position.y=look.current.y*.06}});
  return <group position={[x,.06,.467]} ref={eye}>
    <mesh scale={[.23,.29,1]}><circleGeometry args={[1,64]}/><meshBasicMaterial color={AQUA} toneMapped={false}/></mesh>
    <group ref={pupil}><mesh position={[.025,.015,.004]} scale={[.133,.205,1]}><circleGeometry args={[1,48]}/><meshBasicMaterial color="#073344"/></mesh>
      <mesh position={[-.035,.12,.009]}><circleGeometry args={[.047,32]}/><meshBasicMaterial color="#f0ffff" toneMapped={false}/></mesh>
      <mesh position={[.08,-.09,.009]}><circleGeometry args={[.018,24]}/><meshBasicMaterial color={AQUA} toneMapped={false}/></mesh></group>
  </group>;
}

function Hand() {
  return <group><Orb scale={[.15,.18,.09]}/><group position-z={.085}><Ring radius={.105} tube={.004}/></group>{[[-.12,.13,-.3],[-.045,.19,-.1],[.035,.19,.08],[.11,.14,.25]].map(([x,y,z],i)=><group key={i} position={[x,y,0]} rotation-z={z}><Orb scale={[.037,.12,.04]}/><group rotation-x={Math.PI/2}><Ring radius={.037} tube={.003}/></group><group position-y={.09}><Ring radius={.036} tube={.004}/></group></group>)}<group position={[-.17,-.025,0]} rotation-z={-.8}><Orb scale={[.045,.1,.045]}/></group></group>;
}

function Arm({right=false,motion}:{right?:boolean;motion:React.RefObject<CompanionPose>}) {
  const root=useRef<T.Group>(null),wrist=useRef<T.Group>(null),elbow=useRef<T.Group>(null);
  useFrame(()=>{const p=motion.current,step=sampleStep(p,right?1:-1),g=p.gesture*(1-p.stride);if(root.current){root.current.rotation.z=right?.10+g*1.70-p.fear*.30:-.12-p.fear*.24;root.current.rotation.x=step.arm+Math.sin(p.time*.8+(right?1:3))*.025}if(elbow.current){elbow.current.rotation.x=-.15-Math.abs(step.arm)*.5;elbow.current.rotation.z=right?g*.32:0}if(wrist.current){wrist.current.rotation.z=Math.PI+Math.sin(p.time*(g>0?4:1.3))*(g*.12+.025);wrist.current.rotation.x=Math.sin(p.time*1.1+(right?0:2))*.025}});
  return <group position={[right?.61:-.61,.1,0]} ref={root}>
    <Orb scale={[.21,.21,.21]}/><group position-y={-.32}><Orb scale={[.16,.27,.16]}/><group rotation-x={Math.PI/2}><Ring radius={.16} tube={.006}/></group></group>
    <group position-y={-.62} ref={elbow}><Orb scale={[.15,.15,.15]}/><group position-y={-.24}><Orb scale={[.15,.23,.15]}/><group rotation-x={Math.PI/2} position-y={-.12}><Ring radius={.14} tube={.007}/></group></group><group ref={wrist} position-y={-.53}><Hand/></group></group>
  </group>;
}

function WalkingLeg({side,motion}:{side:number;motion:React.RefObject<CompanionPose>}) {
  const hip=useRef<T.Group>(null),knee=useRef<T.Group>(null),foot=useRef<T.Group>(null);
  useFrame(()=>{const p=motion.current,step=sampleStep(p,side),ik=solveLeg(step.forward,.51+p.groundBob-step.lift,.25,.26);if(hip.current)hip.current.rotation.x=-ik.hip;if(knee.current)knee.current.rotation.x=-ik.knee;if(foot.current)foot.current.rotation.x=ik.hip+ik.knee+step.pitch});
  return <group ref={hip} position={[side*.31,-1,0]} rotation-z={side*.025}><Orb scale={[.21,.28,.21]}/><group ref={knee} position-y={-.25}><Orb scale={[.19,.18,.19]}/><group rotation-x={Math.PI/2}><Ring radius={.17} tube={.007}/></group><group position-y={-.12}><Orb scale={[.16,.18,.17]}/></group><group ref={foot} position={[0,-.26,.09]}><Orb scale={[.29,.23,.4]}/><group rotation-x={Math.PI/2} scale={[1,1.35,1]}><Ring radius={.27} tube={.008}/></group><group position={[0,.015,.36]}><Trace points={[new T.Vector3(-.11,0,0),new T.Vector3(.11,0,0)]} radius={.012}/></group></group></group></group>;
}

function BodyDetails() {
  const seams=useMemo(()=>[-1,1].map(s=>[new T.Vector3(s*.18,.52,.22),new T.Vector3(s*.32,.32,.33),new T.Vector3(s*.38,.08,.32),new T.Vector3(s*.48,-.14,.23)]),[]);
  return <group>{seams.map((points,i)=><Trace key={i} points={points} radius={.005}/>) }<group position={[0,-.46,.16]} rotation-x={Math.PI/2} scale={[1,.65,1]}><Ring radius={.41} tube={.007}/></group>{[-1,0,1].map(i=><group key={i} position={[i*.075,-.30,.34]}><Trace points={[new T.Vector3(-.022,0,0),new T.Vector3(.022,0,0)]} radius={.007}/></group>)}</group>;
}

function Robot({paused,formation,walking,jumpToken,talkToken}:MotionControls&{formation:number}) {
  const root=useRef<T.Group>(null),head=useRef<T.Group>(null),heart=useRef<T.Mesh>(null),particles=useRef<T.Points>(null);
  const look=useRef({x:0,y:0}),blink=useRef(1),form=useRef(0),drag=useRef({active:false,x:0,yaw:0,distance:0});
  const {pose,jump}=useCompanionMotion({paused,walking,jumpToken,talkToken});
  const seed=useMemo(()=>{const a=new Float32Array(160*3);for(let i=0;i<160;i++){const u=i*2.39996,r=1.15+(i%13)*.035;a[i*3]=Math.sin(u)*r;a[i*3+1]=(i/159-.5)*4.3;a[i*3+2]=Math.cos(u)*r*.7}return a},[]);
  useEffect(()=>{form.current=0},[formation]);
  useEffect(()=>{
    const move=(e:PointerEvent)=>{if(drag.current.active){drag.current.yaw+=(e.clientX-drag.current.x)*.008;drag.current.distance+=Math.abs(e.clientX-drag.current.x)}drag.current.x=e.clientX};
    const up=()=>{drag.current.active=false};window.addEventListener("pointermove",move,{passive:true});window.addEventListener("pointerup",up);return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
  },[]);
  useFrame((_,dt)=>{
    if(paused)return;const d=Math.min(dt,.05);form.current=Math.min(1,form.current+d*.8);
    const p=pose.current,t=p.time,ease=1-Math.pow(1-form.current,3);look.current.x=p.lookX;look.current.y=p.lookY;blink.current=p.blink;
    if(root.current){root.current.scale.setScalar(.001+ease*.999);root.current.position.set(p.x,(1-ease)*-.6+p.y,p.z);root.current.rotation.y=T.MathUtils.damp(root.current.rotation.y,drag.current.yaw+p.yaw,4,d);root.current.rotation.x=p.lean}
    if(head.current){head.current.rotation.y=look.current.x*.22;head.current.rotation.x=-look.current.y*.16-p.fear*.08;head.current.rotation.z=Math.sin(t*.65)*.035-.055}
    if(heart.current)heart.current.scale.setScalar(1+Math.sin(t*2.5)*.08);
    if(particles.current)particles.current.rotation.y=t*.075;
  });
  const start=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();drag.current.active=true;drag.current.distance=0;drag.current.x=e.clientX};
  return <group ref={root} position-y={0} onPointerDown={start} onClick={()=>{if(drag.current.distance<6)jump()}}>
    <group ref={head} position={[0,1.07,0]}>
      <RoundPanel w={2.05} h={1.62} d={.68} r={.58}/>
      <group position={[0,0,.04]}><RoundPanel w={1.83} h={1.38} d={.69} r={.49}/></group>
      <Eye x={-.43} look={look} blink={blink}/><Eye x={.43} look={look} blink={blink}/><group position={[0,-.26,.485]}><ExpressiveMouth motion={pose}/></group>
      {[-1,1].map(s=><group key={s} position={[s*1.1,.02,0]} rotation-y={Math.PI/2}><Orb scale={[.34,.34,.15]}/><group position-z={s*.13}><Ring radius={.28}/><Ring radius={.22} tube={.005}/></group></group>)}
      <group position={[.65,.88,-.1]} rotation-z={-.22}><Orb scale={[.035,.22,.035]}/><group position-y={.22}><Orb radius={.1}/><mesh><sphereGeometry args={[.055,16,12]}/><meshBasicMaterial color={AQUA} toneMapped={false}/></mesh></group></group>
      <group position={[0,.6,.42]}><Trace points={[new T.Vector3(-.18,0,0),new T.Vector3(.18,0,0)]} radius={.016}/></group>
    </group>
    <group position={[0,.12,0]}><Orb scale={[.18,.2,.18]}/><group rotation-x={Math.PI/2}><Ring radius={.17} tube={.008}/></group></group>
    <group position={[0,-.37,0]}><Orb scale={[.59,.63,.37]}/><BodyDetails/><group scale={[.58,.61,1]}><Ring radius={1} tube={.012}/></group><group position-z={.355}><Ring radius={.19}/><Ring radius={.14} tube={.006}/><mesh ref={heart}><circleGeometry args={[.098,40]}/><meshBasicMaterial color={AQUA} toneMapped={false}/></mesh></group></group>
    <Arm right motion={pose}/><Arm motion={pose}/>
    {[-1,1].map(s=><WalkingLeg key={s} side={s} motion={pose}/>)}
    <points ref={particles}><bufferGeometry><bufferAttribute attach="attributes-position" args={[seed,3]}/></bufferGeometry><pointsMaterial color={AQUA} size={.014} transparent opacity={.4} depthWrite={false} blending={T.AdditiveBlending}/></points>
  </group>;
}

function Viewport() {
  const {camera,size}=useThree();
  useEffect(()=>{camera.position.z=size.width/size.height<.8?9.5:8.4;camera.lookAt(0,.15,0)},[camera,size]);return null;
}

function Glow() {
  const {gl,scene,camera,size}=useThree();
  const composer=useMemo(()=>{
    const c=new EffectComposer(gl);
    c.addPass(new RenderPass(scene,camera));
    c.addPass(new UnrealBloomPass(new T.Vector2(1,1),.65,.7,.58));
    // Bloom uses an opaque black render target; restore transparency so the
    // hologram blends into its page rather than showing a rectangular backdrop.
    c.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:"varying vec2 uvOut;void main(){uvOut=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform sampler2D tDiffuse;varying vec2 uvOut;void main(){vec3 c=texture2D(tDiffuse,uvOut).rgb;float a=clamp(max(c.r,max(c.g,c.b))*2.,0.,1.);gl_FragColor=vec4(c,a);}"}));
    return c;
  },[gl,scene,camera]);
  useEffect(()=>{composer.setSize(size.width,size.height)},[composer,size]);
  useEffect(()=>()=>{for(const pass of composer.passes)pass.dispose();composer.dispose()},[composer]);
  useFrame((_,dt)=>composer.render(dt),1);
  return null;
}

export default function Scene(props:MotionControls&{formation:number}) {
  return <Canvas dpr={[1,1.5]} camera={{position:[0,.2,7.2],fov:38}} gl={{alpha:true,antialias:true,powerPreference:"high-performance"}} onCreated={({gl})=>{gl.toneMapping=T.NoToneMapping;gl.setClearColor(0,0)}}><Viewport/><MotionPaused.Provider value={props.paused}><Robot {...props}/></MotionPaused.Provider><Glow/></Canvas>;
}
