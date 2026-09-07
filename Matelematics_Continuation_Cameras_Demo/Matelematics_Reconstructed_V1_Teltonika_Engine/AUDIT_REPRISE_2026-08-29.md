# Matelematics — Audit de reprise — 29 août 2026

## Vérifications réalisées
- Arborescence, package.json, routes App Router, dashboard, API, authentification et moteur Teltonika examinés.
- `tsc --noEmit` : OK après corrections incrémentales.
- Test Teltonika : serveur + simulateur Codec 8 + IMEI enregistré + décodage/normalisation GPS : OK.
- `npm run build` non exécutable dans l'environnement d'audit car le ZIP contient `node_modules` Windows ; Next tente de récupérer SWC Linux mais l'environnement d'audit n'a pas d'accès réseau.
- ESLint : 47 erreurs / 14 warnings restant à traiter, majoritairement `react/no-unescaped-entities`; deux alertes React concernent `MapComponent.tsx` et `vehicles/page.tsx`.

## Corrections appliquées
1. `app/components/FAQAccordion.tsx`
   - `activeId` typé `number | null`.
2. `server/teltonika/types.ts`
   - `NormalizedTelemetry.io` accepte `number | string`, nécessaire aux éléments IO variables décodés sans inventer de mapping métier.
3. `components/DashboardNavbar.tsx`
   - route véhicules corrigée de `/dashboard/vehicle` vers `/dashboard/vehicles`.
4. `types/nodemailer.d.ts`
   - déclaration TypeScript minimale locale pour compiler sans ajouter une dépendance pendant l'audit.

## État fonctionnel
- Dashboard et nombreuses pages métier présents.
- Authentification Supabase côté client présente dans le layout dashboard.
- Page véhicules connectée à Supabase.
- Serveur TCP Teltonika, registre IMEI, Codec 8 / 8 Extended, CRC, normalisation et simulateur présents.
- API `/api/demo` présente.

## Manques / limites
- Dashboard principal encore largement alimenté par données statiques/simulées.
- Le moteur Teltonika ne persiste pas encore la télémétrie : il l'émet au callback et la journalise.
- `lib/auth.ts` est vide ; protection serveur/API et isolation multi-tenant restent à construire.
- Export PDF de rapports non intégré ; l'export actuel est essentiellement CSV / simulation UI.
- Plusieurs modules alertes, maintenance, carburant, géozones et historique utilisent encore des données statiques.
- Lint non propre.

## Chantier recommandé
Mettre en place le pont minimal `ingestion Teltonika -> stockage Supabase/PostgreSQL -> API lecture -> dashboard`, en conservant le dashboard actuel et sans ajouter de mapping CAN non vérifié.
