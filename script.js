const COLOURS = [
  {key:"indigo", label:"Indigo", hex:"#3F3C78", text:"#FFFFFF"},
  {key:"goldenYellow", label:"Golden Yellow", hex:"#E5B83B", text:"#30343B"},
  {key:"turquoise", label:"Turquoise", hex:"#35AFA5", text:"#30343B"},
  {key:"brown", label:"Brown", hex:"#8B5E3C", text:"#FFFFFF"},
  {key:"grey", label:"Grey", hex:"#808080", text:"#FFFFFF"},
  {key:"wild", label:"WILD", hex:"#30343B", text:"#E5B83B"}
];
const DURATION = 30;
let deck = [], usedIds = [], teams = [], currentTeamIndex = 0;
let activeCard = null, activeColour = null, chosenWildKey = null;
let timerInterval = null, secondsLeft = DURATION, roundActive = false, gameStarted = false;
let soundOn = false, audioContext = null;

const $ = id => document.getElementById(id);
const screens = ["welcomeScreen","gameScreen","resultScreen"];
function showScreen(id){ screens.forEach(s=>$(s).classList.toggle("hidden",s!==id)); window.scrollTo({top:0,behavior:"smooth"}); }
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderTeamFields(){
  const count = Number($("teamCount").value);
  $("teamNames").innerHTML = Array.from({length:count},(_,i)=>`<input maxlength="24" aria-label="Team ${i+1} name" placeholder="Team ${i+1} name" value="Team ${i+1}">`).join("");
}
function saveState(){
  const state={teams,currentTeamIndex,usedIds,gameStarted};
  try{localStorage.setItem("name5YorubaState",JSON.stringify(state));}catch(e){}
}
function loadQuestions(){
  return fetch("questions.json").then(r=>{if(!r.ok)throw new Error("Could not load questions.json");return r.json();});
}
function beginGame(){
  const names=[...$("teamNames").querySelectorAll("input")].map((el,i)=>el.value.trim()||`Team ${i+1}`);
  teams=names.map(name=>({name,score:0,turns:0}));
  currentTeamIndex=0;usedIds=[];activeCard=null;activeColour=null;chosenWildKey=null;roundActive=false;gameStarted=true;
  saveState();renderScoreboard();updateGameInfo();resetQuestionStage();showScreen("gameScreen");
}
function renderScoreboard(){
  $("scoreboard").innerHTML=teams.map((t,i)=>`<div class="score-row ${i===currentTeamIndex?"active":""}"><div class="score-team">${escapeHtml(t.name)}<small>${t.turns} ${t.turns===1?"turn":"turns"}</small></div><div class="score-value">${t.score}</div></div>`).join("");
  $("currentTeam").textContent=teams[currentTeamIndex]?.name||"Team 1";
}
function updateGameInfo(){
  $("cardsLeft").textContent=String(deck.length-usedIds.length);
  renderScoreboard();
}
function stopTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}
function resetQuestionStage(){
  stopTimer();secondsLeft=DURATION;roundActive=false;activeCard=null;activeColour=null;chosenWildKey=null;
  $("timer").textContent="00:30";$("timerBar").style.width="100%";$("timerStatus").textContent="30 seconds to name five!";
  $("questionStage").className="question-stage idle";$("stageKicker").textContent="READY WHEN YOU ARE";
  $("questionText").textContent="Roll the die to reveal your challenge.";
  $("wildHint").classList.add("hidden");$("wildChoices").classList.add("hidden");$("wildChoices").innerHTML="";
  $("scoreEntry").classList.add("hidden");$("die").textContent="?";$("die").style.background="#e9e5dc";$("die").style.color="#77766f";
  $("rollButton").disabled=false;$("rollButton").textContent="Roll the die ↻";
}
function chooseRandom(array){return array[Math.floor(Math.random()*array.length)];}
function rollDie(){
  if(roundActive)return;
  if(usedIds.length>=deck.length){finishGame();return;}
  const remaining=deck.filter(card=>!usedIds.includes(String(card.id)));
  activeCard=chooseRandom(remaining);usedIds.push(String(activeCard.id));
  const result=chooseRandom(COLOURS);
  activeColour=result.key;chosenWildKey=null;
  $("die").textContent=result.label==="Golden Yellow"?"GOLD":result.label.toUpperCase();
  $("die").style.background=result.hex;$("die").style.color=result.text;
  $("die").style.fontSize=result.key==="goldenYellow"?"10px":"12px";
  $("questionStage").className="question-stage";
  $("stageKicker").textContent=`CARD ${activeCard.id} · ${result.label.toUpperCase()}`;
  if(result.key==="wild"){
    $("questionText").textContent="WILD! Choose your challenge.";
    $("wildHint").classList.remove("hidden");$("wildChoices").classList.remove("hidden");
    $("wildChoices").innerHTML=COLOURS.filter(c=>c.key!=="wild").map(c=>`<button class="wild-choice" data-key="${c.key}" type="button"><strong style="color:${c.hex}">${c.label}</strong>${escapeHtml(activeCard[c.key])}</button>`).join("");
    $("wildChoices").querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>selectWild(btn.dataset.key)));
    $("timerStatus").textContent="Choose one question to start the timer.";
    $("rollButton").disabled=true;$("rollButton").textContent="Choose a WILD question";
    $("scoreEntry").classList.add("hidden");saveState();updateGameInfo();return;
  }
  showQuestion(result.key);
  saveState();updateGameInfo();
}
function selectWild(key){
  if(roundActive)return;
  chosenWildKey=key;
  $("wildChoices").querySelectorAll("button").forEach(b=>b.classList.toggle("selected",b.dataset.key===key));
  showQuestion(key);
}
function showQuestion(key){
  const colour=COLOURS.find(c=>c.key===key);
  $("questionStage").style.background=colour.hex+"18";
  $("questionStage").style.borderColor=colour.hex+"55";
  $("stageKicker").textContent=`CARD ${activeCard.id} · ${colour.label.toUpperCase()}`;
  $("questionText").textContent=activeCard[key];
  $("questionText").style.color=colour.key==="goldenYellow"?"#30343b":colour.hex;
  $("wildHint").classList.add("hidden");
  if(activeColour==="wild"){$("wildChoices").classList.remove("hidden");}
  else $("wildChoices").classList.add("hidden");
  $("rollButton").disabled=true;$("rollButton").textContent="Timer running…";
  startTimer();
}
function startTimer(){
  stopTimer();secondsLeft=DURATION;roundActive=true;
  $("timerStatus").textContent="Go! Name five before time runs out.";
  updateTimerDisplay();
  timerInterval=setInterval(()=>{
    secondsLeft=Math.max(0,secondsLeft-1);updateTimerDisplay();
    if(secondsLeft===0){stopTimer();roundActive=false;timeUp();}
  },1000);
}
function updateTimerDisplay(){
  $("timer").textContent=`00:${String(secondsLeft).padStart(2,"0")}`;
  $("timerBar").style.width=`${(secondsLeft/DURATION)*100}%`;
  if(secondsLeft<=8)$("timer").style.color="#a84435";else $("timer").style.color="var(--ink)";
}
function timeUp(){
  $("questionStage").classList.add("time-up");$("timerStatus").textContent="TIME'S UP! Agree on your score.";
  $("scoreEntry").classList.remove("hidden");$("rollButton").disabled=true;
  if(soundOn)beep();
}
function saveScore(){
  const score=Number($("turnScore").value);
  teams[currentTeamIndex].score+=score;teams[currentTeamIndex].turns++;
  currentTeamIndex=(currentTeamIndex+1)%teams.length;
  saveState();updateGameInfo();resetQuestionStage();
  if(usedIds.length>=deck.length){finishGame();}
}
function finishGame(){
  stopTimer();roundActive=false;gameStarted=false;
  const max=Math.max(...teams.map(t=>t.score));const winners=teams.filter(t=>t.score===max);
  $("winnerTitle").textContent=winners.length>1?"It's a tie!":`${winners[0].name} wins!`;
  $("winnerText").textContent=`The deck is complete. ${usedIds.length} cards played.`;
  $("finalScores").innerHTML=[...teams].sort((a,b)=>b.score-a.score).map(t=>`<div class="final-score"><span>${escapeHtml(t.name)}</span><span>${t.score} points</span></div>`).join("");
  showScreen("resultScreen");try{localStorage.removeItem("name5YorubaState");}catch(e){}
}
function endGameEarly(){
  if(!confirm("End this game now and see the current scores?"))return;
  finishGame();
}
function playAgain(){beginGame();}
function beep(){
  try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);osc.frequency.value=660;gain.gain.value=.08;osc.start();osc.stop(audioContext.currentTime+.18);}catch(e){}
}
function toggleSound(){soundOn=!soundOn;$("soundToggle").textContent=`Sound: ${soundOn?"On":"Off"}`;$("soundToggle").setAttribute("aria-pressed",String(soundOn));}
function home(){if(gameStarted&&!confirm("Return to the welcome screen? Your current game will end."))return;stopTimer();gameStarted=false;showScreen("welcomeScreen");}

$("teamCount").addEventListener("change",renderTeamFields);
$("startGame").addEventListener("click",beginGame);
$("rollButton").addEventListener("click",rollDie);
$("submitScore").addEventListener("click",saveScore);
$("endGame").addEventListener("click",endGameEarly);
$("playAgain").addEventListener("click",playAgain);
$("homeButton").addEventListener("click",home);
$("brandHome").addEventListener("click",e=>{e.preventDefault();home();});
$("soundToggle").addEventListener("click",toggleSound);
renderTeamFields();
loadQuestions().then(data=>{deck=data;if(!deck.length)throw new Error("The question deck is empty.");$("cardsLeft").textContent=String(deck.length);}).catch(err=>{console.error(err);alert("The question deck could not be loaded. Make sure questions.json is in the same folder as index.html.");});
