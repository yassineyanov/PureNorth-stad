import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Hur gör jag en bokning?",
    a: "Om du är intresserad av att göra en bokning hos oss börjar du med att gå in på vårt bokningsformulär och fyller i det. Vi kontaktar dig sedan via mejl med svar på din förfrågan. Du kan även ringa oss på vårt växelnummer 0706240403 eller skicka ett mejl till kundtjanst@purenorthstad.se.",
  },
  {
    q: "Hur kontaktar jag er?",
    a: "Du kan kontakta oss via telefon eller mejl. Telefon: 0706240403. Mejl: kundtjanst@purenorthstad.se.",
  },
  {
    q: "Har ni städgaranti?",
    a: "Vi lämnar 14 dagars städgaranti, det finns att läsa mer om det i vårt kundavtal.",
  },
  {
    q: "Vad gör jag om jag inte är nöjd?",
    a: "Om vi har missat något medan vi städat hos dig kan du alltid ta kontakt med oss inom 14 dagar från städdagen. Skicka gärna bilder och förklara vad som missats till kundtjanst@purenorthstad.se så återkommer vi om åtgärder. Läs mer om städgarantin i vårt kundavtal.",
  },
  {
    q: "Skickar ni pappersfaktura?",
    a: "Vi skickar som standard fakturan till kundens e-post efter att arbetet är utfört. Vill man hellre ha en pappersfaktura går det att ordna om man meddelar oss detta.",
  },
  {
    q: "Behöver jag ha något städmaterial hemma?",
    a: "Nej, vi tar med oss allt vi behöver.",
  },
  {
    q: "Drar ni fram kyl och frys när ni flyttstädar?",
    a: "Nej, vi drar inte fram kyl och frys då det alltid finns risk att skada golvet, men drar kunden fram dem själv så städar vi självklart utrymmet bakom.",
  },
  {
    q: "Städar ni även kontor och andra arbetsplatser?",
    a: "Absolut, vi gör alla typer av städning.",
  },
  {
    q: "Vad har ni för avbokningsregler?",
    a: "Du kan avboka kostnadsfritt fram till två veckor innan avtalat datum. Därefter betalar kunden enligt följande: 9 dagar före städdagen 25% av priset, 4 dagar före städdagen 50% av priset och avbokningar som sker inom 3 dagar av städdagen debiteras fullt pris.",
  },
  {
    q: "Måste jag själv göra något för att få RUT-avdrag?",
    a: "Nej, vi sköter allt administrativt för RUT-avdraget. Du får ett brev från Skatteverket om att vi ansökt om RUT-avdrag åt er.",
  },
  {
    q: "Vad händer om något går sönder?",
    a: "PureNorth Städ har ansvarsförsäkring som täcker eventuella skador som orsakas av vår personal.",
  },
  {
    q: "Hur lång tid tar det att städa?",
    a: "Tiden varierar med varje städobjekt och beroende på städtjänst, då det finns många olika aspekter att ta hänsyn till.",
  },
  {
    q: "Vad behöver jag förbereda inför en städning?",
    a: "Vi skickar alltid ut information till alla våra kunder inför en städning, där kan du läsa vad du kan behöva göra.",
  },
];

export default function FAQ() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-[#141414] mb-3">
              Vanliga frågor & svar
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-[#141414]">
              Vi har svaren
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Hittar du inte svaret du söker? Ring oss på 070-624 04 03 eller mejla
              kundtjanst@purenorthstad.se.
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="w-full" data-testid="faq-accordion">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left font-display font-semibold text-lg text-[#141414] hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] text-slate-600 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-14 rounded-3xl bg-[#141414] text-white p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="font-display font-bold text-2xl mb-1">Fortfarande frågor?</h3>
              <p className="text-white/70">Vi hjälper dig gärna med din städning.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="tel:0706240403" className="inline-flex items-center gap-2 rounded-full bg-white text-[#141414] px-6 py-3 font-semibold hover:bg-white/90 transition-colors">
                <Phone size={17} /> Ring oss
              </a>
              <a href="mailto:kundtjanst@purenorthstad.se" className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors">
                <Mail size={17} /> Mejla oss
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
