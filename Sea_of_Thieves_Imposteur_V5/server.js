
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const rooms = new Map();

const AVATARS = [
  "capitaine","navigatrice","cartographe","quartier-maitre",
  "vigie","canonnier","charpentier","medecin"
];

const QUESTS = [
  {
    id:"tresor-ile-maudite",
    title:"Le trésor de l'île maudite",
    steps:[
      "Retrouver la carte perdue",
      "Naviguer jusqu'à l'île",
      "Trouver l'entrée de la grotte",
      "Récupérer le trésor",
      "Revenir au bateau"
    ],
    sabotage:[
      "Détruire la carte perdue",
      "Saboter la navigation vers l'île",
      "Bloquer l'entrée de la grotte",
      "Voler le trésor",
      "Faire échouer le retour au bateau"
    ]
  },
  {
    id:"forteresse-noire",
    title:"La forteresse noire",
    steps:[
      "Trouver la clé de la forteresse",
      "Atteindre la forteresse",
      "Ouvrir la porte principale",
      "Récupérer le coffre",
      "Quitter la forteresse"
    ],
    sabotage:[
      "Voler la clé de la forteresse",
      "Empêcher le bateau d'atteindre la forteresse",
      "Bloquer la porte principale",
      "Voler le coffre",
      "Faire échouer la fuite"
    ]
  },
  {
    id:"epave-du-leviathan",
    title:"L'épave du Léviathan",
    steps:[
      "Localiser l'épave",
      "Préparer la plongée",
      "Ouvrir la cale",
      "Récupérer le coffre",
      "Ramener le butin à bord"
    ],
    sabotage:[
      "Fausser la position de l'épave",
      "Détruire le matériel de plongée",
      "Bloquer l'accès à la cale",
      "Voler le coffre",
      "Faire tomber le butin à la mer"
    ]
  },
  {
    id:"temple-oublie",
    title:"Le temple oublié",
    steps:[
      "Déchiffrer l'inscription",
      "Trouver le passage secret",
      "Entrer dans le temple",
      "Récupérer la relique",
      "Ramener la relique au navire"
    ],
    sabotage:[
      "Détruire l'inscription",
      "Fermer le passage secret",
      "Bloquer l'accès au temple",
      "Voler la relique",
      "Empêcher le retour de la relique"
    ]
  }
];

function cleanName(name) {
  return String(name || "").trim().slice(0, 18) || "Matelot";
}
function cleanCode(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
}
function randomCode() {
  let c;
  do c = crypto.randomBytes(3).toString("hex").toUpperCase(); while (rooms.has(c));
  return c;
}
function publicPlayer(p) {
  return {
    id:p.id, name:p.name, avatar:p.avatar, ready:p.ready,
    captain:p.captain, connected:p.connected
  };
}
function publicRoom(room, requesterId) {
  const me = room.players.get(requesterId);
  return {
    code:room.code,
    phase:room.phase,
    settings:room.settings,
    players:[...room.players.values()].map(publicPlayer),
    quest: room.phase === "playing" || room.phase === "meeting" || room.phase === "ended" ? {
      title:room.quest.title,
      steps:room.quest.steps,
      progress:room.quest.progress,
      currentStep:room.quest.currentStep
    } : null,
    timers: {
      totalLeft: room.totalEnd ? Math.max(0, room.totalEnd-Date.now()) : null,
      nextMeetingLeft: room.nextMeetingAt ? Math.max(0, room.nextMeetingAt-Date.now()) : null,
      meetingLeft: room.meetingEnd ? Math.max(0, room.meetingEnd-Date.now()) : null
    },
    meeting: room.meeting ? {
      votes:Object.fromEntries([...room.meeting.votes.entries()]),
      voted: room.meeting.votes.has(requesterId)
    } : null,
    me: me ? {
      role:me.role || null,
      spyPowerAvailable:!!(me.role === "spy" && !me.spyUsed),
      secretMission:me.secretMission || null,
      eliminated:!!me.eliminated
    } : null
  };
}
function broadcast(room) {
  for (const p of room.players.values()) {
    io.to(p.id).emit("state", publicRoom(room,p.id));
  }
}
function endRoomGame(room, result, reason) {
  if (room.phase === "ended") return;
  room.phase = "ended";
  room.result = result;
  room.resultReason = reason;
  if (room.tick) clearInterval(room.tick);
  broadcast(room);
}
function checkWin(room) {
  if (room.quest.currentStep >= room.quest.steps.length) {
    endRoomGame(room, "pirates", "La quête est accomplie.");
    return true;
  }
  const aliveImpostors = [...room.players.values()].filter(p => p.role === "impostor" && !p.eliminated);
  const alivePirates = [...room.players.values()].filter(p => ["pirate","spy"].includes(p.role) && !p.eliminated);
  if (aliveImpostors.length === 0) {
    endRoomGame(room, "pirates", "Tous les Imposteurs ont été éliminés.");
    return true;
  }
  if (aliveImpostors.length >= alivePirates.length && alivePirates.length > 0) {
    endRoomGame(room, "impostors", "Les Imposteurs ont pris le dessus.");
    return true;
  }
  return false;
}
function startGame(room) {
  if (room.phase !== "lobby") return;
  const players = [...room.players.values()];
  if (players.length < 3) return;
  if (!players.every(p => p.ready || p.captain)) return;
  const impostorCount = Math.max(1, Math.min(room.settings.impostors, Math.floor(players.length/3)));
  const shuffled = [...players].sort(()=>Math.random()-0.5);
  shuffled.forEach(p => { p.role = "pirate"; p.eliminated=false; p.spyUsed=false; p.secretMission=null; });
  shuffled.slice(0, impostorCount).forEach(p => p.role = "impostor");
  if (room.settings.spyEnabled) {
    const pirates = shuffled.filter(p => p.role === "pirate");
    if (pirates.length) pirates[Math.floor(Math.random()*pirates.length)].role = "spy";
  }

  room.quest = JSON.parse(JSON.stringify(QUESTS[Math.floor(Math.random()*QUESTS.length)]));
  room.quest.currentStep = 0;
  room.quest.progress = 0;
  room.quest.stepContributors = [];
  const impostors = shuffled.filter(p => p.role === "impostor");
  impostors.forEach((p,i) => p.secretMission = room.quest.sabotage[Math.floor(Math.random()*room.quest.sabotage.length)]);

  room.phase = "playing";
  room.startedAt = Date.now();
  room.totalEnd = room.startedAt + room.settings.questMinutes*60*1000;
  room.nextMeetingAt = room.startedAt + room.settings.meetingInterval*60*1000;
  room.meeting = null;
  room.meetingEnd = null;

  room.tick = setInterval(() => {
    if (!rooms.has(room.code)) return clearInterval(room.tick);
    if (room.phase === "playing") {
      if (Date.now() >= room.totalEnd) return endRoomGame(room, "impostors", "Le temps de la quête est écoulé.");
      if (Date.now() >= room.nextMeetingAt) {
        room.phase = "meeting";
        room.meeting = { votes:new Map(), startedAt:Date.now() };
        room.meetingEnd = Date.now() + room.settings.meetingSeconds*1000;
        broadcast(room);
      } else {
        broadcast(room);
      }
    } else if (room.phase === "meeting") {
      if (Date.now() >= room.meetingEnd) finishMeeting(room);
      else broadcast(room);
    }
  }, 1000);
  broadcast(room);
}
function finishMeeting(room) {
  if (room.phase !== "meeting") return;
  const counts = new Map();
  for (const target of room.meeting.votes.values()) counts.set(target,(counts.get(target)||0)+1);
  let winner = null, max = 0, tie = false;
  for (const [id,n] of counts.entries()) {
    if (n > max) { winner=id; max=n; tie=false; }
    else if (n === max) tie=true;
  }
  if (winner && !tie && winner !== "skip") {
    const target = room.players.get(winner);
    if (target && !target.eliminated) target.eliminated = true;
  }
  room.phase = "playing";
  room.meetingEnd = null;
  room.meeting = null;
  room.nextMeetingAt = Date.now() + room.settings.meetingInterval*60*1000;
  if (!checkWin(room)) broadcast(room);
}
function makeAction(room, player, action) {
  if (room.phase !== "playing" || player.eliminated) return;
  // Pirate/spy progress: one simple contribution per action.
  if (action === "advanceQuest" && ["pirate","spy"].includes(player.role)) {
    room.quest.progress++;
    if (room.quest.progress >= 3) {
      room.quest.currentStep++;
      room.quest.progress = 0;
      room.quest.stepContributors = [];
      checkWin(room);
    }
  }
  // Impostor sabotage actions are deliberately tied to the current quest.
  if (action === "sabotage" && player.role === "impostor") {
    room.quest.progress = Math.max(0, room.quest.progress - 1);
  }
  if (action === "burnBoat" && player.role === "impostor") {
    endRoomGame(room, "impostors", "Le bateau a été brûlé.");
  }
  if (action === "destroyMap" && player.role === "impostor" && room.quest.currentStep === 0) {
    room.quest.progress = 0;
    room.quest.currentStep = Math.max(0, room.quest.currentStep);
  }
  broadcast(room);
}

io.on("connection", socket => {
  socket.on("createRoom", ({name,avatar,settings}, cb) => {
    const code = randomCode();
    const room = {
      code, phase:"lobby", settings:{
        questMinutes: clampNum(settings?.questMinutes, [10,15,20,30,45,60], 30),
        meetingInterval: clampNum(settings?.meetingInterval, [4,5,7,10,15,20,30], 5),
        meetingSeconds: clampNum(settings?.meetingSeconds, [39,60,120,180,240], 60),
        spyEnabled: settings?.spyEnabled !== false,
        impostors: Math.max(1, Math.min(5, Number(settings?.impostors)||1))
      },
      players:new Map(), quest:null, meeting:null, tick:null
    };
    const player = {id:socket.id,name:cleanName(name),avatar:AVATARS.includes(avatar)?avatar:"capitaine",ready:false,captain:true,connected:true};
    room.players.set(socket.id, player);
    rooms.set(code,room);
    socket.join(code);
    cb?.({ok:true,code});
    broadcast(room);
  });

  socket.on("joinRoom", ({code,name,avatar}, cb) => {
    code=cleanCode(code);
    const room=rooms.get(code);
    if (!room) return cb?.({ok:false,error:"Cabine introuvable."});
    if (room.phase !== "lobby") return cb?.({ok:false,error:"La partie a déjà commencé."});
    if (room.players.size >= 20) return cb?.({ok:false,error:"Cabine complète."});
    const player={id:socket.id,name:cleanName(name),avatar:AVATARS.includes(avatar)?avatar:"navigatrice",ready:false,captain:false,connected:true};
    room.players.set(socket.id,player);
    socket.join(code);
    cb?.({ok:true,code});
    broadcast(room);
  });

  socket.on("ready", ({code},cb) => {
    const room=rooms.get(cleanCode(code)); const p=room?.players.get(socket.id);
    if (!p || room.phase!=="lobby") return cb?.({ok:false});
    p.ready=!p.ready; cb?.({ok:true}); broadcast(room);
  });

  socket.on("startGame", ({code},cb) => {
    const room=rooms.get(cleanCode(code)); const p=room?.players.get(socket.id);
    if (!p?.captain) return cb?.({ok:false,error:"Seul le capitaine peut lancer la partie."});
    if ([...room.players.values()].length < 3) return cb?.({ok:false,error:"Il faut au moins 3 joueurs."});
    if (![...room.players.values()].every(x=>x.ready || x.captain)) return cb?.({ok:false,error:"Tous les joueurs doivent être prêts."});
    startGame(room); cb?.({ok:true});
  });

  socket.on("updateSettings", ({code,settings},cb) => {
    const room=rooms.get(cleanCode(code)); const p=room?.players.get(socket.id);
    if (!p?.captain || room.phase!=="lobby") return cb?.({ok:false});
    room.settings.questMinutes=clampNum(settings.questMinutes,[10,15,20,30,45,60],30);
    room.settings.meetingInterval=clampNum(settings.meetingInterval,[4,5,7,10,15,20,30],5);
    room.settings.meetingSeconds=clampNum(settings.meetingSeconds,[39,60,120,180,240],60);
    room.settings.spyEnabled=!!settings.spyEnabled;
    room.settings.impostors=Math.max(1,Math.min(5,Number(settings.impostors)||1));
    cb?.({ok:true}); broadcast(room);
  });

  socket.on("action", ({code,action},cb) => {
    const room=rooms.get(cleanCode(code)); const p=room?.players.get(socket.id);
    if (!room || !p) return cb?.({ok:false});
    makeAction(room,p,action); cb?.({ok:true});
  });

  socket.on("callMeeting", ({code},cb) => {
    const room=rooms.get(cleanCode(code)); const p=room?.players.get(socket.id);
    if (!room || !p || p.eliminated || room.phase!=="playing") return cb?.({ok:false});
    room.phase="meeting"; room.meeting={votes:new Map(),startedAt:Date.now()}; room.meetingEnd=Date.now()+room.settings.meetingSeconds*1000;
    broadcast(room); cb?.({ok:true});
  });

  socket.on("vote", ({code,target},cb) => {
    const room=rooms.get(cleanCode(code)); const p=room?.players.get(socket.id);
    if (!room || !p || room.phase!=="meeting" || p.eliminated) return cb?.({ok:false});
    room.meeting.votes.set(socket.id,target);
    cb?.({ok:true}); broadcast(room);
  });

  socket.on("spyReveal", ({code},cb) => {
    const room=rooms.get(cleanCode(code)); const p=room?.players.get(socket.id);
    if (!room || !p || p.role!=="spy" || p.spyUsed || room.phase==="lobby") return cb?.({ok:false,error:"Pouvoir indisponible."});
    const impostor = [...room.players.values()].find(x=>x.role==="impostor" && !x.eliminated);
    if (!impostor) return cb?.({ok:false,error:"Aucun objectif d'Imposteur disponible."});
    p.spyUsed=true;
    cb?.({ok:true,mission:impostor.secretMission});
    broadcast(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const p=room.players.get(socket.id);
      if (!p) continue;
      p.connected=false;
      if (room.phase==="lobby") {
        room.players.delete(socket.id);
        if (p.captain) {
          const next=room.players.values().next().value;
          if (next) next.captain=true;
        }
      }
      if (room.players.size===0) { if(room.tick) clearInterval(room.tick); rooms.delete(room.code); }
      else broadcast(room);
    }
  });
});

function clampNum(v, allowed, fallback) {
  const n=Number(v);
  return allowed.includes(n) ? n : fallback;
}

server.listen(PORT, ()=>console.log(`Sea Imposteur V5 — http://localhost:${PORT}`));
