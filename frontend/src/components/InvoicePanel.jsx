import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileSpreadsheet, X, Trash2, Download, Settings, ChevronDown, ChevronUp, FileText, Link2, Pencil, Eye, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS = {
  draft: { label: "Utkast", cls: "bg-slate-100 text-slate-600" },
  sent: { label: "Skickad", cls: "bg-blue-50 text-blue-700" },
  paid: { label: "Betald", cls: "bg-green-50 text-green-700" },
  overdue: { label: "Förfallen", cls: "bg-red-50 text-red-700" },
};

// SERVICE_TYPES now comes from priceList dynamically

function defaultDueDate(paymentTermsDays) {
  const d = new Date();
  d.setDate(d.getDate() + (paymentTermsDays || 30));
  return d.toISOString().slice(0, 10);
}

function inferItems(initialItems, defaultService = "Hemstädning", defaultPrice = 0) {
  if (!initialItems || initialItems.length === 0) {
    return [{ service: defaultService, description: defaultService, quantity: 1, unit_price: defaultPrice, is_material: false }];
  }
  return initialItems.map((it) => {
    // Clean service name - remove kvm/tim info added by calculator
    const cleanService = (s) => s ? s.replace(/\s*\(.*?\)\s*/g, "").trim() : s;
    const svc = cleanService(it.service || it.description || defaultService);
    const desc = it.description || it.service || defaultService;
    // Detect Påminnelseavgift from either field
    const isPaminnelse = svc.includes("Påminnelse") || desc.includes("Påminnelse") ||
                         (it.unit_price === 60 && it.quantity === 1 && !it.is_material && 
                          (it.description || "").includes("inkasso"));
    return {
      service: isPaminnelse ? "Påminnelseavgift" : svc,
      description: isPaminnelse ? "Påminnelseavgift enligt inkassolagen" : desc,
      quantity: it.quantity,
      unit_price: it.unit_price,
      is_material: it.is_material,
      kvm: it.kvm || 0,
    };
  });
}

function InvoiceSettingsPanel({ settings, onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 mb-6">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-6 py-4">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-900"><Settings size={16} /> Företagsuppgifter och betalning</span>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && (
        <form onSubmit={submit} className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Företagsnamn</Label>
              <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Organisationsnummer</Label>
              <Input value={form.company_orgnr || ""} onChange={(e) => setForm((f) => ({ ...f, company_orgnr: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Adress</Label>
            <Input value={form.company_address || ""} onChange={(e) => setForm((f) => ({ ...f, company_address: e.target.value }))} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">E-post</Label>
              <Input value={form.company_email || ""} onChange={(e) => setForm((f) => ({ ...f, company_email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={form.company_phone || ""} onChange={(e) => setForm((f) => ({ ...f, company_phone: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bankgiro</Label>
              <Input value={form.bankgiro || ""} onChange={(e) => setForm((f) => ({ ...f, bankgiro: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Plusgiro</Label>
              <Input value={form.plusgiro || ""} onChange={(e) => setForm((f) => ({ ...f, plusgiro: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">IBAN</Label>
              <Input value={form.iban || ""} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Moms (%)</Label>
              <Input type="number" step="0.1" value={form.vat_rate} onChange={(e) => setForm((f) => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Betalningsvillkor (dagar)</Label>
              <Input type="number" value={form.payment_terms_days} onChange={(e) => setForm((f) => ({ ...f, payment_terms_days: parseInt(e.target.value) || 30 }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Logotyp (visas i PDF)</Label>
            <div className="mt-1.5 flex items-center gap-3">
              {form.company_logo && (
                <img src={form.company_logo} alt="Logo" className="h-12 w-auto rounded-lg border border-slate-200 object-contain bg-white p-1" />
              )}
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 border border-slate-200 rounded-full px-3 py-2 hover:border-[#141414] transition-colors">
                <Upload size={13} /> {form.company_logo ? "Byt logotyp" : "Ladda upp logotyp"}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const logoData = ev.target.result;
                    setForm((f) => ({ ...f, company_logo: logoData }));
                    try {
                      await api.put("/settings/invoice/logo", { company_logo: logoData });
                      toast.success("Logotyp sparad!");
                    } catch {
                      toast.error("Kunde inte spara logotypen.");
                    }
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
              {form.company_logo && (
                <button type="button" onClick={async () => {
                  setForm((f) => ({ ...f, company_logo: null }));
                  try { await api.put("/settings/invoice/logo", { company_logo: null }); } catch {}
                }} className="text-xs text-red-500 hover:underline">Ta bort</button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400">Nästa fakturanummer: {form.next_invoice_number}</p>
          <button type="submit" disabled={saving} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : "Spara uppgifter"}
          </button>
        </form>
      )}
    </div>
  );
}

function InvoiceModal({ initial, bookings, settings, priceList, onClose, onSave }) {
  const isEdit = Boolean(initial);
  const [customerName, setCustomerName] = useState(initial?.customer_name || "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customer_email || "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customer_phone || "");
  const [customerAddress, setCustomerAddress] = useState(() => {
    if (initial?.customer_address) return initial.customer_address;
    if (initial?.booking_id) {
      const booking = bookings?.find(b => b.id === initial.booking_id);
      return booking?.address || "";
    }
    return "";
  });
  const [customerPersonnummer, setCustomerPersonnummer] = useState(initial?.customer_personnummer || "");
  const [customerType, setCustomerType] = useState(initial?.customer_type || "private");
  const [rutEligible, setRutEligible] = useState(initial ? initial.rut_eligible : false);
  const [bookingId, setBookingId] = useState(initial?.booking_id || "");
  const firstService = priceList.find((p) => p.is_active)?.service || "Hemstädning";
  const firstPrice = priceList.find((p) => p.is_active)?.price || 0;
  const [items, setItems] = useState(() => {
    const inferred = inferItems(initial?.items, firstService, firstPrice);
    // If kvm is null but we have a booking, try to get kvm from it
    if (initial?.booking_id) {
      const booking = bookings?.find(b => b.id === initial.booking_id);
      if (booking?.kvm) {
        return inferred.map(it => ({
          ...it,
          kvm: it.kvm || parseFloat(booking.kvm) || 0
        }));
      }
    }
    return inferred;
  });
  const [note, setNote] = useState(initial?.note || "");
  const [dueDate, setDueDate] = useState(initial?.due_date || defaultDueDate(settings?.payment_terms_days));
  const [saving, setSaving] = useState(false);

  const applyBooking = async (id) => {
    setBookingId(id);
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setCustomerName(b.name);
    setCustomerEmail(b.email || "");
    setCustomerPhone(b.phone || "");

    // Check sessionStorage from calculator first
    const saved = sessionStorage.getItem("calc_invoice_items");
    if (saved) {
      try {
        const calcItems = JSON.parse(saved);
        const newItems = calcItems.map(ci => ({
          service: ci.service, description: ci.service,
          quantity: ci.hours || ci.qty || 1,
          unit_price: ci.rate || 0, is_material: false,
        }));
        setItems(newItems);
        toast.success("Priser hämtade från kalkylatorn!");
        sessionStorage.removeItem("calc_invoice_items");
        return;
      } catch {}
    }

    // Auto-calculate from booking services + kvm
    if (b.services?.length > 0) {
      try {
        const plRes = await api.get("/settings/pricelist");
        const priceItems = (plRes.data.items || []).filter(p => p.is_active);
        const SPEED = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35};
        const ST = ["fönsterputs","ugnstvätt","kyl/frys","trappstädning"];
        const qty = parseInt(b.kvm) || 0;
        const autoItems = b.services.map(svc => {
          const item = priceItems.find(p =>
            p.service.toLowerCase().includes(svc.toLowerCase()) ||
            svc.toLowerCase().includes(p.service.toLowerCase())
          );
          if (!item) return null;
          const speedKey = Object.keys(SPEED).find(k => svc.toLowerCase().includes(k));
          const speed = speedKey ? SPEED[speedKey] : null;
          const st = ST.some(s => svc.toLowerCase().includes(s));
          const isFast = item.unit === "fast";
          let quantity = 1;
          if (isFast) { quantity = 1; }
          else if (st) { quantity = qty || 1; }
          else if (speed && qty) { quantity = Math.ceil((qty / speed) * 2) / 2; }
          else { quantity = qty || 1; }
          const kvm = (speed && qty) ? qty : 0;
          return { service: item.service, description: item.service, quantity, unit_price: item.price, is_material: false, kvm };
        }).filter(Boolean);
        if (autoItems.length > 0) {
          setItems(autoItems);
          toast.success("Priser beräknade automatiskt från bokningen!");
        }
      } catch {}
    }
  };

  const updateItem = (i, field, value) => {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };

  const isCustomService = (svc) => !priceList.find((p) => p.service === svc);

  const updateService = (i, service) => {
    const nonReminder = items.map((item, oIdx) => ({...item, originalIdx: oIdx})).filter(item => item.service !== "Påminnelseavgift");
    const originalIdx = nonReminder[i]?.originalIdx;
    if (originalIdx === undefined) return;
    setItems((arr) => arr.map((it, idx) => {
      if (idx !== i) return it;
      const priceMatch = priceList.find((p) => p.service === service && p.is_active);
      const newPrice = priceMatch ? priceMatch.price : it.unit_price;
      if (service === "Annat" || isCustomService(service)) {
        return { ...it, service, description: "", unit_price: newPrice };
      }
      return { ...it, service, description: service, unit_price: newPrice };
    }));
  };

  const addItem = () => {
    const first = priceList.find(p => p.is_active);
    const svc = first ? first.service : "Hemstädning";
    const price = first ? first.price : 0;
    setItems((arr) => [...arr, { service: svc, description: svc, quantity: 1, unit_price: price, is_material: false }]);
  };
  const removeItem = (i) => {
    // i is index in non-reminder items
    const nonReminder = items.map((item, idx) => ({...item, originalIdx: idx})).filter(item => item.service !== "Påminnelseavgift");
    const originalIdx = nonReminder[i]?.originalIdx;
    if (originalIdx !== undefined) setItems(arr => arr.filter((_, idx) => idx !== originalIdx));
  };

  const laborTotal = items.filter((i) => !i.is_material).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const materialTotal = items.filter((i) => i.is_material).reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const subtotal = laborTotal + materialTotal;
  const vatAmount = subtotal * ((settings?.vat_rate ?? 25) / 100);
  const totalAmount = subtotal + vatAmount;
  const rutDeduction = rutEligible && customerType === "private" ? laborTotal * 0.5 : 0;
  const customerPays = totalAmount - rutDeduction;

  const submit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || items.length === 0) return;
    if (items.some((it) => !it.description.trim())) {
      toast.error("Fyll i beskrivning för alla rader.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        booking_id: bookingId || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        customer_personnummer: customerPersonnummer.trim() || null,
        customer_type: customerType,
        rut_eligible: rutEligible,
        items: items.map((i) => ({
          service: i.service,
          description: i.description,
          quantity: parseFloat(i.quantity) || 0,
          unit_price: parseFloat(i.unit_price) || 0,
          is_material: i.is_material,
          kvm: parseFloat(i.kvm) || 0,
        })),
        note: note.trim() || null,
        due_date: dueDate || null,
      };
      await onSave(payload, initial?.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl p-7 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">{isEdit ? `Redigera faktura #${initial.invoice_number}` : "Ny faktura"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!isEdit && (
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><Link2 size={13} /> Koppla till bokning (valfritt)</Label>
              <select value={bookingId} onChange={(e) => applyBooking(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                <option value="">Ingen bokning</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} · {b.email}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-xs">Kundnamn</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Typ</Label>
              <select value={customerType} onChange={(e) => { setCustomerType(e.target.value); if (e.target.value === "company") setRutEligible(false); }} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                <option value="private">Privatperson</option>
                <option value="company">Företag</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-xs">E-post</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Adress</Label>
            <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs">Förfallodatum</Label>
            <Input type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>

          {customerType === "private" && (
            <div className="rounded-xl bg-slate-50 p-3.5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <input type="checkbox" checked={rutEligible} onChange={(e) => setRutEligible(e.target.checked)} className="rounded" />
                RUT-avdrag (50% av arbetskostnad)
              </label>
              {rutEligible && (
                <div>
                  <Label className="text-xs">Personnummer</Label>
                  <Input value={customerPersonnummer} onChange={(e) => setCustomerPersonnummer(e.target.value)} className="mt-1" placeholder="ÅÅMMDD-XXXX" />
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Rader</Label>
              <button type="button" onClick={addItem} className="text-xs font-semibold text-[#141414] inline-flex items-center gap-1"><Plus size={13} /> Lägg till rad</button>
            </div>
            <div className="space-y-2">
              {/* Show Påminnelseavgift as read-only */}
              {items.filter(it => it.service === "Påminnelseavgift").map((it, i) => (
                <div key={`reminder-${i}`} className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Påminnelseavgift (ingen moms)</p>
                    <p className="text-xs text-amber-600">Tillagd automatiskt enligt inkassolagen</p>
                  </div>
                  <p className="text-sm font-bold text-amber-800">+{it.unit_price.toFixed(2)} kr</p>
                </div>
              ))}
              {items.filter(it => it.service !== "Påminnelseavgift").map((it, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px] text-slate-400 mb-1 block">Tjänster</Label>
                    <select value={it.service} onChange={(e) => updateService(i, e.target.value)} className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 outline-none focus:border-[#141414] bg-white">
                      {[...priceList.filter((p) => p.is_active).map((p) => p.service),
                        ...(priceList.some(p => p.service === it.service) ? [] : [it.service]),
                        "Annat"]
                        .filter((s, idx, arr) => arr.indexOf(s) === idx)
                        .map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    </div>
                    {priceList.find((p) => p.service === it.service) && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {priceList.find((p) => p.service === it.service)?.price} kr/{priceList.find((p) => p.service === it.service)?.unit}
                      </span>
                    )}
                  </div>
                  {it.service === "Annat" && (
                    <Input value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Beskrivning" className="text-sm" />
                  )}
                  <div className="grid grid-cols-4 gap-2 items-end">
                    {(() => {
                      const pl = priceList.find(p=>p.service===it.service);
                      const SPEED_MAP = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35};
                      const speedKey = pl ? Object.keys(SPEED_MAP).find(k=>pl.service.toLowerCase().includes(k)) : null;
                      const speed = speedKey ? SPEED_MAP[speedKey] : 20;
                      const isTimBased = pl?.unit === "tim" || pl?.unit === "kvm";
                      if (isTimBased) return (<>
                        <div>
                          <Label className="text-[10px] text-slate-400">Yta (kvm)</Label>
                          <Input type="number" step="1" value={it.kvm||""} onChange={e=>{const kvm=parseFloat(e.target.value)||0;const tim=Math.ceil((kvm/speed)*2)/2;updateItem(i,"kvm",kvm);updateItem(i,"quantity",tim);}} className="text-sm mt-0.5" placeholder="0"/>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-slate-400 mb-2">→</span>
                          <div className="flex-1">
                            <Label className="text-[10px] text-slate-400">tim</Label>
                            <Input type="number" step="0.5" value={it.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} className="text-sm mt-0.5"/>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">À-Pris (kr)</Label>
                          <Input type="number" step="0.01" value={it.unit_price} onChange={e=>updateItem(i,"unit_price",e.target.value)} className="text-sm mt-0.5"/>
                        </div>
                      </>);
                      return (<>
                        <div>
                          <Label className="text-[10px] text-slate-400">{pl?.unit==="st"?"Antal":"Antal"}</Label>
                          <Input type="number" step="0.01" value={it.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} className="text-sm mt-0.5"/>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">À-pris (kr)</Label>
                          <Input type="number" step="0.01" value={it.unit_price} onChange={e=>updateItem(i,"unit_price",e.target.value)} className="text-sm mt-0.5"/>
                        </div>
                        <div/>
                      </>);
                    })()}
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 justify-self-end self-center">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Anteckning (valfritt)</Label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 space-y-1.5 text-sm">
            {(() => {
              // Separate reminder fee (no moms) from regular items
              const reminderItem = items.find(i => i.service === "Påminnelseavgift");
              const reminderFee = reminderItem ? (parseFloat(reminderItem.quantity)||1) * (parseFloat(reminderItem.unit_price)||0) : 0;
              const workItems = items.filter(i => i.service !== "Påminnelseavgift");

              // Step 1: Calculate original invoice
              const laborItems = workItems.filter(i => !i.is_material);
              const matItems = workItems.filter(i => i.is_material);
              const laborSum = laborItems.reduce((s,i) => s + (parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0), 0);
              const matSum = matItems.reduce((s,i) => s + (parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0), 0);
              const delsumma = laborSum + matSum;
              const moms = delsumma * ((settings?.vat_rate ?? 25) / 100);
              const totaltInklMoms = delsumma + moms;
              const rutAvdrag = rutEligible && customerType === "private" ? laborSum * 0.5 : 0;
              const afterRut = totaltInklMoms - rutAvdrag;

              // Step 2: Add Påminnelseavgift AFTER (no moms on it)
              // Use saved customer_pays if available (from DB/calculator)
              const savedPays = initial?.customer_pays;
              const attBetala = savedPays != null && !reminderFee ? savedPays : (afterRut + reminderFee);

              return (<>
                <div className="flex justify-between text-slate-600">
                  <span>Delsumma (exkl. moms)</span><span>{delsumma.toFixed(2)} kr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Moms ({(settings?.vat_rate ?? 25).toFixed(0)}%)</span><span>{moms.toFixed(2)} kr</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Totalt inkl. moms</span><span>{totaltInklMoms.toFixed(2)} kr</span>
                </div>
                {rutAvdrag > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>RUT-avdrag (50%)</span><span>-{rutAvdrag.toFixed(2)} kr</span>
                  </div>
                )}
                {reminderFee > 0 && (
                  <div className="flex justify-between text-amber-700 border-t border-slate-200 pt-1.5">
                    <span>Påminnelseavgift (ingen moms)</span><span>+{reminderFee.toFixed(2)} kr</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200 text-base">
                  <span>ATT BETALA</span><span className="text-green-700">{attBetala.toFixed(2)} kr</span>
                </div>
              </>);
            })()}
          </div>

          <button type="submit" disabled={saving || !customerName.trim()} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : isEdit ? "Spara ändringar" : "Skapa faktura"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function InvoicePanel() {
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [priceList, setPriceList] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, bookRes, setRes, priceRes] = await Promise.all([
        api.get("/invoices"),
        api.get("/bookings"),
        api.get("/settings/invoice"),
        api.get("/settings/pricelist"),
      ]);
      setInvoices(invRes.data);
      setBookings(bookRes.data);
      setSettings(setRes.data);
      setPriceList(priceRes.data.items || []);
    } catch {
      toast.error("Kunde inte hämta fakturor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (form) => {
    try {
      const res = await api.put("/settings/invoice", form);
      setSettings(res.data);
      toast.success("Uppgifter sparade.");
    } catch {
      toast.error("Kunde inte spara uppgifter.");
    }
  };

  const openCreate = () => { setEditingInvoice(null); setModalOpen(true); };
  const openEdit = (inv) => { setEditingInvoice(inv); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingInvoice(null); };

  const saveInvoice = async (payload, id) => {
    try {
      if (id) {
        const res = await api.put(`/invoices/${id}`, payload);
        setInvoices((inv) => inv.map((x) => (x.id === id ? res.data : x)));
        toast.success("Faktura uppdaterad.");
      } else {
        const res = await api.post("/invoices", payload);
        setInvoices((inv) => [res.data, ...inv]);
        toast.success("Faktura skapad.");
      }
      closeModal();
    } catch {
      toast.error("Kunde inte spara fakturan.");
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status });
      setInvoices((inv) => inv.map((x) => (x.id === id ? { ...x, status, paid_at: status === "paid" ? new Date().toISOString() : x.paid_at } : x)));
      toast.success("Status uppdaterad.");
    } catch {
      toast.error("Kunde inte uppdatera status.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort denna faktura?")) return;
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices((inv) => inv.filter((x) => x.id !== id));
      toast.success("Faktura borttagen.");
    } catch {
      toast.error("Kunde inte ta bort fakturan.");
    }
  };

  const sendInvoice = async (inv) => {
    if (!inv.customer_email) {
      toast.error("Kunden har ingen e-postadress.");
      return;
    }
    if (!window.confirm(`Skicka faktura #${inv.invoice_number} till ${inv.customer_email}?`)) return;
    try {
      await api.post(`/invoices/${inv.id}/send`);
      toast.success(`Faktura skickad till ${inv.customer_email}!`);
      load();
    } catch(err) {
      toast.error(err.response?.data?.detail || "Kunde inte skicka faktura.");
    }
  };

  const sendReminder = async (inv) => {
    if (!inv.customer_email) {
      toast.error("Kunden har ingen e-postadress.");
      return;
    }
    const count = (inv.reminder_count || 0) + 1;
    const fee = count >= 2 ? " (inkl. 60 kr påminnelseavgift)" : "";
    if (!window.confirm(`Skicka påminnelse #${count} till ${inv.customer_email}?${fee}`)) return;
    try {
      const res = await api.post(`/invoices/${inv.id}/remind`);
      toast.success(res.data.message || "Påminnelse skickad!");
      await load();
    } catch(err) {
      toast.error(err.response?.data?.detail || "Kunde inte skicka påminnelse.");
    }
  };

  const viewPdf = (inv) => {
    const token = localStorage.getItem("pn_token") || "";
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    window.open(`${backendUrl}/api/invoices/${inv.id}/pdf?token=${token}`, "_blank");
  };

  const totalOutstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.customer_pays, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Fakturor</h2>
          <p className="text-sm text-slate-500 mt-0.5">Obetalt: {totalOutstanding.toFixed(2)} kr</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/invoices/export-xlsx?token=${token}`;
            a.download = "fakturor.xlsx";
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            window.open(`${base}/api/invoices/export-pdf?token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] rounded-full px-4 py-2 hover:bg-black transition-colors">
          <Plus size={15} /> Ny faktura
        </button>
        </div>
      </div>

      {settings && <InvoiceSettingsPanel settings={settings} onSave={saveSettings} />}

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <FileText size={28} className="text-slate-300" />
          Inga fakturor ännu.
        </div>
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv) => (
            <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border border-slate-100 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h3 className="font-semibold text-slate-900">#{inv.invoice_number} · {inv.customer_name}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS[inv.status]?.cls}`}>{STATUS[inv.status]?.label}</span>
                </div>
                <p className="text-sm text-slate-600">
                  Förfaller {inv.due_date} · <strong>{inv.customer_pays.toFixed(2)} kr</strong>
                  {inv.rut_deduction > 0 && <span className="text-green-700"> (varav RUT -{inv.rut_deduction.toFixed(2)} kr)</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select value={inv.status} onChange={(e) => setStatus(inv.id, e.target.value)} className="rounded-full border border-slate-200 text-sm px-3.5 py-2 outline-none focus:border-[#141414]">
                  <option value="draft">Utkast</option>
                  <option value="sent">Skickad</option>
                  <option value="paid">Betald</option>
                  <option value="overdue">Förfallen</option>
                </select>
                <button onClick={() => openEdit(inv)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors" title="Redigera">
                  <Pencil size={16} />
                </button>
                <button onClick={() => sendInvoice(inv)} title="Skicka till kund"
                  className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
                {(inv.status === "sent" || inv.status === "overdue") && (
                  <button onClick={() => sendReminder(inv)} title={`Skicka påminnelse ${(inv.reminder_count||0)+1}`}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    {inv.reminder_count > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{inv.reminder_count}</span>}
                  </button>
                )}
                <button onClick={() => viewPdf(inv)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors" title="Visa faktura">
                  <Eye size={16} />
                </button>

                <button onClick={() => remove(inv.id)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <InvoiceModal initial={editingInvoice} bookings={bookings} settings={settings} priceList={priceList} onClose={closeModal} onSave={saveInvoice} />}
      </AnimatePresence>

      <p className="text-xs text-slate-400 mt-4">
        RUT-avdraget beräknas som 50% av arbetskostnaden för privatpersoner. Kontrollera alltid mot Skatteverkets aktuella regler och din redovisningskonsult.
      </p>
    </>
  );
}
