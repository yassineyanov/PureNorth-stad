import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";

export const LegalLayout = ({ eyebrow, title, intro, children, bg, eyebrowColor, titleColor, introColor }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen" style={{backgroundColor: bg || "#ffffff"}}>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: eyebrowColor || "#141414"}}>{eyebrow}</p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight" style={{color: titleColor || "#141414"}}>{title}</h1>
            {intro && <p className="mt-4 text-lg leading-relaxed" style={{color: introColor || "#475569"}}>{intro}</p>}
          </motion.div>
          <div className="space-y-10">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const LegalSection = ({ heading, children, headingColor, textColor }) => (
  <section>
    {heading && <h2 className="font-display font-semibold text-2xl mb-4" style={{color: headingColor || "#141414"}}>{heading}</h2>}
    <div className="space-y-3 text-[15px] leading-relaxed" style={{color: textColor || "#475569"}}>{children}</div>
  </section>
);

export const Bullets = ({ items, textColor, bulletColor }) => (
  <ul className="space-y-3 text-[15px] leading-relaxed list-disc pl-5" style={{color: textColor || "#475569", "--tw-prose-bullets": bulletColor || "#141414"}}>
    {items.map((t, i) => (
      <li key={i} style={{markerColor: bulletColor || "#141414"}}>{t}</li>
    ))}
  </ul>
);
