/*
 * Folhas de sprite dos jogadores. Por enquanto só "base" (andando,
 * direita/esquerda espelhada) e "zumbi" (idem) — infectado/vitória ficam
 * pra depois, como combinado.
 *
 * Cada folha é uma tira horizontal: largura total / frames = largura de
 * cada frame (mesma suposição usada no jogadores.html, confirmada pelos
 * números que você mandou — todas as divisões batem exatas).
 */

const PLAYER_SPRITES = {
  azul:    { base: { src: "img/j-azul.png",    w: 240, h: 99,  frames: 4 }, infectado: { src: "img/j-azul-infectado.png",    w: 67, h: 104, frames: 1 }, zumbi: { src: "img/j-azul-zumbi.png",    w: 248, h: 104, frames: 4 } },
  amarelo: { base: { src: "img/j-amarelo.png", w: 228, h: 106, frames: 4 }, infectado: { src: "img/j-amarelo-infectado.png", w: 59, h: 107, frames: 1 }, zumbi: { src: "img/j-amarelo-zumbi.png", w: 232, h: 108, frames: 4 } },
  laranja: { base: { src: "img/j-laranja.png", w: 256, h: 104, frames: 4 }, infectado: { src: "img/j-laranja-infectado.png", w: 72, h: 105, frames: 1 }, zumbi: { src: "img/j-laranja-zumbi.png", w: 264, h: 106, frames: 4 } },
  rosa:    { base: { src: "img/j-rosa.png",    w: 268, h: 95,  frames: 4 }, infectado: { src: "img/j-rosa-infectado.png",    w: 67, h: 109, frames: 1 }, zumbi: { src: "img/j-rosa-zumbi.png",    w: 272, h: 99,  frames: 4 } },
  roxo:    { base: { src: "img/j-roxo.png",    w: 260, h: 100, frames: 4 }, infectado: { src: "img/j-roxo-infectado.png",    w: 70, h: 103, frames: 1 }, zumbi: { src: "img/j-roxo-zumbi.png",    w: 264, h: 101, frames: 4 } },
  verde:   { base: { src: "img/j-verde.png",   w: 236, h: 102, frames: 4 }, infectado: { src: "img/j-verde-infectado.png",   w: 60, h: 105, frames: 1 }, zumbi: { src: "img/j-verde-zumbi.png",   w: 240, h: 104, frames: 4 } },
};

// cor "de exibição" (hex) só pra bolinha da lista do lobby — não influencia
// qual sprite é carregado, isso é sempre pelo nome da cor.
const PLAYER_COLOR_HEX = {
  azul: "#3b6fd9",
  amarelo: "#e9c46a",
  laranja: "#f4a261",
  rosa: "#e07bb0",
  roxo: "#9b5de5",
  verde: "#2a9d8f",
};

const ANIM_FPS = 8;