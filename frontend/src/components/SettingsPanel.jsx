import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { SocialSection } from "@/features/settings/sections/SocialSection";
import { SeoSection } from "@/features/settings/sections/SeoSection";
import { AdminSection } from "@/features/settings/sections/AdminSection";
import { NavbarSection } from "@/features/settings/sections/NavbarSection";
import { TestimonialsSection } from "@/features/settings/sections/TestimonialsSection";
import { VartArbeteSection } from "@/features/settings/sections/VartArbeteSection";
import { ContactSection } from "@/features/settings/sections/ContactSection";
import { AboutSection } from "@/features/settings/sections/AboutSection";
import { MediaSection } from "@/features/settings/sections/MediaSection";
import { KontaktsektionSection } from "@/features/settings/sections/KontaktsektionSection";
import { WhyUsSection } from "@/features/settings/sections/WhyUsSection";
import { ServicesSection } from "@/features/settings/sections/ServicesSection";
import { toast } from "sonner";
import { Save, Upload, Globe, Phone, Image, Type, Info, MapPin, Award, Layers, Plus, Trash2, Menu, Search, Palette, Star, ExternalLink, ClipboardList } from "lucide-react";

const SECTIONS = [
  { id: "admin", label: "Admin", icon: Menu },
  { id: "hero", label: "Hero", icon: Type },
  { id: "services", label: "Tjänster", icon: Globe },
  { id: "testimonials", label: "Omdömen", icon: Star },
  { id: "vartarbete", label: "Vårt arbete", icon: Image },
  { id: "about", label: "Om oss", icon: Info },
  { id: "whyus", label: "Varför oss", icon: Award },
  { id: "contact", label: "Kontaktsektion", icon: Phone },
  { id: "kontaktsektion", label: "Kontaktuppgifter", icon: MapPin },
  { id: "navbar", label: "Navbar", icon: Menu },
  { id: "booking", label: "Bokningsformulär", icon: ClipboardList },
  { id: "footer", label: "Footer", icon: Layers },
  { id: "media", label: "Bilder & Logo", icon: Image },
  { id: "social", label: "Sociala medier", icon: Globe },
  { id: "seo", label: "SEO", icon: Search },
];

function CircleColor({ value, onChange }) {
  return (
    <div className="relative h-6 w-6 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 cursor-pointer" style={{backgroundColor: value}}>
      <input type="color" value={value} onChange={onChange} className="absolute opacity-0 inset-0 w-8 h-8 cursor-pointer" style={{margin: "-4px"}}/>
    </div>
  );
}

function TextColorPicker({ label, colorKey, defaultColor, data, set }) {
  const hasChanged = data[colorKey] && data[colorKey] !== (defaultColor || "");
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">{label}</span>
      <CircleColor value={data[colorKey] || defaultColor || "#141414"} onChange={e => set(colorKey, e.target.value)}/>
      {hasChanged && <button onClick={() => set(colorKey, defaultColor || "")} className="text-xs text-red-400 hover:text-red-600">↺</button>}
    </div>
  );
}

function ColorPicker({ label, colorKey, bgKey, defaultColor, defaultBg, data, set }) {
  const colorChanged = data[colorKey] && data[colorKey] !== defaultColor;
  const bgChanged = data[bgKey] && data[bgKey] !== defaultBg;
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
          Text
          <CircleColor value={data[colorKey] || defaultColor || "#141414"} onChange={e => set(colorKey, e.target.value)}/>
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
          BG
          <CircleColor value={data[bgKey] || defaultBg || "#ffffff"} onChange={e => set(bgKey, e.target.value)}/>
        </label>
        {(colorChanged || bgChanged) && (
          <button onClick={() => { set(colorKey, defaultColor || ""); set(bgKey, defaultBg || ""); }}
            className="text-xs text-red-400 hover:text-red-600">↺</button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const [data, setData] = useState({
    hero_title: "", hero_subtitle: "", hero_badge: "", cta_text: "",
    badge1: "", badge2: "", phone: "", email: "", address: "",
    opening_hours: "", company_name: "", about_text: "",
    logo_url: "", hero_image: "", facebook_url: "", instagram_url: "",
    contact_title: "", contact_subtitle: "", contact_description: "", contact_box_title: "", contact_box_text: "", contact_box_btn: "",
  });
  const [section, setSection] = useState("admin");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const logoRef = useRef();
  const aboutImgRef = useRef();
  const mal1ImgRef = useRef();
  const mal2ImgRef = useRef();
  const badgeImgRef = useRef();
  const badge1ImgRef = useRef();
  const badge2ImgRef = useRef();
  const heroImgRef = useRef();

  useEffect(() => {
    api.get("/settings/website").then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/settings/website", data);
      toast.success("Webbplatsinställningar sparade! ✅");
    } catch { toast.error("Kunde inte spara."); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file, key) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/settings/website/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      set(key, res.data.url);
      toast.success("Bild uppladdad! ✅");
    } catch { toast.error("Uppladdning misslyckades."); }
  };

  const inp = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#141414] transition-colors";
  const lbl = "text-sm font-medium text-slate-700 block mb-1";

  if (loading) return <div className="text-center py-20 text-slate-400">Laddar...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-900">Webbplatsinställningar</h2>
          <p className="text-sm text-slate-500 mt-1">Redigera text och bilder på din webbplats</p>
        </div>
        <div className="flex gap-2">
          <button onClick={async () => {
            if (!window.confirm("Återställ alla inställningar till standard?")) return;
            const defaults = {
              hero_badge: "Svanenmärkt & miljöcertifierat",
              hero_title: "Renhet med norrländsk precision i Umeå.",
              hero_subtitle: "Vi definierar premiumstädning genom certifierad expertis och hållbara metoder.",
              cta_text: "Boka tid online",
              badge1: "SRY-kvalifikation",
              badge2: "Pur-Eco produkter",
              phone: "070-624 04 03",
              company_name: "PureNorth Städ",
              opening_hours: "Mån–Fre: 08:00–18:00",
              contact_title: "Kontakt",
              contact_subtitle: "Vi finns i Umeå",
              contact_description: "Har du frågor eller vill boka en städning? Hör av dig så hjälper vi dig.",
              contact_box_title: "PureNorth Städ",
              contact_box_text: "Miljövänlig städning med SRY-utbildad personal och Svanenmärkta Pur-Eco produkter. För ett renare hem och en renare natur.",
              contact_box_btn: "Boka tid nu",
              hero_badge_color: "#166534",
              hero_badge_bg: "#dcfce7",
              hero_title_color: "#141414",
              hero_title_bg: "transparent",
              hero_subtitle_color: "#475569",
              hero_subtitle_bg: "transparent",
              hero_cta_color: "#ffffff",
              hero_cta_bg: "#141414",
              hero_badge1_color: "#475569",
              hero_badge1_bg: "transparent",
              hero_badge2_color: "#475569",
              hero_badge2_bg: "transparent",
              hero_image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
              about_image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
              contact_title_color: "",
              contact_subtitle_color: "",
              contact_description_color: "",
              contact_box_title_color: "",
              contact_box_text_color: "rgba(255,255,255,0.75)",
              contact_box_bg: "#141414",
              contact_box_btn_color: "#141414",
              contact_box_btn_bg: "#ffffff",
              booking_bg: "#141414",
              booking_title_color: "#ffffff",
              booking_subtitle_color: "#ffffff",
              booking_btn_color: "#141414",
              booking_btn_bg: "#ffffff",
              booking_label_color: "#ffffff",
              booking_phone_icon: "Phone",
              booking_phone_icon_bg: "#ffffff",
              booking_phone_icon_color: "#141414",
              booking_phone_text_color: "#ffffff",
              booking_phone_label_color: "#ffffff",
              admin_company_name: "",
              admin_panel_label: "Adminpanel",
              admin_header_bg: "#ffffff",
              admin_header_text_color: "#0f172a",
              testimonials_label_color: "",
              testimonials_title_color: "",
              testimonials_card_bg: "",
              testimonials_text_color: "",
              testimonials_name_color: "",
              testimonials_role_color: "",
              testimonials_icon_color: "",
              hero_rut_percent: "50%",
              hero_rut_title: "RUT-avdrag",
              hero_rut_text: "Dras direkt på fakturan",
              hero_rut_bg: "#ffffff",
              hero_rut_circle_bg: "#166534",
              hero_rut_circle_color: "#166534",
              hero_rut_title_color: "#0f172a",
              hero_rut_text_color: "#64748b",
              integritet_sections: [
                {"heading":"Behandling av personuppgifter","bullets":["För att kunna erbjuda dig våra tjänster behöver vi behandla dina personuppgifter.","Vi värnar om din personliga integritet och eftersträvar alltid en hög nivå av dataskydd.","PureNorth Städ avser att behandla personuppgifter i enlighet med dataskyddsförordningen GDPR."]},
                {"heading":"1. Allmänt","text":"Denna integritetspolicy beskriver hur PureNorth Städ samlar in och behandlar dina personuppgifter."},
                {"heading":"2. Personuppgiftsansvarig","text":"Respektive bolag som du lämnat personuppgifter till är personuppgiftsansvarig för behandling av dina uppgifter."},
                {"heading":"3. Insamling av information","text":"Vi samlar in information från dig när du besöker vår hemsida eller på annat sätt har kontakt med oss."},
                {"heading":"4. Vilken information behandlar vi?","bullets":["Namn och identifikationsnummer","Adress","Telefonnummer och e-post","Betalningsuppgifter","Uppgifter om dina beställningar"]},
                {"heading":"5. Användning av information","bullets":["Fullgöra våra förpliktelser gentemot dig som kund","Möjliggöra allmän kundvård och kundservice","Hantera kundförhållandet och tillhandahålla våra tjänster"]},
                {"heading":"6. De lagliga grunderna","text":"Uppfyllande av avtal: vi behandlar dina personuppgifter för att kunna fullgöra avtalet med dig som kund."},
                {"heading":"7. Hur länge sparar vi informationen","text":"Vi sparar uppgifter om kunder i högst 24 månader efter senaste interaktion."},
                {"heading":"8. E-handelssäkerhet","text":"PureNorth Städ är de enda som äger informationen som samlas in på våra webbplatser."},
                {"heading":"9. Utlämnande till tredje part","text":"Vi säljer inte personligt identifierbar information till utomstående parter."},
                {"heading":"10. Informationsskydd","text":"Vi använder avancerade krypteringsmetoder för att skydda känsliga uppgifter."},
                {"heading":"11. Dina rättigheter","text":"Du har rätt att kostnadsfritt erhålla ett registerutdrag över vilken information som finns registrerad om dig."},
                {"heading":"12. Cookies","text":"När du besöker vår hemsida använder vi cookies för att ge dig en mer användarvänlig webbplats."},
                {"heading":"13. Ändring av integritetspolicy","text":"PureNorth Städ har rätt att när som helst ändra integritetspolicyn."},
                {"heading":"14. Kontaktinformation","text":"Har du frågor kring denna policy kan du kontakta oss på kundtjanst@purenorthstad.se."}
              ],
              contact_title_color: "",
              contact_subtitle_color: "",
              contact_description_color: "",
              contact_box_title_color: "",
              contact_box_text_color: "rgba(255,255,255,0.75)",
              contact_box_bg: "#141414",
              contact_box_btn_color: "#141414",
              contact_box_btn_bg: "#ffffff",
              booking_bg: "#141414",
              booking_title_color: "#ffffff",
              booking_subtitle_color: "#ffffff",
              booking_btn_color: "#141414",
              booking_btn_bg: "#ffffff",
              booking_label_color: "#ffffff",
              booking_phone_icon: "Phone",
              booking_phone_icon_bg: "#ffffff",
              booking_phone_icon_color: "#141414",
              booking_phone_text_color: "#ffffff",
              booking_phone_label_color: "#ffffff",
              admin_company_name: "",
              admin_panel_label: "Adminpanel",
              admin_header_bg: "#ffffff",
              admin_header_text_color: "#0f172a",
              testimonials_label_color: "",
              testimonials_title_color: "",
              testimonials_card_bg: "",
              testimonials_text_color: "",
              testimonials_name_color: "",
              testimonials_role_color: "",
              testimonials_icon_color: "",
              nav_links: [{"label":"Tjänster","href":"/#tjanster"},{"label":"Om oss","href":"/om-oss"},{"label":"Vårt arbete","href":"/#vart-arbete"},{"label":"Kontakt","href":"/#kontakt"}],
              navbar_bg: "",
              navbar_company_color: "",
              navbar_link_color: "",
              navbar_btn_color: "",
              navbar_btn_bg: "",
              services_label_color: "",
              services_title_color: "",
              services: [
                {"title":"Hemstädning","desc":"Regelbunden eller engångsstädning som ger dig mer tid till det du älskar.","icon_name":"Home","icon_color":"#166534","img":"https://images.pexels.com/photos/36777855/pexels-photo-36777855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"},
                {"title":"Flyttstädning","desc":"Noggrann städning vid in och utflyttning, med nöjd kund garanti.","icon_name":"Truck","icon_color":"#166534","img":"https://images.unsplash.com/photo-1600585152220-90363fe7e115?crop=entropy&cs=srgb&fm=jpg&q=85&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"},
                {"title":"Kontorsstädning","desc":"Professionell städning av arbetsplatser för en frisk arbetsmiljö.","icon_name":"Building2","icon_color":"#166534","img":"https://images.unsplash.com/photo-1449247709967-d4461a6a6103?crop=entropy&cs=srgb&fm=jpg&q=85&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"},
                {"title":"Storstädning","desc":"Djuprengöring av hela bostaden, perfekt inför högtider och säsong.","icon_name":"Sparkles","icon_color":"#166534","img":"https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940","show":true,"title_color":"#0f172a","desc_color":"#475569"}
              ],
              vart_slides: [
                {"before":"/before-1.png","after":"/after-1.png","alt":"Sovrum","testid":"before-after-1","show":true,"mode":"slider"},
                {"before":"/before-2.png","after":"/after-2.png","alt":"Kontor","testid":"before-after-2","show":true,"mode":"slider"}
              ],
              mal_card1_img: "/svanen-new.png",
              mal_card2_img: "https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&w=900",
              faq_items: [
                {"q":"Hur gör jag en bokning?","a":"Om du är intresserad av att göra en bokning hos oss börjar du med att gå in på vårt bokningsformulär och fyller i det."},
                {"q":"Hur kontaktar jag er?","a":"Du kan kontakta oss via telefon eller mejl. Telefon: 0706240403."},
                {"q":"Har ni städgaranti?","a":"Vi lämnar 14 dagars städgaranti."},
                {"q":"Vad gör jag om jag inte är nöjd?","a":"Kontakta oss inom 14 dagar från städdagen."},
                {"q":"Behöver jag ha något städmaterial hemma?","a":"Nej, vi tar med oss allt vi behöver."},
                {"q":"Vad har ni för avbokningsregler?","a":"Du kan avboka kostnadsfritt fram till två veckor innan avtalat datum."},
                {"q":"Måste jag själv göra något för att få RUT-avdrag?","a":"Nej, vi sköter allt administrativt för RUT-avdraget."},
                {"q":"Vad händer om något går sönder?","a":"PureNorth Städ har ansvarsförsäkring som täcker eventuella skador."}
              ],
              nojd_guarantees: ["92% av kunder ger oss topp betyg","Vi följer mäklarsamfundets rekommendationer","Klart inom 24 timmar"],
              nojd_steps: ["Kontakta oss snarast möjligt via telefon eller e-post om du är missnöjd.","Vi tar fram en lösning och åtgärdar problemet så snabbt som möjligt.","Reklamera tjänsten inom tre arbetsdagar efter servicetillfället."],
              varderingar_values: [
                {"icon":"Tag","title":"Priser","text":"För både er och vår personals trygghet matchar vi priset till kvalitén som erbjuds."},
                {"icon":"HeartHandshake","title":"Service","text":"Vi är kända för att alltid bemöta kunder på ett bra sätt."},
                {"icon":"ShieldCheck","title":"Kvalitetssäkring","text":"Vår målsättning är att leverera tjänster av toppkvalité."},
                {"icon":"Ear","title":"Respekt & lyhördhet","text":"Att respektera våra kunder, hem och medarbetare är grunden till en bra vardag."}
              ],
              booking_services: ["Hemstädning","Flyttstädning","Kontorsstädning","Storstädning","Annat"],
              kundavtal_sections: [
                {"heading":"Bokningsvillkor","items":["Bokningen behöver ske via mail.","Vi behöver ett fullständigt personnummer för RUT-ansökan.","Vår städgaranti innebär att ni inom 14 dagar efter utförd tjänst ska kontakta oss."]},
                {"heading":"Betalningsvillkor","items":["Fakturering och betalning hanteras endast elektroniskt.","Betalningsvillkor är 10 dagar."]},
                {"heading":"Avbokningsvillkor","items":["Avbokning sker kostnadsfritt fram till och med två veckor innan avtalad städdag.","Vid avbeställning 8 dagar före, erläggs 25%.","Sker avbeställningen inom 3 dagar, erläggs full kostnad."]}
              ],
              contact_title_color: "",
              contact_subtitle_color: "",
              contact_description_color: "",
              contact_box_title_color: "",
              contact_box_text_color: "rgba(255,255,255,0.75)",
              contact_box_bg: "#141414",
              contact_box_btn_color: "#141414",
              contact_box_btn_bg: "#ffffff",
              booking_bg: "#141414",
              booking_title_color: "#ffffff",
              booking_subtitle_color: "#ffffff",
              booking_btn_color: "#141414",
              booking_btn_bg: "#ffffff",
              booking_label_color: "#ffffff",
              booking_phone_icon: "Phone",
              booking_phone_icon_bg: "#ffffff",
              booking_phone_icon_color: "#141414",
              booking_phone_text_color: "#ffffff",
              booking_phone_label_color: "#ffffff",
              admin_company_name: "",
              admin_panel_label: "Adminpanel",
              admin_header_bg: "#ffffff",
              admin_header_text_color: "#0f172a",
              testimonials_label_color: "",
              testimonials_title_color: "",
              testimonials_card_bg: "",
              testimonials_text_color: "",
              testimonials_name_color: "",
              testimonials_role_color: "",
              testimonials_icon_color: "",
              nav_links: [{"label":"Tjänster","href":"/#tjanster"},{"label":"Om oss","href":"/om-oss"},{"label":"Vårt arbete","href":"/#vart-arbete"},{"label":"Kontakt","href":"/#kontakt"}],
              navbar_bg: "",
              navbar_company_color: "",
              navbar_link_color: "",
              navbar_btn_color: "",
              navbar_btn_bg: "",
              services: [
                {title:"Hemstädning",desc:"Regelbunden eller engångsstädning som ger dig mer tid till det du älskar.",icon_name:"Home",icon_color:"#166534",img:"https://images.pexels.com/photos/36777855/pexels-photo-36777855.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"},
                {title:"Flyttstädning",desc:"Noggrann städning vid in och utflyttning, med nöjd kund garanti.",icon_name:"Truck",icon_color:"#166534",img:"https://images.unsplash.com/photo-1600585152220-90363fe7e115?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"},
                {title:"Kontorsstädning",desc:"Professionell städning av arbetsplatser för en frisk arbetsmiljö.",icon_name:"Building2",icon_color:"#166534",img:"https://images.unsplash.com/photo-1449247709967-d4461a6a6103?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"},
                {title:"Storstädning",desc:"Djuprengöring av hela bostaden, perfekt inför högtider och säsong.",icon_name:"Sparkles",icon_color:"#166534",img:"https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",show:true,title_color:"#0f172a",desc_color:"#475569"}
              ],
            };
            try {
              await api.patch("/settings/website", defaults);
              window.location.reload();
            } catch { alert("Fel vid återställning."); }
          }} className="inline-flex items-center gap-2 border border-slate-300 text-slate-600 font-semibold px-5 py-2.5 rounded-full hover:bg-slate-100 transition-colors">
            Återställ
          </button>
          <a href="https://purenorth-stad.vercel.app" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold px-5 py-2.5 rounded-full hover:border-slate-400 transition-colors">
            <ExternalLink size={16}/> Visa
          </a>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#141414] hover:bg-black text-white font-semibold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50">
            <Save size={16}/> {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 p-2 space-y-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${section === s.id ? "bg-[#141414] text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                <s.icon size={15}/> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-6 space-y-5">

        {section === "hero" && <>
          <h3 className="font-semibold text-slate-800">Hero-sektion</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Hero</label>
            <button type="button" onClick={()=>set("show_hero_section", data.show_hero_section === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_section !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_section !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Badge-text (grön etikett)</label>
            <button type="button" onClick={()=>set("show_hero_badge", !data.show_hero_badge)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.hero_badge} onChange={e => set("hero_badge", e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
            <ColorPicker label="Färger" colorKey="hero_badge_color" bgKey="hero_badge_bg" defaultColor="#166534" defaultBg="#dcfce7" data={data} set={set}/>
            <label className={lbl + " mt-2"}>Badge-ikon</label>
            <select value={data.hero_badge_icon||"Leaf"} onChange={e=>set("hero_badge_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Leaf">🌿 Leaf (löv)</option>
              <option value="ShieldCheck">🛡️ ShieldCheck (sköld)</option>
              <option value="Star">⭐ Star (stjärna)</option>
              <option value="Heart">❤️ Heart (hjärta)</option>
              <option value="Zap">⚡ Zap (blixt)</option>
              <option value="Award">🏆 Award (utmärkelse)</option>
              <option value="CheckCircle">✅ CheckCircle (bock)</option>
              <option value="Sparkles">✨ Sparkles (gnistor)</option>
            </select>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.hero_badge_icon_color || "#166534"} onChange={e => set("hero_badge_icon_color", e.target.value)}/>
              {data.hero_badge_icon_color && <button onClick={()=>set("hero_badge_icon_color","")} className="text-xs text-red-400">↺</button>}
            </div>
            <label className={lbl + " mt-2"}>Badge-logotyp (valfritt - ersätter ikon)</label>
            {data.hero_badge_image && (
              <div className="flex items-center gap-2 mb-2">
                <img src={data.hero_badge_image} alt="Badge" className="h-6 w-6 object-contain"/>
                <button onClick={()=>set("hero_badge_image","")} className="text-red-500 text-xs hover:underline">Ta bort</button>
              </div>
            )}
            <input ref={badgeImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "hero_badge_image")}/>
            <button onClick={() => badgeImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> {data.hero_badge_image ? "Byt logotyp" : "Ladda upp logotyp"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Stor rubrik (H1)</label>
            <button type="button" onClick={()=>set("show_hero_title", !data.show_hero_title)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.hero_title} onChange={e => set("hero_title", e.target.value)} rows={3} placeholder="Renhet med norrländsk precision i Umeå." className={inp + " resize-none"}/>
            <ColorPicker label="Färger" colorKey="hero_title_color" bgKey="hero_title_bg" defaultColor="#141414" defaultBg="transparent" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Undertext</label>
            <button type="button" onClick={()=>set("show_hero_subtitle", !data.show_hero_subtitle)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_subtitle !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_subtitle !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.hero_subtitle} onChange={e => set("hero_subtitle", e.target.value)} rows={3} placeholder="Vi definierar premiumstädning..." className={inp + " resize-none"}/>
            <ColorPicker label="Färger" colorKey="hero_subtitle_color" bgKey="hero_subtitle_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Knapptext (Boka-knapp)</label>
            <button type="button" onClick={()=>set("show_hero_cta", !data.show_hero_cta)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_cta !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_cta !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.cta_text} onChange={e => set("cta_text", e.target.value)} placeholder="Boka tid online" className={inp}/>
            <ColorPicker label="Färger" colorKey="hero_cta_color" bgKey="hero_cta_bg" defaultColor="#ffffff" defaultBg="#141414" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Telefonnummer (knapp)</label>
              <button type="button" onClick={()=>set("show_hero_phone", data.show_hero_phone === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_phone !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_phone !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.hero_phone_color||"#374151"} onChange={e=>set("hero_phone_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Ikon</span>
              <CircleColor value={data.hero_phone_icon_color||"#374151"} onChange={e=>set("hero_phone_icon_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span>
              <CircleColor value={data.hero_phone_bg||"transparent"} onChange={e=>set("hero_phone_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>RUT-avdrag badge</label>
              <button type="button" onClick={()=>set("show_hero_rut", data.show_hero_rut === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_rut !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_rut !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Procent text</label>
                <input value={data.hero_rut_percent||""} onChange={e=>set("hero_rut_percent",e.target.value)} placeholder="50%" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={data.hero_rut_title||""} onChange={e=>set("hero_rut_title",e.target.value)} placeholder="RUT-avdrag" className={inp}/>
              </div>
            </div>
            <div>
              <label className={lbl}>Undertext</label>
              <input value={data.hero_rut_text||""} onChange={e=>set("hero_rut_text",e.target.value)} placeholder="Dras direkt på fakturan" className={inp}/>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">BG</span>
              <CircleColor value={data.hero_rut_bg||"#ffffff"} onChange={e=>set("hero_rut_bg",e.target.value)}/>
              <span className="text-xs text-slate-500">Cirkel BG</span>
              <CircleColor value={data.hero_rut_circle_bg||"#166534"} onChange={e=>set("hero_rut_circle_bg",e.target.value)}/>
              <span className="text-xs text-slate-500">Cirkel text</span>
              <CircleColor value={data.hero_rut_circle_color||"#166534"} onChange={e=>set("hero_rut_circle_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Titel</span>
              <CircleColor value={data.hero_rut_title_color||"#0f172a"} onChange={e=>set("hero_rut_title_color",e.target.value)}/>
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.hero_rut_text_color||"#64748b"} onChange={e=>set("hero_rut_text_color",e.target.value)}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Badge 1 (under knapparna)</label>
                <button type="button" onClick={()=>set("show_hero_badge1", data.show_hero_badge1 === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge1 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge1 !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <input value={data.badge1} onChange={e => set("badge1", e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
              <ColorPicker label="Färger" colorKey="hero_badge1_color" bgKey="hero_badge1_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
              <label className={lbl + " mt-2"}>Badge 1 ikon</label>
              <select value={data.badge1_icon||"ShieldCheck"} onChange={e=>set("badge1_icon",e.target.value)} className={inp}>
                <option value="none">— Ingen ikon</option>
                <option value="ShieldCheck">🛡️ ShieldCheck</option>
                <option value="Leaf">🌿 Leaf</option>
                <option value="Star">⭐ Star</option>
                <option value="Heart">❤️ Heart</option>
                <option value="Zap">⚡ Zap</option>
                <option value="Award">🏆 Award</option>
                <option value="CheckCircle">✅ CheckCircle</option>
              </select>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">Ikon färg</span>
                <CircleColor value={data.hero_badge1_icon_color || "#166534"} onChange={e => set("hero_badge1_icon_color", e.target.value)}/>
                {data.hero_badge1_icon_color && <button onClick={()=>set("hero_badge1_icon_color","")} className="text-xs text-red-400">↺</button>}
              </div>
              <label className={lbl + " mt-2"}>Badge 1 logotyp (ersätter ikon)</label>
              {data.badge1_image && <div className="flex items-center gap-2 mb-2"><img src={data.badge1_image} alt="" className="h-5 w-5 object-contain"/><button onClick={()=>set("badge1_image","")} className="text-red-500 text-xs">Ta bort</button></div>}
              <input ref={badge1ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "badge1_image")}/>
              <button onClick={() => badge1ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400 transition-colors mt-1">
                <Upload size={12}/> {data.badge1_image ? "Byt" : "Ladda upp"}
              </button>
              <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Badge 2</label>
                <button type="button" onClick={()=>set("show_hero_badge2", data.show_hero_badge2 === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_badge2 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_badge2 !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
              </div>
              <input value={data.badge2} onChange={e => set("badge2", e.target.value)} placeholder="Pur-Eco produkter" className={inp}/>
              <ColorPicker label="Färger" colorKey="hero_badge2_color" bgKey="hero_badge2_bg" defaultColor="#475569" defaultBg="transparent" data={data} set={set}/>
              <label className={lbl + " mt-2"}>Badge 2 ikon</label>
              <select value={data.badge2_icon||"Leaf"} onChange={e=>set("badge2_icon",e.target.value)} className={inp}>
                <option value="none">— Ingen ikon</option>
                <option value="Leaf">🌿 Leaf</option>
                <option value="ShieldCheck">🛡️ ShieldCheck</option>
                <option value="Star">⭐ Star</option>
                <option value="Heart">❤️ Heart</option>
                <option value="Zap">⚡ Zap</option>
                <option value="Award">🏆 Award</option>
                <option value="CheckCircle">✅ CheckCircle</option>
              </select>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">Ikon färg</span>
                <CircleColor value={data.hero_badge2_icon_color || "#166534"} onChange={e => set("hero_badge2_icon_color", e.target.value)}/>
                {data.hero_badge2_icon_color && <button onClick={()=>set("hero_badge2_icon_color","")} className="text-xs text-red-400">↺</button>}
              </div>
              <label className={lbl + " mt-2"}>Badge 2 logotyp (ersätter ikon)</label>
              {data.badge2_image && <div className="flex items-center gap-2 mb-2"><img src={data.badge2_image} alt="" className="h-5 w-5 object-contain"/><button onClick={()=>set("badge2_image","")} className="text-red-500 text-xs">Ta bort</button></div>}
              <input ref={badge2ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "badge2_image")}/>
              <button onClick={() => badge2ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400 transition-colors mt-1">
                <Upload size={12}/> {data.badge2_image ? "Byt" : "Ladda upp"}
              </button>
              <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 32×32px · PNG med transparent bakgrund</p>
            </div>
          </div>
        </>}

        {section === "contact" && <ContactSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "media" && <MediaSection data={data} set={set} inp={inp} lbl={lbl} logoRef={logoRef} heroImgRef={heroImgRef} uploadImage={uploadImage}/>}

        {section === "social" && <SocialSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "kontaktsektion" && <KontaktsektionSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "whyus" && <WhyUsSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "services" && <ServicesSection data={data} set={set} inp={inp} lbl={lbl} uploadImage={uploadImage}/>}

        {section === "navbar" && <NavbarSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "booking" && <>
          <h3 className="font-semibold text-slate-800">Bokningsformulär</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa bokningsformulär</label>
            <button type="button" onClick={()=>set("show_booking", data.show_booking === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.booking_bg||"#141414"} onChange={e=>set("booking_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Vänster sida</h4>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.booking_left_label||""} onChange={e=>set("booking_left_label",e.target.value)} placeholder="Boka tid" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_label_color||"#808080"} onChange={e=>set("booking_left_label_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_left_title||""} onChange={e=>set("booking_left_title",e.target.value)} placeholder="Boka online eller ring oss" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_title_color||"#ffffff"} onChange={e=>set("booking_left_title_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.booking_left_subtitle||""} onChange={e=>set("booking_left_subtitle",e.target.value)} rows={2} placeholder="Fyll i formuläret..." className={inp+" resize-none"}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_subtitle_color||"#b3b3b3"} onChange={e=>set("booking_left_subtitle_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Ring oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa knapp</label>
            <button type="button" onClick={()=>set("show_booking_phone_btn", data.show_booking_phone_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_booking_phone_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_booking_phone_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Label text</label>
            <input value={data.booking_phone_btn_label||""} onChange={e=>set("booking_phone_btn_label",e.target.value)} placeholder="Ring oss" className={inp}/>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_phone_btn_bg||"#1f1f1f"} onChange={e=>set("booking_phone_btn_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span><CircleColor value={data.booking_phone_btn_icon_bg||"#ffffff"} onChange={e=>set("booking_phone_btn_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span><CircleColor value={data.booking_phone_btn_icon_color||"#141414"} onChange={e=>set("booking_phone_btn_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span><CircleColor value={data.booking_phone_btn_label_color||"#808080"} onChange={e=>set("booking_phone_btn_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Nummer</span><CircleColor value={data.booking_phone_btn_number_color||"#ffffff"} onChange={e=>set("booking_phone_btn_number_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Höger sida (formulär)</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Form BG</span><CircleColor value={data.booking_form_bg||"#1a1a1a"} onChange={e=>set("booking_form_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span><CircleColor value={data.booking_form_label_color||"#b3b3b3"} onChange={e=>set("booking_form_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Input BG</span><CircleColor value={data.booking_form_input_bg||"#242424"} onChange={e=>set("booking_form_input_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Input text</span><CircleColor value={data.booking_form_input_text||"#ffffff"} onChange={e=>set("booking_form_input_text",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Skicka-knapp</h4>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.booking_submit_text||""} onChange={e=>set("booking_submit_text",e.target.value)} placeholder="Skicka bokningsförfrågan" className={inp}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Text</span><CircleColor value={data.booking_submit_color||"#141414"} onChange={e=>set("booking_submit_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_submit_bg||"#ffffff"} onChange={e=>set("booking_submit_bg",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Success</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_success_title||""} onChange={e=>set("booking_success_title",e.target.value)} placeholder="Tack för din förfrågan!" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.booking_success_text||""} onChange={e=>set("booking_success_text",e.target.value)} placeholder="Vi återkommer så snart vi kan." className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_success_color||"#ffffff"} onChange={e=>set("booking_success_color",e.target.value)}/></div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänster</h4>
          {(data.booking_services||[]).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s||""} onChange={e=>{const arr=[...data.booking_services];arr[idx]=e.target.value;set("booking_services",arr);}} placeholder="Hemstädning" className={inp}/>
              <button onClick={()=>set("booking_services",data.booking_services.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("booking_services",[...(data.booking_services||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>}

        {section === "footer" && <>
          <h3 className="font-semibold text-slate-800">Footer</h3>
          <div>
            <label className={lbl}>Footer BG färg</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.footer_bg||"#ffffff"} onChange={e=>set("footer_bg",e.target.value)}/>
              <span className="text-xs text-slate-400">Bakgrundsfärg</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Copyright text</label>
            <input value={data.footer_copyright||""} onChange={e=>set("footer_copyright",e.target.value)} placeholder="© 2026 PureNorth Städ · Umeå" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Färg</span>
              <CircleColor value={data.footer_copyright_color||"#64748b"} onChange={e=>set("footer_copyright_color",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sidinnehåll</h4>
          {[
            {key:"faq", label:"FAQ"},
            {key:"kundavtal", label:"Kundavtal"},
            {key:"nojd", label:"Nöjd kundgaranti"},
            {key:"varderingar", label:"Värderingar"},
            {key:"malsattning", label:"Målsättning"},
            {key:"integritet", label:"Integritetspolicy"},
          ].map(({key, label}) => (
            <div key={key} className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 transition-colors cursor-pointer" onClick={()=>setSection(`footer_${key}`)}>
              <div className="flex items-center gap-3">
                <button type="button" onClick={e=>{e.stopPropagation();set(`show_footer_${key}`, data[`show_footer_${key}`] === false ? true : false)}}
                  className={`w-10 h-5 rounded-full transition-colors shrink-0 ${data[`show_footer_${key}`] !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data[`show_footer_${key}`] !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <CircleColor value={data[`footer_${key}_color`]||"#475569"} onChange={e=>{e.stopPropagation();set(`footer_${key}_color`,e.target.value);}}/>
              </div>
            </div>
          ))}
        </>}

        {section === "footer_faq" && <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">FAQ</span>
          </div>
          <h3 className="font-semibold text-slate-800">FAQ – Vanliga frågor</h3>

          <div>
            <label className={lbl}>Sida BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.faq_bg||"#ffffff"} onChange={e=>set("faq_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.faq_label||""} onChange={e=>set("faq_label",e.target.value)} placeholder="Vanliga frågor & svar" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_label_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.faq_title||""} onChange={e=>set("faq_title",e.target.value)} placeholder="Vi har svaren" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.faq_subtitle||""} onChange={e=>set("faq_subtitle",e.target.value)} rows={2} placeholder="Hittar du inte svaret du söker?..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="faq_subtitle_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Frågor & svar färger</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Fråga</span>
            <CircleColor value={data.faq_question_color||"#141414"} onChange={e=>set("faq_question_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Svar</span>
            <CircleColor value={data.faq_answer_color||"#475569"} onChange={e=>set("faq_answer_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Kontaktruta (svart box)</label>
            <button type="button" onClick={()=>set("show_faq_contact_box", data.show_faq_contact_box === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_contact_box !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_contact_box !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Box BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.faq_box_bg||"#141414"} onChange={e=>set("faq_box_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.faq_box_title||""} onChange={e=>set("faq_box_title",e.target.value)} placeholder="Fortfarande frågor?" className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_box_title_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <input value={data.faq_box_text||""} onChange={e=>set("faq_box_text",e.target.value)} placeholder="Vi hjälper dig gärna med din städning." className={inp}/>
            <TextColorPicker label="Färg" colorKey="faq_box_text_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Ring oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Ring oss</label>
            <button type="button" onClick={()=>set("show_faq_ring_btn", data.show_faq_ring_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_ring_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_ring_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <input value={data.faq_ring_text||""} onChange={e=>set("faq_ring_text",e.target.value)} placeholder="Ring oss" className={inp}/>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.faq_ring_color||"#141414"} onChange={e=>set("faq_ring_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.faq_ring_bg||"#ffffff"} onChange={e=>set("faq_ring_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.faq_ring_icon_color||"#141414"} onChange={e=>set("faq_ring_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.faq_ring_icon||"Phone"} onChange={e=>set("faq_ring_icon",e.target.value)} className={inp}>
              <option value="Phone">📞 Phone</option>
              <option value="Smartphone">📱 Smartphone</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Mejla oss knapp</h4>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Mejla oss</label>
            <button type="button" onClick={()=>set("show_faq_mail_btn", data.show_faq_mail_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_faq_mail_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_faq_mail_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <input value={data.faq_mail_text||""} onChange={e=>set("faq_mail_text",e.target.value)} placeholder="Mejla oss" className={inp}/>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.faq_mail_color||"#ffffff"} onChange={e=>set("faq_mail_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.faq_mail_bg||"transparent"} onChange={e=>set("faq_mail_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.faq_mail_icon_color||"#ffffff"} onChange={e=>set("faq_mail_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.faq_mail_icon||"Mail"} onChange={e=>set("faq_mail_icon",e.target.value)} className={inp}>
              <option value="Mail">✉️ Mail</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="Send">📤 Send</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <h4 className="font-medium text-slate-700 mb-2">Frågor (FAQ items)</h4>
          {(data.faq_items||[]).map((item, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("faq_items", data.faq_items.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Fråga</label>
                <input value={item.q||""} onChange={e=>{const s=[...data.faq_items];s[idx]={...s[idx],q:e.target.value};set("faq_items",s);}} placeholder="Hur gör jag en bokning?" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Svar</label>
                <textarea value={item.a||""} onChange={e=>{const s=[...data.faq_items];s[idx]={...s[idx],a:e.target.value};set("faq_items",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("faq_items",[...(data.faq_items||[]),{q:"",a:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till fråga
          </button>
          <hr className="border-slate-100"/>

        </>}
        {section === "footer_kundavtal" && <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Kundavtal</span>
          </div>
          <h3 className="font-semibold text-slate-800">Kundavtal</h3>
          <div>
            <label className={lbl}>Sida BG</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.kundavtal_bg||"#ffffff"} onChange={e=>set("kundavtal_bg",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.kundavtal_eyebrow||""} onChange={e=>set("kundavtal_eyebrow",e.target.value)} placeholder="Kundavtal" className={inp}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.kundavtal_title||""} onChange={e=>set("kundavtal_title",e.target.value)} placeholder="Bokningsvillkor" className={inp}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro text</label>
            <textarea value={data.kundavtal_intro||""} onChange={e=>set("kundavtal_intro",e.target.value)} rows={2} placeholder="Här hittar du våra boknings-, betalnings- och avbokningsvillkor." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="kundavtal_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Sektioner färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.kundavtal_heading_color||"#141414"} onChange={e=>set("kundavtal_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.kundavtal_text_color||"#475569"} onChange={e=>set("kundavtal_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Bullet</span>
            <CircleColor value={data.kundavtal_bullet_color||"#141414"} onChange={e=>set("kundavtal_bullet_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sektioner</h4>
          {(data.kundavtal_sections||[]).map((sec, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("kundavtal_sections", data.kundavtal_sections.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={sec.heading||""} onChange={e=>{const s=[...data.kundavtal_sections];s[idx]={...s[idx],heading:e.target.value};set("kundavtal_sections",s);}} placeholder="Bokningsvillkor" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Punkter (en per rad)</label>
                <textarea value={(sec.items||[]).join("\n")} onChange={e=>{const s=[...data.kundavtal_sections];s[idx]={...s[idx],items:e.target.value.split("\n")};set("kundavtal_sections",s);}} rows={4} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("kundavtal_sections",[...(data.kundavtal_sections||[]),{heading:"",items:[""]}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till sektion
          </button>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kontakttext (längst ner)</h4>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.kundavtal_footer_text||""} onChange={e=>set("kundavtal_footer_text",e.target.value)} placeholder="Har du fler frågor så är du välkommen att kontakta vår kundtjänst på" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Text färg</span>
              <CircleColor value={data.kundavtal_footer_color||"#475569"} onChange={e=>set("kundavtal_footer_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <label className={lbl}>E-post länk</label>
            <input value={data.kundavtal_footer_email||""} onChange={e=>set("kundavtal_footer_email",e.target.value)} placeholder="kundtjanst@purenorthstad.se" className={inp}/>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Länk färg</span>
              <CircleColor value={data.kundavtal_footer_link_color||"#141414"} onChange={e=>set("kundavtal_footer_link_color",e.target.value)}/>
            </div>
          </div>
        </>}

        {section === "footer_nojd" && <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Nöjd kundgaranti</span>
          </div>
          <h3 className="font-semibold text-slate-800">Nöjd kundgaranti</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.nojd_bg||"#ffffff"} onChange={e=>set("nojd_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.nojd_eyebrow||""} onChange={e=>set("nojd_eyebrow",e.target.value)} placeholder="Nöjd kundgaranti" className={inp}/>
            <TextColorPicker label="Färg" colorKey="nojd_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.nojd_title||""} onChange={e=>set("nojd_title",e.target.value)} placeholder="Nöjd kundgaranti för din trygghet" className={inp}/>
            <TextColorPicker label="Färg" colorKey="nojd_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.nojd_intro||""} onChange={e=>set("nojd_intro",e.target.value)} rows={2} placeholder="Vår garanti gäller för dig som..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="nojd_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Garantikort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.nojd_card_bg||"#ffffff"} onChange={e=>set("nojd_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_card_text_color||"#1e293b"} onChange={e=>set("nojd_card_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.nojd_card_icon_bg||"#141414"} onChange={e=>set("nojd_card_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.nojd_card_icon_color||"#ffffff"} onChange={e=>set("nojd_card_icon_color",e.target.value)}/>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Garantipunkter</h4>
          {(data.nojd_guarantees||[]).map((g, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={g||""} onChange={e=>{const s=[...data.nojd_guarantees];s[idx]=e.target.value;set("nojd_guarantees",s);}} placeholder="92% av kunder ger oss topp betyg" className={inp}/>
              <button onClick={()=>set("nojd_guarantees",data.nojd_guarantees.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nojd_guarantees",[...(data.nojd_guarantees||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till punkt
          </button>
          <hr className="border-slate-100"/>
          <div>
            <label className={lbl}>Sektion 1 rubrik</label>
            <input value={data.nojd_section1_heading||""} onChange={e=>set("nojd_section1_heading",e.target.value)} placeholder="Vad är Nöjd Kundgaranti?" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Sektion 1 text</label>
            <textarea value={data.nojd_section1_text||""} onChange={e=>set("nojd_section1_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Sektion 2 rubrik</label>
            <input value={data.nojd_section2_heading||""} onChange={e=>set("nojd_section2_heading",e.target.value)} placeholder="Så går det till" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Sektion 2 text</label>
            <textarea value={data.nojd_section2_text||""} onChange={e=>set("nojd_section2_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.nojd_heading_color||"#141414"} onChange={e=>set("nojd_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_text_color||"#475569"} onChange={e=>set("nojd_text_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Steg färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Steg BG</span>
            <CircleColor value={data.nojd_step_bg||"#fafafa"} onChange={e=>set("nojd_step_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.nojd_step_text_color||"#334155"} onChange={e=>set("nojd_step_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Num BG</span>
            <CircleColor value={data.nojd_step_num_bg||"#141414"} onChange={e=>set("nojd_step_num_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Num</span>
            <CircleColor value={data.nojd_step_num_color||"#ffffff"} onChange={e=>set("nojd_step_num_color",e.target.value)}/>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Steg</h4>
          {(data.nojd_steps||[]).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s||""} onChange={e=>{const arr=[...data.nojd_steps];arr[idx]=e.target.value;set("nojd_steps",arr);}} placeholder="Kontakta oss snarast..." className={inp}/>
              <button onClick={()=>set("nojd_steps",data.nojd_steps.filter((_,i)=>i!==idx))} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nojd_steps",[...(data.nojd_steps||[]),""])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till steg
          </button>
        </>}

        {section === "footer_varderingar" && <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Värderingar</span>
          </div>
          <h3 className="font-semibold text-slate-800">Värderingar</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.varderingar_bg||"#ffffff"} onChange={e=>set("varderingar_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.varderingar_eyebrow||""} onChange={e=>set("varderingar_eyebrow",e.target.value)} placeholder="Värderingar" className={inp}/>
            <TextColorPicker label="Färg" colorKey="varderingar_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.varderingar_title||""} onChange={e=>set("varderingar_title",e.target.value)} placeholder="Hur vi tänker" className={inp}/>
            <TextColorPicker label="Färg" colorKey="varderingar_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.varderingar_intro||""} onChange={e=>set("varderingar_intro",e.target.value)} rows={2} placeholder="Hur vi värderar våra tjänster..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="varderingar_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.varderingar_card_bg||"#ffffff"} onChange={e=>set("varderingar_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.varderingar_card_title_color||"#141414"} onChange={e=>set("varderingar_card_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.varderingar_card_text_color||"#475569"} onChange={e=>set("varderingar_card_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.varderingar_icon_bg||"#141414"} onChange={e=>set("varderingar_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.varderingar_icon_color||"#ffffff"} onChange={e=>set("varderingar_icon_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Värdekort</h4>
          {(data.varderingar_values||[]).map((v, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("varderingar_values",data.varderingar_values.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Titel</label>
                <input value={v.title||""} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],title:e.target.value};set("varderingar_values",s);}} placeholder="Priser" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Text</label>
                <textarea value={v.text||""} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],text:e.target.value};set("varderingar_values",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
              <div>
                <label className={lbl}>Ikon</label>
                <select value={v.icon||"Tag"} onChange={e=>{const s=[...data.varderingar_values];s[idx]={...s[idx],icon:e.target.value};set("varderingar_values",s);}} className={inp}>
                  <option value="none">— Ingen ikon</option>
                  <option value="Tag">🏷️ Tag</option>
                  <option value="HeartHandshake">🤝 HeartHandshake</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Ear">👂 Ear</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Award">🏆 Award</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                </select>
              </div>
            </div>
          ))}
          <button onClick={()=>set("varderingar_values",[...(data.varderingar_values||[]),{title:"",text:"",icon:"Tag"}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till värdering
          </button>
        </>}

        {section === "footer_malsattning" && <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Målsättning</span>
          </div>
          <h3 className="font-semibold text-slate-800">Målsättning</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.mal_bg||"#ffffff"} onChange={e=>set("mal_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.mal_eyebrow||""} onChange={e=>set("mal_eyebrow",e.target.value)} placeholder="Målsättning" className={inp}/>
            <TextColorPicker label="Färg" colorKey="mal_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.mal_title||""} onChange={e=>set("mal_title",e.target.value)} placeholder="Vår målsättning" className={inp}/>
            <TextColorPicker label="Färg" colorKey="mal_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro text</label>
            <textarea value={data.mal_intro||""} onChange={e=>set("mal_intro",e.target.value)} rows={3} placeholder="PureNorth Städ drivs med ambition..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="mal_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort 1 (Svanenmärkt)</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.mal_card_bg||"#ffffff"} onChange={e=>set("mal_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_card_title_color||"#141414"} onChange={e=>set("mal_card_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_card_text_color||"#475569"} onChange={e=>set("mal_card_text_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 titel</label>
            <input value={data.mal_card1_title||""} onChange={e=>set("mal_card1_title",e.target.value)} placeholder="Miljövänliga val är viktiga för oss" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 text</label>
            <textarea value={data.mal_card1_text||""} onChange={e=>set("mal_card1_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Kort 1 bild</label>
            {data.mal_card1_img && <div className="relative mb-2"><img src={data.mal_card1_img} alt="" className="w-full h-24 object-contain rounded-lg border"/><button onClick={()=>set("mal_card1_img","")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
            <input ref={mal1ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "mal_card1_img")}/>
            <button onClick={() => mal1ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
              <Upload size={12}/> {data.mal_card1_img ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 400×400px</p>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Kort 2 (Trygg arbetsplats)</h4>
          <div>
            <label className={lbl}>Kort 2 titel</label>
            <input value={data.mal_card2_title||""} onChange={e=>set("mal_card2_title",e.target.value)} placeholder="En trygg arbetsplats" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Kort 2 text</label>
            <textarea value={data.mal_card2_text||""} onChange={e=>set("mal_card2_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Kort 2 bild</label>
            {data.mal_card2_img && <div className="relative mb-2"><img src={data.mal_card2_img} alt="" className="w-full h-24 object-cover rounded-lg"/><button onClick={()=>set("mal_card2_img","")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
            <input ref={mal2ImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "mal_card2_img")}/>
            <button onClick={() => mal2ImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
              <Upload size={12}/> {data.mal_card2_img ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 900×600px</p>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Check-kort färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Kort BG</span>
            <CircleColor value={data.mal_check_card_bg||"#ffffff"} onChange={e=>set("mal_check_card_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.mal_check_icon_bg||"#141414"} onChange={e=>set("mal_check_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.mal_check_icon_color||"#ffffff"} onChange={e=>set("mal_check_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_check_title_color||"#141414"} onChange={e=>set("mal_check_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_check_text_color||"#475569"} onChange={e=>set("mal_check_text_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Check 1 ikon</label>
            <select value={data.mal_check1_icon||"Check"} onChange={e=>set("mal_check1_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Check 1 titel</label>
            <input value={data.mal_check1_title||""} onChange={e=>set("mal_check1_title",e.target.value)} placeholder="Hög kvalité" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Check 1 text</label>
            <textarea value={data.mal_check1_text||""} onChange={e=>set("mal_check1_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Check 2 ikon</label>
            <select value={data.mal_check2_icon||"Clock"} onChange={e=>set("mal_check2_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Check 2 titel</label>
            <input value={data.mal_check2_title||""} onChange={e=>set("mal_check2_title",e.target.value)} placeholder="Klart inom 24 timmar" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Check 2 text</label>
            <textarea value={data.mal_check2_text||""} onChange={e=>set("mal_check2_text",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">SRY-sektion</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.mal_sry_bg||"#141414"} onChange={e=>set("mal_sry_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Titel</span>
            <CircleColor value={data.mal_sry_title_color||"#ffffff"} onChange={e=>set("mal_sry_title_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.mal_sry_text_color||"#ffffff"} onChange={e=>set("mal_sry_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon BG</span>
            <CircleColor value={data.mal_sry_icon_bg||"#ffffff"} onChange={e=>set("mal_sry_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span>
            <CircleColor value={data.mal_sry_icon_color||"#141414"} onChange={e=>set("mal_sry_icon_color",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>SRY ikon</label>
            <select value={data.mal_sry_icon||"Award"} onChange={e=>set("mal_sry_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
                  <option value="Check">✅ Check</option>
                  <option value="Clock">🕐 Clock</option>
                  <option value="Award">🏆 Award</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Home">🏠 Home</option>
                  <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div>
            <label className={lbl}>SRY rubrik</label>
            <input value={data.mal_sry_title||""} onChange={e=>set("mal_sry_title",e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
          </div>
          <div>
            <label className={lbl}>SRY text 1</label>
            <textarea value={data.mal_sry_text1||""} onChange={e=>set("mal_sry_text1",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>SRY text 2</label>
            <textarea value={data.mal_sry_text2||""} onChange={e=>set("mal_sry_text2",e.target.value)} rows={2} className={inp+" resize-none"}/>
          </div>
        </>}

        {section === "footer_integritet" && <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={()=>setSection("footer")} className="text-sm text-slate-500 hover:text-slate-800">← Footer</button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-800">Integritetspolicy</span>
          </div>
          <h3 className="font-semibold text-slate-800">Integritetspolicy</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Sida BG</span>
            <CircleColor value={data.integritet_bg||"#ffffff"} onChange={e=>set("integritet_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.integritet_eyebrow||""} onChange={e=>set("integritet_eyebrow",e.target.value)} placeholder="GDPR – Integritetspolicy" className={inp}/>
            <TextColorPicker label="Färg" colorKey="integritet_eyebrow_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.integritet_title||""} onChange={e=>set("integritet_title",e.target.value)} placeholder="Integritetspolicy GDPR" className={inp}/>
            <TextColorPicker label="Färg" colorKey="integritet_title_color" defaultColor="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Intro</label>
            <textarea value={data.integritet_intro||""} onChange={e=>set("integritet_intro",e.target.value)} rows={2} placeholder="Vi på PureNorth Städ värnar om din personliga integritet..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="integritet_intro_color" defaultColor="#475569" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Sektioner färger</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Rubrik</span>
            <CircleColor value={data.integritet_heading_color||"#141414"} onChange={e=>set("integritet_heading_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Text</span>
            <CircleColor value={data.integritet_text_color||"#475569"} onChange={e=>set("integritet_text_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Bullet</span>
            <CircleColor value={data.integritet_bullet_color||"#141414"} onChange={e=>set("integritet_bullet_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Sektioner</h4>
          {(data.integritet_sections||[]).map((sec, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("integritet_sections", data.integritet_sections.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div>
                <label className={lbl}>Rubrik</label>
                <input value={sec.heading||""} onChange={e=>{const s=[...data.integritet_sections];s[idx]={...s[idx],heading:e.target.value};set("integritet_sections",s);}} placeholder="1. Allmänt" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Text</label>
                <textarea value={sec.text||""} onChange={e=>{const s=[...data.integritet_sections];s[idx]={...s[idx],text:e.target.value};set("integritet_sections",s);}} rows={3} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("integritet_sections",[...(data.integritet_sections||[]),{heading:"",text:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till sektion
          </button>
        </>}

        {section === "vartarbete" && <VartArbeteSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "admin" && <AdminSection data={data} set={set} inp={inp} lbl={lbl} logoRef={logoRef} uploadImage={uploadImage}/>}

        {section === "seo" && <SeoSection data={data} set={set} inp={inp} lbl={lbl}/>}



        {section === "testimonials" && <TestimonialsSection data={data} set={set} inp={inp} lbl={lbl}/>}

        {section === "about" && <AboutSection data={data} set={set} inp={inp} lbl={lbl} aboutImgRef={aboutImgRef} uploadImage={uploadImage}/>}

        </div>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        💡 Ändringar syns direkt på webbplatsen efter att du sparar.
      </div>
    </div>
  );
}
// reset fix Thu Jul  2 00:35:23 UTC 2026
// Thu Jul  2 00:43:24 UTC 2026
// force
// Sat Jul  4 00:10:21 UTC 2026
// Sat Jul  4 10:13:46 UTC 2026
