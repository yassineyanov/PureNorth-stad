import React from "react";
import { Phone, MapPin, Mail, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Contact = () => (
  <section id="kontakt" className="py-24 sm:py-28 bg-[#F7FAF8]">
    <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#166534] mb-3">
          Kontakt
        </p>
        <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-slate-900">
          Vi finns i Umeå
        </h2>
        <p className="mt-5 text-lg text-slate-600 max-w-lg">
          Har du frågor eller vill boka en städning? Hör av dig så hjälper vi dig.
        </p>

        <div className="mt-9 space-y-4">
          <a href="tel:0706240403" data-testid="contact-phone" className="flex items-center gap-4 group">
            <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534] group-hover:bg-[#166534] group-hover:text-white transition-colors">
              <Phone size={20} />
            </span>
            <div>
              <span className="block text-xs text-slate-500">Telefon</span>
              <span className="block font-semibold text-slate-900">070-624 04 03</span>
            </div>
          </a>
          <div className="flex items-center gap-4">
            <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534]">
              <MapPin size={20} />
            </span>
            <div>
              <span className="block text-xs text-slate-500">Ort</span>
              <span className="block font-semibold text-slate-900">Umeå, Sverige</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534]">
              <Clock size={20} />
            </span>
            <div>
              <span className="block text-xs text-slate-500">Öppettider</span>
              <span className="block font-semibold text-slate-900">Mån–Fre 08:00–17:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-[#166534] text-white p-10 sm:p-12 relative overflow-hidden">
        <Logo className="h-14 w-14 mb-6 !bg-white" />
        <h3 className="font-display font-bold text-3xl mb-3">PureNorth Städ</h3>
        <p className="text-white/85 leading-relaxed max-w-md">
          Miljövänlig städning med SRY-utbildad personal och Svanenmärkta Pur-Eco
          produkter. För ett renare hem och en renare natur.
        </p>
        <a
          href="#boka"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-white text-[#166534] px-8 py-4 font-semibold hover:bg-white/90 transition-colors"
        >
          Boka tid nu
        </a>
        <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-white/5" />
      </div>
    </div>
  </section>
);

export const Footer = () => (
  <footer className="bg-white border-t border-slate-100 py-12">
    <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <Logo className="h-9 w-9" />
        <span className="font-display font-bold text-lg text-slate-900">
          PureNorth <span className="text-[#166534]">Städ</span>
        </span>
      </div>
      <p className="text-sm text-slate-500">
        © {new Date().getFullYear()} PureNorth Städ · Umeå · 070-624 04 03
      </p>
      <a href="/admin" data-testid="footer-admin-link" className="text-sm text-slate-400 hover:text-[#166534] transition-colors">
        Admin
      </a>
    </div>
  </footer>
);
