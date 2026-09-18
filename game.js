document.addEventListener("deviceready", async () => {
  const { StatusBar } = Capacitor.Plugins;
  await StatusBar.hide();
});

const statusEl = document.getElementById("status");
const playerCountEl = document.getElementById("playerCount");
const startBtn = document.getElementById("startBtn");
const roomSelectEl = document.getElementById("roomSelect");
const lobbyMainEl = document.getElementById("lobbyMain");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomCodeInput = document.getElementById("roomCodeInput");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomSelectStatus = document.getElementById("roomSelectStatus");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
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
const actionBtn = document.getElementById("actionBtn");
const actionBtnImg = actionBtn.querySelector("img");
const lobbyLeaveBtn = document.getElementById("lobbyLeaveBtn");
const gameOverEl = document.getElementById("gameOver");
const gameOverText = document.getElementById("gameOverText");
const restartBtn = document.getElementById("restartBtn");
const leaveBtn = document.getElementById("leaveBtn");
const nameInput = document.getElementById("name");
const characterOptions = document.querySelectorAll(".player-option");
const savedName = localStorage.getItem("playerName") || "Jogador";
const DEBUG_COLLIDERS = false;
const MIN_PLAYERS = 2;
const prevInfected = new Map();
const prevRoomLightOn = {};
const imgEnergetico = new Image();
imgEnergetico.src = "img/item-energetico.png";
const imgBanana = new Image();
imgBanana.src = "img/item-banana.png";
let currentRoomItems = [];
let joined = false;
let latestState = [];
let latestRoomLights = {};
let selectedDurationMin = 2;
let countdownSoundPlayed = false;

characterOptions.forEach((opt) => {
  opt.addEventListener("click", () => {
    characterOptions.forEach((o) => o.classList.remove("selected"));
    opt.classList.add("selected");
    playSfx(SFX.tempo);
    const selectedColor = opt.dataset.character;
    Network.setPlayerColor(selectedColor);
  });
});

nameInput.value = savedName;
Network.setPlayerName(savedName);
nameInput.addEventListener("input", (e) => {
  const val = e.target.value.slice(0, 15);
  localStorage.setItem("playerName", val);
  Network.setPlayerName(val);
});

createRoomBtn.addEventListener("click", () => {
  createRoomBtn.disabled = true;
  roomSelectStatus.textContent = "Criando sala...";
  Network.createRoom();
});

joinRoomBtn.addEventListener("click", () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) return;
  joinRoomBtn.disabled = true;
  roomSelectStatus.textContent = "Procurando sala...";
  Network.joinRoomByCode(code);
});

timeOptions.forEach((opt) => {
  opt.addEventListener("click", () => {
    selectedDurationMin = Number(opt.dataset.minutes);
    timeOptions.forEach((o) => o.classList.toggle("selected", o === opt));
    playSfx(SFX.tempo);
  });
});
document.querySelector('.time-option[data-minutes="2"]').classList.add("selected");

function updateCountdownUI(text) {
  const overlay = document.getElementById("countdownOverlay");
  const textEl = document.getElementById("countdownText");

  if (!overlay || !textEl) return;

  if (!text) {
    overlay.classList.add("hidden");
    textEl.textContent = "";
    return;
  }

  overlay.classList.remove("hidden");

  if (textEl.textContent !== text) {
    textEl.textContent = text;
    textEl.style.animation = "none";
    textEl.offsetHeight;
    textEl.style.animation = "";
  }
}

const HIDING_OBJECTS_KEYS = new Set([
  "img/sala-armario.png_426_127",
  "img/sala-mesa-baixo.png_317_614",
  "img/sala-mesa-baixo-2.png_592_563",
  "img/sala-tv-rack.png_718_495",
  "img/sala-mesa-esquerda.png_33_597",

  "img/quarto-cadeira.png_128_357",
  "img/quarto-mesa-esquerda.png_31_333",
  "img/quarto-mesa-direita.png_1127_519",
  "img/quarto-estante.png_424_138",

  "img/banheiro-planta.png_141_579",
  "img/banheiro-maquina.png_1028_167",
  "img/banheiro-armario.png_211_183",
  "img/banheiro-vaso.png_499_179",
   "img/banheiro-box.png_626_179",

  "img/rua-arbusto-baixo.png_357_663",
  "img/rua-arbusto-baixo.png_1017_663",
  "img/rua-arbusto-esquerdo.png_187_663",
  "img/rua-arvore.png_518_0",

  "img/rua2-pinheiros.png_8_7",
  "img/rua2-arbustos.png_187_660",
  "img/rua2-arbusto.png_1016_661",
  "img/rua2-arvore.png_777_368",

  "img/cozinha-mesa.png_489_420",
  "img/cozinha-armarinho.png_48_142",

  "img/quintal-piscina-topo.png_526_234",
  "img/quintal-arbusto-esquerda.png_50_74",
  "img/quintal-arbusto-arvore.png_981_95",
  "img/quintal-arvore.png_1100_0",
  "img/quintal-arbusto-baixo.png_39_457",

  "img/porao-tralhas.png_18_334",
  "img/porao-caixas-baixo.png_181_596",
  "img/porao-caixas-esquerda.png_28_538",
  "img/porao-armario.png_871_165",
  "img/porao-caixas-direita.png_1231_430"
]);

let currentRoomExitCooldown = false;

let playerTransition = null;

function checkRoomExitsLocal(me) {
  if (!me || currentRoomExitCooldown || playerTransition) return;

  const room = ROOMS[me.room];
  if (!room || !room.exits) return;

  for (const exit of room.exits) {
    const isColliding =
      me.x < exit.x + exit.w &&
      me.x + Network.PLAYER_W > exit.x &&
      me.y < exit.y + exit.h &&
      me.y + Network.PLAYER_H > exit.y;

    if (isColliding) {
      currentRoomExitCooldown = true;

      if (me.room === "rua2" && exit.toRoom === "quintal") {
        playSfx(SFX.pula);
        
        playerTransition = {
          type: "pula-pula",
          phase: "jumping_out",
          progress: 0,
          toRoom: exit.toRoom,
          spawnX: exit.spawnX,
          spawnY: exit.spawnY
        };
      } 
      else if (me.room === "rua2" && exit.toRoom === "cozinha") {
        playSfx(SFX.pulo);
        
        Network.changeRoom(exit.toRoom, exit.spawnX, exit.spawnY);
        playerTransition = {
          type: "janela",
          phase: "falling_in",
          progress: 0,
          spawnY: exit.spawnY
        };
      } else {
        Network.changeRoom(exit.toRoom, exit.spawnX, exit.spawnY);
      }

      setTimeout(() => { currentRoomExitCooldown = false; }, 500);
      break;
    }
  }
}

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

function preloadAssets() {
  Object.values(ROOMS).forEach((room) => {
    loadImageWithFallback(room.bg, ROOM_W, ROOM_H, room.bg);
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

const animState = new Map();

const dustParticles = [];

function createDustParticle(x, y) {
  dustParticles.push({
    x: x + (Math.random() * 10 - 5),
    y: y + (Math.random() * 4 - 2),
    size: Math.random() > 0.5 ? 12 : 16,
    life: 1.0,                        
    vx: (Math.random() - 0.5) * 0.5,
    vy: -Math.random() * 0.5 - 0.2     
  });
}

function updateAndDrawDust() {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.life -= 0.04;
    p.x += p.vx;
    p.y += p.vy;

    if (p.life <= 0) {
      dustParticles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.5})`;
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

function updatePlayerTransition(p) {
  if (!playerTransition || p.id !== Network.myPeerId) return 0;

  if (playerTransition.phase === "jumping_out") {
    playerTransition.progress += 0.05;
    if (playerTransition.progress >= 1) {
      Network.changeRoom(playerTransition.toRoom, playerTransition.spawnX, playerTransition.spawnY);
      playerTransition.phase = "falling_in";
      playerTransition.progress = 0;
    }
    return -300 * Math.sin(playerTransition.progress * (Math.PI / 2));
  }

  if (playerTransition.phase === "falling_in") {
    playerTransition.progress += 0.05;
    if (playerTransition.progress >= 1) {
      playerTransition = null;
      return 0;
    }
    return -300 * (1 - Math.sin(playerTransition.progress * (Math.PI / 2)));
  }

  return 0;
}

function drawPlayerSprite(p, isHidden = false) {
  const spriteSet = PLAYER_SPRITES[p.color];
  if (!spriteSet) return;
  const spec = p.transforming ? spriteSet.infectado : p.infected ? spriteSet.zumbi : spriteSet.base;
  const sheet = loadImageWithFallback(spec.src, spec.w, spec.h, spec.src);
  const frameW = spec.w / spec.frames;
  const frameH = spec.h;

  const anim = animState.get(p.id);
  const isMoving = !!(anim && anim.moving);
  const defaultFrame = Math.min(2, spec.frames - 1);
  const frameIndex = isMoving ? Math.floor(performance.now() / 125) % spec.frames : defaultFrame;
  const flip = p.facing === "left";

  let bounceY = 0;
  if (isMoving && (frameIndex === 1 || frameIndex === 3)) {
    bounceY = -5;
  }

  const transitionOffsetY = updatePlayerTransition(p);

  const drawX = p.x + (Network.PLAYER_W - frameW) / 2;
  const drawY = (p.y + Network.PLAYER_H - frameH) + bounceY + transitionOffsetY;

  if (!isHidden && transitionOffsetY === 0) {
    ctx.save();
    const centerX = p.x + Network.PLAYER_W / 2;
    const centerY = p.y + Network.PLAYER_H; 
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; 
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 20, 8, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

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

  if (!isHidden) {
    ctx.save();
    ctx.font = '20px "Press Start 2P", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    const nameX = p.x + Network.PLAYER_W / 2;
    const nameY = drawY - 6;
    const nameText = p.name ? p.name : "Jogador";

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.lineJoin = "miter";
    ctx.strokeText(nameText, nameX, nameY);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(nameText, nameX, nameY);

    if (p.energeticoUntil && p.energeticoUntil > Date.now()) {
          const secondsLeft = Math.ceil((p.energeticoUntil - Date.now()) / 1000);
          const counterY = nameY - 22;
          ctx.font = '28px "Press Start 2P", sans-serif';

          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.strokeText(`${secondsLeft}`, nameX, counterY);

          ctx.fillStyle = "#ffe066";
          ctx.fillText(`${secondsLeft}`, nameX, counterY);
    }

    ctx.restore();
  }
}

function drawMapItems(currentRoom) {
  if (!currentRoomItems || currentRoomItems.length === 0) return;

  currentRoomItems.forEach((item) => {
    if (item.room !== currentRoom) return;

    ctx.save();
    const centerX = item.x + item.w / 2;
    const centerY = item.y + item.h;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, item.w / 2.5, item.h / 10, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    const img = item.type === "energetico" ? imgEnergetico : imgBanana;

    if (item.dropped) {
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -item.w / 2, -item.h / 2, item.w, item.h);
      ctx.restore();
    } else {
      ctx.drawImage(img, item.x, item.y, item.w, item.h);
    }
  });
}

function drawRoomScene(roomId, roomPlayers) {
  const room = ROOMS[roomId];
  if (!room) return;

  drawWithFallback(loadImageWithFallback(room.bg, ROOM_W, ROOM_H, room.bg), 0, 0);

  drawMapItems(roomId);

  if (room.lightSwitch) {
    drawWithFallback(
      loadImageWithFallback(room.lightSwitch.onSprite, room.lightSwitch.w, room.lightSwitch.h, room.lightSwitch.onSprite),
      room.lightSwitch.x,
      room.lightSwitch.y
    );
  }

  roomPlayers.forEach((p) => {
    const anim = animState.get(p.id);
    if (p.sprinting && anim && anim.moving && !p.transforming) {
      const feetX = p.x + Network.PLAYER_W / 2;
      const feetY = p.y + Network.PLAYER_H;
      if (Math.random() < 0.6) {
        createDustParticle(feetX, feetY);
      }
    }
  });

  const ySortObjects = (room.ySort || []).map((o) => ({
    ...o,
    bottom: o.y + o.h - o.h * (o.ySortOffsetFromBottom || 0),
    draw: () => drawObject(o)
  }));

  const hidingCandidates = [
    ...(room.ySort || []),
    ...(room.staticFront || [])
  ].filter((o) => HIDING_OBJECTS_KEYS.has(`${o.src}_${o.x}_${o.y}`));

  const entities = [
    ...roomPlayers.map((p) => {
      const playerBottom = p.y + Network.PLAYER_H;

      const isHidden = hidingCandidates.some((o) => {
        const realBottom = o.y + o.h;
        const oBottom = o.ySortOffsetFromBottom ? (o.y + o.h - o.h * o.ySortOffsetFromBottom) : realBottom;

        const overlapX = p.x < o.x + o.w && p.x + Network.PLAYER_W > o.x;
        const overlapY = p.y < o.y + o.h && playerBottom > o.y;
        const effectiveBottom = realBottom >= 750 ? realBottom + 50 : oBottom;

        return overlapX && overlapY && playerBottom <= effectiveBottom;
      });

      return {
        bottom: playerBottom,
        draw: () => drawPlayerSprite(p, isHidden)
      };
    }),
    ...ySortObjects
  ];

  entities.sort((a, b) => a.bottom - b.bottom);

  updateAndDrawDust();

  entities.forEach((e) => e.draw());

  (room.staticFront || []).forEach(drawObject);

  if (DEBUG_COLLIDERS) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;

    (room.walls || []).forEach((w) => {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    (room.diagonals || []).forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.stroke();

      const offsetY = d.side === "below" ? d.thickness : -d.thickness;
      ctx.beginPath();
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.lineTo(d.x2, d.y2 + offsetY);
      ctx.lineTo(d.x1, d.y1 + offsetY);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = "rgba(0, 255, 0, 0.4)";
    ctx.strokeStyle = "rgba(0, 255, 0, 0.9)";

    (room.exits || []).forEach((ex) => {
      ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
      ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);
    });

    ctx.restore();

    ctx.restore();
  }

  drawToast();
}

function renderPlayerList(players) {
  playerCountEl.textContent = `${players.length}/${Network.MAX_PLAYERS} na sala`;
}

let activeToast = null;

function showToast(text, durationMs = 3600) {
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

  ctx.font = '17px "Press Start 2P", sans-serif';

  const textWidth = ctx.measureText(text).width;

  const paddingX = 20;
  const paddingY = 10;

  const boxW = textWidth + paddingX * 2;
  const boxH = 36 + paddingY ;

  const boxX = (ROOM_W - boxW) / 2;

  const marginBottom = 50;
  const targetY = ROOM_H - boxH - marginBottom;

  ctx.fillStyle = "rgba(16, 19, 15, 0.75)";
  ctx.beginPath();
  ctx.roundRect(boxX, targetY, boxW, boxH, 20);
  ctx.fill();

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

Network.on("onRoomCreated", (code) => {
  roomSelectEl.classList.add("hidden");
  lobbyMainEl.classList.remove("hidden");
  roomCodeDisplay.textContent = `Código da sala: ${code}`;
});

Network.on("onRoomNotFound", () => {
  roomSelectStatus.textContent = "Sala não encontrada";
  createRoomBtn.disabled = false;
  joinRoomBtn.disabled = false;
});

Network.on("onRoomUpdate", (data) => {
  if (joined) return;

  const hostAlive = Network.isHostAlive(data);

  if (!hostAlive) {
    statusEl.textContent = data
      ? "Entre e seja o dono"
      : "Sala vazia";
    playerCountEl.textContent = "";
    return;
  }

  if (data.status === "playing") {
    statusEl.textContent = "Partida em andamento";
    return;
  }

  const full = data.playerCount >= Network.MAX_PLAYERS;
  playerCountEl.textContent = `${data.playerCount}/${Network.MAX_PLAYERS} na sala`;
  statusEl.textContent = full ? "Sala cheia" : "Sala aberta";
});

Network.on("onStateSync", (players) => {
  joined = true;
  roomSelectEl.classList.add("hidden");
  lobbyMainEl.classList.remove("hidden");
  roomCodeDisplay.textContent = `Código da sala: ${Network.roomCode}`;
  lobbyLeaveBtn.classList.remove("hidden");
  renderPlayerList(players);

  if (Network.isHost) {
    statusEl.textContent = "Você é o dono";
    startBtn.classList.remove("hidden");
    startBtn.disabled = players.length < MIN_PLAYERS;
    startBtn.textContent =
      players.length < MIN_PLAYERS
        ? `Iniciar(${MIN_PLAYERS})`
        : "Iniciar";
    timeEl.classList.remove("hidden");
  } else {
    statusEl.textContent = "Aguarde o dono iniciar";
    startBtn.classList.add("hidden");
    timeEl.classList.add("hidden");
  }
});

Network.on("onColorAssigned", () => {
  statusEl.textContent = "Você entrou";
});

Network.on("onRoomFull", () => {
  statusEl.textContent = "Sala cheia, aguarde vaga";
});

Network.on("onHostLost", () => {
  joined = false;
  statusEl.textContent = "Dono da sala desconectado. Reconectando...";
  lobbyLeaveBtn.classList.add("hidden");
  startBtn.classList.add("hidden");
  setTimeout(() => Network.rejoinRoom(), 500 + Math.random() * 1000);
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

Network.on("onGameState", ({ players, timeLeft, roomLights, countdownText, items, pickedItems, itemsUsed, bananaSlips }) => {
  const me = players.find((p) => p.id === Network.myPeerId);

  if (me && pickedItems && pickedItems.length) {
    pickedItems.forEach((pi) => {
      if (pi.room === me.room) playSfx(SFX.item);
    });
  }

  if (me && itemsUsed && itemsUsed.length) {
    itemsUsed.forEach((iu) => {
      if (iu.room === me.room) playSfx(SFX.itemUsado);
    });
  }

  if (me && bananaSlips && bananaSlips.length) {
    bananaSlips.forEach((bs) => {
      if (bs.room === me.room) playSfx(SFX.banana);
    });
  }

  currentRoomItems = items || [];

  if (countdownText && !countdownSoundPlayed) {
    playSfx(SFX.contagem);
    countdownSoundPlayed = true;
  } else if (!countdownText) {
    countdownSoundPlayed = false;
  }
  updateCountdownUI(countdownText);

  updateAnimState(players);
  latestState = players;
  latestRoomLights = roomLights || {};

  updateActionButtonState(me);

  const myRoom = me && me.room;

  players.forEach((p) => {
    const was = prevInfected.get(p.id);
    if (was === false && p.infected === true) {
      
      const playerName = p.name || "Jogador";
      const message = `${playerName} virou zumbi!`;

      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Toast) {
        window.Capacitor.Plugins.Toast.show({
          text: message,
          duration: 'short',
          position: 'top'
        });
      } else {
        showToast(message);
      }

      if (p.room === myRoom) {
        playSfx(SFX.infectado);
      }
    }
    prevInfected.set(p.id, p.infected);
  });

  Object.keys(latestRoomLights).forEach((rid) => {
    const isOn = latestRoomLights[rid].on;
    const was = prevRoomLightOn[rid];
    prevRoomLightOn[rid] = isOn;
  });

  const roomPlayerIds = new Set();
  players.forEach((p) => {
    if (p.room !== myRoom) return;
    roomPlayerIds.add(p.id);
    const anim = animState.get(p.id);
    const moving = !!(anim && anim.moving) && !p.transforming;
  });

  loopAudios.forEach((_, key) => {
    const id = key.split(":")[0];
    if (!roomPlayerIds.has(id)) setLoopPlaying(key, "", false);
  });

  if (timeLeft === null) {
    timeHud.classList.add("hidden");
  } else {
    timeHud.classList.remove("hidden");
    timerEl.classList.remove("hidden");
    timerEl.textContent = `${timeLeft}`;
  }

  if (me) {
    sprintBtn.classList.toggle("on-cooldown", !me.sprintReady);
  }
});

Network.on("onGameOver", ({ reason, survivors }) => {
  if (latestRoomLights) {
    Object.keys(latestRoomLights).forEach((rid) => {
      latestRoomLights[rid] = { on: true, blackoutEndsAt: 0 };
    });
  }
  countdownSoundPlayed = false;
  updateCountdownUI(null);
  stopMusic();
  stopAllLoopAudios();
  gameOverEl.classList.remove("hidden");
  const youSurvived = survivors.includes(Network.myPeerId);
  gameOverText.innerHTML =
    reason === "lastSurvivor"
      ? youSurvived
        ? "Você sobreviveu!" : "Os zumbis venceram."
      : youSurvived
      ? `Você e mais ${Math.max(0, survivors.length - 1)} sobreviveram!`
      : `Os zumbis perderam.`;

  actionBtn.classList.add("hidden");
  restartBtn.classList.toggle("hidden", !Network.isHost);
  if (Network.isHost) {
    const enough = latestState.length >= MIN_PLAYERS;
    restartBtn.disabled = !enough;
    restartBtn.textContent = enough
      ? "Reiniciar"
      : `Reiniciar (${MIN_PLAYERS})`;
  }
});

Network.on("onError", (err) => {
  console.error(err);
  statusEl.textContent = "Erro. Recarregue o jogo.";
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

const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function keyboardVector() {
  let dx = 0, dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  return { dx, dy };
}

let wasPadLeftPressed = false;
let wasPadRightPressed = false;
let wasPadUpPressed = false;
let wasPadDownPressed = false;
let wasPadConfirmPressed = false;

function lobbyGamepadVector() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = Array.from(gamepads).find((g) => g !== null);
  if (!gp) return null;

  const axisX = gp.axes[0] || 0;
  const axisY = gp.axes[1] || 0;
  const deadzone = 0.5;

  return {
    left: (gp.buttons[14] && gp.buttons[14].pressed) || axisX < -deadzone,
    right: (gp.buttons[15] && gp.buttons[15].pressed) || axisX > deadzone,
    up: (gp.buttons[12] && gp.buttons[12].pressed) || axisY < -deadzone,
    down: (gp.buttons[13] && gp.buttons[13].pressed) || axisY > deadzone,
    confirm: !!(gp.buttons[0] && gp.buttons[0].pressed),
  };
}

function cycleCharacter(dir) {
  const opts = Array.from(characterOptions);
  const current = opts.findIndex((o) => o.classList.contains("selected"));
  opts[(current + dir + opts.length) % opts.length].click();
}

function cycleTime(dir) {
  const opts = Array.from(timeOptions);
  const current = opts.findIndex((o) => o.classList.contains("selected"));
  opts[(current + dir + opts.length) % opts.length].click();
}

startWorkerIntervalLocal(120, () => {
  if (lobbyEl.classList.contains("hidden")) return;

  const gp = lobbyGamepadVector();
  if (!gp) return;

  if (gp.right && !wasPadRightPressed) cycleCharacter(1);
  if (gp.left && !wasPadLeftPressed) cycleCharacter(-1);
  wasPadRightPressed = gp.right;
  wasPadLeftPressed = gp.left;

  if (!timeEl.classList.contains("hidden")) {
    if (gp.down && !wasPadDownPressed) cycleTime(1);
    if (gp.up && !wasPadUpPressed) cycleTime(-1);
  }
  wasPadDownPressed = gp.down;
  wasPadUpPressed = gp.up;

  if (gp.confirm && !wasPadConfirmPressed) {
    if (!roomSelectEl.classList.contains("hidden")) {
      if (!createRoomBtn.disabled) createRoomBtn.click();
    } else if (!startBtn.classList.contains("hidden") && !startBtn.disabled) {
      startBtn.click();
    }
  }
  wasPadConfirmPressed = gp.confirm;
});

function gamepadVector() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = Array.from(gamepads).find((g) => g !== null);

  if (!gp) return { dx: 0, dy: 0, sprint: false, action: false };

  let dx = gp.axes[0] || 0;
  let dy = gp.axes[1] || 0;

  const deadzone = 0.2;
  if (Math.abs(dx) < deadzone) dx = 0;
  if (Math.abs(dy) < deadzone) dy = 0;

  if (gp.buttons[14] && gp.buttons[14].pressed) dx = -1;
  if (gp.buttons[15] && gp.buttons[15].pressed) dx = 1;
  if (gp.buttons[12] && gp.buttons[12].pressed) dy = -1;
  if (gp.buttons[13] && gp.buttons[13].pressed) dy = 1;

  const sprint = !!(gp.buttons[0] && gp.buttons[0].pressed);
  const action = !!(gp.buttons[1] && gp.buttons[1].pressed);

  return { dx, dy, sprint, action };
}

let joystickActive = false;
let joystickVec = { dx: 0, dy: 0 };
let joystickTouchId = null;
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

function updateActionButtonState(me) {
  if (!me || !actionBtn) return;
  const hasItem = !!me.heldItem;
  const isNearLight = nearLightSwitch();
  if (hasItem || isNearLight) {
    actionBtn.classList.remove("hidden");
  } else {
    actionBtn.classList.add("hidden");
    return;
  }
  if (!actionBtnImg) return;
  if (me.heldItem === "energetico") {
    actionBtnImg.src = "img/item-energetico.png";
  } else if (me.heldItem === "banana") {
    actionBtnImg.src = "img/item-banana.png";
  } else if (isNearLight) {
    actionBtnImg.src = "img/item-lampada.png";
  }
}

let sprintHeld = false;
let actionTriggered = false;

function triggerAction() {
  const me = latestState.find((p) => p.id === Network.myPeerId);
  if (me && me.heldItem) {
    Network.useItem();
    return;
  }
  if (nearLightSwitch()) {
    Network.toggleLight();
  }
}

sprintBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  sprintHeld = true;
}, { passive: false });
sprintBtn.addEventListener("touchend", () => (sprintHeld = false));
sprintBtn.addEventListener("touchcancel", () => (sprintHeld = false));
sprintBtn.addEventListener("mousedown", () => (sprintHeld = true));
window.addEventListener("mouseup", () => (sprintHeld = false));

actionBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  triggerAction();
}, { passive: false });
actionBtn.addEventListener("click", triggerAction);

function startWorkerIntervalLocal(ms, onTick) {
  const code = `setInterval(() => postMessage(1), ${ms});`;
  const worker = new Worker(URL.createObjectURL(new Blob([code], { type: "application/javascript" })));
  worker.onmessage = onTick;
  return worker;
}

let wasPadActionPressed = false;

startWorkerIntervalLocal(50, () => {
  if (gameEl.classList.contains("hidden")) return;

  const me = latestState.find((p) => p.id === Network.myPeerId);
  if (me) {
    checkRoomExitsLocal(me);
  }

  if (playerTransition) {
    Network.sendInput(0, 0, false);
    return;
  }

  const kb = keyboardVector();
  const gp = gamepadVector();
  if (gp.action && !wasPadActionPressed) {
    triggerAction();
  }
  wasPadActionPressed = gp.action;
  const isSprinting = sprintHeld || keys.has(" ") || gp.sprint;
  let dx = kb.dx;
  let dy = kb.dy;
  if (Math.abs(gp.dx) > 0 || Math.abs(gp.dy) > 0) {
    dx = gp.dx;
    dy = gp.dy;
  }
  if (joystickActive) {
    dx = joystickVec.dx;
    dy = joystickVec.dy;
  }
  Network.sendInput(dx, dy, isSprinting);
});

function drawFrame() {
  requestAnimationFrame(drawFrame);
  if (gameEl.classList.contains("hidden")) return;

  const me = latestState.find((p) => p.id === Network.myPeerId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!me) return;

  updateActionButtonState(me);

  const roomId = me.room;
  const room = ROOMS[roomId];
  if (!room) return;

  const lights = latestRoomLights[roomId];
  const isGameOver = !gameOverEl.classList.contains("hidden");
  const lightsOff = room.lightSwitch && lights && lights.on === false && !isGameOver;

  if (lightsOff) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWithFallback(
      loadImageWithFallback(room.lightSwitch.offSprite, room.lightSwitch.w, room.lightSwitch.h, room.lightSwitch.offSprite),
      room.lightSwitch.x,
      room.lightSwitch.y
    );

    const secondsLeft = Math.max(0, Math.ceil((lights.blackoutEndsAt - Date.now()) / 1000));
    ctx.save();
    ctx.font = '20px "Press Start 2P", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const swX = room.lightSwitch.x + room.lightSwitch.w / 2;
    const swY = room.lightSwitch.y - 10;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeText(`${secondsLeft}`, swX, swY);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${secondsLeft}`, swX, swY);
    ctx.restore();

    drawToast();
    return;
  }

  const roomPlayers = latestState.filter((p) => p.room === roomId);
  drawRoomScene(roomId, roomPlayers);
}
requestAnimationFrame(drawFrame);

Network.init();
startThemeMusic();
