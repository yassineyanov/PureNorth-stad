import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Phone, Send, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const SERVICE_OPTIONS = [
  "Hemstädning",
  "Flyttstädning",
  "Kontorsstädning",
  "Storstädning",
  "Annat",
];

const initialForm = {
  name: "",
  email: "",
  phone: "",
  kvm: "",
  preferred_date: "",
  other_description: "",
};

export const BookingForm = () => {
  const [form, setForm] = useState(initialForm);
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const annatSelected = services.includes("Annat");

  const toggleService = (s) => {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
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

  return (
    <section id="boka" className="py-24 sm:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-5 gap-12">
        {/* Left intro */}
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#166534] mb-3">
            Boka tid
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-slate-900 leading-tight">
            Boka online — eller ring oss
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Fyll i formuläret så återkommer vi med ett förslag. Vill du hellre prata
            med oss direkt? Slå en signal.
          </p>
          <a
            href="tel:0706240403"
            data-testid="booking-call-btn"
            className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#F7FAF8] px-6 py-4 hover:border-[#166534] transition-colors"
          >
            <span className="h-11 w-11 rounded-full bg-[#166534] text-white flex items-center justify-center">
              <Phone size={18} />
            </span>
            <span>
              <span className="block text-xs text-slate-500">Ring oss</span>
              <span className="block font-semibold text-slate-900">070-624 04 03</span>
            </span>
          </a>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              data-testid="booking-success"
              className="rounded-3xl border border-[#166534]/20 bg-[#F7FAF8] p-10 text-center"
            >
              <CheckCircle2 size={48} className="text-[#166534] mx-auto mb-4" />
              <h3 className="font-display font-bold text-2xl text-slate-900 mb-2">
                Tack för din förfrågan!
              </h3>
              <p className="text-slate-600">
                Vi har tagit emot din bokning och återkommer så snart vi kan.
              </p>
              <button
                onClick={() => setDone(false)}
                data-testid="booking-new-btn"
                className="mt-6 rounded-full bg-[#166534] hover:bg-[#14532d] text-white px-7 py-3 font-semibold transition-colors"
              >
                Gör en ny bokning
              </button>
            </motion.div>
          ) : (
            <form
              onSubmit={submit}
              data-testid="booking-form"
              className="rounded-3xl border border-slate-100 shadow-sm p-7 sm:p-9 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="name" className="text-slate-700">Namn eller företagsnamn *</Label>
                  <Input id="name" data-testid="booking-name" value={form.name} onChange={update("name")} placeholder="Anna Andersson / Företag AB" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-slate-700">E-post *</Label>
                  <Input id="email" type="email" data-testid="booking-email" value={form.email} onChange={update("email")} placeholder="namn@exempel.se" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-slate-700">Telefonnummer *</Label>
                  <Input id="phone" data-testid="booking-phone" value={form.phone} onChange={update("phone")} placeholder="070-123 45 67" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="kvm" className="text-slate-700">Yta (kvm)</Label>
                  <Input id="kvm" data-testid="booking-kvm" value={form.kvm} onChange={update("kvm")} placeholder="t.ex. 75" className="mt-1.5" />
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Vilka tjänster? *</Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2.5">
                  {SERVICE_OPTIONS.map((s) => (
                    <label
                      key={s}
                      data-testid={`booking-service-${s}`}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                        services.includes(s)
                          ? "border-[#166534] bg-[#166534]/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Checkbox
                        checked={services.includes(s)}
                        onCheckedChange={() => toggleService(s)}
                        className="data-[state=checked]:bg-[#166534] data-[state=checked]:border-[#166534]"
                      />
                      <span className="text-[15px] text-slate-800">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {annatSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <Label htmlFor="other" className="text-slate-700">
                    Beskriv vilken tjänst du önskar *
                  </Label>
                  <Textarea
                    id="other"
                    data-testid="booking-other"
                    value={form.other_description}
                    onChange={update("other_description")}
                    placeholder="Berätta vad du behöver hjälp med..."
                    className="mt-1.5 min-h-[100px]"
                  />
                </motion.div>
              )}

              <div>
                <Label htmlFor="date" className="text-slate-700">Önskat datum för bokning</Label>
                <Input id="date" type="date" data-testid="booking-date" value={form.preferred_date} onChange={update("preferred_date")} className="mt-1.5" />
              </div>

              <button
                type="submit"
                disabled={submitting}
                data-testid="booking-submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#166534] hover:bg-[#14532d] disabled:opacity-60 text-white px-8 py-4 text-base font-semibold transition-colors"
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
