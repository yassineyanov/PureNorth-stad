import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Award, ShieldCheck, Star, Leaf, Heart, Zap, Home, Sparkles } from "lucide-react";
const IconMap = { Check, Clock, Award, ShieldCheck, Star, Leaf, Heart, Zap, Home, Sparkles };
function MalIcon({ name, size=18 }) { const Icon = IconMap[name]; return Icon ? <Icon size={size}/> : null; }
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";
import { useWebsite } from "@/context/WebsiteContext";

export default function Malsattning() {
  const ws = useWebsite();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen" style={{backgroundColor: ws.mal_bg || "#ffffff"}}>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-16 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.mal_eyebrow_color || "#141414"}}>
              {ws.mal_eyebrow || "Målsättning"}
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight" style={{color: ws.mal_title_color || "#141414"}}>
              {ws.mal_title || "Vår målsättning"}
            </h1>
            <p className="mt-4 text-lg leading-relaxed" style={{color: ws.mal_intro_color || "#475569"}}>
              {ws.mal_intro || "PureNorth Städ drivs med ambition. Vi ska alltid kunna erbjuda våra kunder en enklare och trivsammare vardag."}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-20">
            <div className="rounded-3xl overflow-hidden border border-slate-100 flex flex-col" style={{backgroundColor: ws.mal_card_bg || "#ffffff"}}>
              <div className="h-64 w-full flex items-center justify-center" style={{backgroundColor: ws.mal_card_bg || "#ffffff"}}>
                <img src={ws.mal_card1_img || "/svanen-new.png"} alt="Svanenmärkt" className="h-56 w-auto object-contain"/>
              </div>
              <div className="p-8">
                <h3 className="font-display font-semibold text-xl mb-2" style={{color: ws.mal_card_title_color || "#141414"}}>
                  {ws.mal_card1_title || "Miljövänliga val är viktiga för oss"}
                </h3>
                <p className="text-[15px] leading-relaxed" style={{color: ws.mal_card_text_color || "#475569"}}>
                  {ws.mal_card1_text || "Vi använder Svanenmärkta, miljöcertifierade Pur-Eco produkter för att skydda både din hälsa och vår natur."}
                </p>
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden border border-slate-100 flex flex-col" style={{backgroundColor: ws.mal_card_bg || "#ffffff"}}>
              <img src={ws.mal_card2_img || "https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&w=900"} alt="Trygg arbetsplats" className="h-64 w-full object-cover"/>
              <div className="p-8">
                <h3 className="font-display font-semibold text-xl mb-2" style={{color: ws.mal_card_title_color || "#141414"}}>
                  {ws.mal_card2_title || "En trygg arbetsplats"}
                </h3>
                <p className="text-[15px] leading-relaxed" style={{color: ws.mal_card_text_color || "#475569"}}>
                  {ws.mal_card2_text || "Vi har kollektivavtal för en trygg arbetsplats och goda villkor för vår personal."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-20">
            <div className="rounded-3xl border border-slate-200 p-8 flex items-start gap-4" style={{backgroundColor: ws.mal_check_card_bg || "#ffffff"}}>
              {ws.mal_check1_icon !== "none" && <span className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{backgroundColor: ws.mal_check_icon_bg || "#141414", color: ws.mal_check_icon_color || "#ffffff"}}>
                <MalIcon name={ws.mal_check1_icon || "Check"} size={18}/>
              </span>}
              <div>
                <h3 className="font-display font-semibold text-xl mb-2" style={{color: ws.mal_check_title_color || "#141414"}}>
                  {ws.mal_check1_title || "Hög kvalité"}
                </h3>
                <p className="text-[15px] leading-relaxed" style={{color: ws.mal_check_text_color || "#475569"}}>
                  {ws.mal_check1_text || "Vi levererar hög kvalité genom kvalitetssäkring på utfört arbete. Är du inte nöjd har vi 14 dagars garanti."}
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 p-8 flex items-start gap-4" style={{backgroundColor: ws.mal_check_card_bg || "#ffffff"}}>
              {ws.mal_check2_icon !== "none" && <span className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{backgroundColor: ws.mal_check_icon_bg || "#141414", color: ws.mal_check_icon_color || "#ffffff"}}>
                <MalIcon name={ws.mal_check2_icon || "Clock"} size={18}/>
              </span>}
              <div>
                <h3 className="font-display font-semibold text-xl mb-2" style={{color: ws.mal_check_title_color || "#141414"}}>
                  {ws.mal_check2_title || "Klart inom 24 timmar"}
                </h3>
                <p className="text-[15px] leading-relaxed" style={{color: ws.mal_check_text_color || "#475569"}}>
                  {ws.mal_check2_text || "Vi arbetar så effektivt som möjligt för att erbjuda en arbetstid på mindre än 24 timmar."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-9 sm:p-11" style={{backgroundColor: ws.mal_sry_bg || "#141414"}}>
            {ws.mal_sry_icon !== "none" && <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-6"
              style={{backgroundColor: ws.mal_sry_icon_bg ? ws.mal_sry_icon_bg+"1a" : "rgba(255,255,255,0.1)", color: ws.mal_sry_icon_color || "#ffffff"}}>
              <MalIcon name={ws.mal_sry_icon || "Award"} size={24}/>
            </div>}
            <h2 className="font-display font-bold text-3xl mb-4" style={{color: ws.mal_sry_title_color || "#ffffff"}}>
              {ws.mal_sry_title || "SRY-kvalifikation"}
            </h2>
            <p className="text-lg leading-relaxed" style={{color: ws.mal_sry_text_color ? ws.mal_sry_text_color+"bf" : "rgba(255,255,255,0.75)"}}>
              {ws.mal_sry_text1 || "Med kvalifikation från Servicebranschens Yrkesnämnd (SRY) levererar PureNorth Städ hög standard och bra kvalité på alla våra städtjänster."}
            </p>
            {(ws.mal_sry_text2 || true) && <p className="text-lg leading-relaxed mt-4" style={{color: ws.mal_sry_text_color ? ws.mal_sry_text_color+"bf" : "rgba(255,255,255,0.75)"}}>
              {ws.mal_sry_text2 || "Vi har även handledarintyg från Skolverket och utbildar åt andra företag samt vår egen personal."}
            </p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
