import React from "react";
import { useWebsite } from "@/context/WebsiteContext";

export const Logo = ({ className = "h-10 w-10" }) => {
  const ws = useWebsite();
  const logoUrl = ws.logo_url || "/purenorth-logo.png";
  if (ws.show_logo === false) return null;
  return (
    <span
      className={`inline-block bg-[#141414] ${className}`}
      style={{
        WebkitMaskImage: `url(${logoUrl})`,
        maskImage: `url(${logoUrl})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-label="PureNorth Städ logotyp"
      role="img"
    />
  );
};
