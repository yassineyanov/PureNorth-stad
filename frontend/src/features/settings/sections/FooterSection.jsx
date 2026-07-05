import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterSection({ data, set, inp, lbl, setSection }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Footer</h3>
          <div>
            <label className={lbl}>Footer BG färg</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.footer_bg||"#ffffff"} onChange={e=>set("footer_bg",e.target.value)}/>
              <span className="text-xs text-slate-400">Bakgrundsfärg</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Copyright text</label>
            <input value={data.footer_copyright||""} onChange={e=>set("footer_copyright",e.target.value)} placeholder="© 2026 PureNorth Städ · Umeå" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Färg</span>
              <CircleColor value={data.footer_copyright_color||"#64748b"} onChange={e=>set("footer_copyright_color",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sidinnehåll</h4>
          {[
            {key:"faq", label:"FAQ"},
            {key:"kundavtal", label:"Kundavtal"},
            {key:"nojd", label:"Nöjd kundgaranti"},
            {key:"varderingar", label:"Värderingar"},
            {key:"malsattning", label:"Målsättning"},
            {key:"integritet", label:"Integritetspolicy"},
          ].map(({key, label}) => (
            <div key={key} className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 transition-colors cursor-pointer" onClick={()=>setSection(`footer_${key}`)}>
              <div className="flex items-center gap-3">
                <button type="button" onClick={e=>{e.stopPropagation();set(`show_footer_${key}`, data[`show_footer_${key}`] === false ? true : false)}}
                  className={`w-10 h-5 rounded-full transition-colors shrink-0 ${data[`show_footer_${key}`] !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data[`show_footer_${key}`] !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <div onClick={e=>e.stopPropagation()}>
                  <CircleColor value={data[`footer_${key}_color`]||"#475569"} onChange={e=>set(`footer_${key}_color`,e.target.value)}/>
                </div>
              </div>
            </div>
          ))}
        </>
  );
}
// Sun Jul  5 13:33:30 UTC 2026
// Sun Jul  5 16:35:23 UTC 2026
