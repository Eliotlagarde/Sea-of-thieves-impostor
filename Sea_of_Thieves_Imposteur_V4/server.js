const express = require("express");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const rooms = new Map();

// V4 : missions d'expédition communes, sans mini-puzzles.
const MISSIONS = [
  {title:"La carte perdue", text:"Retrouvez la carte oubliée et ramenez-la à bord avant la prochaine réunion."},
  {title:"Le coffre des récifs", text:"Localisez le coffre indiqué par la carte et mettez le butin en sécurité."},
  {title:"La clé du fort", text:"Explorez l’île et récupérez la clé nécessaire pour ouvrir le passage du fort."},
  {title:"La cargaison disparue", text:"Retrouvez la cargaison volée et ramenez-la au navire sans abandonner l’équipage."},
  {title:"Le trésor de l’île noire", text:"Atteignez le dernier repère et préparez l’équipage à récupérer le trésor final."},
  {title:"Le pavillon mystérieux", text:"Identifiez le navire portant le pavillon indiqué dans le journal de bord."},
  {title:"L’escale de l’avant-poste", text:"Rejoignez l’avant-poste lointain et revenez avec l’indice du gardien."},
  {title:"Les eaux dangereuses", text:"Traversez la zone indiquée puis confirmez le passage au capitaine."},
  {title:"Le fragment de carte", text:"Retrouvez le fragment manquant et replacez-le sur la carte maritime."},
  {title:"Réparer le navire", text:"Terminez les préparatifs du navire afin de pouvoir poursuivre l’expédition."}
];

const IMPOSTOR_TASKS = [
  "Retarder discrètement une mission importante sans paraître volontairement inutile.",
  "Convaincre l’équipage de faire un détour avant la prochaine réunion.",
  "Faire perdre du temps à l’expédition tout en donnant l’impression d’aider.",
  "Créer un doute crédible autour d’une décision importante sans attirer l’attention.",
  "Pousser l’équipage à changer de priorité au moment où la quête avance.",
  "Faire croire qu’un indice est moins important qu’il ne l’est réellement.",
  "Provoquer une discussion inutile lorsque l’équipage devrait se concentrer sur la quête.",
  "Faire accuser un autre membre de l’équipage sans révéler ton propre objectif."
];

const RANDOM_EVENTS = [
  {title:"Tempête en approche", text:"Le ciel se couvre. Le journal signale une mer difficile pour la prochaine étape."},
  {title:"Brouillard sur les mers", text:"Une brume mystérieuse enveloppe l’expédition. Gardez vos repères."},
  {title:"Une pièce porte-bonheur", text:"Une vieille pièce est retrouvée à bord. Elle est ajoutée au journal du capitaine."},
  {title:"Le perroquet s’est échappé", text:"Un perroquet disparaît dans les cordages. L’équipage doit rester vigilant."},
  {title:"Une carte étrange", text:"Un fragment de carte apparaît parmi le butin. Personne ne sait qui l’a posé là."},
  {title:"Mouillage imprévu", text:"L’expédition est ralentie par un mouillage imprévu. Chaque minute compte."
  }
];

function cleanName(n){return String(n||"Pirate").trim().slice(0,18)||"Pirate";}
function makeCode(){let c;do c=crypto.randomBytes(3).toString("hex").toUpperCase();while(rooms.has(c));return c;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function roomOf(id){for(const r of rooms.values())if(r.players.has(id))return r;}
function publicPlayer(p){return {id:p.id,name:p.name,ready:p.ready,caught:p.caught};}
function pub(r){return {code:r.code,hostId:r.hostId,started:r.started,maxPlayers:r.maxPlayers,impostors:r.impostors,missionCount:r.missions.length,meetingEveryMinutes:r.meetingEveryMinutes,meetingDurationMinutes:r.meetingDurationMinutes,phase:r.phase,players:[...r.players.values()].map(publicPlayer),questEndsAt:r.questEndsAt,questDurationMinutes:r.questDurationMinutes,caughtCount:[...r.players.values()].filter(p=>p.caught).length};}
function sendState(r){if(!r)return;io.to(r.code).emit("roomState",pub(r));}
function clearTimers(r){if(r.nextMeetingTimer)clearTimeout(r.nextMeetingTimer);if(r.meetingTimer)clearTimeout(r.meetingTimer);if(r.eventTimer)clearTimeout(r.eventTimer);if(r.questTimer)clearTimeout(r.questTimer);r.nextMeetingTimer=r.meetingTimer=r.eventTimer=r.questTimer=null;}
function addJournal(r,id,entry){const p=r.players.get(id);if(!p)return;p.journal.push(entry);io.to(id).emit("journalUpdate",{entries:p.journal});}
function addJournalAll(r,entry){for(const p of r.players.values())addJournal(r,p.id,entry);}
function broadcastPrivateRoles(r){for(const p of r.players.values())io.to(p.id).emit("privateRole",{role:p.role,secret:p.secret,specialRole:p.specialRole,spyUsed:p.spyUsed});}
function sendQuestClock(r){io.to(r.code).emit("questClock",{endsAt:r.questEndsAt});}
function startNextMeetingTimer(r){if(!r.started||r.phase!=="game")return;clearTimeout(r.nextMeetingTimer);const ms=r.meetingEveryMinutes*60*1000;r.nextMeetingAt=Date.now()+ms;io.to(r.code).emit("nextMeeting",{endsAt:r.nextMeetingAt});r.nextMeetingTimer=setTimeout(()=>startMeeting(r),ms);}
function scheduleEvent(r){if(!r.started||r.phase!=="game")return;clearTimeout(r.eventTimer);const ms=(60+crypto.randomInt(61))*1000;r.eventTimer=setTimeout(()=>{if(!r.started||r.phase!=="game")return;const e=RANDOM_EVENTS[crypto.randomInt(RANDOM_EVENTS.length)];io.to(r.code).emit("randomEvent",e);addJournalAll(r,`Événement : ${e.title}`);for(const p of r.players.values())p.stats.eventsSeen++;scheduleEvent(r);},ms);}
function startMeeting(r){if(!r.started)return;r.phase="meeting";clearTimeout(r.nextMeetingTimer);clearTimeout(r.eventTimer);r.nextMeetingTimer=r.eventTimer=null;r.votes.clear();r.voting=true;r.meetingEndsAt=Date.now()+r.meetingDurationMinutes*60*1000;io.to(r.code).emit("meetingStarted",{endsAt:r.meetingEndsAt,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,caught:p.caught}))});addJournalAll(r,"Réunion d’équipage ouverte.");r.meetingTimer=setTimeout(()=>finishMeeting(r),r.meetingDurationMinutes*60*1000);}
function finishMeeting(r){
  if(!r.started||r.phase!=="meeting")return;
  r.voting=false;
  const tally={};
  for(const target of r.votes.values())tally[target]=(tally[target]||0)+1;
  const result=[...r.players.values()].map(p=>({id:p.id,name:p.name,count:tally[p.id]||0,caught:p.caught})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  r.lastVoteResult=result;
  const eligible=result.filter(x=>!x.caught);
  const highest=eligible.length?Math.max(...eligible.map(x=>x.count)):0;
  const leaders=eligible.filter(x=>x.count===highest&&highest>0);
  let verdict=null;
  if(leaders.length===1){
    const target=r.players.get(leaders[0].id);
    if(target && !target.caught){
      target.caught=true;
      verdict={targetId:target.id,targetName:target.name,wasImpostor:target.role==="IMPOSTEUR",message:target.role==="IMPOSTEUR"?`${target.name} a été démasqué : c’était un Imposteur.`:`${target.name} a été accusé à tort. L’équipage perd un membre actif.`};
      addJournalAll(r,`Verdict : ${verdict.message}`);
    }
  } else if(leaders.length>1){
    verdict={tie:true,message:"Égalité : aucune personne n’est démasquée cette fois."};
    addJournalAll(r,"Verdict : égalité, aucune personne n’est démasquée.");
  }
  for(const p of r.players.values()){p.stats.meetings++;if(r.votes.has(p.id))p.stats.votesCast++;}
  io.to(r.code).emit("voteResult",{tally:result,verdict});
  const activeImpostors=[...r.players.values()].filter(p=>p.role==="IMPOSTEUR"&&!p.caught);
  if(activeImpostors.length===0){finishGame(r,"crew","Tous les Imposteurs ont été démasqués.");return;}
  r.phase="game";
  io.to(r.code).emit("gameResumed",{nextMeetingAt:Date.now()+r.meetingEveryMinutes*60*1000});
  startNextMeetingTimer(r);scheduleEvent(r);
}
function finishGame(r,winner,reason){
  if(!r.started)return;
  r.started=false;r.phase="ended";clearTimers(r);
  const roles=[...r.players.values()].map(p=>({id:p.id,name:p.name,role:p.role,secret:p.secret,specialRole:p.specialRole,caught:p.caught,stats:p.stats}));
  const missionDone=r.missionDone.filter(Boolean).length;
  const titles={};
  for(const p of r.players.values()){
    const candidates=[];
    if(p.role==="IMPOSTEUR")candidates.push("Maître du mensonge");
    if(p.specialRole==="ESPION")candidates.push("Œil de l’équipage");
    if(p.stats.votesCast>=2)candidates.push("Détective des mers");
    if(p.stats.missionsValidated>=2)candidates.push("Vieux loup de mer");
    if(p.stats.eventsSeen>=2)candidates.push("Explorateur");
    if(!candidates.length)candidates.push("Moussaillon");
    titles[p.id]=candidates[crypto.randomInt(candidates.length)];
  }
  io.to(r.code).emit("gameEnded",{winner,reason,roles,missionDone,missionTotal:r.missions.length,duration:Math.max(1,Math.round((Date.now()-r.startedAt)/60000)),titles,votes:r.lastVoteResult||[],spyReveal:r.spyReveal||null});
}

io.on("connection",socket=>{
  socket.on("createRoom",({name,maxPlayers=4,impostors=1,meetingEveryMinutes=5,meetingDurationMinutes=2},cb)=>{
    maxPlayers=Math.max(3,Math.min(20,Number(maxPlayers)||4));
    impostors=Math.max(1,Math.min(Math.max(1,maxPlayers-1),Number(impostors)||1));
    meetingEveryMinutes=Math.max(1,Math.min(30,Number(meetingEveryMinutes)||5));
    meetingDurationMinutes=Math.max(1,Math.min(5,Number(meetingDurationMinutes)||2));
    const questDurationMinutes=Math.max(10,meetingEveryMinutes*4);
    const r={code:makeCode(),hostId:socket.id,maxPlayers,impostors,meetingEveryMinutes,meetingDurationMinutes,questDurationMinutes,started:false,phase:"lobby",players:new Map(),missions:[],missionDone:[],votes:new Map(),voting:false,nextMeetingTimer:null,meetingTimer:null,eventTimer:null,questTimer:null,startedAt:0,questEndsAt:0,lastVoteResult:[],spyReveal:null};
    r.players.set(socket.id,{id:socket.id,name:cleanName(name),ready:false,caught:false,role:null,specialRole:null,secret:null,spyUsed:false,journal:["Bienvenue à bord, capitaine."],personalNote:"",stats:{votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0}});
    rooms.set(r.code,r);socket.join(r.code);cb({ok:true,room:pub(r)});sendState(r);
  });
  socket.on("joinRoom",({name,roomCode},cb)=>{
    const r=rooms.get(String(roomCode||"").toUpperCase());
    if(!r)return cb({ok:false,error:"Cette cabine n’existe pas."});
    if(r.started)return cb({ok:false,error:"La partie a déjà commencé."});
    if(r.players.size>=r.maxPlayers)return cb({ok:false,error:"L’équipage est au complet."});
    const nm=cleanName(name);if([...r.players.values()].some(p=>p.name.toLowerCase()===nm.toLowerCase()))return cb({ok:false,error:"Ce nom est déjà pris."});
    r.players.set(socket.id,{id:socket.id,name:nm,ready:false,caught:false,role:null,specialRole:null,secret:null,spyUsed:false,journal:["Bienvenue à bord de l’équipage."],personalNote:"",stats:{votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0}});socket.join(r.code);cb({ok:true,room:pub(r)});sendState(r);
  });
  socket.on("toggleReady",()=>{const r=roomOf(socket.id);if(!r||r.started)return;r.players.get(socket.id).ready=!r.players.get(socket.id).ready;sendState(r);});
  socket.on("startGame",cb=>{
    const r=roomOf(socket.id);if(!r||r.hostId!==socket.id)return cb({ok:false,error:"Seul le capitaine peut lancer la partie."});
    if(r.players.size<3)return cb({ok:false,error:"Il faut au moins 3 joueurs."});
    if([...r.players.values()].some(p=>!p.ready))return cb({ok:false,error:"Tout le monde doit être prêt."});
    const ids=shuffle([...r.players.keys()]);const imp=new Set(ids.slice(0,r.impostors));
    const pirates=ids.filter(id=>!imp.has(id));const spyId=pirates[crypto.randomInt(pirates.length)];const impTaskPool=shuffle([...IMPOSTOR_TASKS]);let impTaskIndex=0;
    r.missions=shuffle([...MISSIONS]).slice(0,5);r.missionDone=[false,false,false,false,false];r.votes.clear();r.voting=false;r.started=true;r.phase="game";r.startedAt=Date.now();r.questEndsAt=Date.now()+r.questDurationMinutes*60*1000;r.spyReveal=null;
    for(const [id,p] of r.players){
      p.role=imp.has(id)?"IMPOSTEUR":"PIRATE";p.specialRole=id===spyId?"ESPION":null;p.secret=p.role==="IMPOSTEUR"?impTaskPool[impTaskIndex++ % impTaskPool.length]:null;p.spyUsed=false;p.caught=false;p.journal=["La partie commence. La quête du trésor est lancée."];p.personalNote="";p.stats={votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0};
    }
    broadcastPrivateRoles(r);
    io.to(r.code).emit("gameStarted",{missions:r.missions.map((m,i)=>({i,title:m.title,text:m.text,done:false})),meetingEveryMinutes:r.meetingEveryMinutes,meetingDurationMinutes:r.meetingDurationMinutes,nextMeetingAt:Date.now()+r.meetingEveryMinutes*60*1000,questEndsAt:r.questEndsAt,questDurationMinutes:r.questDurationMinutes});
    r.questTimer=setTimeout(()=>{if(r.started)finishGame(r,"impostor","Le temps de l’expédition est écoulé : l’équipage n’a pas suffisamment progressé dans la quête.");},r.questDurationMinutes*60*1000);
    startNextMeetingTimer(r);scheduleEvent(r);cb({ok:true});
  });
  socket.on("completeMission",({index},cb)=>{
    const r=roomOf(socket.id);if(!r||!r.started||r.phase!=="game")return cb?.({ok:false,error:"Aucune mission active."});
    if(r.hostId!==socket.id)return cb?.({ok:false,error:"Seul le capitaine peut valider la mission."});
    if(index<0||index>=r.missionDone.length)return cb?.({ok:false,error:"Mission inconnue."});
    if(r.missionDone[index])return cb?.({ok:true});
    r.missionDone[index]=true;for(const p of r.players.values())p.stats.missionsValidated++;
    io.to(r.code).emit("missionUpdate",{index,done:true});addJournalAll(r,`Mission accomplie : ${r.missions[index].title}.`);
    if(r.missionDone.every(Boolean))finishGame(r,"crew","La quête commune est terminée : le trésor a été retrouvé.");
    cb?.({ok:true});
  });
  socket.on("spyReveal",cb=>{
    const r=roomOf(socket.id);const p=r?.players.get(socket.id);
    if(!r||!r.started||r.phase!=="game"||!p)return cb?.({ok:false,error:"Action indisponible."});
    if(p.role!=="PIRATE"||p.specialRole!=="ESPION")return cb?.({ok:false,error:"Ce pouvoir est réservé à l’Espion."});
    if(p.spyUsed)return cb?.({ok:false,error:"Le pouvoir de l’Espion a déjà été utilisé."});
    const targets=[...r.players.values()].filter(x=>x.role==="IMPOSTEUR"&&!x.caught&&x.secret);
    if(!targets.length)return cb?.({ok:false,error:"Aucun objectif d’Imposteur actif à découvrir."});
    const target=targets[crypto.randomInt(targets.length)];p.spyUsed=true;r.spyReveal={mission:target.secret,at:Date.now()};
    io.to(socket.id).emit("spyRevealResult",{mission:target.secret});addJournal(r,socket.id,"Pouvoir de l’Espion utilisé : un objectif secret d’Imposteur a été découvert, sans révéler son identité.");broadcastPrivateRoles(r);cb?.({ok:true});
  });
  socket.on("castVote",({targetId})=>{const r=roomOf(socket.id);if(!r||!r.started||r.phase!=="meeting"||!r.voting)return;const voter=r.players.get(socket.id);if(!voter||voter.caught)return;if(!r.players.has(targetId)||r.votes.has(socket.id)||r.players.get(targetId).caught)return;r.votes.set(socket.id,targetId);io.to(socket.id).emit("voteRecorded");});
  socket.on("endGame",({winner="crew",reason="Le capitaine clôt l’expédition."},cb)=>{const r=roomOf(socket.id);if(!r||r.hostId!==socket.id)return cb?.({ok:false,error:"Seul le capitaine peut terminer la partie."});finishGame(r,winner,reason);cb?.({ok:true});});
  socket.on("getJournal",()=>{const r=roomOf(socket.id);if(!r)return;io.to(socket.id).emit("journalUpdate",{entries:r.players.get(socket.id).journal});});
  socket.on("saveNote",({text})=>{const r=roomOf(socket.id);if(!r)return;const p=r.players.get(socket.id);p.personalNote=String(text||"").slice(0,1000);});
  socket.on("resetGame",()=>{const r=roomOf(socket.id);if(!r||r.hostId!==socket.id)return;clearTimers(r);r.started=false;r.phase="lobby";r.missions=[];r.missionDone=[];r.votes.clear();r.questEndsAt=0;r.spyReveal=null;for(const p of r.players.values()){p.role=null;p.specialRole=null;p.secret=null;p.spyUsed=false;p.caught=false;p.ready=false;p.journal=["La nouvelle manche est prête."];p.personalNote="";p.stats={votesCast:0,meetings:0,missionsValidated:0,eventsSeen:0};}sendState(r);io.to(r.code).emit("gameReset");});
  socket.on("disconnect",()=>{const r=roomOf(socket.id);if(!r)return;r.players.delete(socket.id);if(r.players.size===0){clearTimers(r);rooms.delete(r.code);return;}if(r.hostId===socket.id)r.hostId=r.players.keys().next().value;sendState(r);});
});

server.listen(process.env.PORT||3000,"0.0.0.0",()=>console.log("Sea of Thieves Imposteur V4 lancé"));
