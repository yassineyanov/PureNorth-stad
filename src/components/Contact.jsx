import React from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { Link } from "react-router-dom";
import { Phone, MapPin, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";

const DEFAULT = {
  contact_title: "Kontakt",
  contact_subtitle: "Vi finns i Umeå",
  contact_description: "Har du frågor eller vill boka en städning? Hör av dig så hjälper vi dig.",
  contact_box_title: "PureNorth Städ",
  contact_box_text: "Miljövänlig städning med SRY-utbildad personal och Svanenmärkta Pur-Eco produkter. För ett renare hem och en renare natur.",
  contact_box_btn: "Boka tid nu",
  phone: "070-624 04 03",
  address: "Umeå, Sverige",
  opening_hours: "Mån–Fre 08:00–17:00",
  company_name: "PureNorth Städ",
};

export const Contact = () => {
  const raw = useWebsite();
  const ws = { ...DEFAULT, ...raw };

  return (
    <section id="kontakt" className="py-24 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#141414] mb-3">
            {ws.contact_title || "Kontakt"}
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#141414]">
            {ws.contact_subtitle || "Vi finns i Umeå"}
          </h2>
          <p className="mt-5 text-lg text-slate-600 max-w-lg">
            {ws.contact_description || "Har du frågor eller vill boka en städning? Hör av dig så hjälper vi dig."}
          </p>

          <div className="mt-9 space-y-4">
            <a href={`tel:${ws.phone?.replace(/[^0-9+]/g,"")}`} data-testid="contact-phone" className="flex items-center gap-4 group">
              <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534] group-hover:bg-[#166534] group-hover:text-white transition-colors">
                <Phone size={20} />
              </span>
              <div>
                <span className="block text-xs text-slate-500">Telefon</span>
                <span className="block font-semibold text-slate-900">{ws.phone}</span>
              </div>
            </a>
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534]">
                <MapPin size={20} />
              </span>
              <div>
                <span className="block text-xs text-slate-500">Ort</span>
                <span className="block font-semibold text-slate-900">{ws.address || "Umeå, Sverige"}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534]">
                <Clock size={20} />
              </span>
              <div>
                <span className="block text-xs text-slate-500">Öppettider</span>
                <span className="block font-semibold text-slate-900">{ws.opening_hours}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#141414] text-white p-10 sm:p-12 relative overflow-hidden">
          <Logo className="h-14 w-14 mb-6 !bg-white" />
          <h3 className="font-display font-bold text-3xl mb-3">{ws.contact_box_title || "Redo att boka?"}</h3>
          <p className="text-white/75 leading-relaxed max-w-md">
            {ws.contact_box_text || "Vi erbjuder professionell städning anpassad efter dina behov. Kontakta oss idag!"}
          </p>
          <a href="#boka"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white text-[#141414] px-8 py-4 font-semibold hover:bg-white/90 transition-colors">
            {ws.contact_box_btn || "Boka tid"}
          </a>
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-white/[0.04]" />
        </div>
      </div>
    </section>
  );
};

export const Footer = () => {
  const ws = useWebsite();

  return (
    <footer className="bg-white border-t border-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <span className="font-display font-bold text-lg text-[#141414]">
            {ws.company_name || "PureNorth Städ"}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/faq" className="text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors">Vanliga frågor</Link>
          <Link to="/kundavtal" className="text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors">Kundavtal</Link>
          <Link to="/nojd-kundgaranti" className="text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors">Nöjd kundgaranti</Link>
          <Link to="/varderingar" className="text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors">Värderingar</Link>
          <Link to="/malsattning" className="text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors">Målsättning</Link>
          <Link to="/integritetspolicy" className="text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors">GDPR-Integritetspolicy</Link>
          <Link to="/admin" className="text-sm font-medium text-slate-400 hover:text-[#141414] transition-colors">Admin</Link>
        </div>
      </div>
      <p className="text-sm text-slate-500 text-center mt-8">
        © {new Date().getFullYear()} {ws.company_name || "PureNorth Städ"} · Umeå
      </p>
    </footer>
  );
};
