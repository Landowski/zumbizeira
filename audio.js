/*
 * Áudio do jogo. Nada disso trafega pela rede — cada cliente toca local,
 * com base no estado (posição, sprint, infecção, luz) que já recebe do host.
 *
 * Pasta assumida: "audio/", paralela à "img/". Se a pasta real tiver outro
 * nome, só trocar AUDIO_DIR aqui embaixo.
 */

const AUDIO_DIR = "som/";

// --- volumes: mexer só aqui pra ajustar tudo de uma vez ---
let SFX_VOLUME = 0.3;
let MUSIC_VOLUME = 0.26;

const SFX = {
  corrida: `${AUDIO_DIR}som-corrida.mp3`,
  infectado: `${AUDIO_DIR}som-infectado.mp3`,
  interruptor: `${AUDIO_DIR}som-interruptor.mp3`,
  tempo: `${AUDIO_DIR}som-tempo.mp3`,
};

const MUSIC_TRACKS = [1, 2, 3, 4, 5, 6].map((n) => `${AUDIO_DIR}musica-${n}.mp3`);

// --- música do tema / abertura ---
let themeAudio = null;
const THEME_TRACK = `${AUDIO_DIR}musica-tema.mp3`;

// --- sons de um tiro só (podem se sobrepor sem problema) ---
function playSfx(src) {
  const a = new Audio(src);
  a.volume = SFX_VOLUME;
  a.play().catch(() => {});
}

function startThemeMusic() {
  stopThemeMusic();
  themeAudio = new Audio(THEME_TRACK);
  themeAudio.loop = true;
  themeAudio.volume = MUSIC_VOLUME;
  themeAudio.play().catch(() => {});
}

function stopThemeMusic() {
  if (themeAudio) {
    themeAudio.pause();
    themeAudio.currentTime = 0;
    themeAudio = null;
  }
}

// --- sons em loop por "chave" (ex: `${playerId}:andando`). Cria o
// elemento uma vez só e depois só liga/pausa — evita estalo de reiniciar
// o áudio do zero a cada frame. ---
const loopAudios = new Map();

function setLoopPlaying(key, src, shouldPlay) {
  let a = loopAudios.get(key);
  if (!a) {
    a = new Audio(src);
    a.loop = true;
    a.volume = SFX_VOLUME;
    loopAudios.set(key, a);
  }
  if (shouldPlay) {
    if (a.paused) a.play().catch(() => {});
  } else if (!a.paused) {
    a.pause();
    a.currentTime = 0;
  }
}

function stopAllLoopAudios() {
  loopAudios.forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });
  loopAudios.clear();
}

// --- música de fundo: 1 de 6 faixas, sorteada a cada partida, loop infinito ---
let musicAudio = null;

function startMusic(trackIndex) {
  stopThemeMusic(); // <--- Para a música tema ao iniciar a partida
  stopMusic();
  const idx = typeof trackIndex === "number" ? trackIndex : Math.floor(Math.random() * MUSIC_TRACKS.length);
  musicAudio = new Audio(MUSIC_TRACKS[idx]);
  musicAudio.loop = true;
  musicAudio.volume = MUSIC_VOLUME;
  musicAudio.play().catch(() => {});
}

function stopMusic() {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.currentTime = 0;
    musicAudio = null;
  }
}

// --- GERENCIAMENTO DE PLANO DE FUNDO (MINIMIZADO / TELA BLOQUEADA) ---

function pauseAllAudio() {
  if (themeAudio && !themeAudio.paused) themeAudio.pause();
  if (musicAudio && !musicAudio.paused) musicAudio.pause();
  loopAudios.forEach((a) => {
    if (!a.paused) a.pause();
  });
}

function resumeAllAudio() {
  // Retoma apenas a música que estava ativa antes do pause
  if (themeAudio) themeAudio.play().catch(() => {});
  if (musicAudio) musicAudio.play().catch(() => {});
  // Os efeitos de passos/corrida (loopAudios) voltam automaticamente
  // assim que o tick do jogo rodar na 'game_2.js' chamando setLoopPlaying.
}

// Evento para navegadores e WebViews (minimizou a aba ou bloqueou a tela)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseAllAudio();
  } else {
    resumeAllAudio();
  }
});

// Evento nativo para o aplicativo (Capacitor)
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      pauseAllAudio();
    } else {
      resumeAllAudio();
    }
  });
}