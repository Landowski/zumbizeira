const Network = (() => {
  const ROOM_ID = "main";
  const MAX_PLAYERS = 6;
  const COLORS = ["azul", "amarelo", "laranja", "rosa", "roxo", "verde"];

  const HEARTBEAT_INTERVAL = 2000;
  const HOST_HEARTBEAT_INTERVAL = 4000;
  const HOST_TIMEOUT_MS = 10000;
  const CLIENT_TIMEOUT_MS = 6000;

  const PLAYER_W = 54, PLAYER_H = 96;
  const SURVIVOR_SPEED = 280;
  const SPRINT_MULT = 2.5;
  const SPRINT_DURATION = 700;
  const SPRINT_COOLDOWN = 3000;
  const TICK_MS = 50;
  const DEFAULT_DURATION_MIN = 2;
  const BLACKOUT_MS = 8000;
  const TRANSFORM_MS = 3000;

  let currentDurationMin = DEFAULT_DURATION_MIN;

  let countdownStartTime = 0;
  const COUNTDOWN_DURATION_MS = 4000;

  let myName = "Jogador";
  let myRequestedColor = "azul";

  let tickInterval = null;
  let gameEndTime = 0;
  let roomLights = {};

  let db, roomRef;
  let peer = null;
  let myPeerId = null;
  let isHost = false;

  let colorQueue = [...COLORS];
  const players = new Map();

  let hostConn = null;
  let myColor = null;

  function setPlayerColor(color) {
    if (COLORS.includes(color)) {
      myRequestedColor = color;
    }
  }

  function setPlayerName(name) {
    myName = (name && name.trim()) ? name.trim().slice(0, 15) : "Jogador";
  }

  function startWorkerInterval(ms, onTick) {
    const code = `setInterval(() => postMessage(1), ${ms});`;
    const worker = new Worker(URL.createObjectURL(new Blob([code], { type: "application/javascript" })));
    worker.onmessage = onTick;
    return () => worker.terminate();
  }

  const callbacks = {
    onRoomUpdate: () => {},
    onStateSync: () => {},
    onColorAssigned: () => {},
    onRoomFull: () => {},
    onHostLost: () => {},
    onError: () => {},
    onGameStart: () => {},
    onGameState: () => {},
    onGameOver: () => {},
    onPromotedToHost: () => {},
  };

  function genId() {
    return "p-" + Math.random().toString(36).slice(2, 10);
  }

  function playerBox(x, y) {
    return { x, y, w: PLAYER_W, h: PLAYER_H };
  }

  const FEET_H = 22;
  function feetBox(x, y) {
    return { x, y: y + PLAYER_H - FEET_H, w: PLAYER_W, h: FEET_H };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function diagonalLineY(d, x) {
    const xMin = Math.min(d.x1, d.x2), xMax = Math.max(d.x1, d.x2);
    if (x < xMin || x > xMax) return null;
    const t = (x - d.x1) / (d.x2 - d.x1);
    return d.y1 + t * (d.y2 - d.y1);
  }

  function diagonalBandAt(d, x) {
    const ly = diagonalLineY(d, x);
    if (ly == null) return null;
    return d.side === "below" ? [ly, ly + d.thickness] : [ly - d.thickness, ly];
  }

  function collidesWithDiagonal(d, box) {
    const xStart = Math.max(box.x, Math.min(d.x1, d.x2));
    const xEnd = Math.min(box.x + box.w, Math.max(d.x1, d.x2));
    if (xStart > xEnd) return false;
    for (let x = xStart; x < xEnd; x += 6) {
      const band = diagonalBandAt(d, x);
      if (band && box.y < band[1] && box.y + box.h > band[0]) return true;
    }
    const band = diagonalBandAt(d, xEnd);
    return !!(band && box.y < band[1] && box.y + box.h > band[0]);
  }

  function collidesInRoom(roomId, box) {
    const room = ROOMS[roomId];
    if (!room) return false;
    if (room.diagonals.some((d) => collidesWithDiagonal(d, box))) return true;
    return room.walls.some((w) => rectsOverlap(box, w));
  }

function spawnFreePoint(roomId) {
  const minY = roomId === "sala" ? 160 : 0;
  const maxY = ROOM_H - PLAYER_H;

  for (let i = 0; i < 300; i++) {
    const c = {
      x: Math.random() * (ROOM_W - PLAYER_W),
      y: minY + Math.random() * (maxY - minY),
    };
    if (!collidesInRoom(roomId, playerBox(c.x, c.y))) return c;
  }
  
  for (let y = minY; y < maxY; y += 20) {
    for (let x = 0; x < ROOM_W - PLAYER_W; x += 20) {
      if (!collidesInRoom(roomId, playerBox(x, y))) return { x, y };
    }
  }
  return { x: 100, y: 200 };
}

function spawnFarFrom(roomId, others, minDistance) {
  const minY = roomId === "sala" ? 160 : 0;
  const maxY = ROOM_H - PLAYER_H;
  
  let best = null, bestDist = -1;
  for (let i = 0; i < 300; i++) {
    const c = {
      x: Math.random() * (ROOM_W - PLAYER_W),
      y: minY + Math.random() * (maxY - minY),
    };
    if (collidesInRoom(roomId, playerBox(c.x, c.y))) continue;
    const d = others.length ? Math.min(...others.map((o) => Math.hypot(o.x - c.x, o.y - c.y))) : Infinity;
    if (d >= minDistance) return c;
    if (d > bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best || spawnFreePoint(roomId);
}

  function init() {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    roomRef = db.collection("rooms").doc(ROOM_ID);
    myPeerId = genId();

    roomRef.onSnapshot(
      (doc) => callbacks.onRoomUpdate(doc.exists ? doc.data() : null),
      (err) => callbacks.onError(err)
    );
  }

  function isHostAlive(data) {
    return !!(
      data &&
      data.hostPeerId &&
      data.hostHeartbeat &&
      Date.now() - data.hostHeartbeat.toMillis() < HOST_TIMEOUT_MS
    );
  }

  async function join() {
    if (peer) {
      peer.destroy();
      peer = null;
    }

    const snap = await roomRef.get();
    const data = snap.exists ? snap.data() : null;

    if (!isHostAlive(data)) {
      await tryBecomeHost();
    } else {
      connectAsClient(data.hostPeerId);
    }
  }

  async function tryBecomeHost() {
    try {
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(roomRef);
        const data = doc.exists ? doc.data() : null;

        if (isHostAlive(data)) {
          throw { retryAsClient: data.hostPeerId };
        }

        tx.set(roomRef, {
          hostPeerId: myPeerId,
          hostHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
          status: "waiting",
          playerCount: 0,
        });
      });
    } catch (e) {
      if (e && e.retryAsClient) {
        connectAsClient(e.retryAsClient);
        return;
      }
      callbacks.onError(e);
      return;
    }

    startAsHost();
  }

  function startAsHost() {
    isHost = true;
    colorQueue = [...COLORS];
    players.clear();

    peer = new Peer(myPeerId);
    peer.on("open", () => {
      addPlayer(myPeerId, null, myName, myRequestedColor);

      startWorkerInterval(HOST_HEARTBEAT_INTERVAL, () => {
        roomRef.update({
          hostHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
          playerCount: players.size,
        });
      });

      startWorkerInterval(2000, checkStaleClients);
    });

    peer.on("connection", (conn) => {
      conn.on("open", () => {
        conn.on("data", (msg) => handleHostMessage(conn, msg));
      });
      conn.on("close", () => removePlayer(conn.peer));
    });

    peer.on("error", (err) => callbacks.onError(err));
  }

  function handleHostMessage(conn, msg) {
    const p = players.get(msg.peerId || conn.peer);

    switch (msg.type) {
      case "JOIN":
        addPlayer(conn.peer, conn, msg.name, msg.requestedColor);
        break;
      case "HEARTBEAT":
        if (p) p.lastSeen = Date.now();
        break;
      case "LEAVE":
        removePlayer(conn.peer);
        break;
      case "INPUT":
        if (p) {
          p.input = { dx: msg.dx, dy: msg.dy, sprint: msg.sprint };
          if (msg.name) p.name = msg.name.slice(0, 15);
        }
        break;
      case "LIGHT_TOGGLE":
        handleLightToggle(msg.peerId || conn.peer);
        break;
    }
  }

  function handleLightToggle(peerId) {
    const p = players.get(peerId);
    if (!p) return;
    const room = ROOMS[p.room];
    const sw = room && room.lightSwitch;
    if (!sw || !rectsOverlap(playerBox(p.x, p.y), sw)) return;

    const ls = roomLights[p.room] || (roomLights[p.room] = { on: true, blackoutEndsAt: 0 });
    if (ls.on) {
      ls.on = false;
      ls.blackoutEndsAt = Date.now() + BLACKOUT_MS;
    } else {
      ls.on = true;
      ls.blackoutEndsAt = 0;
    }
  }

  function addPlayer(peerId, conn, name, requestedColor) {
    const pName = (name && name.trim()) ? name.trim().slice(0, 15) : "Jogador";
    const existing = players.get(peerId);
    
    if (existing) {
      existing.conn = conn;
      existing.lastSeen = Date.now();
      existing.name = pName;
      if (conn) conn.send({ type: "ASSIGN_COLOR", color: existing.color });
      broadcastState();
      return;
    }

    if (players.size >= MAX_PLAYERS) {
      if (conn) conn.send({ type: "ROOM_FULL" });
      return;
    }

    const color = COLORS.includes(requestedColor) ? requestedColor : "azul";

    players.set(peerId, { color, name: pName, conn, lastSeen: Date.now() });

    if (conn) conn.send({ type: "ASSIGN_COLOR", color });
    else myColor = color;

    broadcastState();
  }

  function removePlayer(peerId) {
    const p = players.get(peerId);
    if (!p) return;
    colorQueue.push(p.color);
    players.delete(peerId);
    broadcastState();
  }

  function checkStaleClients() {
    const now = Date.now();
    players.forEach((p, id) => {
      if (id !== myPeerId && now - p.lastSeen > CLIENT_TIMEOUT_MS) {
        if (p.conn) p.conn.close();
        removePlayer(id);
      }
    });
  }

  function broadcastState() {
    const list = [...players.entries()].map(([id, p]) => ({
      id,
      color: p.color,
      name: p.name || "Jogador",
      isHost: id === myPeerId,
    }));
    players.forEach((p) => {
      if (p.conn) p.conn.send({ type: "STATE_SYNC", players: list });
    });
    callbacks.onStateSync(list);
  }

  function broadcastMessage(msg) {
    players.forEach((p) => {
      if (p.conn) p.conn.send(msg);
    });
  }

  function startGame(durationMin) {
    if (!isHost || players.size < 2) return;
    if (typeof durationMin === "number") currentDurationMin = durationMin;

    const ids = [...players.keys()];
    const allRooms = Object.keys(ROOMS);

    const infectedId = ids[Math.floor(Math.random() * ids.length)];
    const survivorIds = ids.filter((id) => id !== infectedId);

    const survivorSpawns = survivorIds.map((id) => {
      const randomRoom = allRooms[Math.floor(Math.random() * allRooms.length)];
      return { id, room: randomRoom };
    });

    survivorSpawns.forEach(({ id, room }) => {
      const pos = spawnFreePoint(room);
      const p = players.get(id);
      
      p.room = room;
      p.x = pos.x;
      p.y = pos.y;
      p.infected = false;
      p.transforming = false;
      p.invulnerableUntil = 0;
      p.alive = true;
      p.facing = "right";
      p.input = { dx: 0, dy: 0, sprint: false };
      p.sprintUntil = 0;
      p.sprintCooldownUntil = 0;
    });

    const survivorsInSala = survivorSpawns
      .filter((s) => s.room === "sala")
      .map((s) => players.get(s.id));

    const zumbiPos = survivorsInSala.length > 0
      ? spawnFarFrom("sala", survivorsInSala, PLAYER_W * 6)
      : spawnFreePoint("sala");

    {
      const p = players.get(infectedId);
      p.room = "sala";
      p.x = zumbiPos.x;
      p.y = zumbiPos.y;
      p.infected = true;
      p.transforming = false;
      p.invulnerableUntil = 0;
      p.alive = true;
      p.facing = "right";
      p.input = { dx: 0, dy: 0, sprint: false };
      p.sprintUntil = 0;
      p.sprintCooldownUntil = 0;

    }

    roomLights = {};
    Object.keys(ROOMS).forEach((rid) => {
      if (ROOMS[rid].lightSwitch) roomLights[rid] = { on: true, blackoutEndsAt: 0 };
    });

    const now = Date.now();
    countdownStartTime = now;
    const matchStartTime = now + COUNTDOWN_DURATION_MS;

    gameEndTime = currentDurationMin > 0 ? matchStartTime + currentDurationMin * 60 * 1000 : Infinity;
    roomRef.update({ status: "playing" });
    const musicTrack = Math.floor(Math.random() * 6);
    broadcastMessage({ type: "GAME_START", musicTrack });
    callbacks.onGameStart(musicTrack);

    if (tickInterval) tickInterval();
    tickInterval = startWorkerInterval(TICK_MS, hostTick);
  }

  function hostTick() {
    const now = Date.now();
    const dt = TICK_MS / 1000;
    let countdownText = null;
    const elapsedCountdown = now - countdownStartTime;
    if (elapsedCountdown < 1000) {
      countdownText = "3";
    } else if (elapsedCountdown < 2000) {
      countdownText = "2";
    } else if (elapsedCountdown < 3000) {
      countdownText = "1";
    } else if (elapsedCountdown < 4000) {
      countdownText = "CORRA!";
    } else {
      countdownText = null;
    }

    const isCountingDown = elapsedCountdown < 3000;

    Object.keys(roomLights).forEach((rid) => {
      const ls = roomLights[rid];
      if (!ls.on && now >= ls.blackoutEndsAt) {
        ls.on = true;
        ls.blackoutEndsAt = 0;
      }
    });

    players.forEach((p) => {
      if (p.transforming && now >= p.transformUntil) p.transforming = false;
    });

    players.forEach((p) => {
      if (!p.alive || p.transforming || isCountingDown) return;
      const room = ROOMS[p.room];
      if (!room) return;

      const inLen = Math.hypot(p.input.dx, p.input.dy) || 1;
      const ndx = p.input.dx / inLen, ndy = p.input.dy / inLen;
      const moving = Math.hypot(p.input.dx, p.input.dy) > 0.05;

      if (ndx > 0.05) p.facing = "right";
      else if (ndx < -0.05) p.facing = "left";

      if (p.input.sprint && now >= p.sprintCooldownUntil) {
        p.sprintUntil = now + SPRINT_DURATION;
        p.sprintCooldownUntil = p.sprintUntil + SPRINT_COOLDOWN;
      }

      const isSprinting = now < p.sprintUntil;
      const speed = isSprinting ? SURVIVOR_SPEED * SPRINT_MULT : SURVIVOR_SPEED;

      if (moving) {
        const targetX = Math.min(ROOM_W - PLAYER_W, Math.max(0, p.x + ndx * speed * dt));
        const targetY = Math.min(ROOM_H - PLAYER_H, Math.max(0, p.y + ndy * speed * dt));
        const prevX = p.x, prevY = p.y;

        if (!collidesInRoom(p.room, playerBox(targetX, p.y))) p.x = targetX;
        if (!collidesInRoom(p.room, playerBox(p.x, targetY))) p.y = targetY;

        if (p.x === prevX && p.y === prevY && room.diagonals.length) {
          const ramp = room.diagonals.find(
            (d) =>
              collidesWithDiagonal(d, playerBox(targetX, targetY)) ||
              collidesWithDiagonal(d, playerBox(targetX, p.y)) ||
              collidesWithDiagonal(d, playerBox(p.x, targetY))
          );
          if (ramp) {
            const tlen = Math.hypot(ramp.x2 - ramp.x1, ramp.y2 - ramp.y1);
            let tx = (ramp.x2 - ramp.x1) / tlen;
            let ty = (ramp.y2 - ramp.y1) / tlen;
            if (ndx * tx + ndy * ty < 0) {
              tx = -tx;
              ty = -ty;
            }
            const slideX = Math.min(ROOM_W - PLAYER_W, Math.max(0, p.x + tx * speed * dt));
            const slideY = Math.min(ROOM_H - PLAYER_H, Math.max(0, p.y + ty * speed * dt));
            if (!collidesInRoom(p.room, playerBox(slideX, p.y))) p.x = slideX;
            if (!collidesInRoom(p.room, playerBox(p.x, slideY))) p.y = slideY;
          }
        }

        const box = playerBox(p.x, p.y);
        for (const ex of room.exits) {
          if (ex.dir === "left" && ndx >= 0) continue;
          if (ex.dir === "right" && ndx <= 0) continue;
          if (ex.dir === "up" && ndy >= 0) continue;
          if (ex.dir === "down" && ndy <= 0) continue;

          let triggered;
          if (ex.requireHalfOverlap) {
            const overlapW = Math.min(box.x + box.w, ex.x + ex.w) - Math.max(box.x, ex.x);
            const overlapH = Math.min(box.y + box.h, ex.y + ex.h) - Math.max(box.y, ex.y);
            triggered = overlapW > 0 && overlapH > 0 && overlapW >= PLAYER_W / 2;
          } else {
            triggered = rectsOverlap(box, ex);
          }

          if (triggered) {
            p.room = ex.toRoom;
            p.x = ex.spawnX;
            p.y = ex.spawnY;
            p.invulnerableUntil = now + 1500;
            break;
          }
        }
      }
    });

    const infectedByRoom = {};
    players.forEach((p) => {
      if (p.infected && !p.transforming) (infectedByRoom[p.room] ||= []).push(p);
    });
    players.forEach((p) => {
      if (p.infected || now < (p.invulnerableUntil || 0)) return;

      const infs = infectedByRoom[p.room];
      if (!infs) return;
      for (const inf of infs) {
        if (rectsOverlap(feetBox(p.x, p.y), feetBox(inf.x, inf.y))) {
          p.infected = true;
          p.transforming = true;
          p.transformUntil = now + TRANSFORM_MS;
          break;
        }
      }
    });

    const survivorsLeft = [...players.values()].filter((p) => !p.infected).length;
    const timeLeft = gameEndTime === Infinity ? null : Math.max(0, Math.round((gameEndTime - now) / 1000));

    broadcastGameState(timeLeft, countdownText);

    if (survivorsLeft === 0) return endGame("lastSurvivor");
    if (timeLeft !== null && timeLeft <= 0) return endGame("time");
  }

  function broadcastGameState(timeLeft, countdownText) {
    const now = Date.now();
    const list = [...players.entries()].map(([id, p]) => ({
      id,
      x: p.x,
      y: p.y,
      color: p.color,
      name: p.name || "Jogador",
      infected: p.infected,
      transforming: !!p.transforming,
      room: p.room,
      facing: p.facing,
      sprintReady: now >= p.sprintCooldownUntil,
      sprinting: now < p.sprintUntil,
    }));
    const lights = { ...roomLights };
    broadcastMessage({ type: "GAME_STATE", players: list, timeLeft, roomLights: lights, countdownText });
    callbacks.onGameState({ players: list, timeLeft, roomLights: lights, countdownText });
  }

  function endGame(reason) {
    if (tickInterval) tickInterval();
    tickInterval = null;
    const survivors = [...players.entries()]
      .filter(([, p]) => !p.infected)
      .map(([id]) => id);
    roomRef.update({ status: "waiting" });
    broadcastMessage({ type: "GAME_OVER", reason, survivors });
    callbacks.onGameOver({ reason, survivors });
  }

  function connectAsClient(hostPeerId) {
    isHost = false;
    peer = new Peer(myPeerId);

    peer.on("open", () => {
      hostConn = peer.connect(hostPeerId);

      hostConn.on("open", () => {
        hostConn.send({ 
          type: "JOIN", 
          peerId: myPeerId, 
          name: myName, 
          requestedColor: myRequestedColor 
        });
        startWorkerInterval(HEARTBEAT_INTERVAL, () => {
          hostConn.send({ type: "HEARTBEAT", peerId: myPeerId });
        });
      });

      hostConn.on("data", (msg) => {
        switch (msg.type) {
          case "ASSIGN_COLOR":
            myColor = msg.color;
            callbacks.onColorAssigned(msg.color);
            break;
          case "STATE_SYNC":
            callbacks.onStateSync(msg.players);
            break;
          case "ROOM_FULL":
            callbacks.onRoomFull();
            break;
          case "GAME_START":
            callbacks.onGameStart(msg.musicTrack);
            break;
          case "GAME_STATE":
            callbacks.onGameState({ players: msg.players, timeLeft: msg.timeLeft, roomLights: msg.roomLights, countdownText: msg.countdownText });
            break;
          case "GAME_OVER":
            callbacks.onGameOver({ reason: msg.reason, survivors: msg.survivors });
            break;
          case "PROMOTE":
            becomeHostFromPromotion(msg.players);
            break;
        }
      });

      hostConn.on("close", () => {
        if (isHost) return;
        callbacks.onHostLost();
      });
    });

    peer.on("error", (err) => callbacks.onError(err));
  }

  function becomeHostFromPromotion(list) {
    isHost = true;
    players.clear();

    const usedColors = new Set(list.map((p) => p.color));
    colorQueue = COLORS.filter((c) => !usedColors.has(c));

    list.forEach((p) => {
      players.set(p.id, { color: p.color, conn: null, lastSeen: Date.now() });
    });
    myColor = players.get(myPeerId)?.color ?? myColor;

    peer.on("connection", (conn) => {
      conn.on("open", () => {
        conn.on("data", (msg) => handleHostMessage(conn, msg));
      });
      conn.on("close", () => removePlayer(conn.peer));
    });

    roomRef.update({
      hostPeerId: myPeerId,
      hostHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
      status: "waiting",
      playerCount: players.size,
    });

    startWorkerInterval(HOST_HEARTBEAT_INTERVAL, () => {
      roomRef.update({
        hostHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
        playerCount: players.size,
      });
    });
    startWorkerInterval(2000, checkStaleClients);

    callbacks.onPromotedToHost();
    broadcastState();
  }

  function sendInput(dx, dy, sprint) {
    if (isHost) {
      const p = players.get(myPeerId);
      if (p) {
        p.input = { dx, dy, sprint };
        p.name = myName;
      }
    } else if (hostConn) {
      hostConn.send({ type: "INPUT", peerId: myPeerId, dx, dy, sprint, name: myName });
    }
  }

  function toggleLight() {
    if (isHost) {
      handleLightToggle(myPeerId);
    } else if (hostConn) {
      hostConn.send({ type: "LIGHT_TOGGLE", peerId: myPeerId });
    }
  }

  function restartGame() {
    startGame();
  }

  function leaveRoom() {
    if (!isHost) {
      if (hostConn) hostConn.send({ type: "LEAVE", peerId: myPeerId });
      if (peer) peer.destroy();
      location.reload();
      return;
    }

    const others = [...players.entries()].filter(([id]) => id !== myPeerId);

    if (others.length === 0) {
      roomRef.delete().catch(() => {});
      if (peer) peer.destroy();
      location.reload();
      return;
    }

    const [successorId, successor] = others[0];
    const payload = others.map(([id, p]) => ({ id, color: p.color }));
    if (successor.conn) successor.conn.send({ type: "PROMOTE", players: payload });

    setTimeout(() => {
      if (peer) peer.destroy();
      location.reload();
    }, 300);
  }

  return {
    init,
    join,
    setPlayerName,
    setPlayerColor,
    startGame,
    restartGame,
    leaveRoom,
    sendInput,
    toggleLight,
    isHostAlive,
    on(name, fn) {
      callbacks[name] = fn;
    },
    get isHost() {
      return isHost;
    },
    get myPeerId() {
      return myPeerId;
    },
    get myColor() {
      return myColor;
    },
    MAX_PLAYERS,
    PLAYER_W,
    PLAYER_H,
  };

})();