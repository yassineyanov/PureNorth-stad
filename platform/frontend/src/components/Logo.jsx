import React from "react";
import { useWebsite } from "@/context/WebsiteContext";

export const Logo = ({ className = "h-10 w-10" }) => {
  const ws = useWebsite();
  const logoUrl = ws.logo_url || "/purenorth-logo.png";
  if (ws.show_logo === false) return null;
  return (
    <img
      src={logoUrl}
      alt="PureNorth Städ logotyp"
      className={`object-contain ${className}`}
    />
  );
};
