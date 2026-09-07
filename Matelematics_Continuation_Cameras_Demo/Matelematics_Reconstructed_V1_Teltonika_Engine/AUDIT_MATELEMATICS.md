# AUDIT MATELEMATICS — V1

Date: 26 août 2026

## Objectif
Stabiliser le projet existant sans supprimer le travail visuel du dashboard, puis préparer une architecture SaaS télématique propriétaire. Les données fictives du dashboard sont considérées comme **fonctionnalité de démonstration volontaire**, pas comme un défaut.

## État constaté
- Next.js App Router, TypeScript, Tailwind, Supabase et composants dashboard déjà présents.
- 23 routes `page.tsx` et 1 route API dans l'archive principale.
- Plusieurs pages du dashboard sont volontairement alimentées par des données de démonstration locales.
- La page Véhicules utilise actuellement Supabase pour charger la table `vehicles`.
- L'authentification Supabase existe côté client.
- Aucun moteur d'ingestion Teltonika propriétaire n'est encore présent.

## Corrections V1 effectuées dans cette copie
1. `app/api/demo/route.ts` converti au format App Router (`POST` + `NextResponse`), suppression de l'utilisation incohérente de `req`/`NextApiResponse`, validation de base des champs et gestion de configuration SMTP manquante.
2. Suppression des imports `@mui/material` inutilisés des pages Contact, Profil et Solution afin de supprimer une dépendance inexistante.
3. Correction de `app/dashboard/test-page.tsx` (JSX invalide).
4. Correction de `FAQAccordion.tsx` : utilisation de `activeId` au lieu d'une propriété `q.active` inexistante.
5. Typage des props des cartes `CasUsage`, `IndustrySectors` et `WhyMatelematics` et remplacement de `hover` par `whileHover` pour Framer Motion.

## Données de démonstration
Les valeurs comme la flotte, les véhicules, alertes, historiques, carburant et certaines statistiques sont conservées. Elles doivent être regroupées ultérieurement derrière une source `demo` explicite afin de pouvoir basculer vers les données réelles sans modifier l'interface.

Architecture cible :

`Dashboard UI → Data Provider → Demo Provider | Matelematics API → Telematics Ingestion → Teltonika`

## Problèmes restant à traiter
### Critiques
- Les données réelles de la page Véhicules doivent être protégées par RLS et isolation `company_id`.
- L'authentification et l'autorisation serveur doivent être renforcées avant production.
- Le serveur d'ingestion Teltonika propriétaire n'existe pas encore.
- Les secrets SMTP/Supabase doivent rester hors du dépôt.

### Importants
- Plusieurs images référencées sous `/public/images` sont absentes de l'archive.
- `layout.tsx.bak` doit être retiré uniquement après validation de la version active.
- Plusieurs pages métier restent des écrans de démonstration locaux et devront recevoir des providers/API réels.
- Les exports/rafraîchissements simulés doivent rester disponibles en mode démo mais être distingués du mode réel.

## Architecture cible
1. Frontend Next.js.
2. Authentification + autorisation multi-tenant.
3. API Matelematics.
4. Service d'ingestion des protocoles Teltonika.
5. Décodage des positions, IO, CAN et événements.
6. Stockage PostgreSQL/Supabase avec RLS.
7. Temps réel via WebSocket/SSE selon le besoin.
8. Dashboard alimenté par le même contrat de données en mode démo ou réel.

Traccar n'est pas prévu dans cette architecture.

## Règle de reconstruction
Aucun remplacement massif du dashboard n'est autorisé. Toute modification doit préserver le rendu existant lorsqu'il n'y a pas de bug bloquant et être faite par petites étapes vérifiables.

## Validation
La validation complète `npm run build` n'a pas pu être exécutée dans cet environnement car les dépendances du projet ne sont pas installées dans l'archive et l'installation hors ligne n'a pas toutes les archives npm disponibles. La copie a toutefois été contrôlée statiquement après les corrections V1.
