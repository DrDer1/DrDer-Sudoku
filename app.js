// DrDer-Sudoku app.js
// واجهة اللعبة ومنطق التفاعل. يعتمد على engine.js وstorage.js.
// لا مراحل، لا تقسيم مستويات، لا صعوبة معروضة، لا زر تلميح.
// الفوز يُحتسب وفق قواعد السودوكو (صف، عمود، مربع).

(function () {
  'use strict';

  var state = {
    difficulty: 'medium',
    seed: null,
    puzzle: null,
    solution: null,
    playerBoard: null,
    givenCells: null,
    selected: null,
    history: [],
    elapsedSeconds: 0,
    timerRunning: false,
    timerStartedAt: 0,
    paused: false,
    won: false
  };

  var dom = {};
  var cellsMatrix = null;

  function $(id) {
    return document.getElementById(id);
  }

  function cloneGrid(grid) {
    var copy = [];
    for (var r = 0; r < 9; r++) {
      var row = [];
      for (var c = 0; c < 9; c++) row.push(grid[r][c]);
      copy.push(row);
    }
    return copy;
  }

  function buildGivenMap(puzzle) {
    var map = [];
    for (var r = 0; r < 9; r++) {
      var row = [];
      for (var c = 0; c < 9; c++) row.push(puzzle[r][c] !== 0);
      map.push(row);
    }
    return map;
  }

  function formatTime(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds));
    var m = Math.floor(s / 60);
    var rem = s % 60;
    var mm = m < 10 ? '0' + m : String(m);
    var ss = rem < 10 ? '0' + rem : String(rem);
    return mm + ':' + ss;
  }

  function updateTimerDisplay() {
    dom.timerDisplay.textContent = formatTime(state.elapsedSeconds);
  }

  function startTimer() {
    if (state.won || state.paused) return;
    if (state.timerRunning) return;
    state.timerRunning = true;
    state.timerStartedAt = Date.now();
  }

  function pauseTimer() {
    if (!state.timerRunning) return;
    var now = Date.now();
    state.elapsedSeconds += Math.floor((now - state.timerStartedAt) / 1000);
    state.timerRunning = false;
    state.timerStartedAt = 0;
    updateTimerDisplay();
  }

  function resumeTimer() {
    if (state.won || state.paused) return;
    if (state.timerRunning) return;
    state.timerRunning = true;
    state.timerStartedAt = Date.now();
  }

  function stopTimer() {
    if (state.timerRunning) {
      var now = Date.now();
      state.elapsedSeconds += Math.floor((now - state.timerStartedAt) / 1000);
      state.timerRunning = false;
      state.timerStartedAt = 0;
    }
    updateTimerDisplay();
  }

  function tickTimer() {
    if (!state.timerRunning) return;
    var now = Date.now();
    var delta = Math.floor((now - state.timerStartedAt) / 1000);
    var total = state.elapsedSeconds + delta;
    dom.timerDisplay.textContent = formatTime(total);
  }

  function createBoardElement() {
    var board = $('sudokuBoard');
    board.innerHTML = '';
    cellsMatrix = [];

    for (var r = 0; r < 9; r++) {
      var rowCells = [];
      for (var c = 0; c < 9; c++) {
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('data-row', String(r));
        cell.setAttribute('data-col', String(c));
        cell.setAttribute('aria-label', 'خلية ' + (r + 1) + ' ' + (c + 1));
        if (c === 2 || c === 5) cell.classList.add('box-right');
        if (r === 2 || r === 5) cell.classList.add('box-bottom');
        board.appendChild(cell);
        rowCells.push(cell);
      }
      cellsMatrix.push(rowCells);
    }

    board.addEventListener('click', handleBoardClick);
  }

  function getCellElement(row, col) {
    if (!cellsMatrix) return null;
    if (row < 0 || row > 8 || col < 0 || col > 8) return null;
    return cellsMatrix[row][col];
  }

  function renderBoard() {
    var r, c, el, value;
    for (r = 0; r < 9; r++) {
      for (c = 0; c < 9; c++) {
        el = cellsMatrix[r][c];
        value = state.playerBoard[r][c];
        el.textContent = value === 0 ? '' : String(value);

        el.classList.remove('given', 'error', 'same-number', 'peer', 'selected');

        if (state.givenCells[r][c]) el.classList.add('given');
      }
    }
    applyHighlights();
    updateProgress();
  }

  function computeConflicts() {
    var conflicts = {};
    var r, c, v, cc, rr, br, bc, boxRow, boxCol;

    for (r = 0; r < 9; r++) {
      for (c = 0; c < 9; c++) {
        v = state.playerBoard[r][c];
        if (v === 0) continue;
        var duplicate = false;
        for (cc = 0; cc < 9; cc++) {
          if (cc !== c && state.playerBoard[r][cc] === v) { duplicate = true; break; }
        }
        if (!duplicate) {
          for (rr = 0; rr < 9; rr++) {
            if (rr !== r && state.playerBoard[rr][c] === v) { duplicate = true; break; }
          }
        }
        if (!duplicate) {
          boxRow = Math.floor(r / 3) * 3;
          boxCol = Math.floor(c / 3) * 3;
          for (br = boxRow; br < boxRow + 3 && !duplicate; br++) {
            for (bc = boxCol; bc < boxCol + 3; bc++) {
              if ((br !== r || bc !== c) && state.playerBoard[br][bc] === v) {
                duplicate = true;
                break;
              }
            }
          }
        }
        if (duplicate) conflicts[r + '_' + c] = true;
      }
    }
    return conflicts;
  }

  function applyHighlights() {
    var sel = state.selected;
    if (!sel) return;
    var selVal = state.playerBoard[sel.row][sel.col];
    var el = getCellElement(sel.row, sel.col);
    if (el) el.classList.add('selected');

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (r === sel.row && c === sel.col) continue;
        var cell = cellsMatrix[r][c];
        if (r === sel.row || c === sel.col) cell.classList.add('peer');
        if (selVal !== 0 && state.playerBoard[r][c] === selVal) cell.classList.add('same-number');
      }
    }

    var conflicts = computeConflicts();
    for (var key in conflicts) {
      if (!Object.prototype.hasOwnProperty.call(conflicts, key)) continue;
      var parts = key.split('_');
      var ce = getCellElement(Number(parts[0]), Number(parts[1]));
      if (ce) ce.classList.add('error');
    }
  }

  function updateProgress() {
    var filled = 0;
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (state.playerBoard[r][c] !== 0) filled++;
      }
    }
    dom.progressText.textContent = filled + ' / 81';
    dom.progressFill.style.width = (filled / 81 * 100).toFixed(1) + '%';
  }

  function selectCell(row, col) {
    if (state.paused || state.won) return;
    state.selected = { row: row, col: col };
    renderBoard();
  }

  function recordHistory(entry) {
    state.history.push(entry);
    if (state.history.length > 200) state.history.shift();
  }

  function placeNumber(num) {
    if (state.paused || state.won) return;
    if (!state.selected) return;
    var r = state.selected.row;
    var c = state.selected.col;
    if (state.givenCells[r][c]) return;

    var previous = state.playerBoard[r][c];
    if (previous === num) return;

    state.playerBoard[r][c] = num;
    recordHistory({ row: r, col: c, previous: previous });
    renderBoard();
    checkWin();
    persistProgress();
  }

  function eraseCell() {
    if (state.paused || state.won) return;
    if (!state.selected) return;
    var r = state.selected.row;
    var c = state.selected.col;
    if (state.givenCells[r][c]) return;
    var previous = state.playerBoard[r][c];
    if (previous === 0) return;
    state.playerBoard[r][c] = 0;
    recordHistory({ row: r, col: c, previous: previous });
    renderBoard();
    persistProgress();
  }

  function undoMove() {
    if (state.paused || state.won) return;
    if (state.history.length === 0) return;
    var entry = state.history.pop();
    if (!entry) return;
    if (state.givenCells[entry.row][entry.col]) return;
    state.playerBoard[entry.row][entry.col] = entry.previous;
    renderBoard();
    persistProgress();
  }

  function togglePause() {
    if (state.won) return;
    if (state.paused) {
      state.paused = false;
      dom.pauseOverlay.hidden = true;
      dom.pauseBtn.textContent = 'إيقاف';
      dom.pauseBtn.classList.remove('active');
      resumeTimer();
    } else {
      state.paused = true;
      pauseTimer();
      dom.pauseOverlay.hidden = false;
      dom.pauseBtn.textContent = 'استكمال';
      dom.pauseBtn.classList.add('active');
    }
    persistProgress();
  }

  function checkWin() {
    if (state.won) return;

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (state.playerBoard[r][c] === 0) return;
      }
    }

    if (!validateBoard(state.playerBoard)) return;

    state.won = true;
    stopTimer();
    var time = state.elapsedSeconds;
    dom.winTime.textContent = formatTime(time);
    dom.winOverlay.hidden = false;
    clearProgress();
  }

  function persistProgress() {
    if (state.won) return;
    saveProgress({
      difficulty: state.difficulty,
      seed: state.seed,
      puzzle: state.puzzle,
      playerBoard: state.playerBoard,
      elapsedSeconds: state.timerRunning
        ? state.elapsedSeconds + Math.floor((Date.now() - state.timerStartedAt) / 1000)
        : state.elapsedSeconds,
      paused: state.paused
    });
  }

  function buildNewPuzzle() {
    var baseSeed = 'DrDer-Sudoku-' + Date.now();
    var result = generatePuzzle({
      difficulty: 'medium',
      seed: baseSeed,
      maxAttempts: 10
    });

    if (!result || result.failed || !result.puzzle) {
      return false;
    }

    var solution = null;
    if (result.solution) {
      solution = cloneGrid(result.solution);
    } else {
      var solved = solveBoard(result.puzzle);
      if (solved && solved.solved && solved.board) {
        solution = cloneGrid(solved.board);
      }
    }
    if (!solution) return false;

    state.difficulty = 'medium';
    state.seed = result.seed;
    state.puzzle = cloneGrid(result.puzzle);
    state.solution = solution;
    state.playerBoard = cloneGrid(result.puzzle);
    state.givenCells = buildGivenMap(result.puzzle);
    state.history = [];
    state.selected = null;
    state.elapsedSeconds = 0;
    state.timerRunning = false;
    state.timerStartedAt = 0;
    state.paused = false;
    state.won = false;

    return true;
  }

  function startNewPuzzle() {
    stopTimer();
    dom.pauseOverlay.hidden = true;
    dom.winOverlay.hidden = true;
    dom.pauseBtn.textContent = 'إيقاف';
    dom.pauseBtn.classList.remove('active');

    var ok = buildNewPuzzle();
    if (!ok) {
      dom.progressText.textContent = 'تعذر توليد اللغز';
      return;
    }

    updateTimerDisplay();
    renderBoard();
    startTimer();
    persistProgress();
  }

  function resumeSavedProgress() {
    var saved = loadProgress();
    if (!saved) return false;

    var solution = null;
    var solved = solveBoard(saved.puzzle);
    if (solved && solved.solved && solved.board) {
      solution = cloneGrid(solved.board);
    }
    if (!solution) return false;

    state.difficulty = saved.difficulty || 'medium';
    state.seed = saved.seed;
    state.puzzle = cloneGrid(saved.puzzle);
    state.solution = solution;
    state.playerBoard = cloneGrid(saved.playerBoard);
    state.givenCells = buildGivenMap(saved.puzzle);
    state.history = [];
    state.selected = null;
    state.elapsedSeconds = saved.elapsedSeconds || 0;
    state.timerRunning = false;
    state.timerStartedAt = 0;
    state.paused = false;
    state.won = false;

    updateTimerDisplay();
    renderBoard();
    startTimer();
    return true;
  }

  function handleBoardClick(event) {
    var target = event.target;
    if (!target || !target.classList || !target.classList.contains('cell')) return;
    var row = Number(target.getAttribute('data-row'));
    var col = Number(target.getAttribute('data-col'));
    if (!isFinite(row) || !isFinite(col)) return;
    selectCell(row, col);
  }

  function handleNumberPad(event) {
    var target = event.target;
    if (!target || !target.classList || !target.classList.contains('num-btn')) return;
    var num = Number(target.getAttribute('data-num'));
    if (!isFinite(num)) return;
    placeNumber(num);
  }

  function handleKeyDown(event) {
    if (state.paused || state.won) return;
    var key = event.key;
    if (key >= '1' && key <= '9') {
      placeNumber(Number(key));
      event.preventDefault();
      return;
    }
    if (key === 'Backspace' || key === 'Delete' || key === '0') {
      eraseCell();
      event.preventDefault();
      return;
    }
    if (!state.selected) return;
    var r = state.selected.row;
    var c = state.selected.col;
    if (key === 'ArrowUp') { if (r > 0) selectCell(r - 1, c); event.preventDefault(); }
    else if (key === 'ArrowDown') { if (r < 8) selectCell(r + 1, c); event.preventDefault(); }
    else if (key === 'ArrowLeft') { if (c > 0) selectCell(r, c - 1); event.preventDefault(); }
    else if (key === 'ArrowRight') { if (c < 8) selectCell(r, c + 1); event.preventDefault(); }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (state.timerRunning) {
        pauseTimer();
        state.timerRunning = false;
      }
      persistProgress();
    } else {
      if (!state.paused && !state.won) {
        resumeTimer();
      }
    }
  }

  function handleBeforeUnload() {
    if (state.timerRunning) {
      pauseTimer();
    }
    persistProgress();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    var swPath = 'sw.js';
    navigator.serviceWorker.register(swPath).catch(function () {});
  }

  function init() {
    dom.board = $('sudokuBoard');
    dom.timerDisplay = $('timerDisplay');
    dom.progressText = $('progressText');
    dom.progressFill = $('progressFill');
    dom.pauseBtn = $('pauseBtn');
    dom.pauseOverlay = $('pauseOverlay');
    dom.winOverlay = $('winOverlay');
    dom.winTime = $('winTime');

    createBoardElement();

    document.querySelector('.number-pad').addEventListener('click', handleNumberPad);
    $('eraseBtn').addEventListener('click', eraseCell);
    $('undoBtn').addEventListener('click', undoMove);
    $('pauseBtn').addEventListener('click', togglePause);
    $('newPuzzleBtn').addEventListener('click', startNewPuzzle);
    $('resumeBtn').addEventListener('click', togglePause);
    $('newGameBtn').addEventListener('click', startNewPuzzle);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    setInterval(tickTimer, 1000);

    var resumed = false;
    try {
      resumed = resumeSavedProgress();
    } catch (e) {
      resumed = false;
    }
    if (!resumed) {
      startNewPuzzle();
    }

    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
