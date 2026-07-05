import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterKundavtalSection({ data, set, inp, lbl }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Kundavtal</span>
          </div>
          <h3 className="font-semibold text-slate-800">Kundavtal</h3>
          <div>
            <label className={lbl}>Sida BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.kundavtal_bg||"#ffffff"} onChange={e=>set("kundavtal_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.kundavtal_eyebrow||""} onChange={e=>set("kundavtal_eyebrow",e.target.value)} placeholder="Kundavtal" className={inp}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.kundavtal_title||""} onChange={e=>set("kundavtal_title",e.target.value)} placeholder="Bokningsvillkor" className={inp}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro text</label>
            <textarea value={data.kundavtal_intro||""} onChange={e=>set("kundavtal_intro",e.target.value)} rows={2} placeholder="Här hittar du våra boknings-, betalnings- och avbokningsvillkor." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Sektioner färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.kundavtal_heading_color||"#141414"} onChange={e=>set("kundavtal_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.kundavtal_text_color||"#475569"} onChange={e=>set("kundavtal_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Bullet</span>
            <CircleColor value={data.kundavtal_bullet_color||"#141414"} onChange={e=>set("kundavtal_bullet_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sektioner</h4>
          {(data.kundavtal_sections||[]).map((sec, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("kundavtal_sections", data.kundavtal_sections.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={sec.heading||""} onChange={e=>{const s=[...data.kundavtal_sections];s[idx]={...s[idx],heading:e.target.value};set("kundavtal_sections",s);}} placeholder="Bokningsvillkor" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Punkter (en per rad)</label>
                <textarea value={(sec.items||[]).join("\n")} onChange={e=>{const s=[...data.kundavtal_sections];s[idx]={...s[idx],items:e.target.value.split("\n")};set("kundavtal_sections",s);}} rows={4} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("kundavtal_sections",[...(data.kundavtal_sections||[]),{heading:"",items:[""]}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till sektion
          </button>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kontakttext (längst ner)</h4>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.kundavtal_footer_text||""} onChange={e=>set("kundavtal_footer_text",e.target.value)} placeholder="Har du fler frågor så är du välkommen att kontakta vår kundtjänst på" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Text färg</span>
              <CircleColor value={data.kundavtal_footer_color||"#475569"} onChange={e=>set("kundavtal_footer_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>E-post länk</label>
            <input value={data.kundavtal_footer_email||""} onChange={e=>set("kundavtal_footer_email",e.target.value)} placeholder="kundtjanst@purenorthstad.se" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Länk färg</span>
              <CircleColor value={data.kundavtal_footer_link_color||"#141414"} onChange={e=>set("kundavtal_footer_link_color",e.target.value)}/>
            </div>
          </div>
        </>
  );
}
