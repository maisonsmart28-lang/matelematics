# Ingestion Teltonika — contrôles locaux du 2 octobre 2026

Le gestionnaire TCP traite une seule séquence de décodage/persistance à la fois par connexion. Pendant l'attente d'une persistance, la socket est mise en pause ; un événement data déjà en attente est ajouté au tampon borné et ne relance pas un second traitement. La limite 2 Mio est contrôlée avant concaténation. Chaque ACK AVL attend le succès de onMessage ; après fermeture de la socket, aucun ACK tardif n'est émis.

Le délai d'inactivité est de 300 000 ms par défaut. TELTONIKA_IDLE_TIMEOUT_MS accepte un entier de 1 000 à 86 400 000 ms. Une valeur invalide bloque le démarrage. Adapter ce délai à la fréquence réelle du traceur et aux heartbeats ; une connexion inactive est fermée et le traceur devra se reconnecter. Ce délai ne limite pas une authentification maintenue active par un flux régulier et ne borne pas une panne de persistance indépendamment de la socket.

## Vérification

server/teltonika/protocol.selftest.ts utilise le vrai parser et des trames synthétiques CRC valides avec sockets simulées. Exécution isolée sous Node 24 : PASS pour login fragmenté, deux événements data avec persistences bloquées, concurrence maximale 1 et ACK après chaque persistance, erreur de persistance sans ACK, fermeture pendant persistance sans ACK tardif, tampon excessif et callback d'inactivité configuré.

Le test ne mesure pas un timeout en temps réel et ne teste ni DB, ni connexion réseau physique, ni reconnexion matérielle, ni débit de production. Commande sur le projet : npx tsx server/teltonika/protocol.selftest.ts. Build complet et tests existants après récupération restent à exécuter sur le poste opérateur.

## Journaux et limites

La correction précédente masque les IMEI (quatre derniers chiffres), supprime coordonnées et réponses brutes des commandes des journaux Teltonika, et masque les erreurs fournisseur GT06. L'opérateur a confirmé audit secrets, self-test GT06 et build TypeScript PASS après cette correction.

Restent ouverts : authentification cryptographique des traceurs, deadline d'authentification, plafond global/par IP des connexions, débit et backpressure globale, sérialisation entre deux connexions du même IMEI, contrôle de l'API commande locale, atomicité/idempotence DB du chemin Teltonika, origine des données sur poll Traccar, erreurs/logs des autres modules. ACK après onMessage n'est pas une preuve d'atomicité de toutes les écritures DB. Aucune commande n'a été envoyée à un boîtier ; aucune mutation distante ni déploiement n'a été effectué.
