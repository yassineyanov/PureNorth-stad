import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker } from "@/shared/ui";

export function TestimonialsSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Omdömen</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Omdömen</label>
            <button type="button" onClick={()=>set("show_omdomen", data.show_omdomen === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_omdomen !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_omdomen !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Etikett</label>
              <button type="button" onClick={()=>set("show_testimonials_label", data.show_testimonials_label === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_testimonials_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_testimonials_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
              <input value={data.testimonials_label||""} onChange={e=>set("testimonials_label",e.target.value)} placeholder="Omdömen" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="testimonials_label_color" defaultColor="#141414" data={data} set={set}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Rubrik</label>
              <button type="button" onClick={()=>set("show_testimonials_title", data.show_testimonials_title === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_testimonials_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_testimonials_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
              <input value={data.testimonials_title||""} onChange={e=>set("testimonials_title",e.target.value)} placeholder="Vad våra kunder säger" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="testimonials_title_color" defaultColor="#141414" data={data} set={set}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Kort färger</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Kort BG</span>
              <CircleColor value={data.testimonials_card_bg||"#ffffff"} onChange={e=>set("testimonials_card_bg",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Ikon</span>
              <CircleColor value={data.testimonials_icon_color||"#141414"} onChange={e=>set("testimonials_icon_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.testimonials_text_color||"#334155"} onChange={e=>set("testimonials_text_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Namn</span>
              <CircleColor value={data.testimonials_name_color||"#0f172a"} onChange={e=>set("testimonials_name_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Roll</span>
              <CircleColor value={data.testimonials_role_color||"#64748b"} onChange={e=>set("testimonials_role_color",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Featured omdömen</h4>
          <p className="text-xs text-slate-500 mb-3">Dessa visas alltid högst upp. Lämna tomt för att använda standardomdömena.</p>
          {(data.featured_reviews||[]).map((r, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 relative">
              <button onClick={()=>set("featured_reviews", data.featured_reviews.filter((_,i)=>i!==idx))}
                className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                <Trash2 size={14}/>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Namn</label>
                  <input value={r.name||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],name:e.target.value};set("featured_reviews",s);}} placeholder="Anna Andersson" className={inp}/>
                </div>
                <div>
                  <label className={lbl}>Roll</label>
                  <input value={r.role||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],role:e.target.value};set("featured_reviews",s);}} placeholder="Privatkund, Umeå" className={inp}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Betyg (1-5)</label>
                <input type="number" min="1" max="5" step="0.5" value={r.rating||5} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],rating:Number(e.target.value)};set("featured_reviews",s);}} className={inp}/>
              </div>
              <div>
                <label className={lbl}>Omdöme</label>
                <textarea value={r.text||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],text:e.target.value};set("featured_reviews",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("featured_reviews",[...(data.featured_reviews||[]),{name:"",role:"",rating:5,text:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till omdöme
          </button>
        </>
  );
}
