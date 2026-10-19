"use strict";

const ROWS = 9;
const COLUMNS = 9;
const MINE_COUNT = 10;
const boardElement = document.querySelector("#board");
const mineCounterElement = document.querySelector("#mine-counter");
const timerElement = document.querySelector("#timer");
const statusElement = document.querySelector("#game-status");
const resetButton = document.querySelector("#reset-button");
const resetFaceElement = document.querySelector("#reset-face");

let board = [];
let flagsPlaced = 0;
let revealedCount = 0;
let gameStarted = false;
let gameOver = false;
let elapsedSeconds = 0;
let timerInterval = null;

function createBoard() {
  board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLUMNS }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
      element: null,
    })),
  );

  boardElement.replaceChildren();
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `행 ${row + 1}, 칸 ${column + 1}, 닫힘`);
      cell.dataset.row = String(row);
      cell.dataset.column = String(column);
      cell.addEventListener("click", () => revealCell(row, column));
      cell.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleFlag(row, column);
      });
      board[row][column].element = cell;
      boardElement.append(cell);
    }
  }

  updateMineCounter();
}

function placeMines(safeRow, safeColumn) {
  const candidates = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (row !== safeRow || column !== safeColumn) {
        candidates.push([row, column]);
      }
    }
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }

  for (const [row, column] of candidates.slice(0, MINE_COUNT)) {
    board[row][column].isMine = true;
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      board[row][column].adjacentMines = getNeighbors(row, column)
        .filter(([neighborRow, neighborColumn]) => board[neighborRow][neighborColumn].isMine)
        .length;
    }
  }
}

function getNeighbors(row, column) {
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;
      if (
        neighborRow >= 0 &&
        neighborRow < ROWS &&
        neighborColumn >= 0 &&
        neighborColumn < COLUMNS
      ) {
        neighbors.push([neighborRow, neighborColumn]);
      }
    }
  }
  return neighbors;
}

function startTimer() {
  if (timerInterval !== null) return;
  timerInterval = window.setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = formatCounter(elapsedSeconds);
  }, 1000);
}

function formatCounter(value) {
  return String(Math.min(value, 999)).padStart(3, "0");
}

function updateMineCounter() {
  mineCounterElement.textContent = formatCounter(MINE_COUNT - flagsPlaced);
}

function revealCell(row, column) {
  const cell = board[row][column];
  if (gameOver || cell.isRevealed || cell.isFlagged) return;

  if (!gameStarted) {
    gameStarted = true;
    placeMines(row, column);
    startTimer();
    statusElement.textContent = "숫자를 확인하며 안전한 칸을 열어보세요.";
  }

  if (cell.isMine) {
    finishGame(false, [row, column]);
    return;
  }

  revealSafeCells(row, column);
  if (revealedCount === ROWS * COLUMNS - MINE_COUNT) {
    finishGame(true);
  }
}

function revealSafeCells(row, column) {
  const queue = [[row, column]];

  while (queue.length > 0) {
    const [currentRow, currentColumn] = queue.shift();
    const cell = board[currentRow][currentColumn];
    if (cell.isRevealed || cell.isFlagged || cell.isMine) continue;

    cell.isRevealed = true;
    revealedCount += 1;
    renderCell(currentRow, currentColumn);

    if (cell.adjacentMines === 0) {
      for (const [neighborRow, neighborColumn] of getNeighbors(currentRow, currentColumn)) {
        const neighbor = board[neighborRow][neighborColumn];
        if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
          queue.push([neighborRow, neighborColumn]);
        }
      }
    }
  }
}

function toggleFlag(row, column) {
  const cell = board[row][column];
  if (gameOver || cell.isRevealed) return;

  cell.isFlagged = !cell.isFlagged;
  flagsPlaced += cell.isFlagged ? 1 : -1;
  renderCell(row, column);
  updateMineCounter();
}

function renderCell(row, column, exploded = false) {
  const cell = board[row][column];
  const element = cell.element;
  element.classList.toggle("cell--revealed", cell.isRevealed);
  element.classList.toggle("cell--flagged", cell.isFlagged);
  element.classList.toggle("cell--exploded", exploded);

  if (cell.isFlagged && !cell.isRevealed) {
    element.textContent = "🚩";
    element.setAttribute("aria-label", `행 ${row + 1}, 칸 ${column + 1}, 깃발`);
  } else if (cell.isRevealed && cell.isMine) {
    element.textContent = "💣";
    element.setAttribute("aria-label", `행 ${row + 1}, 칸 ${column + 1}, 지뢰`);
  } else if (cell.isRevealed && cell.adjacentMines > 0) {
    element.textContent = String(cell.adjacentMines);
    element.classList.add(`cell--number-${cell.adjacentMines}`);
    element.setAttribute(
      "aria-label",
      `행 ${row + 1}, 칸 ${column + 1}, 주변 지뢰 ${cell.adjacentMines}개`,
    );
  } else {
    element.textContent = "";
    element.setAttribute(
      "aria-label",
      `행 ${row + 1}, 칸 ${column + 1}, ${cell.isRevealed ? "빈 칸" : "닫힘"}`,
    );
  }
}

function finishGame(won, explodedPosition = null) {
  gameOver = true;
  window.clearInterval(timerInterval);
  timerInterval = null;

  if (won) {
    statusElement.textContent = `성공! ${elapsedSeconds}초 만에 모든 안전한 칸을 열었어요.`;
    resetFaceElement.textContent = "😎";
  } else {
    statusElement.textContent = "지뢰를 밟았어요. 새 게임으로 다시 도전해보세요.";
    resetFaceElement.textContent = "😵";
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const cell = board[row][column];
      const exploded =
        explodedPosition !== null &&
        explodedPosition[0] === row &&
        explodedPosition[1] === column;

      if (cell.isMine) {
        cell.isRevealed = true;
        renderCell(row, column, exploded);
      } else if (!won && cell.isFlagged) {
        cell.element.classList.add("cell--wrong-flag");
        cell.element.textContent = "✕";
        cell.element.setAttribute("aria-label", `행 ${row + 1}, 칸 ${column + 1}, 잘못 꽂은 깃발`);
      }
    }
  }
}

function resetGame() {
  window.clearInterval(timerInterval);
  timerInterval = null;
  flagsPlaced = 0;
  revealedCount = 0;
  gameStarted = false;
  gameOver = false;
  elapsedSeconds = 0;
  timerElement.textContent = "000";
  resetFaceElement.textContent = "🙂";
  statusElement.textContent = "칸을 열어 게임을 시작하세요.";
  createBoard();
}

resetButton.addEventListener("click", resetGame);
createBoard();
