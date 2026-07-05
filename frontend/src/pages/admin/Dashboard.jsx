import React, { useState, useEffect } from "react";
import { useWebsite } from "@/context/WebsiteContext";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Banknote, BarChart2, Bell, Calendar, CalendarDays, CalendarRange, FileText, LayoutDashboard, LogOut, Receipt, Search, Settings, Star, Tag, Trash2, TrendingDown, TrendingUp, UserMinus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SettingsPanel from "@/components/SettingsPanel";
import DashboardPanel from "@/components/DashboardPanel";

export function Dashboard() {
  const ws = useWebsite();
  React.useEffect(() => { document.title = ws.admin_window_title || "PureNorth | Adminpanel"; }, [ws.admin_window_title]);
  const { logout, user } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem("pn_language") || "sv");
  const [notifs, setNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pn_notifs") || "[]"); } catch { return []; }
  });
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = React.useRef(null);
  React.useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 100);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [notifOpen]);
  const [readIds, setReadIds] = React.useState([]);





  const [knownIds, setKnownIds] = React.useState(null);
  React.useEffect(() => {
    localStorage.setItem("pn_notifs", JSON.stringify(notifs));
  }, [notifs]);

  const loadNotifs = React.useCallback(async () => {
    try {
      const res = await api.get("/bookings");
      const allBookings = res.data || [];
      const allIds = allBookings.map(b => b.id);
      setKnownIds(prev => {
        if (prev === null) {
          return allIds;
        }
        const newOnes = allBookings.filter(b => !prev.includes(b.id));
        if (newOnes.length > 0) {
          setNotifs(cur => {
            const existingIds = cur.map(n => n.id);
            const added = newOnes.filter(b => !existingIds.includes(b.id)).map(b => ({
              id: b.id,
              title: `Ny bokning: ${b.name}`,
              sub: `${b.services?.[0] || b.service || ""} · ${b.date || ""}`,
            }));
            if(added.length>0) setUnreadCount(c=>c+added.length);
            return [...cur, ...added];
          });
          return [...prev, ...newOnes.map(b => b.id)];
        }
        return prev;
      });
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 1000);
    return () => clearInterval(interval);
  }, [loadNotifs]);

  const deleteNotif = (id) => { setNotifs(prev => prev.filter(n => n.id !== id)); };

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
  const [selectedBooking, setSelectedBooking] = React.useState(null);
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
      <header className="border-b border-slate-100" style={{backgroundColor: ws.admin_header_bg||"#ffffff"}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <div>
              <span className="font-display font-bold text-base sm:text-lg block leading-tight" style={{color: ws.admin_header_text_color||"#0f172a"}}>{ws.admin_company_name || "PureNorth"}</span>
              <span className="text-xs hidden sm:block" style={{color: ws.admin_header_text_color ? ws.admin_header_text_color+"80" : "#64748b"}}>{ws.admin_panel_label||"Adminpanel"}</span>
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
            <div className="relative" ref={notifRef}>
              <button onClick={()=>setNotifOpen(o=>{if(o)setUnreadCount(0);return !o;})} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative">
                <Bell size={16}/>
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-sm text-slate-900">Nya bokningar</p>
                    <button onClick={()=>setNotifOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                  </div>
                  {notifs.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">Inga nya bokningar</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.map(n => (
                        <div key={n.id} className="flex items-center px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors">
                          <button onClick={()=>{ setTab("bookings"); setNotifOpen(false); setSelectedBooking(n.id); setTimeout(()=>{const el=document.getElementById(`booking-${n.id}`);if(el)el.scrollIntoView({behavior:"smooth",block:"center"});},400); }} className="flex items-center gap-3 flex-1 text-left min-w-0">
                            <div className="relative shrink-0">
                              <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center"><CalendarDays size={14} className="text-blue-600"/></span>
                              {!readIds.includes(n.id) && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500"/>}
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
            {unreadCount > 0 && <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">{unreadCount}</span>}
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
          tab === "bookings" ? <BookingsPanel selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking}/> : tab === "reviews" ? <ReviewsPanel /> :
          tab === "schema" ? <SchedulePanel /> : tab === "absences" ? <AbsencePanel /> :
          tab === "expenses" ? <ExpensePanel /> : tab === "payroll" ? <PayrollPanel /> :
          tab === "invoices" ? <InvoicePanel /> : tab === "pricelist" ? <PriceListPanel /> :
          tab === "customers" ? <CustomerPanel /> : tab === "calendar" ? <CalendarPanel /> :
          <DashboardPanel onNavigate={setTab} />
        ) : (
          tab === "dashboard" ? <DashboardPanel onNavigate={setTab} /> : tab === "bookings" ? <BookingsPanel selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking}/> : tab === "reviews" ? <ReviewsPanel /> : tab === "schema" ? <SchedulePanel /> : tab === "absences" ? <AbsencePanel /> : tab === "expenses" ? <ExpensePanel /> : tab === "payroll" ? <PayrollPanel /> : tab === "invoices" ? <InvoicePanel /> : tab === "pricelist" ? <PriceListPanel /> : tab === "economy" ? <EconomyPanel /> : tab === "customers" ? <CustomerPanel /> : tab === "calendar" ? <CalendarPanel /> : tab === "stats" ? <StatsPanel /> : tab === "users" ? <UsersPanel /> : tab === "costs" ? <CostsPanel /> : tab === "settings" ? <SettingsPanel /> : <DashboardPanel onNavigate={setTab} />
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
// Sun Jul  5 18:10:50 UTC 2026
