import React from "react";

export function SocialSection({ data, set, inp, lbl }) {
  return (
    <>
      <h3 className="font-semibold text-slate-800">Sociala medier</h3>
      <div>
        <label className={lbl}>Facebook URL</label>
        <input value={data.facebook_url || ""} onChange={e => set("facebook_url", e.target.value)} placeholder="https://facebook.com/purenorth" className={inp}/>
      </div>
      <div>
        <label className={lbl}>Instagram URL</label>
        <input value={data.instagram_url || ""} onChange={e => set("instagram_url", e.target.value)} placeholder="https://instagram.com/purenorth" className={inp}/>
      </div>
    </>
  );
}
