# Sea of Thieves — L’Imposteur V7

Évolution de la V6, toujours Node.js + Express + Socket.IO, 3–20 joueurs et une seule quête commune. Le projet accompagne Sea of Thieves ; il ne contrôle pas le jeu et n’en lit pas les données.

## Lancer et tester

Node.js 22 ou supérieur :

```sh
npm install
npm test
npm start
```

Ouvrir http://localhost:3000. Pour jouer sur plusieurs appareils, ouvrir la même IP locale du serveur ou la même URL HTTPS Render. `localhost` sur chaque appareil désignerait des ordinateurs différents.

Le dossier contient `server.js`, `package.json`, `render.yaml`, `public/index.html`, `public/app.js`, `public/style.css`, les images, le catalogue partagé `public/voyages.js` et les tests `test/integration.js`.

## Prison temporaire V7

- Réglage capitaine avant le départ : 30 secondes, 1, 2, 3 ou 5 minutes ; 2 minutes par défaut.
- Les votes restent uniques et secrets. Seuls les totaux par cible sont transmis. Une égalité, aucun vote ou une majorité pour « Passer » n’envoient personne en prison.
- Le joueur désigné passe en « En attente de placement en prison ». Aucun compte à rebours ne démarre encore, quelle que soit la durée de cette attente.
- Le capitaine place réellement le joueur en prison dans Sea of Thieves, puis clique sur « Joueur en prison — démarrer le compte à rebours ».
- Le serveur fixe une échéance unique et transmet le même temps restant à tous les clients d’une diffusion. La durée ne peut pas être relancée en répétant la commande. Les horloges locales des joueurs ne décident pas de la libération.
- Dès la désignation et pendant toute la détention, le joueur ne peut plus saboter, voter, appeler une réunion, utiliser le pouvoir d’Espion ou confirmer une étape de quête. Il peut consulter son propre rôle et lire/écrire ses notes privées.
- Le compteur continue pendant les réunions et les déconnexions. La reconnexion retrouve la détention et son échéance.
- À l’échéance, le serveur rétablit ses possibilités d’action, affiche une annonce de libération et écrit dans le journal. L’équipage doit également le libérer dans Sea of Thieves. L’application ne peut pas actionner la prison du jeu. L’annonce reste visible trente secondes ; l’historique la conserve.
- Plusieurs détentions peuvent coexister après plusieurs réunions. Un joueur déjà désigné ou détenu ne peut pas être ciblé à nouveau avant sa libération.
- Le capitaine peut lui-même être détenu. Ses commandes administratives de démarrage des compteurs et d’arbitrage restent accessibles, mais ses actions de jeu sont bloquées. Si le capitaine quitte, le suivant reprend les compteurs existants et peut démarrer ceux en attente.
- Les rôles restent secrets : la prison fournit un indice de comportement, pas une preuve.

Il n’y a plus d’élimination définitive ni de victoire parce que tous les Imposteurs sont en prison. Pirates gagnants : toutes les étapes de la quête commune confirmées. Imposteurs gagnants : échec confirmé ou temps écoulé, y compris pendant une réunion. La fin de partie arrête les détentions et révèle les rôles, missions, votes, déclarations, nombre d’emprisonnements et temps passé en détention.

## Capitaine visible et easter egg

La couronne du salon est conservée. Une barre persistante affiche le nom du capitaine à l’équipage et « Tu es le capitaine » sur son propre écran, y compris pendant les réunions. Ce statut est indépendant de l’avatar et du rôle secret : un capitaine peut être Pirate, Espion ou Imposteur.

Cinq clics sur le crâne de l’accueil **ou de la barre supérieure** ouvrent l’image originale `public/images/hidden-treasure.jpeg`. Il faut moins de quatre secondes entre deux clics. L’easter egg reste donc accessible sans quitter la partie. Bouton de fermeture ou touche Échap pour revenir ; les timers continuent pendant l’affichage.

## Quêtes : voyage officiel et règles de Sea Imposteur

Le capitaine choisit le voyage réellement lancé : compagnie → catégorie → fiche de voyage. Il n’y a pas de quête inventée tirée au hasard.

Le catalogue conserve 56 fiches dans huit rubriques. Les profils de carte au trésor, énigme, cache, prime, flotte fantôme, contrat, cargaison, cargaison perdue, pêche/chasse, crâne de la destinée, voyage mixte et fable sont distingués. Les indices, îles et objets exacts restent ceux de votre partie.

**Par défaut, les étapes suivent le voyage officiel et n’imposent pas la vente.** Pour une énigme, on suit les indices avant de déterrer le trésor ; pour une cargaison perdue, on suit les pistes et récupère le manifeste. Les profils dont la condition exacte varie demandent de confirmer l’achèvement tel qu’indiqué dans le jeu.

Une case distincte permet d’ajouter une condition Sea Imposteur : rapporter et vendre le butin, ou livrer la cargaison. Pour une cache, cette option ajoute l’ouverture de la cache et la récupération du butin. Ces étapes sont explicitement étiquetées « Condition Sea Imposteur ». La case est désactivée pour les fables et le crâne de la destinée. Elle ne modifie pas la condition officielle de fin du voyage dans Sea of Thieves.

Les missions d’Imposteurs sont des règles de notre partie : perdre un trésor ou couler ne supprime pas forcément le voyage de Sea of Thieves. Le capitaine peut adapter les étapes et les missions avant le départ ; les fables et quêtes personnalisées exigent une mission réellement applicable, explicitement saisie, pour éviter un objectif impossible dans une aventure sans navire accessible.

L’Imposteur réalise son action dans Sea of Thieves puis la déclare dans son onglet privé. Le capitaine reçoit le fait à vérifier, sans l’auteur, et accepte ou refuse l’échec. L’application repose sur la bonne foi et cet arbitrage manuel. Une nouvelle déclaration est soumise à un délai de 60 secondes ; les timers continuent pendant l’arbitrage.

### Noms et sources

Les cartes au trésor de vos captures sont conservées. Les fables disposent de titres français et conservent leur nom anglais pour la recherche. « Wild Rose » est aussi le titre français ; il n’est pas traduit artificiellement en « Rose sauvage ». La traduction « L’Antre de LeChuck » reste indiquée comme indicative, avec son titre anglais disponible. Les autres noms descriptifs restent modifiables au nom exact affiché dans votre jeu. Le catalogue ne prétend pas reproduire exhaustivement toutes les traductions et disponibilités de chaque mise à jour.

Sources revues les 20–21 octobre 2026 :

- [Voyages — Wiki](https://seaofthieves.wiki.gg/wiki/Voyage)
- [Énigme de pirate — déroulement](https://seaofthieves.wiki.gg/wiki/A_Pirate%27s_Riddle_Quest)
- [Cargaisons perdues et manifeste](https://seaofthieves.wiki.gg/wiki/Lost_Shipments)
- [Titres français Shores of Gold — Rare](https://www.seaofthieves.com/fr/news/anniversary-update-achievements)
- [Cœur ardent et L’âme en partance — Rare](https://www.seaofthieves.com/fr/heart-of-fire)
- [Fables Vive la piraterie — Sea of Thieves France](https://www.seaofthieves-france.fr/sea-of-thieves-a-pirates-life/)
- [La Quête de Guybrush — Xbox](https://news.xbox.com/fr-fr/2023/08/31/sea-of-thieves-the-legend-of-monkey-island-continue-avec-la-deuxieme-fable-a-la-recherche-de-guybrush/)
- [Notes 3.9.0 et retrait des voyages de raids d’événements mondiaux — Rare](https://www.seaofthieves.com/release-notes/3.9.0)

## Fonctions V6 conservées

Codes privés, joueurs prêts, réglages du capitaine, sept portraits avec aperçu et sans avatar « Capitaine », rôles secrets, Espion unique optionnel et pouvoir à usage unique, réunions automatiques, réunion d’urgence limitée par joueur, notes privées de 5 000 caractères, historique commun, reconnexion et bilan final. Aucun mini-jeu, aucun événement aléatoire.

Les notes sont envoyées uniquement à leur propriétaire. Le navigateur conserve le jeton privé dans `sessionStorage` : recharger le même onglet reprend le joueur ; fermer cet onglet perd cette reprise. Le code seul ne reprend pas une identité après lancement. La V7 utilise une clé de session distincte des anciennes versions. Le capitaine conserve son statut pendant une déconnexion de moins de quinze secondes ; au-delà, il passe à un joueur connecté.

Le décor et les visuels V6 sont réutilisés. Les deux phrases de l’accueil gardent leur texte, leur style et leur emplacement :

- « UNE QUÊTE. UN ÉQUIPAGE. UNE TRAHISON. » au-dessus du titre.
- « Rejoignez l’équipage… ou semez le doute. » en bas de l’accueil.

## Render

Utiliser le Blueprint `render.yaml` ou un service Node : build `npm install`, démarrage `npm start`, contrôle `/health`. Une seule instance est prévue. Les salons, notes et échéances sont en mémoire : un redémarrage ou un déploiement les efface. Pour une partie continue, utiliser une instance qui ne se met pas en veille. Le serveur respecte `PORT` fourni par Render.

La livraison locale de V7 ne remplace pas automatiquement le site Render déjà publié. Déployer le contenu de ce dossier pour le mettre à jour. Voir `VALIDATION.md` pour la portée des contrôles.
