const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const crypto = require('crypto');
const path = require('path');
const app = express(), server = http.createServer(app), io = new Server(server);
app.use(express.static(path.join(__dirname,'public')));
app.get('/health',(_,res)=>res.json({ok:true}));
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
      "Briser le gouvernail",
      "Bloquer l'entrée de la grotte",
      "Voler le trésor",
      "Brûler les voiles du navire"
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
      "Briser le gouvernail du navire",
      "Bloquer la porte principale",
      "Voler le coffre",
      "Détruire la chaloupe de fuite"
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
      "Détruire la carte de l’épave",
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
      "Brûler les voiles du navire"
    ]
  }
];

const allowed={questMinutes:[10,15,20,30,45,60],meetingInterval:[4,5,7,10,15,20,30],meetingSeconds:[39,60,120,180,240]};
function settings(s={}){const out={};for(const [k,a]of Object.entries(allowed))out[k]=a.includes(Number(s[k]))?Number(s[k]):({questMinutes:30,meetingInterval:5,meetingSeconds:60})[k];out.impostors=Math.max(1,Math.min(9,Math.floor(Number(s.impostors)||1)));out.spyEnabled=s.spyEnabled!==false;return out;}
const codeOf=c=>String(c||'').trim().toUpperCase();
function tally(r){const counts={skip:0};for(const p of r.players.values())counts[p.id]=0;for(const target of r.meeting?.votes.values()||[])counts[target]=(counts[target]||0)+1;return counts;}
function snapshot(r,p){return {code:r.code,phase:r.phase,settings:r.settings,selfId:p.id,players:[...r.players.values()].map(x=>({id:x.id,name:x.name,avatar:x.avatar,ready:x.ready,captain:x.captain,connected:x.connected,eliminated:!!x.eliminated})),quest:r.quest?{title:r.quest.title,steps:r.quest.steps,progress:r.quest.progress,currentStep:r.quest.currentStep,required:r.quest.required}:null,timers:{totalLeft:Math.max(0,(r.totalEnd||0)-Date.now()),nextMeetingLeft:Math.max(0,(r.nextMeetingAt||0)-Date.now()),meetingLeft:Math.max(0,(r.meetingEnd||0)-Date.now())},me:{role:p.role||null,eliminated:!!p.eliminated,spyPowerAvailable:p.role==='spy'&&!p.spyUsed,spyMission:p.spyMission||null,secretMission:p.secretMission||null,missionStep:p.missionStep,sabotageCount:p.sabotageCount||0,actionLeft:Math.max(0,(p.actionAt||0)-Date.now()),emergencyUsed:!!p.emergencyUsed},meeting:r.meeting?{id:r.meeting.id,counts:tally(r),voted:r.meeting.votes.has(p.id)}:null,journal:r.journal,result:r.result,resultReason:r.resultReason,reveal:r.phase==='ended'?[...r.players.values()].map(x=>({name:x.name,role:x.role,mission:x.secretMission||'—',eliminated:!!x.eliminated,contributions:x.contributions||0,sabotages:x.sabotageCount||0,votes:x.voteCount||0})):null};}
function broadcast(r){for(const p of r.players.values())if(p.socketId)io.to(p.socketId).emit('state',snapshot(r,p));}
function log(r,text){r.journal.push(text);if(r.journal.length>100)r.journal.shift();}
function end(r,result,reason){if(r.phase==='ended')return;r.phase='ended';r.result=result;r.resultReason=reason;r.endedAt=Date.now();r.meeting=null;r.meetingEnd=null;r.nextMeetingAt=null;log(r,reason);broadcast(r);}
function win(r){if(r.quest.currentStep>=r.quest.steps.length){end(r,'pirates','La quête est accomplie.');return true;}if(![...r.players.values()].some(p=>p.role==='impostor'&&!p.eliminated)){end(r,'pirates','Tous les Imposteurs ont été éliminés.');return true;}return false;}
function meeting(r){r.phase='meeting';r.meeting={id:crypto.randomUUID(),votes:new Map()};r.meetingEnd=Date.now()+r.settings.meetingSeconds*1000;log(r,'Réunion du conseil : les votes restent secrets.');}
function finish(r){const entries=Object.entries(tally(r)).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);const [top,second]=entries;if(top&&top[0]!=='skip'&&(!second||top[1]>second[1])){const p=r.players.get(top[0]);if(p){p.eliminated=true;log(r,p.name+' a été éliminé. Son rôle reste secret.');}}else log(r,'Aucune élimination : égalité, abstention ou aucun vote.');r.meeting=null;r.meetingEnd=null;r.phase='playing';r.nextMeetingAt=Date.now()+r.settings.meetingInterval*60000;win(r);}
function tick(r){if(['playing','meeting'].includes(r.phase)){if(Date.now()>=r.totalEnd)return end(r,'impostors','Le temps de la quête est écoulé.');if(r.phase==='playing'&&Date.now()>=r.nextMeetingAt)meeting(r);if(r.phase==='meeting'&&Date.now()>=r.meetingEnd)finish(r);broadcast(r);}}
function start(r){const players=[...r.players.values()];for(let i=players.length-1;i>0;i--){const j=crypto.randomInt(i+1);[players[i],players[j]]=[players[j],players[i]];}r.quest=JSON.parse(JSON.stringify(QUESTS[crypto.randomInt(QUESTS.length)]));r.quest.currentStep=0;r.quest.progress=0;r.quest.required=Math.max(3,players.length*2);r.journal=[];players.forEach((p,i)=>{Object.assign(p,{role:i<r.settings.impostors?'impostor':'pirate',eliminated:false,spyUsed:false,spyMission:null,secretMission:null,contributions:0,sabotageCount:0,voteCount:0,actionAt:0,emergencyUsed:false});if(p.role==='impostor'){p.missionStep=i%r.quest.steps.length;p.secretMission=r.quest.sabotage[p.missionStep];}});if(r.settings.spyEnabled)players[r.settings.impostors].role='spy';r.phase='playing';r.totalEnd=Date.now()+r.settings.questMinutes*60000;r.nextMeetingAt=Date.now()+r.settings.meetingInterval*60000;log(r,'Départ de la quête : '+r.quest.title);}
function leave(socket,explicit=false){const r=rooms.get(socket.data.code),p=r?.players.get(socket.data.playerId);if(!p||p.socketId!==socket.id)return;p.connected=false;p.socketId=null;if(explicit&&r.phase==='lobby')r.players.delete(p.id);if(p.captain){p.captain=false;const next=[...r.players.values()].find(x=>x.connected);if(next)next.captain=true;}socket.leave(r.code);socket.data={};r.emptySince=[...r.players.values()].some(x=>x.connected)?null:Date.now();broadcast(r);}
io.on('connection',socket=>{
 function on(event,handler){socket.on(event,(data,cb)=>{try{const result=handler(data&&typeof data==='object'?data:{});if(typeof cb==='function')cb(result||{ok:true});}catch(e){if(typeof cb==='function')cb({ok:false,error:e.message});}});}
 function member(d){const r=rooms.get(codeOf(d.code));const p=r?.players.get(socket.data.playerId);if(!r||!p||socket.data.code!==r.code||p.socketId!==socket.id)throw Error('Rejoins une cabine avant de jouer.');tick(r);return [r,p];}
 function add(r,d,captain){leave(socket,true);const p={id:crypto.randomUUID(),token:crypto.randomBytes(24).toString('hex'),name:String(d.name||'Matelot').trim().slice(0,18)||'Matelot',avatar:AVATARS.includes(d.avatar)?d.avatar:'capitaine',captain,ready:false,connected:true,socketId:socket.id};r.players.set(p.id,p);r.emptySince=null;socket.data={code:r.code,playerId:p.id};socket.join(r.code);broadcast(r);return {ok:true,code:r.code,token:p.token};}
 on('createRoom',d=>{if(rooms.size>=500)throw Error('Le port est complet.');let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const r={code,phase:'lobby',players:new Map(),settings:settings(d.settings),quest:null,meeting:null,journal:[]};rooms.set(code,r);return add(r,d,true);});
 on('joinRoom',d=>{const r=rooms.get(codeOf(d.code));if(!r)throw Error('Cabine introuvable. Vérifie le code et utilise la même adresse de serveur.');if(r.phase!=='lobby')throw Error('La partie a déjà commencé.');if(r.players.size>=20)throw Error('Cabine complète.');return add(r,d,false);});
 on('resumeRoom',d=>{const r=rooms.get(codeOf(d.code));const p=[...r?.players.values()||[]].find(x=>x.token===d.token);if(!p)throw Error('La cabine a expiré.');if(p.connected)throw Error('Ce joueur est déjà connecté dans un autre onglet.');leave(socket,true);p.connected=true;p.socketId=socket.id;if(![...r.players.values()].some(x=>x.captain&&x.connected))p.captain=true;r.emptySince=null;socket.data={code:r.code,playerId:p.id};socket.join(r.code);tick(r);broadcast(r);return {ok:true,code:r.code,token:p.token};});
 on('leaveRoom',()=>{leave(socket,true);});
 on('ready',d=>{const[r,p]=member(d);if(r.phase!=='lobby')throw Error('La partie a commencé.');p.ready=!p.ready;broadcast(r);});
 on('updateSettings',d=>{const[r,p]=member(d);if(!p.captain||r.phase!=='lobby')throw Error('Réglages réservés au capitaine dans le salon.');r.settings=settings(d.settings);for(const x of r.players.values())x.ready=false;broadcast(r);});
 on('removePlayer',d=>{const[r,p]=member(d);const target=r.players.get(d.target);if(!p.captain||r.phase!=='lobby'||!target||target.connected)throw Error('Seul un joueur déconnecté peut être retiré du salon par le capitaine.');r.players.delete(target.id);broadcast(r);});
 on('startGame',d=>{const[r,p]=member(d);if(!p.captain||r.phase!=='lobby')throw Error('Seul le capitaine peut lancer depuis le salon.');if(r.players.size<3)throw Error('Il faut au moins 3 joueurs.');if(r.settings.impostors>=r.players.size/2)throw Error('Les Imposteurs doivent être moins nombreux que les Pirates.');if(![...r.players.values()].every(x=>x.connected&&(x.ready||x.captain)))throw Error('Tous les joueurs doivent être connectés et prêts.');start(r);broadcast(r);});
 on('action',d=>{const[r,p]=member(d);if(r.phase!=='playing'||p.eliminated)throw Error('Action indisponible.');if(p.actionAt>Date.now())throw Error('Attends avant la prochaine action.');if(d.action==='advanceQuest'){r.quest.progress++;p.contributions++;p.actionAt=Date.now()+15000;if(r.quest.progress>=r.quest.required){log(r,'Étape accomplie : '+r.quest.steps[r.quest.currentStep]);r.quest.currentStep++;r.quest.progress=0;win(r);}}else if(d.action==='sabotage'){if(p.role!=='impostor')throw Error('Action indisponible.');if(r.quest.currentStep!==p.missionStep)throw Error('Cette mission concerne une autre étape.');p.sabotageCount++;p.actionAt=Date.now()+30000;r.quest.progress=Math.max(0,r.quest.progress-2);log(r,'Un sabotage compromet l’étape en cours ('+p.sabotageCount+'/3).');if(p.sabotageCount>=3)end(r,'impostors','La quête a échoué : '+p.secretMission+'.');}else throw Error('Action inconnue.');broadcast(r);});
 on('callMeeting',d=>{const[r,p]=member(d);if(r.phase!=='playing'||p.eliminated||p.emergencyUsed)throw Error('Une seule réunion d’urgence par joueur et par partie.');p.emergencyUsed=true;meeting(r);broadcast(r);});
 on('vote',d=>{const[r,p]=member(d);if(r.phase!=='meeting'||p.eliminated||r.meeting.votes.has(p.id))throw Error('Vote indisponible ou déjà enregistré.');if(d.target!=='skip'&&(!r.players.has(d.target)||r.players.get(d.target).eliminated))throw Error('Cible invalide.');r.meeting.votes.set(p.id,d.target);p.voteCount++;broadcast(r);});
 on('spyReveal',d=>{const[r,p]=member(d);if(!['playing','meeting'].includes(r.phase)||p.eliminated||p.role!=='spy'||p.spyUsed)throw Error('Pouvoir indisponible.');const candidates=[...r.players.values()].filter(x=>x.role==='impostor'&&!x.eliminated);if(!candidates.length)throw Error('Aucune mission disponible.');p.spyUsed=true;p.spyMission=candidates[crypto.randomInt(candidates.length)].secretMission;broadcast(r);return {ok:true,mission:p.spyMission};});
 socket.on('disconnect',()=>leave(socket));
});
const ticker=setInterval(()=>{for(const r of rooms.values()){tick(r);if((r.emptySince&&Date.now()-r.emptySince>1800000)||(r.endedAt&&Date.now()-r.endedAt>7200000))rooms.delete(r.code);}},1000);
if(require.main===module)server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Sea Imposteur — serveur prêt'));
module.exports={server,io,rooms,tick,finish,start,snapshot,ticker};
