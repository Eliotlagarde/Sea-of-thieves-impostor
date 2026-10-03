# Sea Imposteur — V5 jouable

Amélioration du projet fourni : Node.js, Express, Socket.IO, mêmes fichiers principaux et images conservées. Aucun événement aléatoire ni notification d’événement flottante. Les messages d’erreur restent affichés brièvement.

## Lancer

Node.js 22 ou supérieur :

```sh
npm install
npm start
```

Ouvrir http://localhost:3000. Sur plusieurs appareils du même réseau, ouvrir **la même adresse IP du serveur**, par exemple http://192.168.1.20:3000. `localhost` désigne chaque appareil séparément.

## Render et codes privés

Déployer ce dossier via le Blueprint `render.yaml` ou créer un service Web Node avec `npm install` puis `npm start`. Tous les joueurs ouvrent la même URL HTTPS Render et saisissent le code à six caractères. Socket.IO utilise ce même serveur, sans adresse locale codée en dur. `/health` permet de vérifier le serveur.

**Utiliser une seule instance Render.** Les salons sont conservés en mémoire : un redémarrage ou un redéploiement les efface. Plusieurs instances demanderaient un stockage partagé et un adaptateur Socket.IO ; ce projet conserve volontairement le serveur unique de la base. Une mise en veille Render peut interrompre une partie : choisir une instance qui reste active pour une session continue.

## Déroulement

- Cabine privée de 3 à 20 joueurs, noms, avatars, capitaine et joueurs prêts. Le capitaine modifie les réglages dans le salon ; les joueurs doivent confirmer à nouveau leur disponibilité après modification.
- Les Imposteurs doivent rester moins nombreux que les Pirates ; le serveur refuse un réglage incompatible au lancement. L’Espion, si activé, appartient aux Pirates.
- Une seule quête est tirée au lancement parmi les quatre quêtes existantes. Tous suivent ses cinq étapes. Aucun événement aléatoire pendant la partie.
- Une étape demande `max(3, nombre de joueurs × 2)` contributions communes. Chaque joueur peut contribuer toutes les 15 secondes, y compris les Imposteurs pour dissimuler leur rôle.
- Chaque Imposteur reçoit une mission concrète associée à une étape. Il peut l’exécuter uniquement pendant cette étape. Chaque sabotage retire deux contributions. Trois exécutions de sa mission font échouer la quête. Le délai entre ses actions est de 30 secondes après un sabotage ; il faut donc patienter avant de contribuer ou saboter de nouveau. Le journal n’indique jamais son identité.
- L’Espion révèle une mission d’Imposteur une seule fois. Cette information reste privée et disponible après reconnexion, sans identité.
- Réunions automatiques et une réunion d’urgence par joueur. Discussion orale ou sur le canal de communication habituel des joueurs ; aucun chat intégré.
- Un seul vote définitif par joueur vivant. Seuls les totaux sont transmis. Une égalité, aucun vote ou une majorité pour « Passer » n’éliminent personne. Les rôles des éliminés restent secrets ; ils observent jusqu’à la fin.
- La quête et les réunions utilisent les échéances du serveur. Le temps de quête continue pendant les réunions et les déconnexions.
- Pirates gagnants si la quête est achevée ou tous les Imposteurs éliminés. Imposteurs gagnants si une mission détruit l’objectif ou si le temps expire. Aucune victoire supplémentaire par parité.
- Bilan final : rôles, missions, éliminations, contributions, sabotages et votes déposés.

## Confidentialité et reconnexion

Les rôles et missions sont envoyés uniquement à leur propriétaire jusqu’au bilan final. Les tableaux de votes individuels et les jetons de session ne sont jamais inclus dans l’état public. Le rôle se consulte dans « Mon rôle », ou via le bouton dédié pendant une réunion. L’Espion conserve un onglet privé pour son pouvoir.

Le navigateur conserve un jeton de reprise dans `sessionStorage`. Un rechargement du même onglet ou une reconnexion réseau retrouve le joueur. Fermer l’onglet perd cette session ; le code seul ne permet pas de reprendre une identité en cours de partie. Une session ne peut pas être reprise par deux connexions simultanées. Le capitaine passe à un autre joueur connecté lorsqu’il quitte ou perd la connexion. Les salons sans connexion sont supprimés après 30 minutes.

## Interface et assets

Thème inspiré de la référence transmise : pont de navire au coucher du soleil, lanternes, bois sombre, bronze, parchemins texturés, portraits pirates et navigation basse sur mobile. Les images originales sont conservées. Deux nouveaux assets générés avec le outil imagegen intégré : `public/images/pirate-cabin-v2.png` (décor) et `public/images/pirate-portraits-v2.png` (atlas de huit portraits). Les polices Google sont facultatives ; des polices serif de secours sont définies. Le serveur et les règles de la partie sont conservés.

## Validation

Voir `VALIDATION.md` pour les vérifications effectivement réalisées. Le déploiement Render et les essais sur appareils physiques restent à effectuer sur l’URL déployée.

## Prompts des nouveaux assets

Outil : imagegen intégré, sans API/CLI externe. Référence fournie utilisée pour la direction artistique du décor.

### Décor — pirate-cabin-v2.png

Use case: stylized-concept. Create a single wide 16:9 cinematic background image for a playable pirate game website, inspired by the top left and top middle scenes of the provided reference collage. Reference is for art direction only. Camera from inside a dark wooden pirate ship cabin and deck looking out toward sunset sea, distant craggy island and anchored sailing ship. Old ship timber beams, rigging ropes framing the edges, black pirate sail at upper right, warm amber lantern prominently glowing at right edge, compass and curled nautical maps on foreground table at bottom right, turquoise waves, golden hazy sunset. Dark left third and central region provide calm space for actual HTML UI overlays. Highly detailed hand painted realistic fantasy game art, antique warm bronze, deep charcoal brown wood, luminous amber, weathered nautical textures, cinematic depth. No UI, no panels, absolutely no text, letters, logos, buttons, captions, montage, border or collage. This is the scene behind the interface, not a screenshot. Landscape 1920x1080 or wider.

### Portraits — pirate-portraits-v2.png

Use case stylized-concept. Asset type: portrait atlas for pirate multiplayer game avatars. A precise regular 4 columns by 2 rows grid of eight distinct pirate portrait faces, equal sized square cells, absolutely no borders and no gaps. Each cell is a centered shoulders-up oil painted cinematic realistic fantasy pirate character on plain almost black brown background. Top row left to right: bearded tricorne captain, dark haired female navigator with red bandana, older spectacled male cartographer, black male quartermaster with blue bandana. Bottom row left to right: red haired female lookout, rugged male gunner with eye patch, sturdy female ship carpenter, older male ship medic with white beard. Warm amber lantern lighting, weathered clothes, charcoal navy and deep burgundy, beautiful detailed believable faces, same framing and lighting each cell. All faces fully contained within each square cell, with room around head for round crop. NO text, NO letters, NO titles, NO UI, NO icons, NO watermark. Landscape 2:1.
