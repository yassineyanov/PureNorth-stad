import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Receipt, Check } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = ["Resa", "Material", "Parkering", "Övrigt"];
const STATUS = {
  pending: { label: "Väntar", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "Godkänd", cls: "bg-blue-50 text-blue-700" },
  paid: { label: "Utbetald", cls: "bg-green-50 text-green-700" },
};

function ExpenseModal({ employees, onClose, onSave }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [momsRate, setMomsRate] = useState(25);
  const [category, setCategory] = useState("Övrigt");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!employeeId || !date || !amount) return;
    setSaving(true);
    try {
      await onSave({ employee_id: employeeId, date, amount: parseFloat(amount), moms_rate: momsRate, category, description: description.trim() || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">Nytt utlägg</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Anställd</Label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="e-date">Datum</Label>
              <Input id="e-date" type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-amount">Belopp inkl. moms (kr)</Label>
              <Input id="e-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
            <div>
              <Label>Moms %</Label>
              <select value={momsRate} onChange={e=>setMomsRate(+e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                <option value={25}>25% (standard)</option>
                <option value={12}>12% (livsmedel)</option>
                <option value={6}>6% (böcker)</option>
                <option value={0}>0% (ingen moms)</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Kategori</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="e-desc">Beskrivning (valfritt)</Label>
            <textarea id="e-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
          </div>
          <button type="submit" disabled={saving || !employeeId || !date || !amount} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : "Lägg till utlägg"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function ExpensePanel() {
  const [employees, setEmployees] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, expRes] = await Promise.all([api.get("/employees"), api.get("/expenses")]);
      setEmployees(empRes.data);
      setExpenses(expRes.data);
    } catch {
      toast.error("Kunde inte hämta utlägg.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const employeeName = (id) => employees.find((e) => e.id === id)?.name || "Okänd";

  const save = async (payload) => {
    try {
      const res = await api.post("/expenses", payload);
      setExpenses((e) => [res.data, ...e]);
      toast.success("Utlägg tillagt.");
      setModalOpen(false);
    } catch {
      toast.error("Kunde inte spara utlägget.");
    }
  };

  const setStatus = async (id, status) => {
    try {
      const res = await api.patch(`/expenses/${id}`, { status });
      setExpenses((e) => e.map((x) => (x.id === id ? res.data : x)));
      toast.success("Status uppdaterad.");
    } catch {
      toast.error("Kunde inte uppdatera status.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort detta utlägg?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses((e) => e.filter((x) => x.id !== id));
      toast.success("Utlägg borttaget.");
    } catch {
      toast.error("Kunde inte ta bort utlägget.");
    }
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Utlägg</h2>
          <p className="text-sm text-slate-500 mt-0.5">Totalt: {total.toFixed(2)} kr</p>
        </div>
        <button
          onClick={() => { if (employees.length === 0) { toast.error("Lägg till en anställd i Schema-fliken först."); return; } setModalOpen(true); }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] rounded-full px-4 py-2 hover:bg-black transition-colors"
        >
          <Plus size={15} /> Nytt utlägg
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : expenses.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <Receipt size={28} className="text-slate-300" />
          Inga utlägg registrerade ännu.
        </div>
      ) : (
        <div className="grid gap-3">
          {expenses.map((e) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border border-slate-100 p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h3 className="font-semibold text-slate-900">{employeeName(e.employee_id)}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS[e.status]?.cls}`}>{STATUS[e.status]?.label}</span>
                </div>
                <p className="text-sm text-slate-600">{e.date} · {e.category} · <strong>{e.amount.toFixed(2)} kr</strong></p>
                {e.moms_rate > 0 && <p className="text-xs text-blue-600">Ingående moms ({e.moms_rate}%): {(e.amount - e.amount/(1+e.moms_rate/100)).toFixed(2)} kr</p>}
                {e.description && <p className="text-sm text-slate-500 mt-1">{e.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.status !== "paid" && (
                  <select value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)} className="rounded-full border border-slate-200 text-sm px-3.5 py-2 outline-none focus:border-[#141414]">
                    <option value="pending">Väntar</option>
                    <option value="approved">Godkänd</option>
                    <option value="paid">Utbetald</option>
                  </select>
                )}
                <button onClick={() => remove(e.id)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <ExpenseModal employees={employees} onClose={() => setModalOpen(false)} onSave={save} />}
      </AnimatePresence>
    </>
  );
}
