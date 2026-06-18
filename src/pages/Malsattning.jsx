import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Award } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";

export default function Malsattning() {
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
            className="mb-16 max-w-3xl"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-[#141414] mb-3">
              Målsättning
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-[#141414]">
              Vår målsättning
            </h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              PureNorth Städ drivs med ambition. Vi ska alltid kunna erbjuda våra kunder
              en enklare och trivsammare vardag med städning i alla dess former. Vi
              levererar våra tjänster med erfarenhet och den flexibilitet som krävs för
              att anpassa oss till de unika uppdrag som vi får av våra kunder.
            </p>
          </motion.div>

          {/* Feature blocks */}
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            <div className="rounded-3xl overflow-hidden border border-slate-100 flex flex-col">
              <div className="h-64 w-full bg-[#FAFAFA] flex items-center justify-center">
                <div className="h-52 w-52 rounded-full bg-[#1f7a3d] flex flex-col items-center justify-center text-white shadow-lg">
                  <span
                    className="block h-24 w-24 bg-white"
                    style={{
                      WebkitMaskImage: "url(/svanen.png)",
                      maskImage: "url(/svanen.png)",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                    }}
                    aria-label="Svanenmärkt logotyp"
                    role="img"
                  />
                  <span className="font-display font-bold text-sm tracking-[0.2em] uppercase mt-2">
                    Svanenmärkt
                  </span>
                </div>
              </div>
              <div className="p-8">
                <h3 className="font-display font-semibold text-xl text-[#141414] mb-2">
                  Miljövänliga val är viktiga för oss
                </h3>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  Vi använder Svanenmärkta, miljöcertifierade Pur-Eco produkter för att
                  skydda både din hälsa och vår natur.
                </p>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-slate-100 flex flex-col">
              <img
                src="https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="Trygg arbetsplats"
                className="h-64 w-full object-cover"
              />
              <div className="p-8">
                <h3 className="font-display font-semibold text-xl text-[#141414] mb-2">
                  En trygg arbetsplats
                </h3>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  Vi har kollektivavtal för en trygg arbetsplats och goda villkor för vår
                  personal.
                </p>
              </div>
            </div>
          </div>

          {/* Checkmarks */}
          <div className="grid sm:grid-cols-2 gap-6 mb-20">
            <div className="rounded-3xl border border-slate-200 p-8 flex items-start gap-4">
              <span className="h-10 w-10 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0">
                <Check size={18} />
              </span>
              <div>
                <h3 className="font-display font-semibold text-xl text-[#141414] mb-2">Hög kvalité</h3>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  Vi levererar hög kvalité genom kvalitetssäkring på utfört arbete. Är du
                  inte nöjd med utförandet har vi 14 dagars garanti.
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 p-8 flex items-start gap-4">
              <span className="h-10 w-10 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0">
                <Clock size={18} />
              </span>
              <div>
                <h3 className="font-display font-semibold text-xl text-[#141414] mb-2">Klart inom 24 timmar</h3>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  Vi arbetar så effektivt som möjligt för att minska både er och vår
                  kostnad, så vi kan erbjuda en arbetstid på mindre än 24 timmar över
                  nästan alla våra tjänster.
                </p>
              </div>
            </div>
          </div>

          {/* SRY */}
          <div className="rounded-3xl bg-[#141414] text-white p-9 sm:p-11">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
              <Award size={24} />
            </div>
            <h2 className="font-display font-bold text-3xl mb-4">SRY-kvalifikation</h2>
            <p className="text-white/75 text-lg leading-relaxed">
              Med kvalifikation från Servicebranschens Yrkesnämnd (SRY) levererar
              PureNorth Städ hög standard och bra kvalité på alla våra städtjänster. Vi
              utför alltid jobbet enligt överenskommelse som inkluderar en 14-dagars
              garanti. Det är viktigt för oss att våra kunder ska kunna känna sig trygga
              med vår service.
            </p>
            <p className="text-white/75 text-lg leading-relaxed mt-4">
              Vi har även handledarintyg från Skolverket och utbildar åt andra företag,
              samt vår egen personal, för att säkerställa att våra tjänster är i toppklass.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
