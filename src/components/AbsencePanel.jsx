import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, CalendarOff } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = ["Sjuk", "Semester", "VAB", "Annat"];
const TYPE_STYLES = {
  Sjuk: "bg-red-50 text-red-700",
  Semester: "bg-blue-50 text-blue-700",
  VAB: "bg-amber-50 text-amber-700",
  Annat: "bg-slate-100 text-slate-600",
};

function AbsenceModal({ employees, onClose, onSave }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [type, setType] = useState("Sjuk");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) return;
    setSaving(true);
    try {
      await onSave({ employee_id: employeeId, type, start_date: startDate, end_date: endDate, note: note.trim() || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">Registrera frånvaro</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Anställd</Label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Typ</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="a-start">Från</Label>
              <Input id="a-start" type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="a-end">Till</Label>
              <Input id="a-end" type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="a-note">Anteckning (valfritt)</Label>
            <textarea id="a-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
          </div>
          <button type="submit" disabled={saving || !employeeId || !startDate || !endDate} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : "Spara frånvaro"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function AbsencePanel() {
  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, absRes] = await Promise.all([api.get("/employees"), api.get("/absences")]);
      setEmployees(empRes.data);
      setAbsences(absRes.data);
    } catch {
      toast.error("Kunde inte hämta frånvaro.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const employeeName = (id) => employees.find((e) => e.id === id)?.name || "Okänd";

  const save = async (payload) => {
    try {
      const res = await api.post("/absences", payload);
      setAbsences((a) => [res.data, ...a]);
      toast.success("Frånvaro registrerad.");
      setModalOpen(false);
    } catch {
      toast.error("Kunde inte spara frånvaro.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort denna frånvaro?")) return;
    try {
      await api.delete(`/absences/${id}`);
      setAbsences((a) => a.filter((x) => x.id !== id));
      toast.success("Frånvaro borttagen.");
    } catch {
      toast.error("Kunde inte ta bort frånvaron.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-xl text-slate-900">Frånvaro</h2>
        <button
          onClick={() => { if (employees.length === 0) { toast.error("Lägg till en anställd i Schema-fliken först."); return; } setModalOpen(true); }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] rounded-full px-4 py-2 hover:bg-black transition-colors"
        >
          <Plus size={15} /> Registrera frånvaro
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : absences.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <CalendarOff size={28} className="text-slate-300" />
          Ingen frånvaro registrerad ännu.
        </div>
      ) : (
        <div className="grid gap-3">
          {absences.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border border-slate-100 p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h3 className="font-semibold text-slate-900">{employeeName(a.employee_id)}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[a.type] || TYPE_STYLES.Annat}`}>{a.type}</span>
                </div>
                <p className="text-sm text-slate-600">{a.start_date} – {a.end_date}</p>
                {a.note && <p className="text-sm text-slate-500 mt-1">{a.note}</p>}
              </div>
              <button onClick={() => remove(a.id)} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <AbsenceModal employees={employees} onClose={() => setModalOpen(false)} onSave={save} />}
      </AnimatePresence>
    </>
  );
}
