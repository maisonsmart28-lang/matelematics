"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Ticket,
  X,
} from "lucide-react";

type TicketItem = {
  id: string;
  subject: string;
  category: string;
  priority: "Faible" | "Normale" | "Élevée";
  status: "Ouvert" | "En cours" | "Résolu";
  date: string;
};

const initialTickets: TicketItem[] = [
  {
    id: "MAT-1024",
    subject: "Problème de connexion d'un véhicule",
    category: "Véhicule",
    priority: "Élevée",
    status: "En cours",
    date: "Aujourd'hui, 10:42",
  },
  {
    id: "MAT-1023",
    subject: "Données CAN non affichées",
    category: "Télématique",
    priority: "Normale",
    status: "Ouvert",
    date: "Hier, 16:20",
  },
  {
    id: "MAT-1022",
    subject: "Question concernant les rapports",
    category: "Rapports",
    priority: "Faible",
    status: "Résolu",
    date: "22/08/2026",
  },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState(initialTickets);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Véhicule");
  const [priority, setPriority] =
    useState<TicketItem["priority"]>("Normale");
  const [message, setMessage] = useState("");

  const filteredTickets = tickets.filter((ticket) => {
    const value = search.toLowerCase();

    return (
      ticket.id.toLowerCase().includes(value) ||
      ticket.subject.toLowerCase().includes(value) ||
      ticket.category.toLowerCase().includes(value)
    );
  });

  function createTicket() {
    if (!subject.trim() || !message.trim()) return;

    const newTicket: TicketItem = {
      id: `MAT-${1025 + tickets.length}`,
      subject,
      category,
      priority,
      status: "Ouvert",
      date: "À l'instant",
    };

    setTickets((current) => [newTicket, ...current]);

    setSubject("");
    setMessage("");
    setCategory("Véhicule");
    setPriority("Normale");
    setShowForm(false);
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <MessageSquare className="h-6 w-6 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Support
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Besoin d'aide ? Consultez vos demandes ou contactez notre équipe.
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </button>

      </div>

      {/* CONTACT CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <SupportCard
          icon={MessageSquare}
          title="Assistance technique"
          description="Notre équipe vous accompagne pour les problèmes techniques."
          action="Ouvrir une demande"
          onClick={() => setShowForm(true)}
        />

        <SupportCard
          icon={Mail}
          title="E-mail"
          description="Contactez notre équipe directement par e-mail."
          action="contact@matelematics.com"
        />

        <SupportCard
          icon={Phone}
          title="Support téléphonique"
          description="Une assistance téléphonique pour les demandes urgentes."
          action="+212 5 22 00 00 00"
        />

      </div>

      {/* QUICK HELP */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">

        <div className="flex gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <HelpCircle className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h2 className="font-semibold text-white">
              Centre d'aide
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Retrouvez les réponses aux questions fréquentes concernant les
              véhicules, les alertes, les rapports et la plateforme.
            </p>
          </div>

        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

          <HelpItem title="Gestion des véhicules" />
          <HelpItem title="Configuration des alertes" />
          <HelpItem title="Rapports et historique" />

        </div>

      </div>

      {/* TICKETS */}
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

        <div className="flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h2 className="font-semibold text-white">
              Mes demandes
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Suivez l'état de vos demandes d'assistance.
            </p>
          </div>

          <div className="relative w-full lg:w-72">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une demande..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="border-b border-slate-800 bg-slate-950/50">

              <tr>
                <th className="px-5 py-4 font-medium text-slate-400">
                  Demande
                </th>

                <th className="px-5 py-4 font-medium text-slate-400">
                  Catégorie
                </th>

                <th className="px-5 py-4 font-medium text-slate-400">
                  Priorité
                </th>

                <th className="px-5 py-4 font-medium text-slate-400">
                  Statut
                </th>

                <th className="px-5 py-4 font-medium text-slate-400">
                  Date
                </th>

                <th className="px-5 py-4 font-medium text-slate-400">
                  Action
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-slate-800">

              {filteredTickets.map((ticket) => (

                <tr
                  key={ticket.id}
                  className="transition hover:bg-slate-800/40"
                >

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                        <Ticket className="h-4 w-4 text-slate-400" />
                      </div>

                      <div>
                        <p className="font-medium text-white">
                          {ticket.subject}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {ticket.id}
                        </p>
                      </div>

                    </div>

                  </td>

                  <td className="px-5 py-4 text-slate-300">
                    {ticket.category}
                  </td>

                  <td className="px-5 py-4">
                    <PriorityBadge priority={ticket.priority} />
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={ticket.status} />
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {ticket.date}
                  </td>

                  <td className="px-5 py-4">

                    <button
                      type="button"
                      onClick={() =>
                        window.alert(
                          ticket.id +
                          "\n\n" +
                          ticket.subject
                        )
                      }
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      Voir
                      <ChevronRight className="h-4 w-4" />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {filteredTickets.length === 0 && (
            <div className="p-10 text-center">

              <Search className="mx-auto h-8 w-8 text-slate-700" />

              <p className="mt-3 text-sm text-slate-400">
                Aucune demande trouvée.
              </p>

            </div>
          )}

        </div>

      </section>

      {/* NEW TICKET MODAL */}
      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Nouvelle demande
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Décrivez votre problème afin que notre équipe puisse vous aider.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-5 p-5">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Sujet
                </label>

                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Ex. Véhicule hors ligne..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Catégorie
                  </label>

                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option>Véhicule</option>
                    <option>Télématique</option>
                    <option>Rapports</option>
                    <option>Compte</option>
                    <option>Facturation</option>
                    <option>Autre</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Priorité
                  </label>

                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value as TicketItem["priority"]
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option>Faible</option>
                    <option>Normale</option>
                    <option>Élevée</option>
                  </select>
                </div>

              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description
                </label>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  placeholder="Décrivez votre problème ou votre demande..."
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 p-5">

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={createTicket}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <Send className="h-4 w-4" />
                Envoyer la demande
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

/* COMPONENTS */

function SupportCard({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: typeof MessageSquare;
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
}) {
  return (
    <div className="group rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/30 hover:bg-slate-900/80">

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
        <Icon className="h-5 w-5 text-blue-400" />
      </div>

      <h3 className="mt-4 font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
      >
        {action}
        <ChevronRight className="h-4 w-4" />
      </button>

    </div>
  );
}

function HelpItem({ title }: { title: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.alert(
          title + "\n\nContenu d'aide en cours d'integration."
        )
      }
      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4 text-left transition hover:border-slate-700 hover:bg-slate-900"
    >
      <span className="text-sm text-slate-300">
        {title}
      </span>

      <ChevronRight className="h-4 w-4 text-slate-600" />
    </button>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: TicketItem["priority"];
}) {
  const classes =
    priority === "Élevée"
      ? "bg-red-500/10 text-red-400"
      : priority === "Normale"
        ? "bg-blue-500/10 text-blue-400"
        : "bg-slate-800 text-slate-400";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      {priority}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: TicketItem["status"];
}) {
  if (status === "Résolu") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Résolu
      </span>
    );
  }

  if (status === "En cours") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
        <Clock3 className="h-3.5 w-3.5" />
        En cours
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
      <AlertCircle className="h-3.5 w-3.5" />
      Ouvert
    </span>
  );
}