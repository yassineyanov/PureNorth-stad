import React, { createContext, useContext, useEffect, useState } from "react";
const WebsiteContext = createContext({});
const WebsiteReadyContext = createContext(false);
export const useWebsite = () => useContext(WebsiteContext);
export const useWebsiteReady = () => useContext(WebsiteReadyContext);

const DEFAULTS = {
  hero_badge: "Svanenmärkt & miljöcertifierat",
  hero_title: "Renhet med norrländsk precision i Umeå.",
  hero_subtitle: "Vi definierar premiumstädning genom certifierad expertis och hållbara metoder.",
  cta_text: "Boka tid online",
  badge1: "SRY-kvalifikation",
  badge2: "Pur-Eco produkter",
  phone: "070-624 04 03",
  company_name: "PureNorth Städ",
  opening_hours: "Mån–Fre: 08:00–18:00",
  contact_title: "Kontakt",
  contact_subtitle: "Vi finns i Umeå",
  contact_description: "Har du frågor eller vill boka en städning? Hör av dig så hjälper vi dig.",
  contact_box_title: "Redo att boka?",
  contact_box_text: "Vi erbjuder professionell städning anpassad efter dina behov. Kontakta oss idag!",
  contact_box_btn: "Boka tid",
  about_title: "Städning med hjärta & precision",
  about_stat1_number: "100+",
  about_stat1_label: "Nöjda kunder",
  about_stat2_number: "5",
  about_stat2_label: "Betyg",
  about_stat3_number: "3 år",
  about_stat3_label: "Erfarenhet",
  about_point1: "SRY-certifierad personal",
  about_point2: "Svanenmärkta Pur-Eco produkter",
  about_point3: "50% RUT-avdrag på arbetskostnaden",
  hero_badge_icon: "Leaf",
  hero_badge_image: "",
  badge1_icon: "ShieldCheck",
  badge1_image: "",
  badge2_icon: "Leaf",
  badge2_image: "",
};

export const WebsiteProvider = ({ children }) => {
  const [ws, setWs] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    fetch(`${base}/api/settings/website`)
      .then(r => r.json())
      .then(d => { setWs(prev => ({...prev, ...Object.fromEntries(Object.entries(d).filter(([,v]) => v !== "" && v !== null))})); setReady(true); })
      .catch(() => setReady(true));
  }, []);
  return (
    <WebsiteReadyContext.Provider value={ready}>
      <WebsiteContext.Provider value={ws}>
        {children}
      </WebsiteContext.Provider>
    </WebsiteReadyContext.Provider>
  );
};
