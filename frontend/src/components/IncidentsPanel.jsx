import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Upload, AlertTriangle, X, FileSpreadsheet, FileText, TrendingDown, CheckCircle } from "lucide-react";

const STATUS = {
  reported: { label: "Rapporterad", cls: "bg-amber-50 text-amber-700" },
  insurance: { label: "Försäkring", cls: "bg-blue-50 text-blue-700" },
  paid: { label: "Betald", cls: "bg-green-50 text-green-700" },
  closed: { label: "Avslutad", cls: "bg-slate-100 text-slate-600" },
};
function kr(n) { return Math.round(n || 0).toLocaleString("sv-SE") + " kr"; }

function IncidentModal({ onClose, onSave, employees, bookings }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), location: "", employee_id: "", description: "", cost: "", photo: null });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
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
      onSave();
    } catch { toast.error("Något gick fel."); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">Rapportera skada</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Datum</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Plats / Kund (från bokning)</label>
            <select onChange={e=>{const b=bookings.find(x=>(x._id||x.id)===e.target.value);if(b)setForm(f=>({...f,location:`${b.name}${b.address?" - "+b.address:""}`)});}} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]">
              <option value="">— Välj bokning —</option>
              {bookings.map(b=><option key={b._id||b.id} value={b._id||b.id}>{b.name}{b.address?" - "+b.address:""}</option>)}
            </select>
            <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Eller skriv manuellt" className="w-full mt-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Anställd</label>
            <select value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]">
              <option value="">— Välj —</option>
              {employees.map(e=><option key={e._id||e.id} value={e._id||e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Beskrivning</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Vad hände?" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414] resize-none"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Kostnad (kr)</label>
            <input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#141414]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Foto</label>
            <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 cursor-pointer hover:border-slate-400">
              <Upload size={15}/> {form.photo ? form.photo.name : "Ladda upp bild"}
              <input type="file" accept="image/*" onChange={e=>setForm(f=>({...f,photo:e.target.files[0]}))} className="hidden"/>
            </label>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-full bg-[#141414] text-white py-2.5 font-semibold hover:bg-black disabled:opacity-50 transition-colors">
            {saving ? "Sparar..." : "Spara"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function IncidentsPanel() {
  const [incidents, setIncidents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    try {
      const [inc, emp, bk] = await Promise.all([
        api.get("/incidents"),
        api.get("/employees").catch(()=>({data:[]})),
        api.get("/bookings").catch(()=>({data:[]})),
      ]);
      setIncidents(inc.data || []);
      setEmployees(emp.data || []);
      setBookings(bk.data || []);
    } catch { toast.error("Kunde inte ladda skador."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openTotal = incidents.filter(i=>i.status!=="closed").reduce((s,i)=>s+(i.cost||0),0);
  const closedTotal = incidents.filter(i=>i.status==="closed").reduce((s,i)=>s+(i.cost||0),0);
  const insuranceTotal = incidents.filter(i=>i.status==="insurance").reduce((s,i)=>s+(i.cost||0),0);

  const setStatus = async (id, status) => {
    try { await api.patch(`/incidents/${id}`, { status }); load(); }
    catch { toast.error("Kunde inte uppdatera."); }
  };
  const del = async (id) => {
    if (!window.confirm("Ta bort denna skada?")) return;
    try { await api.delete(`/incidents/${id}`); toast.success("Borttagen."); load(); }
    catch { toast.error("Kunde inte ta bort."); }
  };
  const exportFile = (type) => {
    const token = localStorage.getItem("pn_token");
    const base = process.env.REACT_APP_BACKEND_URL || "";
    if (type === "pdf") { window.open(`${base}/api/incidents/export-pdf?token=${token}`, "_blank"); }
    else { const a = document.createElement("a"); a.href=`${base}/api/incidents/export-xlsx?token=${token}`; a.download="skador.xlsx"; a.click(); }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Skador & Olyckor</h2>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.length} rapporterade skador</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>exportFile("xlsx")} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileSpreadsheet size={14}/> Excel
          </button>
          <button onClick={()=>exportFile("pdf")} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg px-3 py-2 transition-all">
            <FileText size={14}/> PDF
          </button>
          <button onClick={()=>setShowModal(true)} className="inline-flex items-center gap-2 rounded-full bg-[#141414] text-white px-4 py-2 text-sm font-semibold hover:bg-black transition-colors">
            <Plus size={16}/> Rapportera skada
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-white border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-amber-500"/><span className="text-xs text-slate-500">Öppna skador</span></div>
          <p className="text-2xl font-bold text-slate-900">{kr(openTotal)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.filter(i=>i.status!=="closed").length} st</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-blue-500"/><span className="text-xs text-slate-500">Hos försäkring</span></div>
          <p className="text-2xl font-bold text-slate-900">{kr(insuranceTotal)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.filter(i=>i.status==="insurance").length} st</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1"><CheckCircle size={16} className="text-green-500"/><span className="text-xs text-slate-500">Avslutade</span></div>
          <p className="text-2xl font-bold text-slate-900">{kr(closedTotal)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{incidents.filter(i=>i.status==="closed").length} st</p>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <p className="font-semibold text-slate-900 text-sm">Skaderapporter</p>
          <p className="text-xs text-slate-400">{incidents.length} poster</p>
        </div>
        {loading ? <p className="p-6 text-slate-400 text-sm">Laddar...</p> : incidents.length === 0 ? (
          <p className="p-6 text-slate-400 text-sm text-center">Inga skador rapporterade ännu.</p>
        ) : incidents.map((i) => (
          <div key={i._id} className="flex items-start gap-3 p-4 border-b border-slate-50 last:border-b-0">
            {i.photo && <img src={i.photo} alt="skada" onClick={()=>setPreview(i.photo)} className="w-14 h-14 rounded-xl object-cover cursor-pointer shrink-0 border border-slate-100"/>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS[i.status]?.cls}`}>{STATUS[i.status]?.label}</span>
                <span className="text-xs text-slate-400">{i.date}</span>
                {i.employee_name && <span className="text-xs text-slate-500">· {i.employee_name}</span>}
              </div>
              {i.location && <p className="text-xs text-slate-500 mb-0.5">{i.location}</p>}
              <p className="text-sm text-slate-700 break-words">{i.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="font-bold text-slate-900 text-sm">{kr(i.cost)}</p>
              <select value={i.status} onChange={e=>setStatus(i._id,e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none">
                {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={()=>del(i._id)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && <IncidentModal onClose={()=>setShowModal(false)} onSave={()=>{setShowModal(false);load();}} employees={employees} bookings={bookings}/>}
      {preview && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={()=>setPreview(null)}><img src={preview} alt="skada" className="max-w-full max-h-full rounded-lg"/></div>}
    </>
  );
}
