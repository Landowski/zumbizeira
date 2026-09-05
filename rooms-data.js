/*
 * Dados de todos os cômodos, portados dos protótipos (cozinha.html,
 * quintal.html, porao.html, rua.html, sala.html, quarto.html).
 *
 * Todo caminho de imagem já inclui o prefixo "img/".
 *
 * Cada saída (exits) tem toRoom + spawnX/spawnY: é um primeiro palpite de
 * onde o jogador reaparece do outro lado, mesma lógica do proto-rooms.html
 * (perto da porta correspondente, deslocado pra dentro do cômodo de
 * destino). Precisa ser conferido visualmente porta por porta — já erramos
 * esse pareamento uma vez antes (proto-rooms.html) e é fácil errar de novo
 * aqui, com 10 portas de uma vez.
 */

const ROOM_W = 1376, ROOM_H = 768;

const ROOMS = {
  sala: {
    bg: "img/sala.png",
    walls: [
      { x: 0, y: 0, w: 656, h: 153 },
      { x: 747, y: 0, w: 629, h: 104 },
      { x: 1351, y: 0, w: 25, h: 315 },
      { x: 1351, y: 447, w: 25, h: 321 },
      { x: 0, y: 0, w: 25, h: 315 },
      { x: 0, y: 447, w: 25, h: 321 },
      { x: 0, y: 727, w: ROOM_W, h: 41 },
      { x: 839, y: 214, w: 214, h: 8 },
      { x: 338, y: 323, w: 84, h: 8 },
      { x: 830, y: 384, w: 105, h: 8 },
      { x: 477, y: 562, w: 79, h: 175 },
    ],
    diagonals: [],
    exits: [
      { x: 658, y: 80, w: 85, h: 17, toRoom: "quarto", spawnX: 673, spawnY: 625 },
      { x: 1372, y: 315, w: 4, h: 132, toRoom: "rua", spawnX: 1155, spawnY: 55 },
      { x: 0, y: 315, w: 4, h: 132, toRoom: "cozinha", spawnX: 1291, spawnY: 454 },
    ],
    staticBack: [],
    ySort: [
      { src: "img/sala-sofa.png", x: 815, y: 158, w: 260, h: 55 },
      { src: "img/sala-poltrona.png", x: 318, y: 254, w: 123, h: 73 },
      { src: "img/sala-mesinha-centro.png", x: 810, y: 328, w: 146, h: 61 },
      { src: "img/sala-mesa-esquerda.png", x: 33, y: 597, w: 276, h: 133 },
      { src: "img/sala-mesa-baixo.png", x: 317, y: 614, w: 150, h: 113 },
      { src: "img/sala-mesa-baixo-2.png", x: 592, y: 563, w: 69, h: 159 },
      { src: "img/sala-tv-rack.png", x: 718, y: 495, w: 357, h: 231 },
    ],
    lightSwitch: {
      x: 770, y: 124, w: 39, h: 40,
      onSprite: "img/interruptor-ligado.png",
      offSprite: "img/interruptor-desligado.png",
    },
  },

    quarto: {
    bg: "img/quarto.png",
    walls: [
      { x: 0, y: 153, w: 556, h: 25 },
      { x: 570, y: 90, w: 806, h: 25 },
      { x: 0, y: 153, w: 26, h: 765 },
      { x: 1350, y: 90, w: 26, h: 678 },
      { x: 0, y: 730, w: 631, h: 38 },
      { x: 744, y: 730, w: 632, h: 38 },
    ],
    diagonals: [],
    exits: [
      { x: 633, y: 765, w: 108, h: 8, toRoom: "sala", spawnX: 660, spawnY: 130 },
    ],
    staticBack: [],
    ySort: [
      { src: "img/quarto-cadeira.png", x: 128, y: 357, w: 102, h: 142 },
      { src: "img/quarto-mesa-esquerda.png", x: 31, y: 333, w: 98, h: 200 },
      { src: "img/quarto-mesa-direita.png", x: 1127, y: 519, w: 218, h: 207 },
      { src: "img/quarto-tv-baixo.png", x: 844, y: 713, w: 235, h: 16 },
    ],
    lightSwitch: {
      x: 592, y: 135, w: 39, h: 40,
      onSprite: "img/interruptor-ligado.png",
      offSprite: "img/interruptor-desligado.png",
    },
  },

  rua: {
    bg: "img/rua.png",
    walls: [
      { x: 243, y: 176, w: 145, h: 4 },
      { x: 933, y: 282, w: 160, h: 8 },
      { x: 0, y: 284, w: 77, h: 232 },
      { x: 1300, y: 284, w: 77, h: 232 },
    ],
    diagonals: [],
    exits: [
      { x: 1138, y: 0, w: 89, h: 3, requireHalfOverlap: true, toRoom: "sala", spawnX: 1292, spawnY: 333 },
    ],
    staticBack: [],
    ySort: [
      { src: "img/rua-cone.png", x: 33, y: 250, w: 38, h: 34 },
      { src: "img/rua-cone.png", x: 1306, y: 250, w: 38, h: 34 },
      { src: "img/rua-arbusto-baixo.png", x: 357, y: 663, w: 128, h: 105 },
      { src: "img/rua-arbusto-baixo.png", x: 1017, y: 663, w: 128, h: 105 },
      { src: "img/rua-arbusto-esquerdo.png", x: 187, y: 663, w: 129, h: 105 },
      { src: "img/rua-banco.png", x: 241, y: 130, w: 149, h: 46 },
      { src: "img/rua-carro.png", x: 900, y: 230, w: 226, h: 59 },
      { src: "img/rua-arvore.png", x: 518, y: 0, w: 338, h: 233, ySortOffsetFromBottom: 0.10 },
    ],
    lightSwitch: null,
  },

  cozinha: {
    bg: "img/cozinha.png",
    walls: [
      { x: 0, y: 230, w: ROOM_W, h: 10 },
      { x: 491, y: 486, w: 394, h: 77 },
    ],
    diagonals: [],
    exits: [
      { x: 0, y: 495, w: 5, h: 15, dir: "left", toRoom: "quintal", spawnX: 869, spawnY: 80 },
      { x: 1371, y: 495, w: 5, h: 15, dir: "right", toRoom: "sala", spawnX: 80, spawnY: 333 },
    ],
    staticBack: [],
    ySort: [
      { src: "img/cozinha-mesa.png", x: 488, y: 420, w: 399, h: 68 },
      { src: "img/cozinha-cadeira-baixo.png", x: 560, y: 570, w: 84, h: 96 },
      { src: "img/cozinha-cadeira-baixo.png", x: 732, y: 570, w: 84, h: 96 },
      { src: "img/cozinha-cadeira-lateral.png", x: 888, y: 431, w: 67, h: 90 },
      { src: "img/cozinha-cadeira-lateral.png", x: 421, y: 431, w: 67, h: 90, flip: true },
    ],
    lightSwitch: null,
  },

  quintal: {
    bg: "img/quintal.png",
    walls: [
      { x: 0, y: 0, w: 35, h: ROOM_H },
      { x: 0, y: 0, w: 849, h: 36 },
      { x: 943, y: 0, w: 433, h: 36 },
      { x: 433, y: 36, w: 416, h: 36 },
      { x: 943, y: 36, w: 77, h: 36 },
      { x: 0, y: 738, w: ROOM_W, h: 30 },
      { x: 1342, y: 0, w: 34, h: ROOM_H },
      { x: 547, y: 345, w: 280, h: 94 },
    ],
    diagonals: [],
    exits: [
      { x: 849, y: 0, w: 94, h: 13, toRoom: "cozinha", spawnX: 80, spawnY: 454 },
      { x: 151, y: 310, w: 34, h: 34, toRoom: "porao", spawnX: 80, spawnY: 7 },
    ],
    staticBack: [
      { src: "img/quintal-piscina-baixo.png", x: 524, y: 345, w: 327, h: 189 },
    ],
    staticFront: [
      { src: "img/quintal-piscina-topo.png", x: 526, y: 234, w: 324, h: 111 },
      { src: "img/quintal-cerca.png", x: 37, y: 683, w: 1299, h: 57 },
    ],
    ySort: [
      { src: "img/quintal-arbusto-esquerda.png", x: 50, y: 74, w: 220, h: 120, ySortOffsetFromBottom: 0.10 },
      { src: "img/quintal-arbusto-janela.png", x: 343, y: 99, w: 185, h: 112, ySortOffsetFromBottom: 0.15 },
      { src: "img/quintal-arbusto-arvore.png", x: 981, y: 95, w: 180, h: 186, ySortOffsetFromBottom: 0.30 },
      { src: "img/quintal-arvore.png", x: 1100, y: 0, w: 247, h: 261, ySortOffsetFromBottom: 0.10 },
      { src: "img/quintal-arbusto-baixo.png", x: 39, y: 457, w: 393, h: 236, ySortOffsetFromBottom: 0.10 },
    ],
    lightSwitch: null,
  },

  porao: {
    bg: "img/porao.png",
    walls: [
      { x: 1344, y: 0, w: 32, h: ROOM_H },
      { x: 0, y: 729, w: ROOM_W, h: 39 },
      { x: 599, y: 163, w: 280, h: 10 },
      { x: 876, y: 154, w: 468, h: 80 },
      { x: 0, y: 114, w: 193, h: 10 },
      { x: 0, y: 542, w: 32, h: 225 },
      { x: 373, y: 375, w: 188, h: 10 },
    ],
    diagonals: [
      { x1: 193, y1: 114, x2: 560, y2: 370, thickness: 10, side: "below" },
      { x1: 323, y1: 0, x2: 599, y2: 173, thickness: 10, side: "above" },
      { x1: 32, y1: 542, x2: 373, y2: 384, thickness: 10, side: "above" },
    ],
    exits: [
      { x: 0, y: 0, w: 15, h: 110, dir: "left", toRoom: "quintal", spawnX: 140, spawnY: 380 },
    ],
    staticBack: [],
    staticFront: [
      { src: "img/porao-caixas-baixo.png", x: 181, y: 596, w: 282, h: 130 },
      { src: "img/porao-caixas-esquerda.png", x: 28, y: 538, w: 114, h: 190 },
      { src: "img/porao-caixas-direita.png", x: 1231, y: 430, w: 117, h: 294 },
      { src: "img/porao-escada.png", x: 169, y: 1, w: 429, h: 386 },
    ],
    ySort: [],
    lightSwitch: {
      x: 797, y: 159, w: 39, h: 40,
      onSprite: "img/interruptor-ligado.png",
      offSprite: "img/interruptor-desligado.png",
    },
  },

};

const INITIAL_ROOM = "sala";