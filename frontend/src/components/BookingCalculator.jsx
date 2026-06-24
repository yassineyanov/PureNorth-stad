import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { FileText } from "lucide-react";

// ── Service type detection ────────────────────────────────────────────────────
const ST_KEYWORDS  = ["fönsterputs","ugnstvätt","kyl/frys","trappstädning"];
const TIM_KEYWORDS = ["hemstädning","storstädning","kontorsstädning","byggstädning"];
const KVM_KEYWORDS = ["flyttstädning"];

const SPEED = { "hemstädning":30, "storstädning":20, "kontorsstädning":35, "byggstädning":18 };

function getType(svcName, unit) {
  const n = svcName.toLowerCase();
  if (unit === "fast") return "fast";
  if (ST_KEYWORDS.some(k  => n.includes(k))) return "st";
  if (KVM_KEYWORDS.some(k => n.includes(k))) return "kvm";
  if (TIM_KEYWORDS.some(k => n.includes(k))) return "tim";
  if (unit === "st")  return "st";
  if (unit === "kvm") return "kvm";
  return "tim";
}

function roundUp(h) { return Math.ceil(h * 2) / 2; }
function fmtKr(n)   { return Math.round(n).toLocaleString("sv-SE") + " kr"; }

// ── Build one row from service + priceItem + booking qty ──────────────────────
function buildRow(svcName, priceItem, bookingQty) {
  const q    = parseInt(bookingQty) || 0;
  const rate = priceItem.price;
  const isRut = priceItem.is_rut_eligible;
  const type  = getType(svcName, priceItem.unit);
  const speedVal = Object.entries(SPEED).find(([k]) => svcName.toLowerCase().includes(k))?.[1] || 30;

  let tim = 0, kvm = 0, antal = 0, lineTotal = 0;
  let invoiceDesc = priceItem.service;
  let invoiceQty  = 1;

  switch (type) {
    case "fast":
      lineTotal   = rate;
      invoiceDesc = priceItem.service;
      invoiceQty  = 1;
      break;

    case "st":
      antal       = q || 1;
      lineTotal   = antal * rate;
      tim         = roundUp(antal * 0.2);
      invoiceDesc = priceItem.service;
      invoiceQty  = antal;
      break;

    case "kvm":
      kvm         = q || 1;
      lineTotal   = kvm * rate;
      tim         = roundUp(kvm / 15);
      invoiceDesc = `${priceItem.service} (${kvm} kvm)`;
      invoiceQty  = kvm;
      break;

    case "tim":
    default:
      kvm         = q || 0;
      tim         = kvm > 0 ? roundUp(kvm / speedVal) : 1;
      lineTotal   = tim * rate;
      invoiceDesc = `${priceItem.service} (${kvm} kvm → ${tim} tim)`;
      invoiceQty  = tim;
      break;
  }

  return { label: priceItem.service, type, tim, kvm, antal, rate, lineTotal, isRut, invoiceDesc, invoiceQty };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BookingCalculator({ booking, onCreateInvoice }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    api.get("/settings/pricelist")
      .then(r => {
        const active = (r.data.items || []).filter(i => i.is_active);
        const built  = (booking.services || []).map(svc => {
          const item = active.find(p =>
            p.service.toLowerCase().includes(svc.toLowerCase()) ||
            svc.toLowerCase().includes(p.service.toLowerCase())
          );
          return item ? buildRow(svc, item, booking.kvm) : null;
        }).filter(Boolean);
        setRows(built);
      })
      .catch(() => toast.error("Kunde inte hämta prislista."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal      = rows.reduce((s, r) => s + r.lineTotal, 0);
  const rutDeduction  = rows.filter(r => r.isRut).reduce((s, r) => s + r.lineTotal * 0.5, 0);
  const moms          = subtotal * 0.25;
  const totalInclMoms = subtotal + moms;
  const attBetala     = totalInclMoms - rutDeduction;

  // ── Create invoice ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const invoiceItems = rows.map(r => ({
        service:     r.invoiceDesc,
        description: r.invoiceDesc,
        quantity:    r.invoiceQty,
        unit_price:  r.rate,
        is_material: false,
      }));
      const hasRut = rows.some(r => r.isRut);
      const totals = {
        subtotal:      Math.round(subtotal),
        rut_deduction: Math.round(rutDeduction),
        vat_amount:    Math.round(moms),
        total_amount:  Math.round(totalInclMoms),
        customer_pays: Math.round(attBetala),
        rut_eligible:  hasRut,
      };
      await onCreateInvoice(invoiceItems, totals);
    } catch { toast.error("Kunde inte skapa faktura."); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <p className="text-sm text-slate-400 p-4">Hämtar priser...</p>;
  if (!rows.length) return (
    <p className="text-sm text-slate-400 p-4 text-center">
      Inga matchande tjänster i prislistan. Kontrollera Prislista.
    </p>
  );

  return (
    <div className="space-y-4">

      {/* ── Items table ── */}
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide">
              <th className="p-3 text-left">Tjänst</th>
              <th className="p-3 text-right">Beräkning</th>
              <th className="p-3 text-right">À-pris</th>
              <th className="p-3 text-right">Belopp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-slate-50 ${i%2===1?"bg-slate-50/40":""}`}>
                <td className="p-3 font-medium text-slate-900">
                  {r.label}
                  {r.isRut && <span className="ml-2 text-xs bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">RUT</span>}
                </td>
                <td className="p-3 text-right text-slate-500 text-xs">
                  {r.type === "st"   && `${r.antal} st`}
                  {r.type === "kvm"  && `${r.kvm} kvm`}
                  {r.type === "tim"  && `${r.kvm} kvm → ${r.tim} tim`}
                  {r.type === "fast" && "Fast pris"}
                </td>
                <td className="p-3 text-right text-slate-500">
                  {r.type === "st"   && `${fmtKr(r.rate)}/st`}
                  {r.type === "kvm"  && `${fmtKr(r.rate)}/kvm`}
                  {r.type === "tim"  && `${fmtKr(r.rate)}/tim`}
                  {r.type === "fast" && fmtKr(r.rate)}
                </td>
                <td className="p-3 text-right font-semibold">{fmtKr(r.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Summary ── */}
      <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Delsumma (exkl. moms)</span>
          <span className="font-medium">{fmtKr(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Moms (25%)</span>
          <span className="font-medium">{fmtKr(moms)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Totalt inkl. moms</span>
          <span className="font-medium">{fmtKr(totalInclMoms)}</span>
        </div>
        {rutDeduction > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">RUT-avdrag (50% av arbetskostnad)</span>
            <span className="font-medium text-green-600">-{fmtKr(rutDeduction)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-1">
          <span>ATT BETALA</span>
          <span className="text-green-700">{fmtKr(attBetala)}</span>
        </div>
      </div>

      {/* ── Button ── */}
      <button onClick={handleCreate}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#141414] hover:bg-black text-white font-semibold py-3 transition-colors">
        <FileText size={16}/> Skapa faktura automatiskt
      </button>

    </div>
  );
}
