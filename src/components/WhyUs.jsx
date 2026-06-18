import React from "react";
import { motion } from "framer-motion";
import { Award, Leaf, Percent, Check } from "lucide-react";

export const WhyUs = () => {
  return (
    <section id="varfor-oss" className="py-24 sm:py-32 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#166534] mb-3">
            Varför välja oss?
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#141414]">
            Kvalitet du känner — och naturen tackar för
          </h2>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Big card - SRY (luxury black) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            data-testid="why-card-sry"
            className="lg:col-span-2 lg:row-span-2 rounded-3xl bg-[#141414] text-white p-9 sm:p-11 flex flex-col justify-between overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-[#166534] text-white flex items-center justify-center mb-6">
                <Award size={24} />
              </div>
              <h3 className="font-display font-bold text-3xl mb-4">SRY-kvalifikation</h3>
              <p className="text-white/75 text-lg leading-relaxed max-w-lg">
                Med kvalifikation från Servicebranschens Yrkesnämnd (SRY) levererar
                PureNorth Städ hög standard och bra kvalité på alla våra städtjänster.
                Vår personal är SRY-utbildad.
              </p>
            </div>
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              {["SRY-utbildad personal", "Hög standard", "Trygg & försäkrad"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white"
                >
                  <Check size={14} className="text-[#4ade80]" /> {t}
                </span>
              ))}
            </div>
            <div className="absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-white/[0.04]" />
          </motion.div>

          {/* Eco card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            data-testid="why-card-eco"
            className="rounded-3xl bg-white border border-slate-200 p-8"
          >
            <div className="h-12 w-12 rounded-2xl bg-[#166534]/10 text-[#166534] flex items-center justify-center mb-5">
              <Leaf size={22} />
            </div>
            <h3 className="font-display font-semibold text-2xl text-[#141414] mb-3">
              Svanenmärkt & miljöcertifierat
            </h3>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              Vi skyddar både din hälsa och vår natur genom att använda Svanenmärkta,
              miljöcertifierade <strong>Pur-Eco</strong> produkter — en ledande ekologisk
              produktserie som ger effektiv och skonsam städning utan att kompromissa med
              resultatet.
            </p>
          </motion.div>

          {/* RUT card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            data-testid="why-card-rut"
            className="rounded-3xl bg-white border border-slate-200 p-8"
          >
            <div className="h-12 w-12 rounded-2xl bg-[#166534]/10 text-[#166534] flex items-center justify-center mb-5">
              <Percent size={22} />
            </div>
            <h3 className="font-display font-semibold text-2xl text-[#141414] mb-3">
              50% RUT-avdrag
            </h3>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              Som privatperson drar vi automatiskt av halva arbetskostnaden direkt på
              fakturan — du betalar bara resten.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
