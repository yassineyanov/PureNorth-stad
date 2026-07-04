import React from "react";
import { Trash2, Plus } from "lucide-react";
import { CircleColor } from "@/shared/ui";

export function NavbarSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Navbar</h3>
          <div>
            <label className={lbl}>Navbar BG färg</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.navbar_bg||"#ffffff"} onChange={e=>set("navbar_bg",e.target.value)}/>
              <span className="text-xs text-slate-400">Bakgrundsfärg</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Företagsnamn</label>
            <button type="button" onClick={()=>set("show_navbar_company", data.show_navbar_company === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_company !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_company !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.nav_company||""} onChange={e=>set("nav_company",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Färg</span>
                <CircleColor value={data.navbar_company_color||"#0f172a"} onChange={e=>set("navbar_company_color",e.target.value)}/>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Boka-knapp</label>
            <button type="button" onClick={()=>set("show_navbar_btn", data.show_navbar_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.nav_boka_text||""} onChange={e=>set("nav_boka_text",e.target.value)} placeholder="Boka tid" className={inp}/>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500">Text</span>
                <CircleColor value={data.navbar_btn_color||"#ffffff"} onChange={e=>set("navbar_btn_color",e.target.value)}/>
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.navbar_btn_bg||"#141414"} onChange={e=>set("navbar_btn_bg",e.target.value)}/>
              </div>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Menylänkar</label>
            <button type="button" onClick={()=>set("show_navbar_links", data.show_navbar_links === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_links !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_links !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">Länk färg</span>
            <CircleColor value={data.navbar_link_color||"#475569"} onChange={e=>set("navbar_link_color",e.target.value)}/>
          </div>
          {(data.nav_links||[]).map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={link.label||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],label:e.target.value};set("nav_links",l);}}
                placeholder="Länktext" className={inp}/>
              <select value={link.href||""} onChange={e=>{
                const l=[...data.nav_links];
                l[idx]={...l[idx],href:e.target.value==="custom" ? "" : e.target.value};
                set("nav_links",l);
              }} className={inp}>
                <optgroup label="— Samma sida —">
                  <option value="/#tjanster">Tjänster (/#tjanster)</option>
                  <option value="/#kontakt">Kontakt (/#kontakt)</option>
                  <option value="/#boka">Boka (/#boka)</option>
                  <option value="/#vart-arbete">Vårt arbete (/#vart-arbete)</option>
                  <option value="/#omdomen">Omdömen (/#omdomen)</option>
                  <option value="/#varfor-oss">Varför oss (/#varfor-oss)</option>
                </optgroup>
                <optgroup label="— Annan sida —">
                  <option value="/om-oss">Om oss (/om-oss)</option>
                  <option value="/faq">FAQ (/faq)</option>
                  <option value="/kundavtal">Kundavtal</option>
                  <option value="custom">✏️ Anpassad länk...</option>
                </optgroup>
              </select>
              {(!link.href || !["/#tjanster","/#kontakt","/#boka","/#vart-arbete","/#omdomen","/#varfor-oss","/om-oss","/faq","/kundavtal"].includes(link.href)) && (
                <input value={link.href||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],href:e.target.value};set("nav_links",l);}}
                  placeholder="https://..." className={inp}/>
              )}
              <button onClick={()=>set("nav_links",data.nav_links.filter((_,i)=>i!==idx))}
                className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nav_links",[...(data.nav_links||[]),{label:"",href:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till länk
          </button>
        </>
  );
}
