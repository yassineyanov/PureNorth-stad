import React from "react";
import { LegalLayout, LegalSection, Bullets } from "@/components/LegalLayout";
import { useWebsite } from "@/context/WebsiteContext";

const DEFAULT_SECTIONS = [
  { heading: "Bokningsvillkor", items: [
    "Bokningen behöver ske via mail, där alla överenskommelser och priser finns dokumenterat för er och vår trygghet.",
    "Vi behöver ett fullständigt personnummer för RUT-ansökan samt för en mindre anmärkningskontroll enligt våra bokningsvillkor.",
    "Om Skatteverket av någon anledning skulle ge avslag på RUT-ansökan fakturerar vi er resterande belopp.",
    "Vår städgaranti innebär att ni inom 14 dagar efter utförd tjänst ska kontakta oss, så återkommer vi snarast möjligt för åtgärd.",
    "Vi förbehåller oss rätten att avsäga oss en städning ifall vi anser att bostaden är onormalt nedsmutsad.",
  ]},
  { heading: "Betalningsvillkor", items: [
    "Fakturering och betalning hanteras endast elektroniskt.",
    "Fakturan skickas från kundtjanst@purenorthstad.se efter slutförd städning.",
    "Betalningsvillkor är 10 dagar, efter denna period tillkommer en påminnelseavgift om 60 kr.",
  ]},
  { heading: "Avbokningsvillkor", items: [
    "Avbokning sker kostnadsfritt fram till och med två veckor innan avtalad städdag.",
    "Vid avbeställning därefter, men tidigare än 8 dagar före avtalad städdag, erläggs 25% av det avtalade priset.",
    "Vid avbeställning därefter, men tidigare än 3 dagar före avtalad städdag, erläggs 50% av det avtalade priset.",
    "Sker avbeställningen inom 3 dagar före avtalad städdag, erläggs full kostnad av det avtalade priset.",
  ]},
];

export default function Kundavtal() {
  const ws = useWebsite();
  const sections = (ws.kundavtal_sections && ws.kundavtal_sections.length > 0) ? ws.kundavtal_sections : DEFAULT_SECTIONS;

  return (
    <LegalLayout
      eyebrow={ws.kundavtal_eyebrow || "Kundavtal"}
      title={ws.kundavtal_title || "Bokningsvillkor"}
      intro={ws.kundavtal_intro || "Här hittar du våra boknings-, betalnings- och avbokningsvillkor."}
      bg={ws.kundavtal_bg}
      eyebrowColor={ws.kundavtal_eyebrow_color}
      titleColor={ws.kundavtal_title_color}
      introColor={ws.kundavtal_intro_color}
    >
      {sections.map((sec, i) => (
        <LegalSection key={i} heading={sec.heading} headingColor={ws.kundavtal_heading_color} textColor={ws.kundavtal_text_color}>
          <Bullets items={sec.items||[]} textColor={ws.kundavtal_text_color} bulletColor={ws.kundavtal_bullet_color}/>
        </LegalSection>
      ))}
      <LegalSection textColor={ws.kundavtal_footer_color || ws.kundavtal_text_color}>
        <p>{ws.kundavtal_footer_text || "Har du fler frågor så är du välkommen att kontakta vår kundtjänst på"}{" "}
          <a href={`mailto:${ws.kundavtal_footer_email || "kundtjanst@purenorthstad.se"}`} className="font-semibold underline" style={{color: ws.kundavtal_footer_link_color || "#141414"}}>
            {ws.kundavtal_footer_email || "kundtjanst@purenorthstad.se"}
          </a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
