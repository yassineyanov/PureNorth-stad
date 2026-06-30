import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Users, Shield, User, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function UserModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    password: "",
    role: initial?.role || "staff",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || (!isEdit && !form.email) || (!isEdit && !form.password)) return;
    setSaving(true);
    try {
      await onSave(form, initial?.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={onClose}>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} onClick={e=>e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-slate-900">{isEdit ? "Redigera användare" : "Ny användare"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Namn *</Label>
            <Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-1" placeholder="För- och efternamn"/>
          </div>
          {!isEdit && (
            <div>
              <Label>E-post *</Label>
              <Input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="mt-1" placeholder="namn@email.se"/>
            </div>
          )}
          <div>
            <Label>{isEdit ? "Nytt lösenord (lämna tomt för att behålla)" : "Lösenord *"}</Label>
            <Input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} className="mt-1" placeholder="Minst 6 tecken"/>
          </div>
          <div>
            <Label>Roll</Label>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
              className="w-full mt-1 rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]">
              <option value="admin">Admin (full åtkomst)</option>
              <option value="sales">Säljare (bokningar, fakturor, schema)</option>
              <option value="staff">Personal (schema & frånvaro)</option>
            </select>
          </div>
          <div className={`rounded-xl p-3 text-xs ${form.role==="admin" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
            {form.role==="admin"
              ? "⚠️ Admin har full åtkomst till allt inkl. ekonomi, löner och användarhantering."
              : form.role==="sales"
              ? "💼 Säljare kan hantera bokningar, fakturor, schema, kunder och kalender. Ingen tillgång till ekonomi eller statistik."
              : "ℹ️ Personal ser bara Schema och Frånvaro. Ingen tillgång till ekonomi eller löner."}
          </div>
          <button type="submit" disabled={saving||!form.name||(!isEdit&&(!form.email||!form.password))}
            className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
            {saving ? "Sparar..." : isEdit ? "Spara ändringar" : "Skapa användare"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch { toast.error("Kunde inte hämta användare."); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ load(); }, []);

  const saveUser = async (form, id) => {
    try {
      if (id) {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        const res = await api.patch(`/users/${id}`, payload);
        setUsers(u=>u.map(x=>x.id===id?res.data:x));
        toast.success("Användare uppdaterad.");
      } else {
        const res = await api.post("/users", form);
        setUsers(u=>[...u, res.data]);
        toast.success("Användare skapad.");
      }
      setModalOpen(false);
      setEditingUser(null);
    } catch(err) {
      toast.error(err.response?.data?.detail || "Kunde inte spara användaren.");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Ta bort denna användare?")) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(u=>u.filter(x=>x.id!==id));
      toast.success("Användare borttagen.");
    } catch(err) {
      toast.error(err.response?.data?.detail || "Kunde inte ta bort användaren.");
    }
  };

  const adminCount = users.filter(u=>u.role==="admin").length;
  const staffCount = users.filter(u=>u.role==="staff").length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">Användare</h2>
          <p className="text-sm text-slate-500 mt-0.5">{adminCount} admin · {staffCount} personal</p>
        </div>
        <button onClick={()=>{setEditingUser(null);setModalOpen(true);}}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#141414] hover:bg-black rounded-full px-4 py-2 transition-colors">
          <Plus size={14}/> Ny användare
        </button>
      </div>

      {/* Role explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-red-600"/>
            <span className="font-semibold text-red-800 text-sm">Admin</span>
          </div>
          <p className="text-xs text-red-700">Full åtkomst: bokningar, schema, löner, fakturor, ekonomi, kunder, användarhantering.</p>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-purple-600"/>
            <span className="font-semibold text-purple-800 text-sm">Säljare</span>
          </div>
          <p className="text-xs text-purple-700">Bokningar, fakturor, schema, kunder & kalender. Ingen ekonomi eller statistik.</p>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-blue-600"/>
            <span className="font-semibold text-blue-800 text-sm">Personal</span>
          </div>
          <p className="text-xs text-blue-700">Begränsad åtkomst: ser bara Schema och Frånvaro. Ingen ekonomi eller löner.</p>
        </div>
      </div>

      {loading ? <p className="text-slate-500">Laddar...</p> : (
        <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
          {users.map((u, i) => (
            <motion.div key={u.id} initial={{opacity:0}} animate={{opacity:1}}
              className="flex items-center justify-between gap-4 p-4 border-b border-slate-50 last:border-b-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${u.role==="admin"?"bg-red-100":"bg-blue-100"}`}>
                  {u.role==="admin" ? <Shield size={18} className="text-red-600"/> : <User size={18} className="text-blue-600"/>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role==="admin"?"bg-red-50 text-red-700":u.role==="sales"?"bg-purple-50 text-purple-700":"bg-blue-50 text-blue-700"}`}>
                  {u.role==="admin" ? "Admin" : u.role==="sales" ? "Säljare" : "Personal"}
                </span>
                <button onClick={()=>{setEditingUser(u);setModalOpen(true);}}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <Pencil size={14}/>
                </button>
                <button onClick={()=>deleteUser(u.id)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <UserModal initial={editingUser} onClose={()=>{setModalOpen(false);setEditingUser(null);}} onSave={saveUser}/>}
      </AnimatePresence>
    </>
  );
}
