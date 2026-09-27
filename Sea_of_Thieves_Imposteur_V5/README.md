# Sea of Thieves — L'Imposteur V5

V5 multijoueur basée sur la structure de la V4.

## Structure
- `server.js` — serveur Express + Socket.IO et logique de partie
- `public/index.html` — interface
- `public/style.css` — style V5
- `public/app.js` — client Socket.IO
- `public/images/` — mêmes assets image que la V4
- `package.json` — dépendances
- `render.yaml` — déploiement Render

## V5
- Cabines privées 3–20 joueurs
- Quête commune
- Durée de quête : 10 / 15 / 20 / 30 / 45 / 60 min
- Réunions toutes les 4 / 5 / 7 / 10 / 15 / 20 / 30 min
- Réunions de 39 sec / 1 / 2 / 3 / 4 min
- Espion activable ou désactivable
- Missions d'Imposteur liées à la quête
- Pouvoir de l'Espion utilisable une fois
- Consultation du rôle personnel
- Aucun événement aléatoire
- Votes et conditions de victoire

## Lancer
```bash
npm install
npm start
```
Puis ouvrir `http://localhost:3000`.
