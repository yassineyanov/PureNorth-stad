import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, FileSpreadsheet, FileText, Hash, Mail, MapPin, Maximize, Phone, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const STATUS = {
  new: { label: "Ny", cls: "bg-blue-50 text-blue-700" },
  contacted: { label: "Kontaktad", cls: "bg-amber-50 text-amber-700" },
  done: { label: "Klar", cls: "bg-green-50 text-green-700" },
};

export function BookingsPanel({ selectedBooking: initialSelected, setSelectedBooking: setParentSelected }) {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBookingLocal] = React.useState(initialSelected || null);
  React.useEffect(() => { if(initialSelected) setSelectedBookingLocal(initialSelected); }, [initialSelected]);
  const setSelectedBooking = (id) => { setSelectedBookingLocal(id); if(setParentSelected) setParentSelected(id); };
  const [bookingsLastUpdated, setBookingsLastUpdated] = React.useState(null);
  const [loading, setLoading] = useState(true);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [expandedCalc, setExpandedCalc] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editBookingForm, setEditBookingForm] = useState({});
  const [editBookingSaving, setEditBookingSaving] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ name:"", email:"", phone:"", kvm:"", services:[], preferred_date:"", other_description:"", recurrence:"biweekly", occurrences:6 });
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", kvm: "", services: [], preferred_date: "", other_description: "" });
  const [saving, setSaving] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = (await api.get("/bookings")).data;
      setBookings(prev => {
        const prevStr = JSON.stringify(prev.map(b=>b.id+b.status));
        const newStr = JSON.stringify(data.map(b=>b.id+b.status));
        return prevStr === newStr ? prev : data;
      });
    } catch {
      if (!silent) toast.error("Kunde inte hämta bokningar.");
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { load(); const interval = setInterval(() => load(true), 1000); return () => clearInterval(interval); }, []);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      setBookings((b) => b.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch {
      toast.error("Kunde inte uppdatera status.");
    }
  };

  const [allServices, setAllServices] = useState(["Hemstädning","Flyttstädning","Kontorsstädning","Storstädning","Fönsterputs","Byggstädning","Annat"]);
  const SERVICE_OPTIONS = allServices;

  useEffect(() => {
    api.get("/settings/pricelist").then(r => {
      const active = r.data.items?.filter(p => p.is_active && !p.service.includes("(fast)")).map(p => p.service) || [];
      if (active.length > 0) setAllServices([...active, "Annat"].filter((s,i,a) => a.indexOf(s) === i));
    }).catch(() => {});
  }, []);

  const toggleRecurringService = (svc) => {
    setRecurringForm((f) => ({
      ...f,
      services: f.services.includes(svc) ? f.services.filter(s=>s!==svc) : [...f.services, svc]
    }));
  };

  const createRecurring = async (e) => {
    e.preventDefault();
    if (!recurringForm.name || !recurringForm.phone || !recurringForm.preferred_date) return;
    setRecurringSaving(true);
    try {
      const res = await api.post("/bookings/recurring", recurringForm);
      toast.success(`${res.data.created} återkommande bokningar skapade! ✅`);
      setRecurringOpen(false);
      setRecurringForm({ name:"", email:"", phone:"", kvm:"", services:[], preferred_date:"", other_description:"", recurrence:"biweekly", occurrences:6 });
      const updated = await api.get("/bookings");
      setBookings(updated.data);
    } catch {
      toast.error("Kunde inte skapa återkommande bokningar.");
    } finally {
      setRecurringSaving(false);
    }
  };

  const toggleService = (svc) => setForm((f) => ({
    ...f, services: f.services.includes(svc) ? f.services.filter((s) => s !== svc) : [...f.services, svc]
  }));

  const createBooking = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const payload = { ...form, email: form.email || "admin@purenorth.se" };
      const res = await api.post("/bookings", payload);
      setBookings((b) => [res.data, ...b]);
      toast.success("Bokning skapad!");
      setNewBookingOpen(false);
      setForm({ name: "", email: "", phone: "", kvm: "", services: [], preferred_date: "", other_description: "" });
    } catch {
      toast.error("Kunde inte skapa bokning.");
    } finally {
      setSaving(false);
    }
  };

  const createInvoiceFromBooking = async (booking, invoiceItems, totals) => {
    try {
      const payload = {
        customer_name: booking.name,
        customer_email: booking.email,
        customer_phone: booking.phone,
        customer_address: "",
        items: invoiceItems,
        subtotal: totals.subtotal,
        rut_deduction: totals.rut_deduction,
        vat_amount: totals.vat_amount,
        total_amount: totals.total_amount,
        customer_pays: totals.customer_pays,
        rut_eligible: totals.rut_eligible || false,
        due_days: 30,
        notes: `Bokning: ${booking.services?.join(", ")}`,
        status: "draft",
        booking_id: booking.id,
      };
      await api.post("/invoices", payload);
      toast.success("Faktura skapad! Gå till Fakturor för att se den.");
      setExpandedCalc(null);
    } catch {
      toast.error("Kunde inte skapa faktura.");
    }
  };
  const RUT_YES = ["Hemstädning","Storstädning","Flyttstädning","Fönsterputs","Ugnstvätt","Kyl/frys rengöring"];
  const openEditBooking = (b) => {
    setEditingBooking(b.id);
    const RUT_YES = ["Hemstädning","Storstädning","Flyttstädning","Fönsterputs","Ugnstvätt","Kyl/frys rengöring"];
    const svc0 = (b.services||[])[0]||"";
    setEditBookingForm({
      name: b.name || "",
      email: b.email || "",
      phone: b.phone || "",
      address: b.address || "",
      kvm: b.kvm || "",
      preferred_date: b.preferred_date || "",
      other_description: b.other_description || "",
      services: b.services || [],
      customer_type: b.customer_type || "private",
      rut_eligible: RUT_YES.includes(svc0),
      personnummer: b.personnummer || "",
    });
  };

  const saveEditBooking = async (e) => {
    e.preventDefault();
    setEditBookingSaving(true);
    try {
      await api.patch(`/bookings/${editingBooking}`, editBookingForm);
      setBookings(prev => prev.map(b => b.id === editingBooking ? {...b, ...editBookingForm} : b));
      


      toast.success("Bokning uppdaterad!");
      setEditingBooking(null);
    } catch {
      toast.error("Kunde inte uppdatera bokningen.");
    } finally {
      setEditBookingSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort denna bokning?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      setBookings((b) => b.filter((x) => x.id !== id));
      toast.success("Bokning borttagen.");
    } catch {
      toast.error("Kunde inte ta bort bokningen.");
    }
  };


  return (
    <>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-xl text-slate-900">Bokningar</h2>
          <button onClick={async ()=>{ await load(); setBookingsLastUpdated(new Date()); }} className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#141414] hover:text-[#141414] transition-colors">
            <RefreshCw size={14}/>
          </button>
          {bookingsLastUpdated && <span className="text-xs text-slate-400">Uppdaterad {bookingsLastUpdated.toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"})}</span>}
        </div>
        <div className="flex gap-2">

          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            window.open(`${base}/api/bookings/export-pdf?token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-2 sm:px-3 py-2 transition-all">
            <FileText size={14}/> <span className="hidden sm:inline">PDF</span><span className="sm:hidden">PDF</span>
          </button>
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/bookings/export-xlsx?token=${token}`;
            a.download = "bokningar.xlsx";
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={() => setRecurringOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:border-[#141414] rounded-full px-4 py-2 transition-colors">
            <RefreshCw size={14}/> Återkommande
          </button>
          <button onClick={() => setNewBookingOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black rounded-full px-3 sm:px-4 py-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span className="hidden sm:inline">Ny bokning</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Totalt", value: bookings.length },
          { label: "Nya", value: bookings.filter((b) => b.status === "new").length },
          { label: "Kontaktade", value: bookings.filter((b) => b.status === "contacted").length },
          { label: "Klara", value: bookings.filter((b) => b.status === "done").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-3xl font-display font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : bookings.length === 0 ? (
        <div data-testid="admin-empty" className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500">
          Inga bokningar ännu.
        </div>
      ) : (
        <div className="grid gap-4" data-testid="admin-bookings-list">
          {bookings.map((b) => (<React.Fragment key={b.id}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              id={`booking-${b.id}`}
              data-testid={`booking-row-${b.id}`}
              onClick={()=>setSelectedBooking(selectedBooking===b.id?null:b.id)}
              className={`rounded-2xl border p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 justify-between cursor-pointer transition-all ${selectedBooking===b.id?"bg-blue-50 border-blue-300 shadow-lg shadow-blue-100":"bg-white border-slate-100 hover:shadow-sm"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display font-semibold text-lg text-slate-900">{b.name}</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS[b.status]?.cls}`}>
                    {STATUS[b.status]?.label || b.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                  <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#141414]"><Phone size={14} /> {b.phone}</a>
                  <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1.5 hover:text-[#141414]"><Mail size={14} /> {b.email}</a>
                  {b.kvm && <span className="inline-flex items-center gap-1.5">{b.services?.some(s=>["Fönsterputs","Ugnstvätt","Kyl/frys rengöring","Trappstädning"].includes(s)) ? <Hash size={14}/> : <Maximize size={14}/>} {b.kvm} {b.services?.some(s=>["Fönsterputs","Ugnstvätt","Kyl/frys rengöring","Trappstädning"].includes(s)) ? "st" : "kvm"}</span>}
                  {b.preferred_date && <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {b.preferred_date}</span>}
                  {b.address && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {b.address}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.services.map((s) => (
                    <span key={s} className="text-xs bg-[#141414]/8 text-[#141414] px-2.5 py-1 rounded-full font-medium">{s}</span>
                  ))}
                </div>
                {b.other_description && (
                  <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3"><strong>Anteckning:</strong> {b.other_description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <select
                  value={b.status}
                  onChange={(e) => setStatus(b.id, e.target.value)}
                  data-testid={`booking-status-${b.id}`}
                  className="rounded-full border border-slate-200 text-sm px-4 py-2 outline-none focus:border-[#141414]"
                >
                  <option value="new">Ny</option>
                  <option value="contacted">Kontaktad</option>
                  <option value="done">Klar</option>
                </select>
                <button onClick={() => setExpandedCalc(expandedCalc === b.id ? null : b.id)}
                  className="h-9 px-3 rounded-full flex items-center gap-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors text-xs font-semibold border border-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  Kalkyl
                </button>
                <button onClick={() => openEditBooking(b)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#141414] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => remove(b.id)} data-testid={`booking-delete-${b.id}`} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

            </motion.div>
            {expandedCalc === b.id && (
              <div className="rounded-2xl bg-white border border-slate-100 p-5 -mt-2 overflow-x-auto">
                <BookingCalculator
                  booking={b}
                  onCreateInvoice={(items, totals) => createInvoiceFromBooking(b, items, totals)}
                />
              </div>
            )}
          </React.Fragment>
        ))}
        </div>
      )}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setEditingBooking(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-slate-900">Redigera bokning</h2>
              <button onClick={() => setEditingBooking(null)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <form onSubmit={saveEditBooking} className="space-y-3">
              <div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Namn *</label>
                  <input value={editBookingForm.name} onChange={e=>setEditBookingForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">E-post</label>
                  <input type="email" value={editBookingForm.email} onChange={e=>setEditBookingForm(f=>({...f,email:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telefon</label>
                  <input value={editBookingForm.phone} onChange={e=>setEditBookingForm(f=>({...f,phone:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Adress (städobjekt)</label>
                  <input value={editBookingForm.address || ""} onChange={(e) => setEditBookingForm((f) => ({...f, address: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Storgatan 1, Umeå" />
                </div>
              </div>

                <label className="text-xs font-medium text-slate-700">Datum</label>
                <input type="date" value={editBookingForm.preferred_date} onChange={e=>setEditBookingForm(f=>({...f,preferred_date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Anteckning</label>
                <textarea value={editBookingForm.other_description} onChange={e=>setEditBookingForm(f=>({...f,other_description:e.target.value}))} rows={2} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
              </div>

              {/* Yta/tim calculator */}
              {(() => {
                const SPEED = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35,"trappstädning":25,"fönsterputs":10};
                const svc = (editBookingForm.services||[])[0]?.toLowerCase()||"";
                const speedKey = Object.keys(SPEED).find(k=>svc.includes(k));
                const speed = speedKey ? SPEED[speedKey] : 30;
                const kvm = parseFloat(editBookingForm.kvm)||0;
                const tim = kvm ? Math.ceil((kvm/speed)*2)/2 : 0;
                const apris = 478;
                return (
                  <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Tjänster</label>
                      <div className="flex items-center gap-2 mt-1">
                        <select value={(editBookingForm.services||[])[0]||""} onChange={e=>{
                          const svc = e.target.value;
                          const RUT_YES = ["Hemstädning","Storstädning","Flyttstädning","Fönsterputs","Ugnstvätt","Kyl/frys rengöring"];
                          const isRut = RUT_YES.includes(svc);
                          setEditBookingForm(f=>({...f,services:[svc],rut_eligible:isRut&&(f.customer_type||"private")==="private"}));
                        }} className="flex-1 rounded-xl border border-slate-200 text-sm px-3 py-2.5 outline-none focus:border-[#141414]">
                          {SERVICE_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{apris} kr/tim</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500">Yta (kvm)</label>
                        <input type="number" value={editBookingForm.kvm||""} onChange={e=>setEditBookingForm(f=>({...f,kvm:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3 py-2.5 outline-none focus:border-[#141414]" placeholder="0"/>
                      </div>
                      <span className="text-slate-300 mt-5">→</span>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500">tim</label>
                        <input readOnly value={tim||""} className="w-full mt-1 rounded-xl border border-slate-100 bg-slate-50 text-sm px-3 py-2.5 outline-none text-slate-500"/>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500">À-Pris (kr)</label>
                        <input readOnly value={apris} className="w-full mt-1 rounded-xl border border-slate-100 bg-slate-50 text-sm px-3 py-2.5 outline-none text-slate-500"/>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* Typ + RUT section */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Typ av kund</label>
                  <div className="flex gap-2 mt-1.5">
                    {(() => {
                    const RUT_SERVICES = ["hemstädning","storstädning","flyttstädning","fönsterputs","trappstädning","byggstädning"];
                    const isRutService = (editBookingForm.services||[]).some(s => RUT_SERVICES.some(r => s.toLowerCase().includes(r)));
                    return (<>
                      <button type="button" onClick={()=>setEditBookingForm(f=>({...f,customer_type:"private",rut_eligible:isRutService}))} className={`flex-1 py-2 rounded-full text-xs font-semibold border transition-colors ${(editBookingForm.customer_type||"private")==="private"?"bg-[#141414] text-white border-[#141414]":"bg-white text-slate-600 border-slate-200"}`}>Privat</button>
                      <button type="button" onClick={()=>setEditBookingForm(f=>({...f,customer_type:"company",rut_eligible:false}))} className={`flex-1 py-2 rounded-full text-xs font-semibold border transition-colors ${editBookingForm.customer_type==="company"?"bg-[#141414] text-white border-[#141414]":"bg-white text-slate-600 border-slate-200"}`}>Företag</button>
                    </>);
                  })()}
                  </div>
                </div>
                {(editBookingForm.customer_type||"private")==="private" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editBookingForm.rut_eligible||false} onChange={e=>setEditBookingForm(f=>({...f,rut_eligible:e.target.checked}))} className="rounded"/>
                  <span className="text-sm font-medium text-slate-700">RUT-avdrag (50% av arbetskostnad)</span>
                </label>)}
                {editBookingForm.rut_eligible && (
                  <div>
                    <label className="text-xs font-medium text-slate-700">Personnummer</label>
                    <input value={editBookingForm.personnummer||""} onChange={e=>setEditBookingForm(f=>({...f,personnummer:e.target.value}))} placeholder="ÅÅMMDD-XXXX" className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                  </div>
                )}
              </div>
              {/* Price summary */}
              {(() => {
                const SPEED = {"hemstädning":30,"storstädning":20,"flyttstädning":15,"byggstädning":18,"kontorsstädning":35,"trappstädning":25};
                const services = editBookingForm.services || [];
                const kvm = parseFloat(editBookingForm.kvm) || 0;
                if (!services.length || !kvm) return null;
                const svc = services[0]?.toLowerCase() || "";
                const speedKey = Object.keys(SPEED).find(k => svc.includes(k));
                const speed = speedKey ? SPEED[speedKey] : 30;
                const tim = Math.ceil((kvm / speed) * 2) / 2;
                const price = tim * 478;
                const moms = price * 0.25;
                const rut = editBookingForm.rut_eligible ? price * 0.5 : 0;
                const attBetala = price + moms - rut;
                return (
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
                    <div className="flex justify-between text-slate-500"><span>Delsumma (exkl. moms)</span><span>{price.toFixed(2)} kr</span></div>
                    <div className="flex justify-between text-slate-500"><span>Moms (25%)</span><span>{moms.toFixed(2)} kr</span></div>
                    <div className="flex justify-between font-semibold text-slate-800"><span>Totalt inkl. moms</span><span>{(price+moms).toFixed(2)} kr</span></div>
                    {rut > 0 && <div className="flex justify-between text-green-600"><span>RUT-avdrag (50%)</span><span>-{rut.toFixed(2)} kr</span></div>}
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200"><span>ATT BETALA</span><span className="text-green-700">{attBetala.toFixed(2)} kr</span></div>
                  </div>
                );
              })()}
              <button type="submit" disabled={editBookingSaving} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                {editBookingSaving ? "Sparar..." : "Spara ändringar"}
              </button>
            </form>
          </div>
        </div>
      )}
      {recurringOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setRecurringOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-slate-900">🔁 Återkommande bokning</h2>
              <button onClick={() => setRecurringOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <form onSubmit={createRecurring} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Namn *</label>
                <input value={recurringForm.name} onChange={(e) => setRecurringForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Kundens namn" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telefon *</label>
                  <input value={recurringForm.phone} onChange={(e) => setRecurringForm(f=>({...f,phone:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="070-000 00 00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">E-post</label>
                  <input type="email" value={recurringForm.email} onChange={(e) => setRecurringForm(f=>({...f,email:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Första datum *</label>
                <input type="date" value={recurringForm.preferred_date} onChange={(e) => setRecurringForm(f=>({...f,preferred_date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Upprepning</label>
                  <select value={recurringForm.recurrence} onChange={(e) => setRecurringForm(f=>({...f,recurrence:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                    <option value="weekly">Varje vecka</option>
                    <option value="biweekly">Varannan vecka</option>
                    <option value="monthly">Varje månad</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Antal tillfällen</label>
                  <select value={recurringForm.occurrences} onChange={(e) => setRecurringForm(f=>({...f,occurrences:parseInt(e.target.value)}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
                    {[4,6,8,10,12,16,20,26,52].map(n=><option key={n} value={n}>{n} tillfällen</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Tjänster</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {SERVICE_OPTIONS.map(svc=>(
                    <button key={svc} type="button" onClick={()=>toggleRecurringService(svc)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${recurringForm.services.includes(svc)?"bg-[#141414] text-white border-[#141414]":"bg-white text-slate-600 border-slate-200"}`}>
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
                💡 Skapar <strong>{recurringForm.occurrences} bokningar</strong> {recurringForm.recurrence==="weekly"?"varje vecka":recurringForm.recurrence==="biweekly"?"varannan vecka":"varje månad"} från det valda datumet.
              </div>
              <button type="submit" disabled={recurringSaving||!recurringForm.name||!recurringForm.phone||!recurringForm.preferred_date} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                {recurringSaving ? "Skapar..." : `Skapa ${recurringForm.occurrences} bokningar`}
              </button>
            </form>
          </div>
        </div>
      )}
      {newBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setNewBookingOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-slate-900">Ny bokning</h2>
              <button onClick={() => setNewBookingOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <form onSubmit={createBooking} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Namn *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({...f, name: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="För- och efternamn" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telefon *</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({...f, phone: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="070-000 00 00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">E-post</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({...f, email: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="@" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Datum</label>
                  <input type="date" value={form.preferred_date} onChange={(e) => setForm((f) => ({...f, preferred_date: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Kvm</label>
                  <input value={form.kvm} onChange={(e) => setForm((f) => ({...f, kvm: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="T.ex. 75" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Tjänster</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {SERVICE_OPTIONS.map((svc) => (
                    <button key={svc} type="button" onClick={() => toggleService(svc)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.services.includes(svc) ? "bg-[#141414] text-white border-[#141414]" : "bg-white text-slate-600 border-slate-200"}`}>
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Anteckning</label>
                <textarea value={form.other_description} onChange={(e) => setForm((f) => ({...f, other_description: e.target.value}))} rows={2} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" placeholder="Ev. önskemål..." />
              </div>
              <button type="submit" disabled={saving || !form.name || !form.phone} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                {saving ? "Sparar..." : "Skapa bokning"}
              </button>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
// Sun Jul  5 17:54:04 UTC 2026
