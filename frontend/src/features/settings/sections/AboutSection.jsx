import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function AboutSection({ data, set, inp, lbl, aboutImgRef, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Om oss</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_about_in_navbar", data.show_about_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_about_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Etikett (liten grön text)</label>
              <button type="button" onClick={()=>set("show_about_label", data.show_about_label === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Etikett färg</label>
              <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Färg<CircleColor value={data.about_label_color||"#166534"} onChange={e=>set("about_label_color",e.target.value)}/></label>
            </div>
            <input value={data.about_label||""} onChange={e=>set("about_label",e.target.value)} placeholder="Om oss" className={inp}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Rubrik</label>
              <button type="button" onClick={()=>set("show_about_title", data.show_about_title === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <input value={data.about_title||""} onChange={e=>set("about_title",e.target.value)} placeholder="Städning med hjärta & precision" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="about_title_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Beskrivningstext</label>
              <button type="button" onClick={()=>set("show_about_text", data.show_about_text === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_text !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_text !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <textarea value={data.about_text||""} onChange={e => set("about_text", e.target.value)} rows={6} placeholder="Berätta om ditt företag..." className={inp + " resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="about_text_color" data={data} set={set}/>
          </div>
          <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Statistik (3 siffror)</label>
              <button type="button" onClick={()=>set("show_about_stats", data.show_about_stats === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_stats !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_stats !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
          <h4 className="font-medium text-slate-700 mt-2">Statistik (3 siffror)</h4>
          <TextColorPicker label="Siffror färg" colorKey="about_stat_color" data={data} set={set}/>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Siffra 1</label>
              <input value={data.about_stat1_number||""} onChange={e=>set("about_stat1_number",e.target.value)} placeholder="100+" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 1</label>
              <input value={data.about_stat1_label||""} onChange={e=>set("about_stat1_label",e.target.value)} placeholder="Nöjda kunder" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Siffra 2</label>
              <input value={data.about_stat2_number||""} onChange={e=>set("about_stat2_number",e.target.value)} placeholder="5 (stjärna läggs till automatiskt)" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 2</label>
              <input value={data.about_stat2_label||""} onChange={e=>set("about_stat2_label",e.target.value)} placeholder="Betyg" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Siffra 3</label>
              <input value={data.about_stat3_number||""} onChange={e=>set("about_stat3_number",e.target.value)} placeholder="3 år" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 3</label>
              <input value={data.about_stat3_label||""} onChange={e=>set("about_stat3_label",e.target.value)} placeholder="Erfarenhet" className={inp}/>
            </div>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Punkter (3 fördelar)</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 1</label>
              <button type="button" onClick={()=>set("show_about_point1", data.show_about_point1 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point1 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point1 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 1 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point1_color||"#374151"} onChange={e=>set("about_point1_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point1_icon_color||"#166534"} onChange={e=>set("about_point1_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point1_icon||"ShieldCheck"} onChange={e=>set("about_point1_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point1||""} onChange={e=>set("about_point1",e.target.value)} placeholder="SRY-certifierad personal" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 2</label>
              <button type="button" onClick={()=>set("show_about_point2", data.show_about_point2 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point2 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point2 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 2 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point2_color||"#374151"} onChange={e=>set("about_point2_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point2_icon_color||"#166534"} onChange={e=>set("about_point2_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point2_icon||"Leaf"} onChange={e=>set("about_point2_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point2||""} onChange={e=>set("about_point2",e.target.value)} placeholder="Svanenmärkta Pur-Eco produkter" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 3</label>
              <button type="button" onClick={()=>set("show_about_point3", data.show_about_point3 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point3 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point3 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 3 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point3_color||"#374151"} onChange={e=>set("about_point3_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point3_icon_color||"#166534"} onChange={e=>set("about_point3_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point3_icon||"Star"} onChange={e=>set("about_point3_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point3||""} onChange={e=>set("about_point3",e.target.value)} placeholder="50% RUT-avdrag på arbetskostnaden" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Knapp (Boka städning)</label>
              <button type="button" onClick={()=>set("show_about_btn", data.show_about_btn === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Knapp färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_btn_color||"#ffffff"} onChange={e=>set("about_btn_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">BG<CircleColor value={data.about_btn_bg||"#141414"} onChange={e=>set("about_btn_bg",e.target.value)}/></label>
              </div>
            </div>
            <input value={data.about_btn_text||""} onChange={e=>set("about_btn_text",e.target.value)} placeholder="Boka städning" className={inp}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Bild</label>
              <button type="button" onClick={()=>set("show_about_image", data.show_about_image === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_image !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_image !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <label className={lbl}>Bild på Om oss-sidan</label>
            {data.about_image && (
              <div className="relative mb-3">
                <img src={data.about_image} alt="Om oss" className="w-full h-48 object-cover rounded-xl border border-slate-100"/>
                <button onClick={()=>set("about_image","")} className="absolute top-2 right-2 bg-red-500 text-white rounded-full h-7 w-7 flex items-center justify-center text-xs hover:bg-red-600">✕</button>
              </div>
            )}
            <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "about_image")}/>
            <button onClick={() => aboutImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> {data.about_image ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 1200×800px</p>
          </div>
        </>
  );
}
