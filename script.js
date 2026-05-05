const supabaseUrl = "https://skrgmhdcvezxpyybwssn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcmdtaGRjdmV6eHB5eWJ3c3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODE0MjUsImV4cCI6MjA5MzU1NzQyNX0.SXIL3dhqATc_F3zB2B_ELjAxMZ0vFDJ-sxBC-bdo2EE";

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} catch (e) {
  console.warn("Supabase non configuré. Le mode multijoueur sera inactif.");
}

const generationData = [
  { id: 1, label: "GEN I", sub: "1-151", range: [1, 151] },
  { id: 2, label: "GEN II", sub: "152-251", range: [152, 251] },
  { id: 3, label: "GEN III", sub: "252-386", range: [252, 386] },
  { id: 4, label: "GEN IV", sub: "387-493", range: [387, 493] },
  { id: 5, label: "GEN V", sub: "494-649", range: [494, 649] },
  { id: 6, label: "GEN VI", sub: "650-721", range: [650, 721] },
  { id: 7, label: "GEN VII", sub: "722-809", range: [722, 809] },
  { id: 8, label: "GEN VIII", sub: "810-905", range: [810, 905] },
  { id: 9, label: "GEN IX", sub: "906-1025", range: [906, 1025] },
];

const typeData = {
  normal: { color: "#9099A1" },
  fire: { color: "#FF7C35" },
  water: { color: "#4592C4" },
  electric: { color: "#EDD53F" },
  grass: { color: "#5FBD58" },
  ice: { color: "#75D0C1" },
  fighting: { color: "#D04164" },
  poison: { color: "#A559B5" },
  ground: { color: "#D27D3E" },
  flying: { color: "#748FC9" },
  psychic: { color: "#FA7179" },
  bug: { color: "#91C12F" },
  rock: { color: "#C5B78C" },
  ghost: { color: "#556AAE" },
  dragon: { color: "#0F6AC0" },
  dark: { color: "#5F4650" },
  steel: { color: "#5A8EA2" },
  fairy: { color: "#EF97CE" },
};

let appState = {
  selectedGens: [1],
  totalRounds: 10,
  timerDuration: 15,
  score: 0,
  streak: 0,
  totalTime: 0,
  currentRound: 0,
  currentPokemon: null,
  pokemonQueue: [],
  timerInterval: null,
  timeLeft: 15000,
  roundStartTime: 0,
  isAnswering: false,
  localGuessed: false,
  localCorrect: false,
  history: [],
  isMultiplayer: false,
  isHost: false,
  roomChannel: null,
  roomCode: "",
  playerName: "",
  playerId: "solo",
  playersData: {},
  finishedPlayers: [],
};

function calculatePoints(timeTaken, timerDuration, currentStreak) {
  const baseScore = 500;
  const maxTimeBonus = 500;
  const timeBonus = Math.max(0, Math.floor(maxTimeBonus * (1 - timeTaken / (timerDuration * 1000))));
  const streakMultiplier = Math.min(2.0, 1 + (currentStreak || 0) * 0.2);
  return Math.floor((baseScore + timeBonus) * streakMultiplier);
}

class ConfettiGenerator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.pieces = [];
    this.frame = null;
  }
  launch() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.display = "block";
    this.pieces = [];
    const colors = ["#FF3344", "#FFDE00", "#3B4CCA", "#00E676", "#ffffff"];
    for (let i = 0; i < 150; i++) {
      this.pieces.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.4 - this.canvas.height * 0.5,
        size: Math.random() * 12 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 6 + 3,
        gravity: 0.08 + Math.random() * 0.05,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        isCircle: Math.random() > 0.5,
        opacity: 1,
      });
    }
    if (this.frame) cancelAnimationFrame(this.frame);
    this._animate();
    setTimeout(() => this.stop(), 4000);
  }
  _animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let alive = false;
    for (const p of this.pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotSpeed;
      if (p.y > this.canvas.height - 60) p.opacity -= 0.03;
      if (p.y < this.canvas.height + 20 && p.opacity > 0) alive = true;
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      if (p.isCircle) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      this.ctx.restore();
    }
    if (alive) this.frame = requestAnimationFrame(() => this._animate());
    else this.stop();
  }
  stop() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = "none";
  }
}
const confettiEffect = new ConfettiGenerator(document.getElementById("confetti-canvas"));

function normalizeText(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function checkMatch(input, target) {
  const nIn = normalizeText(input), nTar = normalizeText(target);
  return nIn === nTar && nIn.length > 0;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue() {
  let pool = [];
  for (const gen of generationData) {
    if (appState.selectedGens.includes(gen.id)) {
      for (let id = gen.range[0]; id <= gen.range[1]; id++) pool.push(id);
    }
  }
  return shuffleArray(pool).slice(0, appState.totalRounds);
}

function switchScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
}

function toggleLoading(visible) {
  const overlay = document.getElementById("loading-overlay");
  visible ? overlay.classList.remove("hidden") : overlay.classList.add("hidden");
}

async function fetchPokemonData(id) {
  const [res1, res2] = await Promise.all([
    fetch("https://pokeapi.co/api/v2/pokemon/" + id),
    fetch("https://pokeapi.co/api/v2/pokemon-species/" + id),
  ]);
  const p1 = await res1.json(), p2 = await res2.json();
  const fr = p2.names.find((n) => n.language.name === "fr");
  const en = p2.names.find((n) => n.language.name === "en");
  return {
    id,
    nameFr: fr ? fr.name : p1.name,
    nameEn: en ? en.name : p1.name,
    imageUrl: p1.sprites?.other?.["official-artwork"]?.front_default || p1.sprites?.front_default,
    types: p1.types.map((t) => t.type.name),
  };
}

function updateHistoryUI() {
  const container = document.getElementById("live-history");
  container.innerHTML = "";
  appState.history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "hist-item " + (item.correct ? "correct" : "wrong");
    div.innerHTML = `<img src="${item.pokemon.imageUrl}" alt="pkmn"><span>${item.pokemon.nameFr}</span>`;
    container.appendChild(div);
  });
  container.scrollLeft = container.scrollWidth;
}

function updateScoreUI() {
  if (appState.isMultiplayer) {
    document.getElementById("multi-scores").style.display = "flex";
    document.getElementById("solo-score-pill").style.display = "none";
    const container = document.getElementById("multi-scores");
    container.innerHTML = "";
    Object.values(appState.playersData)
      .sort((a, b) => b.score - a.score)
      .forEach((player) => {
        const el = document.createElement("div");
        el.className = "player-score";
        const streakStr = player.streak > 1 ? ` 🔥${player.streak}` : "";
        el.textContent = `${player.name}: ${player.score} pts ${streakStr}`;
        container.appendChild(el);
      });
  } else {
    document.getElementById("multi-scores").style.display = "none";
    document.getElementById("solo-score-pill").style.display = "flex";
    const streakStr = appState.streak > 1 ? ` 🔥${appState.streak}` : "";
    document.getElementById("score-display").textContent = `${appState.score} pts ${streakStr}`;
  }
  document.getElementById("round-display").textContent = appState.currentRound + 1 + " / " + appState.totalRounds;
}

function updateLobbyUI() {
  const list = document.getElementById("lobby-players");
  list.innerHTML = "";
  Object.values(appState.playersData).forEach((player) => {
    const el = document.createElement("div");
    el.className = "lobby-player";
    el.textContent = player.name;
    list.appendChild(el);
  });
}

function resetRoundUI() {
  const input = document.getElementById("answer-input");
  const feedback = document.getElementById("feedback-message");
  const glow = document.getElementById("arena-glow");
  input.value = "";
  input.disabled = false;
  input.classList.remove("correct-flash", "wrong-flash");
  document.getElementById("btn-pass").disabled = false;
  feedback.textContent = "";
  feedback.className = "feedback";
  glow.className = "arena-glow";
  document.getElementById("timer-bar").style.width = "100%";
  appState.localGuessed = false;
  appState.localCorrect = false;
}

function startTimer() {
  stopTimer();
  const bar = document.getElementById("timer-bar");
  const numEl = document.getElementById("timer-number");
  const totalTime = appState.timerDuration * 1000;
  appState.timeLeft = totalTime;
  bar.classList.remove("blink");
  appState.timerInterval = setInterval(() => {
    appState.timeLeft -= 100;
    const pct = Math.max(0, appState.timeLeft / totalTime);
    bar.style.width = pct * 100 + "%";

    if (pct > 0.5) {
      bar.style.backgroundColor = "var(--success)";
    } else if (pct > 0.25) {
      bar.style.backgroundColor = "var(--accent)";
    } else {
      bar.style.backgroundColor = "var(--danger)";
    }

    numEl.textContent = Math.ceil(appState.timeLeft / 1000);
    if (appState.timeLeft <= 3000) bar.classList.add("blink");

    if (appState.timeLeft <= 0) {
      stopTimer();
      if (appState.isMultiplayer && appState.isHost) {
        triggerRoundEnd();
      } else if (!appState.isMultiplayer) {
        if (!appState.localGuessed) {
          appState.streak = 0;
          appState.totalTime += totalTime;
          appState.localCorrect = false;
        }
        handleEndRound(null, appState.currentPokemon);
      }
    }
  }, 100);
}

function stopTimer() {
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
  }
  document.getElementById("timer-bar").classList.remove("blink");
}

function broadcastMessage(data) {
  if (appState.roomChannel) {
    appState.roomChannel.send({ type: "broadcast", event: "game", payload: data });
  }
}

function sendToHost(msg) {
  if (appState.isHost) {
    handleHostData(msg);
  } else {
    broadcastMessage(msg);
  }
}

function handleHostData(data) {
  if (!appState.isHost) return;
  const player = appState.playersData[data.id];
  if (!player) return;
  if (!appState.finishedPlayers.includes(data.id)) {
    appState.finishedPlayers.push(data.id);
    if (data.type === "CORRECT") {
      const points = calculatePoints(data.timeTaken, appState.timerDuration, player.streak || 0);
      player.score += points;
      player.streak = (player.streak || 0) + 1;
      player.totalTime += data.timeTaken;
    } else if (data.type === "SKIP") {
      player.streak = 0;
      player.totalTime += appState.timerDuration * 1000;
    }
    broadcastMessage({ type: "PLAYERS_UPDATE", players: appState.playersData });
    updateScoreUI();
    checkRoundEnd();
  }
}

function checkRoundEnd() {
  const totalPlayers = Object.keys(appState.playersData).length;
  if (appState.finishedPlayers.length >= totalPlayers) {
    triggerRoundEnd();
  }
}

function triggerRoundEnd() {
  stopTimer();
  Object.keys(appState.playersData).forEach((pid) => {
    if (!appState.finishedPlayers.includes(pid)) {
      appState.playersData[pid].streak = 0;
      appState.playersData[pid].totalTime += appState.timerDuration * 1000;
    }
  });
  broadcastMessage({
    type: "END_ROUND",
    finalScores: appState.playersData,
    pokemon: appState.currentPokemon,
  });
  handleEndRound(appState.playersData, appState.currentPokemon);
}

function handlePeerData(data) {
  if (appState.isHost) {
    if (data.type === "JOIN") {
      appState.playersData[data.id] = {
        id: data.id,
        name: data.name,
        score: 0,
        totalTime: 0,
        streak: 0,
      };
      broadcastMessage({ type: "PLAYERS_UPDATE", players: appState.playersData });
      updateLobbyUI();
      return;
    }
    if (data.type === "CORRECT" || data.type === "SKIP") {
      handleHostData(data);
      return;
    }
  }

  if (data.type === "RETURN_TO_LOBBY") {
    returnToLobby();
  }
  if (data.type === "UPDATE_SPECS") {
    appState.totalRounds = data.rounds;
    appState.timerDuration = data.time;
  }
  if (data.type === "PLAYERS_UPDATE") {
    appState.playersData = data.players;
    updateLobbyUI();
    updateScoreUI();
  }
  if (data.type === "START_GAME") {
    appState.totalRounds = data.rounds;
    appState.timerDuration = data.time;
    document.getElementById("live-history").innerHTML = "";
    appState.history = [];
    appState.currentRound = 0;
    updateScoreUI();
    switchScreen("game");
    toggleLoading(true);
  }
  if (data.type === "NEW_ROUND") {
    appState.currentRound = data.round;
    setupPokemon(data.pokemon);
  }
  if (data.type === "END_ROUND") {
    handleEndRound(data.finalScores, data.pokemon);
  }
  if (data.type === "END_GAME") {
    appState.playersData = data.finalScores;
    showResults();
  }
}

async function loadNextPokemon() {
  toggleLoading(true);
  resetRoundUI();
  updateScoreUI();
  if (appState.isMultiplayer && !appState.isHost) return;
  try {
    appState.finishedPlayers = [];
    const pokemon = await fetchPokemonData(appState.pokemonQueue[appState.currentRound]);
    if (appState.isMultiplayer && appState.isHost) {
      broadcastMessage({ type: "NEW_ROUND", pokemon: pokemon, round: appState.currentRound });
    }
    setupPokemon(pokemon);
  } catch (err) {
    proceedNext();
  }
}

function setupPokemon(pokemon) {
  resetRoundUI();
  appState.currentPokemon = pokemon;
  const img = document.getElementById("pokemon-img");
  if (pokemon.imageUrl) img.src = pokemon.imageUrl;
  const badges = document.getElementById("type-badges");
  badges.innerHTML = "";
  pokemon.types.forEach((t) => {
    const d = typeData[t] || { color: "#888" };
    const b = document.createElement("span");
    b.className = "type-badge";
    b.style.backgroundColor = d.color;
    b.textContent = t;
    badges.appendChild(b);
  });
  toggleLoading(false);
  appState.isAnswering = true;
  appState.roundStartTime = Date.now();
  document.getElementById("answer-input").focus();
  startTimer();
}

function handleEndRound(newPlayersData, pokemon) {
  stopTimer();
  appState.isAnswering = false;
  if (newPlayersData) appState.playersData = newPlayersData;
  updateScoreUI();
  const input = document.getElementById("answer-input");
  const feedback = document.getElementById("feedback-message");
  const glow = document.getElementById("arena-glow");
  if (!appState.localCorrect) {
    input.classList.add("wrong-flash");
    glow.classList.add("wrong-glow");
    feedback.className = "feedback wrong";
  } else {
    glow.classList.add("correct-glow");
    confettiEffect.launch();
  }
  feedback.innerHTML =
    (appState.localCorrect ? "✅ BIEN JOUÉ ! " : "❌ TERMINÉ ! ") +
    "C'était <strong>" + pokemon.nameFr.toUpperCase() + "</strong>";
  appState.history.push({ pokemon: pokemon, correct: appState.localCorrect });
  updateHistoryUI();
  setTimeout(proceedNext, 2500);
}

function proceedNext() {
  if (appState.isMultiplayer && !appState.isHost) return;
  appState.currentRound++;
  if (appState.currentRound >= appState.totalRounds) {
    if (appState.isMultiplayer && appState.isHost)
      broadcastMessage({ type: "END_GAME", finalScores: appState.playersData });
    showResults();
  } else {
    loadNextPokemon();
  }
}

function showResults() {
  switchScreen("results");
  const list = document.getElementById("results-list");
  list.innerHTML = "";
  if (appState.isMultiplayer) {
    document.getElementById("results-score").textContent = "CLASSEMENT";
    const sortedPlayers = Object.values(appState.playersData).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });
    sortedPlayers.forEach((player, index) => {
      const el = document.createElement("div");
      el.className = "result-row";
      const timeSec = (player.totalTime / 1000).toFixed(1);
      el.innerHTML = `<span>#${index + 1} ${player.name}</span><span>${player.score} pts (${timeSec}s)</span>`;
      list.appendChild(el);
    });
  } else {
    document.getElementById("results-score").textContent = appState.score + " PTS";
    const timeSec = (appState.totalTime / 1000).toFixed(1);
    const timeEl = document.createElement("div");
    timeEl.style.textAlign = "center";
    timeEl.style.color = "var(--text-muted)";
    timeEl.style.marginBottom = "1rem";
    timeEl.textContent = `Temps total : ${timeSec}s`;
    list.appendChild(timeEl);
    appState.history.forEach((item) => {
      const el = document.createElement("div");
      el.className = "result-row";
      el.innerHTML = `<span>${item.pokemon.nameFr}</span><span>${item.correct ? "✅" : "❌"}</span>`;
      list.appendChild(el);
    });
  }
}

function initUI() {
  const grid = document.getElementById("gen-grid");
  generationData.forEach((gen) => {
    const btn = document.createElement("button");
    btn.className = "gen-btn" + (appState.selectedGens.includes(gen.id) ? " active" : "");
    btn.innerHTML = gen.label + "<span>" + gen.sub + "</span>";
    btn.addEventListener("click", () => {
      if (appState.selectedGens.includes(gen.id) && appState.selectedGens.length > 1) {
        appState.selectedGens = appState.selectedGens.filter((g) => g !== gen.id);
        btn.classList.remove("active");
      } else if (!appState.selectedGens.includes(gen.id)) {
        appState.selectedGens.push(gen.id);
        btn.classList.add("active");
      }
    });
    grid.appendChild(btn);
  });
  document.getElementById("btn-all-gens").addEventListener("click", () => {
    appState.selectedGens = generationData.map((g) => g.id);
    document.querySelectorAll(".gen-btn").forEach((b) => b.classList.add("active"));
  });
  document.querySelectorAll(".glass-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const parent = e.target.parentElement;
      parent.querySelectorAll(".glass-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (parent.id === "rounds-grid") appState.totalRounds = Number(btn.dataset.value);
      if (parent.id === "timer-grid") appState.timerDuration = Number(btn.dataset.value);
    });
  });
}

document.getElementById("btn-solo").addEventListener("click", () => {
  appState.isMultiplayer = false;
  appState.pokemonQueue = buildQueue();
  appState.totalRounds = Math.min(appState.totalRounds, appState.pokemonQueue.length);
  appState.score = 0;
  appState.streak = 0;
  appState.totalTime = 0;
  appState.currentRound = 0;
  appState.history = [];
  document.getElementById("live-history").innerHTML = "";
  switchScreen("game");
  loadNextPokemon();
});

document.getElementById("btn-host").addEventListener("click", () => {
  const btn = document.getElementById("btn-host");
  const originalText = btn.textContent;
  btn.textContent = "CRÉATION...";
  btn.disabled = true;

  if (!supabaseClient) {
    alert("Multijoueur indisponible : vérifie la connexion Supabase.");
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  appState.playerName = document.getElementById("player-name").value || "Hôte";
  appState.isMultiplayer = true;
  appState.isHost = true;

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  appState.roomCode = code;
  appState.playerId = "host-" + Date.now();

  appState.playersData = {};
  appState.playersData[appState.playerId] = {
    id: appState.playerId,
    name: appState.playerName,
    score: 0,
    totalTime: 0,
    streak: 0,
  };

  appState.roomChannel = supabaseClient.channel("room-" + appState.roomCode);
  appState.roomChannel
    .on("broadcast", { event: "game" }, ({ payload }) => {
      handlePeerData(payload);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.history.pushState({}, "", "/" + appState.roomCode);
        document.getElementById("lobby-settings").style.display = "block";
        document.getElementById("lobby-code-display").textContent = appState.roomCode;
        document.getElementById("btn-start-multi").style.display = "block";
        document.getElementById("waiting-msg").style.display = "none";
        btn.textContent = originalText;
        btn.disabled = false;
        updateLobbyUI();
        switchScreen("lobby");
      }
    });
});

document.getElementById("btn-join").addEventListener("click", () => {
  appState.roomCode = document.getElementById("join-code").value.toUpperCase().trim();
  if (!appState.roomCode) return;

  const btn = document.getElementById("btn-join");
  const originalText = btn.textContent;
  btn.textContent = "CONNEXION...";
  btn.disabled = true;

  if (!supabaseClient) {
    alert("Multijoueur indisponible.");
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  appState.playerName = document.getElementById("player-name").value || "Joueur";
  appState.isMultiplayer = true;
  appState.isHost = false;
  appState.playerId = "player-" + Date.now();

  appState.roomChannel = supabaseClient.channel("room-" + appState.roomCode);
  appState.roomChannel
    .on("broadcast", { event: "game" }, ({ payload }) => {
      handlePeerData(payload);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.history.pushState({}, "", "/" + appState.roomCode);
        document.getElementById("lobby-settings").style.display = "none";
        broadcastMessage({ type: "JOIN", name: appState.playerName, id: appState.playerId });
        document.getElementById("lobby-code-display").textContent = appState.roomCode;
        document.getElementById("waiting-msg").style.display = "block";
        document.getElementById("btn-start-multi").style.display = "none";
        btn.textContent = originalText;
        btn.disabled = false;
        switchScreen("lobby");
      }
    });
});

document.getElementById("btn-start-multi").addEventListener("click", () => {
  appState.pokemonQueue = buildQueue();
  appState.totalRounds = Math.min(appState.totalRounds, appState.pokemonQueue.length);
  appState.score = 0;
  appState.currentRound = 0;
  appState.history = [];
  Object.values(appState.playersData).forEach((p) => {
    p.score = 0;
    p.totalTime = 0;
    p.streak = 0;
  });
  broadcastMessage({ type: "START_GAME", rounds: appState.totalRounds, time: appState.timerDuration });
  document.getElementById("live-history").innerHTML = "";
  switchScreen("game");
  loadNextPokemon();
});

document.getElementById("answer-input").addEventListener("input", (e) => {
  if (!appState.isAnswering || appState.localGuessed || !appState.currentPokemon) return;
  const value = e.target.value;
  if (checkMatch(value, appState.currentPokemon.nameFr) || checkMatch(value, appState.currentPokemon.nameEn)) {
    appState.localGuessed = true;
    appState.localCorrect = true;
    const timeTaken = Date.now() - appState.roundStartTime;
    e.target.disabled = true;
    e.target.classList.add("correct-flash");
    document.getElementById("btn-pass").disabled = true;
    const feedback = document.getElementById("feedback-message");
    feedback.textContent = appState.isMultiplayer ? "✅ Correct ! Attente..." : "✅ Correct !";
    feedback.className = "feedback correct";
    if (appState.isMultiplayer) {
      sendToHost({ type: "CORRECT", id: appState.playerId, timeTaken: timeTaken });
    } else {
      const points = calculatePoints(timeTaken, appState.timerDuration, appState.streak);
      appState.score += points;
      appState.streak++;
      appState.totalTime += timeTaken;
      handleEndRound(null, appState.currentPokemon);
    }
  }
});

document.getElementById("btn-pass").addEventListener("click", () => {
  if (!appState.isAnswering || appState.localGuessed) return;
  appState.localGuessed = true;
  appState.localCorrect = false;
  document.getElementById("answer-input").disabled = true;
  document.getElementById("btn-pass").disabled = true;
  const feedback = document.getElementById("feedback-message");
  feedback.textContent = "⏭️ Passé !";
  feedback.className = "feedback";
  if (appState.isMultiplayer) {
    sendToHost({ type: "SKIP", id: appState.playerId });
  } else {
    appState.streak = 0;
    appState.totalTime += appState.timerDuration * 1000;
    handleEndRound(null, appState.currentPokemon);
  }
});

function resetHomeMenu() {
  document.getElementById("step-1-gens").style.display = "block";
  document.getElementById("step-2-specs").style.display = "none";
}

function quitToHome() {
  if (appState.roomChannel) {
    supabaseClient.removeChannel(appState.roomChannel);
    appState.roomChannel = null;
  }
  window.history.pushState({}, "", "/");
  resetHomeMenu();
  switchScreen("home");
}

function returnToLobby() {
  appState.score = 0;
  appState.currentRound = 0;
  Object.values(appState.playersData).forEach((p) => {
    p.score = 0;
    p.totalTime = 0;
    p.streak = 0;
  });
  updateLobbyUI();
  switchScreen("lobby");
}

document.getElementById("btn-quit-lobby").addEventListener("click", quitToHome);

document.getElementById("btn-quit").addEventListener("click", () => {
  stopTimer();
  appState.isAnswering = false;
  quitToHome();
});

document.getElementById("btn-replay").addEventListener("click", () => {
  if (appState.isMultiplayer) {
    if (appState.isHost) {
      broadcastMessage({ type: "RETURN_TO_LOBBY" });
    }
    returnToLobby();
  } else {
    quitToHome();
  }
});

document.getElementById("btn-home-results").addEventListener("click", quitToHome);

document.getElementById("btn-next-step").addEventListener("click", () => {
  if (appState.selectedGens.length === 0) {
    alert("Choisis au moins une génération pour continuer !");
    return;
  }
  document.getElementById("step-1-gens").style.display = "none";
  document.getElementById("step-2-specs").style.display = "block";
});

document.getElementById("btn-prev-step").addEventListener("click", () => {
  document.getElementById("step-2-specs").style.display = "none";
  document.getElementById("step-1-gens").style.display = "block";
});

document.getElementById("lobby-rounds-select").addEventListener("change", (e) => {
  appState.totalRounds = parseInt(e.target.value);
  broadcastMessage({ type: "UPDATE_SPECS", rounds: appState.totalRounds, time: appState.timerDuration });
});

document.getElementById("lobby-time-select").addEventListener("change", (e) => {
  appState.timerDuration = parseInt(e.target.value);
  broadcastMessage({ type: "UPDATE_SPECS", rounds: appState.totalRounds, time: appState.timerDuration });
});

window.addEventListener("DOMContentLoaded", () => {
  const pathCode = window.location.pathname.replace(/\//g, "").toUpperCase();
  if (pathCode.length === 4) {
    document.getElementById("join-code").value = pathCode;
    document.getElementById("player-name").focus();
  }
});

initUI();