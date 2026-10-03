
const socket = io();
let state = null, roomCode = null, selectedAvatar = "capitaine", selectedVote = null;
const icons = {capitaine:"☠",navigatrice:"🧭",cartographe:"🗺️","quartier-maitre":"⚓",vigie:"🔭",canonnier:"💣",charpentier:"🔨",medecin:"⚕"};
const labels = {capitaine:"Capitaine",navigatrice:"Navigatrice",cartographe:"Cartographe","quartier-maitre":"Quartier-maître",vigie:"Vigie",canonnier:"Canonnier",charpentier:"Charpentier",medecin:"Médecin"};

const avatarKeys=Object.keys(icons);
function portrait(key){return '<span class="portrait portrait-'+(avatarKeys.includes(key)?key:'capitaine')+'" aria-hidden="true"></span>';}
function $(id){return document.getElementById(id)}
function showScreen(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");document.body.dataset.screen=id}
function goHome(){if(roomCode)socket.emit("leaveRoom",{});sessionStorage.removeItem("seaSession");roomCode=null;state=null;$("roomBadge").classList.add("hidden");showScreen("home")}
function openCreate(){showScreen("create")}
let editingSettings=false;
function showCreateForm(){editingSettings=false;$("saveSettingsBtn").textContent="Créer la cabine";renderAvatars();showScreen("createForm")}
function openHelp(){showScreen("help")}
function quitGame(){location.href="about:blank"}
function toast(msg){$("toast").textContent=msg;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2600)}
function renderAvatars(){ $("avatars").innerHTML=Object.entries(icons).map(([k,v])=>`<button class="avatar-choice ${k===selectedAvatar?"selected":""}" onclick="selectAvatar('${k}')" title="${labels[k]}" aria-label="${labels[k]}" aria-pressed="${k===selectedAvatar}">${portrait(k)}</button>`).join("") }
function selectAvatar(a){selectedAvatar=a;renderAvatars()}
function settingsFromForm(){return{
  questMinutes:+$("questMinutes").value,
  meetingInterval:+$("meetingInterval").value,
  meetingSeconds:+$("meetingSeconds").value,
  impostors:+$("impostors").value,
  spyEnabled:$("spyEnabled").checked
}}
function createRoom(){
  if(editingSettings){return emit("updateSettings",{settings:settingsFromForm()},()=>showScreen("lobby"));}
  const name=$("playerName").value.trim(); if(!name)return toast("Entre ton nom.");
  emit("createRoom",{name,avatar:selectedAvatar,settings:settingsFromForm()},res=>{
    if(!res.ok)return toast(res.error||"Impossible de créer la cabine.");
    remember(res);roomCode=res.code; $("roomBadge").textContent="Cabine "+roomCode;$("roomBadge").classList.remove("hidden");showScreen("lobby");
  });
}
function joinRoom(){
  const code=$("joinCode").value.trim().toUpperCase(); if(!code)return toast("Entre le code.");
  const name=$("joinName").value.trim(); if(!name)return toast("Entre ton nom.");
  renderAvatars();
  const avatar=$("joinAvatar").value;
  emit("joinRoom",{code,name,avatar},res=>{
    if(!res.ok)return toast(res.error||"Impossible de rejoindre.");
    remember(res);roomCode=res.code;$("roomBadge").textContent="Cabine "+roomCode;$("roomBadge").classList.remove("hidden");showScreen("lobby");
  });
}
function toggleReady(){emit("ready",{})}
function startGame(){emit("startGame",{code:roomCode},res=>{if(!res.ok)toast(res.error)})}
async function copyCode(){try{await navigator.clipboard.writeText(roomCode);toast("Code copié.")}catch{toast("Code : "+roomCode)}}
function leaveRoom(){goHome()}
function showTab(tab){
  document.querySelectorAll(".side-nav button").forEach(b=>b.classList.toggle("active",b.getAttribute("onclick")===`showTab('${tab}')`));
  ["quest","journal","role","spy"].forEach(x=>$(`${x}Tab`).classList.add("hidden"));
  $(`${tab}Tab`).classList.remove("hidden");
}
function advanceQuest(){emit("action",{action:"advanceQuest"})}
function sabotage(){emit("action",{action:"sabotage"})}
function callMeeting(){emit("callMeeting",{})}
function spyReveal(){
  emit("spyReveal",{code:roomCode},res=>{
    if(!res.ok)return toast(res.error||"Pouvoir indisponible.");
    $("spyResult").textContent="Mission d'Imposteur découverte : "+res.mission;
    $("spyBtn").disabled=true;$("spyBtn").textContent="Pouvoir utilisé";
  });
}
function submitVote(){
  if(!selectedVote)return toast("Choisis un joueur.");
  emit("vote",{code:roomCode,target:selectedVote},res=>{if(res.ok)toast("Vote enregistré.")})
}
function render(s){
  if(state?.phase!==s.phase){showTab("quest");$("meetingRole").classList.add("hidden");}
  if(state?.meeting?.id!==s.meeting?.id)selectedVote=null;
  state=s;document.body.dataset.phase=s.phase;roomCode=s.code;$("roomBadge").textContent="Cabine "+roomCode;$("roomBadge").classList.remove("hidden");
  if(s.phase==="lobby"){showScreen("lobby");renderLobby(s)}
  else if(s.phase==="playing"){showScreen("game");renderGame(s)}
  else if(s.phase==="meeting"){showScreen("meeting");renderMeeting(s)}
  else if(s.phase==="ended"){showScreen("ended");renderEnded(s)}
}
function renderLobby(s){
  $("roomCode").textContent=s.code;$("count").textContent=`${s.players.length}/20`;
  $("settingSummary").innerHTML=`Quête : <b>${s.settings.questMinutes} min</b><br>Réunion toutes les <b>${s.settings.meetingInterval} min</b><br>Réunion : <b>${s.settings.meetingSeconds<60?s.settings.meetingSeconds+" sec":s.settings.meetingSeconds/60+" min"}</b><br>Espion : <b>${s.settings.spyEnabled?"Activé":"Désactivé"}</b><br>Imposteurs : <b>${s.settings.impostors}</b>`;
  $("players").innerHTML=s.players.map(p=>`<div class="player-row ${p.captain?"captain":""}"><div class="avatar-mini">${portrait(p.avatar)}</div><div><b>${escapeHtml(p.name)}</b>${p.captain?" 👑":""}</div><div class="status">${!p.connected?"Déconnecté":p.ready||p.captain?"● Prêt":"○ En attente"}${!p.connected&&s.players.find(x=>x.id===s.selfId)?.captain?` <button class="copy-btn" onclick="emit('removePlayer',{target:'${p.id}'})">Retirer</button>`:""}</div></div>`).join("");
  const me=s.players.find(p=>p.id===s.selfId); $("editSettingsBtn").classList.toggle("hidden",!me?.captain);if(me){$("readyBtn").classList.toggle("hidden",!!me.captain);$("startBtn").classList.toggle("hidden",!me.captain)}
}
function renderGame(s){
  $("questTitle").textContent=s.quest.title;
  $("currentStep").textContent=s.quest.steps[s.quest.currentStep]||"Quête terminée";
  $("progressBar").style.width=Math.min(100,s.quest.progress/s.quest.required*100)+"%";
  $("steps").innerHTML=s.quest.steps.map((x,i)=>`<li class="${i<s.quest.currentStep?"done":i===s.quest.currentStep?"current":""}">${i+1}. ${escapeHtml(x)}</li>`).join("");
  const me=s.me;
  $("myRole").innerHTML=`<div class="role-name">${me.role==="impostor"?"☠️ Imposteur":me.role==="spy"?"🕵️ Espion":"🏴‍☠️ Pirate"}</div><p>${me.role==="impostor"?"Objectif secret :":me.role==="spy"?"Tu es un Pirate avec un pouvoir secret.":"Fais progresser la quête avec l’équipage."}</p>${me.secretMission?`<div class="spy-result">${escapeHtml(me.secretMission)}</div>`:""}`;
  $("spyNav").classList.toggle("hidden",me.role!=="spy");
  $("advanceBtn").disabled=me.eliminated || me.actionLeft>0;
  $("nextMeeting").textContent=fmt(s.timers.nextMeetingLeft);
  $("questTimer").textContent=fmt(s.timers.totalLeft);
  $("spyBtn").disabled=!me.spyPowerAvailable||me.eliminated;$("spyBtn").textContent=me.spyPowerAvailable?"Révéler une mission d’Imposteur":"Pouvoir utilisé";$("spyResult").textContent=me.spyMission?"Mission découverte : "+me.spyMission:"";
  $("journalLog").innerHTML=s.journal.map(x=>`<p>${escapeHtml(x)}</p>`).join("");
  $("actionStatus").textContent=me.eliminated?"Tu es éliminé : tu observes la partie.":`${s.quest.progress}/${s.quest.required} contributions · ${me.actionLeft>0?"Prochaine action dans "+Math.ceil(me.actionLeft/1000)+" s":"Action disponible"}`;
  $("sabotageBtn").classList.toggle("hidden",me.role!=="impostor");$("sabotageBtn").disabled=me.eliminated||me.actionLeft>0||me.missionStep!==s.quest.currentStep;
  $("sabotageStatus").textContent=me.role==="impostor"?`Étape ${me.missionStep+1} · ${me.sabotageCount}/3 sabotages · ${me.actionLeft>0?Math.ceil(me.actionLeft/1000)+" s avant la prochaine action":me.missionStep===s.quest.currentStep?"Mission disponible":"Attends l’étape correspondante"}`:"";
}
function renderMeeting(s){
  $("meetingTimer").textContent=fmt(s.timers.meetingLeft);
  const me=s.me;
  $("voteBtn").disabled=me.eliminated||s.meeting.voted;$("voteStatus").textContent=me.eliminated?"Spectateur : vote indisponible.":s.meeting.voted?"Vote secret enregistré.":"Un seul vote définitif par réunion.";
  $("votePlayers").innerHTML=s.players.filter(p=>!p.eliminated).map(p=>`<button class="vote-choice ${selectedVote===p.id?"selected":""}" onclick="selectedVote='${p.id}';renderMeeting(state)">${portrait(p.avatar)}<span class="vote-name">${escapeHtml(p.name)}</span><br>${s.meeting.counts[p.id]||0} vote(s)</button>`).join("")+`<button class="vote-choice ${selectedVote==="skip"?"selected":""}" onclick="selectedVote='skip';renderMeeting(state)">⚓<br>Passer<br>${s.meeting.counts.skip||0} vote(s)</button>`;
}
function renderEnded(s){
  $("endTitle").textContent=s.result==="pirates"?"🏴‍☠️ L'équipage a gagné !":"☠️ Les Imposteurs ont gagné !";
  $("endReason").textContent=s.resultReason||"La partie est terminée.";
  $("endStats").innerHTML=`<div class="table-scroll"><table><thead><tr><th>Joueur</th><th>Rôle / mission</th><th>Contributions</th><th>Sabotages</th><th>Votes</th></tr></thead><tbody>${s.reveal.map(p=>`<tr><td>${escapeHtml(p.name)}${p.eliminated?" (éliminé)":""}</td><td>${p.role==="spy"?"Espion (Pirate)":p.role==="impostor"?"Imposteur":"Pirate"}<br>${escapeHtml(p.mission)}</td><td>${p.contributions}</td><td>${p.sabotages}</td><td>${p.votes}</td></tr>`).join("")}</tbody></table></div>`;
}
function fmt(ms){ms=Math.max(0,ms||0);let sec=Math.floor(ms/1000),m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
socket.on("state",render);
function remember(res){sessionStorage.setItem("seaSession",JSON.stringify({code:res.code,token:res.token}));}
function emit(event,data,success){if(!socket.connected)return toast("Connexion au serveur interrompue.");socket.timeout(8000).emit(event,{code:roomCode,...data},(err,res)=>{if(err)return toast("Le serveur ne répond pas.");if(!res?.ok)return toast(res?.error||"Action indisponible.");success?.(res);});}
function editSettings(){editingSettings=true;for(const k of ["questMinutes","meetingInterval","meetingSeconds","impostors"])$(k).value=state.settings[k];$("spyEnabled").checked=state.settings.spyEnabled;$("saveSettingsBtn").textContent="Enregistrer les réglages";showScreen("createForm");}
function meetingRole(){const el=$("meetingRole");el.textContent=(state.me.role==="impostor"?"Imposteur — "+state.me.secretMission:state.me.role==="spy"?"Espion (Pirate)":"Pirate");el.classList.toggle("hidden");}
socket.on("disconnect",()=>{$("connectionStatus").textContent="Connexion perdue — reconnexion en cours…";});
socket.on("connect_error",()=>{$("connectionStatus").textContent="Serveur inaccessible — nouvelle tentative en cours…";});
socket.on("connect",()=>{$("connectionStatus").textContent="";let session;try{session=JSON.parse(sessionStorage.getItem("seaSession"));}catch{}if(session)socket.emit("resumeRoom",session,res=>{if(!res.ok){sessionStorage.removeItem("seaSession");roomCode=null;state=null;showScreen("home");toast(res.error);}});});
