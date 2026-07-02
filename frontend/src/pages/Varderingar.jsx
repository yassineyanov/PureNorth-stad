import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Tag, HeartHandshake, ShieldCheck, Ear, Star, Leaf, Award, Heart, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";
import { useWebsite } from "@/context/WebsiteContext";

const IconMap = { Tag, HeartHandshake, ShieldCheck, Ear, Star, Leaf, Award, Heart, Zap };

const DEFAULT_VALUES = [
  { icon: "Tag", title: "Priser", text: "För både er och vår personals trygghet matchar vi priset till kvalitén som erbjuds." },
  { icon: "HeartHandshake", title: "Service", text: "Vi är kända för att alltid bemöta kunder på ett bra sätt." },
  { icon: "ShieldCheck", title: "Kvalitetssäkring", text: "Vår målsättning är att leverera tjänster av toppkvalité, med hög service och professionalism." },
  { icon: "Ear", title: "Respekt & lyhördhet", text: "Att respektera våra kunder, hem och medarbetare är grunden till en bra vardag." },
];

export default function Varderingar() {
  const ws = useWebsite();
  const values = (ws.varderingar_values && ws.varderingar_values.length > 0) ? ws.varderingar_values : DEFAULT_VALUES;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen" style={{backgroundColor: ws.varderingar_bg || "#ffffff"}}>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-16 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.varderingar_eyebrow_color || "#141414"}}>
              {ws.varderingar_eyebrow || "Värderingar"}
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight" style={{color: ws.varderingar_title_color || "#141414"}}>
              {ws.varderingar_title || "Hur vi tänker"}
            </h1>
            <p className="mt-4 text-lg leading-relaxed" style={{color: ws.varderingar_intro_color || "#475569"}}>
              {ws.varderingar_intro || "Hur vi värderar våra tjänster och mötet med kund."}
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => {
              const Icon = IconMap[v.icon];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
                  className="rounded-3xl border border-slate-200 p-8 hover:shadow-lg transition-shadow"
                  style={{backgroundColor: ws.varderingar_card_bg || "#ffffff"}}>
                  {v.icon !== "none" && Icon && (
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{backgroundColor: ws.varderingar_icon_bg || "#141414", color: ws.varderingar_icon_color || "#ffffff"}}>
                    <Icon size={22}/>
                  </div>
                  )}
                  <h3 className="font-display font-semibold text-2xl mb-3" style={{color: ws.varderingar_card_title_color || "#141414"}}>{v.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{color: ws.varderingar_card_text_color || "#475569"}}>{v.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
