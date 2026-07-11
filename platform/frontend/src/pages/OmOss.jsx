import React from "react";
import { useWebsite, useWebsiteReady } from "@/context/WebsiteContext";
import { motion } from "framer-motion";
import { ShieldCheck, Leaf, Star, Heart, Zap, Award, CheckCircle, Sparkles } from "lucide-react";

const IconMap = { ShieldCheck, Leaf, Star, Heart, Zap, Award, CheckCircle, Sparkles };
function PointIcon({ name, size=16, className="", style={} }) {
  const Icon = IconMap[name] || ShieldCheck;
  return <Icon size={size} className={className} style={style}/>;
}
import { Navbar } from "@/components/Navbar";

export default function OmOss() {
  const ws = useWebsite();
  const ready = useWebsiteReady();
  if (!ready) return <div className="min-h-screen bg-white"><div className="h-1 bg-[#166534] animate-pulse"/></div>;
  const text = ws.about_text || "PureNorth Städ grundades med en enkel vision: att leverera städtjänster av högsta kvalitet med respekt för miljön. Vi är ett lokalt städföretag i Umeå med SRY-certifierad personal och Svanenmärkta Pur-Eco produkter. Varje städning utförs med noggrannhet, punktlighet och ett äkta engagemang för ditt hem.";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="pt-32 pb-24 sm:pt-40 sm:pb-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {ws.show_about_label !== false && <span className="text-sm font-semibold uppercase tracking-widest" style={{color: ws.about_label_color || "#166534"}}>{ws.about_label || "Om oss"}</span>}
            {ws.show_about_title !== false && <h1 className="font-display font-bold text-5xl sm:text-6xl tracking-tight mt-3 mb-6" style={{color: ws.about_title_color || "#141414"}}>
              {ws.about_title || "Städning med hjärta & precision"}
            </h1>}
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mt-12">
            {/* Image */}
            {ws.show_about_image !== false && (
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="relative">
              <img
                src={ws.about_image || "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"}
                alt="PureNorth Städ"
                className="rounded-3xl w-full h-[500px] object-cover shadow-xl"
              />
              {ws.show_about_stats !== false && (
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-lg p-5 flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{color: ws.about_stat_color || "#141414"}}>{ws.about_stat1_number || "100+"}</p>
                  <p className="text-xs text-slate-500">{ws.about_stat1_label || "Nöjda kunder"}</p>
                </div>
                <div className="w-px bg-slate-100"/>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{color: ws.about_stat_color || "#141414"}}>{ws.about_stat2_number || "5"}★</p>
                  <p className="text-xs text-slate-500">{ws.about_stat2_label || "Betyg"}</p>
                </div>
                <div className="w-px bg-slate-100"/>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{color: ws.about_stat_color || "#141414"}}>{ws.about_stat3_number || "3 år"}</p>
                  <p className="text-xs text-slate-500">{ws.about_stat3_label || "Erfarenhet"}</p>
                </div>
              </div>
              )}
            </motion.div>
            )}

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              {ws.show_about_text !== false && <p className="text-lg leading-relaxed mb-8" style={{color: ws.about_text_color || "#475569"}}>{text}</p>}
              <div className="space-y-4">
                {ws.show_about_point1 !== false && (
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-[#166534]/10 flex items-center justify-center shrink-0">
                      <PointIcon name={ws.about_point1_icon || "ShieldCheck"} size={16} className="" style={{color: ws.about_point1_icon_color || "#166534"}}/>
                    </span>
                    <span className="font-medium" style={{color: ws.about_point1_color || "#374151"}}>{ws.about_point1 || "SRY-certifierad personal"}</span>
                  </div>
                )}
                {ws.show_about_point2 !== false && (
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-[#166534]/10 flex items-center justify-center shrink-0">
                      <PointIcon name={ws.about_point2_icon || "Leaf"} size={16} className="" style={{color: ws.about_point2_icon_color || "#166634"}}/>
                    </span>
                    <span className="font-medium" style={{color: ws.about_point2_color || "#374151"}}>{ws.about_point2 || "Svanenmärkta Pur-Eco produkter"}</span>
                  </div>
                )}
                {ws.show_about_point3 !== false && (
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-[#166534]/10 flex items-center justify-center shrink-0">
                      <PointIcon name={ws.about_point3_icon || "Star"} size={16} className="" style={{color: ws.about_point3_icon_color || "#166534"}}/>
                    </span>
                    <span className="font-medium" style={{color: ws.about_point3_color || "#374151"}}>{ws.about_point3 || "50% RUT-avdrag på arbetskostnaden"}</span>
                  </div>
                )}
              </div>
              {ws.show_about_btn !== false && <a href="/#boka" className="mt-10 inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold transition-colors" style={{backgroundColor: ws.about_btn_bg || "#141414", color: ws.about_btn_color || "#ffffff"}}>
                {ws.about_btn_text || "Boka städning"}
              </a>}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
