import React from "react";
import { motion } from "framer-motion";
import { Home, Truck, Building2, Sparkles, ArrowRight, Leaf, ShieldCheck, Star, Heart, Zap, Award } from "lucide-react";
import { useWebsite } from "@/context/WebsiteContext";

const IconMap = { Home, Truck, Building2, Sparkles, Leaf, ShieldCheck, Star, Heart, Zap, Award };
const DEFAULT_SERVICES = [
  { title: "Hemstädning", desc: "Regelbunden eller engångsstädning som ger dig mer tid till det du älskar.", icon_name: "Home", icon_color: "#166534", img: "https://images.pexels.com/photos/36777855/pexels-photo-36777855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
  { title: "Flyttstädning", desc: "Noggrann städning vid in och utflyttning, med nöjd kund garanti.", icon_name: "Truck", icon_color: "#166534", img: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" },
  { title: "Kontorsstädning", desc: "Professionell städning av arbetsplatser för en frisk arbetsmiljö.", icon_name: "Building2", icon_color: "#166534", img: "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" },
  { title: "Storstädning", desc: "Djuprengöring av hela bostaden, perfekt inför högtider och säsong.", icon_name: "Sparkles", icon_color: "#166534", img: "https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
];

export const Services = () => {
  const ws = useWebsite();
  const services = (ws.services && ws.services.length > 0) ? ws.services : DEFAULT_SERVICES;

  return (
    <section id="tjanster" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-16">
          {ws.show_services_label !== false && (
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.services_label_color || "#141414"}}>
              {ws.services_label || "Våra tjänster"}
            </p>
          )}
          {ws.show_services_title !== false && (
            <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight" style={{color: ws.services_title_color || "#0f172a"}}>
              {ws.services_title || "Städtjänster för hem och företag"}
            </h2>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
          {services.filter(s => s.show !== false).map((s, i) => {
            const Icon = IconMap[s.icon_name] || Home;
            return (
              <motion.div key={i} data-testid={`service-card-${i}`}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-2xl border border-slate-100 overflow-hidden bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="h-44 overflow-hidden">
                  <img src={s.img} alt={`${s.title} i Umeå`} loading="lazy" decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                </div>
                <div className="p-6">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4 -mt-10 relative bg-white border border-slate-100">
                    <Icon size={20} style={{color: s.icon_color || "#166534"}}/>
                  </div>
                  <h3 className="font-display font-semibold text-xl mb-2" style={{color: s.title_color || "#0f172a"}}>{s.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{color: s.desc_color || "#475569"}}>{s.desc}</p>
                  <a href="#boka" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#141414] group-hover:gap-2.5 transition-all">
                    Boka <ArrowRight size={15}/>
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
