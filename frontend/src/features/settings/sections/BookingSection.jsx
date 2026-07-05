import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle } from "@/shared/ui";

export function BookingSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Bokningsformulär</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa bokningsformulär</label>
            <button type="button" onClick={()=>set("show_booking", data.show_booking === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">BG färg</span>
            <CircleColor value={data.booking_bg||"#141414"} onChange={e=>set("booking_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Vänster sida</h4>
          <div>
            <label className={lbl}>Etikett (liten text)</label>
            <input value={data.booking_left_label||""} onChange={e=>set("booking_left_label",e.target.value)} placeholder="Boka tid" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_label_color||"rgba(255,255,255,0.5)"} onChange={e=>set("booking_left_label_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_left_title||""} onChange={e=>set("booking_left_title",e.target.value)} placeholder="Boka online eller ring oss" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_title_color||"#ffffff"} onChange={e=>set("booking_left_title_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.booking_left_subtitle||""} onChange={e=>set("booking_left_subtitle",e.target.value)} rows={2} placeholder="Fyll i formuläret..." className={inp+" resize-none"}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_subtitle_color||"rgba(255,255,255,0.7)"} onChange={e=>set("booking_left_subtitle_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Ring oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa knapp</label>
            <button type="button" onClick={()=>set("show_booking_phone_btn", data.show_booking_phone_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking_phone_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking_phone_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Label text</label>
            <input value={data.booking_phone_btn_label||""} onChange={e=>set("booking_phone_btn_label",e.target.value)} placeholder="Ring oss" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.booking_phone_btn_icon||"Phone"} onChange={e=>set("booking_phone_btn_icon",e.target.value)} className={inp}>
              <option value="Phone">📞 Phone</option>
              <option value="Smartphone">📱 Smartphone</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Ikon BG</span><CircleColor value={data.booking_phone_btn_icon_bg||"#ffffff"} onChange={e=>set("booking_phone_btn_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span><CircleColor value={data.booking_phone_btn_icon_color||"#141414"} onChange={e=>set("booking_phone_btn_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span><CircleColor value={data.booking_phone_btn_label_color||"rgba(255,255,255,0.5)"} onChange={e=>set("booking_phone_btn_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Nummer</span><CircleColor value={data.booking_phone_btn_number_color||"#ffffff"} onChange={e=>set("booking_phone_btn_number_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_phone_btn_bg||"rgba(255,255,255,0.06)"} onChange={e=>set("booking_phone_btn_bg",e.target.value)}/>
          </div>

          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Höger sida (formulär)</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Form BG</span>
            <CircleColor value={data.booking_form_bg||"#1a1a1a"} onChange={e=>set("booking_form_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span>
            <CircleColor value={data.booking_form_label_color||"#b3b3b3"} onChange={e=>set("booking_form_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Input BG</span>
            <CircleColor value={data.booking_form_input_bg||"#1f1f1f"} onChange={e=>set("booking_form_input_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Input text</span>
            <CircleColor value={data.booking_form_input_text||"#ffffff"} onChange={e=>set("booking_form_input_text",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Skicka-knapp</h4>
          <div>
            <label className={lbl}>Knapp text</label>
            <input value={data.booking_submit_text||""} onChange={e=>set("booking_submit_text",e.target.value)} placeholder="Skicka bokningsförfrågan" className={inp}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Text</span><CircleColor value={data.booking_submit_color||"#141414"} onChange={e=>set("booking_submit_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_submit_bg||"#ffffff"} onChange={e=>set("booking_submit_bg",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Success meddelande</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_success_title||""} onChange={e=>set("booking_success_title",e.target.value)} placeholder="Tack för din förfrågan!" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.booking_success_text||""} onChange={e=>set("booking_success_text",e.target.value)} placeholder="Vi återkommer inom 24 timmar." className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_success_color||"#ffffff"} onChange={e=>set("booking_success_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänster</h4>
          {(data.booking_services||[]).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s||""} onChange={e=>{const arr=[...data.booking_services];arr[idx]=e.target.value;set("booking_services",arr);}} placeholder="Hemstädning" className={inp}/>
              <button onClick={()=>set("booking_services",data.booking_services.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("booking_services",[...(data.booking_services||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>
  );
}
