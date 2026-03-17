const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const restartBtn = document.getElementById("restart");
const overlay = document.getElementById("overlay");

const TILE = 20;
const STEP_MS = 150;
const MAP = [
  "#####################",
  "#.........#.........#",
  "#.###.###.#.###.###.#",
  "#o###.###.#.###.###o#",
  "#...................#",
  "#.###.#.#####.#.###.#",
  "#.....#...#...#.....#",
  "#####.### # ###.#####",
  "    #.#  GGG  #.#    ",
  "#####.# ##### #.#####",
  "#.........#.........#",
  "#.###.###.#.###.###.#",
  "#o..#...........#..o#",
  "###.#.#.#####.#.#.###",
  "#.....#...#...#.....#",
  "#.#######.#.#######.#",
  "#...................#",
  "#####################"
];

const H = MAP.length;
const W = MAP[0].length;
canvas.width = W * TILE;
canvas.height = H * TILE;

let walls = new Set();
let pellets = new Set();
let power = new Set();
let ghosts = [];

let score = 0;
let lives = 3;
let gameOver = false;
let win = false;

const pacman = {
  x: 1,
  y: 1,
  dir: { x: 1, y: 0 },
  next: { x: 1, y: 0 },
  mouth: 0,
  poweredUntil: 0
};

function key(x, y) {
  return `${x},${y}`;
}

function isWall(x, y) {
  return walls.has(key(x, y));
}

function resetBoard() {
  walls = new Set();
  pellets = new Set();
  power = new Set();
  ghosts = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = MAP[y][x];
      if (c === "#") walls.add(key(x, y));
      if (c === ".") pellets.add(key(x, y));
      if (c === "o") power.add(key(x, y));
      if (c === "G") ghosts.push({ x, y, dir: randomDir() });
    }
  }

  pacman.x = 1;
  pacman.y = 1;
  pacman.dir = { x: 1, y: 0 };
  pacman.next = { x: 1, y: 0 };
}

function randomDir() {
  return [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ][Math.floor(Math.random() * 4)];
}

function moveEntity(entity) {
  const nx = entity.x + entity.dir.x;
  const ny = entity.y + entity.dir.y;
  if (!isWall(nx, ny)) {
    entity.x = nx;
    entity.y = ny;
    return;
  }
  if (entity === pacman) return;
  const options = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ].filter((d) => !isWall(entity.x + d.x, entity.y + d.y));
  if (options.length) entity.dir = options[Math.floor(Math.random() * options.length)];
}

function update(now) {
  if (gameOver || win) return;

  const ndx = pacman.x + pacman.next.x;
  const ndy = pacman.y + pacman.next.y;
  if (!isWall(ndx, ndy)) pacman.dir = { ...pacman.next };

  moveEntity(pacman);
  pacman.mouth += 0.25;

  const pKey = key(pacman.x, pacman.y);
  if (pellets.delete(pKey)) score += 10;
  if (power.delete(pKey)) {
    score += 50;
    pacman.poweredUntil = now + 6000;
  }

  for (const g of ghosts) {
    if (Math.random() < 0.2) g.dir = randomDir();
    moveEntity(g);

    if (g.x === pacman.x && g.y === pacman.y) {
      if (now < pacman.poweredUntil) {
        score += 200;
        g.x = 10;
        g.y = 8;
      } else {
        lives -= 1;
        if (lives <= 0) gameOver = true;
        pacman.x = 1;
        pacman.y = 1;
      }
    }
  }

  if (pellets.size === 0 && power.size === 0) win = true;

  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const w of walls) {
    const [x, y] = w.split(",").map(Number);
    drawCell(x, y, "#0e2a4a");
    ctx.strokeStyle = "#2f8bff";
    ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
  }

  for (const p of pellets) {
    const [x, y] = p.split(",").map(Number);
    ctx.fillStyle = "#ffe082";
    ctx.beginPath();
    ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of power) {
    const [x, y] = p.split(",").map(Number);
    ctx.fillStyle = "#ffd84a";
    ctx.beginPath();
    ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const angle = Math.abs(Math.sin(pacman.mouth)) * 0.65;
  const dirAngle =
    pacman.dir.x === 1 ? 0 :
    pacman.dir.x === -1 ? Math.PI :
    pacman.dir.y === 1 ? Math.PI / 2 :
    -Math.PI / 2;

  ctx.fillStyle = "#ffd84a";
  ctx.beginPath();
  ctx.moveTo(pacman.x * TILE + TILE / 2, pacman.y * TILE + TILE / 2);
  ctx.arc(
    pacman.x * TILE + TILE / 2,
    pacman.y * TILE + TILE / 2,
    TILE / 2 - 1,
    dirAngle + angle,
    dirAngle - angle + Math.PI * 2
  );
  ctx.fill();

  const scared = lastNow < pacman.poweredUntil;
  for (const g of ghosts) {
    ctx.fillStyle = scared ? "#4ea0ff" : "#ff5d73";
    ctx.beginPath();
    ctx.arc(g.x * TILE + TILE / 2, g.y * TILE + TILE / 2, TILE / 2 - 1, Math.PI, 0);
    ctx.lineTo(g.x * TILE + TILE - 1, g.y * TILE + TILE - 1);
    ctx.lineTo(g.x * TILE + 1, g.y * TILE + TILE - 1);
    ctx.closePath();
    ctx.fill();
  }

  if (gameOver || win) {
    overlay.classList.remove("hidden");
    overlay.textContent = gameOver ? "Fim de jogo. Toque em Reiniciar." : "Você venceu! Toque em Reiniciar.";
  } else {
    overlay.classList.add("hidden");
  }
}

let lastNow = 0;
let accumulator = 0;

function loop(now) {
  if (!lastNow) lastNow = now;
  let delta = now - lastNow;
  if (delta > 100) delta = 100;
  lastNow = now;
  accumulator += delta;

  while (accumulator >= STEP_MS) {
    update(now);
    accumulator -= STEP_MS;
  }

  draw();
  requestAnimationFrame(loop);
}

function setDirection(name) {
  if (name === "up") pacman.next = { x: 0, y: -1 };
  if (name === "down") pacman.next = { x: 0, y: 1 };
  if (name === "left") pacman.next = { x: -1, y: 0 };
  if (name === "right") pacman.next = { x: 1, y: 0 };
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") setDirection("up");
  if (e.key === "ArrowDown") setDirection("down");
  if (e.key === "ArrowLeft") setDirection("left");
  if (e.key === "ArrowRight") setDirection("right");
});

document.querySelectorAll("[data-dir]").forEach((btn) => {
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    setDirection(btn.dataset.dir);
  }, { passive: false });
  btn.addEventListener("click", () => setDirection(btn.dataset.dir));
});

let touchStartX = 0;
let touchStartY = 0;
canvas.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) setDirection(dx > 0 ? "right" : "left");
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) setDirection(dy > 0 ? "down" : "up");
}, { passive: true });

restartBtn.addEventListener("click", () => {
  score = 0;
  lives = 3;
  gameOver = false;
  win = false;
  pacman.poweredUntil = 0;
  resetBoard();
  scoreEl.textContent = "0";
  livesEl.textContent = "3";
});

resetBoard();
requestAnimationFrame(loop);
