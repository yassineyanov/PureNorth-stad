import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, RotateCcw, Calculator } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UNITS = [
  { value: "tim", label: "Per timme (kr/tim)" },
  { value: "kvm", label: "Per kvm (kr/kvm)" },
  { value: "st", label: "Per styck (kr/st)" },
  { value: "fast", label: "Fast pris (kr)" },
];

const UNIT_LABELS = { tim: "kr/tim", kvm: "kr/kvm", st: "kr/st", fast: "kr fast" };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}




// ── Kalkylator ───────────────────────────────────────────────────────────────
const SPEED = { "hemstädning":30, "storstädning":20, "kontorsstädning":35, "byggstädning":18 };

function getCalcType(name, unit) {
  const n = name.toLowerCase();
  if (unit === "fast") return "fast";
  if (["fönsterputs","ugnstvätt","kyl/frys","trappstädning"].some(k => n.includes(k))) return "st";
  if (n.includes("flyttstädning")) return "kvm";
  if (["hemstädning","storstädning","kontorsstädning","byggstädning"].some(k => n.includes(k))) return "tim";
  if (unit === "st") return "st";
  if (unit === "kvm") return "kvm";
  return "tim";
}

function roundUp(h) { return Math.ceil(h * 2) / 2; }
function fmtKr(n) { return Math.round(n).toLocaleString("sv-SE") + " kr"; }

function CalcCard({ item }) {

  const type = getCalcType(item.service, item.unit);
  const isRut = item.is_rut_eligible; // from prislista directly
  const speedEntry = Object.entries(SPEED).find(([k]) => item.service.toLowerCase().includes(k));
  const speed = speedEntry ? speedEntry[1] : 30;

  const [qty, setQty] = React.useState(type === "st" ? 5 : 75);
  const [qtyInput, setQtyInput] = React.useState(type === "st" ? "5" : "75");
  if (!item.is_active) return null;
  const maxQty = type === "st" ? 30 : 300;
  const minQty = type === "st" ? 1 : 0;
  const label = type === "st" ? "Antal (st)" : "Yta (kvm)";

  let tim = 0;
  let price = 0;

  if (type === "fast") {
    price = item.price;
  } else if (type === "tim") {
    tim = roundUp(qty / speed);
    price = tim * item.price;
  } else if (type === "kvm") {
    price = qty * item.price;
    tim = roundUp(qty / 15);
  } else if (type === "st") {
    price = qty * item.price;
    tim = roundUp(qty * 0.2);
  }

  const moms = price * 0.25;
  const rutDeduction = isRut ? price * 0.5 : 0;
  const totalInclMoms = price + moms;
  const kundBetalar = totalInclMoms - rutDeduction;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-slate-900 text-sm">{item.service}</p>
        {isRut && <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">RUT</span>}
      </div>

      {type !== "fast" && (
        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">{label}</label>
          <div className="flex items-center gap-2">
            <input type="range" min={minQty} max={maxQty} step={type==="st"?1:5} value={qty}
              onChange={e=>{setQty(+e.target.value);setQtyInput(e.target.value);}} className="flex-1"/>
            <input type="number" min={minQty} max={maxQty} value={qtyInput}
              onChange={e=>setQtyInput(e.target.value)}
              onBlur={e=>{
                const v = e.target.value === "" ? minQty : Math.max(minQty, Math.min(maxQty, +e.target.value));
                setQty(v);
                setQtyInput(String(v));
              }}
              className="w-16 text-center rounded-lg border border-slate-200 text-sm py-1 outline-none focus:border-[#141414]"/>
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
        {tim > 0 && (
          <div className="flex justify-between text-xs text-slate-500">
            <span>Tid (avrundad)</span>
            <span className="font-medium text-slate-700">{tim.toFixed(1)} tim</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pris ex. moms{isRut ? " & RUT" : ""}</span>
          <span className="font-medium">{fmtKr(price)}</span>
        </div>
        {isRut && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">RUT-avdrag (50%)</span>
            <span className="font-medium text-green-600">-{fmtKr(rutDeduction)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Moms (25%)</span>
          <span className="font-medium">{fmtKr(moms)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
          <span className="text-slate-900">Kund betalar totalt</span>
          <span className="text-green-700">{fmtKr(kundBetalar)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PriceListPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings/pricelist");
      setItems(res.data.items);
    } catch {
      toast.error("Kunde inte hämta prislistan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (id, field, value) => {
    setItems((arr) => arr.map((it) => it.id === id ? { ...it, [field]: value } : it));
    setChanged(true);
  };

  const addItem = () => {
    setItems((arr) => [...arr, {
      id: uid(), service: "", description: "", unit: "tim", price: 0, is_rut_eligible: true, is_active: true
    }]);
    setChanged(true);
  };

  const removeItem = (id) => {
    setItems((arr) => arr.filter((it) => it.id !== id));
    setChanged(true);
  };

  const save = async () => {
    if (items.some((it) => !it.service.trim())) {
      toast.error("Fyll i tjänstnamn för alla rader.");
      return;
    }
    setSaving(true);
    try {
      await api.put("/settings/pricelist", { items });
      toast.success("Prislista sparad! ✅");
      setChanged(false);
    } catch {
      toast.error("Kunde inte spara prislistan.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Återställ till standardpriserna för Umeå?")) return;
    try {
      await api.delete ? null : null;
      // clear then reload defaults
      await api.put("/settings/pricelist", { items: [] });
      const res = await api.get("/settings/pricelist");
      setItems(res.data.items);
      setChanged(false);
      toast.success("Standardpriser återställda.");
    } catch {
      toast.error("Kunde inte återställa.");
    }
  };

  const totalActive = items.filter((i) => i.is_active).length;

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Prislista</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalActive} aktiva tjänster</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-full px-4 py-2 hover:border-slate-400 transition-colors">
            <RotateCcw size={14} /> Återställ
          </button>
          <button onClick={addItem} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-[#141414] transition-colors">
            <Plus size={14} /> Ny rad
          </button>
          <button onClick={save} disabled={saving || !changed} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black disabled:opacity-40 rounded-full px-4 py-2 transition-colors">
            <Save size={14} /> {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <th className="p-4">Tjänst</th>
                  <th className="p-4">Beskrivning</th>
                  <th className="p-4">Enhet</th>
                  <th className="p-4">Pris (kr)</th>
                  <th className="p-4">RUT</th>
                  <th className="p-4">Aktiv</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border-b border-slate-50 last:border-b-0 ${!item.is_active ? "opacity-50" : ""}`}>
                    <td className="p-3">
                      <Input value={item.service} onChange={(e) => update(item.id, "service", e.target.value)} className="h-8 text-sm font-semibold min-w-[140px]" placeholder="T.ex. Hemstädning" />
                    </td>
                    <td className="p-3">
                      <Input value={item.description || ""} onChange={(e) => update(item.id, "description", e.target.value)} className="h-8 text-sm min-w-[160px]" placeholder="Kort beskrivning" />
                    </td>
                    <td className="p-3">
                      <select value={item.unit} onChange={(e) => update(item.id, "unit", e.target.value)} className="rounded-lg border border-slate-200 text-sm px-2.5 py-1.5 outline-none focus:border-[#141414] h-8">
                        {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <Input type="number" step="1" value={item.price} onChange={(e) => update(item.id, "price", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-24" />
                    </td>
                    <td className="p-3">
                      <input type="checkbox" checked={item.is_rut_eligible} onChange={(e) => update(item.id, "is_rut_eligible", e.target.checked)} className="h-4 w-4 rounded" />
                    </td>
                    <td className="p-3">
                      <input type="checkbox" checked={item.is_active} onChange={(e) => update(item.id, "is_active", e.target.checked)} className="h-4 w-4 rounded" />
                    </td>
                    <td className="p-3">
                      <button onClick={() => removeItem(item.id)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className={`p-4 space-y-3 ${!item.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <Input value={item.service} onChange={(e) => update(item.id, "service", e.target.value)} className="font-semibold flex-1" placeholder="Tjänst" />
                  <button onClick={() => removeItem(item.id)} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
                <Input value={item.description || ""} onChange={(e) => update(item.id, "description", e.target.value)} placeholder="Beskrivning" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Enhet</Label>
                    <select value={item.unit} onChange={(e) => update(item.id, "unit", e.target.value)} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3 py-2 outline-none">
                      {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Pris (kr)</Label>
                    <Input type="number" value={item.price} onChange={(e) => update(item.id, "price", parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={item.is_rut_eligible} onChange={(e) => update(item.id, "is_rut_eligible", e.target.checked)} className="h-4 w-4 rounded" />
                    RUT-berättigad
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={item.is_active} onChange={(e) => update(item.id, "is_active", e.target.checked)} className="h-4 w-4 rounded" />
                    Aktiv
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Standardpriser baserade på Umeå-marknaden 2025</p>
        <p className="text-xs text-blue-700">Hemstädning 478 kr/tim (ex. RUT) · Kontorsstädning 350 kr/tim · Fönsterputs 80 kr/st · Priser är riktmärken — justera efter ditt företags kostnadsbild.</p>
      </div>

      {/* ── Kalkylator ── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} className="text-slate-600"/>
          <h3 className="font-display font-bold text-lg text-slate-900">Kundkalkylator</h3>
          <span className="text-xs text-slate-400 ml-1">— se vad kunden betalar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.filter(i => i.is_active).map(item => (
            <CalcCard key={item.id} item={item}/>
          ))}
        </div>
      </div>
    </>
  );
}
 