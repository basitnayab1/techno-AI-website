"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const CYAN="#64f6ff",ICE="#aeffff";
const MaterialContext=createContext<T.ShaderMaterial|null>(null);
const vert=`varying vec3 normalOut;varying vec3 viewOut;varying vec3 posOut;void main(){vec4 p=modelViewMatrix*vec4(position,1.);normalOut=normalize(normalMatrix*normal);viewOut=normalize(-p.xyz);posOut=position;gl_Position=projectionMatrix*p;}`;
const frag=`uniform float time;varying vec3 normalOut;varying vec3 viewOut;varying vec3 posOut;void main(){vec3 n=normalize(normalOut);float facing=abs(dot(n,normalize(viewOut)));float rim=pow(1.-facing,2.4);float light=max(0.,dot(n,normalize(vec3(-.6,1.,.9))));float gloss=pow(max(0.,dot(reflect(-normalize(vec3(-.6,1.,.9)),n),normalize(viewOut))),30.);float scan=pow(.5+.5*sin(posOut.y*100.-time*1.4),22.)*.012;vec3 blue=mix(vec3(.003,.044,.105),vec3(.008,.28,.46),light);vec3 c=blue+vec3(.035,.64,.83)*rim+vec3(.06,.32,.40)*gloss+vec3(0.,.14,.2)*scan;gl_FragColor=vec4(c,.94);}`;

function sphereGeo() { return new T.SphereGeometry(1,48,32); }
function Shape({kind="sphere",scale=[1,1,1],position=[0,0,0],rotation=[0,0,0]}:{kind?:"sphere"|"box"|"capsule";scale?:[number,number,number];position?:[number,number,number];rotation?:[number,number,number]}) {
  const material=useContext(MaterialContext)!;
  const geo=useMemo(()=>kind==="sphere"?sphereGeo():kind==="box"?new RoundedBoxGeometry(2,2,2,6,.65):new T.CapsuleGeometry(1,1,8,24),[kind]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return <mesh geometry={geo} material={material} scale={scale} position={position} rotation={rotation}/>;
}

function Stroke({points,width=.009,color=CYAN,opacity=1}:{points:T.Vector3[];width?:number;color?:string;opacity?:number}) {
  const geo=useMemo(()=>new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(30,points.length*2),width,6,false),[points,width]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return <mesh geometry={geo}><meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false}/></mesh>;
}

function Circle({r,width=.008,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1],opacity=1}:{r:number;width?:number;position?:[number,number,number];rotation?:[number,number,number];scale?:[number,number,number];opacity?:number}) {
  return <mesh position={position} rotation={rotation} scale={scale}><torusGeometry args={[r,width,8,80]}/><meshBasicMaterial color={CYAN} transparent opacity={opacity} toneMapped={false}/></mesh>;
}

function outline(w:number,h:number,r:number,z:number) {
  const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return {shape:s,points:s.getPoints(96).map(p=>new T.Vector3(p.x,p.y,z))};
}

/** Hand-shaped helmet/visor contour: domed crown, tapered cheeks and a soft chin. */
function helmetContour(scale=1,z=.66) {
  const s=new T.Shape();
  s.moveTo(-.43,.70);s.bezierCurveTo(-.86,.69,-1.03,.40,-1.03,.03);
  s.bezierCurveTo(-1.04,-.44,-.83,-.68,-.46,-.70);
  s.bezierCurveTo(-.17,-.73,.28,-.73,.56,-.64);
  s.bezierCurveTo(.94,-.53,1.02,-.25,.98,.15);
  s.bezierCurveTo(.96,.53,.72,.72,.37,.72);
  s.bezierCurveTo(.08,.75,-.15,.72,-.43,.70);
  const points=s.getPoints(100).map(p=>new T.Vector3(p.x*scale,p.y*scale,z));
  return {shape:s,points};
}

function Helmet() {
  const material=useContext(MaterialContext)!;
  const contour=useMemo(()=>helmetContour(1.1,.56),[]);
  const geometry=useMemo(()=>{
    const g=new T.ExtrudeGeometry(contour.shape,{depth:.69,steps:1,bevelEnabled:true,bevelSegments:8,bevelThickness:.12,bevelSize:.10,curveSegments:32});
    g.scale(1.15,1.15,1);g.translate(0,0,-.28);return g;
  },[contour]);
  const seam=useMemo(()=>contour.points.map(p=>new T.Vector3(p.x*.97,p.y*.97,.53)),[contour]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group><mesh geometry={geometry} material={material}/><Stroke points={contour.points} width={.012}/><Stroke points={seam} width={.005}/></group>;
}

function Visor() {
  const face=useMemo(()=>helmetContour(.93,.665),[]);
  const geo=useMemo(()=>new T.ShapeGeometry(face.shape,48),[face]);
  useEffect(()=>()=>geo.dispose(),[geo]);
  return <group><mesh geometry={geo} scale={[.93,.93,1]} position-z={.655}><meshBasicMaterial color="#00101f"/></mesh><Stroke points={face.points} width={.012}/><group scale={[1.065,1.065,1]} position-z={-.025}><Stroke points={face.points} width={.006}/></group></group>;
}

function Eye({x,look,blink}:{x:number;look:React.RefObject<{x:number;y:number}>;blink:React.RefObject<number>}) {
  const outer=useRef<T.Group>(null),pupil=useRef<T.Group>(null);
  useFrame(()=>{if(outer.current)outer.current.scale.y=blink.current;if(pupil.current){pupil.current.position.x=look.current.x*.04;pupil.current.position.y=look.current.y*.025}});
  return <group position={[x,.025,.685]} ref={outer} rotation-z={x<0?-.08:.06}>
    <mesh scale={[.205,.285,1]}><circleGeometry args={[1,64]}/><meshBasicMaterial color="#22dedb" toneMapped={false}/></mesh>
    <mesh scale={[.2,.28,.02]} position-z={.002}><sphereGeometry args={[1,40,24]}/><meshBasicMaterial color="#37e2d9" transparent opacity={.25}/></mesh>
    <group ref={pupil}><mesh position={[.01,.066,.03]} scale={[.123,.187,1]}><circleGeometry args={[1,48]}/><meshBasicMaterial color="#00202c"/></mesh><mesh position={[-.035,.175,.04]}><circleGeometry args={[.046,32]}/><meshBasicMaterial color="#efffff" toneMapped={false}/></mesh><mesh position={[.07,-.08,.04]}><circleGeometry args={[.016,24]}/><meshBasicMaterial color={ICE} transparent opacity={.4}/></mesh></group>
  </group>;
}

function Finger({length=.2,rotation=0,position=[0,0,0]}:{length?:number;rotation?:number;position?:[number,number,number]}) {
  return <group position={position} rotation-z={rotation}>
    <Shape kind="capsule" scale={[.041,length*.20,.042]} position={[0,length*.27,0]}/>
    <Circle r={.042} width={.0035} position={[0,length*.50,0]} rotation={[Math.PI/2,0,0]}/>
    <Stroke points={[new T.Vector3(-.02,.01,.038),new T.Vector3(-.025,length*.32,.039),new T.Vector3(-.02,length*.49,.037)]} width={.0025}/>
    <group position={[0,length*.57,0]} rotation-x={-.10}><Shape kind="capsule" scale={[.038,length*.17,.040]} position={[0,length*.20,0]}/><Circle r={.037} width={.0025} position={[0,length*.29,0]} rotation={[Math.PI/2,0,0]}/></group>
  </group>;
}

function Hand({open=true}:{open?:boolean}) {
  return <group scale={1.28}><Shape kind="box" scale={[.17,.16,.073]}/><Circle r={.11} width={.004} position={[0,-.012,.075]} scale={[1,1.05,1]}/>{[[-.14,.12,-.40],[-.047,.16,-.14],[.053,.15,.12],[.145,.10,.39]].map(([x,y,a],i)=><Finger key={i} position={[x,y,.01]} length={open?[.21,.25,.23,.18][i]:.13} rotation={a}/>)}<group position={[-.16,-.06,.005]} rotation-z={-.95}><Finger length={.17} rotation={-.12}/></group></group>;
}

function Arm({wave=false,clock}:{wave?:boolean;clock:React.RefObject<number>}) {
  const shoulder=useRef<T.Group>(null),wrist=useRef<T.Group>(null);
  useFrame(()=>{if(shoulder.current)shoulder.current.rotation.z=wave?1.80+Math.sin(clock.current*2.4)*.045:-.24+Math.sin(clock.current*.9)*.025;if(wrist.current&&wave)wrist.current.rotation.z=Math.PI+.10+Math.sin(clock.current*4)*.11});
  return <group position={[wave?.57:-.57,-.1,0]} ref={shoulder}>
    <Shape scale={[.235,.235,.235]}/><Circle r={.18} position={[0,0,.16]} width={.005}/>
    <group position={[0,-.29,0]}><Shape kind="capsule" scale={[.17,.15,.17]}/><Circle r={.16} rotation={[Math.PI/2,0,0]} position={[0,-.13,0]}/></group>
    <group position={[0,-.52,0]} rotation={[wave?-.10:-.12,0,wave?.76:0]}><Shape scale={[.145,.145,.145]}/><Circle r={.12} rotation={[0,Math.PI/2,0]}/><group position={[0,-.25,0]}><Shape kind="capsule" scale={[.18,.17,.17]}/><Circle r={.175} rotation={[Math.PI/2,0,0]} position={[0,-.11,0]}/><Circle r={.16} rotation={[Math.PI/2,0,0]} position={[0,-.17,0]} width={.004}/></group><group position={[0,-.53,0]} rotation-z={Math.PI} ref={wrist}><Hand open={wave}/></group></group>
  </group>;
}

function Leg({side}:{side:number}) {
  const boot=useMemo(()=>outline(.53,.22,.09,.355),[]);
  return <group position={[side*.29,-.96,0]} rotation-z={side*.055}>
    <Shape kind="capsule" scale={[.21,.19,.23]} position={[0,-.04,0]}/><Circle r={.20} rotation={[Math.PI/2,0,0]} position={[0,-.13,0]} width={.005}/>
    <group position={[0,-.33,.04]}><Shape scale={[.19,.18,.19]}/><Circle r={.13} position={[0,0,.15]}/></group>
    <group position={[0,-.54,0]}><Shape kind="capsule" scale={[.22,.15,.21]}/><Circle r={.22} rotation={[Math.PI/2,0,0]} position={[0,-.1,0]}/></group>
    <group position={[0,-.77,.13]}><Shape scale={[.30,.205,.42]} position={[0,.01,-.01]}/><Shape kind="box" scale={[.31,.055,.41]} position={[0,-.135,0]}/><Shape scale={[.23,.20,.25]} position={[0,.09,-.12]}/><group position-y={-.09}><Stroke points={boot.points} width={.009}/></group><Circle r={.29} rotation={[Math.PI/2,0,0]} position={[0,-.16,0]} scale={[1,1.36,1]}/><Circle r={.26} rotation={[Math.PI/2,0,0]} position={[0,.025,-.01]} scale={[1,1.36,1]} width={.005}/><Stroke points={[new T.Vector3(-.13,.035,.39),new T.Vector3(.13,.035,.39)]} width={.012}/></group>
  </group>;
}

function Torso() {
  const material=useContext(MaterialContext)!;
  const geometry=useMemo(()=>{
    const profile=[new T.Vector2(0,-.64),new T.Vector2(.23,-.62),new T.Vector2(.43,-.48),new T.Vector2(.54,-.20),new T.Vector2(.55,.04),new T.Vector2(.49,.32),new T.Vector2(.35,.55),new T.Vector2(.20,.61),new T.Vector2(0,.61)];
    const curve=new T.SplineCurve(profile);const g=new T.LatheGeometry(curve.getPoints(64),64);g.scale(1,1,.74);return g;
  },[]);
  const border=useMemo(()=>Array.from({length:90},(_,i)=>{const a=i/89*Math.PI*2;return new T.Vector3(Math.sin(a)*.46,Math.cos(a)*.55,.235+Math.sin(a)**2*.08)}),[]);
  const seams=useMemo(()=>[-1,1].map(s=>[new T.Vector3(s*.18,.52,.2),new T.Vector3(s*.30,.34,.29),new T.Vector3(s*.34,.12,.34),new T.Vector3(s*.48,-.08,.22)]),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group><mesh geometry={geometry} material={material}/><Stroke points={border} width={.006}/>{seams.map((p,i)=><Stroke key={i} points={p} width={.004}/>)}</group>;
}

function Character({paused,formation}:{paused:boolean;formation:number}) {
  const material=useMemo(()=>new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:true}),[]);
  const root=useRef<T.Group>(null),head=useRef<T.Group>(null),clock=useRef(0),blink=useRef(1),look=useRef({x:0,y:0}),target=useRef({x:0,y:0}),form=useRef(0),drag=useRef({active:false,x:0,yaw:0}),pulse=useRef<T.Mesh>(null);
  const brow=useMemo(()=>outline(.6,.17,.075,.59).points,[]);
  const smile=useMemo(()=>Array.from({length:30},(_,i)=>{const a=Math.PI*1.18+i/29*Math.PI*.64;return new T.Vector3(Math.cos(a)*.16,-.24+Math.sin(a)*.11,.71)}),[]);
  const torsoLines=useMemo(()=>Array.from({length:80},(_,i)=>{const a=i/79*Math.PI*2;return new T.Vector3(Math.sin(a)*.49,Math.cos(a)*.54,.21+Math.sin(a)*Math.sin(a)*.07)}),[]);
  const headSeam=useMemo(()=>Array.from({length:60},(_,i)=>{const a=-Math.PI*.5+i/59*Math.PI;return new T.Vector3(Math.sin(a)*1.03,Math.cos(a)*.86,.26)}),[]);
  useEffect(()=>()=>material.dispose(),[material]);
  useEffect(()=>{form.current=0},[formation]);
  useEffect(()=>{const move=(e:PointerEvent)=>{target.current={x:(e.clientX/innerWidth-.5)*2,y:-(e.clientY/innerHeight-.5)*2};if(drag.current.active)drag.current.yaw+=(e.clientX-drag.current.x)*.006;drag.current.x=e.clientX};const up=()=>{drag.current.active=false};window.addEventListener("pointermove",move,{passive:true});window.addEventListener("pointerup",up);return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)}},[]);
  useFrame((_,delta)=>{
    if(paused)return;const d=Math.min(delta,.05);clock.current+=d;material.uniforms.time.value=clock.current;form.current=Math.min(1,form.current+d*.8);const ease=1-Math.pow(1-form.current,3),t=clock.current;
    look.current.x=T.MathUtils.damp(look.current.x,target.current.x,4,d);look.current.y=T.MathUtils.damp(look.current.y,target.current.y,4,d);
    blink.current=1-Math.exp(-Math.pow(((t+1.1)%5-2.5)/.065,2))*.96;
    if(root.current){root.current.scale.setScalar(.001+ease*.999);root.current.rotation.y=T.MathUtils.damp(root.current.rotation.y,-.24+look.current.x*.14+drag.current.yaw,4,d)}
    if(head.current){head.current.rotation.set(-look.current.y*.07,look.current.x*.10,Math.sin(t*.6)*.015+.105)}
    if(pulse.current)pulse.current.scale.setScalar(1+Math.sin(t*2.4)*.045);
  });
  const down=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();drag.current.active=true;drag.current.x=e.clientX};
  return <MaterialContext.Provider value={material}><group ref={root} onPointerDown={down} onClick={()=>{clock.current+=.9}}>
    <group ref={head} position={[0,1.06,0]}>
      <Helmet/><Visor/><Stroke points={headSeam} width={.008}/><group scale={[1.035,1.025,1]} position-z={-.02}><Stroke points={headSeam} width={.005}/></group>
      <Eye x={-.39} look={look} blink={blink}/><Eye x={.39} look={look} blink={blink}/><Stroke points={smile} width={.016} color="#50f5ee"/>
      <group position={[0,.65,-.03]}><Shape kind="box" scale={[.35,.15,.53]}/><group position={[0,.015,0]}><Stroke points={brow} width={.006}/></group><Stroke points={[new T.Vector3(-.18,.015,.606),new T.Vector3(.18,.015,.606)]} width={.015}/></group>
      {[-1,1].map(s=><group key={s} position={[s*1.09,-.02,0]} rotation-y={Math.PI/2}><Shape scale={[.34,.36,.13]}/><Circle r={.31} position={[0,0,s*.12]} width={.012}/><Circle r={.24} position={[0,0,s*.14]} width={.007}/></group>)}
      <group position={[.69,.94,-.1]} rotation-z={-.2}><Shape kind="capsule" scale={[.026,.13,.026]}/><group position={[0,.235,0]}><mesh><sphereGeometry args={[.085,32,24]}/><meshBasicMaterial color={CYAN} toneMapped={false}/></mesh><mesh position={[-.023,.033,.073]}><sphereGeometry args={[.018,16,12]}/><meshBasicMaterial color={ICE} toneMapped={false}/></mesh></group></group>
    </group>
    <Shape kind="capsule" scale={[.18,.13,.18]} position={[0,.16,0]}/><Circle r={.18} position={[0,.12,0]} rotation={[Math.PI/2,0,0]}/>
    <group position={[0,-.42,0]}><Torso/><group position-z={.415}><Circle r={.20} width={.011}/><Circle r={.155} width={.005}/><Shape scale={[.12,.12,.025]}/><mesh ref={pulse} position-z={.035}><circleGeometry args={[.09,48]}/><meshBasicMaterial color={ICE} toneMapped={false}/></mesh></group>
      {[-1,1].map(s=><group key={s} position={[s*.42,-.32,.25]} rotation-z={s*.65}><Shape kind="box" scale={[.12,.07,.08]}/><Stroke points={[new T.Vector3(-.08,0,.08),new T.Vector3(.08,0,.08)]} width={.005}/></group>)}
    </group>
    <Arm wave clock={clock}/><Arm clock={clock}/><Leg side={-1}/><Leg side={1}/>
  </group></MaterialContext.Provider>;
}

export function Floor({paused}:{paused:boolean}) {
  const ring=useRef<T.Group>(null),time=useRef(0);
  useFrame((_,dt)=>{if(!paused){time.current+=Math.min(dt,.05);if(ring.current)ring.current.rotation.y=time.current*.08}});
  return <group position-y={-1.93} ref={ring}>
    {[.78,1.18,1.53].map((r,i)=><Circle key={r} r={r} width={i===0?.009:.003} opacity={.5-i*.15} rotation={[-Math.PI/2,0,0]}/>)}
    <mesh rotation-x={-Math.PI/2} position-y={-.015}><circleGeometry args={[1.7,80]}/><meshBasicMaterial color="#0a6684" transparent opacity={.07} depthWrite={false}/></mesh>
  </group>;
}

export function Presentation({bloomStrength=.5,bloomThreshold=.6,cameraDistance=8,mobileDistance=9.6}:{bloomStrength?:number;bloomThreshold?:number;cameraDistance?:number;mobileDistance?:number} = {}) {
  const {gl,scene,camera,size}=useThree();
  const composer=useMemo(()=>{const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4});const c=new EffectComposer(gl,target);c.addPass(new RenderPass(scene,camera));c.addPass(new UnrealBloomPass(new T.Vector2(1,1),bloomStrength,.65,bloomThreshold));c.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:"varying vec2 uvOut;void main(){uvOut=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform sampler2D tDiffuse;varying vec2 uvOut;void main(){vec3 c=texture2D(tDiffuse,uvOut).rgb;float a=clamp(max(c.r,max(c.g,c.b))*4.,0.,1.);gl_FragColor=vec4(c,a);}"}));return c},[gl,scene,camera,bloomStrength,bloomThreshold]);
  useEffect(()=>{composer.setSize(size.width,size.height);camera.position.set(.1,.22,size.width/size.height<.8?mobileDistance:cameraDistance);camera.lookAt(0,.04,0)},[composer,camera,size,cameraDistance,mobileDistance]);
  useEffect(()=>()=>{for(const p of composer.passes)p.dispose();composer.dispose()},[composer]);
  useFrame((_,dt)=>composer.render(dt),1);return null;
}

export default function ReferenceScene(props:{paused:boolean;formation:number}) {
  return <Canvas dpr={[1,1.5]} camera={{fov:36,position:[.1,.22,8]}} gl={{antialias:true,alpha:true,powerPreference:"high-performance"}} onCreated={({gl})=>{gl.toneMapping=T.NoToneMapping;gl.setClearColor(0,0)}}><Character {...props}/><Floor paused={props.paused}/><Presentation/></Canvas>;
}

