import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterNojdSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Nöjd kundgaranti</span>
          </div>
          <h3 className="font-semibold text-slate-800">Nöjd kundgaranti</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.nojd_bg||"#ffffff"} onChange={e=>set("nojd_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.nojd_eyebrow||""} onChange={e=>set("nojd_eyebrow",e.target.value)} placeholder="Nöjd kundgaranti" className={inp}/>
            <TextColorPicker label="Färg" colorKey="nojd_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.nojd_title||""} onChange={e=>set("nojd_title",e.target.value)} placeholder="Nöjd kundgaranti för din trygghet" className={inp}/>
            <TextColorPicker label="Färg" colorKey="nojd_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.nojd_intro||""} onChange={e=>set("nojd_intro",e.target.value)} rows={2} placeholder="Vår garanti gäller för dig som..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="nojd_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Garantikort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.nojd_card_bg||"#ffffff"} onChange={e=>set("nojd_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_card_text_color||"#1e293b"} onChange={e=>set("nojd_card_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.nojd_card_icon_bg||"#141414"} onChange={e=>set("nojd_card_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.nojd_card_icon_color||"#ffffff"} onChange={e=>set("nojd_card_icon_color",e.target.value)}/>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Garantipunkter</h4>
          {(data.nojd_guarantees||[]).map((g, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={g||""} onChange={e=>{const s=[...data.nojd_guarantees];s[idx]=e.target.value;set("nojd_guarantees",s);}} placeholder="92% av kunder ger oss topp betyg" className={inp}/>
              <button onClick={()=>set("nojd_guarantees",data.nojd_guarantees.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nojd_guarantees",[...(data.nojd_guarantees||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till punkt
          </button>
          <hr className="border-slate-100"/>
          <div>
            <label className={lbl}>Sektion 1 rubrik</label>
            <input value={data.nojd_section1_heading||""} onChange={e=>set("nojd_section1_heading",e.target.value)} placeholder="Vad är Nöjd Kundgaranti?" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Sektion 1 text</label>
            <textarea value={data.nojd_section1_text||""} onChange={e=>set("nojd_section1_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Sektion 2 rubrik</label>
            <input value={data.nojd_section2_heading||""} onChange={e=>set("nojd_section2_heading",e.target.value)} placeholder="Så går det till" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Sektion 2 text</label>
            <textarea value={data.nojd_section2_text||""} onChange={e=>set("nojd_section2_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.nojd_heading_color||"#141414"} onChange={e=>set("nojd_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_text_color||"#475569"} onChange={e=>set("nojd_text_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Steg färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Steg BG</span>
            <CircleColor value={data.nojd_step_bg||"#fafafa"} onChange={e=>set("nojd_step_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_step_text_color||"#334155"} onChange={e=>set("nojd_step_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Num BG</span>
            <CircleColor value={data.nojd_step_num_bg||"#141414"} onChange={e=>set("nojd_step_num_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Num</span>
            <CircleColor value={data.nojd_step_num_color||"#ffffff"} onChange={e=>set("nojd_step_num_color",e.target.value)}/>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Steg</h4>
          {(data.nojd_steps||[]).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s||""} onChange={e=>{const arr=[...data.nojd_steps];arr[idx]=e.target.value;set("nojd_steps",arr);}} placeholder="Kontakta oss snarast..." className={inp}/>
              <button onClick={()=>set("nojd_steps",data.nojd_steps.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nojd_steps",[...(data.nojd_steps||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till steg
          </button>
        </>
  );
}
