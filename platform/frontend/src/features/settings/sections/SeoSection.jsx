import React from "react";

export function SeoSection({ data, set, inp, lbl }) {
  return (
    <>
      <h3 className="font-semibold text-slate-800">SEO — Sökmotoroptimering</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-2">
        💡 SEO-inställningar hjälper Google att hitta och visa din webbplats korrekt.
      </div>
      <div>
        <label className={lbl}>Meta Title (sidrubrik i Google)</label>
        <input value={data.seo_title||""} onChange={e=>set("seo_title",e.target.value)}
          placeholder="PureNorth Städ – Professionell städning i Umeå"
          className={inp}/>
        <p className="text-xs text-slate-400 mt-1">Rekommenderat: 50–60 tecken ({(data.seo_title||"").length}/60)</p>
      </div>
      <div>
        <label className={lbl}>Meta Description (beskrivning i Google)</label>
        <textarea value={data.seo_description||""} onChange={e=>set("seo_description",e.target.value)}
          rows={3} placeholder="Vi erbjuder professionell hemstädning, flyttstädning och kontorsstädning i Umeå. SRY-utbildad personal och miljövänliga produkter."
          className={inp+" resize-none"}/>
        <p className="text-xs text-slate-400 mt-1">Rekommenderat: 150–160 tecken ({(data.seo_description||"").length}/160)</p>
      </div>
      <div>
        <label className={lbl}>Keywords (sökord, kommaseparerade)</label>
        <input value={data.seo_keywords||""} onChange={e=>set("seo_keywords",e.target.value)}
          placeholder="städning Umeå, hemstädning, flyttstädning, SRY"
          className={inp}/>
      </div>
      <div>
        <label className={lbl}>OG Image URL (bild som visas vid delning)</label>
        <input value={data.seo_og_image||""} onChange={e=>set("seo_og_image",e.target.value)}
          placeholder="https://..." className={inp}/>
        <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 1200×630px</p>
      </div>
      {data.seo_title && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-2 font-medium">Förhandsgranskning i Google:</p>
          <p className="text-blue-600 text-sm font-medium">{data.seo_title}</p>
          <p className="text-green-700 text-xs">purenorth-stad.vercel.app</p>
          <p className="text-slate-600 text-xs mt-1">{data.seo_description}</p>
        </div>
      )}
    </>
  );
}
