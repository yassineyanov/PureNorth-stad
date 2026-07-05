import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Check, X, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { StarRating } from "@/components/StarRating";

export function ReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setReviews((await api.get("/reviews")).data);
    } catch {
      toast.error("Kunde inte hämta omdömen.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const setApproved = async (id, approved) => {
    try {
      await api.patch(`/reviews/${id}/approve`, { approved });
      setReviews((r) => r.map((x) => (x.id === id ? { ...x, approved } : x)));
      toast.success(approved ? "Omdöme publicerat." : "Omdöme avpublicerat.");
    } catch {
      toast.error("Kunde inte uppdatera omdömet.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort detta omdöme?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews((r) => r.filter((x) => x.id !== id));
      toast.success("Omdöme borttaget.");
    } catch {
      toast.error("Kunde inte ta bort omdömet.");
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Totalt", value: reviews.length },
          { label: "Väntar", value: reviews.filter((r) => !r.approved).length },
          { label: "Publicerade", value: reviews.filter((r) => r.approved).length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-3xl font-display font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : reviews.length === 0 ? (
        <div data-testid="admin-reviews-empty" className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500">
          Inga omdömen ännu.
        </div>
      ) : (
        <div className="grid gap-4" data-testid="admin-reviews-list">
          {reviews.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid={`review-row-${r.id}`}
              className="rounded-2xl border border-slate-100 bg-white p-6 flex flex-col lg:flex-row lg:items-center gap-5 justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display font-semibold text-lg text-slate-900">{r.name}</h3>
                  {r.approved ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">Publicerad</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"><Clock size={12} /> Väntar</span>
                  )}
                </div>
                <StarRating value={r.rating} className="mb-2" />
                <p className="text-sm text-slate-600">"{r.text}"</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.approved ? (
                  <button onClick={() => setApproved(r.id, false)} data-testid={`review-unpublish-${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-amber-400 hover:text-amber-600 transition-colors">
                    <X size={15} /> Avpublicera
                  </button>
                ) : (
                  <button onClick={() => setApproved(r.id, true)} data-testid={`review-approve-${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#166534] rounded-full px-4 py-2 hover:bg-[#14532d] transition-colors">
                    <Check size={15} /> Godkänn
                  </button>
                )}
                <button onClick={() => remove(r.id)} data-testid={`review-delete-${r.id}`} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {/* ── Settings Modal ─────────────────────────────────────────────── */}
    </>
  );
}
