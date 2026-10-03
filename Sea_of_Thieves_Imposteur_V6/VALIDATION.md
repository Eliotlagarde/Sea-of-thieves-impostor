# Validation V6 — 3 octobre 2026

## Tests réussis sur de vraies connexions Socket.IO locales

- Création et connexion par code privé, code insensible à la casse.
- Refus du lancement sans quête sélectionnée ; sélection réservée au capitaine ; rejet d’identifiants inconnus.
- Quête personnalisée avec étapes et missions, rejet des données incomplètes.
- Fables : mission réalisable explicitement renseignée obligatoire.
- Aucun avatar « Capitaine » ; ancienne valeur rejetée au profit du personnage par défaut.
- Notes sauvegardées et reprises avec le jeton de session ; absence des notes d’un autre joueur dans les états publics ; limite de 5 000 caractères.
- Rôles et jetons absents de la liste publique ; mission privée ; Espion unique et pouvoir à usage unique sans identité.
- Validation des étapes réservée au capitaine.
- Déclaration de sabotage exigeant une confirmation, sans victoire immédiate ; arbitrage réservé au capitaine, sans auteur dans le payload ; refus et délai de nouvelle déclaration.
- Victoire Pirates après toutes les étapes ; victoire Imposteurs après arbitrage positif.
- Votes privés, cibles validées, un vote définitif, réunion automatique, victoire Pirates après élimination de tous les Imposteurs.
- Expiration du temps pendant une réunion.
- 20 clients dans un salon ; refus du 21e.
- Santé HTTP avec version 6.0.0 et fichier de catalogue accessible.
- 56 identifiants de fiches uniques ; deux phrases de l’accueil conservées ; syntaxe JavaScript serveur et client.

## Parcours vérifié dans le navigateur intégré

- Easter egg ouvert par cinq clics sur le crâne et refermé.
- Sélection d’avatars avec portraits et aperçu, sans option « Capitaine ».
- Création, choix « Collectionneurs d’or → Trésor enterré → Une carte au trésor de pirate », sélection et lancement avec cinq clients.
- Écriture, sauvegarde et récupération d’une note privée après rechargement.
- Catalogue à 1440 × 1000 et 390 × 844 ; document de 390 pixels pour une fenêtre de 390 pixels, sans débordement horizontal.
- Aucun message d’erreur JavaScript observé dans ce parcours.

## Limites

Les délais sont avancés dans le processus de test pour couvrir rapidement les échéances. Aucune partie complète de 60 minutes, aucun déploiement Render et aucun appareil physique distant testés. Les actions de Sea of Thieves sont déclarées et arbitrées manuellement ; aucune intégration ne les vérifie. Le catalogue est initial : certains intitulés sont descriptifs, les fables conservent les titres anglais documentés, et toutes les disponibilités/traductions n’ont pas été contrôlées dans le jeu. Les captures sont celles de parties de démonstration.
