import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, Trash2, Phone, Mail, Calendar, Maximize, Hash, RefreshCw, Check, X, Clock, LayoutDashboard, CalendarDays, Star, CalendarRange, UserMinus, Receipt, Banknote, FileText, Tag, TrendingUp, TrendingDown, Users, BarChart2, Search, MapPin, FileSpreadsheet, Settings, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SchedulePanel from "@/components/SchedulePanel";
import AbsencePanel from "@/components/AbsencePanel";
import ExpensePanel from "@/components/ExpensePanel";
import PayrollPanel from "@/components/PayrollPanel";
import InvoicePanel from "@/components/InvoicePanel";
import PriceListPanel from "@/components/PriceListPanel";
import EconomyPanel from "@/components/EconomyPanel";
import CustomerPanel from "@/components/CustomerPanel";
import CalendarPanel from "@/components/CalendarPanel";
import StatsPanel from "@/components/StatsPanel";
import UsersPanel from "@/components/UsersPanel";
import CostsPanel from "@/components/CostsPanel";
import SettingsPanel from "@/components/SettingsPanel";
import DashboardPanel from "@/components/DashboardPanel";
import BookingCalculator from "@/components/BookingCalculator";

const STATUS = {
  new: { label: "Ny", cls: "bg-blue-50 text-blue-700" },
  contacted: { label: "Kontaktad", cls: "bg-amber-50 text-amber-700" },
  done: { label: "Klar", cls: "bg-green-50 text-green-700" },
};

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const sendForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // always show success
    } finally {
      setForgotLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || "Inloggning misslyckades");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-5">
      {!forgotMode && <form onSubmit={submit} data-testid="admin-login-form" className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-7">
          <Logo className="h-10 w-10" />
          <span className="font-display font-bold text-xl text-slate-900">PureNorth Städ</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Admin-inloggning</h1>
        <p className="text-sm text-slate-500 mb-6">Logga in för att hantera bokningar och omdömen.</p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="a-email">E-post</Label>
            <Input id="a-email" type="email" data-testid="admin-email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="a-pass">Lösenord</Label>
            <Input id="a-pass" type="password" data-testid="admin-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          {error && <p data-testid="admin-login-error" className="text-sm text-red-600">{error}</p>}
          {!forgotMode && (
            <button type="button" onClick={()=>setForgotMode(true)} className="w-full text-sm text-slate-400 hover:text-[#141414] transition-colors mt-1 text-center">
              Glömt lösenordet?
            </button>
          )}
          <button type="submit" disabled={loading} data-testid="admin-login-submit" className="w-full rounded-full bg-[#141414] hover:bg-[#000000] disabled:opacity-60 text-white py-3 font-semibold transition-colors">
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </div>
      </form>}
      {forgotMode && (
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          {forgotSent ? (
            <div className="text-center py-4">
              <p className="text-green-700 font-semibold mb-2">✅ Kontrollera din e-post!</p>
              <p className="text-sm text-slate-500 mb-4">Om e-postadressen finns skickas en återställningslänk.</p>
              <button onClick={()=>{setForgotMode(false);setForgotSent(false);}} className="text-sm text-slate-500 hover:text-[#141414] underline">Tillbaka till inloggning</button>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Glömt lösenord?</h1>
              <p className="text-sm text-slate-500 mb-6">Ange din e-post så skickar vi en återställningslänk.</p>
              <form onSubmit={sendForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-postadress</label>
                  <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required placeholder="din@email.se"
                    className="w-full rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                </div>
                <button type="submit" disabled={forgotLoading} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                  {forgotLoading ? "Skickar..." : "Skicka återställningslänk"}
                </button>
                <button type="button" onClick={()=>setForgotMode(false)} className="w-full text-sm text-slate-400 hover:text-slate-600 py-1">
                  ← Tillbaka till inloggning
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BookingsPanel() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = React.useState(null);
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

  const load = async () => {
    setLoading(true);
    try {
      setBookings((await api.get("/bookings")).data);
    } catch {
      toast.error("Kunde inte hämta bokningar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

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
  const openEditBooking = (b) => {
    setEditingBooking(b.id);
    setEditBookingForm({
      name: b.name || "",
      email: b.email || "",
      phone: b.phone || "",
      address: b.address || "",
      kvm: b.kvm || "",
      preferred_date: b.preferred_date || "",
      other_description: b.other_description || "",
      services: b.services || [],
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
          <button onClick={() => setRecurringOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:border-[#141414] rounded-full px-4 py-2 transition-colors">
            <RefreshCw size={14}/> Återkommande
          </button>
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            window.open(`${base}/api/bookings/export-pdf?token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
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
          <button onClick={() => setNewBookingOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black rounded-full px-4 py-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ny bokning
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
              data-testid={`booking-row-${b.id}`}
              id={`booking-${b.id}`} onClick={()=>setSelectedBooking(b.id===selectedBooking?null:b.id)} className={`rounded-2xl border p-6 flex flex-col lg:flex-row lg:items-center gap-5 justify-between cursor-pointer transition-all ${selectedBooking===b.id ? "bg-blue-50 border-blue-200 shadow-lg" : "bg-white border-slate-100 shadow-sm hover:shadow-md"}`}
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
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
              <div className="rounded-2xl bg-white border border-slate-100 p-5 -mt-2">
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
                <label className="text-xs font-medium text-slate-700">Namn *</label>
                <input value={editBookingForm.name} onChange={e=>setEditBookingForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telefon</label>
                  <input value={editBookingForm.phone} onChange={e=>setEditBookingForm(f=>({...f,phone:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">E-post</label>
                  <input type="email" value={editBookingForm.email} onChange={e=>setEditBookingForm(f=>({...f,email:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Tjänster</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {SERVICE_OPTIONS.map(svc=>(
                    <button key={svc} type="button"
                      onClick={()=>setEditBookingForm(f=>({...f,services:f.services?.includes(svc)?f.services.filter(s=>s!==svc):[...(f.services||[]),svc]}))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${editBookingForm.services?.includes(svc)?"bg-[#141414] text-white border-[#141414]":"bg-white text-slate-600 border-slate-200"}`}>
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Adress (städobjekt)</label>
                <input value={editBookingForm.address || ""} onChange={(e) => setEditBookingForm((f) => ({...f, address: e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Storgatan 1, Umeå" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700">Datum</label>
                  <input type="date" value={editBookingForm.preferred_date} onChange={e=>setEditBookingForm(f=>({...f,preferred_date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    {editBookingForm.services?.some(s=>["Fönsterputs","Ugn/kyl rengöring","Trappstädning","Ugnstvätt","Kyl/frys rengöring"].includes(s)) ? "Antal (st)" : "Yta (kvm)"}
                  </label>
                  <input value={editBookingForm.kvm} onChange={e=>setEditBookingForm(f=>({...f,kvm:e.target.value}))}
                    className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"
                    placeholder={editBookingForm.services?.some(s=>["Fönsterputs","Ugn/kyl rengöring","Trappstädning"].includes(s)) ? "T.ex. 8" : "T.ex. 75"} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Anteckning</label>
                <textarea value={editBookingForm.other_description} onChange={e=>setEditBookingForm(f=>({...f,other_description:e.target.value}))} rows={2} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
              </div>
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

function ReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setReviews((await api.get("/reviews")).data);
    } catch {
      toast.error("Kunde inte hämta omdömen.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const setApproved = async (id, approved) => {
    try {
      await api.patch(`/reviews/${id}/approve`, { approved });
      setReviews((r) => r.map((x) => (x.id === id ? { ...x, approved } : x)));
      toast.success(approved ? "Omdöme publicerat." : "Omdöme avpublicerat.");
    } catch {
      toast.error("Kunde inte uppdatera omdömet.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Ta bort detta omdöme?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews((r) => r.filter((x) => x.id !== id));
      toast.success("Omdöme borttaget.");
    } catch {
      toast.error("Kunde inte ta bort omdömet.");
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Totalt", value: reviews.length },
          { label: "Väntar", value: reviews.filter((r) => !r.approved).length },
          { label: "Publicerade", value: reviews.filter((r) => r.approved).length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-3xl font-display font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : reviews.length === 0 ? (
        <div data-testid="admin-reviews-empty" className="rounded-2xl bg-white border border-slate-100 p-12 text-center text-slate-500">
          Inga omdömen ännu.
        </div>
      ) : (
        <div className="grid gap-4" data-testid="admin-reviews-list">
          {reviews.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid={`review-row-${r.id}`}
              id={`booking-${b.id}`} onClick={()=>setSelectedBooking(b.id===selectedBooking?null:b.id)} className={`rounded-2xl border p-6 flex flex-col lg:flex-row lg:items-center gap-5 justify-between cursor-pointer transition-all ${selectedBooking===b.id ? "bg-blue-50 border-blue-200 shadow-lg" : "bg-white border-slate-100 shadow-sm hover:shadow-md"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display font-semibold text-lg text-slate-900">{r.name}</h3>
                  {r.approved ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">Publicerad</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"><Clock size={12} /> Väntar</span>
                  )}
                </div>
                <StarRating value={r.rating} className="mb-2" />
                <p className="text-sm text-slate-600">"{r.text}"</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.approved ? (
                  <button onClick={() => setApproved(r.id, false)} data-testid={`review-unpublish-${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-amber-400 hover:text-amber-600 transition-colors">
                    <X size={15} /> Avpublicera
                  </button>
                ) : (
                  <button onClick={() => setApproved(r.id, true)} data-testid={`review-approve-${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#166534] rounded-full px-4 py-2 hover:bg-[#14532d] transition-colors">
                    <Check size={15} /> Godkänn
                  </button>
                )}
                <button onClick={() => remove(r.id)} data-testid={`review-delete-${r.id}`} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {/* ── Settings Modal ─────────────────────────────────────────────── */}
    </>
  );
}
function Dashboard() {
  const { logout, user } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem("pn_language") || "sv");
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifs = React.useCallback(async () => {
    try {
      const res = await api.get("/bookings");
      const allBookings = res.data || [];
      const newBookings = allBookings.filter(b => b.status === "new");
      setNotifs(newBookings.map(b => ({
        id: b.id,
        title: `Ny bokning: ${b.name}`,
        sub: `${b.services?.[0] || b.service || ""} · ${b.date || ""}`,
      })));
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);
    return () => clearInterval(interval);
  }, [loadNotifs]);

  const unseenCount = notifs.length;
  const deleteNotif = (id) => setNotifs(prev => prev.filter(n => n.id !== id));

  const TRANS = {
    sv: { "tabs.dashboard": "Översikt", "tabs.bookings": "Bokningar", "tabs.invoices": "Fakturor", "tabs.customers": "Kunder", "tabs.schema": "Schema", "tabs.payroll": "Lön", "tabs.absences": "Frånvaro", "tabs.expenses": "Utlägg", "tabs.costs": "Kostnader", "tabs.economy": "Ekonomi", "tabs.pricelist": "Prislista", "tabs.calendar": "Kalender", "tabs.stats": "Statistik", "tabs.reviews": "Omdömen", "tabs.users": "Användare", "tabs.settings": "Inställningar" },
    en: { "tabs.dashboard": "Overview", "tabs.bookings": "Bookings", "tabs.invoices": "Invoices", "tabs.customers": "Customers", "tabs.schema": "Schedule", "tabs.payroll": "Payroll", "tabs.absences": "Absences", "tabs.expenses": "Expenses", "tabs.costs": "Costs", "tabs.economy": "Economy", "tabs.pricelist": "Price List", "tabs.calendar": "Calendar", "tabs.stats": "Statistics", "tabs.reviews": "Reviews", "tabs.users": "Users", "tabs.settings": "Settings" },
  };
  const t = (key) => (TRANS[lang] || TRANS.sv)[key] || key;

  const toggleLang = () => {
    const newLang = lang === "sv" ? "en" : "sv";
    setLang(newLang);
    localStorage.setItem("pn_language", newLang);
  };
  const { tab: urlTab } = useParams();
  const navigate = useNavigate();
  const [tab, setTabState] = useState(urlTab || "dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({
    company_name: "", company_orgnr: "", company_address: "",
    company_phone: "", company_email: "", company_website: "",
    ob1_extra: 50, ob2_extra: 100, payment_terms_days: 30,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadSettings = async () => {
    try {
      const [inv, pay] = await Promise.all([
        api.get("/settings/invoice"),
        api.get("/settings/payroll"),
      ]);
      setSettingsData({
        company_name: inv.data.company_name || "",
        company_orgnr: inv.data.company_orgnr || "",
        company_address: inv.data.company_address || "",
        company_phone: inv.data.company_phone || "",
        company_email: inv.data.company_email || "",
        company_website: inv.data.company_website || "",
        ob1_extra: pay.data.ob1_extra || 50,
        ob2_extra: pay.data.ob2_extra || 100,
        payment_terms_days: inv.data.payment_terms_days || 30,
      });
    } catch {}
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await Promise.all([
        api.patch("/settings/invoice", {
          company_name: settingsData.company_name,
          company_orgnr: settingsData.company_orgnr,
          company_address: settingsData.company_address,
          company_phone: settingsData.company_phone,
          company_email: settingsData.company_email,
          company_website: settingsData.company_website,
          payment_terms_days: Number(settingsData.payment_terms_days),
        }),
        api.patch("/settings/payroll", {
          ob1_extra: Number(settingsData.ob1_extra),
          ob2_extra: Number(settingsData.ob2_extra),
        }),
      ]);
      toast.success("Inställningar sparade!");
      setSettingsOpen(false);
    } catch { toast.error("Kunde inte spara."); }
    finally { setSettingsSaving(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (settingsOpen) loadSettings(); }, [settingsOpen]);






  const setTab = (newTab) => {
    setTabState(newTab);
    navigate(`/admin/${newTab}`, { replace: true });
  };

  React.useEffect(() => {
    if (urlTab && urlTab !== tab) setTabState(urlTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const doSearch = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    setSearching(true);
    setSearchOpen(true);
    try {
      const res = await api.get("/search", { params: { q } });
      setSearchResults(res.data.results || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const TYPE_NAV = { booking: "bookings", customer: "customers", invoice: "invoices", employee: "schema" };
  const TYPE_ICON = {
    booking: <CalendarDays size={15} className="text-blue-600"/>,
    customer: <Users size={15} className="text-green-600"/>,
    invoice: <FileText size={15} className="text-amber-600"/>,
    employee: <Users size={15} className="text-purple-600"/>,
  };
  const TYPE_LABEL = { booking: "Bokning", customer: "Kund", invoice: "Faktura", employee: "Anställd" };

  useEffect(() => {
    if (!user) return;
    const staffOnly = ["schema", "absences"];
    const salesAllowed = ["dashboard","bookings","reviews","schema","absences","expenses","payroll","invoices","pricelist","customers","calendar"];
    if (user.role === "staff" && !staffOnly.includes(tab)) {
      setTab("schema");
    }
    if (user.role === "sales" && !salesAllowed.includes(tab)) {
      setTab("dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <div>
              <span className="font-display font-bold text-lg text-slate-900 block leading-tight">PureNorth Städ</span>
              <span className="text-xs text-slate-500">Adminpanel</span>
            </div>
          </div>
          {/* Global Search */}
          <div className="relative flex-1 max-w-xs hidden sm:block">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                value={searchQ}
                onChange={e => doSearch(e.target.value)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                onFocus={() => searchQ.length >= 2 && setSearchOpen(true)}
                placeholder="Sök bokningar, kunder, fakturor..."
                className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 text-sm outline-none focus:border-[#141414] bg-slate-50"
              />
            </div>
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {searching ? (
                  <p className="p-4 text-sm text-slate-400">Söker...</p>
                ) : searchResults.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">Inga resultat för "{searchQ}"</p>
                ) : searchResults.map((r, i) => (
                  <button key={i} onMouseDown={() => { setTab(TYPE_NAV[r.type] || "dashboard"); setSearchOpen(false); setSearchQ(""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 text-left transition-colors">
                    <span className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">{TYPE_ICON[r.type]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                      <p className="text-xs text-slate-500 truncate">{r.sub}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 shrink-0">{TYPE_LABEL[r.type]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleLang} className="h-9 px-2.5 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-sm font-semibold" title="Byt språk">
              {lang === "sv" ? "🇸🇪" : "🇬🇧"}
            </button>
            <button onClick={()=>setTab("settings")} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
              <Settings size={16}/>
            </button>
            <div className="relative">
              <button onClick={()=>setNotifOpen(o=>!o)} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative">
                <Bell size={16}/>
                {unseenCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-sm text-slate-900">Notifikationer</p>
                    <button onClick={()=>setNotifOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                  </div>
                  {notifs.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">Inga nya bokningar</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.map(n => (
                        <div key={n.id} className="flex items-center px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors">
                          <button onClick={()=>{ setTab("bookings"); setNotifOpen(false); setSelectedBooking(n.id); setTimeout(()=>{const el=document.getElementById(`booking-${n.id}`);if(el)el.scrollIntoView({behavior:"smooth",block:"center"});},300); }} className="flex items-center gap-3 flex-1 text-left min-w-0">
                            <div className="relative shrink-0">
                              <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><CalendarDays size={14} className="text-blue-600"/></span>
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500"/>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                              <p className="text-xs text-slate-500 truncate">{n.sub}</p>
                            </div>
                          </button>
                          <button onClick={e=>{e.stopPropagation();deleteNotif(n.id);}} className="h-7 w-7 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 shrink-0 transition-colors ml-1">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={logout} data-testid="admin-logout" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-[#141414] hover:text-[#141414] transition-colors">
              <LogOut size={15} /> Logga ut
            </button>
          </div>
        </div>
        <div className="border-b border-slate-200"><div className="max-w-7xl mx-auto px-2 sm:px-8 flex gap-0.5 overflow-x-auto scrollbar-hide" style={{WebkitOverflowScrolling:"touch"}}>

                    <button
            onClick={() => setTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "dashboard" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <LayoutDashboard size={14}/> {t("tabs.dashboard")}
          </button>
          <button
            onClick={() => { 
              setTab("bookings"); 
              setNotifOpen(false);
              localStorage.setItem("pn_bookings_last_visit", new Date().toISOString());
            }}
            data-testid="admin-tab-bookings"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "bookings" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <CalendarDays size={14}/> {t("tabs.bookings")}
            {unseenCount > 0 && <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">{unseenCount}</span>}
          </button>
          <button
            onClick={() => setTab("invoices")}
            data-testid="admin-tab-invoices"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "invoices" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <FileText size={14}/> {t("tabs.invoices")}
          </button>
          <button
            onClick={() => setTab("customers")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "customers" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Users size={14}/> {t("tabs.customers")}
          </button>
          <button
            onClick={() => setTab("schema")}
            data-testid="admin-tab-schema"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "schema" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <CalendarRange size={14}/> {t("tabs.schema")}
          </button>
          <button
            onClick={() => setTab("payroll")}
            data-testid="admin-tab-payroll"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "payroll" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Banknote size={14}/> {t("tabs.payroll")}
          </button>
          <button
            onClick={() => setTab("absences")}
            data-testid="admin-tab-absences"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "absences" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <UserMinus size={14}/> {t("tabs.absences")}
          </button>
          <button
            onClick={() => setTab("expenses")}
            data-testid="admin-tab-expenses"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "expenses" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Receipt size={14}/> {t("tabs.expenses")}
          </button>
          <button
            onClick={() => setTab("costs")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "costs" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <TrendingDown size={14}/> {t("tabs.costs")}
          </button>
          <button
            onClick={() => setTab("economy")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "economy" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <TrendingUp size={14}/> {t("tabs.economy")}
          </button>
          <button
            onClick={() => setTab("pricelist")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "pricelist" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Tag size={14}/> {t("tabs.pricelist")}
          </button>
          <button
            onClick={() => setTab("calendar")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "calendar" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Calendar size={14}/> {t("tabs.calendar")}
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "stats" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <BarChart2 size={14}/> {t("tabs.stats")}
          </button>
          <button
            onClick={() => setTab("reviews")}
            data-testid="admin-tab-reviews"
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "reviews" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Star size={14}/> {t("tabs.reviews")}
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${tab === "users" ? "border-[#141414] text-[#141414]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Users size={14}/> {t("tabs.users")}
          </button>
</div></div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-8 py-5 sm:py-10 w-full overflow-x-hidden">
        {user?.role === "staff" ? (
          tab === "absences" ? <AbsencePanel /> : <SchedulePanel />
        ) : user?.role === "sales" ? (
          tab === "bookings" ? <BookingsPanel /> : tab === "reviews" ? <ReviewsPanel /> :
          tab === "schema" ? <SchedulePanel /> : tab === "absences" ? <AbsencePanel /> :
          tab === "expenses" ? <ExpensePanel /> : tab === "payroll" ? <PayrollPanel /> :
          tab === "invoices" ? <InvoicePanel /> : tab === "pricelist" ? <PriceListPanel /> :
          tab === "customers" ? <CustomerPanel /> : tab === "calendar" ? <CalendarPanel /> :
          <DashboardPanel onNavigate={setTab} />
        ) : (
          tab === "dashboard" ? <DashboardPanel onNavigate={setTab} /> : tab === "bookings" ? <BookingsPanel /> : tab === "reviews" ? <ReviewsPanel /> : tab === "schema" ? <SchedulePanel /> : tab === "absences" ? <AbsencePanel /> : tab === "expenses" ? <ExpensePanel /> : tab === "payroll" ? <PayrollPanel /> : tab === "invoices" ? <InvoicePanel /> : tab === "pricelist" ? <PriceListPanel /> : tab === "economy" ? <EconomyPanel /> : tab === "customers" ? <CustomerPanel /> : tab === "calendar" ? <CalendarPanel /> : tab === "stats" ? <StatsPanel /> : tab === "users" ? <UsersPanel /> : tab === "costs" ? <CostsPanel /> : tab === "settings" ? <SettingsPanel /> : <DashboardPanel onNavigate={setTab} />
        )}
      {/* ── Settings Modal ─────────────────────────────────────────────── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-slate-700"/>
                <h2 className="font-display font-bold text-xl text-slate-900">Inställningar</h2>
              </div>
              <button onClick={()=>setSettingsOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X size={16}/>
              </button>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Företagsuppgifter</h3>
              <div className="space-y-3">
                {[
                  {label:"Företagsnamn", key:"company_name", placeholder:"PureNorth Städ"},
                  {label:"Organisationsnummer", key:"company_orgnr", placeholder:"556123-4567"},
                  {label:"Adress", key:"company_address", placeholder:"Storgatan 1, 903 25 Umeå"},
                  {label:"Telefon", key:"company_phone", placeholder:"070-000 00 00"},
                  {label:"E-post", key:"company_email", placeholder:"info@purenorth.se"},
                  {label:"Webbplats", key:"company_website", placeholder:"www.purenorth.se"},
                ].map(({label, key, placeholder}) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600">{label}</label>
                    <input value={settingsData[key]} onChange={e=>setSettingsData(d=>({...d,[key]:e.target.value}))} placeholder={placeholder} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Fakturainställningar</h3>
              <div>
                <label className="text-xs font-medium text-slate-600">Betalningsvillkor (dagar)</label>
                <input type="number" value={settingsData.payment_terms_days} onChange={e=>setSettingsData(d=>({...d,payment_terms_days:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">OB-tillägg (kr/tim)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">OB1 (kväll)</label>
                  <input type="number" value={settingsData.ob1_extra} onChange={e=>setSettingsData(d=>({...d,ob1_extra:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">OB2 (natt/helg)</label>
                  <input type="number" value={settingsData.ob2_extra} onChange={e=>setSettingsData(d=>({...d,ob2_extra:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                </div>
              </div>
            </div>
            <button onClick={saveSettings} disabled={settingsSaving} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
              {settingsSaving ? "Sparar..." : "Spara inställningar"}
            </button>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default function Admin() {
  const { user, loading, login } = useAuth();
  const [resetToken, setResetToken] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    if (token) setResetToken(token);
  }, []);

  const doReset = async (e) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) { toast.error("Lösenorden matchar inte."); return; }
    setResetLoading(true);
    try {
      await api.post("/auth/reset-password", { token: resetToken, new_password: resetPassword });
      setResetDone(true);
      setResetToken(null);
      window.history.replaceState({}, "", "/admin");
      toast.success("Lösenordet uppdaterat! Logga in med ditt nya lösenord.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Ogiltig eller utgången länk.");
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Laddar...</div>;
  if (resetToken) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-5">
      <form onSubmit={doReset} className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Nytt lösenord</h1>
        <p className="text-sm text-slate-500 mb-6">Ange ditt nya lösenord nedan.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nytt lösenord</label>
            <input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} required minLength={6}
              className="w-full rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Minst 6 tecken"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bekräfta lösenord</label>
            <input type="password" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)} required
              className="w-full rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]" placeholder="Upprepa lösenordet"/>
          </div>
          <button type="submit" disabled={resetLoading} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {resetLoading ? "Uppdaterar..." : "Spara nytt lösenord"}
          </button>
        </div>
      </form>
    </div>
  );
  if (!user) {
    return <LoginScreen onLogin={login} />;
  }
  return <Dashboard />;
}
