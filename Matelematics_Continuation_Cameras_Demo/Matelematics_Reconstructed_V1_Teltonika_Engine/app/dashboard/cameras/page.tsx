"use client";

import { Camera, CircleDot, Film, ShieldAlert, Video } from "lucide-react";
import { demoCameras, demoCameraEvents } from "../../../lib/demo-cameras";

const severityClasses = {
  info: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/20 bg-red-500/10 text-red-300",
};

export default function CamerasPage() {
  const online = demoCameras.filter((camera) => camera.status === "En ligne").length;

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">Vidéo télématique</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Centre caméras</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Démonstration des flux embarqués et des clips associés aux événements. Aucun matériel caméra réel n&apos;est connecté à ce stade.
          </p>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          Mode simulation
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Camera} label="Caméras" value={String(demoCameras.length)} />
        <StatCard icon={CircleDot} label="En ligne" value={`${online}/${demoCameras.length}`} />
        <StatCard icon={Film} label="Clips récents" value={String(demoCameraEvents.length)} />
        <StatCard icon={ShieldAlert} label="Événements critiques" value={String(demoCameraEvents.filter((event) => event.severity === "danger").length)} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Flux en direct</h2>
            <p className="text-xs text-slate-500">Boucles vidéo locales utilisées uniquement pour la démonstration.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {demoCameras.map((camera) => (
            <article key={camera.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="relative aspect-video bg-black">
                <video
                  src={camera.videoSrc}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  controls
                  playsInline
                  preload="metadata"
                />
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  SIMULATION · {camera.position.toUpperCase()}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-white">{camera.vehicleName} · {camera.registration}</p>
                  <p className="mt-1 text-xs text-slate-400">{camera.companyName} · {camera.location} · {camera.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-emerald-400">{camera.status}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{camera.lastSeen}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center gap-3">
          <Video className="h-5 w-5 text-violet-400" />
          <div>
            <h2 className="font-semibold text-white">Événements vidéo récents</h2>
            <p className="text-xs text-slate-500">Préparation de la future corrélation télématique + caméra.</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {demoCameraEvents.map((event) => (
            <article key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${severityClasses[event.severity]}`}>
                  {event.severity.toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-500">{event.time}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{event.title}</h3>
              <p className="mt-1 text-xs text-slate-400">{event.vehicleName}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">{event.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-violet-400" />
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
