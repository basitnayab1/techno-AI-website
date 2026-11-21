"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { sampleStep,solveLeg,useCompanionMotion, type CompanionPose, type MotionControls } from "./hologram-robot/companion-motion";
import ExpressiveMouth from "./hologram-robot/expressive-mouth";
import edgeIndex from "./hologram-robot/robot-edges.json";

const MODEL="/redesign/models/hologram-reference/robot.glb";
const vertex=`varying vec3 n;varying vec3 v;varying vec3 p;void main(){p=position;vec4 pos=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-pos.xyz);gl_Position=projectionMatrix*pos;}`;
// Keep panel surfaces below the bloom threshold. Only fine contour cores and
// panel creases emit HDR light, preserving detail beneath the soft cyan halo.
const surface=`uniform float time;uniform float face;varying vec3 n;varying vec3 v;varying vec3 p;void main(){vec3 normal=normalize(n);float grazing=1.-abs(dot(normal,normalize(v)));float softRim=pow(grazing,1.8);float core=pow(grazing,7.);vec3 light=normalize(vec3(-.7,1.,.8));float diffuse=max(0.,dot(normal,light));float spec=pow(max(0.,dot(reflect(-light,normal),normalize(v))),32.);float scan=pow(.5+.5*sin(p.y*1600.-time*2.),30.)*.008;vec3 base=mix(vec3(.003,.065,.14),vec3(.012,.27,.47),diffuse);if(face>.5&&face<1.5)base*=.025;vec3 color=base+vec3(.025,.48,.95)*softRim+vec3(.65,2.8,3.2)*core+vec3(.08,.3,.42)*spec*.4+scan*vec3(0.,.18,.25);if(face>.5&&face<1.5)color=vec3(.001,.012,.021);if(face>1.5&&p.y>.025)color=vec3(.18,1.6,1.8)+vec3(.3,.5,.5)*core;gl_FragColor=vec4(color,1.);}`;
const lightVertex=`varying vec2 q;void main(){q=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const lightFragment=`varying vec2 q;void main(){float a=exp(-dot(q,q)*5.);gl_FragColor=vec4(.015,.75,1.,a*.24);}`;
const neon=new T.Color(.25,1.8,2.25);
const irisLight=new T.Color(.025,1.25,1.1);

type KneeRig={apply:(angle:number)=>void};
type ModelData={scene:T.Group;head:T.Group;hand:T.Group;legs:T.Group[];feet:T.Group[];arms:T.Group[];knees:KneeRig[];materials:T.Material[];uniforms:{time:{value:number};face:{value:number}}[]};

/** Blend the lower leg around its knee; preserve the rigid upper armor and
 * deform its contour/crease buffers together, rather than swinging a solid leg. */
function makeKneeRig(mesh:T.Mesh,upper=.15):KneeRig {
  const previous=mesh.geometry,geometry=previous.clone();mesh.geometry=geometry;
  mesh.traverse(o=>{if((o as T.Mesh).isMesh&&(o as T.Mesh).geometry===previous)(o as T.Mesh).geometry=geometry});previous.dispose();
  const pivot=new T.Vector3(0,-upper,0).sub(mesh.position);
  const geometries=new Set<T.BufferGeometry>([geometry]);
  mesh.traverse(o=>{if((o as T.LineSegments).isLineSegments)geometries.add((o as T.LineSegments).geometry)});
  const buffers=Array.from(geometries).map(g=>{
    const pos=g.getAttribute("position"),normal=g.getAttribute("normal"),rest=new Float32Array(pos.count*3),norm=normal?new Float32Array(pos.count*3):null,weights=new Float32Array(pos.count);
    for(let i=0;i<pos.count;i++){rest[i*3]=pos.getX(i);rest[i*3+1]=pos.getY(i);rest[i*3+2]=pos.getZ(i);weights[i]=1-T.MathUtils.smoothstep(rest[i*3+1]+mesh.position.y,-upper-.018,-upper+.018);if(norm){norm[i*3]=normal.getX(i);norm[i*3+1]=normal.getY(i);norm[i*3+2]=normal.getZ(i)}}
    return {pos,normal,rest,norm,weights};
  });
  let last=Infinity;
  return {apply(angle){if(Math.abs(angle-last)<.0001)return;last=angle;const c=Math.cos(angle),s=Math.sin(angle);
    for(const b of buffers){for(let i=0;i<b.pos.count;i++){const k=i*3,w=b.weights[i],x=b.rest[k]-pivot.x,y=b.rest[k+1]-pivot.y;b.pos.setXYZ(i,b.rest[k]+w*(x*c-y*s+pivot.x-b.rest[k]),b.rest[k+1]+w*(x*s+y*c+pivot.y-b.rest[k+1]),b.rest[k+2]);if(b.norm&&b.normal){const nx=b.norm[k],ny=b.norm[k+1];b.normal.setXYZ(i,nx+w*(nx*c-ny*s-nx),ny+w*(nx*s+ny*c-ny),b.norm[k+2])}}b.pos.needsUpdate=true;if(b.normal)b.normal.needsUpdate=true;}
  }};
}

function prepare(scene:T.Group,edgeBuffer:ArrayBuffer):ModelData {
  const uniforms=[{time:{value:0},face:{value:0}},{time:{value:0},face:{value:1}},{time:{value:0},face:{value:2}}];
  const bodyMaterial=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:surface,uniforms:uniforms[0]});
  const faceMaterial=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:surface,uniforms:uniforms[1]});
  const beaconMaterial=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:surface,uniforms:uniforms[2]});
  const edgeMaterial=new T.LineBasicMaterial({color:neon,transparent:true,opacity:.8,toneMapped:false});
  const contourMaterial=new T.ShaderMaterial({
    vertexShader:"void main(){vec3 expanded=position+normal*.0015;gl_Position=projectionMatrix*modelViewMatrix*vec4(expanded,1.);}",
    fragmentShader:"void main(){gl_FragColor=vec4(.22,1.9,2.6,1.);}",
    side:T.BackSide,depthWrite:false,
  });
  const meshes:T.Mesh[]=[];
  scene.traverse(o=>{if((o as T.Mesh).isMesh)meshes.push(o as T.Mesh)});
  for(const mesh of meshes){
    const old=Array.isArray(mesh.material)?mesh.material:[mesh.material];old.forEach(m=>m.dispose());
    mesh.material=mesh.name==="tripo_part_8"?faceMaterial:mesh.name==="tripo_part_12"?beaconMaterial:bodyMaterial;
    // Real panel boundaries and creases from the generated geometry; no wireframe triangles.
    const range=edgeIndex[mesh.name as keyof typeof edgeIndex];
    if(range){
      const edges=new T.BufferGeometry();
      edges.setAttribute("position",new T.BufferAttribute(new Float32Array(edgeBuffer,range.offset*4,range.length),3));
      mesh.add(new T.LineSegments(edges,edgeMaterial));
    }
    const contour=new T.Mesh(mesh.geometry,contourMaterial);
    contour.name="neon-contour";contour.renderOrder=1;
    if(mesh.name!=="tripo_part_8")mesh.add(contour);
  }
  const head=new T.Group(),hand=new T.Group();head.name="animated-head";hand.name="animated-hand";
  head.position.set(0,.065,.02);hand.position.set(.148,.008,-.223);
  scene.add(head,hand);scene.updateMatrixWorld(true);
  for(const mesh of meshes){
    if([0,8,10,11,12].some(i=>mesh.name===`tripo_part_${i}`))head.attach(mesh);
    else if(mesh.name==="tripo_part_9")hand.attach(mesh);
  }
  const legs=[new T.Group(),new T.Group()],feet=[new T.Group(),new T.Group()],arms=[new T.Group(),new T.Group()];
  for(let i=0;i<2;i++){
    const z=i===0?-.12:.10;
    legs[i].position.set(.025,-.16,z);legs[i].name=`animated-leg-${i}`;
    feet[i].position.set(.025,-.425,i===0?-.14:.135);feet[i].name=`animated-foot-${i}`;
    arms[i].position.set(.03,-.04,i===0?.11:-.10);arms[i].name=`animated-arm-${i}`;
    scene.add(legs[i],feet[i],arms[i]);
  }
  scene.updateMatrixWorld(true);
  const knees:KneeRig[]=[];
  for(let i=0;i<2;i++){
    const leg=meshes.find(m=>m.name===`tripo_part_${i===0?3:4}`),foot=meshes.find(m=>m.name===`tripo_part_${i===0?7:5}`);
    if(leg){legs[i].attach(leg);knees[i]=makeKneeRig(leg)}if(foot)feet[i].attach(foot);legs[i].attach(feet[i]);
  }
  const lowerArm=meshes.find(m=>m.name==="tripo_part_2"),upperArm=meshes.find(m=>m.name==="tripo_part_6");
  if(lowerArm)arms[0].attach(lowerArm);if(upperArm)arms[1].attach(upperArm);arms[1].attach(hand);
  scene.updateMatrixWorld(true);
  return {scene,head,hand,legs,feet,arms,knees,materials:[bodyMaterial,faceMaterial,beaconMaterial,edgeMaterial,contourMaterial],uniforms};
}

function Eyes({head,look,blink,motion}:{head:T.Group;look:React.RefObject<{x:number;y:number}>;blink:React.RefObject<number>;motion:React.RefObject<CompanionPose>}) {
  const group=useRef<T.Group>(null),left=useRef<T.Group>(null),right=useRef<T.Group>(null);
  const pupilL=useRef<T.Group>(null),pupilR=useRef<T.Group>(null);
  useEffect(()=>{
    const e=group.current;if(!e)return;
    // Face points along +X in the original GLB. Preserve native coordinates
    // so eyes move with the real head pivot, including its reconstructed tilt.
    head.add(e);e.position.set(.211-head.position.x,.230-head.position.y,.018-head.position.z);e.rotation.y=Math.PI/2;
    return()=>{head.remove(e)};
  },[head]);
  useFrame(()=>{
    for(const eye of [left.current,right.current])if(eye)eye.scale.y=blink.current;
    for(const pupil of [pupilL.current,pupilR.current])if(pupil){pupil.position.x=look.current.x*.012;pupil.position.y=look.current.y*.009;pupil.scale.setScalar(1-motion.current.fear*.18)}
  });
  return <group ref={group}>{[-1,1].map((side,i)=><group key={side} ref={i===0?left:right} position={[side*.085,0,0]}>
    <mesh position-z={-.0005} scale={[.075,.095,1]}><planeGeometry args={[2,2]}/><shaderMaterial vertexShader={lightVertex} fragmentShader={lightFragment} transparent depthWrite={false} blending={T.AdditiveBlending}/></mesh>
    <mesh scale={[.041,.057,1]}><circleGeometry args={[1,64]}/><meshBasicMaterial color={irisLight} toneMapped={false}/></mesh>
    <group ref={i===0?pupilL:pupilR}><mesh position={[.003,.013,.001]} scale={[.025,.038,1]}><circleGeometry args={[1,48]}/><meshBasicMaterial color="#001923"/></mesh><mesh position={[-.008,.034,.002]}><circleGeometry args={[.0085,32]}/><meshBasicMaterial color="#edffff" toneMapped={false}/></mesh></group>
  </group>)}<group position={[0,-.092,.002]} scale={.2}><ExpressiveMouth motion={motion} mask/></group></group>;
}

export default function HeroReferenceModel({paused,walking,jumpToken,talkToken,locomotion,onReady,onError}:MotionControls&{locomotion:React.RefObject<{gait:number;stride:number}>;onReady:()=>void;onError:()=>void}) {
  const {gl,scene,camera,invalidate}=useThree();
  const [compiled,setCompiled]=useState(false);
  const root=useRef<T.Group>(null),blink=useRef(1),look=useRef({x:0,y:0}),drag=useRef({active:false,last:0,yaw:0,distance:0});
  const [data,setData]=useState<ModelData|null>(null);
  const {pose,jump}=useCompanionMotion({paused,walking,jumpToken,talkToken},!!data);
  const readyRef=useRef(onReady),errorRef=useRef(onError);readyRef.current=onReady;errorRef.current=onError;
  useEffect(()=>{
    let active=true,loaded:ModelData|null=null;
    Promise.all([
      new GLTFLoader().loadAsync(MODEL),
      fetch("/redesign/models/hologram-reference/robot-edges.bin").then(response=>{
        if(!response.ok)throw new Error("Robot edge buffers unavailable");
        return response.arrayBuffer();
      }),
    ]).then(([g,edges])=>{
      if(!active){g.scene.traverse(o=>{if((o as T.Mesh).isMesh)(o as T.Mesh).geometry.dispose()});return}
      loaded=prepare(g.scene,edges);setData(loaded);
    }).catch(()=>{if(active)errorRef.current()});
    return()=>{active=false;if(loaded){const geometries=new Set<T.BufferGeometry>();loaded.scene.traverse(o=>{if((o as T.Mesh).isMesh||(o as T.LineSegments).isLineSegments)geometries.add((o as T.Mesh).geometry)});geometries.forEach(g=>g.dispose());loaded.materials.forEach(m=>m.dispose())}};
  },[]);
  useEffect(()=>{
    if(!data)return;
    let active=true;
    const compileCamera=camera.clone();
    compileCamera.layers.enableAll();
    gl.compileAsync(scene,compileCamera).then(()=>{
      if(!active)return;
      setCompiled(true);readyRef.current();invalidate();
    }).catch(()=>{if(active)errorRef.current()});
    return()=>{active=false};
  },[data,gl,scene,camera,invalidate]);
  useEffect(()=>{
    const move=(e:PointerEvent)=>{if(drag.current.active){drag.current.yaw+=(e.clientX-drag.current.last)*.007;drag.current.distance+=Math.abs(e.clientX-drag.current.last)}drag.current.last=e.clientX};
    const up=()=>{drag.current.active=false};window.addEventListener("pointermove",move,{passive:true});window.addEventListener("pointerup",up);return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
  },[]);
  useFrame((_,delta)=>{
    if(!data||paused)return;const d=Math.min(delta,.05);const p=pose.current,t=p.time;
    // Tie each step to distance travelled; retain the original jump/landing motion.
    const oldBob=p.groundBob;
    const squat=oldBob-(-.024+.012*Math.cos(p.gait*2))*p.stride;
    p.gait=locomotion.current.gait;p.stride=locomotion.current.stride;
    p.groundBob=(-.024+.012*Math.cos(p.gait*2))*p.stride+squat;
    p.y+=p.groundBob-oldBob;p.x=0;p.z=0;p.lean=Math.sin(p.gait)*p.stride*.018;
    if(root.current){root.current.scale.setScalar(4);root.current.position.set(p.x,.07+p.y,p.z);root.current.rotation.y=T.MathUtils.damp(root.current.rotation.y,-Math.PI/2+.12+p.yaw+drag.current.yaw,4,d);root.current.rotation.x=p.lean}
    look.current.x=p.lookX;look.current.y=p.lookY;blink.current=p.blink;
    data.head.rotation.y=look.current.x*.16;data.head.rotation.z=look.current.y*.11+Math.sin(t*.6)*.008-p.fear*.05;
    data.legs.forEach((leg,i)=>{const step=sampleStep(p,i===0?1:-1),ik=solveLeg(step.forward/4,.265+p.groundBob/4-step.lift/4,.15,.115);leg.rotation.x=0;leg.rotation.z=ik.hip;data.knees[i]?.apply(ik.knee);data.feet[i].position.x=.115*Math.sin(ik.knee);data.feet[i].position.y=-.15-.115*Math.cos(ik.knee);data.feet[i].rotation.x=0;data.feet[i].rotation.z=-ik.hip+step.pitch});
    const leftStep=sampleStep(p,-1);
    data.arms[0].rotation.x=-p.fear*.10+Math.sin(t*.8+2)*.02;
    data.arms[0].rotation.z=leftStep.arm+Math.sin(t*.65+1)*.018;
    // Relax the raised arm into a counter-swing while walking; greet when stopped.
    data.arms[1].quaternion.identity();
    data.arms[1].rotation.z=-p.stride*.85-leftStep.arm;
    data.hand.rotation.x=Math.sin(t*7)*p.gesture*.22;
    data.uniforms.forEach(u=>u.time.value=t);
  });
  const down=(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();drag.current.active=true;drag.current.distance=0;drag.current.last=e.clientX};
  if(!data)return null;
  return <group ref={root} visible={compiled} scale={4} position-y={.07} rotation-y={-Math.PI/2} onPointerDown={down} onClick={()=>{if(drag.current.distance<6)jump()}}>
    <primitive object={data.scene}/><Eyes head={data.head} look={look} blink={blink} motion={pose}/>
    <group position={[.16,-.068,-.015]} rotation-y={Math.PI/2}><mesh><torusGeometry args={[.032,.0015,6,64]}/><meshBasicMaterial color={neon} toneMapped={false}/></mesh><mesh><torusGeometry args={[.025,.001,6,64]}/><meshBasicMaterial color={neon} toneMapped={false}/></mesh><mesh position-z={.002}><circleGeometry args={[.017,40]}/><meshBasicMaterial color={new T.Color(.65,1.8,1.9)} toneMapped={false}/></mesh></group>
  </group>;
}
