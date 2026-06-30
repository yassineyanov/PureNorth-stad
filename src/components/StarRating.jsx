import React from "react";
import { Star, StarHalf } from "lucide-react";

const GOLD = "#D4AF37";

// Renders 5 stars with support for half values (e.g. 4.5)
export const StarRating = ({ value = 5, size = 16, className = "" }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (value >= i) {
      stars.push(<Star key={i} size={size} className="fill-[#D4AF37] text-[#D4AF37]" />);
    } else if (value >= i - 0.5) {
      stars.push(
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="absolute inset-0 text-slate-300" />
          <StarHalf size={size} className="absolute inset-0 fill-[#D4AF37] text-[#D4AF37]" />
        </span>
      );
    } else {
      stars.push(<Star key={i} size={size} className="text-slate-300" />);
    }
  }
  return <div className={`flex gap-1 ${className}`}>{stars}</div>;
};

export { GOLD };
