import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Users, FileText, CreditCard, Receipt, Eye, DollarSign, Briefcase, Calculator, Landmark, BarChart, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}
function lastOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth()+1, 0);
  return `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,"0")}-${String(last.getDate()).padStart(2,"0")}`;
}

function kr(v) { return `${(v||0).toLocaleString("sv-SE", {minimumFractionDigits:2, maximumFractionDigits:2})} kr`; }

function Card({ title, value, sub, color="slate", icon: Icon, note }) {
  const colors = {
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-red-50 border-red-100 text-red-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    slate: "bg-white border-slate-100 text-slate-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold opacity-80">{title}</p>
        {Icon && <Icon size={18} className="opacity-60" />}
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
      {note && <p className="text-xs mt-2 opacity-60 italic">{note}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h3 className="font-display font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, highlight, sub, indent }) {
  return (
    <div className={`flex justify-between items-center py-2.5 border-b border-slate-50 last:border-b-0 ${indent ? "pl-4" : ""}`}>
      <span className={`text-sm ${highlight ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${highlight ? "text-slate-900 text-base" : "text-slate-700"}`}>{value}</span>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function EconomyPanel() {
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(lastOfMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/economy/overview", { params: { start, end } });
      setData(res.data);
    } catch {
      toast.error("Kunde inte hämta ekonomiöversikt.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const viewReport = () => {
    const token = localStorage.getItem("pn_token") || "";
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    window.location.href = `${backendUrl}/api/economy/report-pdf?start=${start}&end=${end}&token=${token}`;
  };

  if (!data && loading) return <p className="text-slate-500">Laddar...</p>;

  return (
    <>
      {/* Period selector */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h2 className="font-display font-bold text-xl text-slate-900">Ekonomiöversikt</h2>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <Label className="text-xs">Från</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Till</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
          </div>
          <button onClick={load} disabled={loading} className="rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 transition-colors">
            {loading ? "Laddar..." : "Hämta"}
          </button>
          {data && (
            <button onClick={viewReport} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 hover:border-[#141414] text-slate-700 text-sm font-semibold px-4 py-2.5 transition-colors">
              <Eye size={15}/> Visa PDF-rapport
            </button>
          )}
        </div>
      </div>

      {data && (
        <>
          {/* ── KPI cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <Card title="Intäkter (exkl. moms)" value={kr(data.revenue.excl_vat)} icon={TrendingUp}
              color={data.revenue.excl_vat > 0 ? "green" : "slate"}
              sub={`${data.revenue.invoice_count} fakturor, ${data.revenue.paid_count} betalda`} />
            <Card title="Rörelseresultat" value={kr(data.result.operating_profit)} icon={data.result.operating_profit >= 0 ? TrendingUp : TrendingDown}
              color={data.result.operating_profit >= 0 ? "green" : "red"}
              sub={`Marginal: ${data.result.profit_margin}%`} />
            <Card title="Total personalkostnad" value={kr(data.payroll.total_payroll_cost)} icon={Users} color="amber"
              sub={`inkl. ${data.constants.arbetsgivaravgift_pct}% avg + ${data.constants.semesterersattning_pct}% sem`} />
            <Card title="Att betala Skatteverket" value={kr(data.obligations.total_to_pay - data.obligations.salaries_to_pay)} icon={AlertCircle} color="red"
              sub="Moms + arbetsgivaravgifter + prelskatt" />
          </div>

          {/* ── Intäkter ─────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><DollarSign size={17} className="text-green-600"/>Intäkter</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <Row label="Fakturerat belopp (exkl. moms)" value={kr(data.revenue.excl_vat)} />
              <Row label="Utgående moms (25%)" value={kr(data.revenue.vat_collected)} />
              <Row label="Totalt fakturerat (inkl. moms)" value={kr(data.revenue.total_invoiced)} highlight />
              <Row label="varav RUT-avdrag (betalas av Skatteverket)" value={kr(data.revenue.rut_deductions)} />
              <Row label="Betalda fakturor" value={kr(data.revenue.paid)} sub={`${data.revenue.paid_count} st`} />
              <Row label="Obetalda fakturor" value={kr(data.revenue.unpaid)} sub={`${data.revenue.invoice_count - data.revenue.paid_count} st`} />
            </div>
          </Section>

          {/* ── Personalkostnader ─────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><Briefcase size={17} className="text-blue-600"/>Personalkostnader</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-3">
              <Row label="Bruttolöner" value={kr(data.payroll.gross_salary)} />
              <Row label={`Arbetsgivaravgifter (${data.constants.arbetsgivaravgift_pct}%)`} value={kr(data.payroll.arbetsgivaravgifter)} note />
              <Row label={`Semesterersättning (${data.constants.semesterersattning_pct}%)`} value={kr(data.payroll.semesterersattning)} />
              <Row label="Utlägg (att ersätta anställda)" value={kr(data.payroll.utlagg)} />
              <Row label="Total personalkostnad" value={kr(data.payroll.total_payroll_cost + data.payroll.utlagg)} highlight />
            </div>

            {/* Per employee */}
            {data.payroll.employees.length > 0 && (
              <div className="rounded-2xl bg-white border border-slate-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      <th className="p-4">Anställd</th>
                      <th className="p-4">Typ</th>
                      <th className="p-4">Timmar</th>
                      <th className="p-4">Bruttolön</th>
                      <th className="p-4">Arb.avg (31,42%)</th>
                      <th className="p-4">Semester (12%)</th>
                      <th className="p-4 font-bold">Total kostnad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payroll.employees.map((e, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-b-0">
                        <td className="p-4 font-semibold text-slate-900">{e.name}</td>
                        <td className="p-4 text-slate-500 text-xs">{e.employment_type === "vikarie" ? "Vikarie" : "Fast"}</td>
                        <td className="p-4 text-slate-600">{e.hours.toFixed(1)} h</td>
                        <td className="p-4 text-slate-700">{kr(e.gross_salary)}</td>
                        <td className="p-4 text-amber-700">{kr(e.arbetsgivaravgift)}</td>
                        <td className="p-4 text-blue-700">{kr(e.semesterersattning)}</td>
                        <td className="p-4 font-bold text-slate-900">{kr(e.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Moms ─────────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><Package size={17} className="text-blue-600"/>Materialkostnader</span>}>
            <Row label="Totalt inkl. moms" value={kr(data.material_costs?.total_incl_moms || 0)} />
            <Row label="Totalt exkl. moms" value={kr(data.material_costs?.total_excl_moms || 0)} />
            <Row label="Ingående moms (avdragsgill)" value={`-${kr(data.material_costs?.ingaende_moms || 0)}`} positive />
            <Row label="Antal kostnadsposter" value={`${data.material_costs?.count || 0} st`} />
          </Section>
          <Section title={<span className="flex items-center gap-2"><Calculator size={17} className="text-amber-600"/>Momsredovisning</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <Row label="Utgående moms (samlad från kunder)" value={kr(data.vat.collected)} />
              <Row label="Ingående moms (uppskattad, material)" value={`-${kr(data.vat.ingoing_estimate)}`} />
              <Row label="Moms att betala Skatteverket" value={kr(data.vat.to_pay)} highlight />
              <p className="text-xs text-slate-400 mt-3">Moms redovisas kvartalsvis (eller månadsvis om omsättning {'>'} 40 Mkr/år). Förfallodatum: den 26:e månaden efter kvartalet. Verifiera alltid ingående moms med dina faktiska kostnadskvitton.</p>
            </div>
          </Section>

          {/* ── Att betala ────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><Landmark size={17} className="text-red-600"/>Att betala (Skyldigheter)</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-3">
              <Row label="Löner att betala ut" value={kr(data.obligations.salaries_to_pay)} sub="Till anställda (netto efter prelskatt)" />
              <div className="my-2 border-t border-slate-100" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Till Skatteverket (AGI — senast 12:e varje månad):</p>
              <Row label={`Arbetsgivaravgifter (${data.constants.arbetsgivaravgift_pct}%)`} value={kr(data.obligations.arbetsgivaravgifter)} indent />
              <Row label={`Preliminärskatt (ca ${data.constants.prelskatt_pct}%)`} value={kr(data.obligations.prelskatt_estimate)} indent sub="Uppskattad — beror på anställdas skattetabell" />
              <div className="my-2 border-t border-slate-100" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Momsdeklaration (kvartalsvis):</p>
              <Row label="Moms att betala" value={kr(data.obligations.vat_to_pay)} indent />
            </div>
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-red-800 text-lg">Totalt att betala till Skatteverket</p>
                  <p className="text-xs text-red-600">Arbetsgivaravgifter + prelskatt + moms</p>
                </div>
                <p className="font-bold text-red-800 text-2xl">{kr(data.obligations.agi_to_pay + data.obligations.vat_to_pay)}</p>
              </div>
            </div>
          </Section>

          {/* ── Resultat ─────────────────────────────────────────── */}
          <Section title={<span className="flex items-center gap-2"><BarChart size={17} className="text-purple-600"/>Resultatsammanfattning</span>}>
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <Row label="Intäkter (exkl. moms)" value={kr(data.result.revenue_excl_vat)} />
              <Row label="Personalkostnader" value={`-${kr(data.payroll.total_payroll_cost + data.payroll.utlagg)}`} />
              <Row label="Rörelseresultat" value={kr(data.result.operating_profit)} highlight />
              <Row label="Vinstmarginal" value={`${data.result.profit_margin}%`} />
            </div>
            <div className={`rounded-2xl border p-5 mt-3 ${data.result.operating_profit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
              <div className="flex items-center gap-3">
                {data.result.operating_profit >= 0
                  ? <CheckCircle size={24} className="text-green-600" />
                  : <AlertCircle size={24} className="text-red-600" />}
                <div>
                  <p className={`font-bold text-lg ${data.result.operating_profit >= 0 ? "text-green-800" : "text-red-800"}`}>
                    {data.result.operating_profit >= 0 ? "Positivt resultat 🎉" : "Negativt resultat ⚠️"}
                  </p>
                  <p className={`text-sm ${data.result.operating_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {data.result.operating_profit >= 0
                      ? `Du tjänar ${kr(data.result.operating_profit)} efter personalkostnader för perioden.`
                      : `Du förlorar ${kr(Math.abs(data.result.operating_profit))} för perioden.`}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Denna översikt är ett uppskattningsverktyg baserat på inlagda fakturor och löner. Bokföringsskatt (bolagsskatt 20,6% på vinst) ingår inte. Kontrollera alltid med din redovisningskonsult eller revisor.
              Arbetsgivaravgifter: {data.constants.arbetsgivaravgift_pct}% (Skatteverket 2026). Semesterersättning: {data.constants.semesterersattning_pct}% (lag om semester).
            </p>
          </Section>
        </>
      )}
    </>
  );
}
