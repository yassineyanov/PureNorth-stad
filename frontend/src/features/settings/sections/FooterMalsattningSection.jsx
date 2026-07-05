import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterMalsattningSection({ data, set, inp, lbl, mal1ImgRef, mal2ImgRef, uploadImage }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Målsättning</span>
          </div>
          <h3 className="font-semibold text-slate-800">Målsättning</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.mal_bg||"#ffffff"} onChange={e=>set("mal_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.mal_eyebrow||""} onChange={e=>set("mal_eyebrow",e.target.value)} placeholder="Målsättning" className={inp}/>
            <TextColorPicker label="Färg" colorKey="mal_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.mal_title||""} onChange={e=>set("mal_title",e.target.value)} placeholder="Vår målsättning" className={inp}/>
            <TextColorPicker label="Färg" colorKey="mal_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro text</label>
            <textarea value={data.mal_intro||""} onChange={e=>set("mal_intro",e.target.value)} rows={3} placeholder="PureNorth Städ drivs med ambition..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="mal_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort 1 (Svanenmärkt)</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.mal_card_bg||"#ffffff"} onChange={e=>set("mal_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_card_title_color||"#141414"} onChange={e=>set("mal_card_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_card_text_color||"#475569"} onChange={e=>set("mal_card_text_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 titel</label>
            <input value={data.mal_card1_title||""} onChange={e=>set("mal_card1_title",e.target.value)} placeholder="Miljövänliga val är viktiga för oss" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 text</label>
            <textarea value={data.mal_card1_text||""} onChange={e=>set("mal_card1_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 bild</label>
            {data.mal_card1_img && <div className="relative mb-2"><img src={data.mal_card1_img} alt="" className="w-full h-24 object-contain rounded-lg border"/><button onClick={()=>set("mal_card1_img","")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
            <input ref={mal1ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "mal_card1_img")}/>
            <button onClick={() => mal1ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
              <Upload size={12}/> {data.mal_card1_img ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 400×400px</p>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort 2 (Trygg arbetsplats)</h4>
          <div>
            <label className={lbl}>Kort 2 titel</label>
            <input value={data.mal_card2_title||""} onChange={e=>set("mal_card2_title",e.target.value)} placeholder="En trygg arbetsplats" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Kort 2 text</label>
            <textarea value={data.mal_card2_text||""} onChange={e=>set("mal_card2_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Kort 2 bild</label>
            {data.mal_card2_img && <div className="relative mb-2"><img src={data.mal_card2_img} alt="" className="w-full h-24 object-cover rounded-lg"/><button onClick={()=>set("mal_card2_img","")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
            <input ref={mal2ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "mal_card2_img")}/>
            <button onClick={() => mal2ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
              <Upload size={12}/> {data.mal_card2_img ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 900×600px</p>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Check-kort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.mal_check_card_bg||"#ffffff"} onChange={e=>set("mal_check_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.mal_check_icon_bg||"#141414"} onChange={e=>set("mal_check_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.mal_check_icon_color||"#ffffff"} onChange={e=>set("mal_check_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_check_title_color||"#141414"} onChange={e=>set("mal_check_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_check_text_color||"#475569"} onChange={e=>set("mal_check_text_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Check 1 ikon</label>
            <select value={data.mal_check1_icon||"Check"} onChange={e=>set("mal_check1_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Check 1 titel</label>
            <input value={data.mal_check1_title||""} onChange={e=>set("mal_check1_title",e.target.value)} placeholder="Hög kvalité" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Check 1 text</label>
            <textarea value={data.mal_check1_text||""} onChange={e=>set("mal_check1_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Check 2 ikon</label>
            <select value={data.mal_check2_icon||"Clock"} onChange={e=>set("mal_check2_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Check 2 titel</label>
            <input value={data.mal_check2_title||""} onChange={e=>set("mal_check2_title",e.target.value)} placeholder="Klart inom 24 timmar" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Check 2 text</label>
            <textarea value={data.mal_check2_text||""} onChange={e=>set("mal_check2_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">SRY-sektion</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.mal_sry_bg||"#141414"} onChange={e=>set("mal_sry_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_sry_title_color||"#ffffff"} onChange={e=>set("mal_sry_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_sry_text_color||"#ffffff"} onChange={e=>set("mal_sry_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.mal_sry_icon_bg||"#ffffff"} onChange={e=>set("mal_sry_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.mal_sry_icon_color||"#141414"} onChange={e=>set("mal_sry_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>SRY ikon</label>
            <select value={data.mal_sry_icon||"Award"} onChange={e=>set("mal_sry_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>SRY rubrik</label>
            <input value={data.mal_sry_title||""} onChange={e=>set("mal_sry_title",e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
          </div>
          <div>
            <label className={lbl}>SRY text 1</label>
            <textarea value={data.mal_sry_text1||""} onChange={e=>set("mal_sry_text1",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>SRY text 2</label>
            <textarea value={data.mal_sry_text2||""} onChange={e=>set("mal_sry_text2",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
        </>
  );
}
