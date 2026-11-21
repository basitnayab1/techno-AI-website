"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import "./preview.css";

const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => <div className="hr-loading">Forming your companion…</div> });
const ReferenceScene = dynamic(() => import("./reference-scene"), { ssr: false, loading: () => <div className="hr-loading">Forming your companion…</div> });
const ModelScene = dynamic(() => import("./model-scene"), { ssr: false, loading: () => <div className="hr-loading">Loading your 3D companion…</div> });

export default function Preview({ reference = false, generated = false }: { reference?: boolean; generated?: boolean }) {
  const [paused, setPaused] = useState(false);
  const [formation, setFormation] = useState(0);
  const [walking, setWalking] = useState(false);
  const [jumpToken, setJumpToken] = useState(0);
  const [talkToken, setTalkToken] = useState(0);
  return <main className={`hr-preview${reference || generated ? " hr-reference" : ""}`}>
    <header className="hr-header"><a href="/" aria-label="TechnoAI home">//:ai</a><span>CHARACTER LAB <i /> {generated ? "03" : reference ? "02" : "01"}</span><a className="hr-back" href={generated ? "/redesign/hologram-robot-v2/" : reference ? "/redesign/hologram-robot/" : "/"}>{generated || reference ? "Compare previous sample ↗" : "Back to website ↗"}</a></header>
    <div className="hr-stage" aria-label="Interactive holographic robot">{generated ? <ModelScene paused={paused} formation={formation} walking={walking} jumpToken={jumpToken} talkToken={talkToken}/> : reference ? <ReferenceScene paused={paused} formation={formation} /> : <Scene paused={paused} formation={formation} walking={walking} jumpToken={jumpToken} talkToken={talkToken}/>}</div>
    <div className="hr-copy"><p className="hr-eyebrow">{generated ? "YOUR REFERENCE · BROUGHT INTO 3D" : reference ? "THE HOLOGRAPHIC COMPANION · SECOND STUDY" : "A LITTLE LIGHT. A LOT OF PERSONALITY."}</p><h1>{reference || generated ? "A friend, made of light." : "Meet your digital companion."}</h1><p>Move your cursor. Say hello.</p></div>
    <footer className="hr-controls"><span><i /> {generated ? "LIVE 3D · REFERENCE MODEL" : "LIVE 3D · MADE WITH CODE"}</span><div><button onClick={() => setPaused(v => !v)}>{paused ? "Resume motion" : "Pause motion"}</button>{!reference&&<><button aria-pressed={walking} onClick={()=>{setWalking(v=>!v);setPaused(false)}}>{walking?"Stop walking":"Walk"}</button><button onClick={()=>{setJumpToken(v=>v+1);setPaused(false)}}>Jump</button><button onClick={()=>{setTalkToken(v=>v+1);setPaused(false)}}>Say hello</button></>}<button onClick={() => {setFormation(v => v + 1);setPaused(false)}}>Form again ↻</button></div><small>Drag to turn · {reference?"Tap to wave":"Move closer · Tap to jump"}</small></footer>
  </main>;
}
