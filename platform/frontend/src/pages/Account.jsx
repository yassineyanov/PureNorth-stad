import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, LogOut, ShieldCheck, Receipt, ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Logo } from "@/components/Brand";
import { useAuth } from "@/auth/AuthContext";
import { fetchBilling } from "@/lib/checkout";

const ADMIN_BASE = "https://purenorth-admin.vercel.app/admin";
const adminUrlWithToken = () => {
  const t = typeof window !== "undefined" ? localStorage.getItem("pn_token") : null;
  return t ? `${ADMIN_BASE}?sso=${encodeURIComponent(t)}` : ADMIN_BASE;
};

const fmt = (n) => (typeof n === "number" ? new Intl.NumberFormat("sv-SE").format(Math.round(n)) : n);

const dateSv = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

const StatusPill = ({ status }) => {
  const map = {
    paid: { c: "bg-emerald-50 pn-green", i: CheckCircle2, l: "Betald" },
    initiated: { c: "bg-amber-50 text-amber-700", i: Clock, l: "Väntar" },
    open: { c: "bg-amber-50 text-amber-700", i: Clock, l: "Öppen" },
    expired: { c: "bg-zinc-100 text-zinc-700", i: XCircle, l: "Utgången" },
    failed: { c: "bg-red-50 text-red-700", i: XCircle, l: "Misslyckad" },
  };
  const s = map[status] || { c: "bg-zinc-100 text-zinc-700", i: Clock, l: status || "—" };
  const Icon = s.i;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.c}`}>
      <Icon className="w-3 h-3" />
      {s.l}
    </span>
  );
};

export default function Account() {
  const { user, loading, logout } = useAuth();
  const [billing, setBilling] = useState({ plan: null, transactions: [], loading: true, err: null });

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const data = await fetchBilling();
        if (alive) setBilling({ ...data, loading: false, err: null });
      } catch (e) {
        if (alive) setBilling({ plan: null, transactions: [], loading: false, err: "Kunde inte ladda fakturering." });
      }
    })();
    return () => { alive = false; };
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-700">Laddar...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: "/account" }} />;

  const plan = billing.plan;
  const txs = billing.transactions || [];

  return (
    <div className="min-h-screen bg-white" data-testid="account-page">
      <header className="border-b border-zinc-200">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/"><Logo size="md" /></Link>
          <button
            type="button"
            onClick={logout}
            data-testid="account-logout"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 h-9 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logga ut
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 lg:px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-pn-green-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] pn-green">
            <ShieldCheck className="w-3 h-3" /> Konto
          </span>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900">
            Hej {user.name || user.email.split("@")[0]}.
          </h1>
          <p className="mt-3 text-zinc-700 text-lg max-w-xl">
            Din plan, fakturor och genvägar, samlat på ett ställe.
          </p>

          {/* Plan card */}
          <section className="mt-10" data-testid="account-plan-section">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 mb-3">Din plan</div>
            {plan ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" data-testid="account-plan-card">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl font-semibold text-zinc-900">{plan.name}</span>
                    <StatusPill status={plan.status === "active" ? "paid" : plan.status} />
                  </div>
                  <div className="mt-1 text-sm text-zinc-700">
                    {fmt(plan.amount)} {(plan.currency || "sek").toUpperCase()}/mån
                    {plan.started_at ? <> · aktiv sedan {dateSv(plan.started_at)}</> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={adminUrlWithToken()} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white h-10 px-4 text-sm font-medium">
                    Öppna admin
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Link to="/#pricing" data-testid="account-change-plan"
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 h-10 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
                    Byt plan
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 flex items-center justify-between gap-4" data-testid="account-no-plan">
                <div>
                  <div className="font-display text-lg font-semibold text-zinc-900">Ingen aktiv plan än.</div>
                  <p className="mt-1 text-sm text-zinc-700">Välj en plan för att aktivera din PureNorth-plattform.</p>
                </div>
                <Link to="/#pricing"
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white h-10 px-4 text-sm font-medium">
                  Välj plan
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* Billing history */}
          <section className="mt-12" data-testid="account-billing-section">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 flex items-center gap-1.5">
                <Receipt className="w-3 h-3" /> Fakturor & betalningar
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-700 bg-zinc-50/70 border-b border-zinc-200">
                <span>Datum</span>
                <span>Plan</span>
                <span>Belopp</span>
                <span className="text-right">Status</span>
              </div>
              {billing.loading ? (
                <div className="px-5 py-6 text-sm text-zinc-700">Laddar...</div>
              ) : txs.length === 0 ? (
                <div className="px-5 py-6 text-sm text-zinc-700" data-testid="account-billing-empty">
                  Inga fakturor än. När du väljer en plan visas alla dina betalningar här.
                </div>
              ) : (
                txs.map((tx) => (
                  <div key={tx.session_id}
                    className="grid grid-cols-[1.2fr_0.8fr_1fr_0.8fr] items-center px-5 py-3 text-[13px] border-b border-zinc-100 last:border-b-0"
                    data-testid="account-billing-row">
                    <span className="text-zinc-900">{dateSv(tx.created_at)}</span>
                    <span className="text-zinc-700 capitalize">{tx.package_name || tx.package_id}</span>
                    <span className="text-zinc-900 font-medium">
                      {fmt(tx.amount)} {(tx.currency || "sek").toUpperCase()}
                    </span>
                    <span className="justify-self-end">
                      <StatusPill status={tx.payment_status || tx.status} />
                    </span>
                  </div>
                ))
              )}
            </div>
            {billing.err ? <p className="mt-3 text-sm text-red-600">{billing.err}</p> : null}
          </section>

          {/* Account details */}
          <section className="mt-12">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 mb-3">Kontouppgifter</div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-1.5 text-sm">
              <div><span className="text-zinc-700">Namn: </span><span className="text-zinc-900 font-medium">{user.name}</span></div>
              <div><span className="text-zinc-700">E-post: </span><span className="text-zinc-900 font-medium">{user.email}</span></div>
              <div><span className="text-zinc-700">Roll: </span><span className="text-zinc-900 font-medium capitalize">{user.role}</span></div>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
