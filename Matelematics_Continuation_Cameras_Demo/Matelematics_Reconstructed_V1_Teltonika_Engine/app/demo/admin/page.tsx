import { Building2, ShieldCheck, Truck, Users } from "lucide-react";

export default function DemoAdminPage() {
  const cards = [
    ["Partenaires", "4", Building2],
    ["Entreprises clientes", "12", ShieldCheck],
    ["Utilisateurs", "38", Users],
    ["Véhicules", "128", Truck],
  ] as const;

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 px-4 pb-10 pt-6 text-white sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Mode démonstration</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Administration Matelematics</h1><p className="mt-2 text-sm text-slate-400">Aperçu fictif de la gestion multi-tenant : partenaires, clients, utilisateurs et flotte.</p></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><Icon className="h-5 w-5 text-cyan-400" /></div><p className="mt-3 text-3xl font-bold">{value}</p></div>)}</section>
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 p-5"><h2 className="font-semibold">Organisations de démonstration</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-950/60 text-slate-500"><tr><th className="px-5 py-3">Organisation</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Utilisateurs</th><th className="px-5 py-3">Véhicules</th><th className="px-5 py-3">Statut</th></tr></thead><tbody className="divide-y divide-slate-800"><tr><td className="px-5 py-4">Atlas Fleet</td><td className="px-5 py-4">Partenaire</td><td className="px-5 py-4">12</td><td className="px-5 py-4">46</td><td className="px-5 py-4 text-emerald-400">Actif</td></tr><tr><td className="px-5 py-4">Casa Distribution</td><td className="px-5 py-4">Client direct</td><td className="px-5 py-4">7</td><td className="px-5 py-4">23</td><td className="px-5 py-4 text-emerald-400">Actif</td></tr></tbody></table></div></section>
    </div>
  );
}
