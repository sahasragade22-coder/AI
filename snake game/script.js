const canvas = document.getElementById("game-board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");

const tileCount = 24;
const tileSize = canvas.width / tileCount;
const gameSpeed = 105;

let snake;
let food;
let direction;
let nextDirection;
let score;
let bestScore = Number(localStorage.getItem("snakeBestScore")) || 0;
let gameLoop;
let isRunning = false;
let isPaused = false;

bestScoreEl.textContent = bestScore;
resetGame();
drawGame();

function resetGame() {
  snake = [
    { x: 11, y: 12 },
    { x: 10, y: 12 },
    { x: 9, y: 12 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = score;
  food = createFood();
  isPaused = false;
  pauseBtn.textContent = "Pause";
}

function startGame() {
  clearInterval(gameLoop);
  resetGame();
  isRunning = true;
  messageEl.classList.add("hidden");
  startBtn.textContent = "Restart";
  gameLoop = setInterval(updateGame, gameSpeed);
}

function updateGame() {
  if (isPaused) return;

  direction = nextDirection;
  const head = { ...snake[0] };
  head.x += direction.x;
  head.y += direction.y;

  if (hasHitWall(head) || hasHitSelf(head)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    food = createFood();
  } else {
    snake.pop();
  }

  drawGame();
}

function drawGame() {
  ctx.fillStyle = "#111d10";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood();
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(246, 231, 191, 0.06)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= tileCount; i++) {
    const position = i * tileSize;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    ctx.fillStyle = index === 0 ? "#9be564" : "#61b15a";
    roundRect(
      segment.x * tileSize + inset,
      segment.y * tileSize + inset,
      tileSize - inset * 2,
      tileSize - inset * 2,
      7
    );
  });
}

function drawFood() {
  const centerX = food.x * tileSize + tileSize / 2;
  const centerY = food.y * tileSize + tileSize / 2;

  ctx.fillStyle = "#ff4f5e";
  ctx.beginPath();
  ctx.arc(centerX, centerY, tileSize * 0.36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f6e7bf";
  ctx.beginPath();
  ctx.arc(centerX - 4, centerY - 5, tileSize * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function createFood() {
  let newFood;

  do {
    newFood = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
  } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

  return newFood;
}

function hasHitWall(head) {
  return head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
}

function hasHitSelf(head) {
  return snake.some(segment => segment.x === head.x && segment.y === head.y);
}

function endGame() {
  clearInterval(gameLoop);
  isRunning = false;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("snakeBestScore", bestScore);
    bestScoreEl.textContent = bestScore;
  }

  messageEl.textContent = `Game Over - Score: ${score}`;
  messageEl.classList.remove("hidden");
}

function togglePause() {
  if (!isRunning) return;

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  messageEl.textContent = isPaused ? "Paused" : "";
  messageEl.classList.toggle("hidden", !isPaused);
}

function setDirection(newDirection) {
  const isOpposite =
    newDirection.x === -direction.x && newDirection.y === -direction.y;

  if (!isOpposite) {
    nextDirection = newDirection;
  }
}

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

document.addEventListener("keydown", event => {
  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    KeyD: { x: 1, y: 0 }
  };

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (keyMap[event.code]) {
    event.preventDefault();
    setDirection(keyMap[event.code]);
  }
});
