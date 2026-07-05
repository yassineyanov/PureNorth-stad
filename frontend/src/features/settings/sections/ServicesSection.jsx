import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function ServicesSection({ data, set, inp, lbl, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Tjänster</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_tjanster_in_navbar", data.show_tjanster_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_tjanster_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_tjanster_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett</label>
            <button type="button" onClick={()=>set("show_services_label", data.show_services_label === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_services_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_services_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.services_label||""} onChange={e=>set("services_label",e.target.value)} placeholder="Våra tjänster" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="services_label_color" data={data} set={set}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_services_title", data.show_services_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_services_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_services_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.services_title||""} onChange={e=>set("services_title",e.target.value)} placeholder="Städtjänster för hem och företag" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="services_title_color" data={data} set={set}/>
            </div>
          </div>

          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänstekort</h4>
          {(data.services||[]).map((svc, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Kort {idx+1}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={()=>{const s=[...data.services];s[idx]={...s[idx],show:s[idx].show===false?true:false};set("services",s);}}
                    className={`w-10 h-5 rounded-full transition-colors ${svc.show!==false?"bg-blue-500":"bg-slate-200"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${svc.show!==false?"translate-x-5":"translate-x-0"}`}/>
                  </button>
                  <button onClick={()=>set("services", data.services.filter((_,i)=>i!==idx))}
                    className="text-slate-400 hover:text-red-500">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              <div>
                <label className={lbl}>Namn</label>
                <input value={svc.title||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],title:e.target.value};set("services",s);}} placeholder="Hemstädning" className={inp}/>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Färg</span>
                  <CircleColor value={svc.title_color||"#0f172a"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],title_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Beskrivning</label>
                <textarea value={svc.desc||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],desc:e.target.value};set("services",s);}} rows={2} className={inp+" resize-none"}/>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Färg</span>
                  <CircleColor value={svc.desc_color||"#475569"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],desc_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Ikon</label>
                <select value={svc.icon_name||"Home"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],icon_name:e.target.value};set("services",s);}} className={inp}>
                  <option value="Home">🏠 Home</option>
                  <option value="Truck">🚚 Truck</option>
                  <option value="Building2">🏢 Building2</option>
                  <option value="Sparkles">✨ Sparkles</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Award">🏆 Award</option>
                </select>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Ikon färg</span>
                  <CircleColor value={svc.icon_color||"#166534"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],icon_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Bild</label>
                {svc.img && <div className="relative mb-2"><img src={svc.img} alt="" className="w-full h-24 object-cover rounded-lg"/><button onClick={()=>{const s=[...data.services];s[idx]={...s[idx],img:""};set("services",s);}} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
                <input type="file" accept="image/*" className="hidden" id={`svc-img-${idx}`} onChange={async e=>{
                  if(!e.target.files[0]) return;
                  const url = await uploadImage(e.target.files[0], `service${idx}_img`);
                  const s=[...data.services];s[idx]={...s[idx],img:url};set("services",s);
                }}/>
                <button onClick={()=>document.getElementById(`svc-img-${idx}`).click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
                  <Upload size={12}/> {svc.img ? "Byt bild" : "Ladda upp bild"}
                </button>
                <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 940×650px</p>
              </div>
            </div>
          ))}
          <button onClick={()=>set("services",[...(data.services||[]),{title:"",desc:"",img:"",show:true,icon_name:"Home",icon_color:"#166534"}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>
  );
}
