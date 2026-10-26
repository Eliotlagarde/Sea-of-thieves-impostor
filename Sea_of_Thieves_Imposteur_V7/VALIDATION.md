# Validation V7 — 21 octobre 2026

## Tests d’intégration fournis

`npm install` puis `npm test` exécutent `test/integration.js`, avec de vraies connexions Socket.IO et un serveur local sur un port disponible.

Vérifications réussies :

- Code privé, limite de 20 joueurs et rejet du 21e ; refus d’un avatar « Capitaine ».
- Réglage des cinq durées de prison et valeur par défaut de deux minutes.
- Vote secret unique, cibles validées et impossibilité de voter pour un joueur déjà désigné/détenu.
- Attente de placement sans échéance ; aucun démarrage automatique.
- Départ réservé au capitaine ; double départ refusé ; échéance identique dans les états des clients.
- Blocage des sabotages, réunions, votes et pouvoir de l’Espion pendant l’attente ou la détention.
- Deux Imposteurs simultanément détenus : la partie continue, sans révélation et sans victoire par emprisonnement.
- Notes privées, limite de longueur, sauvegarde et reprise d’une détention après reconnexion.
- Libération de plusieurs joueurs pendant une réunion, y compris hors ligne ; retour des possibilités d’action.
- Capitaine détenu : départ du compteur possible et confirmation d’étape bloquée.
- Transfert de capitaine avec une détention en attente, et reprise du départ par le nouveau capitaine.
- Votes à égalité avec « Passer » : aucun emprisonnement.
- Espion unique, révélation d’une mission sans identité, une utilisation.
- Victoire par quête accomplie, statistiques de détention, et défaite au temps écoulé pendant une réunion.
- Catalogue aux identifiants uniques, profils carte/énigme distincts, manifeste pour la cargaison perdue, noms français et alias anglais des fables.
- Vente facultative, ajout explicitement étiqueté, modification répétée sans duplication, et retrait de la condition quand la case est décochée.
- Santé HTTP version 7.0.0 et syntaxe JavaScript du serveur et du client.

## Parcours réalisé dans le navigateur intégré

- Création et réglages d’une prison de trente secondes et d’une réunion de trente-neuf secondes.
- Quête choisie avec condition supplémentaire de vente, lancement avec quatre clients.
- Nom du capitaine et badge personnel affichés.
- Vote majoritaire pour un joueur ; attente de placement observée sans compteur.
- Départ depuis le bouton du capitaine ; trente secondes réellement écoulées ; affichage de l’annonce de libération.
- Trois clients de test ont reçu le même `endsAt` et le même temps restant sur une diffusion.
- Notes privées enregistrées pendant la réunion.
- Cinq clics sur le crâne de la barre supérieure : image cachée accessible pendant la partie, fermeture sans interrompre le compteur.
- Vues 1440 × 1000 et 390 × 844. Sur mobile : document de 390 pixels pour une fenêtre de 390 pixels, sans débordement horizontal.
- Aucun message d’erreur JavaScript observé dans ce parcours.

Captures V7 : `apercu-prison-attente.jpg`, `apercu-prison-pc.jpg`, `apercu-prison-mobile.jpg`.

## Limites

Les tests automatisés avancent certaines échéances dans le processus serveur pour couvrir les cas rapidement ; le parcours navigateur utilise une détention réelle de trente secondes. Pas de partie complète de soixante minutes ni de déploiement Render effectués. Les joueurs sont des clients locaux distincts ; aucun test sur appareils physiques distants. Sea of Thieves n’est pas piloté : le placement, la libération réelle et les actions de quête restent manuels. Le catalogue garde des noms descriptifs et une traduction de fable indicative ; les sources et limites sont précisées dans le README. Les captures sont celles d’une partie de démonstration.
