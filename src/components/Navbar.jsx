import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const links = [
  { label: "Tjänster", href: "#tjanster" },
  { label: "Varför oss", href: "#varfor-oss" },
  { label: "Kontakt", href: "#kontakt" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-testid="navbar"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-100" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
        <a href="#hem" data-testid="nav-logo" className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="font-display font-bold text-xl tracking-tight text-slate-900">
            PureNorth <span className="text-[#141414]">Städ</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-testid={`nav-link-${l.href.replace("#", "")}`}
              className="text-[15px] font-medium text-slate-600 hover:text-[#141414] transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#boka"
            data-testid="nav-boka-btn"
            className="rounded-full bg-[#141414] hover:bg-[#000000] text-white px-6 py-3 text-[15px] font-semibold transition-colors"
          >
            Boka tid
          </a>
        </div>

        <button
          className="md:hidden text-slate-800"
          onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle"
          aria-label="Meny"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-5 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-slate-700 font-medium"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#boka"
            onClick={() => setOpen(false)}
            className="block text-center rounded-full bg-[#141414] text-white px-6 py-3 font-semibold"
          >
            Boka tid
          </a>
        </div>
      )}
    </header>
  );
};
