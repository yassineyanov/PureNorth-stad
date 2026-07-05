import React, { useState, useEffect } from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Phone, Send, CheckCircle2, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { api } from "@/lib/api";

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
      if (active.length > 0) setServiceOptions([...active, "Annat"].filter((s, i, arr) => arr.indexOf(s) === i));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (ws.booking_services?.length > 0) setServiceOptions(ws.booking_services);
  }, [ws.booking_services]);

  const annatSelected = services.includes("Annat") || services.some((s) => !serviceOptions.slice(0, -1).includes(s));

  const toggleService = (s, closeDropdown = true) => {
    setServices((prev) => prev.includes(s) ? [] : [s]);
    if (closeDropdown) setServiceDropdownOpen(false);
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { toast.error("Fyll i namn, e-post och telefonnummer."); return; }
    if (services.length === 0) { toast.error("Välj minst en tjänst."); return; }
    setSubmitting(true);
    try {
      await api.post("/bookings", { ...form, services });
      setDone(true);
      toast.success("Tack! Din bokningsförfrågan har skickats.");
      setForm(initialForm);
      setServices([]);
    } catch { toast.error("Något gick fel. Försök igen eller ring oss."); }
    finally { setSubmitting(false); }
  };

  if (ws.show_booking === false) return null;

  // Color helpers
  const bg = ws.booking_bg || "#141414";
  const leftLabelColor = ws.booking_left_label_color || "#808080";
  const leftTitleColor = ws.booking_left_title_color || "#ffffff";
  const leftSubtitleColor = ws.booking_left_subtitle_color || "#b3b3b3";
  const phoneBtnBg = ws.booking_phone_btn_bg || "#1f1f1f";
  const phoneBtnIconBg = ws.booking_phone_btn_icon_bg || "#ffffff";
  const phoneBtnIconColor = ws.booking_phone_btn_icon_color || "#141414";
  const phoneBtnLabelColor = ws.booking_phone_btn_label_color || "#808080";
  const phoneBtnNumberColor = ws.booking_phone_btn_number_color || "#ffffff";
  const formBg = ws.booking_form_bg || "#1a1a1a";
  const formLabelColor = ws.booking_form_label_color || "#b3b3b3";
  const formInputBg = ws.booking_form_input_bg || "#242424";
  const formInputText = ws.booking_form_input_text || "#ffffff";
  const submitBg = ws.booking_submit_bg || "#ffffff";
  const submitColor = ws.booking_submit_color || "#141414";
  const successColor = ws.booking_success_color || "#ffffff";

  const inp = {
    marginTop: "6px",
    backgroundColor: formInputBg,
    color: formInputText,
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "12px",
    padding: "10px 14px",
    width: "100%",
    fontSize: "15px",
    outline: "none",
  };

  return (
    <section id="boka" className="py-24 sm:py-32" style={{backgroundColor: bg, color: "#ffffff"}}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-5 gap-12">
        {/* Left */}
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{color: leftLabelColor}}>
            {ws.booking_left_label || "Boka tid"}
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight leading-tight" style={{color: leftTitleColor}}>
            {ws.booking_left_title || "Boka online eller ring oss"}
          </h2>
          <p className="mt-5 text-lg leading-relaxed" style={{color: leftSubtitleColor}}>
            {ws.booking_left_subtitle || "Fyll i formuläret så återkommer vi med ett förslag. Vill du hellre prata med oss direkt? Slå en signal."}
          </p>
          {ws.show_booking_phone_btn !== false && (
          <a href={`tel:${(ws.phone||"070-624 04 03").replace(/[^0-9]/g,"")}`}
            data-testid="booking-call-btn"
            className="mt-7 inline-flex items-center gap-3 rounded-2xl border px-6 py-4 hover:opacity-80 transition-colors"
            style={{backgroundColor: phoneBtnBg, borderColor: "rgba(255,255,255,0.15)"}}>
            <span className="h-11 w-11 rounded-full flex items-center justify-center"
              style={{backgroundColor: phoneBtnIconBg, color: phoneBtnIconColor}}>
              <Phone size={18}/>
            </span>
            <span>
              <span className="block text-xs" style={{color: phoneBtnLabelColor}}>
                {ws.booking_phone_btn_label || "Ring oss"}
              </span>
              <span className="block font-semibold" style={{color: phoneBtnNumberColor}}>
                {ws.phone || "070-624 04 03"}
              </span>
            </span>
          </a>
          )}
        </div>

        {/* Right - Form */}
        <div className="lg:col-span-3">
          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              data-testid="booking-success"
              className="rounded-3xl border border-white/10 p-10 text-center"
              style={{backgroundColor: formBg}}>
              <CheckCircle2 size={48} className="mx-auto mb-4" style={{color: "#4ade80"}}/>
              <h3 className="font-display font-bold text-2xl mb-2" style={{color: successColor}}>
                {ws.booking_success_title || "Tack för din förfrågan!"}
              </h3>
              <p style={{color: successColor + "b3"}}>
                {ws.booking_success_text || "Vi har tagit emot din bokning och återkommer så snart vi kan."}
              </p>
              <button onClick={() => setDone(false)} data-testid="booking-new-btn"
                className="mt-6 rounded-full px-7 py-3 font-semibold transition-colors"
                style={{backgroundColor: submitBg, color: submitColor}}>
                Gör en ny bokning
              </button>
            </motion.div>
          ) : (
            <form onSubmit={submit} data-testid="booking-form"
              className="rounded-3xl border border-white/10 p-7 sm:p-9 space-y-5"
              style={{backgroundColor: formBg}}>

              {/* Service dropdown */}
              <div>
                <label className="text-sm font-medium" style={{color: formLabelColor}}>Vilka tjänster? *</label>
                <div className="mt-2 relative">
                  <button type="button" onClick={() => setServiceDropdownOpen(o => !o)}
                    className="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
                    style={{borderColor: services.length > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)", backgroundColor: formInputBg, color: formInputText}}>
                    <span className="text-[15px]">
                      {services.length === 0 ? "Välj tjänst..." : services[0]}
                    </span>
                    {serviceDropdownOpen ? <ChevronUp size={18} className="shrink-0"/> : <ChevronDown size={18} className="shrink-0"/>}
                  </button>
                  {serviceDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1 rounded-xl border border-white/20 overflow-hidden z-10 relative max-h-56 overflow-y-auto"
                      style={{backgroundColor: "#1a1a1a"}}>
                      {serviceOptions.map(s => (
                        <button key={s} type="button" data-testid={`booking-service-${s}`}
                          onClick={() => toggleService(s)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left text-[15px] transition-colors border-b border-white/10 last:border-b-0 ${services.includes(s) ? "bg-white/10" : "hover:bg-white/5"}`}
                          style={{color: services.includes(s) ? formInputText : "#b3b3b3"}}>
                          <span>{s}</span>
                          {services.includes(s) && <Check size={16} className="shrink-0"/>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {annatSelected && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Beskriv vilken tjänst du önskar *</label>
                  <textarea data-testid="booking-other" value={form.other_description} onChange={update("other_description")}
                    placeholder="Berätta vad du behöver hjälp med..."
                    rows={3} style={{...inp, marginTop: "6px", resize: "none"}}/>
                </motion.div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Namn eller företagsnamn *</label>
                  <input id="name" data-testid="booking-name" value={form.name} onChange={update("name")} placeholder="Anna Andersson" style={inp}/>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>E-post *</label>
                  <input id="email" type="email" data-testid="booking-email" value={form.email} onChange={update("email")} placeholder="namn@exempel.se" style={inp}/>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Telefonnummer *</label>
                  <input id="phone" data-testid="booking-phone" value={form.phone} onChange={update("phone")} placeholder="070-123 45 67" style={inp}/>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Adress (städobjekt)</label>
                  <input id="address" value={form.address} onChange={update("address")} placeholder="Storgatan 1, Umeå" style={inp}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={quantityInfo ? "" : "col-span-2"}>
                  <label className="text-sm font-medium" style={{color: formLabelColor}}>Önskat datum för bokning</label>
                  <input id="date" type="date" data-testid="booking-date" value={form.preferred_date} onChange={update("preferred_date")}
                    min={new Date().toISOString().split("T")[0]} style={{...inp, colorScheme: "dark"}}/>
                </div>
                {quantityInfo && (
                  <div>
                    <label className="text-sm font-medium" style={{color: formLabelColor}}>{quantityInfo.label}</label>
                    <input id="kvm" data-testid="booking-kvm" value={form.kvm} onChange={update("kvm")} placeholder={quantityInfo.placeholder} style={inp}/>
                  </div>
                )}
              </div>

              <button type="submit" disabled={submitting} data-testid="booking-submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full disabled:opacity-60 px-8 py-4 text-base font-semibold transition-colors"
                style={{backgroundColor: submitBg, color: submitColor}}>
                {submitting ? "Skickar..." : <>{ws.booking_submit_text || "Skicka bokningsförfrågan"} <Send size={17}/></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
// Sun Jul  5 09:11:21 UTC 2026
