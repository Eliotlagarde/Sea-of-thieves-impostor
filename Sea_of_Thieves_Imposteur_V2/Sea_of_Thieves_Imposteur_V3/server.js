const express = require("express");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const rooms = new Map();

// Missions volontairement sans mini-puzzles : elles restent réalisables dans Sea of Thieves.
const MISSIONS = [
  {title:"La carte oubliée", text:"Trouvez un indice et rapportez-le à bord sans perdre de temps."},
  {title:"Le coffre maudit", text:"Récupérez un trésor et sécurisez-le sur le navire."},
  {title:"Les eaux dangereuses", text:"Atteignez l’île désignée par le capitaine puis revenez au bateau."},
  {title:"Le butin final", text:"Ramenez le dernier trésor et préparez la vente."},
  {title:"L’épreuve du canon", text:"Effectuez une activité de combat ou de tir choisie par l’équipage."},
  {title:"Le détour suspect", text:"Visitez un point supplémentaire avant de terminer l’expédition."},
  {title:"La livraison urgente", text:"Transportez une cargaison jusqu’à la destination indiquée."},
  {title:"L’escale lointaine", text:"Rejoignez un avant-poste éloigné et revenez avec un indice."},
  {title:"Le pavillon mystérieux", text:"Repérez un navire ou un pavillon précis et signalez-le à l’équipage."},
  {title:"Le trésor caché", text:"Retrouvez un trésor à l’emplacement indiqué par le capitaine."}
];

const IMPOSTOR_TASKS = [
  "Fais perdre du temps à l’équipage sans paraître volontairement inutile.",
  "Convaincs le groupe de prendre au moins un détour avant la prochaine réunion.",
  "Fais en sorte qu’une mission soit retardée tout en prétendant aider.",
  "Mets discrètement l’équipage dans une situation compliquée puis fais comme si c’était une erreur.",
  "Sème un doute crédible sur une décision importante sans attirer trop l’attention."
];

const RANDOM_EVENTS = [
  {title:"🌩️ Tempête en approche", text:"Le ciel se couvre. L’équipage doit rester vigilant pendant quelques instants."},
  {title:"🌫️ Brouillard sur les mers", text:"Une brume mystérieuse enveloppe l’expédition. Gardez vos repères."},
  {title:"🪙 Une pièce porte-bonheur", text:"Une vieille pièce est retrouvée à bord. Le capitaine l’ajoute au journal de bord."},
  {title:"🦜 Le perroquet s’est échappé", text:"Quelqu’un devra garder l’œil ouvert : le perroquet vient de disparaître."},
  {title:"🗺️ Une carte étrange", text:"Un fragment de carte apparaît parmi le butin. Personne ne sait qui l’a posé là."},
  {title:"⚓ Mouillage imprévu", text:"L’équipage doit faire une courte pause avant de reprendre son expédition."}
];

function cleanName(n){return String(n||"Pirate").trim().slice(0,18)||"Pirate";}
function makeCode(){let c;do c=crypto.randomBytes(3).toString("hex").toUpperCase();while(rooms.has(c));return c;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function roomOf(id){for(const r of rooms.values())if(r.players.has(id))return r;}
function pub(r){return{code:r.code,hostId:r.hostId,started:r.started,maxPlayers:r.maxPlayers,impostors:r.impostors,missionCount:r.missions.length,meetingEveryMinutes:r.meetingEveryMinutes,meetingDurationMinutes:r.meetingDurationMinutes,phase:r.phase,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,ready:p.ready}))};}
function sendState(r){io.to(r.code).emit("roomState",pub(r));}
function clearTimers(r){if(r.nextMeetingTimer)clearTimeout(r.nextMeetingTimer);if(r.meetingTimer)clearTimeout(r.meetingTimer);if(r.eventTimer)clearTimeout(r.eventTimer);r.nextMeetingTimer=null;r.meetingTimer=null;r.eventTimer=null;}
function addJournal(r,id,entry){const p=r.players.get(id);if(!p)return;p.journal.push(entry);io.to(id).emit("journalUpdate",{entries:p.journal});}
function addJournalAll(r,entry){for(const p of r.players.values())addJournal(r,p.id,entry);}
function broadcastPrivateRoles(r){for(const p of r.players.values())io.to(p.id).emit("privateRole",{role:p.role,secret:p.secret});}
function startNextMeetingTimer(r){if(!r.started||r.phase!=="game")return;clearTimeout(r.nextMeetingTimer);const ms=r.meetingEveryMinutes*60*1000;r.nextMeetingAt=Date.now()+ms;io.to(r.code).emit("nextMeeting",{endsAt:r.nextMeetingAt});r.nextMeetingTimer=setTimeout(()=>startMeeting(r),ms);}
function scheduleEvent(r){if(!r.started||r.phase!=="game")return;clearTimeout(r.eventTimer);const ms=(60+crypto.randomInt(61))*1000;r.eventTimer=setTimeout(()=>{const e=RANDOM_EVENTS[crypto.randomInt(RANDOM_EVENTS.length)];io.to(r.code).emit("randomEvent",e);addJournalAll(r,`Événement : ${e.title.replace(/^[^ ]+ /,'')}`);scheduleEvent(r);},ms);}
function startMeeting(r){if(!r.started)return;r.phase="meeting";clearTimeout(r.nextMeetingTimer);clearTimeout(r.eventTimer);r.nextMeetingTimer=null;r.eventTimer=null;r.votes.clear();r.voting=true;r.meetingEndsAt=Date.now()+r.meetingDurationMinutes*60*1000;io.to(r.code).emit("meetingStarted",{endsAt:r.meetingEndsAt,players:[...r.players.values()].map(p=>({id:p.id,name:p.name}))});addJournalAll(r,"Réunion d’équipage ouverte.");r.meetingTimer=setTimeout(()=>finishMeeting(r),r.meetingDurationMinutes*60*1000);}
function finishMeeting(r){if(!r.started||r.phase!=="meeting")return;r.voting=false;const tally={};for(const target of r.votes.values())tally[target]=(tally[target]||0)+1;const result=[...r.players.values()].map(p=>({id:p.id,name:p.name,count:tally[p.id]||0})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));r.lastVoteResult=result;io.to(r.code).emit("voteResult",{tally:result});for(const p of r.players.values()){p.stats.meetings++;if(r.votes.has(p.id))p.stats.votesCast++;}for(const x of result)if(x.count>0)addJournalAll(r,`Vote : ${x.name} a reçu ${x.count} vote${x.count>1?'s':''}.`);r.phase="game";io.to(r.code).emit("gameResumed",{nextMeetingAt:Date.now()+r.meetingEveryMinutes*60*1000});startNextMeetingTimer(r);scheduleEvent(r);}
function finishGame(r,winner,reason){if(!r.started)return;r.started=false;r.phase="ended";clearTimers(r);const roles=[...r.players.values()].map(p=>({id:p.id,name:p.name,role:p.role,secret:p.secret,stats:p.stats}));const missionDone=r.missionDone.filter(Boolean).length;const titles={};for(const p of r.players.values()){const candidates=[];if(p.role==="IMPOSTEUR")candidates.push("Maître du mensonge");if(p.stats.votesCast>=2)candidates.push("Détective des mers");if(p.stats.missionsValidated>=2)candidates.push("Vieux loup de mer");if(p.stats.eventsSeen>=2)candidates.push("Explorateur");if(!candidates.length)candidates.push("Moussaillon");titles[p.id]=candidates[crypto.randomInt(candidates.length)];}io.to(r.code).emit("gameEnded",{winner,reason,roles,missionDone,missionTotal:r.missions.length,duration:Math.max(1,Math.round((Date.now()-r.startedAt)/60000)),titles,votes:r.lastVoteResult||[]});}

io.on("connection",socket=>{
  socket.on("createRoom",({name,maxPlayers=4,impostors=1,meetingEveryMinutes=5,meetingDurationMinutes=2},cb)=>{
    maxPlayers=Math.max(3,Math.min(20,Number(maxPlayers)||4));
    impostors=Math.max(1,Math.min(Math.max(1,maxPlayers-1),Number(impostors)||1));
    meetingEveryMinutes=Math.max(1,Math.min(30,Number(meetingEveryMinutes)||5));
    meetingDurationMinutes=Math.max(1,Math.min(5,Number(meetingDurationMinutes)||2));
    const r={code:makeCode(),hostId:socket.id,maxPlayers,impostors,meetingEveryMinutes,meetingDurationMinutes,started:false,phase:"lobby",players:new Map(),missions:[],missionDone:[],votes:new Map(),voting:false,nextMeetingTimer:null,meetingTimer:null,eventTimer:null,startedAt:0,lastVoteResult:[]};
    r.players.set(socket.id,{id:socket.id,name:cleanName(name),ready:false,role:null,secret:null,journal:["Bienvenue à bord, capitaine."],stats:{votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0}});
    rooms.set(r.code,r);socket.join(r.code);cb({ok:true,room:pub(r)});sendState(r);
  });
  socket.on("joinRoom",({name,roomCode},cb)=>{
    const r=rooms.get(String(roomCode||"").toUpperCase());
    if(!r)return cb({ok:false,error:"Cette cabine n’existe pas."});
    if(r.started)return cb({ok:false,error:"La partie a déjà commencé."});
    if(r.players.size>=r.maxPlayers)return cb({ok:false,error:"L’équipage est au complet."});
    const nm=cleanName(name);if([...r.players.values()].some(p=>p.name.toLowerCase()===nm.toLowerCase()))return cb({ok:false,error:"Ce nom est déjà pris."});
    r.players.set(socket.id,{id:socket.id,name:nm,ready:false,role:null,secret:null,journal:["Bienvenue à bord de l’équipage."],stats:{votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0}});socket.join(r.code);cb({ok:true,room:pub(r)});sendState(r);
  });
  socket.on("toggleReady",()=>{const r=roomOf(socket.id);if(!r||r.started)return;r.players.get(socket.id).ready=!r.players.get(socket.id).ready;sendState(r);});
  socket.on("startGame",cb=>{
    const r=roomOf(socket.id);if(!r||r.hostId!==socket.id)return cb({ok:false,error:"Seul le capitaine peut lancer la partie."});
    if(r.players.size<3)return cb({ok:false,error:"Il faut au moins 3 joueurs."});
    if([...r.players.values()].some(p=>!p.ready))return cb({ok:false,error:"Tout le monde doit être prêt."});
    const ids=shuffle([...r.players.keys()]);const imp=new Set(ids.slice(0,r.impostors));
    r.missions=shuffle([...MISSIONS]).slice(0,4);r.missionDone=[false,false,false,false];r.votes.clear();r.voting=false;r.started=true;r.phase="game";r.startedAt=Date.now();
    for(const [id,p] of r.players){p.role=imp.has(id)?"IMPOSTEUR":"PIRATE";p.secret=p.role==="IMPOSTEUR"?IMPOSTOR_TASKS[crypto.randomInt(IMPOSTOR_TASKS.length)]:null;p.journal=["La partie commence."];p.stats={votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0};}
    broadcastPrivateRoles(r);
    io.to(r.code).emit("gameStarted",{missions:r.missions.map((m,i)=>({i,title:m.title,text:m.text,done:false})),meetingEveryMinutes:r.meetingEveryMinutes,meetingDurationMinutes:r.meetingDurationMinutes,nextMeetingAt:Date.now()+r.meetingEveryMinutes*60*1000});
    startNextMeetingTimer(r);scheduleEvent(r);cb({ok:true});
  });
  socket.on("completeMission",({index},cb)=>{const r=roomOf(socket.id);if(!r||!r.started||r.phase!=="game")return cb?.({ok:false,error:"Aucune mission active."});if(r.hostId!==socket.id)return cb?.({ok:false,error:"Seul le capitaine peut valider la mission."});if(index<0||index>=r.missionDone.length)return cb?.({ok:false,error:"Mission inconnue."});if(r.missionDone[index])return cb?.({ok:true});r.missionDone[index]=true;for(const p of r.players.values())p.stats.missionsValidated++;io.to(r.code).emit("missionUpdate",{index,done:true});addJournalAll(r,`Mission accomplie : ${r.missions[index].title}.`);if(r.missionDone.every(Boolean))io.to(r.code).emit("allMissionsDone");cb?.({ok:true});});
  socket.on("castVote",({targetId})=>{const r=roomOf(socket.id);if(!r||!r.started||r.phase!=="meeting"||!r.voting)return;if(!r.players.has(targetId)||r.votes.has(socket.id))return;r.votes.set(socket.id,targetId);io.to(socket.id).emit("voteRecorded");});
  socket.on("endGame",({winner="crew",reason="Le capitaine clôt l’expédition."},cb)=>{const r=roomOf(socket.id);if(!r||r.hostId!==socket.id)return cb?.({ok:false,error:"Seul le capitaine peut terminer la partie."});finishGame(r,winner,reason);cb?.({ok:true});});
  socket.on("getJournal",()=>{const r=roomOf(socket.id);if(!r)return;io.to(socket.id).emit("journalUpdate",{entries:r.players.get(socket.id).journal});});
  socket.on("saveNote",({text})=>{const r=roomOf(socket.id);if(!r)return;const p=r.players.get(socket.id);p.personalNote=String(text||"").slice(0,1000);});
  socket.on("resetGame",()=>{const r=roomOf(socket.id);if(!r||r.hostId!==socket.id)return;clearTimers(r);r.started=false;r.phase="lobby";r.missions=[];r.missionDone=[];r.votes.clear();for(const p of r.players.values()){p.role=null;p.secret=null;p.ready=false;p.journal=["La nouvelle manche est prête."];p.personalNote="";p.stats={votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0};}sendState(r);io.to(r.code).emit("gameReset");});
  socket.on("disconnect",()=>{const r=roomOf(socket.id);if(!r)return;r.players.delete(socket.id);if(r.players.size===0){clearTimers(r);rooms.delete(r.code);return;}if(r.hostId===socket.id)r.hostId=r.players.keys().next().value;sendState(r);});
});
server.listen(process.env.PORT||3000,"0.0.0.0",()=>console.log("Sea of Thieves Imposteur V3 lancé"));
