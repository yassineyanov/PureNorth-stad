import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function WhyUsSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Varför välja oss?</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar & sidan</label>
            <button type="button" onClick={()=>set("show_whyus_in_navbar", data.show_whyus_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett</label>
            <button type="button" onClick={()=>set("show_whyus_label", data.show_whyus_label === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.whyus_label||""} onChange={e=>set("whyus_label",e.target.value)} placeholder="Varför välja oss?" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="whyus_label_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_whyus_title", data.show_whyus_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.whyus_title||""} onChange={e=>set("whyus_title",e.target.value)} rows={2} placeholder="Kvalitet du känner och naturen tackar för" className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="whyus_title_color" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🏆 Stort svart kort (SRY)</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa SRY-kort</label>
            <button type="button" onClick={()=>set("show_sry_card", data.show_sry_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_sry_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_sry_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.sry_title||""} onChange={e=>set("sry_title",e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="sry_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.sry_text||""} onChange={e=>set("sry_text",e.target.value)} rows={3} placeholder="Med kvalifikation från Servicebranschens..." className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="sry_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Taggar (kommaseparerade)</label>
            <input value={data.sry_tags||""} onChange={e=>set("sry_tags",e.target.value)} placeholder="SRY-utbildad personal, Hög standard, Trygg & försäkrad" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.sry_icon||"Award"} onChange={e=>set("sry_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.sry_icon_color||"#ffffff"} onChange={e=>set("sry_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.sry_bg||"#141414"} onChange={e=>set("sry_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🌿 Eco-kort</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Eco-kort</label>
            <button type="button" onClick={()=>set("show_eco_card", data.show_eco_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_eco_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_eco_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.eco_title||""} onChange={e=>set("eco_title",e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="eco_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.eco_text||""} onChange={e=>set("eco_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="eco_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.eco_icon||"Leaf"} onChange={e=>set("eco_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.eco_icon_color||"#166534"} onChange={e=>set("eco_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.eco_card_bg||"#ffffff"} onChange={e=>set("eco_card_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">💰 RUT-kort</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa RUT-kort</label>
            <button type="button" onClick={()=>set("show_rut_card", data.show_rut_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_rut_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_rut_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.rut_title||""} onChange={e=>set("rut_title",e.target.value)} placeholder="50% RUT-avdrag" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="rut_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.rut_text||""} onChange={e=>set("rut_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="rut_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.rut_icon||"Percent"} onChange={e=>set("rut_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.rut_icon_color||"#166534"} onChange={e=>set("rut_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.rut_card_bg||"#ffffff"} onChange={e=>set("rut_card_bg",e.target.value)}/>
          </div>
        </>
  );
}
