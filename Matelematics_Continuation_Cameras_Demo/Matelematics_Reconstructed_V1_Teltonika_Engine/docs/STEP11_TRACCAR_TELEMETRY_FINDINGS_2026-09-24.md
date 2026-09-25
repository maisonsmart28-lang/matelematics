# FMC150 — inventaire Traccar du 24 septembre 2026 (UTC)

Source : sortie locale `npm run traccar:bridge -- --history=2026-09-24 --history-telemetry`, communiquée par l'utilisateur le 25 septembre. Lecture seule du compte Traccar autorisé pour deux IMEI. Les identifiants restent masqués et ce document ne contient ni trajet ni coordonnées. Le test ne valide pas l'écriture dans Matelematics.

| Appareil masqué | Relevés | GPS valide | GPS invalide | Noms d'attributs |
| --- | ---: | ---: | ---: | ---: |
| …6168 | 0 | 0 | 0 | 0 |
| …6283 | 123 | 78 | 45 (`invalid_fix`) | 183 |

Le rapport console montre 80 noms sur 183, classés avec les champs lisibles avant les identifiants `io*`. Parmi ces **80 seulement**, 31 prennent plus d'une valeur et 30 champs numériques restent à zéro dans les 123 relevés. On ne peut pas étendre ces proportions aux 103 champs non affichés. « Présent » ou « variable » ne démontre ni une connexion CAN effective ni une unité correcte ; Traccar peut aussi exposer des attributs calculés.

| Champ | Constat sur les 123 relevés | Décision provisoire |
| --- | --- | --- |
| `ignition`, `motion` | booléens, chacun prend deux valeurs ; `ignition=false` 39 fois | Candidats au statut moteur/mouvement, vérifier par rapport aux événements connus. |
| `sat` | 45 zéros et 78 valeurs positives, en parallèle des 45 GPS invalides | Indicateur de qualité GPS potentiel ; la coïncidence des effectifs ne prouve pas la correspondance point par point. |
| `power`, `battery`, `BATTERYVOLTAGE`, `rssi` | numériques non nuls ; variation observée | Vérifier origine, unité et plages avant toute alerte de tension ou de connectivité. |
| `odometer`, `totalDistance`, `distance`, `hours`, `tripOdometer` | variation observée ; `tripOdometer` n'apparaît que sur 102 relevés | Vérifier unité, monotonie et remise à zéro ; ne pas alimenter la maintenance avec ces valeurs sans qualification. |
| `COOLANTTEMP`, `FUELCONSUMPTION`, `TOTALFUELUSED`, `FUELTANKCAPACITY` | variation ou présence non nulle ; `FUELTANKCAPACITY` prend 12 valeurs distinctes | Candidats à examiner, aucune affirmation de mesure CAN réelle ou de consommation carburant fiable. |
| `RPM`, `FUELLEVEL`, `OBDSPEED`, `OBDODOMETER` | zéro sur les 123 relevés | Ne pas afficher comme mesure moteur ou carburant disponible. |
| `ACCELERATORPEDAL`, `ADBLEVEL`, `DPFSOOT` | zéro sur les 123 relevés | Aucune preuve de mesure exploitable. |

## Règles pour la suite

1. Conserver les données télématiques valides sur le plan du temps et de la source même lorsque `position.valid=false`, sans créer de position GPS à partir de ces points. La validation détaillée de ce scénario reste à faire.
2. Faire correspondre les attributs Traccar aux IO Teltonika d'origine et à la configuration réelle du FMC150 avant de renseigner `telemetry.can_payload`, les alertes ou la maintenance. Les 103 autres noms doivent être inventoriés en lecture seule avant conclusion.
3. Tester les valeurs de quelques champs candidats avec des plages, unités et états connus sur un véhicule autorisé ; ne pas publier de données brutes ou de trajets dans les issues GitHub.
4. Vérifier le schéma Supabase réellement déployé, l'appartenance au tenant de test et la déduplication avant toute écriture. La lecture historique n'utilise aucune clé Supabase.
5. Répéter l'inventaire après le retour en ligne des deux véhicules : ce jour ne renseigne rien sur …6168.

Une migration directe des deux boîtiers vers Matelematics ne découle pas de cet inventaire : le récepteur Teltonika et le routage doivent être testés indépendamment avant de résilier un hébergement Traccar.
