import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterVarderigarSection({ data, set, inp, lbl }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Värderingar</span>
          </div>
          <h3 className="font-semibold text-slate-800">Värderingar</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.varderingar_bg||"#ffffff"} onChange={e=>set("varderingar_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.varderingar_eyebrow||""} onChange={e=>set("varderingar_eyebrow",e.target.value)} placeholder="Värderingar" className={inp}/>
            <TextColorPicker label="Färg" colorKey="varderingar_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.varderingar_title||""} onChange={e=>set("varderingar_title",e.target.value)} placeholder="Hur vi tänker" className={inp}/>
            <TextColorPicker label="Färg" colorKey="varderingar_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.varderingar_intro||""} onChange={e=>set("varderingar_intro",e.target.value)} rows={2} placeholder="Hur vi värderar våra tjänster..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="varderingar_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.varderingar_card_bg||"#ffffff"} onChange={e=>set("varderingar_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.varderingar_card_title_color||"#141414"} onChange={e=>set("varderingar_card_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.varderingar_card_text_color||"#475569"} onChange={e=>set("varderingar_card_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.varderingar_icon_bg||"#141414"} onChange={e=>set("varderingar_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.varderingar_icon_color||"#ffffff"} onChange={e=>set("varderingar_icon_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Värdekort</h4>
          {(data.varderingar_values||[]).map((v, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("varderingar_values",data.varderingar_values.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Titel</label>
                <input value={v.title||""} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],title:e.target.value};set("varderingar_values",s);}} placeholder="Priser" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Text</label>
                <textarea value={v.text||""} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],text:e.target.value};set("varderingar_values",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
              <div>
                <label className={lbl}>Ikon</label>
                <select value={v.icon||"Tag"} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],icon:e.target.value};set("varderingar_values",s);}} className={inp}>
                  <option value="none">— Ingen ikon</option>
                  <option value="Tag">🏷️ Tag</option>
                  <option value="HeartHandshake">🤝 HeartHandshake</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Ear">👂 Ear</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Award">🏆 Award</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                </select>
              </div>
            </div>
          ))}
          <button onClick={()=>set("varderingar_values",[...(data.varderingar_values||[]),{title:"",text:"",icon:"Tag"}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till värdering
          </button>
        </>
  );
}
