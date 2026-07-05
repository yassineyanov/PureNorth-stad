import React from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import { CircleColor, TextColorPicker, ColorPicker } from "@/shared/ui";

export function ContactSection({ data, set, inp, lbl }) {
  return (
    <>
          <h3 className="font-semibold text-slate-800">Kontaktuppgifter</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontaktuppgifter</label>
            <button type="button" onClick={()=>set("show_kontaktuppgifter", data.show_kontaktuppgifter === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontaktuppgifter !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontaktuppgifter !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Telefonnummer</label>
            <button type="button" onClick={()=>set("show_phone", data.show_phone === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_phone !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_phone !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="070-624 04 03" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="phone_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.phone_icon_color||"#166534"} onChange={e=>set("phone_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>E-post</label>
            <button type="button" onClick={()=>set("show_email", data.show_email === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_email !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_email !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.email} onChange={e => set("email", e.target.value)} placeholder="info@purenorth.se" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="email_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.email_icon_color||"#166534"} onChange={e=>set("email_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Adress</label>
            <button type="button" onClick={()=>set("show_address", data.show_address === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_address !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_address !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.address} onChange={e => set("address", e.target.value)} placeholder="Storgatan 1, Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="address_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.address_icon_color||"#166534"} onChange={e=>set("address_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Öppettider</label>
            <button type="button" onClick={()=>set("show_opening_hours", data.show_opening_hours === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_opening_hours !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_opening_hours !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.opening_hours} onChange={e => set("opening_hours", e.target.value)} placeholder="Mån–Fre: 08:00–18:00" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="opening_hours_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.hours_icon_color||"#166534"} onChange={e=>set("hours_icon_color",e.target.value)}/>
            </div>
          </div>
        </>
  );
}
// Sun Jul  5 20:47:44 UTC 2026
