import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterIntegritetSection({ data, set, inp, lbl }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Integritetspolicy</span>
          </div>
          <h3 className="font-semibold text-slate-800">Integritetspolicy</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.integritet_bg||"#ffffff"} onChange={e=>set("integritet_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.integritet_eyebrow||""} onChange={e=>set("integritet_eyebrow",e.target.value)} placeholder="GDPR – Integritetspolicy" className={inp}/>
            <TextColorPicker label="Färg" colorKey="integritet_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.integritet_title||""} onChange={e=>set("integritet_title",e.target.value)} placeholder="Integritetspolicy GDPR" className={inp}/>
            <TextColorPicker label="Färg" colorKey="integritet_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.integritet_intro||""} onChange={e=>set("integritet_intro",e.target.value)} rows={2} placeholder="Vi på PureNorth Städ värnar om din personliga integritet..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="integritet_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Sektioner färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.integritet_heading_color||"#141414"} onChange={e=>set("integritet_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.integritet_text_color||"#475569"} onChange={e=>set("integritet_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Bullet</span>
            <CircleColor value={data.integritet_bullet_color||"#141414"} onChange={e=>set("integritet_bullet_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sektioner</h4>
          {(data.integritet_sections||[]).map((sec, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("integritet_sections", data.integritet_sections.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={sec.heading||""} onChange={e=>{const s=[...data.integritet_sections];s[idx]={...s[idx],heading:e.target.value};set("integritet_sections",s);}} placeholder="1. Allmänt" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Text</label>
                <textarea value={sec.text||""} onChange={e=>{const s=[...data.integritet_sections];s[idx]={...s[idx],text:e.target.value};set("integritet_sections",s);}} rows={3} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("integritet_sections",[...(data.integritet_sections||[]),{heading:"",text:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till sektion
          </button>
        </>
  );
}
