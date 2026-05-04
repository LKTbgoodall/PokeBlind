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
  peerInstance: null,
  connections: [],
  roomCode: "",
  playerName: "",
  playerId: "solo",
  playersData: {},
  finishedPlayers: [], // Suivi de ceux qui ont fini le round en cours
};

// --- CALCUL DES POINTS ---
function calculatePoints(timeTaken, timerDuration, currentStreak) {
  const baseScore = 500;
  const maxTimeBonus = 500;
  // Plus on est rapide, plus on s'approche des 500 points bonus
  const timeBonus = Math.max(
    0,
    Math.floor(maxTimeBonus * (1 - timeTaken / (timerDuration * 1000))),
  );
  // Multiplicateur : +20% de points par bonne réponse consécutive (plafond à x2.0)
  const streakMultiplier = Math.min(2.0, 1 + (currentStreak || 0) * 0.2);

  return Math.floor((baseScore + timeBonus) * streakMultiplier);
}

// --- CONFETTIS ---
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
    const colors = ["#E63946", "#FFDE00", "#3B4CCA", "#78C850", "#ffffff"];
    for (let i = 0; i < 130; i++) {
      this.pieces.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.4 - this.canvas.height * 0.5,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 7,
        vy: Math.random() * 5 + 2,
        gravity: 0.07 + Math.random() * 0.04,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
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
      if (p.y > this.canvas.height - 60) p.opacity -= 0.04;
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
const confettiEffect = new ConfettiGenerator(
  document.getElementById("confetti-canvas"),
);

// --- OUTILS ---
function normalizeText(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function checkMatch(input, target) {
  const nIn = normalizeText(input),
    nTar = normalizeText(target);
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
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
}
function toggleLoading(visible) {
  const overlay = document.getElementById("loading-overlay");
  visible
    ? overlay.classList.remove("hidden")
    : overlay.classList.add("hidden");
}

// --- API ---
async function fetchPokemonData(id) {
  const [res1, res2] = await Promise.all([
    fetch("https://pokeapi.co/api/v2/pokemon/" + id),
    fetch("https://pokeapi.co/api/v2/pokemon-species/" + id),
  ]);
  const p1 = await res1.json(),
    p2 = await res2.json();
  const fr = p2.names.find((n) => n.language.name === "fr"),
    en = p2.names.find((n) => n.language.name === "en");
  return {
    id,
    nameFr: fr ? fr.name : p1.name,
    nameEn: en ? en.name : p1.name,
    imageUrl:
      p1.sprites?.other?.["official-artwork"]?.front_default ||
      p1.sprites?.front_default,
    types: p1.types.map((t) => t.type.name),
  };
}

// --- UI UPDATES ---
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
    document.getElementById("score-display").textContent =
      `${appState.score} pts ${streakStr}`;
  }
  document.getElementById("round-display").textContent =
    appState.currentRound + 1 + " / " + appState.totalRounds;
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

// --- TIMER ---
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
    bar.style.backgroundColor = "hsl(" + Math.round(pct * 120) + ", 75%, 55%)";
    numEl.textContent = Math.ceil(appState.timeLeft / 1000);
    if (appState.timeLeft <= 3000) bar.classList.add("blink");

    if (appState.timeLeft <= 0) {
      stopTimer();
      if (appState.isMultiplayer && appState.isHost) {
        triggerRoundEnd(); // L'hôte force la fin du round pour tout le monde
      } else if (!appState.isMultiplayer) {
        if (!appState.localGuessed) {
          appState.streak = 0; // Remise à zero de la série
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

// --- LOGIQUE MULTIJOUEUR ---
function broadcastMessage(data) {
  appState.connections.forEach((conn) => conn.send(data));
}
function sendToHost(msg) {
  if (appState.isHost) {
    handleHostData(msg);
  } else if (appState.connections.length > 0) {
    appState.connections[0].send(msg);
  }
}

function handleHostData(data) {
  if (!appState.isHost) return;
  const player = appState.playersData[data.id];
  if (!player) return;

  if (!appState.finishedPlayers.includes(data.id)) {
    appState.finishedPlayers.push(data.id);

    if (data.type === "CORRECT") {
      const points = calculatePoints(
        data.timeTaken,
        appState.timerDuration,
        player.streak || 0,
      );
      player.score += points;
      player.streak = (player.streak || 0) + 1;
      player.totalTime += data.timeTaken;
    } else if (data.type === "SKIP") {
      player.streak = 0; // Cassage de série
      player.totalTime += appState.timerDuration * 1000; // Pénalité de temps max
    }

    broadcastMessage({ type: "PLAYERS_UPDATE", players: appState.playersData });
    updateScoreUI();
    checkRoundEnd();
  }
}

function checkRoundEnd() {
  const totalPlayers = Object.keys(appState.playersData).length;
  // Si le nombre de joueurs ayant fini correspond au total des joueurs connectés, on stop tout !
  if (appState.finishedPlayers.length >= totalPlayers) {
    triggerRoundEnd();
  }
}

function triggerRoundEnd() {
  stopTimer();
  // Donner la pénalité de temps max à ceux qui ont AFK (n'ont pas fini)
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

function handlePeerData(data, connection) {
  // L'HÔTE ÉCOUTE ACTIVEMENT LES JOUEURS
  if (appState.isHost) {
    if (data.type === "JOIN") {
      appState.playersData[data.id] = {
        id: data.id,
        name: data.name,
        score: 0,
        totalTime: 0,
        streak: 0,
      };
      broadcastMessage({
        type: "PLAYERS_UPDATE",
        players: appState.playersData,
      });
      updateLobbyUI();
      return;
    }
    // C'est ici que l'hôte récupère les réponses en direct des autres !
    if (data.type === "CORRECT" || data.type === "SKIP") {
      handleHostData(data);
      return;
    }
  }

  // LES CLIENTS METTENT À JOUR LEUR ÉCRAN
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

// --- JEU ---
async function loadNextPokemon() {
  toggleLoading(true);
  resetRoundUI();
  updateScoreUI();

  if (appState.isMultiplayer && !appState.isHost) return;

  try {
    appState.finishedPlayers = []; // L'hôte remet à 0 le compteur de finisseurs au nouveau round
    const pokemon = await fetchPokemonData(
      appState.pokemonQueue[appState.currentRound],
    );
    if (appState.isMultiplayer && appState.isHost) {
      broadcastMessage({
        type: "NEW_ROUND",
        pokemon: pokemon,
        round: appState.currentRound,
      });
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
    b.textContent = t.toUpperCase();
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
    confettiEffect.launch();
  }

  feedback.innerHTML =
    (appState.localCorrect ? "✅ Bien joué ! " : "❌ Terminé ! ") +
    "C'était <strong>" +
    pokemon.nameFr +
    "</strong>";

  appState.history.push({ pokemon: pokemon, correct: appState.localCorrect });
  updateHistoryUI();

  setTimeout(proceedNext, 2500); // On laisse 2.5s pour voir la réponse
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

    // Tri : Plus grand score en 1er, si égalité on regarde celui qui a mis le moins de temps
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
    document.getElementById("results-score").textContent =
      appState.score + " pts";
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

// --- EVENTS INIT ---
function initUI() {
  const grid = document.getElementById("gen-grid");
  generationData.forEach((gen) => {
    const btn = document.createElement("button");
    btn.className =
      "gen-btn" + (appState.selectedGens.includes(gen.id) ? " active" : "");
    btn.innerHTML = gen.label + "<span>" + gen.sub + "</span>";
    btn.addEventListener("click", () => {
      if (
        appState.selectedGens.includes(gen.id) &&
        appState.selectedGens.length > 1
      ) {
        appState.selectedGens = appState.selectedGens.filter(
          (g) => g !== gen.id,
        );
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
    document
      .querySelectorAll(".gen-btn")
      .forEach((b) => b.classList.add("active"));
  });

  document.querySelectorAll(".round-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".round-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      appState.totalRounds = Number(btn.dataset.value);
    });
  });

  document.querySelectorAll(".timer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".timer-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      appState.timerDuration = Number(btn.dataset.value);
    });
  });
}

document.getElementById("btn-solo").addEventListener("click", () => {
  appState.isMultiplayer = false;
  appState.pokemonQueue = buildQueue();
  appState.totalRounds = Math.min(
    appState.totalRounds,
    appState.pokemonQueue.length,
  );
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
  appState.playerName = document.getElementById("player-name").value || "Hôte";
  appState.isMultiplayer = true;
  appState.isHost = true;
  appState.roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  appState.peerInstance = new Peer("pb-" + appState.roomCode);

  appState.peerInstance.on("open", (id) => {
    appState.playerId = id;
    appState.playersData[id] = {
      id: id,
      name: appState.playerName,
      score: 0,
      totalTime: 0,
      streak: 0,
    };
    document.getElementById("lobby-code-display").textContent =
      appState.roomCode;
    document.getElementById("btn-start-multi").style.display = "block";
    updateLobbyUI();
    switchScreen("lobby");
  });

  appState.peerInstance.on("connection", (conn) => {
    appState.connections.push(conn);
    conn.on("data", (data) => handlePeerData(data, conn));
  });
});

document.getElementById("btn-join").addEventListener("click", () => {
  appState.playerName =
    document.getElementById("player-name").value || "Joueur";
  appState.roomCode = document.getElementById("join-code").value.toUpperCase();
  if (!appState.roomCode) return;

  appState.isMultiplayer = true;
  appState.isHost = false;
  appState.peerInstance = new Peer();

  appState.peerInstance.on("open", (id) => {
    appState.playerId = id;
    const conn = appState.peerInstance.connect("pb-" + appState.roomCode);
    appState.connections = [conn];
    conn.on("open", () => {
      conn.send({ type: "JOIN", name: appState.playerName, id: id });
      document.getElementById("lobby-code-display").textContent =
        appState.roomCode;
      document.getElementById("host-settings-panel").style.display = "none";
      document.getElementById("waiting-msg").style.display = "block";
      switchScreen("lobby");
    });
    conn.on("data", (data) => handlePeerData(data, conn));
  });
});

document.getElementById("btn-start-multi").addEventListener("click", () => {
  appState.pokemonQueue = buildQueue();
  appState.totalRounds = Math.min(
    appState.totalRounds,
    appState.pokemonQueue.length,
  );
  appState.score = 0;
  appState.currentRound = 0;
  appState.history = [];
  Object.values(appState.playersData).forEach((p) => {
    p.score = 0;
    p.totalTime = 0;
    p.streak = 0;
  });

  broadcastMessage({
    type: "START_GAME",
    rounds: appState.totalRounds,
    time: appState.timerDuration,
  });

  document.getElementById("live-history").innerHTML = "";
  switchScreen("game");
  loadNextPokemon();
});

// EVENT INPUT TEXTE
document.getElementById("answer-input").addEventListener("input", (e) => {
  if (
    !appState.isAnswering ||
    appState.localGuessed ||
    !appState.currentPokemon
  )
    return;
  const value = e.target.value;

  if (
    checkMatch(value, appState.currentPokemon.nameFr) ||
    checkMatch(value, appState.currentPokemon.nameEn)
  ) {
    appState.localGuessed = true;
    appState.localCorrect = true;
    const timeTaken = Date.now() - appState.roundStartTime;

    e.target.disabled = true;
    e.target.classList.add("correct-flash");
    document.getElementById("btn-pass").disabled = true;

    const feedback = document.getElementById("feedback-message");
    feedback.textContent = appState.isMultiplayer
      ? "✅ Correct ! Attente des autres..."
      : "✅ Correct !";
    feedback.className = "feedback correct";

    if (appState.isMultiplayer) {
      sendToHost({
        type: "CORRECT",
        id: appState.playerId,
        timeTaken: timeTaken,
      });
    } else {
      const points = calculatePoints(
        timeTaken,
        appState.timerDuration,
        appState.streak,
      );
      appState.score += points;
      appState.streak++;
      appState.totalTime += timeTaken;
      handleEndRound(null, appState.currentPokemon);
    }
  }
});

// EVENT BOUTON PASSER
document.getElementById("btn-pass").addEventListener("click", () => {
  if (!appState.isAnswering || appState.localGuessed) return;
  appState.localGuessed = true;
  appState.localCorrect = false;

  document.getElementById("answer-input").disabled = true;
  document.getElementById("btn-pass").disabled = true;

  const feedback = document.getElementById("feedback-message");
  feedback.textContent = "⏭️ Passé ! Attente...";
  feedback.className = "feedback";

  if (appState.isMultiplayer) {
    sendToHost({ type: "SKIP", id: appState.playerId });
  } else {
    appState.streak = 0; // Remise à zero
    appState.totalTime += appState.timerDuration * 1000;
    handleEndRound(null, appState.currentPokemon);
  }
});

document.getElementById("btn-quit").addEventListener("click", () => {
  stopTimer();
  appState.isAnswering = false;
  if (appState.peerInstance) appState.peerInstance.destroy();
  switchScreen("home");
});

document
  .getElementById("btn-replay")
  .addEventListener("click", () => switchScreen("home"));
document
  .getElementById("btn-home-results")
  .addEventListener("click", () => switchScreen("home"));

initUI();
