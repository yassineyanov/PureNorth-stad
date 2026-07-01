import React from "react";
import { motion } from "framer-motion";
import { Phone, Leaf, ShieldCheck } from "lucide-react";
import { useWebsite } from "@/context/WebsiteContext";

export const Hero = () => {
  const ws = useWebsite();
  return (
    <section id="hem" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden bg-soft-grid">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-[#166534]/10 text-[#166534] px-4 py-1.5 text-sm font-semibold mb-6">
            <Leaf size={15} /> {ws.hero_badge || "Svanenmärkt & miljöcertifierat"}
          </span>
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-[4rem] leading-[1.05] tracking-tight text-[#141414]">
            {ws.hero_title || "Renhet med norrländsk precision i Umeå."}
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
            {ws.hero_subtitle || "Vi definierar premiumstädning genom certifierad expertis och hållbara metoder. Från fönsterputs till flyttstädning, vi tar hand om detaljerna."}
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-4">
            <a
              href="#boka"
              data-testid="hero-boka-btn"
              className="inline-flex items-center justify-center rounded-full bg-[#141414] hover:bg-[#000000] text-white px-8 py-4 text-base font-semibold transition-colors"
            >
              {ws.cta_text || "Boka tid online"}
            </a>
            <a
              href={`tel:${(ws.phone || "070-624 04 03").replace(/[^0-9]/g, "")}`}
              data-testid="hero-call-btn"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 hover:border-[#141414] hover:bg-[#141414] hover:text-white text-slate-800 px-8 py-4 text-base font-semibold transition-colors"
            >
              <Phone size={18} /> {ws.phone || "070-624 04 03"}
            </a>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#166534]" /> {ws.badge1 || "SRY-kvalifikation"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Leaf size={16} className="text-[#166534]" /> {ws.badge2 || "Pur-Eco produkter"}
            </span>
          </div>
        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <div className="relative rounded-[2rem] overflow-hidden shadow-[0_30px_80px_-30px_rgba(20,20,20,0.4)]">
            <img
              src="https://images.unsplash.com/photo-1616594039964-ae9021a400a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
              alt="Professionell städning i Umeå av PureNorth Städ" loading="eager" fetchpriority="high" decoding="async"
              className="w-full h-[420px] sm:h-[520px] object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-4 sm:left-6 bg-white rounded-2xl border border-slate-100 shadow-lg px-6 py-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-[#166534] flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">50%</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">RUT-avdrag</p>
              <p className="text-xs text-slate-500">Dras direkt på fakturan</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
