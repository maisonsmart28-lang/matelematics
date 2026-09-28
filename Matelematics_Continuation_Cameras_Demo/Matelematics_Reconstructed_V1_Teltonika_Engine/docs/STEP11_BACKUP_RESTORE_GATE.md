# Étape 11 — sauvegarde et restauration : état du 28 septembre 2026

## Inventaire vérifié

Le projet Supabase Matelematics `nhkwxcjncluvetrgxhwv` est actif, en région `eu-west-3`, PostgreSQL 17.6.1.165. Son organisation est sur le plan **Free**. La base occupe environ **140 Mo**, contient **5 comptes Auth**, un bucket Storage privé `compliance-documents` et **un objet Storage** (comptages, sans lecture de contenu). La taille enregistrée dans les métadonnées est nulle ; ne pas l'interpréter comme une taille réelle ni télécharger ce document dans l'espace de travail.

Selon la [documentation officielle Supabase sur les sauvegardes](https://supabase.com/docs/guides/platform/backups), les sauvegardes quotidiennes gérées sont prévues pour Pro, Team et Enterprise ; Supabase recommande aux projets Free d'exporter régulièrement leurs données avec `supabase db dump` et de conserver une copie hors site. La sauvegarde de la base couvre les métadonnées Storage, **pas les fichiers stockés**. Aucun RPO/RTO, dump réel ni restauration n'a été vérifié dans cet audit.

## Décision pour le démarrage minimal

1. **Avant toute nouvelle donnée client**, réaliser un export logique chiffré et daté du schéma, des données et des rôles, puis copier séparément les objets Storage. Conserver les exports hors dépôt Git, hors répertoire OneDrive synchronisé, avec accès limité. Ne pas écrire le mot de passe de la base dans la commande ou dans le fichier de documentation.
2. Vérifier l'intégrité des fichiers (SHA-256), le nombre d'objets Storage, la taille et la date. Tester la restauration dans une **instance locale isolée** ou un projet de test dédié, jamais sur le projet actif. La restauration d'un projet actif coupe l'accès et peut effacer des données plus récentes.
3. Mesurer le temps de restauration et les contrôles métier après reprise : comptes Auth, politiques RLS, entreprises, véhicules, positions, télémétrie, fichiers Storage, et connexion d'un utilisateur de test. Documenter le point de restauration obtenu.
4. Mettre en place une fréquence de sauvegarde selon la perte de données acceptable. Une simple exportation ponctuelle ne répond pas à l'objectif de continuité. Avant de vendre un engagement de disponibilité ou de conservation, choisir une politique explicite de rétention et d'export automatique supervisé.

La [procédure CLI officielle](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) sépare les exports `roles.sql`, `schema.sql`, `data.sql` et décrit la restauration dans un projet distinct. La [restauration locale](https://supabase.com/docs/guides/local-development/restoring-downloaded-backup) dépend du type d'archive et de la version Postgres. Ces deux parcours ne doivent pas être confondus.

## État de la porte de validation

- Inventaire du projet : **PASS**.
- Export PostgreSQL et objets Storage : **NON TESTÉ**.
- Restauration isolée et contrôle fonctionnel : **NON TESTÉ**.
- Gestion des secrets, chiffrement, périodicité et copie hors site : **À METTRE EN PLACE**.
- Sauvegarde automatique quotidienne gérée sur ce projet Free : **ne pas supposer disponible**.

Aucune commande de restauration sur la base active ne doit être utilisée pour cet essai. Ne pas lancer `supabase_restore_project` sur le projet actif.
