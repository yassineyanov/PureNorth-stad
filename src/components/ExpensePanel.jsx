import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Receipt, Check, Upload, FileText, FileSpreadsheet, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EXPENSE_CATS = [
  { value: "Material",       moms: 25, label: "Material (25%)" },
  { value: "Bränsle",        moms: 25, label: "Bränsle (25%)" },
  { value: "Milersättning",  moms: 0,  label: "Milersättning (0%)" },
  { value: "Parkering",      moms: 25, label: "Parkering (25%)" },
  { value: "Övrigt",         moms: 25, label: "Övrigt (25%)" },
];
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
  const [category, setCategory] = useState("Material");
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
                <option value={25}>25%</option>
                <option value={0}>0% (Milersättning)</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Kategori</Label>
            <select value={category} onChange={e=>{
                const cat = EXPENSE_CATS.find(c=>c.value===e.target.value);
                setCategory(e.target.value);
                if(cat) setMomsRate(cat.moms);
              }} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              {EXPENSE_CATS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
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

// ── Staff Receipt Submission ──────────────────────────────────────────────────
function SubmitReceiptModal({ employees, onClose, onSubmit }) {
  const [form, setForm] = useState({
    employee_id: "", date: new Date().toISOString().split("T")[0],
    amount: "", moms_rate: 25, category: "Material", description: ""
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const CATS = [
    { value: "Material", moms: 25 },
    { value: "Bränsle", moms: 25 },
    { value: "Milersättning", moms: 0 },
    { value: "Parkering", moms: 25 },
    { value: "Övrigt", moms: 25 },
  ];

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (file) fd.append("receipt", file);
      await onSubmit(fd);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">Skicka kvitto</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Anställd *</label>
            <select value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              <option value="">Välj anställd...</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Datum *</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Belopp inkl. moms *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="0.00"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Kategori</label>
              <select value={form.category} onChange={e=>{
                const cat = CATS.find(c=>c.value===e.target.value);
                setForm(f=>({...f,category:e.target.value,moms_rate:cat?.moms||25}));
              }} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                {CATS.map(c=><option key={c.value} value={c.value}>{c.value} ({c.moms}%)</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Moms %</label>
              <select value={form.moms_rate} onChange={e=>setForm(f=>({...f,moms_rate:+e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                <option value={25}>25%</option>
                <option value={0}>0%</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Beskrivning</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="T.ex. Rengöringsmedel ICA"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Kvittobild (valfritt)</label>
            <div className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#141414] transition-colors" onClick={()=>document.getElementById('receipt-upload').click()}>
              {preview ? (
                <img src={preview} alt="kvitto" className="max-h-40 mx-auto rounded-lg object-contain"/>
              ) : (
                <div>
                  <p className="text-slate-400 text-sm">Tryck för att ladda upp bild</p>
                  <p className="text-slate-300 text-xs mt-1">JPG, PNG max 5MB</p>
                </div>
              )}
              <input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            </div>
          </div>
          <button type="submit" disabled={saving||!form.employee_id||!form.amount} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Skickar..." : "Skicka kvitto"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ExpensePanel() {
  const [employees, setEmployees] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [receiptModal, setReceiptModal] = useState(false);
  const [kvittoView, setKvittoView] = useState(null);
  const [kvittoEdit, setKvittoEdit] = useState(null);

  const loadPending = async () => {
    try {
      const res = await api.get("/expenses/pending");
      setPendingExpenses(res.data);
    } catch {}
  };

  const submitReceipt = async (formData) => {
    try {
      await api.post("/expenses/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Kvitto skickat! Admin granskar det.");
      loadPending();
    } catch { toast.error("Kunde inte skicka kvitto."); }
  };

  const approveExpense = async (id, empId) => {
    try {
      await api.patch(`/expenses/${id}/approve`);
      toast.success("Utlägg godkänt!");
      loadPending();
      load();
    } catch { toast.error("Kunde inte godkänna."); }
  };

  const rejectExpense = async (id) => {
    try {
      await api.patch(`/expenses/${id}/reject`);
      toast.success("Utlägg avvisat.");
      loadPending();
    } catch { toast.error("Kunde inte avvisa."); }
  };

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); loadPending(); }, []);

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

  const handleKvittoEdit = async (expId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await api.patch(`/expenses/${expId}`, { receipt_image: ev.target.result });
        toast.success("Kvitto uppdaterat!");
        setKvittoEdit(null);
        load();
      } catch { toast.error("Kunde inte uppdatera kvitto."); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Kvitto Lightbox */}
      {kvittoView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={()=>setKvittoView(null)}>
          <div className="relative max-w-3xl max-h-[90vh] p-4" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setKvittoView(null)} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 z-10">✕</button>
            <img src={kvittoView} alt="kvitto" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"/>
          </div>
        </div>
      )}
      {pendingExpenses.length > 0 && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-100 p-4">
          <p className="font-semibold text-amber-800 mb-3">⏳ {pendingExpenses.length} kvitto(n) väntar på godkännande</p>
          <div className="space-y-3">
            {pendingExpenses.map(exp => (
              <div key={exp._id} className="bg-white rounded-xl p-3 border border-amber-100">
                <div className="flex items-start gap-3">
                  {exp.receipt_image && (
                    <img src={exp.receipt_image} alt="kvitto" className="w-16 h-16 object-cover rounded-lg border cursor-pointer flex-shrink-0"
                      onClick={()=>window.open(exp.receipt_image,"_blank")}/>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{exp.employee_name}</p>
                    <p className="text-xs text-slate-500">{exp.date} · {exp.category} · <strong>{exp.amount?.toFixed(2)} kr</strong></p>
                    {exp.description && <p className="text-xs text-slate-400">{exp.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={()=>approveExpense(exp._id, exp.employee_id)} className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-full">✓ Godkänn</button>
                    <button onClick={()=>rejectExpense(exp._id)} className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-full">✕ Avvisa</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Utlägg</h2>
          <p className="text-sm text-slate-500 mt-0.5">Totalt: {total.toFixed(2)} kr</p>
        </div>
        <button onClick={()=>setReceiptModal(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:border-[#141414] rounded-full px-4 py-2 transition-colors">
          <Upload size={14}/> Skicka kvitto
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            window.open(`${base}/api/expenses/export-pdf?token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
          </button>
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/expenses/export-xlsx?token=${token}`;
            a.download = "utlagg.xlsx";
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>

          <button
            onClick={() => { if (employees.length === 0) { toast.error("Lägg till en anställd i Schema-fliken först."); return; } setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] rounded-full px-4 py-2 hover:bg-black transition-colors"
          >
            <Plus size={15} /> Nytt utlägg
          </button>
        </div>
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
                {e.receipt_image && (
                  <button onClick={()=>setKvittoView(e.receipt_image)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Visa kvitto">
                    <Eye size={16}/>
                  </button>
                )}
                <label className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors cursor-pointer" title="Redigera kvitto">
                  <Upload size={16}/>
                  <input type="file" accept="image/*" className="hidden" onChange={ev=>handleKvittoEdit(e.id, ev.target.files[0])}/>
                </label>
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
      {receiptModal && (
        <SubmitReceiptModal
          employees={employees}
          onClose={()=>setReceiptModal(false)}
          onSubmit={submitReceipt}
        />
      )}
    </>
  );
}
