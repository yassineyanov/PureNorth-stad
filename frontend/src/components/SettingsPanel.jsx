import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save, Upload, Globe, Phone, Image, Type, Info, MapPin, Award, Layers, Plus, Trash2, Menu, Search, Palette, Star, ExternalLink, ClipboardList } from "lucide-react";

const SECTIONS = [
  { id: "hero", label: "Hero", icon: Type },
  { id: "contact", label: "Kontakt", icon: Phone },
  { id: "media", label: "Bilder & Logo", icon: Image },
  { id: "social", label: "Sociala medier", icon: Globe },
  { id: "about", label: "Om oss", icon: Info },
  { id: "kontaktsektion", label: "Kontaktsektion", icon: MapPin },
  { id: "whyus", label: "Varför oss", icon: Award },
  { id: "services", label: "Tjänster", icon: Layers },
  { id: "navbar", label: "Navbar", icon: Menu },
  { id: "seo", label: "SEO", icon: Search },
  { id: "vartarbete", label: "Vårt arbete", icon: Image },
  { id: "booking", label: "Bokningsformulär", icon: ClipboardList },
  { id: "footer", label: "Footer", icon: Layers },
  { id: "testimonials", label: "Omdömen", icon: Star },
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
  const [section, setSection] = useState("hero");
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
              contact_box_title: "Redo att boka?",
              contact_box_text: "Vi erbjuder professionell städning anpassad efter dina behov. Kontakta oss idag!",
              contact_box_btn: "Boka tid",
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

        {section === "contact" && <>
          <h3 className="font-semibold text-slate-800">Kontaktuppgifter</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontaktuppgifter</label>
            <button type="button" onClick={()=>set("show_kontaktuppgifter", data.show_kontaktuppgifter === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontaktuppgifter !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontaktuppgifter !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Företagsnamn</label>
            <button type="button" onClick={()=>set("show_company_name", data.show_company_name === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_company_name !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_company_name !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.company_name} onChange={e => set("company_name", e.target.value)} placeholder="PureNorth Städ" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="company_name_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Telefonnummer</label>
            <button type="button" onClick={()=>set("show_phone", data.show_phone === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_phone !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_phone !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="070-624 04 03" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="phone_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.phone_icon_color||"#166534"} onChange={e=>set("phone_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>E-post</label>
            <button type="button" onClick={()=>set("show_email", data.show_email === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_email !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_email !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.email} onChange={e => set("email", e.target.value)} placeholder="info@purenorth.se" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="email_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.email_icon_color||"#166534"} onChange={e=>set("email_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Adress</label>
            <button type="button" onClick={()=>set("show_address", data.show_address === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_address !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_address !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.address} onChange={e => set("address", e.target.value)} placeholder="Storgatan 1, Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="address_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.address_icon_color||"#166534"} onChange={e=>set("address_icon_color",e.target.value)}/>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Öppettider</label>
            <button type="button" onClick={()=>set("show_opening_hours", data.show_opening_hours === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_opening_hours !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_opening_hours !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.opening_hours} onChange={e => set("opening_hours", e.target.value)} placeholder="Mån–Fre: 08:00–18:00" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="opening_hours_color" data={data} set={set}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Ikon färg</span>
              <CircleColor value={data.hours_icon_color||"#166534"} onChange={e=>set("hours_icon_color",e.target.value)}/>
            </div>
          </div>
        </>}

        {section === "media" && <>
          <h3 className="font-semibold text-slate-800">Bilder & Logotyp</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Logotyp</label>
            <button type="button" onClick={()=>set("show_logo", data.show_logo === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_logo !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_logo !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <label className={lbl}>Logotyp</label>
            {data.logo_url && <img src={data.logo_url} alt="Logo" className="h-16 mb-3 rounded-xl border border-slate-100 p-2"/>}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "logo_url")}/>
            <button onClick={() => logoRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> Ladda upp logotyp
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 200×200px · PNG med transparent bakgrund</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Hero-bild (stor bild på startsidan)</label>
            <button type="button" onClick={()=>set("show_hero_image", !data.show_hero_image)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_hero_image !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_hero_image !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            {data.hero_image && <img src={data.hero_image} alt="Hero" className="w-full h-32 object-cover rounded-xl mb-3"/>}
            <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "hero_image")}/>
            <button onClick={() => heroImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> Ladda upp hero-bild
            </button>
            <p className="text-xs text-slate-400 mt-2">Rekommenderad storlek: 1200×600px</p>
          </div>
        </>}

        {section === "social" && <>
          <h3 className="font-semibold text-slate-800">Sociala medier</h3>
          <div>
            <label className={lbl}>Facebook URL</label>
            <input value={data.facebook_url} onChange={e => set("facebook_url", e.target.value)} placeholder="https://facebook.com/purenorth" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Instagram URL</label>
            <input value={data.instagram_url} onChange={e => set("instagram_url", e.target.value)} placeholder="https://instagram.com/purenorth" className={inp}/>
          </div>
        </>}

        {section === "kontaktsektion" && <>
          <h3 className="font-semibold text-slate-800">Kontaktsektion</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Kontakt i Navbar</label>
            <button type="button" onClick={()=>set("show_kontakt_in_navbar", data.show_kontakt_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_kontakt_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_kontakt_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett (liten text ovan rubrik)</label>
            <button type="button" onClick={()=>set("show_contact_title", data.show_contact_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_title||""} onChange={e=>set("contact_title",e.target.value)} placeholder="Kontakt" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_title_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_contact_subtitle", data.show_contact_subtitle === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_subtitle !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_subtitle !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.contact_subtitle||""} onChange={e=>set("contact_subtitle",e.target.value)} placeholder="Vi finns i Umeå" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_subtitle_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Undertext</label>
            <button type="button" onClick={()=>set("show_contact_description", data.show_contact_description === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_description !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_description !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.contact_description||""} onChange={e=>set("contact_description",e.target.value)} rows={3} placeholder="Har du frågor eller vill boka en städning?" className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="contact_description_color" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Svart box (höger)</h4>
          <div>
            <div className="flex items-center justify-between mb-1"><label className={lbl}>Svart box (visa/göm)</label><button type="button" onClick={()=>set("show_contact_box", data.show_contact_box === false ? true : false)} className={`w-10 h-5 rounded-full transition-colors ${data.show_contact_box !== false ? "bg-blue-500" : "bg-slate-200"}`}><span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_contact_box !== false ? "translate-x-5" : "translate-x-0"}`}/></button></div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.contact_box_title||""} onChange={e=>set("contact_box_title",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="contact_box_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <textarea value={data.contact_box_text||""} onChange={e=>set("contact_box_text",e.target.value)} rows={3} placeholder="Miljövänlig städning med SRY-utbildad personal..." className={inp+" resize-none"}/>
            <ColorPicker label="Box BG" colorKey="contact_box_text_color" bgKey="contact_box_bg" defaultColor="rgba(255,255,255,0.75)" defaultBg="#141414" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Box knapp text</label>
            <input value={data.contact_box_btn||""} onChange={e=>set("contact_box_btn",e.target.value)} placeholder="Boka tid nu" className={inp}/>
            <ColorPicker label="Knapp färger" colorKey="contact_box_btn_color" bgKey="contact_box_btn_bg" defaultColor="#141414" defaultBg="#ffffff" data={data} set={set}/>
          </div>
        </>}

        {section === "whyus" && <>
          <h3 className="font-semibold text-slate-800">Varför välja oss?</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar & sidan</label>
            <button type="button" onClick={()=>set("show_whyus_in_navbar", data.show_whyus_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett</label>
            <button type="button" onClick={()=>set("show_whyus_label", data.show_whyus_label === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <input value={data.whyus_label||""} onChange={e=>set("whyus_label",e.target.value)} placeholder="Varför välja oss?" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="whyus_label_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_whyus_title", data.show_whyus_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_whyus_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_whyus_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <textarea value={data.whyus_title||""} onChange={e=>set("whyus_title",e.target.value)} rows={2} placeholder="Kvalitet du känner och naturen tackar för" className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="whyus_title_color" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🏆 Stort svart kort (SRY)</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa SRY-kort</label>
            <button type="button" onClick={()=>set("show_sry_card", data.show_sry_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_sry_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_sry_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.sry_title||""} onChange={e=>set("sry_title",e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="sry_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.sry_text||""} onChange={e=>set("sry_text",e.target.value)} rows={3} placeholder="Med kvalifikation från Servicebranschens..." className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="sry_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Taggar (kommaseparerade)</label>
            <input value={data.sry_tags||""} onChange={e=>set("sry_tags",e.target.value)} placeholder="SRY-utbildad personal, Hög standard, Trygg & försäkrad" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.sry_icon||"Award"} onChange={e=>set("sry_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.sry_icon_color||"#ffffff"} onChange={e=>set("sry_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.sry_bg||"#141414"} onChange={e=>set("sry_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🌿 Eco-kort</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa Eco-kort</label>
            <button type="button" onClick={()=>set("show_eco_card", data.show_eco_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_eco_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_eco_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.eco_title||""} onChange={e=>set("eco_title",e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="eco_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.eco_text||""} onChange={e=>set("eco_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="eco_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.eco_icon||"Leaf"} onChange={e=>set("eco_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.eco_icon_color||"#166534"} onChange={e=>set("eco_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.eco_card_bg||"#ffffff"} onChange={e=>set("eco_card_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">💰 RUT-kort</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa RUT-kort</label>
            <button type="button" onClick={()=>set("show_rut_card", data.show_rut_card === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_rut_card !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_rut_card !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
            <label className={lbl}>Rubrik</label>
            <input value={data.rut_title||""} onChange={e=>set("rut_title",e.target.value)} placeholder="50% RUT-avdrag" className={inp}/>
            <TextColorPicker label="Rubrik färg" colorKey="rut_title_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.rut_text||""} onChange={e=>set("rut_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="rut_text_color" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.rut_icon||"Percent"} onChange={e=>set("rut_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="Award">🏆 Award</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Percent">% Percent</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">Ikon färg</span>
            <CircleColor value={data.rut_icon_color||"#166534"} onChange={e=>set("rut_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500 ml-2">Kort BG</span>
            <CircleColor value={data.rut_card_bg||"#ffffff"} onChange={e=>set("rut_card_bg",e.target.value)}/>
          </div>
        </>}

        {section === "services" && <>
          <h3 className="font-semibold text-slate-800">Tjänster</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_tjanster_in_navbar", data.show_tjanster_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_tjanster_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_tjanster_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Etikett</label>
            <button type="button" onClick={()=>set("show_services_label", data.show_services_label === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_services_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_services_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.services_label||""} onChange={e=>set("services_label",e.target.value)} placeholder="Våra tjänster" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="services_label_color" data={data} set={set}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Rubrik</label>
            <button type="button" onClick={()=>set("show_services_title", data.show_services_title === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_services_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_services_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.services_title||""} onChange={e=>set("services_title",e.target.value)} placeholder="Städtjänster för hem och företag" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="services_title_color" data={data} set={set}/>
            </div>
          </div>

          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänstekort</h4>
          {(data.services||[]).map((svc, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Kort {idx+1}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={()=>{const s=[...data.services];s[idx]={...s[idx],show:s[idx].show===false?true:false};set("services",s);}}
                    className={`w-10 h-5 rounded-full transition-colors ${svc.show!==false?"bg-blue-500":"bg-slate-200"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${svc.show!==false?"translate-x-5":"translate-x-0"}`}/>
                  </button>
                  <button onClick={()=>set("services", data.services.filter((_,i)=>i!==idx))}
                    className="text-slate-400 hover:text-red-500">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              <div>
                <label className={lbl}>Namn</label>
                <input value={svc.title||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],title:e.target.value};set("services",s);}} placeholder="Hemstädning" className={inp}/>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Färg</span>
                  <CircleColor value={svc.title_color||"#0f172a"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],title_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Beskrivning</label>
                <textarea value={svc.desc||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],desc:e.target.value};set("services",s);}} rows={2} className={inp+" resize-none"}/>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Färg</span>
                  <CircleColor value={svc.desc_color||"#475569"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],desc_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Ikon</label>
                <select value={svc.icon_name||"Home"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],icon_name:e.target.value};set("services",s);}} className={inp}>
                  <option value="Home">🏠 Home</option>
                  <option value="Truck">🚚 Truck</option>
                  <option value="Building2">🏢 Building2</option>
                  <option value="Sparkles">✨ Sparkles</option>
                  <option value="Leaf">🌿 Leaf</option>
                  <option value="ShieldCheck">🛡️ ShieldCheck</option>
                  <option value="Star">⭐ Star</option>
                  <option value="Heart">❤️ Heart</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Award">🏆 Award</option>
                </select>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Ikon färg</span>
                  <CircleColor value={svc.icon_color||"#166534"} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],icon_color:e.target.value};set("services",s);}}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Bild</label>
                {svc.img && <div className="relative mb-2"><img src={svc.img} alt="" className="w-full h-24 object-cover rounded-lg"/><button onClick={()=>{const s=[...data.services];s[idx]={...s[idx],img:""};set("services",s);}} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs">✕</button></div>}
                <input type="file" accept="image/*" className="hidden" id={`svc-img-${idx}`} onChange={async e=>{
                  if(!e.target.files[0]) return;
                  const url = await uploadImage(e.target.files[0], `service${idx}_img`);
                  const s=[...data.services];s[idx]={...s[idx],img:url};set("services",s);
                }}/>
                <button onClick={()=>document.getElementById(`svc-img-${idx}`).click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-xs hover:border-slate-400">
                  <Upload size={12}/> {svc.img ? "Byt bild" : "Ladda upp bild"}
                </button>
                <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 940×650px</p>
              </div>
            </div>
          ))}
          <button onClick={()=>set("services",[...(data.services||[]),{title:"",desc:"",img:"",show:true,icon_name:"Home",icon_color:"#166534"}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>}

        {section === "navbar" && <>
          <h3 className="font-semibold text-slate-800">Navbar</h3>
          <div>
            <label className={lbl}>Navbar BG färg</label>
            <div className="flex items-center gap-2 mt-1">
              <CircleColor value={data.navbar_bg||"#ffffff"} onChange={e=>set("navbar_bg",e.target.value)}/>
              <span className="text-xs text-slate-400">Bakgrundsfärg</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Företagsnamn</label>
            <button type="button" onClick={()=>set("show_navbar_company", data.show_navbar_company === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_company !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_company !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.nav_company||""} onChange={e=>set("nav_company",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">Färg</span>
                <CircleColor value={data.navbar_company_color||"#0f172a"} onChange={e=>set("navbar_company_color",e.target.value)}/>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Boka-knapp</label>
            <button type="button" onClick={()=>set("show_navbar_btn", data.show_navbar_btn === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
              <input value={data.nav_boka_text||""} onChange={e=>set("nav_boka_text",e.target.value)} placeholder="Boka tid" className={inp}/>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500">Text</span>
                <CircleColor value={data.navbar_btn_color||"#ffffff"} onChange={e=>set("navbar_btn_color",e.target.value)}/>
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.navbar_btn_bg||"#141414"} onChange={e=>set("navbar_btn_bg",e.target.value)}/>
              </div>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Menylänkar</label>
            <button type="button" onClick={()=>set("show_navbar_links", data.show_navbar_links === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_navbar_links !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_navbar_links !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">Länk färg</span>
            <CircleColor value={data.navbar_link_color||"#475569"} onChange={e=>set("navbar_link_color",e.target.value)}/>
          </div>
          {(data.nav_links||[]).map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={link.label||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],label:e.target.value};set("nav_links",l);}}
                placeholder="Länktext" className={inp}/>
              <select value={link.href||""} onChange={e=>{
                const l=[...data.nav_links];
                l[idx]={...l[idx],href:e.target.value==="custom" ? "" : e.target.value};
                set("nav_links",l);
              }} className={inp}>
                <optgroup label="— Samma sida —">
                  <option value="/#tjanster">Tjänster (/#tjanster)</option>
                  <option value="/#kontakt">Kontakt (/#kontakt)</option>
                  <option value="/#boka">Boka (/#boka)</option>
                  <option value="/#vart-arbete">Vårt arbete (/#vart-arbete)</option>
                  <option value="/#omdomen">Omdömen (/#omdomen)</option>
                  <option value="/#varfor-oss">Varför oss (/#varfor-oss)</option>
                </optgroup>
                <optgroup label="— Annan sida —">
                  <option value="/om-oss">Om oss (/om-oss)</option>
                  <option value="/faq">FAQ (/faq)</option>
                  <option value="/kundavtal">Kundavtal</option>
                  <option value="custom">✏️ Anpassad länk...</option>
                </optgroup>
              </select>
              {(!link.href || !["/#tjanster","/#kontakt","/#boka","/#vart-arbete","/#omdomen","/#varfor-oss","/om-oss","/faq","/kundavtal"].includes(link.href)) && (
                <input value={link.href||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],href:e.target.value};set("nav_links",l);}}
                  placeholder="https://..." className={inp}/>
              )}
              <button onClick={()=>set("nav_links",data.nav_links.filter((_,i)=>i!==idx))}
                className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nav_links",[...(data.nav_links||[]),{label:"",href:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till länk
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

        {section === "vartarbete" && <>
          <h3 className="font-semibold text-slate-800">Vårt arbete – Före & efter</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_vart_in_navbar", data.show_vart_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_vart_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_vart_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Visa sektion</label>
            <button type="button" onClick={()=>set("show_vart", data.show_vart === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_vart !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_vart !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">BG</span>
            <CircleColor value={data.vart_bg||"#141414"} onChange={e=>set("vart_bg",e.target.value)}/>
          </div>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.vart_label||""} onChange={e=>set("vart_label",e.target.value)} placeholder="Vårt arbete" className={inp}/>
            <TextColorPicker label="Färg" colorKey="vart_label_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.vart_title||""} onChange={e=>set("vart_title",e.target.value)} placeholder="Före & efter" className={inp}/>
            <TextColorPicker label="Färg" colorKey="vart_title_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.vart_subtitle||""} onChange={e=>set("vart_subtitle",e.target.value)} rows={2} placeholder="Dra i reglaget för att se skillnaden..." className={inp+" resize-none"}/>
            <TextColorPicker label="Färg" colorKey="vart_subtitle_color" defaultColor="#ffffff" data={data} set={set}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Labels & färger</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Före label text</label>
              <input value={data.vart_fore_label||""} onChange={e=>set("vart_fore_label",e.target.value)} placeholder="Före" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.vart_fore_label_bg||"#141414"} onChange={e=>set("vart_fore_label_bg",e.target.value)}/>
              </div>
            </div>
            <div>
              <label className={lbl}>Efter label text</label>
              <input value={data.vart_efter_label||""} onChange={e=>set("vart_efter_label",e.target.value)} placeholder="Efter" className={inp}/>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">BG</span>
                <CircleColor value={data.vart_efter_label_bg||"#166534"} onChange={e=>set("vart_efter_label_bg",e.target.value)}/>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Handle färg</span>
            <CircleColor value={data.vart_handle_color||"#141414"} onChange={e=>set("vart_handle_color",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Bilder (Före & Efter)</h4>
          {(data.vart_slides||[]).map((slide, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2 relative">
              <button onClick={()=>set("vart_slides",data.vart_slides.filter((_,i)=>i!==idx))}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-slate-600">Bild {idx+1}: {slide.alt||""}</p>
                <button type="button" onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],show:s[idx].show===false?true:false};set("vart_slides",s);}}
                  className={`w-10 h-5 rounded-full transition-colors ${slide.show!==false?"bg-blue-500":"bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${slide.show!==false?"translate-x-5":"translate-x-0"}`}/>
                </button>
              </div>
              <input value={slide.alt||""} onChange={e=>{const s=[...data.vart_slides];s[idx]={...s[idx],alt:e.target.value};set("vart_slides",s);}} placeholder="Alt text (t.ex. Sovrum)" className={inp}/>
              <div>
                <label className={lbl}>Visningsläge</label>
                <select value={slide.mode||"slider"} onChange={e=>{const s=[...data.vart_slides];s[idx]={...s[idx],mode:e.target.value};set("vart_slides",s);}} className={inp}>
                  <option value="slider">↔️ Före & efter slider</option>
                  <option value="before">📷 Bara Före-bild</option>
                  <option value="after">📷 Bara Efter-bild</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Före bild</label>
                  {slide.before && <div className="relative mb-1"><img src={slide.before} alt="" className="w-full h-16 object-cover rounded"/><button onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],before:""};set("vart_slides",s);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-4 w-4 text-xs">✕</button></div>}
                  <input id={`vart-before-${idx}`} type="file" accept="image/*" className="hidden" onChange={async e=>{if(!e.target.files[0])return;const url=await uploadImage(e.target.files[0],`vart_before_${idx}`);const s=[...data.vart_slides];s[idx]={...s[idx],before:url};set("vart_slides",s);}}/>
                  <button onClick={()=>document.getElementById(`vart-before-${idx}`).click()} className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs hover:border-slate-400"><Upload size={10}/> {slide.before?"Byt":"Ladda upp"}</button>
                </div>
                <div>
                  <label className={lbl}>Efter bild</label>
                  {slide.after && <div className="relative mb-1"><img src={slide.after} alt="" className="w-full h-16 object-cover rounded"/><button onClick={()=>{const s=[...data.vart_slides];s[idx]={...s[idx],after:""};set("vart_slides",s);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-4 w-4 text-xs">✕</button></div>}
                  <input id={`vart-after-${idx}`} type="file" accept="image/*" className="hidden" onChange={async e=>{if(!e.target.files[0])return;const url=await uploadImage(e.target.files[0],`vart_after_${idx}`);const s=[...data.vart_slides];s[idx]={...s[idx],after:url};set("vart_slides",s);}}/>
                  <button onClick={()=>document.getElementById(`vart-after-${idx}`).click()} className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs hover:border-slate-400"><Upload size={10}/> {slide.after?"Byt":"Ladda upp"}</button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={()=>set("vart_slides",[...(data.vart_slides||[]),{before:"",after:"",alt:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till bild
          </button>
        </>}


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
            <span className="text-xs text-slate-500">BG färg</span>
            <CircleColor value={data.booking_bg||"#141414"} onChange={e=>set("booking_bg",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Vänster sida</h4>
          <div>
            <label className={lbl}>Etikett (liten text)</label>
            <input value={data.booking_left_label||""} onChange={e=>set("booking_left_label",e.target.value)} placeholder="Boka tid" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_label_color||"rgba(255,255,255,0.5)"} onChange={e=>set("booking_left_label_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_left_title||""} onChange={e=>set("booking_left_title",e.target.value)} placeholder="Boka online eller ring oss" className={inp}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_title_color||"#ffffff"} onChange={e=>set("booking_left_title_color",e.target.value)}/></div>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.booking_left_subtitle||""} onChange={e=>set("booking_left_subtitle",e.target.value)} rows={2} placeholder="Fyll i formuläret..." className={inp+" resize-none"}/>
            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Färg</span><CircleColor value={data.booking_left_subtitle_color||"rgba(255,255,255,0.7)"} onChange={e=>set("booking_left_subtitle_color",e.target.value)}/></div>
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
          <div>
            <label className={lbl}>Ikon</label>
            <select value={data.booking_phone_btn_icon||"Phone"} onChange={e=>set("booking_phone_btn_icon",e.target.value)} className={inp}>
              <option value="Phone">📞 Phone</option>
              <option value="Smartphone">📱 Smartphone</option>
              <option value="MessageCircle">💬 MessageCircle</option>
              <option value="none">— Ingen ikon</option>
            </select>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Ikon BG</span><CircleColor value={data.booking_phone_btn_icon_bg||"#ffffff"} onChange={e=>set("booking_phone_btn_icon_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Ikon</span><CircleColor value={data.booking_phone_btn_icon_color||"#141414"} onChange={e=>set("booking_phone_btn_icon_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span><CircleColor value={data.booking_phone_btn_label_color||"rgba(255,255,255,0.5)"} onChange={e=>set("booking_phone_btn_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Nummer</span><CircleColor value={data.booking_phone_btn_number_color||"#ffffff"} onChange={e=>set("booking_phone_btn_number_color",e.target.value)}/>
            <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_phone_btn_bg||"rgba(255,255,255,0.06)"} onChange={e=>set("booking_phone_btn_bg",e.target.value)}/>
          </div>

          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Höger sida (formulär)</h4>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Form BG</span>
            <CircleColor value={data.booking_form_bg||"#1a1a1a"} onChange={e=>set("booking_form_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Label</span>
            <CircleColor value={data.booking_form_label_color||"#b3b3b3"} onChange={e=>set("booking_form_label_color",e.target.value)}/>
            <span className="text-xs text-slate-500">Input BG</span>
            <CircleColor value={data.booking_form_input_bg||"#1f1f1f"} onChange={e=>set("booking_form_input_bg",e.target.value)}/>
            <span className="text-xs text-slate-500">Input text</span>
            <CircleColor value={data.booking_form_input_text||"#ffffff"} onChange={e=>set("booking_form_input_text",e.target.value)}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Skicka-knapp</h4>
          <div>
            <label className={lbl}>Knapp text</label>
            <input value={data.booking_submit_text||""} onChange={e=>set("booking_submit_text",e.target.value)} placeholder="Skicka bokningsförfrågan" className={inp}/>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Text</span><CircleColor value={data.booking_submit_color||"#141414"} onChange={e=>set("booking_submit_color",e.target.value)}/>
              <span className="text-xs text-slate-500">BG</span><CircleColor value={data.booking_submit_bg||"#ffffff"} onChange={e=>set("booking_submit_bg",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Success meddelande</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.booking_success_title||""} onChange={e=>set("booking_success_title",e.target.value)} placeholder="Tack för din förfrågan!" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <input value={data.booking_success_text||""} onChange={e=>set("booking_success_text",e.target.value)} placeholder="Vi återkommer inom 24 timmar." className={inp}/>
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

        {section === "seo" && <>
          <h3 className="font-semibold text-slate-800">SEO — Sökmotoroptimering</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-2">
            💡 SEO-inställningar hjälper Google att hitta och visa din webbplats korrekt.
          </div>
          <div>
            <label className={lbl}>Meta Title (sidrubrik i Google)</label>
            <input value={data.seo_title||""} onChange={e=>set("seo_title",e.target.value)}
              placeholder="PureNorth Städ – Professionell städning i Umeå"
              className={inp}/>
            <p className="text-xs text-slate-400 mt-1">Rekommenderat: 50–60 tecken ({(data.seo_title||"").length}/60)</p>
          </div>
          <div>
            <label className={lbl}>Meta Description (beskrivning i Google)</label>
            <textarea value={data.seo_description||""} onChange={e=>set("seo_description",e.target.value)}
              rows={3} placeholder="Vi erbjuder professionell hemstädning, flyttstädning och kontorsstädning i Umeå. SRY-utbildad personal och miljövänliga produkter."
              className={inp+" resize-none"}/>
            <p className="text-xs text-slate-400 mt-1">Rekommenderat: 150–160 tecken ({(data.seo_description||"").length}/160)</p>
          </div>
          <div>
            <label className={lbl}>Keywords (sökord, kommaseparerade)</label>
            <input value={data.seo_keywords||""} onChange={e=>set("seo_keywords",e.target.value)}
              placeholder="städning Umeå, hemstädning, flyttstädning, SRY"
              className={inp}/>
          </div>
          <div>
            <label className={lbl}>OG Image URL (bild som visas vid delning)</label>
            <input value={data.seo_og_image||""} onChange={e=>set("seo_og_image",e.target.value)}
              placeholder="https://..." className={inp}/>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 1200×630px</p>
          </div>
          {data.seo_title && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-2 font-medium">Förhandsgranskning i Google:</p>
              <p className="text-blue-600 text-sm font-medium">{data.seo_title}</p>
              <p className="text-green-700 text-xs">purenorth-stad.vercel.app</p>
              <p className="text-slate-600 text-xs mt-1">{data.seo_description}</p>
            </div>
          )}
        </>}



        {section === "testimonials" && <>
          <h3 className="font-semibold text-slate-800">Omdömen</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa Omdömen</label>
            <button type="button" onClick={()=>set("show_omdomen", data.show_omdomen === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_omdomen !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_omdomen !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Etikett</label>
              <button type="button" onClick={()=>set("show_testimonials_label", data.show_testimonials_label === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_testimonials_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_testimonials_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
              <input value={data.testimonials_label||""} onChange={e=>set("testimonials_label",e.target.value)} placeholder="Omdömen" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="testimonials_label_color" defaultColor="#141414" data={data} set={set}/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Rubrik</label>
              <button type="button" onClick={()=>set("show_testimonials_title", data.show_testimonials_title === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_testimonials_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_testimonials_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
              <input value={data.testimonials_title||""} onChange={e=>set("testimonials_title",e.target.value)} placeholder="Vad våra kunder säger" className={inp}/>
              <TextColorPicker label="Text färg" colorKey="testimonials_title_color" defaultColor="#141414" data={data} set={set}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Kort färger</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Kort BG</span>
              <CircleColor value={data.testimonials_card_bg||"#ffffff"} onChange={e=>set("testimonials_card_bg",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Ikon</span>
              <CircleColor value={data.testimonials_icon_color||"#141414"} onChange={e=>set("testimonials_icon_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Text</span>
              <CircleColor value={data.testimonials_text_color||"#334155"} onChange={e=>set("testimonials_text_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Namn</span>
              <CircleColor value={data.testimonials_name_color||"#0f172a"} onChange={e=>set("testimonials_name_color",e.target.value)}/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Roll</span>
              <CircleColor value={data.testimonials_role_color||"#64748b"} onChange={e=>set("testimonials_role_color",e.target.value)}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Featured omdömen</h4>
          <p className="text-xs text-slate-500 mb-3">Dessa visas alltid högst upp. Lämna tomt för att använda standardomdömena.</p>
          {(data.featured_reviews||[]).map((r, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 relative">
              <button onClick={()=>set("featured_reviews", data.featured_reviews.filter((_,i)=>i!==idx))}
                className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                <Trash2 size={14}/>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Namn</label>
                  <input value={r.name||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],name:e.target.value};set("featured_reviews",s);}} placeholder="Anna Andersson" className={inp}/>
                </div>
                <div>
                  <label className={lbl}>Roll</label>
                  <input value={r.role||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],role:e.target.value};set("featured_reviews",s);}} placeholder="Privatkund, Umeå" className={inp}/>
                </div>
              </div>
              <div>
                <label className={lbl}>Betyg (1-5)</label>
                <input type="number" min="1" max="5" step="0.5" value={r.rating||5} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],rating:Number(e.target.value)};set("featured_reviews",s);}} className={inp}/>
              </div>
              <div>
                <label className={lbl}>Omdöme</label>
                <textarea value={r.text||""} onChange={e=>{const s=[...data.featured_reviews];s[idx]={...s[idx],text:e.target.value};set("featured_reviews",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("featured_reviews",[...(data.featured_reviews||[]),{name:"",role:"",rating:5,text:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till omdöme
          </button>
        </>}

        {section === "about" && <>
          <h3 className="font-semibold text-slate-800">Om oss</h3>
          <div className="flex items-center justify-between mb-2">
            <label className={lbl}>Visa i Navbar</label>
            <button type="button" onClick={()=>set("show_about_in_navbar", data.show_about_in_navbar === false ? true : false)}
              className={`w-10 h-5 rounded-full transition-colors ${data.show_about_in_navbar !== false ? "bg-blue-500" : "bg-slate-200"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_in_navbar !== false ? "translate-x-5" : "translate-x-0"}`}/>
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Etikett (liten grön text)</label>
              <button type="button" onClick={()=>set("show_about_label", data.show_about_label === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_label !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_label !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Etikett färg</label>
              <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Färg<CircleColor value={data.about_label_color||"#166534"} onChange={e=>set("about_label_color",e.target.value)}/></label>
            </div>
            <input value={data.about_label||""} onChange={e=>set("about_label",e.target.value)} placeholder="Om oss" className={inp}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Rubrik</label>
              <button type="button" onClick={()=>set("show_about_title", data.show_about_title === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_title !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_title !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <input value={data.about_title||""} onChange={e=>set("about_title",e.target.value)} placeholder="Städning med hjärta & precision" className={inp}/>
            <TextColorPicker label="Text färg" colorKey="about_title_color" data={data} set={set}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Beskrivningstext</label>
              <button type="button" onClick={()=>set("show_about_text", data.show_about_text === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_text !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_text !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <textarea value={data.about_text||""} onChange={e => set("about_text", e.target.value)} rows={6} placeholder="Berätta om ditt företag..." className={inp + " resize-none"}/>
            <TextColorPicker label="Text färg" colorKey="about_text_color" data={data} set={set}/>
          </div>
          <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Statistik (3 siffror)</label>
              <button type="button" onClick={()=>set("show_about_stats", data.show_about_stats === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_stats !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_stats !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
          <h4 className="font-medium text-slate-700 mt-2">Statistik (3 siffror)</h4>
          <TextColorPicker label="Siffror färg" colorKey="about_stat_color" data={data} set={set}/>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Siffra 1</label>
              <input value={data.about_stat1_number||""} onChange={e=>set("about_stat1_number",e.target.value)} placeholder="100+" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 1</label>
              <input value={data.about_stat1_label||""} onChange={e=>set("about_stat1_label",e.target.value)} placeholder="Nöjda kunder" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Siffra 2</label>
              <input value={data.about_stat2_number||""} onChange={e=>set("about_stat2_number",e.target.value)} placeholder="5 (stjärna läggs till automatiskt)" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 2</label>
              <input value={data.about_stat2_label||""} onChange={e=>set("about_stat2_label",e.target.value)} placeholder="Betyg" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Siffra 3</label>
              <input value={data.about_stat3_number||""} onChange={e=>set("about_stat3_number",e.target.value)} placeholder="3 år" className={inp}/>
              <label className={lbl+" mt-1"}>Etikett 3</label>
              <input value={data.about_stat3_label||""} onChange={e=>set("about_stat3_label",e.target.value)} placeholder="Erfarenhet" className={inp}/>
            </div>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Punkter (3 fördelar)</h4>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 1</label>
              <button type="button" onClick={()=>set("show_about_point1", data.show_about_point1 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point1 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point1 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 1 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point1_color||"#374151"} onChange={e=>set("about_point1_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point1_icon_color||"#166534"} onChange={e=>set("about_point1_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point1_icon||"ShieldCheck"} onChange={e=>set("about_point1_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point1||""} onChange={e=>set("about_point1",e.target.value)} placeholder="SRY-certifierad personal" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 2</label>
              <button type="button" onClick={()=>set("show_about_point2", data.show_about_point2 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point2 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point2 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 2 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point2_color||"#374151"} onChange={e=>set("about_point2_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point2_icon_color||"#166534"} onChange={e=>set("about_point2_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point2_icon||"Leaf"} onChange={e=>set("about_point2_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point2||""} onChange={e=>set("about_point2",e.target.value)} placeholder="Svanenmärkta Pur-Eco produkter" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Punkt 3</label>
              <button type="button" onClick={()=>set("show_about_point3", data.show_about_point3 === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_point3 !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_point3 !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Punkt 3 färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_point3_color||"#374151"} onChange={e=>set("about_point3_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Ikon<CircleColor value={data.about_point3_icon_color||"#166534"} onChange={e=>set("about_point3_icon_color",e.target.value)}/></label>
              </div>
            </div>
            <select value={data.about_point3_icon||"Star"} onChange={e=>set("about_point3_icon",e.target.value)} className={inp}>
              <option value="none">— Ingen ikon</option>
              <option value="ShieldCheck">🛡️ ShieldCheck</option>
              <option value="Leaf">🌿 Leaf</option>
              <option value="Star">⭐ Star</option>
              <option value="Heart">❤️ Heart</option>
              <option value="Zap">⚡ Zap</option>
              <option value="Award">🏆 Award</option>
              <option value="CheckCircle">✅ CheckCircle</option>
              <option value="Sparkles">✨ Sparkles</option>
            </select>
            <input value={data.about_point3||""} onChange={e=>set("about_point3",e.target.value)} placeholder="50% RUT-avdrag på arbetskostnaden" className={inp}/>

          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Knapp (Boka städning)</label>
              <button type="button" onClick={()=>set("show_about_btn", data.show_about_btn === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_btn !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_btn !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className={lbl}>Knapp färger</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">Text<CircleColor value={data.about_btn_color||"#ffffff"} onChange={e=>set("about_btn_color",e.target.value)}/></label>
                <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">BG<CircleColor value={data.about_btn_bg||"#141414"} onChange={e=>set("about_btn_bg",e.target.value)}/></label>
              </div>
            </div>
            <input value={data.about_btn_text||""} onChange={e=>set("about_btn_text",e.target.value)} placeholder="Boka städning" className={inp}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Bild</label>
              <button type="button" onClick={()=>set("show_about_image", data.show_about_image === false ? true : false)}
                className={`w-10 h-5 rounded-full transition-colors ${data.show_about_image !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data.show_about_image !== false ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>
            <label className={lbl}>Bild på Om oss-sidan</label>
            {data.about_image && (
              <div className="relative mb-3">
                <img src={data.about_image} alt="Om oss" className="w-full h-48 object-cover rounded-xl border border-slate-100"/>
                <button onClick={()=>set("about_image","")} className="absolute top-2 right-2 bg-red-500 text-white rounded-full h-7 w-7 flex items-center justify-center text-xs hover:bg-red-600">✕</button>
              </div>
            )}
            <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], "about_image")}/>
            <button onClick={() => aboutImgRef.current.click()} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm hover:border-slate-400 transition-colors">
              <Upload size={14}/> {data.about_image ? "Byt bild" : "Ladda upp bild"}
            </button>
            <p className="text-xs text-slate-400 mt-1">Rekommenderad storlek: 1200×800px</p>
          </div>
        </>}

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
