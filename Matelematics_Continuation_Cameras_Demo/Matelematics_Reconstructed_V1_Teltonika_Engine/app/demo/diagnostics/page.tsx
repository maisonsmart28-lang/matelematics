"use client";

import { Activity, AlertTriangle, CheckCircle2, Gauge, RotateCcw, ShieldCheck, Truck, Wrench } from "lucide-react";

const vehicles = [
  { name: "Renault Express", plate: "12345-A-6", status: "A surveiller", dtc: "P0420", engine: "Check Engine", severity: "orange" },
  { name: "Ford Transit", plate: "67890-B-7", status: "Critique", dtc: "P0299", engine: "Perte de pression turbo", severity: "red" },
  { name: "Dacia Dokker", plate: "24680-C-8", status: "OK", dtc: "Aucun", engine: "Aucun défaut actif", severity: "green" },
];

export default function DemoDiagnosticsPage() {
  return (
    <div className="min-h-screen space-y-6 bg-slate-950 px-4 pb-10 pt-6 text-white sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-400"><Activity className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.2em]">Mode démonstration</span></div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Centre de diagnostic des véhicules</h1>
          <p className="mt-2 text-sm text-slate-400">Codes défaut, Check Engine, historique et aide au diagnostic sur données fictives.</p>
        </div>
        <span className="rounded-xl border border-cyan-500/20 bg-slate-950/60 px-4 py-2 text-xs text-cyan-300">Données simulées</span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Véhicules suivis", "8", Truck],
          ["DTC actifs", "2", AlertTriangle],
          ["Check Engine", "2", Gauge],
          ["Sans défaut", "6", CheckCircle2],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label as string}</p><Icon className="h-5 w-5 text-cyan-400" /></div>
            <p className="mt-3 text-3xl font-bold">{value as string}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5"><h2 className="font-semibold">État diagnostic de la flotte</h2><p className="mt-1 text-xs text-slate-500">Présentation simulée du module disponible dans le dashboard client.</p></div>
        <div className="grid gap-4 p-4 lg:grid-cols-3">
          {vehicles.map((v) => (
            <article key={v.plate} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{v.name}</p><p className="text-xs text-slate-500">{v.plate}</p></div><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{v.status}</span></div>
              <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">DTC</span><span className="font-mono text-cyan-300">{v.dtc}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Moteur</span><span className="text-right">{v.engine}</span></div></div>
              <button type="button" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><Wrench className="h-4 w-4" />Voir le détail</button>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" /><h2 className="font-semibold">Sécurité DTC</h2></div><p className="mt-3 text-sm leading-6 text-slate-400">La démo illustre la lecture et l’historique. Les commandes d’effacement réel restent soumises aux capacités matérielles et aux interlocks de sécurité.</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-cyan-400" /><h2 className="font-semibold">Historique diagnostic</h2></div><p className="mt-3 text-sm leading-6 text-slate-400">Visualisation des défauts récurrents, de leur statut et de leur évolution pour faciliter la maintenance préventive.</p></div>
      </section>
    </div>
  );
}
