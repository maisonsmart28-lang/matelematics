import Link from "next/link";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

export default function DemoReportExportPage() {
  return (
    <div className="min-h-screen space-y-6 bg-slate-950 px-4 pb-10 pt-6 text-white sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Mode démonstration</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Export des rapports</h1><p className="mt-2 text-sm text-slate-400">Prévisualisation de l’export sans téléchargement de données réelles.</p></div>
      <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><FileText className="h-7 w-7 text-cyan-400" /><h2 className="mt-4 font-semibold">Rapport PDF</h2><p className="mt-2 text-sm text-slate-400">Synthèse flotte, alertes, kilométrage et consommation.</p><button className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm"><Download className="h-4 w-4" />Simulation export PDF</button></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><FileSpreadsheet className="h-7 w-7 text-emerald-400" /><h2 className="mt-4 font-semibold">Export tableur</h2><p className="mt-2 text-sm text-slate-400">Données structurées pour analyse et reporting.</p><button className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm"><Download className="h-4 w-4" />Simulation export Excel</button></div></section>
      <Link href="/demo/rapports" className="inline-flex rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Retour aux rapports</Link>
    </div>
  );
}
