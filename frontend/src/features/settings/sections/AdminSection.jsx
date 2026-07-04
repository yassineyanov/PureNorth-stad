import React from "react";
import { Upload } from "lucide-react";
import { Toggle, CircleColor } from "@/shared/ui";

export function AdminSection({ data, set, inp, lbl, logoRef, uploadImage }) {
  return (
    <>
      <h3 className="font-semibold text-slate-800">Admin-panel</h3>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Fönster-titel (webbläsaren)</h4>
      <input value={data.admin_window_title||""} onChange={e=>set("admin_window_title",e.target.value)} placeholder="PureNorth | Adminpanel" className={inp}/>
      <p className="text-xs text-slate-400 mt-1">Visas i webbläsarens flik</p>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Logotyp</h4>
      <div className="flex items-center justify-between mb-1">
        <label className={lbl}>Visa logotyp</label>
        <Toggle value={data.show_logo} onChange={v => set("show_logo", v)}/>
      </div>
      {data.logo_url && <div className="relative mb-2"><img src={data.logo_url} alt="Logo" className="h-16 rounded-xl border border-slate-100 p-2"/><button onClick={()=>set("logo_url","")} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "logo_url")}/>
      <button onClick={() => logoRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
        <Upload size={14}/> Ladda upp logotyp
      </button>
      <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 200×200px · PNG med transparent bakgrund</p>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Företagsnamn (i Admin header)</h4>
      <input value={data.admin_company_name||""} onChange={e=>set("admin_company_name",e.target.value)} placeholder="PureNorth" className={inp}/>
      <hr className="border-slate-100"/>
      <h4 className="font-medium text-slate-700">Header färger</h4>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span className="text-xs text-slate-500">BG</span>
        <CircleColor value={data.admin_header_bg||"#ffffff"} onChange={e=>set("admin_header_bg",e.target.value)}/>
        <span className="text-xs text-slate-500">Text</span>
        <CircleColor value={data.admin_header_text_color||"#0f172a"} onChange={e=>set("admin_header_text_color",e.target.value)}/>
      </div>
    </>
  );
}
