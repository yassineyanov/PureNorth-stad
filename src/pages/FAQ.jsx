import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";
import { useWebsite } from "@/context/WebsiteContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const DEFAULT_FAQS = [
  { q: "Hur gör jag en bokning?", a: "Om du är intresserad av att göra en bokning hos oss börjar du med att gå in på vårt bokningsformulär och fyller i det. Vi kontaktar dig sedan via mejl med svar på din förfrågan. Du kan även ringa oss på vårt växelnummer 0706240403 eller skicka ett mejl till kundtjanst@purenorthstad.se." },
  { q: "Hur kontaktar jag er?", a: "Du kan kontakta oss via telefon eller mejl. Telefon: 0706240403. Mejl: kundtjanst@purenorthstad.se." },
  { q: "Har ni städgaranti?", a: "Vi lämnar 14 dagars städgaranti, det finns att läsa mer om det i vårt kundavtal." },
  { q: "Vad gör jag om jag inte är nöjd?", a: "Om vi har missat något medan vi städat hos dig kan du alltid ta kontakt med oss inom 14 dagar från städdagen." },
  { q: "Skickar ni pappersfaktura?", a: "Vi skickar som standard fakturan till kundens e-post efter att arbetet är utfört." },
  { q: "Behöver jag ha något städmaterial hemma?", a: "Nej, vi tar med oss allt vi behöver." },
  { q: "Drar ni fram kyl och frys när ni flyttstädar?", a: "Nej, vi drar inte fram kyl och frys då det alltid finns risk att skada golvet." },
  { q: "Städar ni även kontor och andra arbetsplatser?", a: "Absolut, vi gör alla typer av städning." },
  { q: "Vad har ni för avbokningsregler?", a: "Du kan avboka kostnadsfritt fram till två veckor innan avtalat datum." },
  { q: "Måste jag själv göra något för att få RUT-avdrag?", a: "Nej, vi sköter allt administrativt för RUT-avdraget." },
  { q: "Vad händer om något går sönder?", a: "PureNorth Städ har ansvarsförsäkring som täcker eventuella skador som orsakas av vår personal." },
  { q: "Hur lång tid tar det att städa?", a: "Tiden varierar med varje städobjekt och beroende på städtjänst." },
  { q: "Vad behöver jag förbereda inför en städning?", a: "Vi skickar alltid ut information till alla våra kunder inför en städning." },
];

export default function FAQ() {
  const ws = useWebsite();
  const faqs = (ws.faq_items && ws.faq_items.length > 0) ? ws.faq_items : DEFAULT_FAQS;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen" style={{backgroundColor: ws.faq_bg || "#ffffff"}}>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.faq_label_color || "#141414"}}>
              {ws.faq_label || "Vanliga frågor & svar"}
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight" style={{color: ws.faq_title_color || "#141414"}}>
              {ws.faq_title || "Vi har svaren"}
            </h1>
            <p className="mt-4 text-lg" style={{color: ws.faq_subtitle_color || "#475569"}}>
              {ws.faq_subtitle || "Hittar du inte svaret du söker? Ring oss på 070-624 04 03 eller mejla kundtjanst@purenorthstad.se."}
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="w-full" data-testid="faq-accordion">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left font-display font-semibold text-lg hover:no-underline" style={{color: ws.faq_question_color || "#141414"}}>
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed" style={{color: ws.faq_answer_color || "#475569"}}>
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {ws.show_faq_contact_box !== false && (
          <div className="mt-14 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            style={{backgroundColor: ws.faq_box_bg || "#141414"}}>
            <div>
              <h3 className="font-display font-bold text-2xl mb-1" style={{color: ws.faq_box_title_color || "#ffffff"}}>
                {ws.faq_box_title || "Fortfarande frågor?"}
              </h3>
              <p style={{color: ws.faq_box_text_color || "rgba(255,255,255,0.7)"}}>
                {ws.faq_box_text || "Vi hjälper dig gärna med din städning."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={`tel:${(ws.phone || "070-624 04 03").replace(/[^0-9]/g,"")}`} className="inline-flex items-center gap-2 rounded-full bg-white text-[#141414] px-6 py-3 font-semibold hover:bg-white/90 transition-colors">
                <Phone size={17} /> Ring oss
              </a>
              <a href={`mailto:${ws.email || "kundtjanst@purenorthstad.se"}`} className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors">
                <Mail size={17} /> Mejla oss
              </a>
            </div>
          </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
