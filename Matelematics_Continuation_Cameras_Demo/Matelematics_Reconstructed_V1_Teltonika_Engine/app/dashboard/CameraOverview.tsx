"use client";

import Link from "next/link";
import { Camera, CircleDot, Video } from "lucide-react";
import { demoCameras, demoCameraEvents } from "../../lib/demo-cameras";

export default function CameraOverview() {
  const cameras = demoCameras.slice(0, 2);
  const latestEvent = demoCameraEvents[0];

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Camera className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Caméras embarquées</h2>
            <p className="text-xs text-zinc-500">Flux vidéo simulés et événements associés</p>
          </div>
        </div>

        <Link
          href="/dashboard/cameras"
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-violet-500/60 hover:text-white"
        >
          Ouvrir le centre vidéo
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cameras.map((camera) => (
          <article key={camera.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
            <div className="relative aspect-video bg-black">
              <video
                className="h-full w-full object-cover"
                src={camera.videoSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                <CircleDot className="h-3.5 w-3.5 text-emerald-400" />
                SIMULATION LIVE
              </div>
              <div className="absolute bottom-3 right-3 rounded bg-black/65 px-2 py-1 text-[10px] text-zinc-200">
                {camera.id}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium text-white">{camera.vehicleName}</p>
                <p className="text-xs text-zinc-500">{camera.label} · {camera.location}</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
                En ligne
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <Video className="mt-0.5 h-4 w-4 text-amber-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Dernier événement vidéo : {latestEvent.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {latestEvent.vehicleName} · {latestEvent.time} · mode démonstration
          </p>
        </div>
      </div>
    </section>
  );
}
