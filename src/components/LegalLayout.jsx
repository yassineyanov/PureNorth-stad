import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Contact";

export const LegalLayout = ({ eyebrow, title, intro, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-[#141414] mb-3">
              {eyebrow}
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-[#141414]">
              {title}
            </h1>
            {intro && <p className="mt-4 text-lg text-slate-600 leading-relaxed">{intro}</p>}
          </motion.div>

          <div className="space-y-10">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const LegalSection = ({ heading, children }) => (
  <section>
    {heading && (
      <h2 className="font-display font-semibold text-2xl text-[#141414] mb-4">{heading}</h2>
    )}
    <div className="space-y-3 text-[15px] text-slate-600 leading-relaxed">{children}</div>
  </section>
);

export const Bullets = ({ items }) => (
  <ul className="space-y-3 text-[15px] text-slate-600 leading-relaxed list-disc pl-5 marker:text-[#141414]">
    {items.map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
);
