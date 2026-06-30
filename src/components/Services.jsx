import React from "react";
import { motion } from "framer-motion";
import { Home, Truck, Building2, Sparkles, ArrowRight } from "lucide-react";

const services = [
  {
    title: "Hemstädning",
    desc: "Regelbunden eller engångsstädning som ger dig mer tid till det du älskar.",
    icon: Home,
    img: "https://images.pexels.com/photos/36777855/pexels-photo-36777855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    title: "Flyttstädning",
    desc: "Noggrann städning vid in och utflyttning, med nöjd kund garanti.",
    icon: Truck,
    img: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
  },
  {
    title: "Kontorsstädning",
    desc: "Professionell städning av arbetsplatser för en frisk arbetsmiljö.",
    icon: Building2,
    img: "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
  },
  {
    title: "Storstädning",
    desc: "Djuprengöring av hela bostaden, perfekt inför högtider och säsong.",
    icon: Sparkles,
    img: "https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
];

export const Services = () => {
  return (
    <section id="tjanster" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#141414] mb-3">
            Våra tjänster
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-slate-900">
            Städtjänster för hem och företag
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                data-testid={`service-card-${i}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-2xl border border-slate-100 overflow-hidden bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-44 overflow-hidden">
                  <img
                    src={s.img}
                    alt={`${s.title} i Umeå – PureNorth Städ`} loading="lazy" decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4 -mt-10 relative bg-white border border-slate-100">
                    <Icon size={20} className="text-[#166534]" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-[15px] text-slate-600 leading-relaxed">{s.desc}</p>
                  <a
                    href="#boka"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#141414] group-hover:gap-2.5 transition-all"
                  >
                    Boka <ArrowRight size={15} />
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
