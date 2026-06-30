import React, { createContext, useContext, useEffect, useState } from "react";
const WebsiteContext = createContext({});
export const useWebsite = () => useContext(WebsiteContext);

const DEFAULTS = {
  hero_badge: "Svanenmärkt & miljöcertifierat",
  hero_title: "Renhet med norrländsk precision i Umeå.",
  hero_subtitle: "Vi definierar premiumstädning genom certifierad expertis och hållbara metoder.",
  cta_text: "Boka tid online",
  phone: "070-624 04 03",
  company_name: "PureNorth Städ",
  opening_hours: "Mån–Fre: 08:00–18:00",
};

export const WebsiteProvider = ({ children }) => {
  const [ws, setWs] = useState(DEFAULTS);
  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    fetch(`${base}/api/settings/website`)
      .then(r => r.json())
      .then(d => setWs({...DEFAULTS, ...d}))
      .catch(() => {});
  }, []);
  return (
    <WebsiteContext.Provider value={ws}>
      {children}
    </WebsiteContext.Provider>
  );
};
