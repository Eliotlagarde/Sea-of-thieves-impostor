
const socket = io();
let state = null, roomCode = null, selectedAvatar = "navigatrice", selectedVote = null;
const icons = {navigatrice:"🧭",cartographe:"🗺️","quartier-maitre":"⚓",vigie:"🔭",canonnier:"💣",charpentier:"🔨",medecin:"⚕"};
const labels = {navigatrice:"Navigatrice",cartographe:"Cartographe","quartier-maitre":"Quartier-maître",vigie:"Vigie",canonnier:"Canonnier",charpentier:"Charpentier",medecin:"Médecin"};

const avatarKeys=Object.keys(icons);
function portrait(key){return '<span class="portrait portrait-'+(avatarKeys.includes(key)?key:'navigatrice')+'" aria-hidden="true"></span>';}
function $(id){return document.getElementById(id)}
function showScreen(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");document.body.dataset.screen=id}
function goHome(){notesDirty=false;notesKey=null;$("personalNotes").value="";if(roomCode)socket.emit("leaveRoom",{});sessionStorage.removeItem("seaSessionV6");roomCode=null;state=null;$("roomBadge").classList.add("hidden");showScreen("home")}
function openCreate(){renderAvatars();showScreen("create")}
let editingSettings=false;
function showCreateForm(){editingSettings=false;$("saveSettingsBtn").textContent="Créer la cabine";renderAvatars();showScreen("createForm")}
function openHelp(){showScreen("help")}
function quitGame(){location.href="about:blank"}
function toast(msg){$("toast").textContent=msg;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2600)}
let joinAvatarKey='navigatrice';
function renderAvatars(){for(const [id,key,joining]of [['avatars',selectedAvatar,false],['joinAvatars',joinAvatarKey,true]])$(id).innerHTML=avatarKeys.map(k=>`<button class="avatar-choice ${k===key?'selected':''}" onclick="selectAvatar('${k}',${joining})" title="${labels[k]}" aria-label="${labels[k]}" aria-pressed="${k===key}">${portrait(k)}</button>`).join('');$('avatarPreview').innerHTML=portrait(selectedAvatar)+'<span>'+labels[selectedAvatar]+'</span>';$('joinAvatarPreview').innerHTML=portrait(joinAvatarKey)+'<span>'+labels[joinAvatarKey]+'</span>';}
function selectAvatar(key,joining=false){if(joining)joinAvatarKey=key;else selectedAvatar=key;renderAvatars();}
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
  const avatar=joinAvatarKey;
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
function advanceQuest(){if(confirm("Cette étape est-elle accomplie dans Sea of Thieves ?"))emit("action",{action:"advanceQuest"})}
function sabotage(){if(confirm("Ta mission a-t-elle réellement été accomplie dans Sea of Thieves ? Le capitaine devra confirmer l’échec."))emit("action",{action:"sabotage",confirmed:true})}
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
  if(state?.phase!==s.phase){showTab("quest");$("meetingRole").classList.add("hidden");$("notebook").close();}
  if(state?.meeting?.id!==s.meeting?.id)selectedVote=null;
  hydrateNotes(s);state=s;document.body.dataset.phase=s.phase;roomCode=s.code;$("roomBadge").textContent="Cabine "+roomCode;$("roomBadge").classList.remove("hidden");
  if(s.phase==="lobby"){if(!["voyages","createForm"].includes(document.body.dataset.screen))showScreen("lobby");renderLobby(s)}
  else if(s.phase==="playing"){showScreen("game");renderGame(s)}
  else if(s.phase==="meeting"){showScreen("meeting");renderMeeting(s)}
  else if(s.phase==="ended"){showScreen("ended");renderEnded(s)}
}
function renderLobby(s){
  $("roomCode").textContent=s.code;$("count").textContent=`${s.players.length}/20`;
  $("settingSummary").innerHTML=`Quête : <b>${s.settings.questMinutes} min</b><br>Réunion toutes les <b>${s.settings.meetingInterval} min</b><br>Réunion : <b>${s.settings.meetingSeconds<60?s.settings.meetingSeconds+" sec":s.settings.meetingSeconds/60+" min"}</b><br>Espion : <b>${s.settings.spyEnabled?"Activé":"Désactivé"}</b><br>Imposteurs : <b>${s.settings.impostors}</b>`;
  $("players").innerHTML=s.players.map(p=>`<div class="player-row ${p.captain?"captain":""}"><div class="avatar-mini">${portrait(p.avatar)}</div><div><b>${escapeHtml(p.name)}</b>${p.captain?" 👑":""}</div><div class="status">${!p.connected?"Déconnecté":p.ready||p.captain?"● Prêt":"○ En attente"}${!p.connected&&s.players.find(x=>x.id===s.selfId)?.captain?` <button class="copy-btn" onclick="emit('removePlayer',{target:'${p.id}'})">Retirer</button>`:""}</div></div>`).join("");
  $('selectedVoyage').textContent=s.selection?'⎈ '+s.selection.title:'Aucune quête sélectionnée';$('chooseVoyageBtn').classList.toggle('hidden',!s.players.find(p=>p.id===s.selfId)?.captain);$('startBtn').disabled=!s.selection;$('readyBtn').textContent=s.players.find(p=>p.id===s.selfId)?.ready?'Annuler ma disponibilité':'Je suis prêt';
  const me=s.players.find(p=>p.id===s.selfId); $("editSettingsBtn").classList.toggle("hidden",!me?.captain);if(me){$("readyBtn").classList.toggle("hidden",!!me.captain);$("startBtn").classList.toggle("hidden",!me.captain)}
}
function renderGame(s){
  $("questTitle").textContent=s.quest.title;
  $("currentStep").textContent=s.quest.steps[s.quest.currentStep]||"Quête terminée";
  $("progressBar").style.width=Math.min(100,s.quest.currentStep/s.quest.steps.length*100)+"%";
  $("steps").innerHTML=s.quest.steps.map((x,i)=>`<li class="${i<s.quest.currentStep?"done":i===s.quest.currentStep?"current":""}">${i+1}. ${escapeHtml(x)}</li>`).join("");
  const me=s.me;
  $("myRole").innerHTML=`<div class="role-name">${me.role==="impostor"?"☠️ Imposteur":me.role==="spy"?"🕵️ Espion":"🏴‍☠️ Pirate"}</div><p>${me.role==="impostor"?"Objectif secret :":me.role==="spy"?"Tu es un Pirate avec un pouvoir secret.":"Fais progresser la quête avec l’équipage."}</p>${me.secretMission?`<div class="spy-result">${escapeHtml(me.secretMission)}</div>`:""}`;
  $("spyNav").classList.toggle("hidden",me.role!=="spy");
  const captain=s.players.find(p=>p.id===s.selfId)?.captain;$("advanceBtn").disabled=!captain||!!s.pendingFailure;$("advanceBtn").textContent=captain?"Confirmer cette étape dans le jeu":"Le capitaine confirme les étapes";
  $("nextMeeting").textContent=fmt(s.timers.nextMeetingLeft);
  $("questTimer").textContent=fmt(s.timers.totalLeft);
  $("spyBtn").disabled=!me.spyPowerAvailable||me.eliminated;$("spyBtn").textContent=me.spyPowerAvailable?"Révéler une mission d’Imposteur":"Pouvoir utilisé";$("spyResult").textContent=me.spyMission?"Mission découverte : "+me.spyMission:"";
  $("journalLog").innerHTML=s.journal.map(x=>`<p>${escapeHtml(x)}</p>`).join("");
  $('actionStatus').textContent=`${s.quest.currentStep}/${s.quest.steps.length} étapes confirmées · ${me.eliminated?'Tu observes la partie.':'Actions à réaliser dans Sea of Thieves.'}`;
  $('sabotageBtn').classList.toggle('hidden',me.role!=='impostor');$('sabotageBtn').disabled=me.eliminated||me.actionLeft>0||!!s.pendingFailure;
  $('sabotageStatus').textContent=me.role==='impostor'?(s.pendingFailure?'Déclaration en cours d’arbitrage.':me.actionLeft>0?'Nouvelle déclaration dans '+Math.ceil(me.actionLeft/1000)+' s':'Déclare uniquement une mission réellement accomplie.') : '';
  renderFailure(s,'failurePanel');

}
function renderMeeting(s){
  $("meetingTimer").textContent=fmt(s.timers.meetingLeft);renderFailure(s,"meetingFailure");
  const me=s.me;
  $("voteBtn").disabled=me.eliminated||s.meeting.voted;$("voteStatus").textContent=me.eliminated?"Spectateur : vote indisponible.":s.meeting.voted?"Vote secret enregistré.":"Un seul vote définitif par réunion.";
  $("votePlayers").innerHTML=s.players.filter(p=>!p.eliminated).map(p=>`<button class="vote-choice ${selectedVote===p.id?"selected":""}" onclick="selectedVote='${p.id}';renderMeeting(state)">${portrait(p.avatar)}<span class="vote-name">${escapeHtml(p.name)}</span><br>${s.meeting.counts[p.id]||0} vote(s)</button>`).join("")+`<button class="vote-choice ${selectedVote==="skip"?"selected":""}" onclick="selectedVote='skip';renderMeeting(state)">⚓<br>Passer<br>${s.meeting.counts.skip||0} vote(s)</button>`;
}
function renderEnded(s){
  $("endTitle").textContent=s.result==="pirates"?"🏴‍☠️ L'équipage a gagné !":"☠️ Les Imposteurs ont gagné !";
  $("endReason").textContent=s.resultReason||"La partie est terminée.";
  $('endCrew').innerHTML=s.reveal.map(p=>`<div>${portrait(p.avatar)}<b>${escapeHtml(p.name)}</b><small>${p.role==='spy'?'Espion (Pirate)':p.role==='impostor'?'Imposteur':'Pirate'}</small></div>`).join('');
  $("endStats").innerHTML=`<div class="table-scroll"><table><thead><tr><th>Joueur</th><th>Rôle / mission</th><th>Étapes confirmées</th><th>Déclarations</th><th>Votes</th></tr></thead><tbody>${s.reveal.map(p=>`<tr><td>${escapeHtml(p.name)}${p.eliminated?" (éliminé)":""}</td><td>${p.role==="spy"?"Espion (Pirate)":p.role==="impostor"?"Imposteur":"Pirate"}<br>${escapeHtml(p.mission)}</td><td>${p.contributions}</td><td>${p.sabotages}</td><td>${p.votes}</td></tr>`).join("")}</tbody></table></div>`;
}
function fmt(ms){ms=Math.max(0,ms||0);let sec=Math.floor(ms/1000),m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
socket.on("state",render);
function remember(res){sessionStorage.setItem("seaSessionV6",JSON.stringify({code:res.code,token:res.token}));}
function emit(event,data,success){if(!socket.connected)return toast("Connexion au serveur interrompue.");socket.timeout(8000).emit(event,{code:roomCode,...data},(err,res)=>{if(err)return toast("Le serveur ne répond pas.");if(!res?.ok)return toast(res?.error||"Action indisponible.");success?.(res);});}
function editSettings(){editingSettings=true;for(const k of ["questMinutes","meetingInterval","meetingSeconds","impostors"])$(k).value=state.settings[k];$("spyEnabled").checked=state.settings.spyEnabled;$("saveSettingsBtn").textContent="Enregistrer les réglages";showScreen("createForm");}
function meetingRole(){const el=$("meetingRole");el.textContent=(state.me.role==="impostor"?"Imposteur — "+state.me.secretMission:state.me.role==="spy"?"Espion (Pirate)":"Pirate");el.classList.toggle("hidden");}
socket.on("disconnect",()=>{$("connectionStatus").textContent="Connexion perdue — reconnexion en cours…";});
socket.on("connect_error",()=>{$("connectionStatus").textContent="Serveur inaccessible — nouvelle tentative en cours…";});
socket.on("connect",()=>{$("connectionStatus").textContent="";let session;try{session=JSON.parse(sessionStorage.getItem("seaSessionV6"));}catch{}if(session)socket.emit("resumeRoom",session,res=>{if(!res.ok){sessionStorage.removeItem("seaSession");roomCode=null;state=null;showScreen("home");toast(res.error);}});});

let notesDirty=false,notesKey=null;
function hydrateNotes(s){const key=s.code+':'+s.selfId;if(key!==notesKey){notesKey=key;notesDirty=false;$('personalNotes').value=s.me.notes||'';}else if(!notesDirty){$('personalNotes').value=s.me.notes||'';}updateNoteStatus();}
function updateNoteStatus(){const text=notesDirty?'Modifications non enregistrées':'Notes privées · '+$('personalNotes').value.length+'/5000';$('noteStatus').textContent=text;$('meetingNoteStatus').textContent=text;}
function saveNotes(){const text=$('personalNotes').value;emit('saveNotes',{notes:text},()=>{if($('personalNotes').value===text){notesDirty=false;if(state)state.me.notes=text;}updateNoteStatus();$('noteStatus').textContent='Notes enregistrées';$('meetingNoteStatus').textContent='Notes enregistrées';});}
function openNotebook(){$('meetingNotes').value=$('personalNotes').value;$('notebook').showModal();}
function renderFailure(s,id){const el=$(id),captain=s.players.find(p=>p.id===s.selfId)?.captain;el.classList.toggle('hidden',!s.pendingFailure&&!captain);if(s.pendingFailure){el.innerHTML='<h3>Déclaration d’échec</h3>'+(captain?'<p>'+escapeHtml(s.pendingFailure.reason)+'</p><p>Vérifie avec l’équipage ce qui s’est passé dans le jeu.</p><button class="gold-btn" onclick="resolveFailure(true)">Confirmer l’échec</button><button class="dark-btn" onclick="resolveFailure(false)">La quête continue</button>':'<p>Le capitaine arbitre une déclaration, sans connaître son auteur.</p>');}else el.innerHTML=captain?'<button class="dark-btn" onclick="failQuest()">Confirmer un échec réel de la quête</button>':'';}
function resolveFailure(accepted){if(!accepted||confirm('Confirmer que la quête a réellement échoué ? La partie se terminera.'))emit('resolveFailure',{accepted});}
function failQuest(){if(confirm('La quête a-t-elle réellement échoué dans Sea of Thieves ? Les Imposteurs gagneront.'))emit('failQuest',{confirmed:true});}
let skullClicks=0,skullLast=0;
function secretSkull(){const now=Date.now();if(now-skullLast>4000)skullClicks=0;skullLast=now;if(++skullClicks>=5){skullClicks=0;$('easterEgg').showModal();}}
let voyageCompany='gold',voyageCategory='Trésor enterré',voyageChoice=null;
function openVoyages(){const v=VOYAGES.voyages.find(v=>v.id===state?.selection?.voyageId);voyageCompany=v?.company||'gold';voyageCategory=v?.category||'Trésor enterré';voyageChoice=null;$('voyageSearch').value='';showScreen('voyages');renderVoyages();if(v)chooseVoyage(v.id);}
function chooseCompany(id){voyageCompany=id;voyageCategory=VOYAGES.voyages.find(v=>v.company===id)?.category;$('voyageSearch').value='';renderVoyages();}
function chooseCategory(category){voyageCategory=category;renderVoyages();}
function renderVoyages(){const company=VOYAGES.companies.find(c=>c.id===voyageCompany);$('companyName').textContent=company.name;$('categoryName').textContent=voyageCategory;$('companyTabs').innerHTML=VOYAGES.companies.map(c=>`<button class="company-tab ${c.id===voyageCompany?'selected':''}" onclick="chooseCompany('${c.id}')" aria-label="${escapeHtml(c.name)}" aria-pressed="${c.id===voyageCompany}"><span>${c.icon}</span><small>${escapeHtml(c.name)}</small></button>`).join('');const cats=[...new Set(VOYAGES.voyages.filter(v=>v.company===voyageCompany).map(v=>v.category))];$('categoryList').innerHTML=cats.map((c,i)=>`<button class="${c===voyageCategory?'selected':''}" onclick="chooseCategory(VOYAGES.voyages.filter(v=>v.company==='${voyageCompany}').map(v=>v.category).filter((v,i,a)=>a.indexOf(v)===i)[${i}])">${escapeHtml(c)}</button>`).join('');const search=$('voyageSearch').value.toLocaleLowerCase('fr');const list=VOYAGES.voyages.filter(v=>v.company===voyageCompany&&(search||v.category===voyageCategory)&&(!search||(v.title+' '+v.category).toLocaleLowerCase('fr').includes(search)));$('voyageCards').innerHTML=list.map(v=>`<button class="voyage-card ${v.id===voyageChoice?.id?'selected':''}" onclick="chooseVoyage('${v.id}')"><span class="voyage-art art-${v.profile}">${{treasure:'⚿',vault:'⚿',combat:'☠',delivery:'◇',shipment:'⚓',fishing:'♧',story:'▤',mixed:'⎈'}[v.profile]}</span><strong>${escapeHtml(v.title)}</strong><small>${v.exact?'Intitulé confirmé':'Famille de voyage'}</small><p>${escapeHtml(v.description)}</p></button>`).join('')||'<p>Aucun voyage trouvé dans cette compagnie.</p>';}
function chooseVoyage(id){voyageChoice=VOYAGES.voyages.find(v=>v.id===id);if(!voyageChoice)return;$('voyageChoice').textContent=voyageChoice.title;$('voyageDescription').textContent=voyageChoice.description;$('voyageTitle').value=state?.selection?.voyageId===id?state.selection.title:'';$('customQuestFields').classList.remove('hidden');$('missionOverrides').open=voyageChoice.company==='custom'||voyageChoice.profile==='story';$('customSteps').value=state?.selection?.voyageId===id?state.selection.steps.join('\n'):voyageChoice.company==='custom'?'':VOYAGES.profiles[voyageChoice.profile].steps.join('\n');$('customMissions').value=state?.selection?.voyageId===id?(state.missionOptions||[]).join('\n'):voyageChoice.company==='custom'||voyageChoice.profile==='story'?'':VOYAGES.profiles[voyageChoice.profile].missions.join('\n');$('confirmVoyageBtn').disabled=false;renderVoyages();}
function confirmVoyage(){if(!voyageChoice)return;emit('selectVoyage',{selection:{voyageId:voyageChoice.id,title:$('voyageTitle').value||voyageChoice.title,steps:$('customSteps').value,missions:$('customMissions').value}},()=>showScreen('lobby'));}
renderAvatars();
