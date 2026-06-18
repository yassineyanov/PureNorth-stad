import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "Anna Lindqvist",
    role: "Privatkund, Umeå",
    text: "Helt fantastiskt resultat! Personalen var noggrann, trevlig och proffsig. Hemmet har aldrig känts så rent. Rekommenderas varmt.",
  },
  {
    name: "Johan Bergström",
    role: "Kontorschef",
    text: "Vi anlitar PureNorth för vår kontorsstädning varje vecka. Alltid punktliga och med ett öga för detaljer. Miljövänligt dessutom!",
  },
  {
    name: "Sara Nyström",
    role: "Flyttstädning",
    text: "Beställde flyttstädning och allt gick smidigt. Besiktningen godkändes direkt. Trygg och prisvärd tjänst med RUT-avdrag.",
  },
];

export const Testimonials = () => (
  <section id="omdomen" className="py-24 sm:py-32 bg-white">
    <div className="max-w-7xl mx-auto px-5 sm:px-8">
      <div className="max-w-2xl mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#166534] mb-3">
          Omdömen
        </p>
        <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#141414]">
          Vad våra kunder säger
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r, i) => (
          <motion.div
            key={r.name}
            data-testid={`testimonial-${i}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="rounded-3xl border border-slate-200 p-8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
          >
            <Quote size={28} className="text-[#141414] mb-4" />
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={16} className="fill-[#166534] text-[#166534]" />
              ))}
            </div>
            <p className="text-[15px] text-slate-700 leading-relaxed flex-1">"{r.text}"</p>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="font-display font-semibold text-slate-900">{r.name}</p>
              <p className="text-sm text-slate-500">{r.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
