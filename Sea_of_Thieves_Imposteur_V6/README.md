# Sea of Thieves — L’Imposteur V6

La V6 prolonge la V5 : Node.js + Express + Socket.IO, structure principale conservée, compatible Render, 3–20 joueurs. L’application accompagne une vraie partie de Sea of Thieves ; elle ne lit pas les données du jeu.

## Lancer et déployer

Node.js 22 ou supérieur :

```sh
npm install
npm start
```

Ouvrir http://localhost:3000. Tous les appareils utilisent la même adresse : sur réseau local, l’IP de l’ordinateur serveur ; sur Render, la même URL HTTPS. `localhost` sur chaque appareil désigne des serveurs différents.

Le Blueprint `render.yaml` configure un service Node avec une seule instance et la route de santé `/health`. Les salons et notes sont en mémoire : redémarrer ou redéployer le serveur les efface. Utiliser une instance qui reste active pour les parties continues. Plusieurs instances nécessiteraient un stockage et un adaptateur partagés.

## Nouveautés V6

- Table des quêtes inspirée des captures du jeu : compagnies, catégories latérales, cartes illustrées, recherche dans la compagnie sélectionnée et fiche de sélection.
- Catalogue initial de 56 fiches dans huit rubriques : Collectionneurs d’or, Ordre des âmes, Alliance des marchands, Fortune d’Athéna, Appel du chasseur, Ligue des contrebandiers, Fables / Tall Tales et quête personnalisée.
- Les quatre cartes au trésor visibles dans les captures reprennent leurs noms français. Les autres fiches sont des familles descriptives ; les fables utilisent les titres anglais documentés. Le capitaine peut saisir le nom français exact. Ce catalogue ne prétend pas être une copie exhaustive de chaque voyage et traduction actuels.
- Plus de quête inventée tirée au hasard. Le capitaine choisit le voyage réellement lancé dans Sea of Thieves avant le lancement. Changer la quête remet les joueurs en attente de confirmation.
- Étapes générales et objectifs concrets d’Imposteurs associés à la famille choisie. Le capitaine peut adapter les étapes et missions avant le lancement. Les fables et quêtes personnalisées exigent une mission adaptée explicitement saisie, pour éviter un objectif impossible quand le navire n’est pas accessible.
- Journal : notes privées jusqu’à 5 000 caractères, sauvegardées sur le serveur et retrouvées après rechargement du même onglet. Disponible pendant les réunions via « Mes notes privées ». L’historique public reste séparé.
- Sept personnages, sans avatar « Capitaine », portraits sélectionnables et aperçus agrandis à la création et à la connexion. Le statut de capitaine est séparé et indiqué par une couronne. Portraits conservés dans le salon, les votes et le bilan.
- Easter egg : cinq clics sur le crâne du titre de l’accueil, avec moins de quatre secondes entre deux clics, ouvrent l’image originale `hidden-treasure.jpeg`. Fermeture par bouton ou Échap.
- Décor, parchemins, bronze, lanternes et navigation mobile conservés. Les deux phrases restent exactement au même endroit et dans le même style : « UNE QUÊTE. UN ÉQUIPAGE. UNE TRAHISON. » au-dessus du titre, et « Rejoignez l’équipage… ou semez le doute. » en bas de l’accueil.

## Règles et validation dans le jeu

Les joueurs réalisent les actions dans Sea of Thieves. Le capitaine confirme chaque étape dans l’application ; il conserve cette fonction d’arbitre même s’il est éliminé. Un Imposteur déclare sa mission accomplie dans son onglet privé. Le capitaine reçoit la description du fait à vérifier, sans l’identité de l’auteur, et accepte ou refuse l’échec. La partie reste active pendant cet arbitrage ; les étapes sont bloquées, mais les timers continuent. Une déclaration ne doit pas être utilisée comme un bouton de sabotage fictif : il faut avoir réellement accompli la mission. Ce fonctionnement repose sur la bonne foi et l’arbitrage de l’équipage.

Le capitaine peut aussi confirmer un échec réel de la quête directement. Les confirmations qui terminent la partie affichent une boîte de dialogue préalable. Une déclaration refusée ne peut pas être immédiatement répétée : délai de 60 secondes après l’envoi.

Exemples : faire perdre un trésor demandé en l’abandonnant en mer sans récupération, faire perdre une marchandise demandée, ou couler le navire avant la livraison. Les destinations et objets précis sont ceux de votre partie. Ces objectifs constituent les règles de Sea Imposteur : perdre un objet n’annule pas nécessairement le voyage dans Sea of Thieves.

## Fonctions conservées

Codes privés, joueurs prêts, réglages du capitaine, rôles secrets, Espion optionnel unique et pouvoir utilisable une fois, réunions automatiques, une réunion d’urgence par joueur, votes uniques et anonymes, égalités sans élimination, spectateurs, timers serveur, révélation des rôles et missions au bilan. Aucun mini-jeu et aucun événement aléatoire.

Pirates gagnants : dernière étape confirmée ou tous les Imposteurs éliminés. Imposteurs gagnants : échec confirmé ou temps écoulé, y compris pendant une réunion. Pas de victoire par parité. Discussion par voix ou via votre canal habituel ; pas de chat intégré.

Reconnexion : jeton privé dans `sessionStorage`, propre à l’onglet. Fermer l’onglet perd la reprise. Le code seul ne reprend pas une identité après lancement. Une déconnexion brève garde le capitaine pendant 15 secondes ; au-delà, ou après un départ explicite, il passe à un joueur connecté. Un salon sans connexion expire après 30 minutes.

## Catalogue et sources

Le fichier supplémentaire `public/voyages.js` centralise les fiches et profils utilisés par le client et le serveur. Il est modifiable sans réorganiser le projet.

Sources consultées le 3 octobre 2026 : [Voyages — Wiki](https://seaofthieves.wiki.gg/wiki/Voyage), [Voyages and Quest Items — Rare](https://www.seaofthieves.com/pirate-academy/guide/voyages-and-quest-items), [Hunter’s Call — Rare](https://www.seaofthieves.com/Pirate-Academy/guide/the-hunters-call). Les anciennes cartes de raids d’événements mondiaux ne sont pas ajoutées comme voyages actuels : voir les [notes officielles 3.9.0](https://www.seaofthieves.com/release-notes/3.9.0). Vérifier dans le jeu les disponibilités et traductions exactes avant une extension du catalogue.

## Visuels et prompt

Les décors et portraits de V5 sont conservés dans `public/images/`. Les vignettes V6 sont un atlas original généré avec imagegen intégré : `public/images/voyage-art-v6.png`. Elles évoquent les familles de voyages ; elles ne sont pas des icônes officielles extraites du jeu. Les polices Google ont des polices serif de secours.

Prompt exact du nouvel atlas :

> Asset for a pirate game companion quest selection interface: a strict 3 columns by 2 rows illustration atlas with six equal landscape cells, no margins, no gaps, no borders, each scene fully independent inside its cell. Overall aspect ratio 3:1. Cinematic hand painted pirate fantasy game art, colorful turquoise sea, tropical islands, warm antique treasure, detailed realistic stylized rendering. Top row left: buried wooden pirate treasure chest with gold on a white tropical island beach. Top center: open ancient stone treasure vault with gold chest and a large bronze key. Top right: pirate skeleton captain holding sword on misty island, no gore. Bottom row left: wooden merchant cargo crates and folded cloth on sailing ship deck. Bottom center: fishing rod and fresh fish beside teal ocean on wooden pier. Bottom right: ancient island temple with map scroll, lantern and distant sailing ship. No text, no icons, no UI, no labels, no watermark. Designed to be cropped by CSS into six image thumbnails.

Voir `VALIDATION.md` pour les contrôles et leurs limites.
