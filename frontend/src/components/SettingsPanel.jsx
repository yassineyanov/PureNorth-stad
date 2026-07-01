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
  { id: "colors", label: "Färger", icon: Palette },
  { id: "testimonials", label: "Omdömen", icon: Star },
];

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
            <label className={lbl}>Badge-text (grön etikett)</label>
            <input value={data.hero_badge} onChange={e => set("hero_badge", e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Stor rubrik (H1)</label>
            <textarea value={data.hero_title} onChange={e => set("hero_title", e.target.value)} rows={3} placeholder="Renhet med norrländsk precision i Umeå." className={inp + " resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.hero_subtitle} onChange={e => set("hero_subtitle", e.target.value)} rows={3} placeholder="Vi definierar premiumstädning..." className={inp + " resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Knapptext (Boka-knapp)</label>
            <input value={data.cta_text} onChange={e => set("cta_text", e.target.value)} placeholder="Boka tid online" className={inp}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Badge 1 (under knapparna)</label>
              <input value={data.badge1} onChange={e => set("badge1", e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Badge 2</label>
              <input value={data.badge2} onChange={e => set("badge2", e.target.value)} placeholder="Pur-Eco produkter" className={inp}/>
            </div>
          </div>
        </>}

        {section === "contact" && <>
          <h3 className="font-semibold text-slate-800">Kontaktuppgifter</h3>
          <div>
            <label className={lbl}>Företagsnamn</label>
            <input value={data.company_name} onChange={e => set("company_name", e.target.value)} placeholder="PureNorth Städ" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Telefonnummer</label>
            <input value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="070-624 04 03" className={inp}/>
          </div>
          <div>
            <label className={lbl}>E-post</label>
            <input value={data.email} onChange={e => set("email", e.target.value)} placeholder="info@purenorth.se" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Adress</label>
            <input value={data.address} onChange={e => set("address", e.target.value)} placeholder="Storgatan 1, Umeå" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Öppettider</label>
            <input value={data.opening_hours} onChange={e => set("opening_hours", e.target.value)} placeholder="Mån–Fre: 08:00–18:00" className={inp}/>
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
            <label className={lbl}>Hero-bild (stor bild på startsidan)</label>
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
            <label className={lbl}>Etikett (liten text ovan rubrik)</label>
            <input value={data.contact_title||""} onChange={e=>set("contact_title",e.target.value)} placeholder="Kontakt" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.contact_subtitle||""} onChange={e=>set("contact_subtitle",e.target.value)} placeholder="Vi finns i Umeå" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Undertext</label>
            <textarea value={data.contact_description||""} onChange={e=>set("contact_description",e.target.value)} rows={3} placeholder="Har du frågor eller vill boka en städning?" className={inp+" resize-none"}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">Svart box (höger)</h4>
          <div>
            <label className={lbl}>Box rubrik</label>
            <input value={data.contact_box_title||""} onChange={e=>set("contact_box_title",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Box text</label>
            <textarea value={data.contact_box_text||""} onChange={e=>set("contact_box_text",e.target.value)} rows={3} placeholder="Miljövänlig städning med SRY-utbildad personal..." className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Box knapp text</label>
            <input value={data.contact_box_btn||""} onChange={e=>set("contact_box_btn",e.target.value)} placeholder="Boka tid nu" className={inp}/>
          </div>
        </>}

        {section === "whyus" && <>
          <h3 className="font-semibold text-slate-800">Varför välja oss?</h3>
          <div>
            <label className={lbl}>Etikett</label>
            <input value={data.whyus_label||""} onChange={e=>set("whyus_label",e.target.value)} placeholder="Varför välja oss?" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Rubrik</label>
            <textarea value={data.whyus_title||""} onChange={e=>set("whyus_title",e.target.value)} rows={2} placeholder="Kvalitet du känner och naturen tackar för" className={inp+" resize-none"}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🏆 Stort svart kort (SRY)</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.sry_title||""} onChange={e=>set("sry_title",e.target.value)} placeholder="SRY-kvalifikation" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.sry_text||""} onChange={e=>set("sry_text",e.target.value)} rows={3} placeholder="Med kvalifikation från Servicebranschens..." className={inp+" resize-none"}/>
          </div>
          <div>
            <label className={lbl}>Taggar (kommaseparerade)</label>
            <input value={data.sry_tags||""} onChange={e=>set("sry_tags",e.target.value)} placeholder="SRY-utbildad personal, Hög standard, Trygg & försäkrad" className={inp}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">🌿 Eco-kort</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.eco_title||""} onChange={e=>set("eco_title",e.target.value)} placeholder="Svanenmärkt & miljöcertifierat" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.eco_text||""} onChange={e=>set("eco_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700">💰 RUT-kort</h4>
          <div>
            <label className={lbl}>Rubrik</label>
            <input value={data.rut_title||""} onChange={e=>set("rut_title",e.target.value)} placeholder="50% RUT-avdrag" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Text</label>
            <textarea value={data.rut_text||""} onChange={e=>set("rut_text",e.target.value)} rows={3} className={inp+" resize-none"}/>
          </div>
        </>}

        {section === "services" && <>
          <h3 className="font-semibold text-slate-800">Tjänster</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Etikett</label>
              <input value={data.services_label||""} onChange={e=>set("services_label",e.target.value)} placeholder="Våra tjänster" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Rubrik</label>
              <input value={data.services_title||""} onChange={e=>set("services_title",e.target.value)} placeholder="Städtjänster för hem och företag" className={inp}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Tjänstekort</h4>
          {(data.services||[]).map((svc, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2 relative">
              <button onClick={()=>set("services", data.services.filter((_,i)=>i!==idx))}
                className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                <Trash2 size={14}/>
              </button>
              <div>
                <label className={lbl}>Namn</label>
                <input value={svc.title||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],title:e.target.value};set("services",s);}} placeholder="Hemstädning" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Beskrivning</label>
                <textarea value={svc.desc||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],desc:e.target.value};set("services",s);}} rows={2} className={inp+" resize-none"}/>
              </div>
              <div>
                <label className={lbl}>Bild URL</label>
                <input value={svc.img||""} onChange={e=>{const s=[...data.services];s[idx]={...s[idx],img:e.target.value};set("services",s);}} placeholder="https://..." className={inp}/>
              </div>
            </div>
          ))}
          <button onClick={()=>set("services",[...(data.services||[]),{title:"",desc:"",img:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till tjänst
          </button>
        </>}

        {section === "navbar" && <>
          <h3 className="font-semibold text-slate-800">Navbar</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Företagsnamn i navbar</label>
              <input value={data.nav_company||""} onChange={e=>set("nav_company",e.target.value)} placeholder="PureNorth Städ" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Boka-knapp text</label>
              <input value={data.nav_boka_text||""} onChange={e=>set("nav_boka_text",e.target.value)} placeholder="Boka tid" className={inp}/>
            </div>
          </div>
          <hr className="border-slate-100"/>
          <h4 className="font-medium text-slate-700 mb-2">Menylänkar</h4>
          {(data.nav_links||[]).map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={link.label||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],label:e.target.value};set("nav_links",l);}}
                placeholder="Länktext" className={inp}/>
              <input value={link.href||""} onChange={e=>{const l=[...data.nav_links];l[idx]={...l[idx],href:e.target.value};set("nav_links",l);}}
                placeholder="/#tjanster" className={inp}/>
              <button onClick={()=>set("nav_links",data.nav_links.filter((_,i)=>i!==idx))}
                className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
            </div>
          ))}
          <button onClick={()=>set("nav_links",[...(data.nav_links||[]),{label:"",href:""}])}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-slate-500 w-full justify-center">
            <Plus size={14}/> Lägg till länk
          </button>
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
            💡 Standard href: /#tjanster, /#kontakt, /#boka
          </div>
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

        {section === "colors" && <>
          <h3 className="font-semibold text-slate-800">Färger</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-2">
            ⚠️ Färgändringar påverkar hela webbplatsen. Spara och ladda om sidan för att se ändringarna.
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={lbl}>Primärfärg (grön)</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={data.primary_color||"#166534"}
                  onChange={e=>set("primary_color",e.target.value)}
                  className="h-12 w-12 rounded-xl border border-slate-200 cursor-pointer p-1"/>
                <input value={data.primary_color||"#166534"}
                  onChange={e=>set("primary_color",e.target.value)}
                  placeholder="#166534" className={inp}/>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["#166534","#0f766e","#1d4ed8","#7c3aed","#be123c","#b45309","#0369a1","#64748b"].map(c => (
                  <button key={c} onClick={()=>set("primary_color",c)}
                    className="h-7 w-7 rounded-full border-2 transition-all"
                    style={{backgroundColor:c, borderColor: data.primary_color===c ? "#141414":"transparent"}}/>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Sekundärfärg (svart)</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={data.secondary_color||"#141414"}
                  onChange={e=>set("secondary_color",e.target.value)}
                  className="h-12 w-12 rounded-xl border border-slate-200 cursor-pointer p-1"/>
                <input value={data.secondary_color||"#141414"}
                  onChange={e=>set("secondary_color",e.target.value)}
                  placeholder="#141414" className={inp}/>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["#141414","#1e293b","#0f172a","#18181b","#1c1917","#292524"].map(c => (
                  <button key={c} onClick={()=>set("secondary_color",c)}
                    className="h-7 w-7 rounded-full border-2 transition-all"
                    style={{backgroundColor:c, borderColor: data.secondary_color===c ? "#64748b":"transparent"}}/>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-3">Förhandsgranskning:</p>
            <div className="flex gap-3 flex-wrap">
              <button className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{backgroundColor: data.secondary_color||"#141414"}}>
                Boka tid online
              </button>
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{backgroundColor:(data.primary_color||"#166534")+"1a", color: data.primary_color||"#166534"}}>
                Svanenmärkt & miljöcertifierat
              </span>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{backgroundColor: data.primary_color||"#166534"}}>
                <span className="text-white text-xs font-bold">50%</span>
              </div>
            </div>
          </div>
        </>}

        {section === "testimonials" && <>
          <h3 className="font-semibold text-slate-800">Omdömen</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Etikett</label>
              <input value={data.testimonials_label||""} onChange={e=>set("testimonials_label",e.target.value)} placeholder="Omdömen" className={inp}/>
            </div>
            <div>
              <label className={lbl}>Rubrik</label>
              <input value={data.testimonials_title||""} onChange={e=>set("testimonials_title",e.target.value)} placeholder="Vad våra kunder säger" className={inp}/>
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
            <label className={lbl}>Rubrik</label>
            <input value={data.about_title||""} onChange={e=>set("about_title",e.target.value)} placeholder="Städning med hjärta & precision" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Beskrivningstext</label>
            <textarea value={data.about_text||""} onChange={e => set("about_text", e.target.value)} rows={6} placeholder="Berätta om ditt företag..." className={inp + " resize-none"}/>
          </div>
          <h4 className="font-medium text-slate-700 mt-2">Statistik (3 siffror)</h4>
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
            <label className={lbl}>Punkt 1</label>
            <input value={data.about_point1||""} onChange={e=>set("about_point1",e.target.value)} placeholder="SRY-certifierad personal" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Punkt 2</label>
            <input value={data.about_point2||""} onChange={e=>set("about_point2",e.target.value)} placeholder="Svanenmärkta Pur-Eco produkter" className={inp}/>
          </div>
          <div>
            <label className={lbl}>Punkt 3</label>
            <input value={data.about_point3||""} onChange={e=>set("about_point3",e.target.value)} placeholder="50% RUT-avdrag på arbetskostnaden" className={inp}/>
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
