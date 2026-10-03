# Validation V5 — 3 octobre 2026

## Vérifications réussies

Véritables connexions Socket.IO distinctes sur le serveur local, avec assertions :

- Création d’une cabine et entrée par code, y compris en minuscules.
- Salon de 20 joueurs ; refus du 21e joueur.
- Attribution d’un Espion unique ; pouvoir utilisable une seule fois ; réponse sans identité.
- Absence de rôles, missions et jetons dans la liste publique des joueurs.
- Refus du sabotage par un Pirate et des actions répétées pendant le délai serveur.
- Réunions automatiques déclenchées par les échéances serveur.
- Refus des cibles de vote inexistantes et des seconds votes.
- Transmission de totaux uniquement, sans correspondance votant/cible.
- Égalité sans élimination.
- Victoire Pirates par élimination de tous les Imposteurs et par achèvement des cinq étapes.
- Victoire Imposteurs par trois sabotages d’une mission et par expiration du temps pendant une réunion.
- Reprise sur une nouvelle connexion avec jeton privé, sans ajouter un joueur ; refus d’une reprise simultanée.
- Route HTTP `/health` et syntaxe JavaScript du serveur et du client.

Dans le navigateur intégré, parcours réellement effectué : création, affichage des six durées de quête, équipage de trois clients, lancement, contribution enregistrée avec délai de 15 secondes, consultation du rôle, appel d’une réunion, vote « Passer », total à un et bouton de vote désactivé après confirmation. Aucun message d’erreur JavaScript observé dans ce parcours.

Interface examinée à 1440 × 900 et 390 × 844. Sur mobile, largeur de document mesurée à 390 pixels pour une fenêtre de 390 pixels, sans débordement horizontal. Captures : `apercu-pc.jpg` et `apercu-mobile.jpg`.

## Limites

Les échéances et délais ont été avancés dans le processus de test pour couvrir les fins de partie rapidement. Une partie de 60 minutes n’a pas été jouée en temps réel. Les essais utilisent des clients locaux distincts ; aucun déploiement Render ni appareil physique distant n’a été utilisé. Les captures montrent une partie de démonstration. L’équilibrage (contributions et délais) reste à ajuster après des parties entre amis.

## Refonte visuelle sur la référence

Parcours vérifié dans le navigateur : création avec sélection des portraits, salon de cinq clients connectés, lancement, quête, réunion et vote. Aucun message d’erreur JavaScript observé. Vue PC à 1440 × 900 et mobile à 390 × 844 : aucune largeur horizontale supplémentaire (390 pixels mesurés). Captures du salon et de la réunion ajoutées ; captures PC/mobile actualisées. Modifications limitées à index.html, style.css, au rendu visuel dans app.js et aux nouveaux assets ; server.js inchangé pendant cette refonte.
