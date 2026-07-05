import React from "react";
import { Upload } from "lucide-react";
import { CircleColor, TextColorPicker, ColorPicker } from "@/shared/ui";

export function HeroSection({ data, set, inp, lbl, heroImgRef, uploadImage }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Hero-sektion</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Hero</label>
            <button type="button" onClick={()=>set("show_hero_section", data.show_hero_section === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_section !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_section !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Badge-text (grön etikett)</label>
            <button type="button" onClick={()=>set("show_hero_badge", !data.show_hero_badge)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.hero_badge} onChange={e => set("hero_badge", e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
            <ColorPicker label="Färger" colorKey="hero_badge_color" bgKey="hero_badge_bg" defaultColor="#166534" defaultBg="#dcfce7" data={data} set={set}/>
            <label className={lbl + " mt-2"}>Badge-ikon</label>
            <select value={data.hero_badge_icon||"Leaf"} onChange={e=>set("hero_badge_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Leaf">🌿 Leaf (löv)</option>
              <option value="ShieldCheck">🛡️ ShieldCheck (sköld)</option>
              <option value="Star">⭐ Star (stjärna)</option>
              <option value="Heart">❤️ Heart (hjärta)</option>
              <option value="Zap">⚡ Zap (blixt)</option>
              <option value="Award">🏆 Award (utmärkelse)</option>
              <option value="CheckCircle">✅ CheckCircle (bock)</option>
              <option value="Sparkles">✨ Sparkles (gnistor)</option>
            </select>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.hero_badge_icon_color || "#166534"} onChange={e => set("hero_badge_icon_color", e.target.value)}/>
              {data.hero_badge_icon_color && <button onClick={()=>set("hero_badge_icon_color","")} className="text-xs text-red-400">↺</button>}
            </div>
            <label className={lbl + " mt-2"}>Badge-logotyp (valfritt - ersätter ikon)</label>
            {data.hero_badge_image && (
              <div className="flex items-center gap-2 mb-2">
                <img src={data.hero_badge_image} alt="Badge" className="h-6 w-6 object-contain"/>
                <button onClick={()=>set("hero_badge_image","")} className="text-red-500 text-xs hover:underline">Ta bort</button>
              </div>
            )}
            <input ref={badgeImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "hero_badge_image")}/>
            <button onClick={() => badgeImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> {data.hero_badge_image ? "Byt logotyp" : "Ladda upp logotyp"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Stor rubrik (H1)</label>
            <button type="button" onClick={()=>set("show_hero_title", !data.show_hero_title)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.hero_title} onChange={e => set("hero_title", e.target.value)} rows={3} placeholder="Renhet med norrländsk precision i Umeå." className={inp + " resize-none"}/>
            <ColorPicker label="Färger" colorKey="hero_title_color" bgKey="hero_title_bg" defaultColor="#141414" defaultBg="transparent" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Undertext</label>
            <button type="button" onClick={()=>set("show_hero_subtitle", !data.show_hero_subtitle)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_subtitle !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_subtitle !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.hero_subtitle} onChange={e => set("hero_subtitle", e.target.value)} rows={3} placeholder="Vi definierar premiumstädning..." className={inp + " resize-none"}/>
            <ColorPicker label="Färger" colorKey="hero_subtitle_color" bgKey="hero_subtitle_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Knapptext (Boka-knapp)</label>
            <button type="button" onClick={()=>set("show_hero_cta", !data.show_hero_cta)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_cta !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_cta !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.cta_text} onChange={e => set("cta_text", e.target.value)} placeholder="Boka tid online" className={inp}/>
            <ColorPicker label="Färger" colorKey="hero_cta_color" bgKey="hero_cta_bg" defaultColor="#ffffff" defaultBg="#141414" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Telefonnummer (knapp)</label>
              <button type="button" onClick={()=>set("show_hero_phone", data.show_hero_phone === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_phone !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_phone !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.hero_phone_color||"#374151"} onChange={e=>set("hero_phone_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Ikon</span>
              <CircleColor value={data.hero_phone_icon_color||"#374151"} onChange={e=>set("hero_phone_icon_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span>
              <CircleColor value={data.hero_phone_bg||"transparent"} onChange={e=>set("hero_phone_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>RUT-avdrag badge</label>
              <button type="button" onClick={()=>set("show_hero_rut", data.show_hero_rut === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_rut !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_rut !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Procent text</label>
                <input value={data.hero_rut_percent||""} onChange={e=>set("hero_rut_percent",e.target.value)} placeholder="50%" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={data.hero_rut_title||""} onChange={e=>set("hero_rut_title",e.target.value)} placeholder="RUT-avdrag" className={inp}/>
              </div>
            </div>
            <div>
              <label className={lbl}>Undertext</label>
              <input value={data.hero_rut_text||""} onChange={e=>set("hero_rut_text",e.target.value)} placeholder="Dras direkt på fakturan" className={inp}/>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">BG</span>
              <CircleColor value={data.hero_rut_bg||"#ffffff"} onChange={e=>set("hero_rut_bg",e.target.value)}/>
              <span className="text-xs text-slate-500">Cirkel BG</span>
              <CircleColor value={data.hero_rut_circle_bg||"#166534"} onChange={e=>set("hero_rut_circle_bg",e.target.value)}/>
              <span className="text-xs text-slate-500">Cirkel text</span>
              <CircleColor value={data.hero_rut_circle_color||"#166534"} onChange={e=>set("hero_rut_circle_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Titel</span>
              <CircleColor value={data.hero_rut_title_color||"#0f172a"} onChange={e=>set("hero_rut_title_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.hero_rut_text_color||"#64748b"} onChange={e=>set("hero_rut_text_color",e.target.value)}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Badge 1 (under knapparna)</label>
                <button type="button" onClick={()=>set("show_hero_badge1", data.show_hero_badge1 === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge1 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge1 !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <input value={data.badge1} onChange={e => set("badge1", e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
              <ColorPicker label="Färger" colorKey="hero_badge1_color" bgKey="hero_badge1_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
              <label className={lbl + " mt-2"}>Badge 1 ikon</label>
              <select value={data.badge1_icon||"ShieldCheck"} onChange={e=>set("badge1_icon",e.target.value)} className={inp}>
                <option value="none">— Ingen ikon</option>
                <option value="ShieldCheck">🛡️ ShieldCheck</option>
                <option value="Leaf">🌿 Leaf</option>
                <option value="Star">⭐ Star</option>
                <option value="Heart">❤️ Heart</option>
                <option value="Zap">⚡ Zap</option>
                <option value="Award">🏆 Award</option>
                <option value="CheckCircle">✅ CheckCircle</option>
              </select>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">Ikon färg</span>
                <CircleColor value={data.hero_badge1_icon_color || "#166534"} onChange={e => set("hero_badge1_icon_color", e.target.value)}/>
                {data.hero_badge1_icon_color && <button onClick={()=>set("hero_badge1_icon_color","")} className="text-xs text-red-400">↺</button>}
              </div>
              <label className={lbl + " mt-2"}>Badge 1 logotyp (ersätter ikon)</label>
              {data.badge1_image && <div className="flex items-center gap-2 mb-2"><img src={data.badge1_image} alt="" className="h-5 w-5 object-contain"/><button onClick={()=>set("badge1_image","")} className="text-red-500 text-xs">Ta bort</button></div>}
              <input ref={badge1ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "badge1_image")}/>
              <button onClick={() => badge1ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400 transition-colors mt-1">
                <Upload size={12}/> {data.badge1_image ? "Byt" : "Ladda upp"}
              </button>
              <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Badge 2</label>
                <button type="button" onClick={()=>set("show_hero_badge2", data.show_hero_badge2 === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge2 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge2 !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <input value={data.badge2} onChange={e => set("badge2", e.target.value)} placeholder="Pur-Eco produkter" className={inp}/>
              <ColorPicker label="Färger" colorKey="hero_badge2_color" bgKey="hero_badge2_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
              <label className={lbl + " mt-2"}>Badge 2 ikon</label>
              <select value={data.badge2_icon||"Leaf"} onChange={e=>set("badge2_icon",e.target.value)} className={inp}>
                <option value="none">— Ingen ikon</option>
                <option value="Leaf">🌿 Leaf</option>
                <option value="ShieldCheck">🛡️ ShieldCheck</option>
                <option value="Star">⭐ Star</option>
                <option value="Heart">❤️ Heart</option>
                <option value="Zap">⚡ Zap</option>
                <option value="Award">🏆 Award</option>
                <option value="CheckCircle">✅ CheckCircle</option>
              </select>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">Ikon färg</span>
                <CircleColor value={data.hero_badge2_icon_color || "#166534"} onChange={e => set("hero_badge2_icon_color", e.target.value)}/>
                {data.hero_badge2_icon_color && <button onClick={()=>set("hero_badge2_icon_color","")} className="text-xs text-red-400">↺</button>}
              </div>
              <label className={lbl + " mt-2"}>Badge 2 logotyp (ersätter ikon)</label>
              {data.badge2_image && <div className="flex items-center gap-2 mb-2"><img src={data.badge2_image} alt="" className="h-5 w-5 object-contain"/><button onClick={()=>set("badge2_image","")} className="text-red-500 text-xs">Ta bort</button></div>}
              <input ref={badge2ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "badge2_image")}/>
              <button onClick={() => badge2ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400 transition-colors mt-1">
                <Upload size={12}/> {data.badge2_image ? "Byt" : "Ladda upp"}
              </button>
              <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
            </div>
          </div>
        </>
  );
}
