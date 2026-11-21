"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";

export type MotionControls = { paused: boolean; walking?: boolean; jumpToken?: number; talkToken?: number };
export type CompanionPose = { time: number; x: number; y: number; z: number; yaw: number; lean: number; gait: number; stride: number; fear: number; lookX: number; lookY: number; blink: number; wave: number; mouth: number; lipWidth: number; gesture: number; groundBob: number; air: number };

/** Heel contact, a longer stance, toe release, then a shorter lifted return. */
export function sampleStep(p:CompanionPose,side:number) {
  const phase=(p.gait/(Math.PI*2)+(side>0?.5:0))%1,stance=.62;
  let forward=0,lift=0,pitch=0;
  if(phase<stance){const u=phase/stance;forward=.15*(1-2*u);pitch=u<.15?.065*(1-u/.15):u>.82?-.10*(u-.82)/.18:0;}
  else{const u=(phase-stance)/(1-stance),smooth=u*u*(3-2*u);forward=-.15+.30*smooth;lift=.105*Math.pow(Math.sin(u*Math.PI),1.5);pitch=.09*Math.sin(u*Math.PI);}
  return {forward:forward*p.stride,lift:lift*p.stride+p.air*.035,pitch:pitch*p.stride,arm:-forward/.15*p.stride*.24};
}

export function solveLeg(forward:number,down:number,upper:number,lower:number) {
  const distance=T.MathUtils.clamp(Math.hypot(forward,down),Math.abs(upper-lower)+.0001,upper+lower-.00001);
  const hip=Math.atan2(forward,down)+Math.acos(T.MathUtils.clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
  const knee=-Math.acos(T.MathUtils.clamp((distance*distance-upper*upper-lower*lower)/(2*upper*lower),-1,1));
  return {hip,knee};
}

/** One motion controller shared by the procedural and generated robots. */
export function useCompanionMotion({paused,walking=false,jumpToken=0,talkToken=0}:MotionControls,enabled=true) {
  const {camera,size,gl}=useThree();
  const pose=useRef<CompanionPose>({time:0,x:0,y:0,z:0,yaw:0,lean:0,gait:0,stride:0,fear:0,lookX:0,lookY:0,blink:1,wave:0,mouth:0,lipWidth:1,gesture:0,groundBob:0,air:0});
  const pointer=useRef({x:0,y:0,seen:false,dragging:false});
  const box=useRef({left:0,top:0,width:1,height:1});
  const jumpAge=useRef(10),scareAge=useRef(10),cooldown=useRef(0),nearBefore=useRef(false),previousJump=useRef(jumpToken);
  const focus=useRef(new T.Vector3());
  const talkAge=useRef(10),lastTalk=useRef(talkToken),greeted=useRef(false);
  const jump=useCallback(()=>{if(jumpAge.current>.9){jumpAge.current=0;pose.current.wave=1.8}},[]);
  useEffect(()=>{if(previousJump.current!==jumpToken){previousJump.current=jumpToken;jump()}},[jumpToken,jump]);
  useEffect(()=>{if(lastTalk.current!==talkToken){lastTalk.current=talkToken;talkAge.current=0}},[talkToken]);
  useEffect(()=>{
    const canvas=gl.domElement;
    const measure=()=>{const r=canvas.getBoundingClientRect();box.current={left:r.left,top:r.top,width:r.width,height:r.height}};
    const move=(e:PointerEvent)=>{if(e.pointerType!=="mouse")return;pointer.current={x:e.clientX,y:e.clientY,seen:true,dragging:e.buttons!==0}};
    const leave=()=>{pointer.current.seen=false};
    const observer=new ResizeObserver(measure);observer.observe(canvas);measure();
    window.addEventListener("pointermove",move,{passive:true});window.addEventListener("blur",leave);window.addEventListener("scroll",measure,{passive:true});
    return()=>{observer.disconnect();window.removeEventListener("pointermove",move);window.removeEventListener("blur",leave);window.removeEventListener("scroll",measure);delete canvas.dataset.motion};
  },[gl]);
  useFrame((_,delta)=>{
    if(paused||!enabled)return;
    const d=Math.min(delta,.05),p=pose.current,r=box.current,mouse=pointer.current;
    p.time+=d;jumpAge.current+=d;scareAge.current+=d;talkAge.current+=d;cooldown.current=Math.max(0,cooldown.current-d);p.wave=Math.max(0,p.wave-d);
    if(!greeted.current&&p.time>1.4){greeted.current=true;talkAge.current=0}
    focus.current.set(p.x,1+p.y,p.z).project(camera);
    const cx=r.left+(focus.current.x*.5+.5)*r.width,cy=r.top+(-focus.current.y*.5+.5)*r.height;
    const pixelsPerUnit=size.height/(2*Math.tan(T.MathUtils.degToRad((camera as T.PerspectiveCamera).fov/2))*camera.position.z);
    const distance=Math.hypot(mouse.x-cx,mouse.y-cy),radius=pixelsPerUnit*.95;
    const near=mouse.seen&&!mouse.dragging&&distance<radius;
    if(near&&!nearBefore.current&&cooldown.current===0){scareAge.current=0;cooldown.current=2.4}
    nearBefore.current=near;
    const fearTarget=near?.75:0;
    const surprise=scareAge.current<1.25?Math.sin(Math.min(1,scareAge.current/1.25)*Math.PI):0;
    p.fear=T.MathUtils.damp(p.fear,Math.max(fearTarget,surprise),near?12:4,d);
    p.lookX=T.MathUtils.damp(p.lookX,mouse.seen?T.MathUtils.clamp((mouse.x-cx)/(pixelsPerUnit*2.2),-1,1):0,6,d);
    p.lookY=T.MathUtils.damp(p.lookY,mouse.seen?T.MathUtils.clamp((cy-mouse.y)/(pixelsPerUnit*2),-1,1):0,6,d);
    p.stride=T.MathUtils.damp(p.stride,walking&&jumpAge.current>1?1:0,4,d);
    p.gait+=d*4.7*p.stride;
    const retreat=mouse.x>=cx?-1:1;
    const walkX=Math.sin(p.gait)*p.stride*.018;
    p.x=T.MathUtils.damp(p.x,walkX+retreat*p.fear*.24,6,d);
    p.z=T.MathUtils.damp(p.z,-p.fear*.28,6,d);
    const j=jumpAge.current;
    // Anticipation, a ballistic hop, then a short soft landing.
    const flight=T.MathUtils.clamp((j-.16)/.62,0,1);
    p.air=j>.16&&j<.78?4*flight*(1-flight):0;
    const squat=j<.16?-.085*Math.sin(j/.16*Math.PI*.5):j>=.78&&j<1?-.045*Math.sin((j-.78)/.22*Math.PI):0;
    const hop=p.air*.57;
    const flinch=scareAge.current<.62?.15*Math.sin(scareAge.current/.62*Math.PI):0;
    p.groundBob=(-.024+.012*Math.cos(p.gait*2))*p.stride+squat;
    p.y=hop+flinch+p.groundBob;
    p.yaw=p.lookX*.09+Math.sin(p.gait)*p.stride*.035;
    p.lean=-p.fear*.10+Math.sin(p.gait)*p.stride*.018;
    // A short silent greeting with uneven syllables, instead of perpetual chatter.
    const speech=talkAge.current,syllables=[{at:.18,len:.22,open:.50},{at:.56,len:.35,open:.90},{at:1.06,len:.18,open:.35},{at:1.38,len:.30,open:.72}];
    let mouth=0;for(const s of syllables){const u=(speech-s.at)/s.len;if(u>0&&u<1)mouth=Math.max(mouth,Math.sin(u*Math.PI)*s.open)}
    p.mouth=T.MathUtils.damp(p.mouth,Math.max(mouth,p.fear*.42),18,d);
    p.lipWidth=T.MathUtils.damp(p.lipWidth,1-mouth*.25,12,d);
    p.gesture=T.MathUtils.damp(p.gesture,speech<1.9||p.wave>0?1:0,5,d);
    const close=Math.exp(-Math.pow(((p.time+1.3)%4.8-2.6)/.075,2));
    p.blink=(1-close*.96)*(1+p.fear*.12);
    const mode=scareAge.current<.8?"startled":j<1?"jumping":p.stride>.1?"walking":"idle";
    if(gl.domElement.dataset.motion!==mode)gl.domElement.dataset.motion=mode;
  },-2);
  return {pose,jump};
}
