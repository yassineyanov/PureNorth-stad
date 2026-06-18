import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Quote, Star, PenLine } from "lucide-react";
import { api } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const featured = [
  {
    name: "Anna Lindqvist",
    role: "Privatkund, Umeå",
    rating: 4.5,
    text: "Helt fantastiskt resultat! Personalen var noggrann, trevlig och proffsig. Hemmet har aldrig känts så rent. Rekommenderas varmt.",
  },
  {
    name: "Johan Bergström",
    role: "Kontorschef",
    rating: 5,
    text: "Vi anlitar PureNorth för vår kontorsstädning varje vecka. Alltid punktliga och med ett öga för detaljer. Miljövänligt dessutom!",
  },
  {
    name: "Sara Nyström",
    role: "Flyttstädning",
    rating: 5,
    text: "Beställde flyttstädning och allt gick smidigt. Besiktningen godkändes direkt. Trygg och prisvärd tjänst med RUT-avdrag.",
  },
];

const ReviewCard = ({ name, role, rating, text, i }) => (
  <motion.div
    data-testid={`testimonial-${i}`}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
    className="rounded-3xl border border-slate-200 p-8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
  >
    <Quote size={28} className="text-[#141414] mb-4" />
    <StarRating value={rating} className="mb-4" />
    <p className="text-[15px] text-slate-700 leading-relaxed flex-1">"{text}"</p>
    <div className="mt-6 pt-5 border-t border-slate-100">
      <p className="font-display font-semibold text-slate-900">{name}</p>
      {role && <p className="text-sm text-slate-500">{role}</p>}
    </div>
  </motion.div>
);

const ReviewForm = ({ onDone }) => {
  const [form, setForm] = useState({ name: "", text: "" });
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) {
      toast.error("Fyll i namn och omdöme.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/reviews", { name: form.name, rating, text: form.text });
      toast.success("Tack! Ditt omdöme väntar på godkännande innan det publiceras.");
      setForm({ name: "", text: "" });
      setRating(5);
      onDone?.();
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} data-testid="review-form" className="space-y-4">
      <div>
        <Label htmlFor="r-name">Ditt namn *</Label>
        <Input id="r-name" data-testid="review-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Anna Andersson" className="mt-1.5" />
      </div>
      <div>
        <Label>Betyg *</Label>
        <div className="mt-1.5 flex gap-1.5" data-testid="review-rating">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              data-testid={`review-star-${s}`}
              aria-label={`${s} stjärnor`}
            >
              <Star
                size={28}
                className={(hover || rating) >= s ? "fill-[#166534] text-[#166534]" : "text-slate-300"}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="r-text">Ditt omdöme *</Label>
        <Textarea id="r-text" data-testid="review-text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Berätta om din upplevelse..." className="mt-1.5 min-h-[110px]" />
      </div>
      <button type="submit" disabled={submitting} data-testid="review-submit" className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-60 text-white py-3.5 font-semibold transition-colors">
        {submitting ? "Skickar..." : "Skicka omdöme"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        Omdömen granskas och publiceras efter godkännande.
      </p>
    </form>
  );
};

export const Testimonials = () => {
  const [approved, setApproved] = useState([]);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get("/reviews/approved").then((res) => setApproved(res.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  return (
    <section id="omdomen" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#166534] mb-3">
              Omdömen
            </p>
            <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#141414]">
              Vad våra kunder säger
            </h2>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button data-testid="open-review-form" className="inline-flex items-center gap-2 rounded-full bg-[#141414] hover:bg-black text-white px-6 py-3.5 font-semibold transition-colors shrink-0">
                <PenLine size={17} /> Lämna ett omdöme
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Lämna ett omdöme</DialogTitle>
              </DialogHeader>
              <ReviewForm onDone={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {featured.map((r, i) => (
            <ReviewCard key={r.name} {...r} i={i} />
          ))}
          {approved.map((r, idx) => (
            <ReviewCard key={r.id} name={r.name} rating={r.rating} text={r.text} i={featured.length + idx} />
          ))}
        </div>
      </div>
    </section>
  );
};
