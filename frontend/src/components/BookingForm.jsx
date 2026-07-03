import React, { useState, useEffect } from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Phone, Send, CheckCircle2, ChevronDown, ChevronUp, Check, X, Smartphone, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const IconMap = { Phone, Smartphone, MessageCircle };
function PhoneIcon({ name, size=18 }) { const Icon = IconMap[name] || Phone; return Icon ? <Icon size={size}/> : null; }

const initialForm = {
  name: "", email: "", phone: "", address: "", kvm: "", preferred_date: "", other_description: "",
};

export const BookingForm = () => {
  const ws = useWebsite();
  const [form, setForm] = useState(initialForm);
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceOptions, setServiceOptions] = useState(["Hemstädning", "Flyttstädning", "Kontorsstädning", "Storstädning", "Annat"]);
  const [priceItems, setPriceItems] = useState([]);
  const KVM_SERVICES = ["Hemstädning", "Flyttstädning", "Storstädning", "Byggstädning"];
  const needsKvm = services.some(s => KVM_SERVICES.includes(s));

  const quantityInfo = (() => {
    if (services.length === 0) return null;
    if (priceItems.length > 0) {
      const units = services.map(s => { const item = priceItems.find(p => p.service === s); return item ? item.unit : null; }).filter(Boolean);
      const uniqueUnits = [...new Set(units)];
      if (uniqueUnits.length === 1) return uniqueUnits[0];
    }
    return needsKvm ? "kvm" : null;
  })();

  useEffect(() => {
    api.get("/price-list").then(res => {
      const items = res.data.items?.filter((p) => p.is_active && !p.service.includes("(fast)")) || [];
      const active = items.map((p) => p.service);
      if (active.length > 0) setServiceOptions([...active, "Annat"]);
      setPriceItems(items);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (ws.booking_services?.length > 0) {
      setServiceOptions(ws.booking_services);
    }
  }, [ws.booking_services]);

  const annatSelected = services.includes("Annat") || services.some((s) => !serviceOptions.slice(0, -1).includes(s));

  const toggleService = (s) => {
    setServices((prev) => prev.includes(s) ? [] : [s]);
    setServiceDropdownOpen(false);
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone) {
      toast.error("Fyll i namn, e-post och telefon.");
      return;
    }
    if (services.length === 0) { toast.error("Välj minst en tjänst."); return; }
    setSubmitting(true);
    try {
      await api.post("/bookings", { ...form, services });
      setDone(true);
    } catch { toast.error("Något gick fel. Försök igen eller ring oss."); }
    finally { setSubmitting(false); }
  };

  if (ws.show_booking === false) return null;

  const bg = ws.booking_bg || "#141414";
  const darkInput = `mt-1.5 border text-white placeholder:text-white/40 focus-visible:ring-white/30 rounded-xl px-3 py-2 w-full text-sm`;

  return (
    <section id="boka" className="py-24 sm:py-32 text-white" style={{backgroundColor: bg}}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-5 gap-16 items-start">
        {/* Left */}
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{color: ws.booking_left_label_color || "rgba(255,255,255,0.5)"}}>
            {ws.booking_left_label || "Boka tid"}
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight leading-tight"
            style={{color: ws.booking_left_title_color || "#ffffff"}}>
            {ws.booking_left_title || "Boka online eller ring oss"}
          </h2>
          <p className="mt-5 text-lg leading-relaxed"
            style={{color: ws.booking_left_subtitle_color || "rgba(255,255,255,0.7)"}}>
            {ws.booking_left_subtitle || "Fyll i formuläret så återkommer vi med ett förslag. Vill du hellre prata med oss direkt? Slå en signal."}
          </p>
          {ws.show_booking_phone_btn !== false && (
          <a href={`tel:${(ws.phone || "070-624 04 03").replace(/[^0-9]/g, "")}`}
            data-testid="booking-call-btn"
            className="mt-7 inline-flex items-center gap-3 rounded-2xl border px-6 py-4 hover:opacity-80 transition-colors"
            style={{borderColor: ws.booking_phone_btn_border_color || "rgba(255,255,255,0.15)", backgroundColor: ws.booking_phone_btn_bg || "rgba(255,255,255,0.06)"}}>
            {ws.booking_phone_btn_icon !== "none" && (
            <span className="h-11 w-11 rounded-full flex items-center justify-center"
              style={{backgroundColor: ws.booking_phone_btn_icon_bg || "#ffffff", color: ws.booking_phone_btn_icon_color || "#141414"}}>
              <PhoneIcon name={ws.booking_phone_btn_icon || "Phone"} size={18}/>
            </span>
            )}
            <span>
              <span className="block text-xs" style={{color: ws.booking_phone_btn_label_color || "rgba(255,255,255,0.5)"}}>
                {ws.booking_phone_btn_label || "Ring oss"}
              </span>
              <span className="block font-semibold" style={{color: ws.booking_phone_btn_number_color || "#ffffff"}}>
                {ws.phone || "070-624 04 03"}
              </span>
            </span>
          </a>
          )}
        </div>

        {/* Right - Form */}
        <div className="lg:col-span-3">
          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16">
              <CheckCircle2 size={52} className="mx-auto mb-5" style={{color: ws.booking_success_color || "#ffffff"}}/>
              <h3 className="font-display font-bold text-3xl mb-3" style={{color: ws.booking_success_color || "#ffffff"}}>
                {ws.booking_success_title || "Tack för din förfrågan!"}
              </h3>
              <p style={{color: ws.booking_success_color ? ws.booking_success_color+"b3" : "rgba(255,255,255,0.7)"}}>
                {ws.booking_success_text || "Vi återkommer inom 24 timmar med ett prisförslag."}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
              {/* Service dropdown */}
              <div>
                <Label style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>Vilka tjänster? *</Label>
                <div className="mt-2 relative">
                  <button type="button" onClick={() => setServiceDropdownOpen(o => !o)}
                    className="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
                    style={{borderColor: services.length > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)", backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}>
                    <span className="text-[15px]">
                      {services.length === 0 ? "Välj tjänst..." : services[0]}
                    </span>
                    {serviceDropdownOpen ? <ChevronUp size={18} className="text-white/60 shrink-0"/> : <ChevronDown size={18} className="text-white/60 shrink-0"/>}
                  </button>
                  {serviceDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1 rounded-xl border border-white/20 bg-[#1a1a1a] overflow-hidden z-10 relative max-h-56 overflow-y-auto">
                      {serviceOptions.map((s) => (
                        <button key={s} type="button" data-testid={`booking-service-${s}`}
                          onClick={() => toggleService(s)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left text-[15px] transition-colors border-b border-white/10 last:border-b-0 ${services.includes(s) ? "text-white bg-white/10" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                          <span>{s}</span>
                          {services.includes(s) && <Check size={16} className="text-white shrink-0"/>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {annatSelected && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <Label htmlFor="other" style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>Beskriv vilken tjänst du önskar *</Label>
                  <Textarea id="other" data-testid="booking-other" value={form.other_description} onChange={update("other_description")}
                    placeholder="Berätta vad du behöver hjälp med..."
                    className={darkInput + " min-h-[100px]"}
                    style={{backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}/>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className={quantityInfo ? "" : "col-span-2"}>
                  <Label htmlFor="date" style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>Önskat datum för bokning</Label>
                  <Input id="date" type="date" data-testid="booking-date" value={form.preferred_date} onChange={update("preferred_date")}
                    className={darkInput} style={{backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}/>
                </div>
                {quantityInfo && (
                  <div>
                    <Label htmlFor="kvm" style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>
                      {quantityInfo === "kvm" ? "Antal kvm" : quantityInfo === "timmar" ? "Antal timmar" : "Antal"}
                    </Label>
                    <Input id="kvm" type="number" data-testid="booking-kvm" value={form.kvm} onChange={update("kvm")}
                      placeholder="0" className={darkInput}
                      style={{backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}/>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="name" style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>Namn *</Label>
                <Input id="name" data-testid="booking-name" value={form.name} onChange={update("name")} placeholder="Anna Andersson"
                  className={darkInput} style={{backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}/>
              </div>
              <div>
                <Label htmlFor="email" style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>E-postadress *</Label>
                <Input id="email" type="email" data-testid="booking-email" value={form.email} onChange={update("email")} placeholder="anna@exempel.se"
                  className={darkInput} style={{backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}/>
              </div>
              <div>
                <Label htmlFor="phone" style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>Telefonnummer *</Label>
                <Input id="phone" data-testid="booking-phone" value={form.phone} onChange={update("phone")} placeholder="070-123 45 67"
                  className={darkInput} style={{backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}/>
              </div>
              <div>
                <Label htmlFor="address" style={{color: ws.booking_form_label_color || "rgba(255,255,255,0.7)"}}>Adress</Label>
                <Input id="address" data-testid="booking-address" value={form.address} onChange={update("address")} placeholder="Storgatan 1, Umeå"
                  className={darkInput} style={{backgroundColor: ws.booking_form_input_bg || "rgba(255,255,255,0.06)", color: ws.booking_form_input_text || "#ffffff"}}/>
              </div>

              <button type="submit" disabled={submitting} data-testid="booking-submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full disabled:opacity-60 px-8 py-4 text-base font-semibold transition-colors"
                style={{backgroundColor: ws.booking_submit_bg || "#ffffff", color: ws.booking_submit_color || "#141414"}}>
                {submitting ? "Skickar..." : <>{ws.booking_submit_text || "Skicka bokningsförfrågan"} <Send size={17}/></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
