"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDemoModal } from "./DemoContext";

const schema = z.object({
  fullName: z.string().min(1, "Nom complet requis"),
  companyName: z.string().min(1, "Entreprise requise"),
  phone: z.string().min(1, "Téléphone requis"),
  email: z.string().email("Email invalide"),
  vehicleCount: z
    .string()
    .refine(
      (val) =>
        val !== "" &&
        !isNaN(Number(val)) &&
        Number(val) > 0,
      {
        message: "Nombre de véhicules requis",
      }
    ),
  sector: z.string().min(1, "Secteur d'activité requis"),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function DemoModal() {
  const { isOpen, close } = useDemoModal();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      companyName: "",
      phone: "",
      email: "",
      vehicleCount: "",
      sector: "",
      message: "",
    },
  });

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [submitSuccess, setSubmitSuccess] =
    useState(false);

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Erreur serveur"
        );
      }

      setSubmitSuccess(true);

      reset();

      setTimeout(() => {
        close();
        setSubmitSuccess(false);
      }, 1500);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue"
      );
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5">
          <div>
            <h2 className="text-xl font-bold text-white">
              Demander une démonstration
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Présentez-nous votre besoin et notre équipe
              vous contactera.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* FORMULAIRE */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 p-6"
        >

          {/* NOM */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Nom complet
            </label>

            <input
              {...register("fullName")}
              placeholder="Votre nom complet"
              className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 ${
                errors.fullName
                  ? "border-red-500"
                  : "border-slate-700"
              }`}
            />

            {errors.fullName && (
              <p className="mt-1 text-xs text-red-400">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* ENTREPRISE */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Entreprise
            </label>

            <input
              {...register("companyName")}
              placeholder="Nom de votre entreprise"
              className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 ${
                errors.companyName
                  ? "border-red-500"
                  : "border-slate-700"
              }`}
            />

            {errors.companyName && (
              <p className="mt-1 text-xs text-red-400">
                {errors.companyName.message}
              </p>
            )}
          </div>

          {/* TELEPHONE */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Téléphone
            </label>

            <input
              {...register("phone")}
              placeholder="+212 6 XX XX XX XX"
              className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 ${
                errors.phone
                  ? "border-red-500"
                  : "border-slate-700"
              }`}
            />

            {errors.phone && (
              <p className="mt-1 text-xs text-red-400">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Email
            </label>

            <input
              {...register("email")}
              type="email"
              placeholder="contact@entreprise.com"
              className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 ${
                errors.email
                  ? "border-red-500"
                  : "border-slate-700"
              }`}
            />

            {errors.email && (
              <p className="mt-1 text-xs text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* VEHICULES */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Nombre de véhicules
            </label>

            <input
              {...register("vehicleCount")}
              type="number"
              min="1"
              placeholder="50"
              className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 ${
                errors.vehicleCount
                  ? "border-red-500"
                  : "border-slate-700"
              }`}
            />

            {errors.vehicleCount && (
              <p className="mt-1 text-xs text-red-400">
                {errors.vehicleCount.message}
              </p>
            )}
          </div>

          {/* SECTEUR */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Secteur d'activité
            </label>

            <input
              {...register("sector")}
              placeholder="Transport, logistique, industrie..."
              className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 ${
                errors.sector
                  ? "border-red-500"
                  : "border-slate-700"
              }`}
            />

            {errors.sector && (
              <p className="mt-1 text-xs text-red-400">
                {errors.sector.message}
              </p>
            )}
          </div>

          {/* MESSAGE */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Message
              <span className="ml-1 text-slate-500">
                (optionnel)
              </span>
            </label>

            <textarea
              {...register("message")}
              rows={4}
              placeholder="Décrivez brièvement votre besoin..."
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* ERREUR */}
          {submitError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {submitError}
            </div>
          )}

          {/* SUCCES */}
          {submitSuccess && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm text-emerald-400">
              Votre demande a été envoyée avec succès.
            </div>
          )}

          {/* BOUTONS */}
          <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">

            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-slate-700 bg-slate-950 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Envoi..."
                : "Envoyer la demande"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}