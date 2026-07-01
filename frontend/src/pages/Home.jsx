import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useWebsiteReady } from "@/context/WebsiteContext";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { BeforeAfter } from "@/components/BeforeAfter";
import { WhyUs } from "@/components/WhyUs";
import { Testimonials } from "@/components/Testimonials";
import { BookingForm } from "@/components/BookingForm";
import { Contact, Footer } from "@/components/Contact";

export default function Home() {
  const ready = useWebsiteReady();
  if (!ready) return <div className="min-h-screen bg-white"><div className="h-1 bg-[#166534] animate-pulse w-1/3"/></div>;
  const [ws, setWs] = React.useState({});
  React.useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    fetch(`${base}/api/settings/website`)
      .then(r => r.json())
      .then(d => setWs(d))
      .catch(() => {});
  }, []);
  const [seo, setSeo] = useState({
    seo_title: "PureNorth Städ – Professionell städning i Umeå",
    seo_description: "Vi erbjuder professionell hemstädning, flyttstädning och kontorsstädning i Umeå. SRY-utbildad personal och miljövänliga produkter.",
    seo_keywords: "städning Umeå, hemstädning, flyttstädning, SRY",
    seo_og_image: "",
  });

  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    fetch(`${base}/api/settings/website`)
      .then(r => r.json())
      .then(d => {
        if (d.seo_title) setSeo(prev => ({ ...prev, ...d }));
        // Update document head
        if (d.seo_title) document.title = d.seo_title;
        const setMeta = (name, content) => {
          let el = document.querySelector(`meta[name="${name}"]`);
          if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
          el.content = content;
        };
        const setOg = (prop, content) => {
          let el = document.querySelector(`meta[property="${prop}"]`);
          if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
          el.content = content;
        };
        if (d.seo_description) setMeta("description", d.seo_description);
        if (d.seo_keywords) setMeta("keywords", d.seo_keywords);
        if (d.seo_title) setOg("og:title", d.seo_title);
        if (d.seo_description) setOg("og:description", d.seo_description);
        if (d.seo_og_image) setOg("og:image", d.seo_og_image);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-white">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <BeforeAfter />
        <WhyUs />
        <Testimonials />
        <BookingForm />
        <Contact ws={ws} />
      </main>
      <Footer ws={ws} />
    </div>
  );
}
