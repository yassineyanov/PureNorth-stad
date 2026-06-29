// v2
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Package, X, FileText, FileSpreadsheet } from "lucide-react";

const CATEGORIES = [
  { value: "material", label: "Städmaterial" },
  { value: "equipment", label: "Utrustning" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Övrigt" },
];

const CAT_COLORS = {
  material: "bg-blue-50 text-blue-700",
  equipment: "bg-purple-50 text-purple-700",
  transport: "bg-amber-50 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};

function kr(n) { return Math.round(n).toLocaleString("sv-SE") + " kr"; }

function CostModal({ onClose, onSave, initial }) {
  const initAntal = initial?.antal || 1;
  const initUnitPrice = initial?.unit_price || (initial?.amount ? initial.amount / initAntal : "");
  const [form, setForm] = useState(initial ? {
    ...initial,
    antal: initAntal,
    unit_price: initUnitPrice,
    amount: initial.amount || "",
  } : { name: "", category: "material", amount: "", antal: 1, unit_price: "", moms_rate: 25, date: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.date) return;
    setSaving(true);
    try { await onSave({ ...form, amount: parseFloat(form.amount), antal: parseInt(form.antal)||1, unit_price: parseFloat(form.unit_price)||0 }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">{initial ? "Redigera kostnad" : "Ny kostnad"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Beskrivning *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="T.ex. Rengöringsmedel Pur-Eco"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Datum *</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Belopp inkl. moms (kr) *</label>
              <input type="number" min="0" step="0.01" value={form.unit_price} onChange={e=>{const up=parseFloat(e.target.value)||0;const ant=parseInt(form.antal)||1;setForm(f=>({...f,unit_price:e.target.value,amount:(up*ant).toFixed(2)}));}} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="0.00"/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Antal</label>
              <input type="number" min="1" step="1" value={form.antal} onChange={e=>{const ant=parseInt(e.target.value)||1;const up=parseFloat(form.unit_price)||0;setForm(f=>({...f,antal:e.target.value,amount:up>0?(up*ant).toFixed(2):f.amount}));}} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="1"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Total (kr)</label>
              <div className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900">{form.amount ? `${parseFloat(form.amount).toFixed(2)} kr` : "0.00 kr"}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Kategori</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Moms %</label>
              <select value={form.moms_rate} onChange={e=>setForm(f=>({...f,moms_rate:+e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                <option value={25}>25% (standard)</option>
                <option value={12}>12% (livsmedel)</option>
                <option value={6}>6% (böcker m.m.)</option>
                <option value={0}>0% (ingen moms)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Anteckning</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" placeholder="Ev. kommentar..."/>
          </div>
          <button type="submit" disabled={saving||!form.name||!form.amount} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : "Spara"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CostsPanel() {
  const [overview, setOverview] = useState(null);
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;
      const res = await api.get("/costs/overview", { params });
      setOverview(res.data);
      setCosts(res.data.costs_list || []);
    } catch { toast.error("Kunde inte hämta data."); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const saveCost = async (form) => {
    try {
      if (editing) {
        const res = await api.patch(`/costs/${editing._id}`, form);
        setCosts(c => c.map(x => x._id === editing._id ? res.data : x));
        toast.success("Kostnad uppdaterad.");
      } else {
        const res = await api.post("/costs", form);
        setCosts(c => [res.data, ...c]);
        toast.success("Kostnad tillagd.");
      }
      setModal(false); setEditing(null);
      load();
    } catch { toast.error("Kunde inte spara kostnaden."); }
  };

  const deleteCost = async (id) => {
    if (!window.confirm("Ta bort denna kostnad?")) return;
    try {
      await api.delete(`/costs/${id}`);
      setCosts(c => c.filter(x => x._id !== id));
      toast.success("Kostnad borttagen.");
      load();
    } catch { toast.error("Kunde inte ta bort kostnaden."); }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Kostnader & Lönsamhet</h2>
          <p className="text-sm text-slate-500 mt-0.5">Materialkostnader och vinstanalys</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const month = new Date().toISOString().substring(0,7);
            window.open(`${base}/api/costs/report-pdf?month=${month}&token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> Kostnadsrapport
          </button>
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/costs/export-xlsx?token=${token}`;
            a.download = "kostnader.xlsx";
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={()=>{setEditing(null);setModal(true);}} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black rounded-full px-4 py-2 transition-colors">
            <Plus size={14}/> Ny kostnad
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-slate-500 font-medium">Från datum</label>
          <input type="date" value={start} onChange={e=>setStart(e.target.value)} className="rounded-xl border border-slate-200 text-sm px-3 py-2 outline-none focus:border-[#141414] w-full min-h-[42px]" style={{colorScheme:"light"}}/>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-slate-500 font-medium">Till datum</label>
          <input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="rounded-xl border border-slate-200 text-sm px-3 py-2 outline-none focus:border-[#141414] w-full min-h-[42px]" style={{colorScheme:"light"}}/>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={load} className="rounded-full bg-[#141414] text-white text-sm font-semibold px-4 py-2">Filtrera</button>
          <button onClick={()=>{setStart("");setEnd("");setTimeout(load,100);}} className="rounded-full border border-slate-200 text-sm font-semibold px-4 py-2 text-slate-600 hover:border-[#141414]">Rensa</button>
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-green-500"/><span className="text-xs text-slate-500">Intäkter</span></div>
            <p className="text-2xl font-bold text-slate-900">{kr(overview.revenue)}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-blue-500"/><span className="text-xs text-slate-500">Materialkost. inkl. moms</span></div>
            <p className="text-2xl font-bold text-slate-900">{kr(overview.material_costs)}</p>
            <p className="text-xs text-green-600 mt-0.5">Ingående moms: {kr(overview.ingaende_moms || 0)}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-amber-500"/><span className="text-xs text-slate-500">Personalkost.</span></div>
            <p className="text-2xl font-bold text-slate-900">{kr(overview.employee_costs)}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${overview.net_profit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className={overview.net_profit >= 0 ? "text-green-600" : "text-red-600"}/><span className="text-xs text-slate-500">Nettovinst</span></div>
            <p className={`text-2xl font-bold ${overview.net_profit >= 0 ? "text-green-700" : "text-red-700"}`}>{kr(overview.net_profit)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Marginal: {overview.margin}%</p>
          </div>
        </div>
      )}

      {/* Costs list */}
      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <p className="font-semibold text-slate-900 text-sm">Kostnadsposter</p>
          <p className="text-xs text-slate-400">{costs.length} poster</p>
        </div>
        {loading ? <p className="p-6 text-slate-400 text-sm">Laddar...</p> : costs.length === 0 ? (
          <p className="p-6 text-slate-400 text-sm text-center">Inga kostnader registrerade ännu.</p>
        ) : (
          costs.map((c, i) => (
            <div key={c._id} className="flex items-center justify-between gap-3 p-4 border-b border-slate-50 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-slate-900 text-sm truncate">{c.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[c.category]||"bg-slate-100 text-slate-600"}`}>
                    {CATEGORIES.find(x=>x.value===c.category)?.label||c.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{c.date}{c.notes && ` · ${c.notes}`}</p>
                {c.moms_rate > 0 && (
                  <p className="text-xs text-blue-600">
                    Moms ({c.moms_rate}%): {kr(c.amount - c.amount / (1 + c.moms_rate/100))} · Exkl. moms: {kr(c.amount / (1 + c.moms_rate/100))}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-bold text-slate-900">{kr(c.amount)}</p>
                <button onClick={()=>{setEditing(c);setModal(true);}} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={()=>deleteCost(c._id)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && <CostModal onClose={()=>{setModal(false);setEditing(null);}} onSave={saveCost} initial={editing}/>}
    </>
  );
}
