const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const conveyorFrames = [];
const NB_FRAMES = 8;

for (let i = 0; i < NB_FRAMES; i++) {
  const img = new Image();
  img.src = `pixil-frame-${i}.png`; // change ce chemin selon ton dossier
  conveyorFrames.push(img);
}

let animationFrame = 0;
let animationTimer = 0;
const VITESSE_ANIMATION = 8; // plus petit = plus rapide

const TILE_SIZE = 64;

const TILE_TYPES = {
  EMPTY: 0,
  CONVEYOR: 1,
  MACHINE: 2,
  GRASS: 3,
  WALL: 4,
};

const COLORS = {
  [TILE_TYPES.EMPTY]: "#ffffff",
  [TILE_TYPES.CONVEYOR]: "#a0a0a0",
  [TILE_TYPES.MACHINE]: "#ffcc00",
  [TILE_TYPES.GRASS]: "#8bc34a",
  [TILE_TYPES.WALL]: "#444444",
};

const tileImages = {
  [TILE_TYPES.EMPTY]: null,
  [TILE_TYPES.CONVEYOR]: new Image(),
  [TILE_TYPES.MACHINE]: null,
  [TILE_TYPES.GRASS]: null,
  [TILE_TYPES.WALL]: null,
};

tileImages[TILE_TYPES.CONVEYOR].src = "conveyorBelt.gif";

const map = [
    [4, 4, 4, 4, 4, 4, 4, 4],
    [4, 2, 3, 3, 3, 3, 3, 4],
    [4, 1, 3, 3, 3, 3, 3, 4],
    [4, 1, 3, 3, 3, 3, 3, 4],
    [4, 1, 1, 1, 2, 3, 3, 4],
    [4, 3, 3, 3, 3, 3, 3, 4],
    [4, 3, 3, 3, 3, 3, 3, 4],
    [4, 4, 4, 4, 4, 4, 4, 4],
];

function drawMap() {
  for (let ligne = 0; ligne < map.length; ligne++) {
    for (let col = 0; col < map[0].length; col++) {
      const tuile = map[ligne][col];
      let img = null;

      if (tuile === TILE_TYPES.CONVEYOR) {
        img = conveyorFrames[animationFrame];
      } else if (tileImages[tuile]) {
        img = tileImages[tuile];
      }

      if (img && img.complete) {
        ctx.drawImage(img, col * TILE_SIZE, ligne * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = COLORS[tuile] || "#000";
        ctx.fillRect(col * TILE_SIZE, ligne * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }

      ctx.strokeStyle = "#000";
      ctx.strokeRect(col * TILE_SIZE, ligne * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}



function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();

  animationTimer++;
  if (animationTimer >= VITESSE_ANIMATION) {
    animationTimer = 0;
    animationFrame = (animationFrame + 1) % NB_FRAMES;
  }

  requestAnimationFrame(gameLoop);
}

gameLoop()

document.getElementById("menu-btn").addEventListener("click", function() {
  const menu = document.getElementById("menu");
  if (menu.classList.contains("open")) {
      menu.classList.remove("open");
      menu.classList.add("close");
  } else {
      menu.classList.remove("close");
      menu.classList.add("open");
  }
});