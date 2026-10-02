# Validation TCP du stockage atomique
2026-10-02

Preuve utilisateur reçue : NATIVE ATOMIC SQL PASS, création/résolution des vraies alertes, doublon, rollback après alertes, comptes exacts, état inchangé lors de la panne. Nettoyage fixture/index vérifié.
Nouvel essai : scripts/security/teltonika-native-atomic-tcp.ts.
Syntaxe vérifiée ; trame Codec 8 décodée avec le décodeur du projet et CRC PASS.
Exécution TCP+PostgreSQL non encore vérifiée.

Serveur net TCP temporaire écoute exclusivement 127.0.0.1 sur port éphémère.
attachTeltonikaProtocol réel : login, décodage, normalisation, ACK.
Callback utilise persistAtomicPacket et syncCanAlertsInTransaction réels avec PostgreSQL fixe 127.0.0.1:55322.
Le test ne lance pas server.ts, ne modifie pas .env et n'utilise pas de boîtier réel.
Ne pas le confondre avec une validation du point d'entrée persistTelemetry (lookup HTTP et sélection du mode) ou de l'infrastructure hébergée.

Scénarios :
- bloque le COMMIT du premier paquet ; exige aucun ACK et aucune télémétrie visible depuis une autre connexion ;
- autorise COMMIT, puis détruit la socket avant que le parseur envoie l'ACK AVL ;
- reconnecte et retransmet la même trame : ACK 1 et une seule télémétrie ;
- trame suivante résout l'alerte overspeed, ACK 1 ;
- injecte une panne après les mutations réelles d'alertes : fermeture sans ACK, 2 positions / 2 télémétries / 1 alerte résolue, état du boîtier inchangé ;
- supprime toutes les fixtures et l'index temporaire.

Même garde et nettoyage que le test SQL précédent ; index temporaire absent requis.
Fin de test libère le blocage COMMIT, ferme les sockets et le listener avant nettoyage.
Les séquences peuvent avancer. Ne pas interrompre le processus.
Limites : Codec 8 à un enregistrement, une socket à la fois, pas de crash hôte, pas de charge, pas de droits production. Aucun déploiement.
