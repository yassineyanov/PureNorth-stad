import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker } from "@/shared/ui";

export function VartArbeteSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Vårt arbete – Före & efter</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_vart_in_navbar", data.show_vart_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_vart_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_vart_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa sektion</label>
            <button type="button" onClick={()=>set("show_vart", data.show_vart === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_vart !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_vart !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.vart_bg||"#141414"} onChange={e=>set("vart_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.vart_label||""} onChange={e=>set("vart_label",e.target.value)} placeholder="Vårt arbete" className={inp}/>
            <TextColorPicker label="Färg" colorKey="vart_label_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.vart_title||""} onChange={e=>set("vart_title",e.target.value)} placeholder="Före & efter" className={inp}/>
            <TextColorPicker label="Färg" colorKey="vart_title_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.vart_subtitle||""} onChange={e=>set("vart_subtitle",e.target.value)} rows={2} placeholder="Dra i reglaget för att se skillnaden..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="vart_subtitle_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Labels & färger</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Före label text</label>
              <input value={data.vart_fore_label||""} onChange={e=>set("vart_fore_label",e.target.value)} placeholder="Före" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.vart_fore_label_bg||"#141414"} onChange={e=>set("vart_fore_label_bg",e.target.value)}/>
              </div>
            </div>
            <div>
              <label className={lbl}>Efter label text</label>
              <input value={data.vart_efter_label||""} onChange={e=>set("vart_efter_label",e.target.value)} placeholder="Efter" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.vart_efter_label_bg||"#166534"} onChange={e=>set("vart_efter_label_bg",e.target.value)}/>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Handle färg</span>
            <CircleColor value={data.vart_handle_color||"#141414"} onChange={e=>set("vart_handle_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Bilder (Före & Efter)</h4>
          {(data.vart_slides||[]).map((slide, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("vart_slides",data.vart_slides.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-slate-600">Bild {idx+1}: {slide.alt||""}</p>
                <button type="button" onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],show:s[idx].show===false?true:false};set("vart_slides",s);}}
                  className={`w-10 h-5 rounded-full transition-colors ${slide.show!==false?"bg-blue-500":"bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${slide.show!==false?"translate-x-5":"translate-x-0"}`}/>
                </button>
              </div>
              <input value={slide.alt||""} onChange={e=>{const s=[...data.vart_slides];s[idx]={...s[idx],alt:e.target.value};set("vart_slides",s);}} placeholder="Alt text (t.ex. Sovrum)" className={inp}/>
              <div>
                <label className={lbl}>Visningsläge</label>
                <select value={slide.mode||"slider"} onChange={e=>{const s=[...data.vart_slides];s[idx]={...s[idx],mode:e.target.value};set("vart_slides",s);}} className={inp}>
                  <option value="slider">↔️ Före & efter slider</option>
                  <option value="before">📷 Bara Före-bild</option>
                  <option value="after">📷 Bara Efter-bild</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Före bild</label>
                  {slide.before && <div className="relative mb-1"><img src={slide.before} alt="" className="w-full h-16 object-cover rounded"/><button onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],before:""};set("vart_slides",s);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-4 w-4 text-xs">✕</button></div>}
                  <input id={`vart-before-${idx}`} type="file" accept="image/*" className="hidden" onChange={async e=>{if(!e.target.files[0])return;const url=await uploadImage(e.target.files[0],`vart_before_${idx}`);const s=[...data.vart_slides];s[idx]={...s[idx],before:url};set("vart_slides",s);}}/>
                  <button onClick={()=>document.getElementById(`vart-before-${idx}`).click()} className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs hover:border-slate-400"><Upload size={10}/> {slide.before?"Byt":"Ladda upp"}</button>
                </div>
                <div>
                  <label className={lbl}>Efter bild</label>
                  {slide.after && <div className="relative mb-1"><img src={slide.after} alt="" className="w-full h-16 object-cover rounded"/><button onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],after:""};set("vart_slides",s);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-4 w-4 text-xs">✕</button></div>}
                  <input id={`vart-after-${idx}`} type="file" accept="image/*" className="hidden" onChange={async e=>{if(!e.target.files[0])return;const url=await uploadImage(e.target.files[0],`vart_after_${idx}`);const s=[...data.vart_slides];s[idx]={...s[idx],after:url};set("vart_slides",s);}}/>
                  <button onClick={()=>document.getElementById(`vart-after-${idx}`).click()} className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs hover:border-slate-400"><Upload size={10}/> {slide.after?"Byt":"Ladda upp"}</button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={()=>set("vart_slides",[...(data.vart_slides||[]),{before:"",after:"",alt:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till bild
          </button>
        </>
  );
}
