import React, { useState, useEffect } from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const DEFAULT_LINKS = [
  { label: "Tjänster", href: "/#tjanster" },
  { label: "Om oss", href: "/om-oss" },
  { label: "Vårt arbete", href: "/#vart-arbete" },
  { label: "Kontakt", href: "/#kontakt" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ws = useWebsite();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const baseLinks = ws.nav_links?.length > 0 ? ws.nav_links : DEFAULT_LINKS;
  const links = ws.show_about_in_navbar === false 
    ? baseLinks.filter(l => l.href !== "/om-oss")
    : baseLinks;
  const companyName = ws.company_name || ws.nav_company || "PureNorth Städ";
  const bokaText = ws.nav_boka_text || "Boka tid";

  return (
    <header data-testid="navbar"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-xl border-b border-slate-100" : "bg-transparent"}`}
      style={{backgroundColor: scrolled ? (ws.navbar_bg ? ws.navbar_bg+"cc" : "rgba(255,255,255,0.8)") : "transparent"}}>
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-3" onClick={()=>window.location.href="/"}>
          <Logo className="h-10 w-10" />
          {ws.show_navbar_company !== false && (
            <span className="font-display font-bold text-xl tracking-tight" style={{color: ws.navbar_company_color || "#0f172a"}}>
              {companyName}
            </span>
          )}
        </Link>
        <div className="hidden md:flex items-center gap-7">
          {ws.show_navbar_links !== false && links.map((l, i) => (
            <a key={i} href={l.href}
              data-testid={`nav-link-${l.href?.replace("/#", "")}`}
              className="text-[15px] font-medium transition-colors hover:opacity-80"
              style={{color: ws.navbar_link_color || "#475569"}}>
              {l.label}
            </a>
          ))}
          {ws.show_navbar_btn !== false && (
            <a href="/#boka" data-testid="nav-boka-btn"
              className="rounded-full px-6 py-3 text-[15px] font-semibold transition-colors"
              style={{backgroundColor: ws.navbar_btn_bg || "#141414", color: ws.navbar_btn_color || "#ffffff"}}>
              {bokaText}
            </a>
          )}
        </div>
        <button className="md:hidden text-slate-800" onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle" aria-label="Meny">
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>
      {open && (
        <div className="md:hidden border-t border-slate-100 px-5 py-4 space-y-3"
          style={{backgroundColor: ws.navbar_bg || "#ffffff"}}>
          {ws.show_navbar_links !== false && links.map((l, i) => (
            <a key={i} href={l.href} onClick={() => setOpen(false)}
              className="block py-2 font-medium"
              style={{color: ws.navbar_link_color || "#374151"}}>
              {l.label}
            </a>
          ))}
          {ws.show_navbar_btn !== false && (
            <a href="/#boka" onClick={() => setOpen(false)}
              className="block text-center rounded-full px-6 py-3 font-semibold"
              style={{backgroundColor: ws.navbar_btn_bg || "#141414", color: ws.navbar_btn_color || "#ffffff"}}>
              {bokaText}
            </a>
          )}
        </div>
      )}
    </header>
  );
};
