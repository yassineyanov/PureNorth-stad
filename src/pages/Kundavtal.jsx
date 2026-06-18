import React from "react";
import { LegalLayout, LegalSection, Bullets } from "@/components/LegalLayout";

export default function Kundavtal() {
  return (
    <LegalLayout
      eyebrow="Kundavtal"
      title="Bokningsvillkor"
      intro="Här hittar du våra boknings-, betalnings- och avbokningsvillkor."
    >
      <LegalSection heading="Bokningsvillkor">
        <Bullets
          items={[
            "Bokningen behöver ske via mail, där alla överenskommelser och priser finns dokumenterat för er och vår trygghet.",
            "Vi behöver ett fullständigt personnummer för RUT-ansökan samt för en mindre anmärkningskontroll enligt våra bokningsvillkor.",
            "Om Skatteverket av någon anledning skulle ge avslag på RUT-ansökan fakturerar vi er resterande belopp.",
            "Vid dödsbo är RUT-avdrag ej möjligt. Du som beställare behöver då uppge ditt fullständiga namn och personnummer för en mindre anmärkningskontroll enligt våra bokningsvillkor. Om dödsboet skall stå för betalningen så behöver vi dennes namn som vi kan märka fakturan med. Om inte dödsboet har betalningsförmåga faller ansvaret för betalningen på beställaren.",
            "Vår städgaranti innebär att ni inom 14 dagar efter utförd tjänst ska kontakta oss, så återkommer vi snarast möjligt för åtgärd. Observera att vi måste få tillgång till bostaden för möjlighet till åtgärd. Vi betalar inte ut någon ersättning eller kompensation om ni på eget bevåg åtgärdar dessa brister.",
            "Vi förbehåller oss rätten att avsäga oss en städning ifall vi anser att bostaden är onormalt nedsmutsad, dock ger vi dig möjligheten till timdebitering eller nytt fast pris baserat på bostadens befintliga skick. OBS! Detta är mycket ovanligt, men det händer ibland att vi kommer till bostäder som snarare behöver en sanering.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Betalningsvillkor">
        <Bullets
          items={[
            "Fakturering och betalning hanteras endast elektroniskt.",
            "Fakturan skickas från kundtjanst@purenorthstad.se efter slutförd städning till den e-postadress ni uppger vid bokning.",
            "Betalningsvillkor är 10 dagar, efter denna period tillkommer en påminnelseavgift om 60 kr.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Avbokningsvillkor">
        <Bullets
          items={[
            "Avbokning sker kostnadsfritt fram till och med två veckor innan avtalad städdag.",
            "Vid avbeställning därefter, men tidigare än 8 dagar före avtalad städdag, erläggs 25% av det avtalade priset.",
            "Vid avbeställning därefter, men tidigare än 3 dagar före avtalad städdag, erläggs 50% av det avtalade priset.",
            "Sker avbeställningen inom 3 dagar före avtalad städdag, erläggs full kostnad av det avtalade priset.",
          ]}
        />
      </LegalSection>

      <LegalSection>
        <p>
          Har du fler frågor så är du välkommen att kontakta vår kundtjänst på{" "}
          <a href="mailto:kundtjanst@purenorthstad.se" className="text-[#141414] font-semibold underline">
            kundtjanst@purenorthstad.se
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
