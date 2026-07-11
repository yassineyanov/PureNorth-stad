import React, { useState } from "react";
import { motion } from "framer-motion";
import { MoveHorizontal } from "lucide-react";
import { useWebsite } from "@/context/WebsiteContext";

const BeforeAfterSlider = ({ before, after, alt, testid, ws }) => {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden select-none border border-white/10">
      <img src={after} alt={`${alt} efter`} draggable="false" className="absolute inset-0 w-full h-full object-cover"/>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={`${alt} före`} draggable="false" className="absolute inset-0 w-full h-full object-cover"/>
      </div>
      <span className="absolute top-3 left-3 text-xs font-semibold text-white px-3 py-1 rounded-full"
        style={{backgroundColor: ws.vart_fore_label_bg || "#141414"}}>
        {ws.vart_fore_label || "Före"}
      </span>
      <span className="absolute top-3 right-3 text-xs font-semibold text-white px-3 py-1 rounded-full"
        style={{backgroundColor: ws.vart_efter_label_bg || "#166534"}}>
        {ws.vart_efter_label || "Efter"}
      </span>
      <div className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center"
          style={{color: ws.vart_handle_color || "#141414"}}>
          <MoveHorizontal size={18}/>
        </div>
      </div>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))}
        data-testid={testid} aria-label={`${alt} före och efter`}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"/>
    </div>
  );
};

const DEFAULT_SLIDES = [
  { before: "/before-1.png", after: "/after-1.png", alt: "Sovrum", testid: "before-after-1" },
  { before: "/before-2.png", after: "/after-2.png", alt: "Kontor", testid: "before-after-2" },
];

export const BeforeAfter = () => {
  const ws = useWebsite();
  const slides = (ws.vart_slides && ws.vart_slides.length > 0) ? ws.vart_slides : DEFAULT_SLIDES;

  if (ws.show_vart === false) return null;

  return (
    <section id="vart-arbete" className="py-24 sm:py-32" style={{backgroundColor: ws.vart_bg || "#141414"}}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.vart_label_color || "#ffffff"}}>
            {ws.vart_label || "Vårt arbete"}
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight" style={{color: ws.vart_title_color || "#ffffff"}}>
            {ws.vart_title || "Före & efter"}
          </h2>
          <p className="mt-4 text-lg" style={{color: ws.vart_subtitle_color || "rgba(255,255,255,0.7)"}}>
            {ws.vart_subtitle || "Dra i reglaget för att se skillnaden. Resultat som talar för sig själva."}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-7">
          {slides.filter(s => s.show !== false && (s.before || s.after)).map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
              {(!s.mode || s.mode === "slider") && (
                <BeforeAfterSlider {...s} testid={s.testid || `before-after-${i+1}`} ws={ws}/>
              )}
              {s.mode === "before" && (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10">
                  <img src={s.before} alt={s.alt} className="w-full h-full object-cover"/>
                  <span className="absolute top-3 left-3 text-xs font-semibold text-white px-3 py-1 rounded-full"
                    style={{backgroundColor: ws.vart_fore_label_bg || "#141414"}}>
                    {ws.vart_fore_label || "Före"}
                  </span>
                </div>
              )}
              {s.mode === "after" && (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10">
                  <img src={s.after} alt={s.alt} className="w-full h-full object-cover"/>
                  <span className="absolute top-3 right-3 text-xs font-semibold text-white px-3 py-1 rounded-full"
                    style={{backgroundColor: ws.vart_efter_label_bg || "#166534"}}>
                    {ws.vart_efter_label || "Efter"}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
