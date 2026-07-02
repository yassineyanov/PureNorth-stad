import React from "react";
import { motion } from "framer-motion";
import { Phone, Leaf, ShieldCheck, Star, Heart, Zap, Award, CheckCircle } from "lucide-react";
import { useWebsite, useWebsiteReady } from "@/context/WebsiteContext";

const IconMap = { Leaf, ShieldCheck, Star, Heart, Zap, Award, CheckCircle };

function BadgeIcon({ name, size, className }) {
  const Icon = IconMap[name] || Leaf;
  return <Icon size={size} className={className} />;
}

export const Hero = () => {
  const ws = useWebsite();
  const ready = useWebsiteReady();
  if (!ready) return null;

  return (
    <section id="hem" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden bg-soft-grid">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

          {ws.show_hero_badge !== false && (
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-6" style={{color: ws.hero_badge_color || "#166534", backgroundColor: ws.hero_badge_bg || "rgba(22,101,52,0.1)"}}>
              {ws.hero_badge_image
                ? <img src={ws.hero_badge_image} alt="" className="h-4 w-4 object-contain"/>
                : ws.hero_badge_icon !== "none" && <BadgeIcon name={ws.hero_badge_icon || "Leaf"} size={15} />
              }
              {ws.hero_badge || "Svanenmärkt & miljöcertifierat"}
            </span>
          )}

          {ws.show_hero_title !== false && (
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-[4rem] leading-[1.05] tracking-tight" style={{color: ws.hero_title_color || "#141414", backgroundColor: ws.hero_title_bg || "transparent"}}>
              {ws.hero_title || "Renhet med norrländsk precision i Umeå."}
            </h1>
          )}

          {ws.show_hero_subtitle !== false && (
            <p className="mt-6 text-lg leading-relaxed max-w-xl" style={{color: ws.hero_subtitle_color || "#475569", backgroundColor: ws.hero_subtitle_bg || "transparent"}}>
              {ws.hero_subtitle || "Vi definierar premiumstädning genom certifierad expertis och hållbara metoder."}
            </p>
          )}

          {ws.show_hero_cta !== false && (
            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <a href="#boka" data-testid="hero-boka-btn"
                className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold transition-colors" style={{color: ws.hero_cta_color || "#ffffff", backgroundColor: ws.hero_cta_bg || "#141414"}}>
                {ws.cta_text || "Boka tid online"}
              </a>
              {ws.show_hero_phone !== false && (
                <a href={`tel:${(ws.phone || "070-624 04 03").replace(/[^0-9]/g, "")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 hover:border-slate-400 px-8 py-4 text-base font-semibold transition-colors"
                  style={{color: ws.hero_phone_color || "#374151", backgroundColor: ws.hero_phone_bg || "transparent"}}>
                  <Phone size={18} style={{color: ws.hero_phone_icon_color || "#374151"}}/> {ws.phone || "070-624 04 03"}
                </a>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center gap-5">
            {ws.show_hero_badge1 !== false && (
              <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{color: ws.hero_badge1_color || "#475569"}}>
                {ws.badge1_image
                  ? <img src={ws.badge1_image} alt="" className="h-4 w-4 object-contain"/>
                  : ws.badge1_icon !== "none" && <BadgeIcon name={ws.badge1_icon || "ShieldCheck"} size={16} className="text-[#166534]" />
                }
                {ws.badge1 || "SRY-kvalifikation"}
              </span>
            )}
            {ws.show_hero_badge2 !== false && (
              <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{color: ws.hero_badge2_color || "#475569"}}>
                {ws.badge2_image
                  ? <img src={ws.badge2_image} alt="" className="h-4 w-4 object-contain"/>
                  : ws.badge2_icon !== "none" && <BadgeIcon name={ws.badge2_icon || "Leaf"} size={16} className="text-[#166534]" />
                }
                {ws.badge2 || "Pur-Eco produkter"}
              </span>
            )}
          </div>
        </motion.div>

        {/* Right - Image */}
        {ws.show_hero_image !== false && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative hidden lg:block">
            <img
              src={ws.hero_image || "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"}
              alt="Städning"
              className="rounded-3xl w-full h-[540px] object-cover shadow-2xl"
            />
            <div className="absolute bottom-6 right-6 bg-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-[#166534]/10 flex items-center justify-center text-[#166534] font-bold text-sm">50%</span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">RUT-avdrag</p>
                <p className="text-xs text-slate-500">Dras direkt på fakturan</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
