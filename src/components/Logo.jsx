import React from "react";

// Uses the user's provided logo asset (leaf + water drop). Tinted to brand green via CSS mask.
export const Logo = ({ className = "h-10 w-10" }) => (
  <span
    className={`inline-block bg-[#166534] ${className}`}
    style={{
      WebkitMaskImage: "url(/purenorth-logo.png)",
      maskImage: "url(/purenorth-logo.png)",
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
