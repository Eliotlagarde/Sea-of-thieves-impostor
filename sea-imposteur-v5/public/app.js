
const socket = io();
let state = null, roomCode = null, selectedAvatar = "capitaine", selectedVote = null;
const icons = {capitaine:"☠",navigatrice:"🧭",cartographe:"🗺️","quartier-maitre":"⚓",vigie:"🔭",canonnier:"💣",charpentier:"🔨",medecin:"⚕"};
const labels = {capitaine:"Capitaine",navigatrice:"Navigatrice",cartographe:"Cartographe","quartier-maitre":"Quartier-maître",vigie:"Vigie",canonnier:"Canonnier",charpentier:"Charpentier",medecin:"Médecin"};

function $(id){return document.getElementById(id)}
function showScreen(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active")}
function goHome(){roomCode=null;state=null;$("roomBadge").classList.add("hidden");showScreen("home")}
function openCreate(){showScreen("create")}
function showCreateForm(){renderAvatars();showScreen("createForm")}
function openHelp(){showScreen("help")}
function quitGame(){location.href="about:blank"}
function toast(msg){$("toast").textContent=msg;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2600)}
function renderAvatars(){ $("avatars").innerHTML=Object.entries(icons).map(([k,v])=>`<button class="avatar-choice ${k===selectedAvatar?"selected":""}" onclick="selectAvatar('${k}')">${v}</button>`).join("") }
function selectAvatar(a){selectedAvatar=a;renderAvatars()}
function settingsFromForm(){return{
  questMinutes:+$("questMinutes").value,
  meetingInterval:+$("meetingInterval").value,
  meetingSeconds:+$("meetingSeconds").value,
  impostors:+$("impostors").value,
  spyEnabled:$("spyEnabled").checked
}}
function createRoom(){
  const name=$("playerName").value.trim(); if(!name)return toast("Entre ton nom.");
  socket.emit("createRoom",{name,avatar:selectedAvatar,settings:settingsFromForm()},res=>{
    if(!res.ok)return toast(res.error||"Impossible de créer la cabine.");
    roomCode=res.code; $("roomBadge").textContent="Cabine "+roomCode;$("roomBadge").classList.remove("hidden");showScreen("lobby");
  });
}
function joinRoom(){
  const code=$("joinCode").value.trim().toUpperCase(); if(!code)return toast("Entre le code.");
  const name=prompt("Ton nom ?","Matelot"); if(!name)return;
  renderAvatars();
  const avatar=Object.keys(icons)[Math.floor(Math.random()*Object.keys(icons).length)];
  socket.emit("joinRoom",{code,name,avatar},res=>{
    if(!res.ok)return toast(res.error||"Impossible de rejoindre.");
    roomCode=res.code;$("roomBadge").textContent="Cabine "+roomCode;$("roomBadge").classList.remove("hidden");showScreen("lobby");
  });
}
function toggleReady(){socket.emit("ready",{code:roomCode})}
function startGame(){socket.emit("startGame",{code:roomCode},res=>{if(!res.ok)toast(res.error)})}
function copyCode(){navigator.clipboard?.writeText(roomCode);toast("Code copié.")}
function leaveRoom(){location.reload()}
function showTab(tab){
  ["quest","journal","role","spy"].forEach(x=>$(`${x}Tab`).classList.add("hidden"));
  $(`${tab}Tab`).classList.remove("hidden");
}
function advanceQuest(){socket.emit("action",{code:roomCode,action:"advanceQuest"})}
function callMeeting(){socket.emit("callMeeting",{code:roomCode})}
function spyReveal(){
  socket.emit("spyReveal",{code:roomCode},res=>{
    if(!res.ok)return toast(res.error||"Pouvoir indisponible.");
    $("spyResult").textContent="Mission d'Imposteur découverte : "+res.mission;
    $("spyBtn").disabled=true;$("spyBtn").textContent="Pouvoir utilisé";
  });
}
function submitVote(){
  if(!selectedVote)return toast("Choisis un joueur.");
  socket.emit("vote",{code:roomCode,target:selectedVote},res=>{if(res.ok)toast("Vote enregistré.")})
}
function render(s){
  state=s;
  if(s.phase==="lobby"){showScreen("lobby");renderLobby(s)}
  else if(s.phase==="playing"){showScreen("game");renderGame(s)}
  else if(s.phase==="meeting"){showScreen("meeting");renderMeeting(s)}
  else if(s.phase==="ended"){showScreen("ended");renderEnded(s)}
}
function renderLobby(s){
  $("roomCode").textContent=s.code;$("count").textContent=`${s.players.length}/20`;
  $("settingSummary").innerHTML=`Quête : <b>${s.settings.questMinutes} min</b><br>Réunion toutes les <b>${s.settings.meetingInterval} min</b><br>Réunion : <b>${s.settings.meetingSeconds<60?s.settings.meetingSeconds+" sec":s.settings.meetingSeconds/60+" min"}</b><br>Espion : <b>${s.settings.spyEnabled?"Activé":"Désactivé"}</b><br>Imposteurs : <b>${s.settings.impostors}</b>`;
  $("players").innerHTML=s.players.map(p=>`<div class="player-row ${p.captain?"captain":""}"><div class="avatar-mini">${icons[p.avatar]||"☠"}</div><div><b>${escapeHtml(p.name)}</b>${p.captain?" 👑":""}</div><div class="status">${p.ready||p.captain?"● Prêt":"○ En attente"}</div></div>`).join("");
  const me=s.players.find(p=>p.id===socket.id); if(me){$("readyBtn").classList.toggle("hidden",!!me.captain);$("startBtn").classList.toggle("hidden",!me.captain)}
}
function renderGame(s){
  $("questTitle").textContent=s.quest.title;
  $("currentStep").textContent=s.quest.steps[s.quest.currentStep]||"Quête terminée";
  $("progressBar").style.width=Math.min(100,s.quest.progress/3*100)+"%";
  $("steps").innerHTML=s.quest.steps.map((x,i)=>`<li class="${i<s.quest.currentStep?"done":i===s.quest.currentStep?"current":""}">${i+1}. ${escapeHtml(x)}</li>`).join("");
  const me=s.me;
  $("myRole").innerHTML=`<div class="role-name">${me.role==="impostor"?"☠️ Imposteur":me.role==="spy"?"🕵️ Espion":"🏴‍☠️ Pirate"}</div><p>${me.role==="impostor"?"Objectif secret :":me.role==="spy"?"Tu es un Pirate avec un pouvoir secret.":"Fais progresser la quête avec l’équipage."}</p>${me.secretMission?`<div class="spy-result">${escapeHtml(me.secretMission)}</div>`:""}`;
  $("spyNav").classList.toggle("hidden",me.role!=="spy");
  $("advanceBtn").disabled=me.eliminated || me.role==="impostor";
  $("nextMeeting").textContent=fmt(s.timers.nextMeetingLeft);
  $("questTimer").textContent=fmt(s.timers.totalLeft);
  if(me.role==="spy" && !me.spyPowerAvailable && !$("spyResult").textContent) $("spyBtn").disabled=true;
}
function renderMeeting(s){
  $("meetingTimer").textContent=fmt(s.timers.meetingLeft);
  const me=s.me;
  $("votePlayers").innerHTML=s.players.filter(p=>p.id!==socket.id && p.connected).map(p=>`<button class="vote-choice ${selectedVote===p.id?"selected":""}" onclick="selectedVote='${p.id}';renderMeeting(state)">${icons[p.avatar]||"☠"}<br>${escapeHtml(p.name)}</button>`).join("")+`<button class="vote-choice ${selectedVote==="skip"?"selected":""}" onclick="selectedVote='skip';renderMeeting(state)">⚓<br>Passer</button>`;
}
function renderEnded(s){
  $("endTitle").textContent=s.result==="pirates"?"🏴‍☠️ L'équipage a gagné !":"☠️ Les Imposteurs ont gagné !";
  $("endReason").textContent=s.resultReason||"La partie est terminée.";
}
function fmt(ms){ms=Math.max(0,ms||0);let sec=Math.floor(ms/1000),m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
socket.on("state",render);
socket.on("connect",()=>{});
