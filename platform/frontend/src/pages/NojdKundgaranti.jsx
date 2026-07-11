import React from "react";
import { Check } from "lucide-react";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";
import { useWebsite } from "@/context/WebsiteContext";

const DEFAULT_GUARANTEES = [
  "92% av kunder ger oss topp betyg",
  "Vi följer mäklarsamfundets rekommendationer",
  "Klart inom 24 timmar",
];

const DEFAULT_STEPS = [
  "Kontakta oss snarast möjligt via telefon eller e-post om du är missnöjd.",
  "Vi tar fram en lösning och åtgärdar problemet så snabbt som möjligt.",
  "Reklamera tjänsten inom tre arbetsdagar efter servicetillfället.",
];

export default function NojdKundgaranti() {
  const ws = useWebsite();
  const guarantees = (ws.nojd_guarantees && ws.nojd_guarantees.length > 0) ? ws.nojd_guarantees : DEFAULT_GUARANTEES;
  const steps = (ws.nojd_steps && ws.nojd_steps.length > 0) ? ws.nojd_steps : DEFAULT_STEPS;

  return (
    <LegalLayout
      eyebrow={ws.nojd_eyebrow || "Nöjd kundgaranti"}
      title={ws.nojd_title || "Nöjd kundgaranti för din trygghet"}
      intro={ws.nojd_intro || "Vår garanti gäller för dig som tagit del av någon av våra tjänster och inte känner dig helt nöjd."}
      bg={ws.nojd_bg}
      eyebrowColor={ws.nojd_eyebrow_color}
      titleColor={ws.nojd_title_color}
      introColor={ws.nojd_intro_color}
    >
      <div className="grid sm:grid-cols-3 gap-4">
        {guarantees.map((g, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 p-5 flex items-start gap-3"
            style={{backgroundColor: ws.nojd_card_bg || "#ffffff"}}>
            <span className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
              style={{backgroundColor: ws.nojd_card_icon_bg || "#141414", color: ws.nojd_card_icon_color || "#ffffff"}}>
              <Check size={15}/>
            </span>
            <span className="text-[15px] font-medium" style={{color: ws.nojd_card_text_color || "#1e293b"}}>{g}</span>
          </div>
        ))}
      </div>
      <LegalSection heading={ws.nojd_section1_heading || "Vad är Nöjd Kundgaranti?"} headingColor={ws.nojd_heading_color} textColor={ws.nojd_text_color}>
        <p>{ws.nojd_section1_text || "Nöjd kundgaranti innebär kortfattat en kvalitetsgaranti. Vi erbjuder 14 dagars garanti på alla våra utförda tjänster."}</p>
      </LegalSection>
      <LegalSection heading={ws.nojd_section2_heading || "Så går det till"} headingColor={ws.nojd_heading_color} textColor={ws.nojd_text_color}>
        <p>{ws.nojd_section2_text || "För att vi ska kunna ge dig så bra service som möjligt är kommunikation viktig."}</p>
      </LegalSection>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-100 p-5"
            style={{backgroundColor: ws.nojd_step_bg || "#fafafa"}}>
            <span className="h-9 w-9 rounded-full font-display font-bold flex items-center justify-center shrink-0"
              style={{backgroundColor: ws.nojd_step_num_bg || "#141414", color: ws.nojd_step_num_color || "#ffffff"}}>
              {i + 1}
            </span>
            <p className="text-[15px] leading-relaxed pt-1" style={{color: ws.nojd_step_text_color || "#334155"}}>{s}</p>
          </div>
        ))}
      </div>
    </LegalLayout>
  );
}
