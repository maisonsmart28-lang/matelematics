"use client";

import Link from "next/link";
import { Camera, VideoOff } from "lucide-react";

export default function CameraOverview() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Camera className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Caméras embarquées</h2>
            <p className="text-xs text-zinc-500">
              Données vidéo réelles uniquement
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/cameras"
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-violet-500/60 hover:text-white"
        >
          Ouvrir le centre vidéo (simulation)
        </Link>
      </div>

      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
          <VideoOff className="h-6 w-6 text-zinc-500" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-white">
          Aucun flux caméra réel affiché
        </h3>

        <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
          Le dashboard réel n&apos;affiche plus de flux vidéo, de statut caméra ou
          d&apos;événement vidéo simulé. Cette zone sera alimentée uniquement par
          les caméras réellement configurées et leurs données disponibles.
        </p>

        <p className="mt-3 text-[11px] text-zinc-600">
          Le centre vidéo actuel reste explicitement en mode simulation pour les tests.
        </p>
      </div>
    </section>
  );
}
