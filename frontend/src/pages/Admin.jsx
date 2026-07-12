import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, Trash2, Phone, Mail, Calendar, Maximize, Hash, RefreshCw, Check, X, Clock, LayoutDashboard, CalendarDays, Star, CalendarRange, UserMinus, Receipt, Banknote, FileText, Tag, TrendingUp, TrendingDown, Users, BarChart2, Search, MapPin, FileSpreadsheet, Settings, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useWebsite } from "@/context/WebsiteContext";
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
import { ReviewsPanel } from "@/pages/admin/ReviewsPanel";
import { LoginScreen } from "@/pages/admin/LoginScreen";
import { BookingsPanel } from "@/pages/admin/BookingsPanel";
import { Dashboard } from "@/pages/admin/Dashboard";

const STATUS = {
  new: { label: "Ny", cls: "bg-blue-50 text-blue-700" },
  contacted: { label: "Kontaktad", cls: "bg-amber-50 text-amber-700" },
  done: { label: "Klar", cls: "bg-green-50 text-green-700" },
};




export default function Admin() {
  const { user, loading, login } = useAuth();
  const [resetToken, setResetToken] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reset = params.get("reset_token");
    if (reset) setResetToken(reset);
    const sso = params.get("sso");
    if (sso) {
      localStorage.setItem("pn_token", sso);
      window.history.replaceState({}, "", "/admin");
      window.location.reload();
    }
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
    const params = new URLSearchParams(window.location.search);
    const sso = params.get("sso");
    if (!sso) {
      window.location.href = "https://purenorth-platform.vercel.app/login";
      return <div className="min-h-screen flex items-center justify-center text-slate-500">Omdirigerar till inloggning...</div>;
    }
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Laddar...</div>;
  }
  return <Dashboard />;
}

// reorder Sat Jul  4 08:56:30 UTC 2026
// fix admin Sat Jul  4 09:10:49 UTC 2026
// Sat Jul  4 11:10:34 UTC 2026
