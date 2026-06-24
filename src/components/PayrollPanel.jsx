import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Download, Settings, ChevronDown, ChevronUp, FileSpreadsheet, FileCode, FileText, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastDayOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

const DAY_OPTIONS = [
  { value: 0, label: "Mån" }, { value: 1, label: "Tis" }, { value: 2, label: "Ons" },
  { value: 3, label: "Tor" }, { value: 4, label: "Fre" }, { value: 5, label: "Lör" }, { value: 6, label: "Sön" },
];

function SettingsPanel({ settings, onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const toggleDay = (key, day) => {
    setForm((f) => {
      const days = f[key].includes(day) ? f[key].filter((d) => d !== day) : [...f[key], day];
      return { ...f, [key]: days };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-100 mb-6">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-6 py-4">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-900"><Settings size={16} /> OB-tillägg och inställningar</span>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && (
        <form onSubmit={submit} className="px-6 pb-6 space-y-5 border-t border-slate-100 pt-5">
          {["ob1", "ob2"].map((key) => (
            <div key={key} className="rounded-xl bg-slate-50 p-4 space-y-3">
              <Input value={form[`${key}_label`]} onChange={(e) => setForm((f) => ({ ...f, [`${key}_label`]: e.target.value }))} className="font-semibold" />
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <Label className="text-xs">Tillägg (kr/h)</Label>
                  <Input type="number" step="0.01" value={form[`${key}_extra`]} onChange={(e) => setForm((f) => ({ ...f, [`${key}_extra`]: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Från kl</Label>
                  <Input type="time" value={form[`${key}_start`]} onChange={(e) => setForm((f) => ({ ...f, [`${key}_start`]: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Till kl</Label>
                  <Input type="time" value={form[`${key}_end`]} onChange={(e) => setForm((f) => ({ ...f, [`${key}_end`]: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Gäller dagar</Label>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => toggleDay(`${key}_days`, d.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form[`${key}_days`].includes(d.value) ? "bg-[#141414] text-white border-[#141414]" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Organisationsnummer</Label>
              <Input value={form.company_orgnr || ""} onChange={(e) => setForm((f) => ({ ...f, company_orgnr: e.target.value }))} className="mt-1" placeholder="XXXXXX-XXXX" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <Label className="text-xs">Kod normaltid</Label>
              <Input value={form.code_normal} onChange={(e) => setForm((f) => ({ ...f, code_normal: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Kod OB1</Label>
              <Input value={form.code_ob1} onChange={(e) => setForm((f) => ({ ...f, code_ob1: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Kod OB2</Label>
              <Input value={form.code_ob2} onChange={(e) => setForm((f) => ({ ...f, code_ob2: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Kod utlägg</Label>
              <Input value={form.code_expense} onChange={(e) => setForm((f) => ({ ...f, code_expense: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Lönekoderna ovan används i PAXML-exporten. Kontrollera med din redovisningskonsult eller ditt lönesystem vilka koder som gäller för er.</p>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Riktmärken — Serviceentreprenadavtalet 2025 (Almega/Fastighets):</p>
            <p>• Kväll mån–fre 18:00–24:00: <strong>25,69 kr/tim</strong></p>
            <p>• Natt 00:00–06:00: <strong>35 kr/tim</strong></p>
            <p>• Helg lör–sön hela dagen: <strong>54,08 kr/tim</strong></p>
            <p>• Storhelg (jul/nyår/påsk/midsommar): <strong>115,57 kr/tim</strong></p>
            <p className="text-blue-600 mt-1">Kontrollera alltid med ditt kollektivavtal eller arbetsgivarorganisation. Beloppen justeras varje avtalsår.</p>
          </div>

          <button type="submit" disabled={saving} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : "Spara inställningar"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PayrollPanel() {
  const [start, setStart] = useState(firstDayOfMonth());
  const [end, setEnd] = useState(lastDayOfMonth());
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payroll/summary", { params: { start, end } });
      setRows(res.data.rows);
      setSettings(res.data.settings);
    } catch {
      toast.error("Kunde inte hämta löneunderlag.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSummary(); }, []);

  const saveSettings = async (form) => {
    try {
      const res = await api.put("/settings/payroll", form);
      setSettings(res.data);
      toast.success("Inställningar sparade.");
      loadSummary();
    } catch {
      toast.error("Kunde inte spara inställningar.");
    }
  };

  const download = async (format) => {
    try {
      const res = await api.get("/payroll/export", { params: { start, end, format }, responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "paxml" ? `lon_${start}_${end}.paxml.xml` : `lon_${start}_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Filen laddas ner.");
    } catch {
      toast.error("Kunde inte ladda ner filen.");
    }
  };

  const totalPay = rows.reduce((sum, r) => sum + (r.total_pay || 0), 0);

  
  const viewSlip = (employeeId) => {
    const token = localStorage.getItem("pn_token") || "";
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    window.open(`${backendUrl}/api/payroll/slip?start=${start}&end=${end}&employee_id=${employeeId}&token=${token}`, "_blank");
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-xl text-slate-900">Löneexport</h2>
      </div>

      {settings && <SettingsPanel settings={settings} onSave={saveSettings} />}

      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Från</Label>
          <Input type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Till</Label>
          <Input type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
        </div>
        <button onClick={loadSummary} className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2.5 transition-colors">
          Hämta
        </button>
        <div className="flex-1" />
        <button onClick={() => download("xlsx")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#166534] hover:bg-[#14532d] rounded-full px-4 py-2.5 transition-colors">
          <FileSpreadsheet size={15} /> Excel
        </button>
        <button onClick={() => download("paxml")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black rounded-full px-4 py-2.5 transition-colors">
          <FileCode size={15} /> PAXML
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500">
          Inga anställda eller pass under perioden.
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <th className="p-4">Anställd</th>
                <th className="p-4">Typ</th>
                <th className="p-4">Normal (h)</th>
                <th className="p-4">OB1 (h)</th>
                <th className="p-4">OB2 (h)</th>
                <th className="p-4">Utlägg (kr)</th>
                <th className="p-4">Frånvarodagar</th>
                <th className="p-4">Pass vid frånvaro</th>
                <th className="p-4">Förlorad lön (kr)</th>
                <th className="p-4 text-amber-700">Sjuklön brutto</th>
                <th className="p-4 text-red-600">Karensavdrag</th>
                <th className="p-4 text-green-700">Sjuklön netto</th>
                <th className="p-4">Summa (kr)</th>
                <th className="p-4">PDF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <motion.tr key={r.employee_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-50 last:border-b-0">
                  <td className="p-4 font-semibold text-slate-900">{r.name}</td>
                  <td className="p-4 text-slate-500 text-xs">{r.employment_type === "vikarie" ? "Vikarie" : "Fast"}</td>
                  <td className="p-4 text-slate-600">{r.normal_h.toFixed(2)}</td>
                  <td className="p-4 text-slate-600">{r.ob1_h.toFixed(2)}</td>
                  <td className="p-4 text-slate-600">{r.ob2_h.toFixed(2)}</td>
                  <td className="p-4 text-slate-600">{r.expense_total.toFixed(2)}</td>
                  <td className="p-4 text-slate-600">{r.absence_days}</td>
                  <td className="p-4 text-slate-600">{r.absence_scheduled_days || 0}</td>
                  <td className="p-4 text-amber-700">{r.employment_type !== "vikarie" && (r.absence_lost_amount || 0) > 0 ? `-${(r.absence_lost_amount || 0).toFixed(2)}` : "-"}</td>
                  <td className="p-4 text-amber-700">{(r.sjuklon_gross || 0) > 0 ? `${(r.sjuklon_gross || 0).toFixed(2)}` : "-"}</td>
                  <td className="p-4 text-red-600">{(r.karensavdrag || 0) > 0 ? `-${(r.karensavdrag || 0).toFixed(2)}` : "-"}</td>
                  <td className="p-4 text-green-700 font-semibold">{(r.sjuklon_net || 0) > 0 ? `${(r.sjuklon_net || 0).toFixed(2)}` : "-"}</td>
                  <td className="p-4 font-semibold text-slate-900">{r.total_pay.toFixed(2)}</td>
                  <td className="p-4">
                    <button onClick={() => viewSlip(r.employee_id)} title="Visa lönebesked" className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors">
                      <Eye size={15} />
                    </button>

                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="p-4 font-bold text-slate-900" colSpan={16}>Totalt</td>
                <td className="p-4 font-bold text-slate-900">{totalPay.toFixed(2)} kr</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Beräkningen baseras på inlagda pass i Schema, frånvaro och utlägg för vald period. Kontrollera alltid mot ert lönesystem innan utbetalning.
      </p>
    </>
  );
}
