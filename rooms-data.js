const ROOM_W = 1376, ROOM_H = 768;

const ROOMS = {
  sala: {
    bg: "img/sala.png",
    walls: [
      { x: 0, y: 0, w: 630, h: 128 },
      { x: 762, y: 0, w: 614, h: 104 },
      { x: 1351, y: 0, w: 25, h: 300 },
      { x: 1351, y: 462, w: 25, h: 306 },
      { x: 0, y: 0, w: 25, h: 300 },
      { x: 0, y: 462, w: 25, h: 306 },
      { x: 0, y: 727, w: ROOM_W, h: 41 },
      { x: 860, y: 214, w: 160, h: 2 },
      { x: 353, y: 323, w: 55, h: 2 },
      { x: 830, y: 384, w: 105, h: 2 },
      { x: 490, y: 605, w: 50, h: 120 },
    ],
    diagonals: [],
    exits: [
      { x: 658, y: 80, w: 85, h: 17, toRoom: "quarto", spawnX: 673, spawnY: 625 },
      { x: 1372, y: 315, w: 4, h: 132, toRoom: "rua", spawnX: 83, spawnY: 85 },
      { x: 0, y: 315, w: 4, h: 132, toRoom: "cozinha", spawnX: 1291, spawnY: 454 },
    ],
    staticBack: [],
    ySort: [
      { src: "img/sala-armario.png", x: 426, y: 127, w: 141, h: 129 },
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
      { x: 0, y: 0, w: 410, h: 180 },
      { x: 410, y: 0, w: 960, h: 145 },
      { x: 0, y: 0, w: 26, h: ROOM_H },
      { x: 1350, y: 0, w: 26, h: ROOM_H },
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
      { src: "img/quarto-estante.png", x: 424, y: 138, w: 147, h: 114 },
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
      { x: 650, y: 640, w: 80, h: 2 },
      { x: 950, y: 282, w: 120, h: 2 },
      { x: 1305, y: 0, w: 70, h: ROOM_H },
    ],
    diagonals: [],
    exits: [
      { x: 79, y: 0, w: 74, h: 3, requireHalfOverlap: true, toRoom: "sala", spawnX: 1240, spawnY: 333 },
    ],
    staticBack: [],
    ySort: [
      { src: "img/rua-arbusto-baixo.png", x: 357, y: 663, w: 128, h: 105 },
      { src: "img/rua-arbusto-baixo.png", x: 1017, y: 663, w: 128, h: 105 },
      { src: "img/rua-arbusto-esquerdo.png", x: 187, y: 663, w: 129, h: 105 },
      { src: "img/rua-banco.png", x: 614, y: 597, w: 149, h: 46 },
      { src: "img/rua-carro.png", x: 900, y: 230, w: 226, h: 59 },
      { src: "img/rua-arvore.png", x: 518, y: 0, w: 338, h: 233, ySortOffsetFromBottom: 0.10 },
    ],
    lightSwitch: null,
  },

  cozinha: {
    bg: "img/cozinha.png",
    walls: [
      { x: 0, y: 0, w: ROOM_W, h: 215 },
      { x: 491, y: 530, w: 394, h: 43 },
    ],
    diagonals: [],
    exits: [
      { x: 0, y: 495, w: 5, h: 15, dir: "left", toRoom: "quintal", spawnX: 869, spawnY: 80 },
      { x: 1371, y: 495, w: 5, h: 15, dir: "right", toRoom: "sala", spawnX: 80, spawnY: 333 },
    ],
    staticBack: [],
    ySort: [
      { src: "img/cozinha-mesa.png", x: 489, y: 420, w: 398, h: 110 },
      { src: "img/cozinha-cadeira-baixo.png", x: 560, y: 570, w: 84, h: 96 },
      { src: "img/cozinha-cadeira-baixo.png", x: 732, y: 570, w: 84, h: 96 },
      { src: "img/cozinha-cadeira-lateral.png", x: 888, y: 431, w: 67, h: 90 },
      { src: "img/cozinha-cadeira-lateral.png", x: 421, y: 431, w: 67, h: 90, flip: true },
      { src: "img/cozinha-armarinho.png", x: 48, y: 142, w: 121, h: 184 },
    ],
    lightSwitch: null,
  },

  quintal: {
    bg: "img/quintal.png",
    walls: [
      { x: 0, y: 0, w: 35, h: ROOM_H },
      { x: 0, y: 0, w: 830, h: 36 },
      { x: 966, y: 0, w: 413, h: 36 },
      { x: 0, y: 738, w: ROOM_W, h: 30 },
      { x: 1342, y: 0, w: 34, h: ROOM_H },
      { x: 557, y: 350, w: 260, h: 75 },
    ],
    diagonals: [],
    exits: [
      { x: 849, y: 0, w: 94, h: 13, toRoom: "cozinha", spawnX: 80, spawnY: 454 },
      { x: 151, y: 310, w: 34, h: 34, toRoom: "porao", spawnX: 220, spawnY: 30 },
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
      { x: 0, y: 0, w: 15, h: 110 }, // nova wall na esquerda
      { x: 1344, y: 0, w: 32, h: ROOM_H },
      { x: 0, y: 729, w: ROOM_W, h: 39 },
      { x: 599, y: 0, w: 748, h: 170 },
      { x: 0, y: 114, w: 193, h: 10 },
      { x: 0, y: 345, w: 32, h: 385 }, // esquerda
      { x: 0, y: 345, w: 500, h: 10 }, // embaixo da escada 6
      { x: 0, y: 335, w: 490, h: 10 }, // embaixo da escada 7
      { x: 0, y: 325, w: 475, h: 10 }, // embaixo da escada 8
      { x: 0, y: 315, w: 460, h: 10 }, // embaixo da escada 9
      { x: 0, y: 305, w: 445, h: 10 }, // embaixo da escada 10
      { x: 0, y: 295, w: 430, h: 10 }, // embaixo da escada 11
      { x: 0, y: 285, w: 420, h: 10 }, // embaixo da escada 12
      { x: 0, y: 275, w: 408, h: 10 }, // embaixo da escada 13
      { x: 0, y: 265, w: 390, h: 10 }, // embaixo da escada 14
      { x: 0, y: 255, w: 377, h: 10 }, // embaixo da escada 15
      { x: 0, y: 245, w: 363, h: 10 }, // embaixo da escada 16
      { x: 0, y: 235, w: 350, h: 10 }, // embaixo da escada 17
      { x: 0, y: 225, w: 338, h: 10 }, // embaixo da escada 18
      { x: 0, y: 215, w: 330, h: 10 }, // embaixo da escada 19
      { x: 0, y: 205, w: 310, h: 10 }, // embaixo da escada 20
      { x: 0, y: 195, w: 295, h: 10 }, // embaixo da escada 21
      { x: 0, y: 185, w: 283, h: 10 }, // embaixo da escada 22
      { x: 0, y: 175, w: 270, h: 10 }, // embaixo da escada 23
      { x: 0, y: 165, w: 255, h: 10 }, // embaixo da escada 24
      { x: 0, y: 155, w: 243, h: 10 }, // embaixo da escada 25
      { x: 0, y: 145, w: 230, h: 10 }, // embaixo da escada 26
      { x: 0, y: 135, w: 215, h: 10 }, // embaixo da escada 27
      { x: 0, y: 125, w: 206, h: 10 }, // embaixo da escada 28
    ],
    diagonals: [
      { x1: 193, y1: 114, x2: 500, y2: 340, thickness: 10, side: "below" },
      { x1: 323, y1: 0, x2: 599, y2: 173, thickness: 200, side: "above" },
    ],
    exits: [
      { x: 0, y: 0, w: 125, h: 1, toRoom: "quintal", spawnX: 140, spawnY: 170 },
    ],
    staticBack: [],
    staticFront: [
      { src: "img/porao-tralhas.png", x: 18, y: 334, w: 457, h: 257 },
      { src: "img/porao-caixas-baixo.png", x: 181, y: 596, w: 282, h: 130 },
      { src: "img/porao-caixas-esquerda.png", x: 28, y: 538, w: 114, h: 190 },
      { src: "img/porao-caixas-direita.png", x: 1231, y: 430, w: 117, h: 294 },
      { src: "img/porao-escada.png", x: 169, y: 1, w: 429, h: 386 },
    ],
    ySort: [
      { src: "img/porao-armario.png", x: 871, y: 165, w: 422, h: 163 },
    ],
    lightSwitch: {
      x: 797, y: 159, w: 39, h: 40,
      onSprite: "img/interruptor-ligado.png",
      offSprite: "img/interruptor-desligado.png",
    },
  },

};

const INITIAL_ROOM = "sala";