import React, { useState } from "react";
import { motion } from "framer-motion";
import { MoveHorizontal } from "lucide-react";

const BeforeAfterSlider = ({ before, after, alt, testid }) => {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden select-none border border-white/10">
      {/* After (clean, full color) */}
      <img src={after} alt={`${alt} efter`} draggable="false" className="absolute inset-0 w-full h-full object-cover" />
      {/* Before (messy) clipped from left */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={`${alt} före`} draggable="false" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <span className="absolute top-3 left-3 text-xs font-semibold bg-[#141414] text-white px-3 py-1 rounded-full">Före</span>
      <span className="absolute top-3 right-3 text-xs font-semibold bg-[#166534] text-white px-3 py-1 rounded-full">Efter</span>
      {/* Divider + handle */}
      <div className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center text-[#141414]">
          <MoveHorizontal size={18} />
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        data-testid={testid}
        aria-label={`${alt} före och efter`}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  );
};

export const BeforeAfter = () => (
  <section id="vart-arbete" className="py-24 sm:py-32 bg-[#141414] text-white">
    <div className="max-w-7xl mx-auto px-5 sm:px-8">
      <div className="max-w-2xl mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#4ade80] mb-3">
          Vårt arbete
        </p>
        <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
          Före & efter
        </h2>
        <p className="mt-4 text-lg text-white/70">
          Dra i reglaget för att se skillnaden. Resultat som talar för sig själva.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-7">
        {[
          {
            before: "https://images.pexels.com/photos/4046082/pexels-photo-4046082.jpeg?auto=compress&cs=tinysrgb&w=1000",
            after: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000",
            alt: "Rum",
            testid: "before-after-1",
          },
          {
            before: "https://images.pexels.com/photos/6248900/pexels-photo-6248900.jpeg?auto=compress&cs=tinysrgb&w=1000",
            after: "https://images.pexels.com/photos/19836790/pexels-photo-19836790/free-photo-of-view-of-a-kitchen-with-white-cabinets-and-a-silver-sink.jpeg?auto=compress&cs=tinysrgb&w=1000",
            alt: "Kök",
            testid: "before-after-2",
          },
        ].map((s, i) => (
          <motion.div
            key={s.testid}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <BeforeAfterSlider {...s} />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
