const DATA_URL = "questions.json";
const GAME_SECONDS = 30;
const PRESET_TURNS = [3, 5, 7, 10, 15];
const CATEGORY_STYLES = {
  "Indigo": { bg: "#7775dc", fg: "#ffffff" },
  "Golden Yellow": { bg: "#f2bd43", fg: "#282044" },
  "Turquoise": { bg: "#43d0c5", fg: "#142d3c" },
  "Brown": { bg: "#a96e49", fg: "#ffffff" },
  "Grey": { bg: "#aeb4c1", fg: "#20243b" }
};

let allQuestions = [];
let remainingQuestions = [];
let teams = [];
let turnsPerTeam = 5;
let currentTeamIndex = 0;
let timerValue = GAME_SECONDS;
let timerInterval = null;
let currentQuestion = null;
let pendingWildQuestions = [];
let gameActive = false;
let soundEnabled = false;
let audioContext = null;

const $ = (id) => document.getElementById(id);
const setupScreen = $("setup-screen");
const gameScreen = $("game-screen");
const endScreen = $("end-screen");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

async function loadQuestions() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Could not load question database.");
    const data = await response.json();
    allQuestions = Array.isArray(data.questions) ? data.questions : [];
    if (!allQuestions.length) throw new Error("The question database is empty.");
    renderTeamFields();
  } catch (error) {
    $("start-game").disabled = true;
    $("start-game").textContent = "Question database could not load";
    alert("The question database could not be loaded. Please make sure questions.json is in the same folder as index.html.");
    console.error(error);
  }
}

function renderTeamFields() {
  const count = Number($("team-count").value);
  const oldValues = [...document.querySelectorAll(".team-name-input")].map(input => input.value);
  $("team-name-fields").innerHTML = Array.from({ length: count }, (_, index) => {
    const value = oldValues[index] || `Team ${index + 1}`;
    return `<input class="team-name-input" type="text" maxlength="24" aria-label="Team ${index + 1} name" data-team-name="${index}" value="${escapeHtml(value)}">`;
  }).join("");
}

function showScreen(screen) {
  [setupScreen, gameScreen, endScreen].forEach(item => item.classList.add("hidden"));
  screen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startGame() {
  const count = Number($("team-count").value);
  turnsPerTeam = Number($("turn-count").value);
  if (!PRESET_TURNS.includes(turnsPerTeam)) return;
  const names = [...document.querySelectorAll(".team-name-input")].map((input, i) => input.value.trim() || `Team ${i + 1}`);
  teams = names.slice(0, count).map((name, index) => ({
    id: index, name, score: 0, turnsPlayed: 0
  }));
  remainingQuestions = [...allQuestions];
  currentTeamIndex = 0;
  currentQuestion = null;
  pendingWildQuestions = [];
  gameActive = true;
  clearTimer();
  showScreen(gameScreen);
  renderScoreboard();
  renderTurn();
  renderPlaceholder();
  $("answer-panel").classList.add("hidden");
}

function renderTurn() {
  const team = teams[currentTeamIndex];
  $("current-team-name").textContent = team.name;
  $("turn-label").textContent = `${team.name.toUpperCase()} · TURN ${team.turnsPlayed + 1} OF ${turnsPerTeam}`;
  $("progress-count").textContent = `${team.turnsPlayed} / ${turnsPerTeam} turns`;
  $("progress-fill").style.width = `${(team.turnsPlayed / turnsPerTeam) * 100}%`;
  renderScoreboard();
}

function renderScoreboard() {
  $("scoreboard-list").innerHTML = teams.map((team, index) => `
    <div class="score-row ${index === currentTeamIndex && gameActive ? "active" : ""}">
      <div><span class="score-team">${escapeHtml(team.name)}</span><span class="score-sub">${team.turnsPlayed} of ${turnsPerTeam} turns played</span></div>
      <strong class="score-value">${team.score}</strong>
    </div>`).join("");
  $("questions-left").textContent = `${remainingQuestions.length} questions left`;
}

function renderPlaceholder(message = "Roll the die to find out which question your team gets.") {
  pendingWildQuestions = [];
  $("question-stage").innerHTML = `
    <div class="question-placeholder">
      <div class="sparkle-mark">⚄</div>
      <h2>Roll the die!</h2>
      <p>${escapeHtml(message)}</p>
      <button id="draw-question" class="primary-button draw-button">Roll the die <span aria-hidden="true">↗</span></button>
    </div>`;
  $("draw-question").addEventListener("click", drawQuestion);
}

// The die has five category faces and one WILD face.
function drawQuestion() {
  if (!gameActive || currentQuestion || remainingQuestions.length === 0) return;

  const dieFaces = [...Object.keys(CATEGORY_STYLES), "WILD"];
  const result = dieFaces[Math.floor(Math.random() * dieFaces.length)];

  if (result === "WILD") {
    drawWildCard();
    return;
  }

  const categoryQuestions = remainingQuestions.filter(question => question.category === result);
  if (!categoryQuestions.length) {
    renderPlaceholder(`The die landed on ${result}, but that category has no questions left. Roll again!`);
    return;
  }

  const chosen = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
  selectQuestion(chosen);
}

function drawWildCard() {
  const availableCards = [...new Set(remainingQuestions.map(question => question.cardId))];
  if (!availableCards.length) {
    renderPlaceholder("There are no questions left to draw. Please end the game.");
    return;
  }

  const cardId = availableCards[Math.floor(Math.random() * availableCards.length)];
  pendingWildQuestions = remainingQuestions.filter(question => question.cardId === cardId);
  renderWildChoices(cardId);
}

function renderWildChoices(cardId) {
  const choices = pendingWildQuestions.map(question => {
    const style = CATEGORY_STYLES[question.category] || CATEGORY_STYLES.Indigo;
    return `<button class="wild-choice" type="button" data-question-id="${escapeHtml(question.id)}" style="--choice-bg:${style.bg};--choice-fg:${style.fg}">
      <span class="wild-choice-category">${escapeHtml(question.category)}</span>
      <span class="wild-choice-prompt">${escapeHtml(question.prompt)}</span>
      <span class="wild-choice-arrow" aria-hidden="true">↗</span>
    </button>`;
  }).join("");

  $("question-stage").innerHTML = `
    <div class="wild-panel">
      <div class="wild-heading"><span class="wild-label">✦ WILD CARD ✦</span><h2>Lucky you! Pick a question.</h2>
      <p>Card ${escapeHtml(cardId)} has ${pendingWildQuestions.length} available question${pendingWildQuestions.length === 1 ? "" : "s"}. Choose one to start your 30 seconds.</p></div>
      <div class="wild-choice-list">${choices}</div>
    </div>`;

  $("question-stage").querySelectorAll(".wild-choice").forEach(button => {
    button.addEventListener("click", () => chooseWildQuestion(button.dataset.questionId));
  });
}

function chooseWildQuestion(questionId) {
  const chosen = pendingWildQuestions.find(question => question.id === questionId);
  if (!chosen || currentQuestion) return;
  selectQuestion(chosen);
}

function selectQuestion(question) {
  const index = remainingQuestions.findIndex(item => item.id === question.id);
  if (index < 0) return;
  currentQuestion = remainingQuestions.splice(index, 1)[0];
  pendingWildQuestions = [];
  renderQuestion();
  $("answer-panel").classList.remove("hidden");
  $("answer-panel").querySelector(".eyebrow").textContent = "TIME'S UP? OR DONE?";
  startTimer();
  renderScoreboard();
}

function renderQuestion() {
  const style = CATEGORY_STYLES[currentQuestion.category] || CATEGORY_STYLES.Indigo;
  $("question-stage").innerHTML = `
    <div class="question-card" id="question-card" style="background:${style.bg};color:${style.fg}">
      <div class="question-kicker">NAME FIVE · ${escapeHtml(currentQuestion.category.toUpperCase())} · ${GAME_SECONDS} SECONDS</div>
      <div class="question-text">${escapeHtml(currentQuestion.prompt)}</div>
      <div class="question-footer">
        <span>THINK FAST. NAME FIVE.</span>
        <div class="timer-wrap"><span id="timer-number" class="timer-number">${GAME_SECONDS}</span><div class="timer-track"><div id="timer-fill" class="timer-fill"></div></div></div>
      </div>
    </div>`;
}

function startTimer() {
  clearTimer();
  timerValue = GAME_SECONDS;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerValue -= 1;
    updateTimerDisplay();
    if (soundEnabled && timerValue <= 10 && timerValue > 0) playTick(timerValue);
    if (timerValue <= 0) {
      clearTimer();
      if (soundEnabled) playAlarm();
      $("timer-number").textContent = "0";
      $("question-card").classList.add("time-warning");
      $("answer-panel").querySelector(".eyebrow").textContent = "TIME IS UP!";
    }
  }, 1000);
}

function updateTimerDisplay() {
  const number = $("timer-number");
  const fill = $("timer-fill");
  if (!number || !fill) return;
  number.textContent = timerValue;
  fill.style.width = `${(timerValue / GAME_SECONDS) * 100}%`;
  $("question-card")?.classList.toggle("time-warning", timerValue <= 10);
}

function clearTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function tone(frequency, duration, volume, type = "sine", delay = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + delay + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration + 0.03);
}

function playTick(secondsLeft) {
  const frequency = secondsLeft <= 3 ? 620 : 500;
  tone(frequency, 0.09, 0.10, "sine");
}
function playAlarm() {
  tone(520, 0.20, 0.16, "sine", 0);
  tone(390, 0.24, 0.15, "sine", 0.22);
}

function recordScore(score) {
  if (!currentQuestion || !gameActive) return;
  clearTimer();
  teams[currentTeamIndex].score += Number(score);
  teams[currentTeamIndex].turnsPlayed += 1;
  currentQuestion = null;
  $("answer-panel").classList.add("hidden");

  const finished = teams.every(team => team.turnsPlayed >= turnsPerTeam);
  if (finished) {
    endGame();
    return;
  }
  currentTeamIndex = (currentTeamIndex + 1) % teams.length;
  while (teams[currentTeamIndex].turnsPlayed >= turnsPerTeam) {
    currentTeamIndex = (currentTeamIndex + 1) % teams.length;
  }
  renderTurn();
  renderPlaceholder();
  $("answer-panel").querySelector(".eyebrow").textContent = "TIME'S UP? OR DONE?";
}

function endGame() {
  gameActive = false;
  clearTimer();
  showScreen(endScreen);
  const highScore = Math.max(...teams.map(team => team.score));
  const winners = teams.filter(team => team.score === highScore);
  $("end-title").textContent = winners.length === 1 ? "We have a winner!" : "It's a tie!";
  $("winner-message").textContent = winners.length === 1
    ? `${winners[0].name} takes the crown with ${highScore} points. Well played!`
    : `${winners.map(team => team.name).join(" and ")} are tied on ${highScore} points. Ready for a tie-breaker?`;
  $("final-scores").innerHTML = [...teams].sort((a,b) => b.score - a.score).map(team =>
    `<div class="final-score-row"><span>${escapeHtml(team.name)}</span><strong>${team.score} pts</strong></div>`
  ).join("");
  $("tie-breaker").classList.toggle("hidden", winners.length < 2);
}

function startTieBreaker() {
  const highScore = Math.max(...teams.map(team => team.score));
  const tied = teams.filter(team => team.score === highScore);
  alert(`Tie-breaker: ${tied.map(team => team.name).join(" and ")} will each get one extra question. The team with the most points in this tie-breaker wins.`);
  // Start a fresh, short tie-breaker round for tied teams only.
  teams = tied.map((team, index) => ({ ...team, id: index, turnsPlayed: 0, tieScore: 0 }));
  turnsPerTeam = 1;
  remainingQuestions = remainingQuestions.length ? remainingQuestions : [...allQuestions];
  currentTeamIndex = 0;
  gameActive = true;
  currentQuestion = null;
  showScreen(gameScreen);
  renderTurn();
  renderPlaceholder();
  $("answer-panel").classList.add("hidden");
  $("end-game-early").textContent = "End tie-breaker";
}

function newGame() {
  clearTimer();
  gameActive = false;
  currentQuestion = null;
  pendingWildQuestions = [];
  $("end-game-early").textContent = "End game";
  showScreen(setupScreen);
  renderTeamFields();
}

$("team-count").addEventListener("change", renderTeamFields);
$("start-game").addEventListener("click", startGame);
$("score-buttons").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-score]");
  if (button) recordScore(button.dataset.score);
});
$("sound-toggle").addEventListener("change", (event) => {
  soundEnabled = event.target.checked;
  if (soundEnabled) {
    tone(560, 0.08, 0.025);
  }
});
$("end-game-early").addEventListener("click", () => {
  if (confirm("End the game now and show the current scores?")) endGame();
});
$("tie-breaker").addEventListener("click", startTieBreaker);
$("new-game").addEventListener("click", newGame);

loadQuestions();
