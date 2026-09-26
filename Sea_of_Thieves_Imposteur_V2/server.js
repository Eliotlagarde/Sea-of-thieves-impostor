
const express = require("express");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const rooms = new Map();

const MISSIONS = [
  {title:"La carte oubliée", text:"Trouvez un indice et rapportez-le à bord sans perdre de temps."},
  {title:"Le coffre maudit", text:"Récupérez un trésor et sécurisez-le sur le navire."},
  {title:"Les eaux dangereuses", text:"Atteignez une île désignée par le capitaine et revenez au bateau."},
  {title:"Le butin final", text:"Ramenez le dernier trésor et préparez la vente."},
  {title:"L'épreuve du canon", text:"Effectuez une activité de combat ou de tir choisie par l'équipage."},
  {title:"Le détour suspect", text:"Visitez un point supplémentaire avant de terminer l'expédition."}
];

const IMPOSTOR_TASKS = [
  "Fais perdre du temps à l'équipage sans paraître volontairement inutile.",
  "Convaincs le groupe de prendre au moins un détour avant la prochaine mission.",
  "Fais en sorte qu'un objectif soit retardé, tout en continuant à prétendre aider.",
  "Mets discrètement l'équipage dans une situation compliquée puis fais comme si c'était une erreur.",
  "Sème un doute crédible sur une décision importante sans attirer trop l'attention."
];

function cleanName(n){return String(n||"Pirate").trim().slice(0,18)||"Pirate";}
function makeCode(){
  let c; do c=crypto.randomBytes(3).toString("hex").toUpperCase(); while(rooms.has(c)); return c;
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function roomOf(id){for(const r of rooms.values()) if(r.players.has(id)) return r;}
function pub(r){
  return {
    code:r.code, hostId:r.hostId, started:r.started, maxPlayers:r.maxPlayers,
    impostors:r.impostors, missionCount:r.missions.length, meetingMinutes:r.meetingMinutes,
    players:[...r.players.values()].map(p=>({id:p.id,name:p.name,ready:p.ready}))
  };
}
function sendState(r){io.to(r.code).emit("roomState",pub(r));}

io.on("connection", socket=>{
  socket.on("createRoom",({name,maxPlayers=4,impostors=1,meetingMinutes=2},cb)=>{
    maxPlayers=Math.max(3,Math.min(20,Number(maxPlayers)||4));
    impostors=Math.max(1,Math.min(maxPlayers-1,Number(impostors)||1));
    meetingMinutes=Math.max(1,Math.min(5,Number(meetingMinutes)||2));
    const r={code:makeCode(),hostId:socket.id,maxPlayers,impostors,meetingMinutes,started:false,
      players:new Map(),missions:[],missionIndex:0,missionDone:[],votes:new Map(),voting:false};
    r.players.set(socket.id,{id:socket.id,name:cleanName(name),ready:false,role:null,secret:null});
    rooms.set(r.code,r); socket.join(r.code); cb({ok:true,room:pub(r)}); sendState(r);
  });

  socket.on("joinRoom",({name,roomCode},cb)=>{
    const r=rooms.get(String(roomCode||"").toUpperCase());
    if(!r)return cb({ok:false,error:"Cette cabine n'existe pas."});
    if(r.started)return cb({ok:false,error:"La partie a déjà commencé."});
    if(r.players.size>=r.maxPlayers)return cb({ok:false,error:"L'équipage est au complet."});
    const nm=cleanName(name);
    if([...r.players.values()].some(p=>p.name.toLowerCase()===nm.toLowerCase()))
      return cb({ok:false,error:"Ce nom est déjà pris."});
    r.players.set(socket.id,{id:socket.id,name:nm,ready:false,role:null,secret:null});
    socket.join(r.code); cb({ok:true,room:pub(r)}); sendState(r);
  });

  socket.on("toggleReady",()=>{
    const r=roomOf(socket.id); if(!r||r.started)return;
    r.players.get(socket.id).ready=!r.players.get(socket.id).ready; sendState(r);
  });

  socket.on("startGame",cb=>{
    const r=roomOf(socket.id);
    if(!r||r.hostId!==socket.id)return cb({ok:false,error:"Seul le capitaine peut lancer la partie."});
    if(r.players.size<3)return cb({ok:false,error:"Il faut au moins 3 joueurs."});
    if([...r.players.values()].filter(p=>p.ready).length<r.players.size)
      return cb({ok:false,error:"Tout le monde doit être prêt."});

    const ids=shuffle([...r.players.keys()]);
    const imp=new Set(ids.slice(0,r.impostors));
    const missions=shuffle([...MISSIONS]).slice(0,4);
    r.missions=missions;r.missionIndex=0;r.missionDone=[false,false,false,false];r.started=true;
    for(const [id,p] of r.players){
      p.role=imp.has(id)?"IMPOSTEUR":"PIRATE";
      p.secret=p.role==="IMPOSTEUR"?IMPOSTOR_TASKS[crypto.randomInt(IMPOSTOR_TASKS.length)]:null;
      io.to(id).emit("privateRole",{role:p.role,secret:p.secret});
    }
    io.to(r.code).emit("gameStarted",{
      missions:r.missions.map((m,i)=>({i,title:m.title,text:m.text,done:false})),
      meetingMinutes:r.meetingMinutes
    });
    cb({ok:true});
  });

  socket.on("completeMission",({index},cb)=>{
    const r=roomOf(socket.id); if(!r||!r.started)return;
    if(r.hostId!==socket.id)return cb?.({ok:false,error:"Seul le capitaine peut valider la mission."});
    if(index>=0&&index<r.missionDone.length) r.missionDone[index]=true;
    io.to(r.code).emit("missionUpdate",{index,done:true});
    cb?.({ok:true});
  });

  socket.on("startVote",()=>{
    const r=roomOf(socket.id); if(!r||!r.started)return;
    r.votes.clear();r.voting=true;
    io.to(r.code).emit("voteStarted",{players:[...r.players.values()].map(p=>({id:p.id,name:p.name}))});
  });

  socket.on("castVote",({targetId})=>{
    const r=roomOf(socket.id); if(!r||!r.voting)return;
    if(!r.players.has(targetId)||r.votes.has(socket.id))return;
    r.votes.set(socket.id,targetId);
    io.to(socket.id).emit("voteRecorded");
    if(r.votes.size===r.players.size){
      const tally={}; for(const t of r.votes.values()) tally[t]=(tally[t]||0)+1;
      r.voting=false;
      io.to(r.code).emit("voteResult",{tally:Object.entries(tally).map(([id,count])=>({id,name:r.players.get(id).name,count}))});
    }
  });

  socket.on("resetGame",()=>{
    const r=roomOf(socket.id); if(!r||r.hostId!==socket.id)return;
    r.started=false;r.missions=[];r.missionDone=[];r.missionIndex=0;r.voting=false;r.votes.clear();
    for(const p of r.players.values()){p.role=null;p.secret=null;p.ready=false;}
    io.to(r.code).emit("gameReset");sendState(r);
  });

  socket.on("disconnect",()=>{
    const r=roomOf(socket.id); if(!r)return;
    r.players.delete(socket.id);
    if(r.players.size===0){rooms.delete(r.code);return;}
    if(r.hostId===socket.id)r.hostId=r.players.keys().next().value;
    sendState(r);
  });
});
server.listen(process.env.PORT||3000,"0.0.0.0",()=>console.log("Sea of Thieves Imposteur V2 lancé"));
