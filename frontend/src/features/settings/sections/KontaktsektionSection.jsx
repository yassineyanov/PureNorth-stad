import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, Toggle, ColorPicker } from "@/shared/ui";

export function KontaktsektionSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Kontaktsektion</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontakt i Navbar</label>
            <button type="button" onClick={()=>set("show_kontakt_in_navbar", data.show_kontakt_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontakt_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontakt_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett (liten text ovan rubrik)</label>
            <button type="button" onClick={()=>set("show_contact_title", data.show_contact_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_title||""} onChange={e=>set("contact_title",e.target.value)} placeholder="Kontakt" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_title_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_contact_subtitle", data.show_contact_subtitle === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_subtitle !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_subtitle !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_subtitle||""} onChange={e=>set("contact_subtitle",e.target.value)} placeholder="Vi finns i Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_subtitle_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Undertext</label>
            <button type="button" onClick={()=>set("show_contact_description", data.show_contact_description === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_description !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_description !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.contact_description||""} onChange={e=>set("contact_description",e.target.value)} rows={3} placeholder="Har du frågor eller vill boka en städning?" className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="contact_description_color" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Svart box (höger)</h4>
          <div>
            <div className="flex items-center justify-between mb-1"><label className={lbl}>Svart box (visa/göm)</label><button type="button" onClick={()=>set("show_contact_box", data.show_contact_box === false ? true : false)} className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_box !== false ? "bg-blue-500" : "bg-slate-200"}`}><span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_box !== false ? "translate-x-5" : "translate-x-0"}`}/></button></div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.contact_box_title||""} onChange={e=>set("contact_box_title",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_box_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <textarea value={data.contact_box_text||""} onChange={e=>set("contact_box_text",e.target.value)} rows={3} placeholder="Miljövänlig städning med SRY-utbildad personal..." className={inp+" resize-none"}/>
            <ColorPicker label="Box BG" colorKey="contact_box_text_color" bgKey="contact_box_bg" defaultColor="rgba(255,255,255,0.75)" defaultBg="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box knapp text</label>
            <input value={data.contact_box_btn||""} onChange={e=>set("contact_box_btn",e.target.value)} placeholder="Boka tid nu" className={inp}/>
            <ColorPicker label="Knapp färger" colorKey="contact_box_btn_color" bgKey="contact_box_btn_bg" defaultColor="#141414" defaultBg="#ffffff" data={data} set={set}/>
          </div>
        </>
  );
}
