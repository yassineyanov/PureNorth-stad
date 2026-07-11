import React from "react";
import { motion } from "framer-motion";
import { Award, Leaf, Percent, Check, ShieldCheck, Star, Heart, Zap, CheckCircle, Sparkles } from "lucide-react";

const IconMap = { Award, Leaf, Percent, ShieldCheck, Star, Heart, Zap, CheckCircle, Sparkles };
function CardIcon({ name, size=24 }) {
  const Icon = IconMap[name] || Award;
  return <Icon size={size}/>;
}
import { useWebsite } from "@/context/WebsiteContext";

export const WhyUs = () => {
  const ws = useWebsite();
  return (
    <section id="varfor-oss" className="py-24 sm:py-32 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-16">
          {ws.show_whyus_label !== false && (
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.whyus_label_color || "#141414"}}>
              {ws.whyus_label || "Varför välja oss?"}
            </p>
          )}
          {ws.show_whyus_title !== false && (
            <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight" style={{color: ws.whyus_title_color || "#141414"}}>
              {ws.whyus_title || "Kvalitet du känner och naturen tackar för"}
            </h2>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ws.show_sry_card !== false && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            data-testid="why-card-sry"
            className="lg:col-span-2 lg:row-span-2 rounded-3xl text-white p-9 sm:p-11 flex flex-col justify-between overflow-hidden relative"
            style={{backgroundColor: ws.sry_bg || "#141414"}}>
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-[#166534] flex items-center justify-center mb-6" style={{color: ws.sry_icon_color || "#ffffff"}}>
                <CardIcon name={ws.sry_icon || "Award"} size={24}/>
              </div>
              <h3 className="font-display font-bold text-3xl mb-4" style={{color: ws.sry_title_color || "#ffffff"}}>{ws.sry_title || "SRY-kvalifikation"}</h3>
              <p className="text-lg leading-relaxed max-w-lg" style={{color: ws.sry_text_color || "rgba(255,255,255,0.75)"}}>
                {ws.sry_text || "Med kvalifikation från Servicebranschens Yrkesnämnd (SRY) levererar PureNorth Städ hög standard och bra kvalité på alla våra städtjänster. Vår personal är SRY-utbildad."}
              </p>
            </div>
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              {(ws.sry_tags ? ws.sry_tags.split(",") : ["SRY-utbildad personal", "Hög standard", "Trygg & försäkrad"]).map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white">
                  <Check size={14} className="text-[#4ade80]" /> {t.trim()}
                </span>
              ))}
            </div>
            <div className="absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-white/[0.04]" />
          </motion.div>
          )}

          {ws.show_eco_card !== false && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            data-testid="why-card-eco"
            className="rounded-3xl border border-slate-200 p-8"
            style={{backgroundColor: ws.eco_card_bg || "#ffffff"}}>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5" style={{backgroundColor: (ws.eco_icon_color||"#166534")+"1a", color: ws.eco_icon_color||"#166534"}}>
              <CardIcon name={ws.eco_icon || "Leaf"} size={22}/>
            </div>
            <h3 className="font-display font-semibold text-2xl mb-3" style={{color: ws.eco_title_color || "#141414"}}>
              {ws.eco_title || "Svanenmärkt & miljöcertifierat"}
            </h3>
            <p className="text-[15px] leading-relaxed" style={{color: ws.eco_text_color || "#475569"}}>
              {ws.eco_text || "Vi skyddar både din hälsa och vår natur genom att använda Svanenmärkta, miljöcertifierade Pur-Eco produkter."}
            </p>
          </motion.div>
          )}

          {ws.show_rut_card !== false && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
            data-testid="why-card-rut"
            className="rounded-3xl border border-slate-200 p-8"
            style={{backgroundColor: ws.rut_card_bg || "#ffffff"}}>
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5" style={{backgroundColor: (ws.rut_icon_color||"#166534")+"1a", color: ws.rut_icon_color||"#166534"}}>
              <CardIcon name={ws.rut_icon || "Percent"} size={22}/>
            </div>
            <h3 className="font-display font-semibold text-2xl mb-3" style={{color: ws.rut_title_color || "#141414"}}>
              {ws.rut_title || "50% RUT-avdrag"}
            </h3>
            <p className="text-[15px] leading-relaxed" style={{color: ws.rut_text_color || "#475569"}}>
              {ws.rut_text || "Som privatperson drar vi automatiskt av halva arbetskostnaden direkt på fakturan, du betalar bara resten."}
            </p>
          </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
