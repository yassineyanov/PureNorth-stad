import React, { useState, useEffect } from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Phone, Send, CheckCircle2, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// SERVICE_OPTIONS loaded dynamically from Prislista

const initialForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  kvm: "",
  preferred_date: "",
  other_description: "",
};

const darkInput = "mt-1.5 border-white/20 placeholder:text-white/40 focus-visible:ring-white/30";

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
      if (units.includes("st")) return { label: "Antal (st)", placeholder: "T.ex. 5" };
      if (units.includes("kvm") || units.includes("tim")) return { label: "Yta (kvm)", placeholder: "T.ex. 75" };
      return null;
    }
    if (needsKvm) return { label: "Yta (kvm)", placeholder: "T.ex. 75" };
    return null;
  })();

  useEffect(() => {
    api.get("/settings/pricelist").then((res) => {
      const items = res.data.items?.filter((p) => p.is_active && !p.service.includes("(fast)")) || [];
      const active = items.map((p) => p.service);
      setPriceItems(items);
      if (active.length > 0) {
        setServiceOptions([...active, "Annat"].filter((s, i, arr) => arr.indexOf(s) === i));
      }
    }).catch(() => {});
  }, []);

  const annatSelected = services.includes("Annat") || services.some((s) => !serviceOptions.slice(0, -1).includes(s));

  const toggleService = (s, closeDropdown = true) => {
    setServices((prev) => prev.includes(s) ? [] : [s]);
    if (closeDropdown) setServiceDropdownOpen(false);
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error("Fyll i namn, e-post och telefonnummer.");
      return;
    }
    if (services.length === 0) {
      toast.error("Välj minst en tjänst.");
      return;
    }
    if (annatSelected && !form.other_description.trim()) {
      toast.error("Beskriv vilken tjänst du önskar under 'Annat'.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/bookings", { ...form, services });
      setDone(true);
      toast.success("Tack! Din bokningsförfrågan har skickats.");
      setForm(initialForm);
      setServices([]);
    } catch (err) {
      toast.error("Något gick fel. Försök igen eller ring oss.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ws.show_booking === false) return null;
  return (
    <section id="boka" className="py-24 sm:py-32 text-white" style={{backgroundColor: ws.booking_bg || "#141414"}}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-5 gap-12">
        {/* Left intro */}
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: ws.booking_left_label_color || "rgba(255,255,255,0.5)"}}>
            {ws.booking_left_label || "Boka tid"}
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight leading-tight" style={{color: ws.booking_left_title_color || "#ffffff"}}>
            {ws.booking_left_title || "Boka online eller ring oss"}
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{color: ws.booking_left_subtitle_color || "rgba(255,255,255,0.7)"}}>
            {ws.booking_left_subtitle || "Fyll i formuläret så återkommer vi med ett förslag. Vill du hellre prata med oss direkt? Slå en signal."}
          </p>
          {ws.show_booking_phone_btn !== false && <a
            href={`tel:${(ws.phone || "070-624 04 03").replace(/[^0-9]/g, "")}`}
            data-testid="booking-call-btn"
            className="mt-7 inline-flex items-center gap-3 rounded-2xl border px-6 py-4 hover:opacity-80 transition-colors"
            style={{borderColor: "rgba(255,255,255,0.15)", backgroundColor: ws.booking_phone_btn_bg||"rgba(255,255,255,0.06)"}}
          >
            <span className="h-11 w-11 rounded-full flex items-center justify-center" style={{backgroundColor: ws.booking_phone_btn_icon_bg||"#ffffff", color: ws.booking_phone_btn_icon_color||"#141414"}}>
              <Phone size={18} />
            </span>
            <span>
              <span className="block text-xs" style={{color: ws.booking_phone_btn_label_color||"rgba(255,255,255,0.5)"}}>{ws.booking_phone_btn_label||"Ring oss"}</span>
              <span className="block font-semibold" style={{color: ws.booking_phone_btn_number_color||"#ffffff"}}>{ws.phone || "070-624 04 03"}</span>
            </span>
          </a>}
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              data-testid="booking-success"
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-10 text-center"
            >
              <CheckCircle2 size={48} className="text-[#4ade80] mx-auto mb-4" />
              <h3 className="font-display font-bold text-2xl text-white mb-2">
                Tack för din förfrågan!
              </h3>
              <p style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>
                Vi har tagit emot din bokning och återkommer så snart vi kan.
              </p>
              <button
                onClick={() => setDone(false)}
                data-testid="booking-new-btn"
                className="mt-6 rounded-full bg-white hover:bg-white/90 text-[#141414] px-7 py-3 font-semibold transition-colors"
              >
                Gör en ny bokning
              </button>
            </motion.div>
          ) : (
            <form
              onSubmit={submit}
              data-testid="booking-form"
              className="rounded-3xl border border-white/10 p-7 sm:p-9 space-y-5" style={{backgroundColor: ws.booking_form_bg||"rgba(255,255,255,0.04)"}}
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className="text-sm font-medium" style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>Namn eller företagsnamn *</label>
                  <input id="name" data-testid="booking-name" value={form.name} onChange={update("name")} placeholder="Anna Andersson / Företag AB" className={darkInput} style={{backgroundColor: ws.booking_form_input_bg||"rgba(255,255,255,0.06)", color: ws.booking_form_input_text||"#ffffff"}}/>
                </div>
                <div>
                  <label htmlFor="email" className="text-sm font-medium" style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>E-post *</label>
                  <input id="email" type="email" data-testid="booking-email" value={form.email} onChange={update("email")} placeholder="namn@exempel.se" className={darkInput} style={{backgroundColor: ws.booking_form_input_bg||"rgba(255,255,255,0.06)", color: ws.booking_form_input_text||"#ffffff"}}/>
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm font-medium" style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>Telefonnummer *</label>
                  <input id="phone" data-testid="booking-phone" value={form.phone} onChange={update("phone")} placeholder="070-123 45 67" className={darkInput} style={{backgroundColor: ws.booking_form_input_bg||"rgba(255,255,255,0.06)", color: ws.booking_form_input_text||"#ffffff"}}/>
                </div>
                <div>
                  <label htmlFor="address" className="text-sm font-medium" style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>Adress (städobjekt)</label>
                  <input id="address" value={form.address} onChange={update("address")} placeholder="Storgatan 1, Umeå" className={darkInput} style={{backgroundColor: ws.booking_form_input_bg||"rgba(255,255,255,0.06)", color: ws.booking_form_input_text||"#ffffff"}}/>
                </div>
              </div>

              <div>
                <Label style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>Vilka tjänster? *</Label>
                <div className="mt-2 relative">
                  <button
                    type="button"
                    onClick={() => setServiceDropdownOpen((o) => !o)}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      services.length > 0 ? "border-white/60 bg-white/10" : "border-white/15 hover:border-white/30"
                    }`}
                  >
                    <span className="text-[15px] text-white/90">
                      {services.length === 0
                        ? "Välj tjänster..."
                        : services.length === 1 ? services[0] : `${services.length} tjänster valda`}
                    </span>
                    {serviceDropdownOpen ? <ChevronUp size={18} className="text-white/60 shrink-0" /> : <ChevronDown size={18} className="text-white/60 shrink-0" />}
                  </button>

                  {serviceDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 rounded-xl border border-white/20 bg-[#1a1a1a] overflow-hidden z-10 relative max-h-56 overflow-y-auto"
                    >
                      {serviceOptions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          data-testid={`booking-service-${s}`}
                          onClick={() => toggleService(s)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left text-[15px] transition-colors border-b border-white/10 last:border-b-0 ${
                            services.includes(s)
                              ? "text-white bg-white/10"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span>{s}</span>
                          {services.includes(s) && <Check size={16} className="text-white shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {annatSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <Label htmlFor="other" style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>
                    Beskriv vilken tjänst du önskar *
                  </Label>
                  <Textarea
                    id="other"
                    data-testid="booking-other"
                    value={form.other_description}
                    onChange={update("other_description")}
                    placeholder="Berätta vad du behöver hjälp med..."
                    className={`${darkInput} min-h-[100px]`}
                  />
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className={quantityInfo ? "" : "col-span-2"}>
                  <Label htmlFor="date" style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>Önskat datum för bokning</Label>
                  <Input id="date" type="date" data-testid="booking-date" value={form.preferred_date} onChange={update("preferred_date")} className={`${darkInput} [color-scheme:dark]`} style={{backgroundColor: ws.booking_form_input_bg||"rgba(255,255,255,0.06)", color: ws.booking_form_input_text||"#ffffff"}} min={new Date().toISOString().split("T")[0]} onClick={(e) => e.target.showPicker && e.target.showPicker()} />
                </div>
                {quantityInfo && (
                  <div>
                    <Label htmlFor="kvm" style={{color: ws.booking_form_label_color||"rgba(255,255,255,0.7)"}}>{quantityInfo.label}</Label>
                    <input id="kvm" data-testid="booking-kvm" value={form.kvm} onChange={update("kvm")} placeholder={quantityInfo.placeholder} className={darkInput} style={{backgroundColor: ws.booking_form_input_bg||"rgba(255,255,255,0.06)", color: ws.booking_form_input_text||"#ffffff"}}/>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                data-testid="booking-submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full disabled:opacity-60 px-8 py-4 text-base font-semibold transition-colors" style={{backgroundColor: ws.booking_submit_bg || "#ffffff", color: ws.booking_submit_color || "#141414"}}
              >
                {submitting ? "Skickar..." : <>Skicka bokningsförfrågan <Send size={17} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};


