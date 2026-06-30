import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Quote, Star, PenLine, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const featured = [
  { name: "Anna Lindqvist", role: "Privatkund, Umeå", rating: 4.5, text: "Helt fantastiskt resultat! Personalen var noggrann, trevlig och proffsig. Hemmet har aldrig känts så rent." },
  { name: "Johan Bergström", role: "Kontorschef", rating: 5, text: "Vi anlitar PureNorth för vår kontorsstädning varje vecka. Alltid punktliga och med ett öga för detaljer." },
  { name: "Sara Nyström", role: "Flyttstädning", rating: 5, text: "Beställde flyttstädning och allt gick smidigt. Besiktningen godkändes direkt. Trygg och prisvärd tjänst." },
  { name: "Erik Sandström", role: "Privatkund", rating: 4, text: "Otroligt nöjd! De tog verkligen hand om varje detalj. Rekommenderar varmt till alla i Umeå." },
  { name: "Maria Holmqvist", role: "Hemstädning", rating: 5, text: "Pålitliga och noggranna. Det känns skönt att produkterna är miljövänliga också." },
  { name: "Petter Lundgren", role: "Privatkund", rating: 3.5, text: "Bästa städfirman jag anlitat. Snabb kontakt och perfekt utfört arbete varje gång." },
  { name: "Karin Sjöberg", role: "Storstädning", rating: 4.5, text: "Inför julen storstädade de hela huset. Skinande rent och doftade fräscht. Tack!" },
  { name: "Lars Eriksson", role: "Företagskund", rating: 5, text: "Professionellt bemötande och bra kvalitet. Vårt kontor har aldrig sett bättre ut." },
  { name: "Emma Karlsson", role: "Hemstädning", rating: 4, text: "Älskar att slippa städa själv. De gör ett grymt jobb och är supertrevliga." },
  { name: "Niklas Forsberg", role: "Flyttstädning", rating: 5, text: "Flyttstädningen var klanderfri. Hyresvärden var imponerad. Smidigt med RUT-avdraget." },
  { name: "Ingrid Bergqvist", role: "Privatkund", rating: 4.5, text: "Trevlig personal som verkligen bryr sig. Resultatet överträffade förväntningarna." },
  { name: "Mats Lindberg", role: "Kontorsstädning", rating: 3.5, text: "Vi har avtal med dem och är jättenöjda. Alltid samma höga standard." },
  { name: "Sofia Andersson", role: "Hemstädning", rating: 5, text: "Punktliga, noggranna och miljömedvetna. Precis vad man önskar av en städfirma." },
  { name: "Daniel Persson", role: "Privatkund", rating: 4.5, text: "Bra jobb och rimligt pris. Kommer definitivt boka igen." },
  { name: "Lena Wikström", role: "Storstädning", rating: 4, text: "Djupstädningen av köket var fantastisk. Allt blev som nytt igen." },
  { name: "Fredrik Nilsson", role: "Flyttstädning", rating: 5, text: "Effektivt och prydligt. Rekommenderar dem för alla flyttstädningar." },
  { name: "Camilla Ek", role: "Hemstädning", rating: 5, text: "Känns tryggt att släppa in dem. Alltid lika fint resultat." },
  { name: "Henrik Ström", role: "Företagskund", rating: 3.5, text: "Vårt företag har anlitat PureNorth i ett år. Aldrig en besvikelse." },
  { name: "Josefin Hedlund", role: "Privatkund", rating: 4.5, text: "Snälla, noggranna och snabba. Hemmet doftar alltid rent efteråt." },
  { name: "Andreas Berg", role: "Kontorsstädning", rating: 5, text: "Bra kommunikation och flexibla tider. Mycket nöjd kund." },
  { name: "Malin Öberg", role: "Hemstädning", rating: 4, text: "De fixade fläckar jag trodde var omöjliga. Riktiga proffs!" },
  { name: "Tobias Lund", role: "Flyttstädning", rating: 5, text: "Allt klart i tid och perfekt utfört. Stort tack för hjälpen." },
  { name: "Elin Gustafsson", role: "Privatkund", rating: 4.5, text: "Vänligt bemötande och grundligt arbete. Rekommenderas!" },
  { name: "Robert Axelsson", role: "Storstädning", rating: 5, text: "Hela lägenheten blev skinande ren. Värt varenda krona." },
  { name: "Hanna Isaksson", role: "Hemstädning", rating: 3.5, text: "Bästa beslutet att anlita dem. Slipper stressa över städningen." },
  { name: "Patrik Dahl", role: "Företagskund", rating: 4.5, text: "Stabil leverantör med hög kvalitet. Lätt att rekommendera." },
  { name: "Linnea Falk", role: "Privatkund", rating: 5, text: "Underbart att komma hem till ett rent hem. Tack PureNorth!" },
  { name: "Gustav Holm", role: "Flyttstädning", rating: 4, text: "Smidig bokning och prickfri städning. Mycket professionellt." },
  { name: "Cecilia Norberg", role: "Hemstädning", rating: 5, text: "Noggranna och trevliga. Använder miljövänliga produkter, vilket jag uppskattar." },
  { name: "Oskar Lindqvist", role: "Kontorsstädning", rating: 4.5, text: "Vårt kontor är alltid fräscht. Personalen är diskret och effektiv." },
  { name: "Therese Björk", role: "Privatkund", rating: 5, text: "Helt suveränt resultat varje gång. Kan inte klaga på något." },
  { name: "Viktor Sundin", role: "Storstädning", rating: 3.5, text: "De tog verkligen i ordentligt. Badrummet blev som nytt." },
  { name: "Amanda Engström", role: "Hemstädning", rating: 5, text: "Pålitliga och noggranna. Rekommenderar till alla mina vänner." },
  { name: "Marcus Hansson", role: "Flyttstädning", rating: 4.5, text: "Flyttstädningen gick perfekt. Allt godkänt utan anmärkning." },
  { name: "Rebecca Lund", role: "Privatkund", rating: 4, text: "Trevlig service och fint resultat. Mycket nöjd!" },
  { name: "Stefan Åkerman", role: "Företagskund", rating: 5, text: "Bra avtal och alltid samma höga kvalitet. Toppenfirma." },
  { name: "Julia Nordin", role: "Hemstädning", rating: 4.5, text: "De gör verkligen skillnad. Hemmet känns alltid nytt efteråt." },
  { name: "Anton Wallin", role: "Kontorsstädning", rating: 5, text: "Effektiva och pålitliga. Vårt team trivs i den rena miljön." },
  { name: "Frida Lindström", role: "Privatkund", rating: 3.5, text: "Otroligt nöjd med varje städning. Varmt rekommenderat!" },
  { name: "Christoffer Ek", role: "Storstädning", rating: 5, text: "Grundligt och proffsigt jobb. Skulle anlita dem igen direkt." },
];

const ReviewCard = ({ name, role, rating, text, i }) => (
  <motion.div
    data-testid={`testimonial-${i}`}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
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
            <button key={s} type="button" onClick={() => setRating(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} data-testid={`review-star-${s}`} aria-label={`${s} stjärnor`}>
              <Star size={28} className={(hover || rating) >= s ? "fill-[#D4AF37] text-[#D4AF37]" : "text-slate-300"} />
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
      <p className="text-xs text-slate-500 text-center">Omdömen granskas och publiceras efter godkännande.</p>
    </form>
  );
};

const INITIAL = 3;

export const Testimonials = () => {
  const [approved, setApproved] = useState([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get("/reviews/approved").then((res) => setApproved(res.data)).catch(() => {});
  }, []);

  const all = [
    ...approved.map((r) => ({ name: r.name, role: null, rating: r.rating, text: r.text })),
    ...featured,
  ];
  const visible = expanded ? all : all.slice(0, INITIAL);

  return (
    <section id="omdomen" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#141414] mb-3">
            Omdömen
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#141414]">
            Vad våra kunder säger
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {visible.map((r, i) => (
            <ReviewCard key={`${r.name}-${i}`} {...r} i={i} />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between gap-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button data-testid="open-review-form" className="inline-flex items-center gap-2 rounded-full bg-[#141414] hover:bg-black text-white px-7 py-3.5 font-semibold transition-colors">
                <PenLine size={17} /> Lämna ett omdöme
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Lämna ett omdöme</DialogTitle>
                <DialogDescription>
                  Ditt omdöme granskas av oss och publiceras efter godkännande.
                </DialogDescription>
              </DialogHeader>
              <ReviewForm onDone={() => setOpen(false)} />
            </DialogContent>
          </Dialog>

          {all.length > INITIAL && (
            <button
              onClick={() => setExpanded((v) => !v)}
              data-testid="toggle-reviews"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors shrink-0"
            >
              {expanded ? (<>Visa färre <ChevronUp size={15} /></>) : (<>Visa fler omdömen <ChevronDown size={15} /></>)}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
