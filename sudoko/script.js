const boardElement = document.querySelector("#board");
const padElement = document.querySelector("#number-pad");
const timerElement = document.querySelector("#timer");
const mistakesElement = document.querySelector("#mistakes");
const messageElement = document.querySelector("#message");
const difficultyElement = document.querySelector("#difficulty");
const newGameButton = document.querySelector("#new-game");
const hintButton = document.querySelector("#hint");
const resetButton = document.querySelector("#reset");

const blanksByDifficulty = {
  easy: 36,
  medium: 45,
  hard: 54
};

let puzzle = [];
let solution = [];
let current = [];
let selectedIndex = null;
let mistakes = 0;
let seconds = 0;
let timerId = null;
let gameOver = false;

function shuffle(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function pattern(row, col) {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

function createSolution() {
  const base = [0, 1, 2];
  const rows = shuffle(base).flatMap(group => shuffle(base).map(row => group * 3 + row));
  const cols = shuffle(base).flatMap(group => shuffle(base).map(col => group * 3 + col));
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  return rows.flatMap(row => cols.map(col => nums[pattern(row, col)]));
}

function createPuzzle(fullSolution, blanks) {
  const nextPuzzle = [...fullSolution];
  const positions = shuffle([...Array(81).keys()]);

  for (let i = 0; i < blanks; i += 1) {
    nextPuzzle[positions[i]] = 0;
  }

  return nextPuzzle;
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    seconds += 1;
    timerElement.textContent = formatTime(seconds);
  }, 1000);
}

function setMessage(text, type = "") {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`.trim();
}

function renderBoard() {
  boardElement.innerHTML = "";

  current.forEach((value, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Row ${Math.floor(index / 9) + 1}, column ${(index % 9) + 1}`);
    cell.dataset.index = String(index);
    cell.textContent = value || "";

    if (puzzle[index] !== 0) {
      cell.classList.add("fixed");
    }

    cell.addEventListener("click", () => selectCell(index));
    boardElement.appendChild(cell);
  });

  updateHighlights();
}

function renderPad() {
  padElement.innerHTML = "";

  for (let number = 1; number <= 9; number += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(number);
    button.setAttribute("aria-label", `Place ${number}`);
    button.addEventListener("click", () => placeNumber(number));
    padElement.appendChild(button);
  }

  const erase = document.createElement("button");
  erase.type = "button";
  erase.textContent = "⌫";
  erase.setAttribute("aria-label", "Erase");
  erase.addEventListener("click", eraseCell);
  padElement.appendChild(erase);
}

function selectCell(index) {
  if (gameOver) return;

  selectedIndex = index;
  updateHighlights();
  setMessage("Choose a number or use your keyboard.");
}

function updateHighlights() {
  const cells = [...document.querySelectorAll(".cell")];
  cells.forEach(cell => cell.classList.remove("selected", "related", "match"));

  if (selectedIndex === null) return;

  const selectedRow = Math.floor(selectedIndex / 9);
  const selectedCol = selectedIndex % 9;
  const selectedBoxRow = Math.floor(selectedRow / 3);
  const selectedBoxCol = Math.floor(selectedCol / 3);
  const selectedValue = current[selectedIndex];

  cells.forEach((cell, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const sameBox = Math.floor(row / 3) === selectedBoxRow && Math.floor(col / 3) === selectedBoxCol;

    if (index === selectedIndex) {
      cell.classList.add("selected");
    } else if (row === selectedRow || col === selectedCol || sameBox) {
      cell.classList.add("related");
    }

    if (selectedValue && current[index] === selectedValue) {
      cell.classList.add("match");
    }
  });
}

function placeNumber(number) {
  if (selectedIndex === null || gameOver || puzzle[selectedIndex] !== 0) return;

  const cell = boardElement.children[selectedIndex];
  current[selectedIndex] = number;
  cell.textContent = String(number);
  cell.classList.remove("error");

  if (number !== solution[selectedIndex]) {
    mistakes += 1;
    mistakesElement.textContent = `Mistakes ${mistakes}/3`;
    cell.classList.add("error");
    setMessage("That number does not fit here.", "fail");

    if (mistakes >= 3) {
      endGame(false);
      return;
    }
  } else {
    setMessage("Nice placement.");
  }

  updateHighlights();
  checkWin();
}

function eraseCell() {
  if (selectedIndex === null || gameOver || puzzle[selectedIndex] !== 0) return;

  current[selectedIndex] = 0;
  boardElement.children[selectedIndex].textContent = "";
  boardElement.children[selectedIndex].classList.remove("error");
  updateHighlights();
  setMessage("Cell cleared.");
}

function giveHint() {
  if (gameOver) return;

  const openCells = current
    .map((value, index) => (value === 0 && puzzle[index] === 0 ? index : null))
    .filter(index => index !== null);

  if (!openCells.length) {
    checkWin();
    return;
  }

  const index = selectedIndex !== null && current[selectedIndex] === 0 && puzzle[selectedIndex] === 0
    ? selectedIndex
    : openCells[Math.floor(Math.random() * openCells.length)];

  current[index] = solution[index];
  selectedIndex = index;
  const cell = boardElement.children[index];
  cell.textContent = String(solution[index]);
  cell.classList.remove("error");
  cell.classList.add("hint-flash");
  setTimeout(() => cell.classList.remove("hint-flash"), 800);
  updateHighlights();
  setMessage("Hint placed.");
  checkWin();
}

function checkWin() {
  const solved = current.every((value, index) => value === solution[index]);

  if (solved) {
    endGame(true);
  }
}

function endGame(won) {
  gameOver = true;
  clearInterval(timerId);
  selectedIndex = null;
  updateHighlights();
  setMessage(won ? `Solved in ${formatTime(seconds)}.` : "Game over. Start a new puzzle.", won ? "win" : "fail");
}

function newGame() {
  solution = createSolution();
  puzzle = createPuzzle(solution, blanksByDifficulty[difficultyElement.value]);
  current = [...puzzle];
  selectedIndex = null;
  mistakes = 0;
  seconds = 0;
  gameOver = false;
  timerElement.textContent = "00:00";
  mistakesElement.textContent = "Mistakes 0/3";
  setMessage("Select a cell to begin.");
  renderBoard();
  startTimer();
}

function resetPuzzle() {
  current = [...puzzle];
  selectedIndex = null;
  mistakes = 0;
  seconds = 0;
  gameOver = false;
  timerElement.textContent = "00:00";
  mistakesElement.textContent = "Mistakes 0/3";
  setMessage("Puzzle reset.");
  renderBoard();
  startTimer();
}

document.addEventListener("keydown", event => {
  if (/^[1-9]$/.test(event.key)) {
    placeNumber(Number(event.key));
  }

  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    eraseCell();
  }

  if (selectedIndex === null) return;

  const row = Math.floor(selectedIndex / 9);
  const col = selectedIndex % 9;
  const moves = {
    ArrowUp: row > 0 ? selectedIndex - 9 : selectedIndex,
    ArrowDown: row < 8 ? selectedIndex + 9 : selectedIndex,
    ArrowLeft: col > 0 ? selectedIndex - 1 : selectedIndex,
    ArrowRight: col < 8 ? selectedIndex + 1 : selectedIndex
  };

  if (event.key in moves) {
    event.preventDefault();
    selectCell(moves[event.key]);
  }
});

newGameButton.addEventListener("click", newGame);
hintButton.addEventListener("click", giveHint);
resetButton.addEventListener("click", resetPuzzle);
difficultyElement.addEventListener("change", newGame);

renderPad();
newGame();
