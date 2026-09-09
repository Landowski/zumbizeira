const AUDIO_DIR = "som/";

let SFX_VOLUME = 0.3;
let MUSIC_VOLUME = 0.3;

const SFX = {
  corrida: `${AUDIO_DIR}som-corrida.mp3`,
  infectado: `${AUDIO_DIR}som-infectado.mp3`,
  interruptor: `${AUDIO_DIR}som-interruptor.mp3`,
  tempo: `${AUDIO_DIR}som-tempo.mp3`,
  contagem: `${AUDIO_DIR}som-contagem.mp3`,
};

const MUSIC_TRACKS = [1, 2, 3, 4, 5, 6].map((n) => `${AUDIO_DIR}musica-${n}.mp3`);

let themeAudio = null;
const THEME_TRACK = `${AUDIO_DIR}musica-tema.mp3`;

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

let musicAudio = null;

function startMusic(trackIndex) {
  stopThemeMusic();
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

function pauseAllAudio() {
  if (themeAudio && !themeAudio.paused) themeAudio.pause();
  if (musicAudio && !musicAudio.paused) musicAudio.pause();
  loopAudios.forEach((a) => {
    if (!a.paused) a.pause();
  });
}

function resumeAllAudio() {
  if (themeAudio) themeAudio.play().catch(() => {});
  if (musicAudio) musicAudio.play().catch(() => {});
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseAllAudio();
  } else {
    resumeAllAudio();
  }
});

if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      pauseAllAudio();
    } else {
      resumeAllAudio();
    }
  });
}