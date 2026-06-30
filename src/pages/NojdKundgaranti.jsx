import React from "react";
import { Check } from "lucide-react";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const guarantees = [
  "92% av kunder ger oss topp betyg",
  "Vi följer mäklarsamfundets rekommendationer",
  "Klart inom 24 timmar",
];

const steps = [
  "Kontakta oss snarast möjligt via telefon eller e-post om du är missnöjd.",
  "Vi tar fram en lösning och åtgärdar problemet så snabbt som möjligt.",
  "Reklamera tjänsten inom tre arbetsdagar efter servicetillfället.",
];

export default function NojdKundgaranti() {
  return (
    <LegalLayout
      eyebrow="Nöjd kundgaranti"
      title="Nöjd kundgaranti för din trygghet"
      intro="Vår garanti gäller för dig som tagit del av någon av våra tjänster och inte känner dig helt nöjd, eller om något i din ägo råkat gå sönder vid städningen."
    >
      <div className="grid sm:grid-cols-3 gap-4">
        {guarantees.map((g, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 p-5 flex items-start gap-3">
            <span className="h-7 w-7 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0">
              <Check size={15} />
            </span>
            <span className="text-[15px] font-medium text-slate-800">{g}</span>
          </div>
        ))}
      </div>

      <LegalSection heading="Vad är Nöjd Kundgaranti?">
        <p>
          Nöjd kundgaranti innebär kortfattat en kvalitetsgaranti. Eftersom städning
          oftast är något som måste kontrolleras och godkännas av olika parter så
          erbjuder vi 14 dagars garanti på alla våra utförda tjänster. Om du inte är
          nöjd med vår service så åtgärdar vi det snabbt, utan krångel.
        </p>
      </LegalSection>

      <LegalSection heading="Så går det till">
        <p>
          För att vi ska kunna ge dig så bra service som möjligt är kommunikation
          viktig. Har vi gjort fel eller har något oförutsägbart hänt så kan du enkelt
          kontakta oss för att få det du inte är nöjd med åtgärdat så snabbt som möjligt.
        </p>
      </LegalSection>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-4 rounded-2xl bg-[#FAFAFA] border border-slate-100 p-5">
            <span className="h-9 w-9 rounded-full bg-[#141414] text-white font-display font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <p className="text-[15px] text-slate-700 leading-relaxed pt-1">{s}</p>
          </div>
        ))}
      </div>
    </LegalLayout>
  );
}
