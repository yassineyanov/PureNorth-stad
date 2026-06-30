import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Tag, HeartHandshake, ShieldCheck, Ear } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";

const values = [
  {
    icon: Tag,
    title: "Priser",
    text: "För både er och vår personals trygghet matchar vi priset till kvalitén som erbjuds. En professionell service kostar förstås några extra kronor, men det är priset för att hålla en hög standard och vi ser till att göra det värt varje krona för er som kund.",
  },
  {
    icon: HeartHandshake,
    title: "Service",
    text: "Vi är kända för att alltid bemöta kunder på ett bra sätt. När man använder våra tjänster får man alltid ett personligt engagemang och service med tydligt resultat.",
  },
  {
    icon: ShieldCheck,
    title: "Kvalitetssäkring",
    text: "Vår målsättning är att leverera tjänster av toppkvalité, med hög service och professionalism. Vi fokuserar även på en bra arbetsmiljö för våra anställda för att kunna säkerställa dessa förutsättningar.",
  },
  {
    icon: Ear,
    title: "Respekt & lyhördhet",
    text: "Att respektera våra kunder, hem och medarbetare är grunden till en bra vardag. Vi vill också kunna uppfylla kunders önskemål och behov. På så sätt kan vi leverera lösningar som är personligt anpassade.",
  },
];

export default function Varderingar() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          {/* Intro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16 max-w-2xl"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-[#141414] mb-3">
              Värderingar
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-[#141414]">
              Hur vi tänker
            </h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              Hur vi värderar våra tjänster och mötet med kund.
            </p>
          </motion.div>

          {/* Value cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
                  className="rounded-3xl border border-slate-200 p-8 hover:shadow-lg transition-shadow"
                >
                  <div className="h-12 w-12 rounded-2xl bg-[#141414] text-white flex items-center justify-center mb-5">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-display font-semibold text-2xl text-[#141414] mb-3">{v.title}</h3>
                  <p className="text-[15px] text-slate-600 leading-relaxed">{v.text}</p>
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
