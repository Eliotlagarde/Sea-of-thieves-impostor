# 🏴‍☠️ Sea of Thieves — L'Imposteur V2

Version pensée pour être simple à utiliser à distance.

## Ce que le site fait
- 3 à 20 joueurs
- nombre d'imposteurs réglable
- cabine avec code
- aucun numéro de téléphone
- rôle envoyé uniquement au joueur concerné
- coffre secret pour révéler le rôle
- objectifs secrets pour l'imposteur
- 4 missions générées pour la partie
- validation des missions par le capitaine
- réunions chronométrées
- votes secrets et résultats anonymisés
- musique locale choisie par chaque joueur
- design pirate avec les images fournies
- photo cachée comme easter egg : cliquer 5 fois sur la boussole en bas à droite

## Important pour la musique
Le site n'embarque pas de copie de « He's a Pirate ». Chaque joueur peut choisir localement un fichier audio qu'il est autorisé à utiliser avec le bouton Musique.

## Mise en ligne facile
Le plus simple est d'utiliser un hébergeur Node comme Render. Le fichier `render.yaml` est déjà inclus.

1. Crée un compte GitHub.
2. Crée un nouveau dépôt.
3. Envoie le contenu de ce dossier dans le dépôt.
4. Sur Render, choisis New > Web Service et connecte ton dépôt.
5. Render détecte Node. Build : `npm install`. Start : `npm start`.
6. Choisis Free.
7. Une adresse `...onrender.com` sera créée. C'est l'adresse à donner aux joueurs.

Le plan gratuit Render est adapté à un petit projet de jeu, mais le service peut s'endormir après une période sans activité et mettre un peu de temps à redémarrer.
