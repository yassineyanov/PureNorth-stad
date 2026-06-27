import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Users, Link2, FileText, FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLORS = [
  "#0f172a", "#1e3a5f", "#1d4ed8", "#0369a1", "#0891b2",
  "#059669", "#166534", "#15803d", "#4d7c0f", "#ca8a04",
  "#d97706", "#b45309", "#c2410c", "#b91c1c", "#be123c",
  "#7c3aed", "#6d28d9", "#4338ca", "#0f766e", "#065f46",
  "#374151", "#92400e", "#831843", "#9d174d", "#1e40af",
];
const DAY_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prettyRange(start, end) {
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("sv-SE", opts)} – ${end.toLocaleDateString("sv-SE", opts)}`;
}

function EmployeeRow({ emp, onRemove, onUpdate }) {
  const [rate, setRate] = useState(emp.hourly_rate ?? 0);
  const [persnr, setPersnr] = useState(emp.personnummer || "");

  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: emp.color }} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
            {emp.phone && <p className="text-xs text-slate-500">{emp.phone}</p>}
          </div>
        </div>
        <button onClick={() => onRemove(emp.id)} className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div>
          <Label className="text-xs">Timlön (kr/h)</Label>
          <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} onBlur={() => onUpdate(emp.id, { hourly_rate: parseFloat(rate) || 0 })} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Personnummer</Label>
          <Input value={persnr} onChange={(e) => setPersnr(e.target.value)} onBlur={() => onUpdate(emp.id, { personnummer: persnr.trim() || null })} className="mt-1 h-8 text-sm" placeholder="ÅÅMMDD-XXXX" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Anställningstyp</Label>
        <select value={emp.employment_type || "fastanstalld"} onChange={(e) => onUpdate(emp.id, { employment_type: e.target.value })} className="w-full mt-1 rounded-lg border border-slate-200 text-xs px-2.5 py-1.5 outline-none focus:border-[#141414]">
          <option value="fastanstalld">Fast anställd</option>
          <option value="vikarie">Vikarie</option>
        </select>
      </div>
    </div>
  );
}

function EmployeeModal({ employees, onClose, onAdd, onRemove, onUpdate }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [showAllColors, setShowAllColors] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), phone: phone.trim() || null, color });
      setName("");
      setPhone("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-7 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">Personal</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {employees.length === 0 && <p className="text-sm text-slate-500">Inga anställda ännu.</p>}
          {employees.map((emp) => (
            <EmployeeRow key={emp.id} emp={emp} onRemove={onRemove} onUpdate={onUpdate} />
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3 border-t border-slate-100 pt-5">
          <div>
            <Label htmlFor="emp-name">Namn</Label>
            <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="T.ex. Maria Johansson" />
          </div>
          <div>
            <Label htmlFor="emp-phone">Telefon (valfritt)</Label>
            <Input id="emp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" placeholder="070-000 00 00" />
          </div>
          <div>
            <Label>Färg</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(showAllColors ? COLORS : COLORS.slice(0, 10)).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0"
                  style={{ backgroundColor: c, borderColor: color === c ? "#141414" : "transparent", boxShadow: color === c ? "0 0 0 2px #141414" : "none" }}
                >
                  {color === c && <span className="text-white text-[10px] font-bold">✓</span>}
                </button>
              ))}
              <button type="button" onClick={() => setShowAllColors(v => !v)}
                className="h-8 px-2 rounded-full border border-slate-200 text-xs text-slate-500 hover:border-slate-400 transition-all shrink-0">
                {showAllColors ? "Visa färre" : `+${COLORS.length - 10} fler`}
              </button>
            </div>
          </div>
          <button type="submit" disabled={saving || !name.trim()} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Lägger till..." : "Lägg till anställd"}
          </button>
          <p className="text-xs text-slate-400 text-center">Timlön och personnummer kan fyllas i ovan efter att den anställda lagts till.</p>
        </form>
      </motion.div>
    </div>
  );
}

function ShiftModal({ initial, employees, bookings, onClose, onSave, onDelete }) {
  const [employeeId, setEmployeeId] = useState(initial.employee_id || (employees[0]?.id ?? ""));
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.start_time || "08:00");
  const [endTime, setEndTime] = useState(initial.end_time || "10:00");
  const [title, setTitle] = useState(initial.title || "Städning");
  const [note, setNote] = useState(initial.note || "");
  const [bookingId, setBookingId] = useState(initial.booking_id || "");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial.id);

  const applyBooking = (id) => {
    setBookingId(id);
    const b = bookings.find((x) => x.id === id);
    if (b) {
      const svc = b.services?.[0] || "Städning";
      setTitle(`${svc} – ${b.name}`);
      if (b.preferred_date) setDate(b.preferred_date);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: initial.id,
        employee_id: employeeId,
        date,
        start_time: startTime,
        end_time: endTime,
        title: title.trim() || "Pass",
        note: note.trim() || null,
        booking_id: bookingId || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-7"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">{isEdit ? "Redigera pass" : "Nytt pass"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Anställd</Label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-1">
              <Label htmlFor="s-date">Datum</Label>
              <Input id="s-date" type="date" style={{WebkitAppearance:"none", appearance:"none"}} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>
            <div className="col-span-1">
              <Label htmlFor="s-start">Start</Label>
              <Input id="s-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5" />
            </div>
            <div className="col-span-1">
              <Label htmlFor="s-end">Slut</Label>
              <Input id="s-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label htmlFor="s-title">Titel</Label>
            <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>

          <div>
            <Label className="flex items-center gap-1.5"><Link2 size={13} /> Koppla till bokning (valfritt)</Label>
            <select value={bookingId} onChange={(e) => applyBooking(e.target.value)} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              <option value="">Ingen bokning</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>{b.name} · {b.services?.[0] || ""} {b.preferred_date ? `· ${b.preferred_date}` : ""}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="s-note">Anteckning (valfritt)</Label>
            <textarea id="s-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full mt-1.5 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414] resize-none" />
          </div>

          <div className="flex gap-2.5 pt-2">
            {isEdit && (
              <button type="button" onClick={() => onDelete(initial.id)} className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 border border-slate-200">
                <Trash2 size={16} />
              </button>
            )}
            <button type="submit" disabled={saving} className="flex-1 rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
              {saving ? "Sparar..." : isEdit ? "Spara ändringar" : "Lägg till pass"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function SchedulePanel() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeModal, setEmployeeModal] = useState(false);
  const [shiftModal, setShiftModal] = useState(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6];

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes, bookRes, absRes] = await Promise.all([
        api.get("/employees"),
        api.get("/shifts", { params: { start: fmt(weekStart), end: fmt(weekEnd) } }),
        api.get("/bookings"),
        api.get("/absences", { params: { start: fmt(weekStart), end: fmt(weekEnd) } }),
      ]);
      setEmployees(empRes.data);
      setShifts(shiftRes.data);
      setBookings(bookRes.data);
      setAbsences(absRes.data);
    } catch {
      toast.error("Kunde inte hämta schemat.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [weekStart]);

  const addEmployee = async (payload) => {
    try {
      const res = await api.post("/employees", payload);
      setEmployees((e) => [...e, res.data]);
      toast.success("Anställd tillagd.");
    } catch {
      toast.error("Kunde inte lägga till anställd.");
    }
  };

  const updateEmployee = async (id, payload) => {
    try {
      const res = await api.patch(`/employees/${id}`, payload);
      setEmployees((e) => e.map((x) => (x.id === id ? res.data : x)));
    } catch {
      toast.error("Kunde inte uppdatera anställd.");
    }
  };

  const removeEmployee = async (id) => {
    if (!window.confirm("Ta bort denna anställd? Alla pass tas också bort.")) return;
    try {
      await api.delete(`/employees/${id}`);
      setEmployees((e) => e.filter((x) => x.id !== id));
      setShifts((s) => s.filter((x) => x.employee_id !== id));
      toast.success("Anställd borttagen.");
    } catch {
      toast.error("Kunde inte ta bort anställd.");
    }
  };

  const saveShift = async (data) => {
    try {
      if (data.id) {
        const res = await api.patch(`/shifts/${data.id}`, data);
        setShifts((s) => s.map((x) => (x.id === data.id ? res.data : x)));
        toast.success("Pass uppdaterat.");
      } else {
        const res = await api.post("/shifts", data);
        setShifts((s) => [...s, res.data]);
        toast.success("Pass tillagt.");
      }
      setShiftModal(null);
    } catch {
      toast.error("Kunde inte spara passet.");
    }
  };

  const deleteShift = async (id) => {
    if (!window.confirm("Ta bort detta pass?")) return;
    try {
      await api.delete(`/shifts/${id}`);
      setShifts((s) => s.filter((x) => x.id !== id));
      setShiftModal(null);
      toast.success("Pass borttaget.");
    } catch {
      toast.error("Kunde inte ta bort passet.");
    }
  };

  const isAbsent = (employeeId, dateStr) =>
    absences.some((a) => a.employee_id === employeeId && a.start_date <= dateStr && a.end_date >= dateStr);

  const shiftsFor = (employeeId, dateStr) =>
    shifts.filter((s) => s.employee_id === employeeId && s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#141414]">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekStart(startOfWeekMonday(new Date()))} className="text-sm font-semibold text-slate-700 px-3 py-2 rounded-full border border-slate-200 hover:border-[#141414]">
            Idag
          </button>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#141414]">
            <ChevronRight size={16} />
          </button>
          <span className="ml-2 font-display font-semibold text-slate-900">{prettyRange(weekStart, weekEnd)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const start = weekStart.toISOString().split("T")[0];
            const end = weekEnd.toISOString().split("T")[0];
            window.open(`${base}/api/shifts/export-pdf?start=${start}&end=${end}&token=${token}`, "_blank");
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> Schema PDF
          </button>
          <button onClick={() => {
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const start = weekStart.toISOString().split("T")[0];
            const end = weekEnd.toISOString().split("T")[0];
            const a = document.createElement("a");
            a.href = `${base}/api/shifts/export-xlsx?start=${start}&end=${end}&token=${token}`;
            a.download = `schema_${start}_${end}.xlsx`;
            a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={() => setEmployeeModal(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full px-4 py-2 hover:border-[#141414] hover:text-[#141414] transition-colors">
            <Users size={15} /> Hantera personal
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Laddar...</p>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
          <p className="text-slate-500 mb-4">Lägg till din första anställd för att börja schemalägga.</p>
          <button onClick={() => setEmployeeModal(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] rounded-full px-5 py-2.5 hover:bg-black transition-colors">
            <Plus size={15} /> Lägg till anställd
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-100 overflow-x-auto -mx-3 sm:mx-0 rounded-none sm:rounded-2xl">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100">
              <div className="p-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Personal</div>
              {weekDays.map((d, i) => (
                <div key={i} className="p-3.5 text-center border-l border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{DAY_LABELS[i]}</p>
                  <p className="text-sm font-display font-semibold text-slate-900">{d.getDate()}/{d.getMonth() + 1}</p>
                </div>
              ))}
            </div>

            {employees.map((emp) => (
              <div key={emp.id} className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
                <div className="p-3.5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: emp.color }} />
                  <span className="text-sm font-semibold text-slate-900 truncate">{emp.name}</span>
                </div>
                {weekDays.map((d, i) => {
                  const dateStr = fmt(d);
                  const dayShifts = shiftsFor(emp.id, dateStr);
                  return (
                    <div key={i} className="p-1.5 border-l border-slate-100 min-h-[70px] group relative overflow-hidden">
                      <div className="space-y-1">
                        {dayShifts.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setShiftModal(s)}
                            className="relative w-full text-left rounded-lg px-2 py-1.5 text-white text-xs leading-tight hover:opacity-90 transition-opacity overflow-hidden"
                            style={{ backgroundColor: emp.color }}
                          >
                            <p className="font-semibold truncate">{s.start_time}–{s.end_time}</p>
                            <p className="truncate opacity-90">{s.title}</p>
                            {isAbsent(emp.id, s.date) && (
                              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white font-bold leading-none" style={{fontSize:"10px"}}>+</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShiftModal({ employee_id: emp.id, date: dateStr })}
                        className="mt-1 w-full h-6 rounded-lg border border-dashed border-slate-200 text-slate-300 hover:border-[#141414] hover:text-[#141414] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {employeeModal && (
          <EmployeeModal employees={employees} onClose={() => setEmployeeModal(false)} onAdd={addEmployee} onRemove={removeEmployee} onUpdate={updateEmployee} />
        )}
        {shiftModal && (
          <ShiftModal initial={shiftModal} employees={employees} bookings={bookings} onClose={() => setShiftModal(null)} onSave={saveShift} onDelete={deleteShift} />
        )}
      </AnimatePresence>
    </>
  );
}
