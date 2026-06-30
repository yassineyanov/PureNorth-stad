import React, { createContext, useContext, useEffect, useState } from "react";

const WebsiteContext = createContext({});

export const useWebsite = () => useContext(WebsiteContext);

export const WebsiteProvider = ({ children }) => {
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    fetch(`${base}/api/settings/website`)
      .then(r => r.json())
      .then(d => setWs(d))
      .catch(() => {});
  }, []);

  return (
    <WebsiteContext.Provider value={ws || {}}>
      {children}
    </WebsiteContext.Provider>
  );
};
