import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Upload, AlertTriangle, X, FileSpreadsheet, FileText } from "lucide-react";

const STATUS = {
  reported: { label: "Rapporterad", cls: "bg-amber-50 text-amber-700" },
  insurance: { label: "Försäkring", cls: "bg-blue-50 text-blue-700" },
  paid: { label: "Betald", cls: "bg-green-50 text-green-700" },
  closed: { label: "Avslutad", cls: "bg-slate-100 text-slate-600" },
};
const fmtKr = (n) => (n || 0).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

export default function IncidentsPanel() {
  const [incidents, setIncidents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), location: "", employee_id: "", description: "", cost: "", photo: null });

  const load = async () => {
    try {
      const [inc, emp, bk] = await Promise.all([api.get("/incidents"), api.get("/employees").catch(()=>({data:[]})), api.get("/bookings").catch(()=>({data:[]}))]);
      setIncidents(inc.data || []);
      setEmployees(emp.data || []);
      setBookings(bk.data || []);
    } catch { toast.error("Kunde inte ladda skador."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const totalCost = incidents.filter(i => i.status !== "closed").reduce((s, i) => s + (i.cost || 0), 0);

  const submit = async () => {
    if (!form.date || !form.description) { toast.error("Fyll i datum och beskrivning."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("date", form.date);
      fd.append("location", form.location);
      fd.append("employee_id", form.employee_id);
      fd.append("description", form.description);
      fd.append("cost", parseFloat(form.cost) || 0);
      fd.append("status", "reported");
      if (form.photo) fd.append("photo", form.photo);
      await api.post("/incidents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Skada rapporterad.");
      setShowForm(false);
      setForm({ date: new Date().toISOString().slice(0,10), location: "", employee_id: "", description: "", cost: "", photo: null });
      load();
    } catch { toast.error("Något gick fel."); }
    finally { setSaving(false); }
  };

  const setStatus = async (id, status) => {
    try { await api.patch(`/incidents/${id}`, { status }); load(); }
    catch { toast.error("Kunde inte uppdatera."); }
  };
  const del = async (id) => {
    if (!window.confirm("Ta bort denna skada?")) return;
    try { await api.delete(`/incidents/${id}`); toast.success("Borttagen."); load(); }
    catch { toast.error("Kunde inte ta bort."); }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Laddar...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-500"/> Skador & Olyckor</h2>
          <p className="text-sm text-slate-500 mt-0.5">Öppna skador: <span className="font-semibold text-red-600">{fmtKr(totalCost)}</span></p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/incidents/export-xlsx?token=${token}`;
            a.download = "skador.xlsx"; a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={()=>{
            const token = localStorage.getItem("pn_token");
            const base = process.env.REACT_APP_BACKEND_URL || "";
            const a = document.createElement("a");
            a.href = `${base}/api/incidents/export-pdf?token=${token}`;
            a.download = "skador.pdf"; a.click();
          }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
          </button>
          <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 rounded-full bg-[#141414] text-white px-4 py-2 text-sm font-semibold hover:bg-black transition-colors">
            <Plus size={16}/> Rapportera skada
          </button>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">Inga skador rapporterade.</div>
      ) : (
        <div className="space-y-3">
          {incidents.map((i) => (
            <div key={i._id} className="border border-slate-200 rounded-2xl p-4 flex gap-4">
              {i.photo && <img src={i.photo} alt="skada" onClick={()=>setPreview(i.photo)} className="w-20 h-20 rounded-xl object-cover cursor-pointer shrink-0 border border-slate-200"/>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS[i.status]?.cls}`}>{STATUS[i.status]?.label}</span>
                  <span className="text-xs text-slate-400">{i.date}</span>
                  {i.employee_name && <span className="text-xs text-slate-500">• {i.employee_name}</span>}
                  {i.location && <span className="text-xs text-slate-500">• {i.location}</span>}
                </div>
                <p className="text-sm text-slate-700 mt-1.5 break-words">{i.description}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">{fmtKr(i.cost)}</span>
                  <select value={i.status} onChange={(e)=>setStatus(i._id, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none">
                    {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={()=>del(i._id)} className="text-red-400 hover:text-red-600"><Trash2 size={15}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Rapportera skada</h3>
              <button onClick={()=>setShowForm(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Datum</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Plats / Kund (från bokning)</label>
                <select onChange={e=>{
                  const b = bookings.find(x => (x._id||x.id) === e.target.value);
                  if (b) setForm(f=>({...f, location: `${b.name}${b.address ? " - " + b.address : ""}`}));
                }} className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none">
                  <option value="">— Välj bokning —</option>
                  {bookings.map(b=><option key={b._id||b.id} value={b._id||b.id}>{b.name}{b.address ? " - " + b.address : ""}</option>)}
                </select>
                <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Eller skriv manuellt" className="w-full mt-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Anställd</label>
                <select value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))} className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none">
                  <option value="">— Välj —</option>
                  {employees.map(e=><option key={e._id||e.id} value={e._id||e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Beskrivning</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Vad hände?" rows={3} className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none resize-none"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Kostnad (kr)</label>
                <input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="0" className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Foto</label>
                <label className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 cursor-pointer hover:border-slate-400">
                  <Upload size={15}/> {form.photo ? form.photo.name : "Ladda upp bild"}
                  <input type="file" accept="image/*" onChange={e=>setForm(f=>({...f,photo:e.target.files[0]}))} className="hidden"/>
                </label>
              </div>
              <button onClick={submit} disabled={saving} className="w-full rounded-full bg-[#141414] text-white py-2.5 font-semibold hover:bg-black disabled:opacity-50 transition-colors">
                {saving ? "Sparar..." : "Spara"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={()=>setPreview(null)}>
          <img src={preview} alt="skada" className="max-w-full max-h-full rounded-lg"/>
        </div>
      )}
    </div>
  );
}
