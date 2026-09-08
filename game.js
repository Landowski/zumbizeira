const statusEl = document.getElementById("status");
const playerCountEl = document.getElementById("playerCount");
const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const lobbyEl = document.getElementById("lobby");
const gameEl = document.getElementById("game");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const timerEl = document.getElementById("timer");
const timeHud = document.getElementById("hud");
const timeEl = document.getElementById("time");
const timeOptions = document.querySelectorAll(".time-option");
const joystickZone = document.getElementById("joystickZone");
const joystickThumb = document.getElementById("joystickThumb");
const sprintBtn = document.getElementById("sprintBtn");
const lobbyLeaveBtn = document.getElementById("lobbyLeaveBtn");
const gameOverEl = document.getElementById("gameOver");
const gameOverText = document.getElementById("gameOverText");
const restartBtn = document.getElementById("restartBtn");
const leaveBtn = document.getElementById("leaveBtn");

const MIN_PLAYERS = 2;

let joined = false;
let latestState = [];
let latestRoomLights = {};
let selectedDurationMin = 2;
const prevInfected = new Map(); // id -> bool, pra disparar o som só na transição
const prevRoomLightOn = {}; // roomId -> bool, idem

timeOptions.forEach((opt) => {
  opt.addEventListener("click", () => {
    selectedDurationMin = Number(opt.dataset.minutes);
    timeOptions.forEach((o) => o.classList.toggle("selected", o === opt));
    playSfx(SFX.tempo);
  });
});
document.querySelector('.time-option[data-minutes="2"]').classList.add("selected");

// --- carregamento de imagem com fallback (mesmo padrão dos protótipos de cômodo) ---
const imageCache = new Map();
function loadImageWithFallback(src, w, h, label) {
  if (imageCache.has(src)) return imageCache.get(src);
  const img = new Image();
  const state = { img, ready: false };
  img.onload = () => (state.ready = true);
  img.src = src;
  state.w = w;
  state.h = h;
  state.label = label;
  imageCache.set(src, state);
  return state;
}

function drawWithFallback(state, x, y, flip) {
  if (state.ready) {
    ctx.save();
    if (flip) {
      ctx.translate(x + state.w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(state.img, 0, 0, state.w, state.h);
    } else {
      ctx.drawImage(state.img, x, y, state.w, state.h);
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.strokeStyle = "#888";
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, state.w, state.h);
  ctx.fillStyle = "#444";
  ctx.fillRect(x, y, state.w, state.h);
  ctx.restore();
}

function drawObject(o) {
  const sprite = loadImageWithFallback(o.src, o.w, o.h, o.src);
  drawWithFallback(sprite, o.x, o.y, o.flip);
}

// pré-carrega tudo (fundos, objetos, interruptores, sprites de jogador) —
// evita "pop" de placeholder na primeira vez que se entra num cômodo
function preloadAssets() {
  Object.values(ROOMS).forEach((room) => {
    loadImageWithFallback(room.bg, ROOM_W, ROOM_H, room.bg);
    (room.staticBack || []).forEach((o) => loadImageWithFallback(o.src, o.w, o.h, o.src));
    (room.staticFront || []).forEach((o) => loadImageWithFallback(o.src, o.w, o.h, o.src));
    (room.ySort || []).forEach((o) => loadImageWithFallback(o.src, o.w, o.h, o.src));
    if (room.lightSwitch) {
      loadImageWithFallback(room.lightSwitch.onSprite, room.lightSwitch.w, room.lightSwitch.h, room.lightSwitch.onSprite);
      loadImageWithFallback(room.lightSwitch.offSprite, room.lightSwitch.w, room.lightSwitch.h, room.lightSwitch.offSprite);
    }
  });
  Object.values(PLAYER_SPRITES).forEach((set) => {
    loadImageWithFallback(set.base.src, set.base.w, set.base.h, set.base.src);
    loadImageWithFallback(set.infectado.src, set.infectado.w, set.infectado.h, set.infectado.src);
    loadImageWithFallback(set.zumbi.src, set.zumbi.w, set.zumbi.h, set.zumbi.src);
  });
}
preloadAssets();

// --- animação dos jogadores: só anima enquanto a posição está mudando de
// verdade entre um GAME_STATE e outro; parado fica congelado no frame 0 ---
const animState = new Map(); // id -> { lastX, lastY, moving }

// --- Sistema de partículas de fumaça pixelada ---
const dustParticles = [];

function createDustParticle(x, y) {
  dustParticles.push({
    x: x + (Math.random() * 10 - 5),
    y: y + (Math.random() * 4 - 2),
    size: Math.random() > 0.5 ? 8 : 12, // Dobrado: era 4 ou 6, agora é 8 ou 12
    life: 1.0,                        
    vx: (Math.random() - 0.5) * 0.5,
    vy: -Math.random() * 0.5 - 0.2     
  });
}

function updateAndDrawDust() {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.life -= 0.04; // velocidade de desaparecimento
    p.x += p.vx;
    p.y += p.vy;

    if (p.life <= 0) {
      dustParticles.splice(i, 1);
      continue;
    }

    ctx.save();
    // Usa opacidade com cor cinza/branca pixelada
    ctx.fillStyle = `rgba(200, 200, 200, ${p.life * 0.5})`;
    // Math.floor para manter a posição travada na grade de pixels
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    ctx.restore();
  }
}

function updateAnimState(players) {
  const seen = new Set();
  players.forEach((p) => {
    seen.add(p.id);
    const prev = animState.get(p.id);
    const moving = prev ? Math.hypot(p.x - prev.lastX, p.y - prev.lastY) > 0.5 : false;
    animState.set(p.id, { lastX: p.x, lastY: p.y, moving });
  });
  [...animState.keys()].forEach((id) => {
    if (!seen.has(id)) animState.delete(id);
  });
}

function drawPlayerSprite(p) {
  const spriteSet = PLAYER_SPRITES[p.color];
  if (!spriteSet) return;
  const spec = p.transforming ? spriteSet.infectado : p.infected ? spriteSet.zumbi : spriteSet.base;
  const sheet = loadImageWithFallback(spec.src, spec.w, spec.h, spec.src);
  const frameW = spec.w / spec.frames;
  const frameH = spec.h;

  const anim = animState.get(p.id);
  const defaultFrame = Math.min(2, spec.frames - 1);
  const frameIndex = anim && anim.moving ? Math.floor(performance.now() / 125) % spec.frames : defaultFrame;
  const flip = p.facing === "left";

  // ancora: base do sprite alinhada com a base da hitbox, centralizado horizontalmente nela
  const drawX = p.x + (Network.PLAYER_W - frameW) / 2;
  const drawY = p.y + Network.PLAYER_H - frameH;

  // --- ADICIONE AQUI O DESENHO DA SOMBRA NO CHÃO ---
  // Desenha ANTES do sprite para ficar por baixo
  ctx.save();
  // Posiciona o centro da elipse na base horizontal e vertical do jogador
  const centerX = drawX + frameW / 2;
  const centerY = p.y + Network.PLAYER_H; 
  
  // Define a cor preta com opacidade (0.3 = 30%)
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; 
  
  ctx.beginPath();
  // Desenha a elipse: elipse(x, y, raioX, raioY, rotação, anguloInicial, anguloFinal)
  // Ajuste os valores 20 (largura) e 8 (altura) se necessário para o tamanho da sombra
  ctx.ellipse(centerX, centerY, 20, 8, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
  // -------------------------------------------------

  if (sheet.ready) {
    ctx.save();
    if (flip) {
      ctx.translate(drawX + frameW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet.img, frameIndex * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
    } else {
      ctx.drawImage(sheet.img, frameIndex * frameW, 0, frameW, frameH, drawX, drawY, frameW, frameH);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = PLAYER_COLOR_HEX[p.color] || "#888";
    ctx.fillRect(p.x, p.y, Network.PLAYER_W, Network.PLAYER_H);
  }

  // indicador de "sou eu": triangulozinho branco acima da própria cabeça
  if (p.id === Network.myPeerId) {
    ctx.beginPath();
    ctx.moveTo(p.x + Network.PLAYER_W / 2, p.y - 4);
    ctx.lineTo(p.x + Network.PLAYER_W / 2 - 7, p.y - 16);
    ctx.lineTo(p.x + Network.PLAYER_W / 2 + 7, p.y - 16);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
}

function drawRoomScene(roomId, roomPlayers) {
  const room = ROOMS[roomId];
  if (!room) return;

  drawWithFallback(loadImageWithFallback(room.bg, ROOM_W, ROOM_H, room.bg), 0, 0);

  (room.staticBack || []).forEach(drawObject);

  if (room.lightSwitch) {
    drawWithFallback(
      loadImageWithFallback(room.lightSwitch.onSprite, room.lightSwitch.w, room.lightSwitch.h, room.lightSwitch.onSprite),
      room.lightSwitch.x,
      room.lightSwitch.y
    );
  }

  // --- EMISSÃO DE FUMAÇA DURANTE O SPRINT ---
  roomPlayers.forEach((p) => {
    const anim = animState.get(p.id);
    // Emite fumaça apenas se estiver se movendo E com sprint ativo E não transformando
    if (p.sprinting && anim && anim.moving && !p.transforming) {
      // Posição dos pés do jogador
      const feetX = p.x + Network.PLAYER_W / 2;
      const feetY = p.y + Network.PLAYER_H;
      
      // Emite partículas espaçadas
      if (Math.random() < 0.6) {
        createDustParticle(feetX, feetY);
      }
    }
  });

  const entities = [
    ...roomPlayers.map((p) => ({ bottom: p.y + Network.PLAYER_H, draw: () => drawPlayerSprite(p) })),
    ...(room.ySort || []).map((o) => ({
      bottom: o.y + o.h - o.h * (o.ySortOffsetFromBottom || 0),
      draw: () => drawObject(o),
    })),
  ];
  entities.sort((a, b) => a.bottom - b.bottom);
  
  // Desenha a fumaça antes das entidades para ficar no chão abaixo do Y-Sort
  updateAndDrawDust();

  entities.forEach((e) => e.draw());

  (room.staticFront || []).forEach(drawObject);
  drawToast();
}

function renderPlayerList(players) {
  playerCountEl.textContent = `${players.length} / ${Network.MAX_PLAYERS} na sala`;
}

// --- Sistema de Toast ---
let activeToast = null; // { text, expiresAt }

function showToast(text, durationMs = 3000) {
  activeToast = {
    text,
    expiresAt: performance.now() + durationMs,
  };
}

function drawToast() {
  if (!activeToast) return;

  const now = performance.now();

  if (now > activeToast.expiresAt) {
    activeToast = null;
    return;
  }

  const text = activeToast.text;

  ctx.save();

  // Fonte
  ctx.font = "bold 18px system-ui, sans-serif";

  const textWidth = ctx.measureText(text).width;

  const paddingX = 20;
  const paddingY = 10;

  const boxW = textWidth + paddingX * 2;
  const boxH = 36;

  // Posição horizontal centralizada
  const boxX = (ROOM_W - boxW) / 2;

  // Posição vertical: começa embaixo e sobe
  const marginBottom = 40;
  const targetY = ROOM_H - boxH - marginBottom;

  // Fundo arredondado
  ctx.fillStyle = "rgba(16, 19, 15, 0.75)";
  ctx.beginPath();
  ctx.roundRect(boxX, targetY, boxW, boxH, 20);
  ctx.fill();

  // Texto
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    text,
    ROOM_W / 2,
    targetY + boxH / 2
  );

  ctx.restore();
}

// --- callbacks de rede ---

Network.on("onRoomUpdate", (data) => {
  if (joined) return;

  const hostAlive = Network.isHostAlive(data);

  if (!hostAlive) {
    statusEl.textContent = data
      ? "O dono da sala caiu. Seja o novo dono."
      : "Sala vazia. Seja o primeiro a entrar.";
    joinBtn.disabled = false;
    playerCountEl.textContent = "";
    return;
  }

  if (data.status === "playing") {
    statusEl.textContent = "Partida em andamento. Aguarde a próxima.";
    joinBtn.disabled = true;
    return;
  }

  const full = data.playerCount >= Network.MAX_PLAYERS;
  playerCountEl.textContent = `${data.playerCount} / ${Network.MAX_PLAYERS} na sala`;
  statusEl.textContent = full ? "Sala cheia." : "Sala aberta.";
  joinBtn.disabled = full;
});

Network.on("onStateSync", (players) => {
  joined = true;
  joinBtn.classList.add("hidden");
  lobbyLeaveBtn.classList.remove("hidden");
  renderPlayerList(players);

  if (Network.isHost) {
    statusEl.textContent = "Você é o dono da sala.";
    startBtn.classList.remove("hidden");
    startBtn.disabled = players.length < MIN_PLAYERS;
    startBtn.textContent =
      players.length < MIN_PLAYERS
        ? `Iniciar(${MIN_PLAYERS})`
        : "Iniciar";
    timeEl.classList.remove("hidden");
  } else {
    statusEl.textContent = "Aguardando o dono iniciar.";
    startBtn.classList.add("hidden");
    timeEl.classList.add("hidden");
  }
});

Network.on("onColorAssigned", () => {
  statusEl.textContent = "Você entrou na sala.";
});

Network.on("onRoomFull", () => {
  statusEl.textContent = "Sala cheia. Aguarde uma vaga.";
  joinBtn.disabled = true;
});

Network.on("onHostLost", () => {
  joined = false;
  statusEl.textContent = "Dono da sala desconectado. Reconectando...";
  joinBtn.classList.remove("hidden");
  lobbyLeaveBtn.classList.add("hidden");
  startBtn.classList.add("hidden");
  setTimeout(() => Network.join(), 500 + Math.random() * 1000);
});

Network.on("onPromotedToHost", () => {
  statusEl.textContent = "O dono da sala saiu: você é o novo dono.";
});

Network.on("onGameStart", (musicTrack) => {
  lobbyEl.classList.add("hidden");
  gameEl.classList.remove("hidden");
  gameOverEl.classList.add("hidden");
  startMusic(musicTrack);
});

Network.on("onGameState", ({ players, timeLeft, roomLights }) => {
  updateAnimState(players);
  latestState = players;
  latestRoomLights = roomLights || {};

  const me = players.find((p) => p.id === Network.myPeerId);
  const myRoom = me && me.room;

  // som de infecção: só na transição pra infectado, só se aconteceu no meu cômodo
  players.forEach((p) => {
    const was = prevInfected.get(p.id);
    if (was === false && p.infected === true) {
      
      const colorName = p.color.charAt(0).toUpperCase() + p.color.slice(1);
      const message = `⚠️ ${colorName} foi infectado!`;

      // Toast do Capacitor com fallback para console.log no PC
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Toast) {
        window.Capacitor.Plugins.Toast.show({
          text: message,
          duration: 'short',
          position: 'top'
        });
      } else {
        showToast(`${message}`);
      }

      if (p.room === myRoom) {
        playSfx(SFX.infectado);
      }
    }
    prevInfected.set(p.id, p.infected);
  });

  // som do interruptor: só na transição on<->off, só se for o meu cômodo
  Object.keys(latestRoomLights).forEach((rid) => {
    const isOn = latestRoomLights[rid].on;
    const was = prevRoomLightOn[rid];
    if (was !== undefined && was !== isOn && rid === myRoom) {
      playSfx(SFX.interruptor);
    }
    prevRoomLightOn[rid] = isOn;
  });

  // passo/corrida: só quem está no meu cômodo agora, liga/desliga por jogador
  const roomPlayerIds = new Set();
  players.forEach((p) => {
    if (p.room !== myRoom) return;
    roomPlayerIds.add(p.id);
    const anim = animState.get(p.id);
    const moving = !!(anim && anim.moving) && !p.transforming;
    setLoopPlaying(`${p.id}:andando`, SFX.andando, moving && !p.sprinting);
    setLoopPlaying(`${p.id}:corrida`, SFX.corrida, moving && !!p.sprinting);
  });
  // quem não está mais no meu cômodo (saiu, ou eu que troquei de cômodo) para de tocar
  loopAudios.forEach((_, key) => {
    const id = key.split(":")[0];
    if (!roomPlayerIds.has(id)) setLoopPlaying(key, "", false);
  });

  if (timeLeft === null) {
    timeHud.classList.add("hidden");
  } else {
    timeHud.classList.remove("hidden");
    timerEl.classList.remove("hidden");
    timerEl.textContent = `${timeLeft}s`;
  }

  if (me) {
    sprintBtn.classList.toggle("on-cooldown", !me.sprintReady);
  }
});

Network.on("onGameOver", ({ reason, survivors }) => {
  stopMusic();
  stopAllLoopAudios();
  gameOverEl.classList.remove("hidden");
  const youSurvived = survivors.includes(Network.myPeerId);
  gameOverText.textContent =
    reason === "lastSurvivor"
      ? youSurvived
        ? "Você sobreviveu!"
        : "Os zumbis venceram."
      : youSurvived
      ? `Tempo esgotado! Você e mais ${Math.max(0, survivors.length - 1)} sobreviveram!`
      : "Tempo esgotado! Os zumbis perderam.";

  restartBtn.classList.toggle("hidden", !Network.isHost);
  if (Network.isHost) {
    const enough = latestState.length >= MIN_PLAYERS;
    restartBtn.disabled = !enough;
    restartBtn.textContent = enough
      ? "Reiniciar"
      : `Reiniciar (precisa de ${MIN_PLAYERS}+)`;
  }
});

Network.on("onError", (err) => {
  console.error(err);
  statusEl.textContent = "Erro de conexão. Recarregue.";
});

// --- ações do usuário ---

joinBtn.addEventListener("click", () => {
  joinBtn.disabled = true;
  statusEl.textContent = "Conectando...";
  Network.join();
});

startBtn.addEventListener("click", () => {
  Network.startGame(selectedDurationMin);
});

lobbyLeaveBtn.addEventListener("click", () => {
  Network.leaveRoom();
});

restartBtn.addEventListener("click", () => {
  Network.restartGame();
});

leaveBtn.addEventListener("click", () => {
  Network.leaveRoom();
});

// --- input: teclado ---

const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "l") Network.toggleLight();
});

function keyboardVector() {
  let dx = 0, dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  return { dx, dy };
}

// --- input: joystick virtual (isolado por toque) ---

let joystickActive = false;
let joystickVec = { dx: 0, dy: 0 };
let joystickTouchId = null; // Guarda o identificador único do toque do joystick
const JOY_RADIUS = 55;

function updateJoystick(clientX, clientY) {
  const rect = joystickZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > JOY_RADIUS) {
    dx = (dx / dist) * JOY_RADIUS;
    dy = (dy / dist) * JOY_RADIUS;
  }
  joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
  joystickVec = { dx: dx / JOY_RADIUS, dy: dy / JOY_RADIUS };
}

function resetJoystick() {
  joystickActive = false;
  joystickTouchId = null;
  joystickVec = { dx: 0, dy: 0 };
  joystickThumb.style.transform = "translate(0, 0)";
}

function joystickStart(e) {
  if (e.touches) {
    // Pega o primeiro toque que iniciou dentro do joystickZone
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    joystickActive = true;
    updateJoystick(touch.clientX, touch.clientY);
  } else {
    joystickActive = true;
    updateJoystick(e.clientX, e.clientY);
  }
}

function joystickMove(e) {
  if (!joystickActive) return;
  if (e.touches) {
    // Procura exatamente o toque que iniciou o joystick
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchId) {
        e.preventDefault();
        updateJoystick(e.touches[i].clientX, e.touches[i].clientY);
        break;
      }
    }
  } else {
    updateJoystick(e.clientX, e.clientY);
  }
}

function joystickEnd(e) {
  if (!joystickActive) return;
  if (e.touches) {
    // Só reseta se o toque finalizado for o do próprio joystick
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        resetJoystick();
        break;
      }
    }
  } else {
    resetJoystick();
  }
}

joystickZone.addEventListener("touchstart", joystickStart, { passive: false });
window.addEventListener("touchmove", joystickMove, { passive: false });
window.addEventListener("touchend", joystickEnd);
window.addEventListener("touchcancel", joystickEnd);

joystickZone.addEventListener("mousedown", joystickStart);
window.addEventListener("mousemove", joystickMove);
window.addEventListener("mouseup", resetJoystick);

// --- input: sprint (botão) — perto do interruptor vira toggle de luz em vez de sprint ---

function nearLightSwitch() {
  const me = latestState.find((p) => p.id === Network.myPeerId);
  if (!me) return false;
  const room = ROOMS[me.room];
  const sw = room && room.lightSwitch;
  if (!sw) return false;
  return (
    me.x < sw.x + sw.w &&
    me.x + Network.PLAYER_W > sw.x &&
    me.y < sw.y + sw.h &&
    me.y + Network.PLAYER_H > sw.y
  );
}

let sprintHeld = false;

function handleSprintPress() {
  if (nearLightSwitch()) {
    Network.toggleLight();
    return;
  }
  sprintHeld = true;
}

// --- input: sprint (botão) ---

sprintBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  e.stopPropagation();
  handleSprintPress();
}, { passive: false });

sprintBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  e.stopPropagation();
  sprintHeld = false;
}, { passive: false });

sprintBtn.addEventListener("touchcancel", (e) => {
  e.preventDefault();
  e.stopPropagation();
  sprintHeld = false;
}, { passive: false });

sprintBtn.addEventListener("mousedown", handleSprintPress);
window.addEventListener("mouseup", () => (sprintHeld = false));
window.addEventListener("keydown", (e) => {
  if (e.key === " ") sprintHeld = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === " ") sprintHeld = false;
});

// manda o input atual pro host no mesmo ritmo do tick (20Hz).
// Worker interval em vez de setInterval: não sofre throttling de aba
// em segundo plano, então o movimento não trava quando a janela perde foco.
function startWorkerIntervalLocal(ms, onTick) {
  const code = `setInterval(() => postMessage(1), ${ms});`;
  const worker = new Worker(URL.createObjectURL(new Blob([code], { type: "application/javascript" })));
  worker.onmessage = onTick;
  return worker;
}

startWorkerIntervalLocal(50, () => {
  if (gameEl.classList.contains("hidden")) return;
  const kb = keyboardVector();
  const dx = joystickActive ? joystickVec.dx : kb.dx;
  const dy = joystickActive ? joystickVec.dy : kb.dy;
  Network.sendInput(dx, dy, sprintHeld);
});

// --- render loop ---

function drawFrame() {
  requestAnimationFrame(drawFrame);
  if (gameEl.classList.contains("hidden")) return;

  const me = latestState.find((p) => p.id === Network.myPeerId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!me) return; // ainda sem estado de jogo

  const roomId = me.room;
  const room = ROOMS[roomId];
  if (!room) return;

  const lights = latestRoomLights[roomId];
  const lightsOff = room.lightSwitch && lights && lights.on === false;

  if (lightsOff) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWithFallback(
      loadImageWithFallback(room.lightSwitch.offSprite, room.lightSwitch.w, room.lightSwitch.h, room.lightSwitch.offSprite),
      room.lightSwitch.x,
      room.lightSwitch.y
    );
    return;
  }

  const roomPlayers = latestState.filter((p) => p.room === roomId);
  drawRoomScene(roomId, roomPlayers);
}
requestAnimationFrame(drawFrame);

Network.init();
startThemeMusic();
