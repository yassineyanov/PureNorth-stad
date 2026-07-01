import React, { createContext, useContext, useEffect, useState } from "react";
const WebsiteContext = createContext({});
export const useWebsite = () => useContext(WebsiteContext);

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
};

export const WebsiteProvider = ({ children }) => {
  const [ws, setWs] = useState(DEFAULTS);
  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    fetch(`${base}/api/settings/website`)
      .then(r => r.json())
      .then(d => setWs(prev => ({...prev, ...Object.fromEntries(Object.entries(d).filter(([,v]) => v !== "" && v !== null))})))
      .catch(() => {});
  }, []);
  return (
    <WebsiteContext.Provider value={ws}>
      {children}
    </WebsiteContext.Provider>
  );
};
