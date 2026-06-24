import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Users, Calendar, Clock, PiggyBank, BookOpen, Timer, Award } from "lucide-react";

function kr(v) { return `${(v||0).toLocaleString("sv-SE",{minimumFractionDigits:0,maximumFractionDigits:0})} kr`; }

const COLORS = ["#141414","#166534","#1d4ed8","#b45309","#7c3aed","#be123c"];

function Card({ title, value, sub, icon: Icon, color="slate" }) {
  const bg = { green:"bg-green-50 text-green-700", blue:"bg-blue-50 text-blue-700", amber:"bg-amber-50 text-amber-700", slate:"bg-white text-slate-700" };
  return (
    <div className={`rounded-2xl border border-slate-100 p-5 ${color==="slate"?"bg-white":bg[color].split(" ")[0]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</p>
        {Icon && <Icon size={18} className="text-slate-400"/>}
      </div>
      <p className={`text-3xl font-display font-bold ${color==="slate"?"text-slate-900":bg[color].split(" ")[1]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{color:p.color}} className="text-xs">{p.name}: <strong>{typeof p.value === "number" && p.name.includes("kr") ? kr(p.value) : p.value}</strong></p>
      ))}
    </div>
  );
};

export default function StatsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  const load = async (m) => {
    setLoading(true);
    try {
      const res = await api.get("/stats/overview", { params: { months: m } });
      setData(res.data);
    } catch { toast.error("Kunde inte hämta statistik."); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(months); }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400">Laddar statistik...</div>;
  if (!data) return null;

  const revenueData = data.monthly.map(m => ({ ...m, "Intäkter (kr)": m.revenue, "Betalt (kr)": m.paid }));
  const bookingData = data.monthly.map(m => ({ ...m, "Bokningar": m.bookings, "Avslutade": m.bookings_done }));
  const hoursData = data.monthly.map(m => ({ ...m, "Timmar": m.hours }));

  const statusData = [
    { name: "Nya", value: data.status_breakdown.new, color: "#1d4ed8" },
    { name: "Kontaktade", value: data.status_breakdown.contacted, color: "#b45309" },
    { name: "Klara", value: data.status_breakdown.done, color: "#166534" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-display font-bold text-xl text-slate-900">Statistik & Analys</h2>
        <div className="flex gap-2">
          {[3,6,12].map(m => (
            <button key={m} onClick={() => { setMonths(m); load(m); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${months===m ? "bg-[#141414] text-white" : "border border-slate-200 text-slate-600 hover:border-[#141414]"}`}>
              {m} mån
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card title="Total intäkt" value={kr(data.totals.revenue)} icon={TrendingUp} color="green" sub={`Senaste ${months} månader`}/>
        <Card title="Totalt bokningar" value={data.totals.bookings} icon={Calendar} color="blue" sub={`Senaste ${months} månader`}/>
        <Card title="Totala timmar" value={`${data.totals.hours} h`} icon={Clock} color="amber" sub="Schemalagda pass"/>
        <Card title="Populäraste tjänst" value={data.top_services[0]?.service || "–"} icon={Users} sub={`${data.top_services[0]?.count || 0} bokningar`}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Revenue chart */}
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><PiggyBank size={16} className="text-green-600"/> Intäkter per månad</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} margin={{top:0,right:0,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="label" tick={{fontSize:10}} tickLine={false}/>
              <YAxis tick={{fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="Intäkter (kr)" fill="#141414" radius={[4,4,0,0]}/>
              <Bar dataKey="Betalt (kr)" fill="#166534" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings chart */}
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BookOpen size={16} className="text-blue-600"/> Bokningar per månad</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bookingData} margin={{top:0,right:0,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="label" tick={{fontSize:10}} tickLine={false}/>
              <YAxis tick={{fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Line type="monotone" dataKey="Bokningar" stroke="#1d4ed8" strokeWidth={2} dot={{r:3}}/>
              <Line type="monotone" dataKey="Avslutade" stroke="#166534" strokeWidth={2} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hours chart */}
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Timer size={16} className="text-amber-600"/> Arbetade timmar per månad</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hoursData} margin={{top:0,right:0,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="label" tick={{fontSize:10}} tickLine={false}/>
              <YAxis tick={{fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="Timmar" fill="#b45309" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Booking status pie */}
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-purple-600"/> Bokningsstatus (totalt)</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{backgroundColor:s.color}}/>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top services */}
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Award size={16} className="text-rose-600"/> Populäraste tjänster</h3>
          <div className="space-y-3">
            {data.top_services.map((s, i) => {
              const max = data.top_services[0]?.count || 1;
              return (
                <div key={s.service}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{s.service}</span>
                    <span className="text-slate-500 font-semibold">{s.count} st</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${(s.count/max)*100}%`, backgroundColor:COLORS[i%COLORS.length]}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employee hours */}
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-slate-600"/> Timmar per anställd (månaden)</h3>
          {data.employee_hours_this_month.length === 0 ? (
            <p className="text-sm text-slate-400">Inga pass inlagda denna månad.</p>
          ) : (
            <div className="space-y-3">
              {data.employee_hours_this_month.map((e, i) => {
                const max = data.employee_hours_this_month[0]?.hours || 1;
                return (
                  <div key={e.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium">{e.name}</span>
                      <span className="text-slate-500 font-semibold">{e.hours} h</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${(e.hours/max)*100}%`, backgroundColor:COLORS[i%COLORS.length]}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
