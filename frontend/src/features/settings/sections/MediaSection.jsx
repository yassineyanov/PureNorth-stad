import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function MediaSection({ data, set, inp, lbl, logoRef, heroImgRef, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Bilder & Logotyp</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Logotyp</label>
            <button type="button" onClick={()=>set("show_logo", data.show_logo === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_logo !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_logo !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Logotyp</label>
            {data.logo_url && <img src={data.logo_url} alt="Logo" className="h-16 mb-3 rounded-xl border border-slate-100 p-2"/>}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "logo_url")}/>
            <button onClick={() => logoRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> Ladda upp logotyp
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 200×200px · PNG med transparent bakgrund</p>

          </div>
          <div>
            <label className={lbl}>Företagsnamn (i Navbar & Footer)</label>
            <input value={data.company_name||""} onChange={e=>set("company_name",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Färg i footer</span>
              <CircleColor value={data.company_name_color||"#141414"} onChange={e=>set("company_name_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Hero-bild (stor bild på startsidan)</label>
            <button type="button" onClick={()=>set("show_hero_image", !data.show_hero_image)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_image !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_image !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            {data.hero_image && <img src={data.hero_image} alt="Hero" className="w-full h-32 object-cover rounded-xl mb-3"/>}
            <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "hero_image")}/>
            <button onClick={() => heroImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> Ladda upp hero-bild
            </button>
            <p className="text-xs text-slate-400 mt-2">Rekommenderad storlek: 1200×600px</p>
          </div>
        </>
  );
}
