import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save, Upload, Globe, Phone, Image, Type, Info, MapPin, Award, Layers, Plus, Trash2, Menu, Search, Palette, Star } from "lucide-react";

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

function TextColorPicker({ label, colorKey, data, set }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">{label}</span>
      <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
        Text
        <CircleColor value={data[colorKey] || "#141414"} onChange={e => set(colorKey, e.target.value)}/>
      </label>
      {data[colorKey] && <button onClick={() => set(colorKey, "")} className="text-xs text-red-400 hover:text-red-600">↺</button>}
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
          <h4 className="font-medium text-slate-700 mb-2">Footer länkar</h4>
          {[
            {key:"faq", label:"Vanliga frågor", href:"/faq"},
            {key:"kundavtal", label:"Kundavtal", href:"/kundavtal"},
            {key:"nojd", label:"Nöjd kundgaranti", href:"/nojd-kundgaranti"},
            {key:"varderingar", label:"Värderingar", href:"/varderingar"},
            {key:"malsattning", label:"Målsättning", href:"/malsattning"},
            {key:"integritet", label:"Integritetspolicy", href:"/integritetspolicy"},
          ].map(({key, label}) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button type="button" onClick={()=>set(`show_footer_${key}`, data[`show_footer_${key}`] === false ? true : false)}
                  className={`w-10 h-5 rounded-full transition-colors ${data[`show_footer_${key}`] !== false ? "bg-blue-500" : "bg-slate-200"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${data[`show_footer_${key}`] !== false ? "translate-x-5" : "translate-x-0"}`}/>
                </button>
                <span className="text-sm text-slate-700">{label}</span>
              </div>
              <CircleColor value={data[`footer_${key}_color`]||"#475569"} onChange={e=>set(`footer_${key}_color`,e.target.value)}/>
            </div>
          ))}
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
            <button key={key} onClick={()=>setSection(`footer_${key}`)}
              className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl hover:border-slate-400 transition-colors">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <span className="text-slate-400">→</span>
            </button>
          ))}
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
