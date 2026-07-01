import React from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { Link } from "react-router-dom";
import { Phone, MapPin, Clock, Mail } from "lucide-react";
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
          {ws.show_contact_title !== false && <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.contact_title_color || "#141414"}}>
            {ws.contact_title || "Kontakt"}
          </p>}
          {ws.show_contact_subtitle !== false && <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight" style={{color: ws.contact_subtitle_color || "#141414"}}>
            {ws.contact_subtitle || "Vi finns i Umeå"}
          </h2>}
          {ws.show_contact_description !== false && <p className="mt-5 text-lg max-w-lg" style={{color: ws.contact_description_color || "#475569"}}>
            {(ws.contact_description && ws.contact_description.length > 0) ? ws.contact_description : "Har du frågor eller vill boka en städning? Hör av dig så hjälper vi dig."}
          </p>}

          <div className="mt-9 space-y-4">
            {ws.show_phone !== false && <a href={`tel:${ws.phone?.replace(/[^0-9+]/g,"")}`} data-testid="contact-phone" className="flex items-center gap-4 group">
              <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534] group-hover:bg-[#166534] group-hover:text-white transition-colors">
                <Phone size={20} />
              </span>
              <div>
                <span className="block text-xs text-slate-500">Telefon</span>
                <span className="block font-semibold" style={{color: ws.phone_color || "#0f172a"}}>{ws.phone}</span>
              </div>
            </a>}
            {ws.show_email !== false && ws.email && (
            <a href={`mailto:${ws.email}`} className="flex items-center gap-4 group">
              <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534] group-hover:bg-[#166534] group-hover:text-white transition-colors">
                <Mail size={20} />
              </span>
              <div>
                <span className="block text-xs text-slate-500">E-post</span>
                <span className="block font-semibold text-slate-900">{ws.email}</span>
              </div>
            </a>
            )}
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534]">
                <MapPin size={20} />
              </span>
              <div>
                <span className="block text-xs text-slate-500">Ort</span>
                <span className="block font-semibold" style={{color: ws.address_color || "#0f172a"}}>{ws.address || "Umeå, Sverige"}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-2xl bg-[#166534]/10 flex items-center justify-center text-[#166534]">
                <Clock size={20} />
              </span>
              <div>
                <span className="block text-xs text-slate-500">Öppettider</span>
                <span className="block font-semibold" style={{color: ws.opening_hours_color || "#0f172a"}}>{ws.opening_hours}</span>
              </div>
            </div>
          </div>
        </div>

        {ws.show_contact_box !== false && <div className="rounded-3xl p-10 sm:p-12 relative overflow-hidden" style={{backgroundColor: ws.contact_box_bg || "#141414", color: "white"}}>
          <Logo className="h-14 w-14 mb-6 !bg-white" />
          <h3 className="font-display font-bold text-3xl mb-3" style={{color: ws.contact_box_title_color || "#ffffff"}}>{ws.contact_box_title || "Redo att boka?"}</h3>
          <p className="leading-relaxed max-w-md" style={{color: ws.contact_box_text_color || "rgba(255,255,255,0.75)"}}>
            {ws.contact_box_text || "Vi erbjuder professionell städning anpassad efter dina behov. Kontakta oss idag!"}
          </p>
          <a href="#boka"
            className="mt-8 inline-flex items-center justify-center rounded-full px-8 py-4 font-semibold transition-colors" style={{backgroundColor: ws.contact_box_btn_bg || "#ffffff", color: ws.contact_box_btn_color || "#141414"}}>
            {ws.contact_box_btn || "Boka tid"}
          </a>
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-white/[0.04]" />
        </div>}
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
      {(ws.instagram_url || ws.facebook_url) && (
        <div className="flex items-center justify-center gap-4 mt-6">
          {ws.instagram_url && (
            <a href={ws.instagram_url.startsWith("http") ? ws.instagram_url : `https://instagram.com/${ws.instagram_url}`} target="_blank" rel="noopener noreferrer"
              className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#141414] hover:border-slate-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
          )}
          {ws.facebook_url && (
            <a href={ws.facebook_url.startsWith("http") ? ws.facebook_url : `https://facebook.com/${ws.facebook_url}`} target="_blank" rel="noopener noreferrer"
              className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#141414] hover:border-slate-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
          )}
        </div>
      )}
      <p className="text-sm text-slate-500 text-center mt-4">
        © {new Date().getFullYear()} {ws.company_name || "PureNorth Städ"} · Umeå
      </p>
    </footer>
  );
};
// colors Wed Jul  1 15:12:12 UTC 2026
