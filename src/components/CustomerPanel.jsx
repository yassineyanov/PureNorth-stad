import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Users, Phone, Mail, MapPin, FileText, Calendar, ChevronRight, Download, Building2, User, FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function kr(v) { return `${(v||0).toLocaleString("sv-SE", {minimumFractionDigits:2,maximumFractionDigits:2})} kr`; }

function CustomerModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    address: initial?.address || "",
    personnummer: initial?.personnummer || "",
    customer_type: initial?.customer_type || "private",
    notes: initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form, initial?.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} onClick={(e)=>e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">{isEdit ? "Redigera kund" : "Ny kund"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Namn *</Label>
            <Input value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} className="mt-1" placeholder="För- och efternamn / Företagsnamn" />
          </div>
          <div>
            <Label>Typ</Label>
            <select value={form.customer_type} onChange={(e)=>setForm(f=>({...f,customer_type:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              <option value="private">Privatperson</option>
              <option value="company">Företag</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))} className="mt-1" placeholder="070-000 00 00" />
            </div>
            <div>
              <Label>E-post</Label>
              <Input type="email" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Adress</Label>
            <Input value={form.address} onChange={(e)=>setForm(f=>({...f,address:e.target.value}))} className="mt-1" placeholder="Gatuadress, stad" />
          </div>
          {form.customer_type === "private" && (
            <div>
              <Label>Personnummer</Label>
              <Input value={form.personnummer} onChange={(e)=>setForm(f=>({...f,personnummer:e.target.value}))} className="mt-1" placeholder="ÅÅMMDD-XXXX" />
            </div>
          )}
          <div>
            <Label>Anteckningar</Label>
            <textarea value={form.notes} onChange={(e)=>setForm(f=>({...f,notes:e.target.value}))} rows={3} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" placeholder="Ev. specialönskemål, nycklar, larm..." />
          </div>
          <button type="submit" disabled={saving||!form.name.trim()} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : isEdit ? "Spara ändringar" : "Lägg till kund"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function CustomerDetail({ customerId, onBack, onEdit, onDelete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/customers/${customerId}`).then(r => setData(r.data)).catch(()=>toast.error("Kunde inte hämta kund.")).finally(()=>setLoading(false));
  }, [customerId]);

  if (loading) return <p className="text-slate-500">Laddar...</p>;
  if (!data) return null;

  const { customer: c, bookings, invoices } = data;

  const STATUS = { new:"Ny", contacted:"Kontaktad", done:"Klar" };
  const STATUS_CLS = { new:"bg-blue-50 text-blue-700", contacted:"bg-amber-50 text-amber-700", done:"bg-green-50 text-green-700" };

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-5 transition-colors">
        ← Tillbaka
      </button>

      <div className="rounded-2xl bg-white border border-slate-100 p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              {c.customer_type === "company" ? <Building2 size={22} className="text-slate-500"/> : <User size={22} className="text-slate-500"/>}
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900">{c.name}</h2>
              <span className="text-xs font-semibold text-slate-400">{c.customer_type === "company" ? "Företag" : "Privatperson"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>onEdit(c)} className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-full px-3 py-1.5 hover:border-[#141414]">Redigera</button>
            <button onClick={()=>onDelete(c.id)} className="text-xs font-semibold text-red-600 border border-red-100 rounded-full px-3 py-1.5 hover:bg-red-50">Ta bort</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label:"Bokningar", value: c.booking_count },
            { label:"Fakturor", value: c.invoice_count },
            { label:"Totalt fakturerat", value: kr(c.total_invoiced) },
            { label:"Senaste bokning", value: c.last_booking || "–" },
          ].map(s=>(
            <div key={s.label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          {c.phone && <div className="flex items-center gap-2"><Phone size={14}/> <a href={`tel:${c.phone}`} className="hover:text-[#141414]">{c.phone}</a></div>}
          {c.email && <div className="flex items-center gap-2"><Mail size={14}/> <a href={`mailto:${c.email}`} className="hover:text-[#141414]">{c.email}</a></div>}
          {c.address && <div className="flex items-center gap-2"><MapPin size={14}/> {c.address}</div>}
          {c.personnummer && <div className="flex items-center gap-2"><FileText size={14}/> {c.personnummer}</div>}
          {c.notes && <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-amber-800 text-xs">{c.notes}</div>}
        </div>
      </div>

      {/* Booking history */}
      {bookings.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-4">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Calendar size={16}/> Bokningar ({bookings.length})</h3>
          <div className="space-y-2">
            {bookings.map(b=>(
              <div key={b._id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{b.services?.join(", ") || "Städning"}</p>
                  <p className="text-xs text-slate-500">{b.preferred_date || b.created_at?.slice(0,10)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLS[b.status]||""}`}>{STATUS[b.status]||b.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice history */}
      {invoices.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><FileText size={16}/> Fakturor ({invoices.length})</h3>
          <div className="space-y-2">
            {invoices.map(inv=>(
              <div key={inv._id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Faktura #{inv.invoice_number}</p>
                  <p className="text-xs text-slate-500">Förfaller {inv.due_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{kr(inv.customer_pays)}</p>
                  <span className={`text-xs font-semibold ${inv.status==="paid"?"text-green-600":"text-amber-600"}`}>{inv.status==="paid"?"Betald":"Obetald"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerPanel() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch { toast.error("Kunde inte hämta kunder."); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ load(); }, []);

  const importFromBookings = async () => {
    setImporting(true);
    try {
      const res = await api.post("/customers/import-from-bookings");
      toast.success(`Importerade ${res.data.created} nya kunder, uppdaterade ${res.data.updated}.`);
      load();
    } catch { toast.error("Import misslyckades."); }
    finally { setImporting(false); }
  };

  const saveCustomer = async (form, id) => {
    try {
      if (id) {
        const res = await api.patch(`/customers/${id}`, form);
        setCustomers(c=>c.map(x=>x.id===id?res.data:x));
        toast.success("Kund uppdaterad.");
      } else {
        const res = await api.post("/customers", form);
        setCustomers(c=>[res.data,...c]);
        toast.success("Kund tillagd.");
      }
      setModalOpen(false);
      setEditingCustomer(null);
    } catch { toast.error("Kunde inte spara kund."); }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Ta bort denna kund?")) return;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(c=>c.filter(x=>x.id!==id));
      setSelectedId(null);
      toast.success("Kund borttagen.");
    } catch { toast.error("Kunde inte ta bort kund."); }
  };

  const openEdit = (c) => { setEditingCustomer(c); setModalOpen(true); };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (selectedId) {
    return (
      <CustomerDetail
        customerId={selectedId}
        onBack={()=>setSelectedId(null)}
        onEdit={(c)=>{ openEdit(c); }}
        onDelete={(id)=>{ deleteCustomer(id); }}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Kundregister</h2>
          <p className="text-sm text-slate-500 mt-0.5">{customers.length} kunder</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={importFromBookings} disabled={importing} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-full px-4 py-2 hover:border-[#141414] transition-colors disabled:opacity-50">
            {importing ? "Importerar..." : "↓ Importera från bokningar"}
          </button>
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/customers/export-xlsx?token=${token}`;
            a.download = "kunder.xlsx";
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            window.open(`${base}/api/customers/export-pdf?token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
          </button>
          <button onClick={()=>{setEditingCustomer(null);setModalOpen(true);}} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black rounded-full px-4 py-2 transition-colors">
            <Plus size={14}/> Ny kund
          </button>
        </div>
      </div>

      <div className="mb-4">
        <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Sök på namn, e-post eller telefon..." className="w-full" />
      </div>

      {loading ? <p className="text-slate-500">Laddar...</p> :
       filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <Users size={32} className="text-slate-300"/>
          {search ? "Inga kunder matchar sökningen." : "Inga kunder ännu. Klicka på 'Importera från bokningar' för att komma igång."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c=>(
            <motion.div key={c.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="rounded-2xl bg-white border border-slate-100 p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-slate-300 transition-colors"
              onClick={()=>setSelectedId(c.id)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  {c.customer_type==="company" ? <Building2 size={18} className="text-slate-500"/> : <User size={18} className="text-slate-500"/>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                    {c.phone && <span className="flex items-center gap-1"><Phone size={11}/>{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 truncate"><Mail size={11}/>{c.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-slate-900">{c.booking_count} bokningar</p>
                  <p className="text-xs text-slate-500">{kr(c.total_invoiced)} fakturerat</p>
                </div>
                <ChevronRight size={18} className="text-slate-300"/>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <CustomerModal initial={editingCustomer} onClose={()=>{setModalOpen(false);setEditingCustomer(null);}} onSave={saveCustomer}/>}
      </AnimatePresence>
    </>
  );
}
