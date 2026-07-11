import React, { useState } from "react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const sendForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // always show success
    } finally {
      setForgotLoading(false);
    }
  };

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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-5">
      {!forgotMode && <form onSubmit={submit} data-testid="admin-login-form" className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-7">
          <Logo className="h-10 w-10" />
          <span className="font-display font-bold text-xl text-slate-900">PureNorth Städ</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Admin-inloggning</h1>
        <p className="text-sm text-slate-500 mb-6">Logga in för att hantera bokningar och omdömen.</p>

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
          {!forgotMode && (
            <button type="button" onClick={()=>setForgotMode(true)} className="w-full text-sm text-slate-400 hover:text-[#141414] transition-colors mt-1 text-center">
              Glömt lösenordet?
            </button>
          )}
          <button type="submit" disabled={loading} data-testid="admin-login-submit" className="w-full rounded-full bg-[#141414] hover:bg-[#000000] disabled:opacity-60 text-white py-3 font-semibold transition-colors">
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </div>
      </form>}
      {forgotMode && (
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          {forgotSent ? (
            <div className="text-center py-4">
              <p className="text-green-700 font-semibold mb-2">✅ Kontrollera din e-post!</p>
              <p className="text-sm text-slate-500 mb-4">Om e-postadressen finns skickas en återställningslänk.</p>
              <button onClick={()=>{setForgotMode(false);setForgotSent(false);}} className="text-sm text-slate-500 hover:text-[#141414] underline">Tillbaka till inloggning</button>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Glömt lösenord?</h1>
              <p className="text-sm text-slate-500 mb-6">Ange din e-post så skickar vi en återställningslänk.</p>
              <form onSubmit={sendForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-postadress</label>
                  <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required placeholder="din@email.se"
                    className="w-full rounded-xl border border-slate-200 text-sm px-3.5 py-2.5 outline-none focus:border-[#141414]"/>
                </div>
                <button type="submit" disabled={forgotLoading} className="w-full rounded-full bg-[#141414] hover:bg-black disabled:opacity-50 text-white py-2.5 font-semibold transition-colors">
                  {forgotLoading ? "Skickar..." : "Skicka återställningslänk"}
                </button>
                <button type="button" onClick={()=>setForgotMode(false)} className="w-full text-sm text-slate-400 hover:text-slate-600 py-1">
                  ← Tillbaka till inloggning
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
