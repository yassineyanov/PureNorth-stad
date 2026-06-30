import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { api } from "@/lib/api";

const WEEKDAYS = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"];
const MONTHS = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

function fmt(y, m, d) {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstWeekday(year, month) {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
}

export default function CalendarPanel() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [bookings, setBookings] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const monthStart = fmt(year, month, 1);
  const monthEnd = fmt(year, month, getDaysInMonth(year, month));

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, sRes, eRes, aRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/shifts", { params: { start: monthStart, end: monthEnd } }),
        api.get("/employees"),
        api.get("/absences"),
      ]);
      const allBookings = bRes.data;
      const monthBookings = allBookings.filter(b => {
        const d = b.preferred_date || "";
        return d >= monthStart && d <= monthEnd;
      });
      setBookings(monthBookings);
      setShifts(sRes.data);
      setEmployees(eRes.data);
      setAbsences(aRes.data || []);
    } catch { toast.error("Kunde inte hämta kalender."); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [year, month]);

  const empMap = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);

  const prev = () => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); };
  const next = () => { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); };

  const days = getDaysInMonth(year, month);
  const firstDay = getFirstWeekday(year, month);
  const todayStr = fmt(today.getFullYear(), today.getMonth()+1, today.getDate());

  const bookingsForDay = (dateStr) => bookings.filter(b => b.preferred_date === dateStr);
  const absencesForDay = (dateStr) => absences.filter(a => a.start_date <= dateStr && a.end_date >= dateStr);
  const shiftsForDay = (dateStr) => shifts.filter(s => s.date === dateStr);

  const selectedDateStr = selected ? fmt(year, month, selected) : null;
  const selectedBookings = selectedDateStr ? bookingsForDay(selectedDateStr) : [];
  const selectedShifts = selectedDateStr ? shiftsForDay(selectedDateStr) : [];

  const STATUS_CLS = { new:"bg-blue-100 text-blue-700", contacted:"bg-amber-100 text-amber-700", done:"bg-green-100 text-green-700" };
  const STATUS_LBL = { new:"Ny", contacted:"Kontaktad", done:"Klar" };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-xl text-slate-900">Kalender</h2>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#141414] transition-colors">
            <ChevronLeft size={16}/>
          </button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()+1); }}
            className="text-sm font-semibold text-slate-700 px-3 py-2 rounded-full border border-slate-200 hover:border-[#141414] transition-colors">
            Idag
          </button>
          <button onClick={next} className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#141414] transition-colors">
            <ChevronRight size={16}/>
          </button>
          <span className="ml-2 font-display font-bold text-slate-900">{MONTHS[month-1]} {year}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            {loading ? (
              <div className="p-8 text-center text-slate-400">Laddar...</div>
            ) : (
              <div className="grid grid-cols-7">
                {/* Empty cells before first day */}
                {Array.from({length: firstDay}).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-50 bg-slate-50/50"/>
                ))}
                {/* Day cells */}
                {Array.from({length: days}).map((_, i) => {
                  const day = i + 1;
                  const dateStr = fmt(year, month, day);
                  const dayBookings = bookingsForDay(dateStr);
                  const dayShifts = shiftsForDay(dateStr);
                  const isToday = dateStr === todayStr;
                  const isSelected = selected === day;
                  const hasItems = dayBookings.length > 0 || dayShifts.length > 0;

                  return (
                    <div key={day}
                      onClick={() => setSelected(isSelected ? null : day)}
                      className={`min-h-[80px] border-b border-r border-slate-50 p-1.5 cursor-pointer transition-colors
                        ${isSelected ? "bg-slate-900" : isToday ? "bg-blue-50" : hasItems ? "hover:bg-slate-50" : "hover:bg-slate-50"}`}>
                      <div className={`text-xs font-bold mb-1 h-5 w-5 rounded-full flex items-center justify-center
                        ${isSelected ? "bg-white text-slate-900" : isToday ? "bg-blue-600 text-white" : "text-slate-600"}`}>
                        {day}
                      </div>
                      {/* Shift dots */}
                      {dayShifts.slice(0,2).map(s => {
                        const isAbsent = absencesForDay(dateStr).some(a => a.employee_id === s.employee_id);
                        const emp = empMap[s.employee_id];
                        return (
                          <div key={s.id} className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 font-medium text-white flex items-center gap-1`}
                            style={{backgroundColor: emp?.color || "#141414"}}>
                            <span className="truncate">{s.start_time} {emp?.name?.split(" ")[0] || ""}</span>
                            {isAbsent && (
                              <span className="shrink-0 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center font-black" style={{fontSize:"12px"}}>+</span>
                            )}
                          </div>
                        );
                      })}
                      {dayShifts.length > 2 && (
                        <div className={`text-[10px] font-semibold ${isSelected ? "text-slate-300" : "text-slate-400"}`}>+{dayShifts.length-2} pass</div>
                      )}
                      {/* Booking dots */}
                      {dayBookings.slice(0,1).map(b => (
                        <div key={b.id} className="text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate font-medium bg-amber-100 text-amber-800">
                          📋 {b.name?.split(" ")[0]}
                        </div>
                      ))}
                      {dayBookings.length > 1 && (
                        <div className={`text-[10px] font-semibold ${isSelected ? "text-slate-300" : "text-slate-400"}`}>+{dayBookings.length-1} bok.</div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#166534] inline-block"></span>Pass (anställd)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-100 border border-amber-200 inline-block"></span>Bokning</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-600 inline-block"></span>Idag</span>
          </div>
        </div>

        {/* Side panel - selected day details */}
        <div className="lg:col-span-1">
          {selected ? (
            <motion.div initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} className="rounded-2xl bg-white border border-slate-100 p-5">
              <h3 className="font-display font-bold text-lg text-slate-900 mb-4">
                {selected} {MONTHS[month-1]}
              </h3>

              {selectedShifts.length === 0 && selectedBookings.length === 0 && (
                <p className="text-sm text-slate-400">Inga pass eller bokningar.</p>
              )}

              {selectedShifts.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pass ({selectedShifts.length})</p>
                  <div className="space-y-2">
                    {selectedShifts.map(s => {
                      const emp = empMap[s.employee_id];
                      return (
                        <div key={s.id} className="flex items-center gap-2.5 rounded-xl p-3 bg-slate-50">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor: emp?.color || "#141414"}}/>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{emp?.name || "Okänd"}</p>
                            <p className="text-xs text-slate-500">{s.start_time}–{s.end_time} · {s.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {absencesForDay(selectedDateStr).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Frånvaro ({absencesForDay(selectedDateStr).length})</p>
                  <div className="space-y-2">
                    {absencesForDay(selectedDateStr).map((a, i) => {
                      const emp = employees.find(e => e.id === a.employee_id);
                      return (
                        <div key={i} className="rounded-xl p-3 bg-red-50 border border-red-100">
                          <p className="text-sm font-semibold text-slate-900">{emp?.name || "Okänd"}</p>
                          <p className="text-xs text-red-600">{a.type} · {a.start_date} → {a.end_date}</p>
                          {a.note && <p className="text-xs text-slate-400 mt-1">{a.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedBookings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Bokningar ({selectedBookings.length})</p>
                  <div className="space-y-2">
                    {selectedBookings.map(b => (
                      <div key={b.id} className="rounded-xl p-3 bg-amber-50 border border-amber-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[b.status]}`}>{STATUS_LBL[b.status]}</span>
                        </div>
                        <p className="text-xs text-slate-600">{b.services?.join(", ")}</p>
                        {b.phone && <p className="text-xs text-slate-500 mt-1">📞 {b.phone}</p>}
                        {b.kvm && <p className="text-xs text-slate-500">{b.kvm} kvm</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-100 p-5 text-center text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 text-slate-200"/>
              <p className="text-sm">Klicka på ett datum för att se detaljer</p>
            </div>
          )}

          {/* Month summary */}
          <div className="rounded-2xl bg-white border border-slate-100 p-5 mt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Månadssammanfattning</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Totala pass</span>
                <span className="font-semibold text-slate-900">{shifts.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Bokningar</span>
                <span className="font-semibold text-slate-900">{bookings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Nya bokningar</span>
                <span className="font-semibold text-blue-600">{bookings.filter(b=>b.status==="new").length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Klara</span>
                <span className="font-semibold text-green-600">{bookings.filter(b=>b.status==="done").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
