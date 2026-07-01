import React from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { motion } from "framer-motion";
import { ShieldCheck, Leaf, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function OmOss() {
  const ws = useWebsite();
  const text = ws.about_text || "PureNorth Städ grundades med en enkel vision: att leverera städtjänster av högsta kvalitet med respekt för miljön. Vi är ett lokalt städföretag i Umeå med SRY-certifierad personal och Svanenmärkta Pur-Eco produkter. Varje städning utförs med noggrannhet, punktlighet och ett äkta engagemang för ditt hem.";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="pt-32 pb-24 sm:pt-40 sm:pb-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="text-sm font-semibold uppercase tracking-widest text-[#166534]">Om oss</span>
            <h1 className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-[#141414] mt-3 mb-6">
              Städning med hjärta & precision
            </h1>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mt-12">
            {/* Image */}
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="relative">
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
                alt="PureNorth Städ"
                className="rounded-3xl w-full h-[500px] object-cover shadow-xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-lg p-5 flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#141414]">100+</p>
                  <p className="text-xs text-slate-500">Nöjda kunder</p>
                </div>
                <div className="w-px bg-slate-100"/>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#141414]">5★</p>
                  <p className="text-xs text-slate-500">Betyg</p>
                </div>
                <div className="w-px bg-slate-100"/>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#141414]">3 år</p>
                  <p className="text-xs text-slate-500">Erfarenhet</p>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">{text}</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-[#166534]/10 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} className="text-[#166534]"/>
                  </span>
                  <span className="text-slate-700 font-medium">SRY-certifierad personal</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-[#166534]/10 flex items-center justify-center shrink-0">
                    <Leaf size={16} className="text-[#166534]"/>
                  </span>
                  <span className="text-slate-700 font-medium">Svanenmärkta Pur-Eco produkter</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-[#166534]/10 flex items-center justify-center shrink-0">
                    <Star size={16} className="text-[#166534]"/>
                  </span>
                  <span className="text-slate-700 font-medium">50% RUT-avdrag på arbetskostnaden</span>
                </div>
              </div>
              <a href="/#boka" className="mt-10 inline-flex items-center justify-center rounded-full bg-[#141414] hover:bg-black text-white px-8 py-4 text-base font-semibold transition-colors">
                Boka städning
              </a>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
