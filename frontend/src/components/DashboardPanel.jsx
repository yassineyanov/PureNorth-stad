import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Calendar, Users, FileText, AlertCircle, Clock, TrendingUp, TrendingDown, Phone, Mail, RefreshCw, CalendarClock, ClipboardList, CalendarDays, Wallet, Landmark, Banknote, Receipt, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

function kr(v) { return `${(v||0).toLocaleString("sv-SE",{minimumFractionDigits:2,maximumFractionDigits:2})} kr`; }

function StatCard({ title, value, sub, color="slate", icon: Icon, onClick }) {
  const colors = {
    green: "bg-green-50 border-green-100",
    red: "bg-red-50 border-red-100",
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100",
    slate: "bg-white border-slate-100",
    purple: "bg-purple-50 border-purple-100",
  };
  const textColors = {
    green:"text-green-700", red:"text-red-700", blue:"text-blue-700",
    amber:"text-amber-700", slate:"text-slate-700", purple:"text-purple-700"
  };
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      onClick={onClick}
      className={`rounded-2xl border p-5 ${colors[color]} ${onClick?"cursor-pointer hover:shadow-md transition-shadow":""}`}>
      <div className="flex items-start justify-between mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${textColors[color]}`}>{title}</p>
        {Icon && <Icon size={18} className={`${textColors[color]} opacity-60`}/>}
      </div>
      <p className={`text-3xl font-display font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 opacity-70 ${textColors[color]}`}>{sub}</p>}
    </motion.div>
  );
}

function Section({ title, children, action }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>

  );
}

export default function DashboardPanel({ onNavigate, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
      setLastUpdated(new Date());
    } catch { if (!silent) toast.error("Kunde inte hämta dashboard."); }
    finally { if (!silent) setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ 
    load();
    const interval = setInterval(() => load(true), 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString("sv-SE", { weekday:"long", day:"numeric", month:"long" });

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <RefreshCw size={24} className="animate-spin mr-2"/> Laddar dashboard...
    </div>
  );

  if (!data) return null;

  const STATUS_CLS = { new:"bg-blue-50 text-blue-700", contacted:"bg-amber-50 text-amber-700", done:"bg-green-50 text-green-700" };
  const STATUS_LBL = { new:"Ny", contacted:"Kontaktad", done:"Klar" };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Översikt</h2>
          <p className="text-sm text-slate-500 capitalize">{todayStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://purenorth-stad.vercel.app" target="_blank" rel="noopener noreferrer"
            className="h-9 px-3 rounded-full border border-slate-200 flex items-center gap-1.5 text-slate-400 hover:border-[#141414] hover:text-[#141414] transition-colors text-xs font-medium">
            <ExternalLink size={13}/> Öppna sajt
          </a>
          <button onClick={()=>{load();if(onRefresh)onRefresh();}} className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#141414] hover:text-[#141414] transition-colors">
            <RefreshCw size={15}/>
          </button>
          <button onClick={async () => {
            if (!window.confirm("Återställ ALL ekonomisk data till 0?")) return;
            try { await api.post("/admin/reset-economy"); window.location.reload(); }
            catch(e) { alert("Fel vid återställning."); }
          }} className="h-9 px-3 rounded-full border-2 border-red-300 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors" title="Återställ ekonomi">
            🗑️ Reset
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard title="Pass idag" value={data.todays_shift_count} icon={Clock}
          color={data.todays_shift_count>0?"blue":"slate"}
          sub={data.absent_today_count>0 ? `${data.absent_today_count} frånvaro` : "Inga frånvaron"}
          onClick={()=>onNavigate("schema")} />
        <StatCard title="Nya bokningar" value={data.new_bookings_count} icon={Calendar}
          color={data.new_bookings_count>0?"amber":"slate"}
          sub="Väntar på svar"
          onClick={()=>onNavigate("bookings")} />
        <StatCard title="Obetalda fakturor" value={data.unpaid_invoices_count} icon={FileText}
          color={data.overdue_count>0?"red":data.unpaid_invoices_count>0?"amber":"green"}
          sub={data.overdue_count>0 ? `${data.overdue_count} förfallna!` : kr(data.unpaid_total)}
          onClick={()=>onNavigate("invoices")} />
        <StatCard title="Intäkter (månaden)" value={kr(data.month.revenue)} icon={TrendingUp}
          color="green"
          sub={`${data.month.invoice_count} fakturor, ${kr(data.month.paid)} betalt`}
          onClick={()=>onNavigate("economy")} />
        {data.month_material_cost > 0 && (
          <StatCard title="Materialkost. (månaden)" value={kr(data.month_material_cost)} icon={TrendingDown}
            color="amber"
            sub={`${data.month_costs_count} kostnadsposter`}
            onClick={()=>onNavigate("costs")} />
        )}
      </div>

      {/* Payment Reminders */}
      {(() => {
        const today = new Date();
        const day = today.getDate();
        const month = today.toLocaleString("sv-SE", { month: "long" });
        const year = today.getFullYear();
        const mon = String(today.getMonth()+1).padStart(2,"0");
        const reminders = [];

        // AGI reminder - due 12th
        const agiDate = new Date(year, today.getMonth(), 12);
        const daysToAgi = Math.ceil((agiDate - today) / (1000*60*60*24));
        if (daysToAgi >= 0 && daysToAgi <= 5) {
          reminders.push({ type: "red", iconType: "agi", title: "AGI förfaller om " + daysToAgi + " dag(ar)!", desc: "Arbetsgivaravgift + prelskatt ska betalas till Skatteverket (Bankgiro: 5050-1055)", date: `${year}-${mon}-12` });
        }

        // Salary reminder - due 25th
        const salaryDate = new Date(year, today.getMonth(), 25);
        const daysToSalary = Math.ceil((salaryDate - today) / (1000*60*60*24));
        if (daysToSalary >= 0 && daysToSalary <= 5) {
          reminders.push({ type: "amber", iconType: "lon", title: "Löneutbetalning om " + daysToSalary + " dag(ar)", desc: "Nettolön ska betalas till anställdas bankkonton (kolla Lön-fliken)", date: `${year}-${mon}-25` });
        }

        // Moms reminder - due 26th (quarterly/monthly)
        const momsDate = new Date(year, today.getMonth(), 26);
        const daysMoms = Math.ceil((momsDate - today) / (1000*60*60*24));
        if (daysMoms >= 0 && daysMoms <= 5) {
          reminders.push({ type: "amber", iconType: "moms", title: "Momsdeklaration om " + daysMoms + " dag(ar)", desc: "Skicka momsredovisning och betala moms till Skatteverket", date: `${year}-${mon}-26` });
        }

        if (reminders.length === 0) return null;
        return (
          <div className="space-y-2 mb-2">
            {reminders.map((r, i) => (
              <div key={i} className={`rounded-2xl p-4 flex items-start gap-3 ${r.type==="red" ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${r.type==="red" ? "bg-red-100" : "bg-amber-100"}`}>
                  {r.iconType==="agi" && <Landmark size={18} className={r.type==="red"?"text-red-600":"text-amber-600"}/>}
                  {r.iconType==="lon" && <Banknote size={18} className={r.type==="red"?"text-red-600":"text-amber-600"}/>}
                  {r.iconType==="moms" && <Receipt size={18} className={r.type==="red"?"text-red-600":"text-amber-600"}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${r.type==="red" ? "text-red-800" : "text-amber-800"}`}>{r.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{r.desc}</p>
                  <p className={`text-xs font-semibold mt-1 ${r.type==="red" ? "text-red-600" : "text-amber-600"}`}>Förfallodatum: {r.date}</p>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Alerts */}
      {(data.sick_today.length>0 || data.overdue_count>0) && (
        <div className="space-y-2 mb-6">
          {data.sick_today.length>0 && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-600 shrink-0"/>
              <p className="text-sm text-red-800">
                <strong>Sjuk idag:</strong> {data.sick_today.join(", ")}
              </p>
            </div>
          )}
          {data.overdue_count>0 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0"/>
              <p className="text-sm text-amber-800">
                <strong>{data.overdue_count} förfallna fakturor</strong> — {kr(data.unpaid_total)} totalt obetalt
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's shifts */}
        <Section title={<span className="flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Pass idag ({data.todays_shift_count})</span>}
          action={<button onClick={()=>onNavigate("schema")} className="text-xs text-slate-400 hover:text-[#141414]">Se schema →</button>}>
          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
            {data.todays_shifts.length===0 ? (
              <p className="p-5 text-sm text-slate-400">Inga pass inlagda idag.</p>
            ) : data.todays_shifts.map(s=>(
              <div key={s._id} className="flex items-center gap-3 p-4 border-b border-slate-50 last:border-b-0">
                <div className="h-8 w-1.5 rounded-full shrink-0" style={{backgroundColor:s.employee_color}}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.employee_name}</p>
                  <p className="text-xs text-slate-500">{s.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-700">{s.start_time}–{s.end_time}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* New bookings */}
        <Section title={<span className="flex items-center gap-2"><ClipboardList size={16} className="text-amber-500"/> Nya bokningar ({data.new_bookings_count})</span>}
          action={<button onClick={()=>onNavigate("bookings")} className="text-xs text-slate-400 hover:text-[#141414]">Se alla →</button>}>
          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
            {data.new_bookings.length===0 ? (
              <p className="p-5 text-sm text-slate-400">Inga nya bokningar.</p>
            ) : data.new_bookings.map(b=>(
              <div key={b._id} className="p-4 border-b border-slate-50 last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.services?.join(", ")}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_CLS[b.status]}`}>{STATUS_LBL[b.status]}</span>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-1 hover:text-[#141414]"><Phone size={11}/>{b.phone}</a>}
                  {b.preferred_date && <span className="flex items-center gap-1"><Calendar size={11}/>{b.preferred_date}</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Upcoming bookings */}
        <Section title={<span className="flex items-center gap-2"><CalendarDays size={16} className="text-green-500"/> Kommande bokningar (veckan)</span>}
          action={<button onClick={()=>onNavigate("bookings")} className="text-xs text-slate-400 hover:text-[#141414]">Se alla →</button>}>
          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
            {data.upcoming_bookings.length===0 ? (
              <p className="p-5 text-sm text-slate-400">Inga kommande bokningar denna vecka.</p>
            ) : data.upcoming_bookings.map(b=>(
              <div key={b._id} className="flex items-center justify-between gap-3 p-4 border-b border-slate-50 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.services?.join(", ")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-700">{b.preferred_date}</p>
                  {b.kvm && <p className="text-xs text-slate-400">{b.kvm} kvm</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Unpaid invoices */}
        <Section title={<span className="flex items-center gap-2"><Wallet size={16} className="text-red-500"/> Obetalda fakturor ({data.unpaid_invoices_count})</span>}
          action={<button onClick={()=>onNavigate("invoices")} className="text-xs text-slate-400 hover:text-[#141414]">Se alla →</button>}>
          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
            {data.unpaid_invoices.length===0 ? (
              <p className="p-5 text-sm text-green-600 font-semibold">Inga obetalda fakturor!</p>
            ) : data.unpaid_invoices.map(inv=>(
              <div key={inv._id} className={`flex items-center justify-between gap-3 p-4 border-b border-slate-50 last:border-b-0 ${inv.due_date < data.today ? "bg-red-50" : ""}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">#{inv.invoice_number} · {inv.customer_name}</p>
                  <p className={`text-xs ${inv.due_date < data.today ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                    {inv.due_date < data.today ? "Förfallen" : "Förfaller"} {inv.due_date}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-900 shrink-0">{kr(inv.customer_pays)}</p>
              </div>
            ))}
            {data.unpaid_invoices_count>0 && (
              <div className="p-4 bg-slate-50 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Totalt obetalt</span>
                <span className="text-sm font-bold text-slate-900">{kr(data.unpaid_total)}</span>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Week summary */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mt-2">
        <h3 className="font-semibold text-slate-900 mb-4">Veckans sammanfattning</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.week.shifts}</p>
            <p className="text-xs text-slate-500">Pass inlagda</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.week.new_bookings}</p>
            <p className="text-xs text-slate-500">Nya bokningar</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.employee_count}</p>
            <p className="text-xs text-slate-500">Anställda</p>
          </div>
        </div>
      </div>
    </div>

  );
}

