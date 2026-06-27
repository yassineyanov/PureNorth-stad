import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Calculator, FileText } from "lucide-react";

const SPEED = {
  hem: { kvm: 30, label: "Hemstädning ~30 kvm/tim" },
  flytt: { kvm: 15, label: "Flyttstädning ~15 kvm/tim" },
  stor: { kvm: 20, label: "Storstädning ~20 kvm/tim" },
  bygg: { kvm: 18, label: "Byggstädning ~18 kvm/tim" },
  kontor: { kvm: 35, label: "Kontorsstädning ~35 kvm/tim" },
  trappa: { kvm: null, label: "Fast pris per tillfälle" },
};

function getSpeed(serviceName) {
  const n = serviceName.toLowerCase();
  if (n.includes("hemstäd")) return 30;
  if (n.includes("flytt")) return 15;
  if (n.includes("storstäd")) return 20;
  if (n.includes("byggstäd")) return 18;
  if (n.includes("kontor")) return 35;
  if (n.includes("trapp")) return null;
  if (n.includes("fönster")) return null;
  return null;
}

function kr(n) { return Math.round(n).toLocaleString("sv-SE") + " kr"; }

function ServiceCalc({ item, onAddToInvoice, bookingKvm }) {
  const speed = getSpeed(item.service);
  const isKvm = item.unit === "kvm" || (item.unit === "tim" && speed !== null);
  const isSt = item.unit === "st";
  const isFast = item.unit === "fast";
  const isTim = item.unit === "tim" && speed === null;

  const defaultQty = bookingKvm ? parseInt(bookingKvm) : (isKvm ? 75 : isSt ? 5 : 1);
  const [qty, setQty] = useState(defaultQty);
  const [qtyInput, setQtyInput] = useState(String(defaultQty));
  React.useEffect(() => {
    if (bookingKvm) { setQty(parseInt(bookingKvm) || 1); setQtyInput(String(parseInt(bookingKvm) || 1)); }
  }, [bookingKvm, isKvm]);
  const [rate, setRate] = useState(item.price);
  const [rateInput, setRateInput] = useState(String(item.price));

  const hoursRaw = isKvm && speed ? qty / speed : isTim ? qty : isSt ? qty * 0.2 : 1;
  const hours = Math.ceil(hoursRaw * 2) / 2; // Round up to nearest 0.5 tim
  const price = isFast ? rate : isKvm ? hours * rate : qty * rate;
  const priceRut = price * 0.5;
  const isRut = item.is_rut_eligible;

  const maxQty = isKvm ? 300 : isSt ? 50 : isTim ? 20 : 1;
  const minQty = isKvm ? 10 : 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <p className="font-semibold text-slate-900 text-sm mb-4">{item.service}</p>

      {/* Quantity input */}
      {!isFast && (
        <div className="mb-3">
          <label className="text-xs text-slate-500 block mb-1">
            {isKvm ? "Yta (kvm)" : isSt ? "Antal (st)" : "Timmar"}
          </label>
          <div className="flex items-center gap-2">
            <input type="range" min={minQty} max={maxQty} step={isKvm?5:1} value={qty}
              onChange={e=>setQty(+e.target.value)} className="flex-1"/>
            <input type="number" min={minQty} max={maxQty} value={qtyInput}
              onChange={e=>setQtyInput(e.target.value)}
              onBlur={e=>{const v=e.target.value===""?minQty:Math.max(minQty,Math.min(maxQty,+e.target.value||minQty));setQty(v);setQtyInput(String(v));}}
              onKeyDown={e=>{if(e.key==="Enter"){const v=Math.max(minQty,Math.min(maxQty,+qtyInput||minQty));setQty(v);setQtyInput(String(v));}}}
              className="w-20 text-center rounded-lg border border-slate-200 text-sm py-1 outline-none focus:border-[#141414]"/>
          </div>
        </div>
      )}

      {/* Rate input */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 block mb-1">
          Pris ({item.unit === "tim" ? "kr/tim" : item.unit === "kvm" ? "kr/kvm" : item.unit === "st" ? "kr/st" : "kr fast"})
        </label>
        <div className="flex items-center gap-2">
          <input type="range" min={100} max={2000} step={10} value={rate}
            onChange={e=>setRate(+e.target.value)} className="flex-1"/>
          <input type="number" min={0} value={rate}
            onChange={e=>setRate(+e.target.value||0)}
            className="w-20 text-center rounded-lg border border-slate-200 text-sm py-1 outline-none focus:border-[#141414]"/>
        </div>
      </div>

      {/* Results */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-2 mb-3">
        {!isFast && speed && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tid (avrundad uppåt)</span>
            <span className="font-medium">{hours.toFixed(1)} tim</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Pris</span>
          <span className="font-medium">{kr(price)}</span>
        </div>
        {isRut && (
          <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
            <span className="text-green-600 text-xs">Kund betalar (50% RUT)</span>
            <span className="font-semibold text-green-700">{kr(priceRut)}</span>
          </div>
        )}
      </div>

      <button onClick={() => onAddToInvoice({ service: item.service, qty: isFast ? 1 : qty, rate, hours, price, isRut })}
        className="w-full flex items-center justify-center gap-1.5 rounded-full border border-slate-200 hover:border-[#141414] text-slate-700 text-xs font-semibold py-2 transition-colors">
        <FileText size={13}/> Lägg till faktura
      </button>
    </div>
  );
}

export default function PriceCalculator({ bookingKvm, bookingServices, onCreateInvoice }) {
  const [items, setItems] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);

  useEffect(() => {
    api.get("/settings/pricelist").then(r => {
      const allActive = (r.data.items || []).filter(i => i.is_active);
      if (bookingServices?.length > 0) {
        // First try exact/partial match
        let matched = allActive.filter(i => bookingServices.some(s =>
          i.service.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(i.service.toLowerCase())
        ));
        // If no match found, show all active items
        setItems(matched.length > 0 ? matched : allActive);
      } else {
        setItems(allActive);
      }
    }).catch(() => {});
  }, [bookingServices]);

  const addToInvoice = (item) => {
    setInvoiceItems(prev => {
      const next = prev.find(i => i.service === item.service)
        ? prev.map(i => i.service === item.service ? item : i)
        : [...prev, item];
      // Save to sessionStorage for InvoicePanel to pick up
      sessionStorage.setItem("calc_invoice_items", JSON.stringify(next));
      return next;
    });
    toast.success(`${item.service} lagd till faktura`);
  };

  const totalPrice = invoiceItems.reduce((sum, i) => sum + i.price, 0);
  const totalRut = invoiceItems.filter(i => i.isRut).reduce((sum, i) => sum + i.price * 0.5, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={18} className="text-slate-600"/>
        <h3 className="font-display font-bold text-lg text-slate-900">Priskalkylator</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        {items.map(item => (
          <ServiceCalc key={item.id} item={item} onAddToInvoice={addToInvoice} bookingKvm={bookingKvm}/>
        ))}
      </div>

      {invoiceItems.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <p className="font-semibold text-slate-900 mb-3">Faktura-sammanfattning</p>
          <div className="space-y-2 mb-4">
            {invoiceItems.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-600">{i.service} {i.qty > 1 ? `× ${i.qty}` : ""}</span>
                <div className="text-right">
                  <span className="font-medium">{kr(i.price)}</span>
                  {i.isRut && <span className="text-green-600 text-xs ml-2">(RUT: {kr(i.price*0.5)})</span>}
                </div>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold">
              <span>Totalt</span>
              <span>{kr(totalPrice)}</span>
            </div>
            {totalRut > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Kund betalar efter RUT</span>
                <span className="font-semibold">{kr(totalPrice - totalRut)}</span>
              </div>
            )}
          </div>
          <button onClick={() => onCreateInvoice && onCreateInvoice(invoiceItems)}
            className="w-full rounded-full bg-[#141414] hover:bg-black text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
            <FileText size={15}/> Skapa faktura automatiskt
          </button>
        </div>
      )}
    </div>
  );
}
