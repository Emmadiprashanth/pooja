"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
 const [email,setEmail]=useState(""); const [status,setStatus]=useState(""); const [busy,setBusy]=useState(false);
 useEffect(() => {
  const context=(document as Document & {modelContext?:{registerTool:(tool:unknown, options:{signal:AbortSignal})=>unknown}}).modelContext;
  if(!context) return;
  const lifecycle=new AbortController();
  try { Promise.resolve(context.registerTool({name:'prepare_launch_signup',description:'Fill the launch signup email field without submitting. The visitor reviews and presses Notify me to join.',inputSchema:{type:'object',properties:{email:{type:'string'}},required:['email'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input:unknown){const value=(input as {email?:unknown})?.email;if(typeof value!=='string'||value.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Valid email required');setEmail(value);document.getElementById('notify')?.scrollIntoView();return {prepared:true,submitted:false};}}, {signal:lifecycle.signal})).catch(()=>{}); } catch {}
  return ()=>lifecycle.abort();
 },[]);
 async function join(e: React.FormEvent) {
  e.preventDefault(); setBusy(true); setStatus("");
  try { const r=await fetch("/api/waitlist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
   if(!r.ok) throw new Error("We couldn’t save your email. Please try again.");
   setStatus("You’re on the list. Thank you for being part of our beginning."); setEmail("");
  } catch(e){setStatus(e instanceof Error?e.message:"Please try again.");} finally{setBusy(false);}
 }
 return <main>
 <header><a className="brand" href="#" aria-label="Divya Pooja home"><span className="mark">ॐ</span>Divya Pooja</a><a className="navlink" href="#notify">Be there at the beginning</a></header>
 <section className="hero"><div className="story"><p className="eyebrow">A LITTLE CLOSER TO THE DIVINE</p><h1>Your traditions.<br/>Your family.<br/><em>Your Pooja.</em></h1><p className="lede">A familiar voice to guide your sacred moments. Telugu Pooja guidance, thoughtfully made for your home—wherever home may be.</p><a className="cta" href="#notify">Notify me at launch <span aria-hidden="true">↗</span></a><p className="availability">Coming soon for iPhone & Android</p></div>
 <div className="preview"><div className="preview-heading"><span>DIVYA POOJA</span><span>APP PREVIEW</span></div><div className="preview-content"><p className="greeting">Make room for a sacred moment.</p><h2>Your daily Pooja</h2><div className="session"><div><p className="small-label">KEEP READY</p><ul><li>Lamp & oil</li><li>Flowers</li><li>Turmeric & kumkum</li><li>Fruit & water</li></ul></div><div className="voice"><span className="om">ॐ</span><span className="small-label">POOJARI AUDIO</span><span className="sample-pill">Coming soon</span></div></div><div className="caption"><span>SUBTITLE PREVIEW</span><p>Light the lamp and prepare your Pooja space.</p></div><div className="family"><span>Your family, together</span><p>Add the names of everyone taking part.</p></div></div><p className="preview-note">Design preview · recordings in preparation</p></div>
 </section>
 <section className="features" aria-label="What we are preparing"><article><span>01 / LISTEN</span><h2>Guidance you can follow.</h2><p>Poojari-recorded Telugu audio, clear subtitles and a Samagri list beside you.</p></article><article><span>02 / PREPARE</span><h2>Ready for sacred days.</h2><p>Daily and festival Poojas, with a Telugu calendar and preparation reminders planned for launch.</p></article><article><span>03 / TOGETHER</span><h2>A place for every name.</h2><p>Family participants and personalized Sankalpam are at the heart of what we’re building.</p></article></section>
 <section id="notify" className="signup"><div><p className="eyebrow">BE PART OF OUR BEGINNING</p><h2>We’ll let you know<br/>when it’s time.</h2><p>Leave your email for the Divya Pooja launch announcement.</p></div><form onSubmit={join}><label htmlFor="email">Your email address</label><div className="form-row"><Input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><Button type="submit" disabled={busy}>{busy?"Saving…":"Notify me"}</Button></div><p className="consent">By joining, you agree to receive launch updates from Divya Pooja. Your email will be stored for this purpose, not displayed publicly. No purchase required.</p><p role="status">{status}</p></form></section>
 <footer><a className="brand" href="#">Divya Pooja</a><span>Your Pooja. Your Guide.</span><span>© 2026 Divya Pooja</span></footer>
 </main>;
}
