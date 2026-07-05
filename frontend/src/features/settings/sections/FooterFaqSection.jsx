import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function FooterFaqSection({ data, set, inp, lbl }) {
  return (
    <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">FAQ</span>
          </div>
          <h3 className="font-semibold text-slate-800">FAQ – Vanliga frågor</h3>

          <div>
            <label className={lbl}>Sida BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.faq_bg||"#ffffff"} onChange={e=>set("faq_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.faq_label||""} onChange={e=>set("faq_label",e.target.value)} placeholder="Vanliga frågor & svar" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_label_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.faq_title||""} onChange={e=>set("faq_title",e.target.value)} placeholder="Vi har svaren" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.faq_subtitle||""} onChange={e=>set("faq_subtitle",e.target.value)} rows={2} placeholder="Hittar du inte svaret du söker?..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="faq_subtitle_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Frågor & svar färger</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Fråga</span>
            <CircleColor value={data.faq_question_color||"#141414"} onChange={e=>set("faq_question_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Svar</span>
            <CircleColor value={data.faq_answer_color||"#475569"} onChange={e=>set("faq_answer_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Kontaktruta (svart box)</label>
            <button type="button" onClick={()=>set("show_faq_contact_box", data.show_faq_contact_box === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_contact_box !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_contact_box !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Box BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.faq_box_bg||"#141414"} onChange={e=>set("faq_box_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.faq_box_title||""} onChange={e=>set("faq_box_title",e.target.value)} placeholder="Fortfarande frågor?" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_box_title_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <input value={data.faq_box_text||""} onChange={e=>set("faq_box_text",e.target.value)} placeholder="Vi hjälper dig gärna med din städning." className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_box_text_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Ring oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Ring oss</label>
            <button type="button" onClick={()=>set("show_faq_ring_btn", data.show_faq_ring_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_ring_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_ring_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <input value={data.faq_ring_text||""} onChange={e=>set("faq_ring_text",e.target.value)} placeholder="Ring oss" className={inp}/>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.faq_ring_color||"#141414"} onChange={e=>set("faq_ring_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.faq_ring_bg||"#ffffff"} onChange={e=>set("faq_ring_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.faq_ring_icon_color||"#141414"} onChange={e=>set("faq_ring_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.faq_ring_icon||"Phone"} onChange={e=>set("faq_ring_icon",e.target.value)} className={inp}>
              <option value="Phone">📞 Phone</option>
              <option value="Smartphone">📱 Smartphone</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Mejla oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Mejla oss</label>
            <button type="button" onClick={()=>set("show_faq_mail_btn", data.show_faq_mail_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_mail_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_mail_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <input value={data.faq_mail_text||""} onChange={e=>set("faq_mail_text",e.target.value)} placeholder="Mejla oss" className={inp}/>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.faq_mail_color||"#ffffff"} onChange={e=>set("faq_mail_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.faq_mail_bg||"transparent"} onChange={e=>set("faq_mail_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.faq_mail_icon_color||"#ffffff"} onChange={e=>set("faq_mail_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.faq_mail_icon||"Mail"} onChange={e=>set("faq_mail_icon",e.target.value)} className={inp}>
              <option value="Mail">✉️ Mail</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="Send">📤 Send</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <h4 className="font-medium text-slate-700 mb-2">Frågor (FAQ items)</h4>
          {(data.faq_items||[]).map((item, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("faq_items", data.faq_items.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Fråga</label>
                <input value={item.q||""} onChange={e=>{const s=[...data.faq_items];s[idx]={...s[idx],q:e.target.value};set("faq_items",s);}} placeholder="Hur gör jag en bokning?" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Svar</label>
                <textarea value={item.a||""} onChange={e=>{const s=[...data.faq_items];s[idx]={...s[idx],a:e.target.value};set("faq_items",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("faq_items",[...(data.faq_items||[]),{q:"",a:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till fråga
          </button>
          <hr className="border-slate-100"/>

        </>
  );
}
