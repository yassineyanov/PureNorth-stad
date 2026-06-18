import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, Trash2, Phone, Mail, Calendar, Maximize, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAF8] px-5">
      <form onSubmit={submit} data-testid="admin-login-form" className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-7">
          <Logo className="h-10 w-10" />
          <span className="font-display font-bold text-xl text-slate-900">PureNorth Städ</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Admin-inloggning</h1>
        <p className="text-sm text-slate-500 mb-6">Logga in för att se bokningar.</p>
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
          <button type="submit" disabled={loading} data-testid="admin-login-submit" className="w-full rounded-full bg-[#166534] hover:bg-[#14532d] disabled:opacity-60 text-white py-3 font-semibold transition-colors">
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bookings");
      setBookings(res.data);
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
    <div className="min-h-screen bg-[#F7FAF8]">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-18 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <div>
              <span className="font-display font-bold text-lg text-slate-900 block leading-tight">PureNorth Städ</span>
              <span className="text-xs text-slate-500">Bokningar</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} data-testid="admin-refresh" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#166534] px-3 py-2">
              <RefreshCw size={15} /> Uppdatera
            </button>
            <button onClick={logout} data-testid="admin-logout" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-[#166534] hover:text-[#166534] transition-colors">
              <LogOut size={15} /> Logga ut
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
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
            {bookings.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid={`booking-row-${b.id}`}
                className="rounded-2xl bg-white border border-slate-100 p-6 flex flex-col lg:flex-row lg:items-center gap-5 justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display font-semibold text-lg text-slate-900">{b.name}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS[b.status]?.cls}`}>
                      {STATUS[b.status]?.label || b.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                    <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#166534]"><Phone size={14} /> {b.phone}</a>
                    <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1.5 hover:text-[#166534]"><Mail size={14} /> {b.email}</a>
                    {b.kvm && <span className="inline-flex items-center gap-1.5"><Maximize size={14} /> {b.kvm} kvm</span>}
                    {b.preferred_date && <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {b.preferred_date}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {b.services.map((s) => (
                      <span key={s} className="text-xs bg-[#166534]/8 text-[#166534] px-2.5 py-1 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                  {b.other_description && (
                    <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3"><strong>Annat:</strong> {b.other_description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={b.status}
                    onChange={(e) => setStatus(b.id, e.target.value)}
                    data-testid={`booking-status-${b.id}`}
                    className="rounded-full border border-slate-200 text-sm px-4 py-2 outline-none focus:border-[#166534]"
                  >
                    <option value="new">Ny</option>
                    <option value="contacted">Kontaktad</option>
                    <option value="done">Klar</option>
                  </select>
                  <button onClick={() => remove(b.id)} data-testid={`booking-delete-${b.id}`} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Admin() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Laddar...</div>;
  }
  if (!user) {
    return <LoginScreen onLogin={login} />;
  }
  return <Dashboard />;
}
