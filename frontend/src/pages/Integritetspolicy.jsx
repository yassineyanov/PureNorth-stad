import React from "react";
import { LegalLayout, LegalSection, Bullets } from "@/components/LegalLayout";
import { useWebsite } from "@/context/WebsiteContext";

const DEFAULT_SECTIONS = [
  { heading: "Behandling av personuppgifter", text: "", bullets: [
    "För att kunna erbjuda dig våra tjänster behöver vi behandla dina personuppgifter.",
    "Vi värnar om din personliga integritet och eftersträvar alltid en hög nivå av dataskydd.",
    "PureNorth Städ avser att behandla personuppgifter i enlighet med dataskyddsförordningen GDPR.",
  ]},
  { heading: "1. Allmänt", text: "Denna integritetspolicy beskriver hur PureNorth Städ samlar in och behandlar dina personuppgifter." },
  { heading: "2. Personuppgiftsansvarig", text: "Respektive bolag som du lämnat personuppgifter till är personuppgiftsansvarig för behandling av dina uppgifter." },
  { heading: "3. Insamling av information", text: "Vi samlar in information från dig när du besöker vår hemsida, bokar våra tjänster eller på annat sätt har kontakt med oss." },
  { heading: "4. Vilken information behandlar vi?", text: "", bullets: ["Namn och identifikationsnummer","Adress","Telefonnummer och e-post","Betalningsuppgifter","Uppgifter om dina beställningar"] },
  { heading: "5. Användning av information", text: "", bullets: ["Fullgöra våra förpliktelser gentemot dig som kund","Möjliggöra allmän kundvård och kundservice","Hantera kundförhållandet och tillhandahålla våra tjänster"] },
  { heading: "11. Dina rättigheter", text: "Du som är registrerad har rätt att kostnadsfritt erhålla ett registerutdrag över vilken information som finns registrerad om dig." },
  { heading: "14. Kontaktinformation", text: "Har du frågor kring denna policy kan du kontakta oss på kundtjanst@purenorthstad.se." },
];

export default function Integritetspolicy() {
  const ws = useWebsite();
  const sections = (ws.integritet_sections && ws.integritet_sections.length > 0) ? ws.integritet_sections : DEFAULT_SECTIONS;

  return (
    <LegalLayout
      eyebrow={ws.integritet_eyebrow || "GDPR – Integritetspolicy"}
      title={ws.integritet_title || "Integritetspolicy GDPR"}
      intro={ws.integritet_intro || "Vi på PureNorth Städ värnar om din personliga integritet och eftersträvar alltid en hög nivå av dataskydd."}
      bg={ws.integritet_bg}
      eyebrowColor={ws.integritet_eyebrow_color}
      titleColor={ws.integritet_title_color}
      introColor={ws.integritet_intro_color}
    >
      {sections.map((sec, i) => (
        <LegalSection key={i} heading={sec.heading} headingColor={ws.integritet_heading_color} textColor={ws.integritet_text_color}>
          {sec.text && <p>{sec.text}</p>}
          {sec.bullets && sec.bullets.length > 0 && (
            <Bullets items={sec.bullets} textColor={ws.integritet_text_color} bulletColor={ws.integritet_bullet_color}/>
          )}
        </LegalSection>
      ))}
    </LegalLayout>
  );
}
