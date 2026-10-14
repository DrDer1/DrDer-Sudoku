// DrDer-Sudoku app.js
// واجهة اللعبة ومنطق التفاعل.
// يعتمد على engine.js (محرك سودوكو يعمل على سلسلة 81 حرفاً)
// وعلى storage.js (تخزين محلي).
// التحويل بين مصفوفة 9×9 وسلسلة 81 حرفاً يجري محلياً في هذا الملف.
// لا مراحل، لا تلميح، لا حل مخزّن. الفوز يُحتسب وفق قواعد السودوكو.
// تم تعطيل التحقق من تفرد الحل لتسريع التوليد في المستويات العالية.
// متوافق مع GitHub Pages على المسار الفرعي /DrDer-Sudoku/.

(function () {
  'use strict';

  var BLANK_CHAR = '.';

  var DIFFICULTY_KEYS = ['easy', 'medium', 'hard', 'very-hard', 'insane', 'inhuman'];

  var state = {
    difficulty: 'easy',
    puzzle: null,
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

  function isKnownDifficulty(name) {
    if (typeof name !== 'string') return false;
    for (var i = 0; i < DIFFICULTY_KEYS.length; i++) {
      if (DIFFICULTY_KEYS[i] === name) return true;
    }
    return false;
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

  function stringToGrid(str) {
    if (typeof str !== 'string' || str.length !== 81) return null;
    var grid = [];
    for (var r = 0; r < 9; r++) {
      var row = [];
      for (var c = 0; c < 9; c++) {
        var ch = str.charAt(r * 9 + c);
        if (ch === BLANK_CHAR || ch === '0' || ch === ' ') {
          row.push(0);
        } else {
          var n = parseInt(ch, 10);
          if (!isFinite(n) || n < 1 || n > 9) return null;
          row.push(n);
        }
      }
      grid.push(row);
    }
    return grid;
  }

  function gridToString(grid) {
    var str = '';
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var v = grid[r][c];
        if (v === 0) str += BLANK_CHAR;
        else str += String(v);
      }
    }
    return str;
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
    if (dom.timerDisplay) {
      dom.timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }
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
    if (!dom.timerDisplay) return;
    var now = Date.now();
    var delta = Math.floor((now - state.timerStartedAt) / 1000);
    var total = state.elapsedSeconds + delta;
    dom.timerDisplay.textContent = formatTime(total);
  }

  function createBoardElement() {
    var board = $('sudokuBoard');
    if (!board) return;
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
    if (!cellsMatrix || !state.playerBoard) return;
    var r, c, el, value;
    for (r = 0; r < 9; r++) {
      for (c = 0; c < 9; c++) {
        el = cellsMatrix[r][c];
        if (!el) continue;
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
        if (!cell) continue;
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
    if (state.playerBoard) {
      for (var r = 0; r < 9; r++) {
        for (var c = 0; c < 9; c++) {
          if (state.playerBoard[r][c] !== 0) filled++;
        }
      }
    }
    if (dom.progressText) dom.progressText.textContent = filled + ' / 81';
    if (dom.progressFill) dom.progressFill.style.width = (filled / 81 * 100).toFixed(1) + '%';
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
    if (!state.playerBoard || !state.givenCells) return;
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
    if (!state.playerBoard || !state.givenCells) return;
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
    if (!state.playerBoard || !state.givenCells) return;
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
      if (dom.pauseOverlay) dom.pauseOverlay.hidden = true;
      if (dom.pauseBtn) {
        dom.pauseBtn.textContent = 'إيقاف';
        dom.pauseBtn.classList.remove('active');
      }
      resumeTimer();
    } else {
      state.paused = true;
      pauseTimer();
      if (dom.pauseOverlay) dom.pauseOverlay.hidden = false;
      if (dom.pauseBtn) {
        dom.pauseBtn.textContent = 'استكمال';
        dom.pauseBtn.classList.add('active');
      }
    }
    persistProgress();
  }

  function isCompleteAndValid(grid) {
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return false;
      }
    }
    var str = gridToString(grid);
    if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.validate_board !== 'function') {
      return false;
    }
    return sudoku.validate_board(str) === true;
  }

  function checkWin() {
    if (state.won) return;
    if (!state.playerBoard) return;
    if (!isCompleteAndValid(state.playerBoard)) return;

    state.won = true;
    stopTimer();
    var time = state.elapsedSeconds;
    if (dom.winTime) dom.winTime.textContent = formatTime(time);
    if (dom.winOverlay) dom.winOverlay.hidden = false;
    clearProgress();
  }

  function persistProgress() {
    if (state.won) return;
    if (!state.puzzle || !state.playerBoard) return;
    saveProgress({
      difficulty: state.difficulty,
      puzzle: state.puzzle,
      playerBoard: state.playerBoard,
      elapsedSeconds: state.timerRunning
        ? state.elapsedSeconds + Math.floor((Date.now() - state.timerStartedAt) / 1000)
        : state.elapsedSeconds,
      paused: state.paused
    });
  }

  // التوليد بدون التحقق من تفرد الحل.
  // المعامل الثاني false يعني عدم اشتراط الحل الوحيد، وهذا يسرّع التوليد كثيرًا.
  function generateNewPuzzle(difficulty) {
    if (typeof sudoku === 'undefined' || !sudoku || typeof sudoku.generate !== 'function') {
      return null;
    }
    var str = null;
    try {
      str = sudoku.generate(difficulty, false);
    } catch (e) {
      str = null;
    }
    if (typeof str !== 'string' || str.length !== 81) return null;
    return stringToGrid(str);
  }

  function startPuzzleWithDifficulty(difficulty) {
    if (!isKnownDifficulty(difficulty)) return;

    stopTimer();
    if (dom.pauseOverlay) dom.pauseOverlay.hidden = true;
    if (dom.winOverlay) dom.winOverlay.hidden = true;
    if (dom.pauseBtn) {
      dom.pauseBtn.textContent = 'إيقاف';
      dom.pauseBtn.classList.remove('active');
    }

    var grid = generateNewPuzzle(difficulty);
    if (!grid) return;

    state.difficulty = difficulty;
    state.puzzle = cloneGrid(grid);
    state.playerBoard = cloneGrid(grid);
    state.givenCells = buildGivenMap(grid);
    state.history = [];
    state.selected = null;
    state.elapsedSeconds = 0;
    state.timerRunning = false;
    state.timerStartedAt = 0;
    state.paused = false;
    state.won = false;

    if (dom.startScreen) dom.startScreen.hidden = true;
    if (dom.gameScreen) dom.gameScreen.hidden = false;

    updateTimerDisplay();
    renderBoard();
    startTimer();
    persistProgress();
  }

  function showStartScreen() {
    stopTimer();
    if (dom.pauseOverlay) dom.pauseOverlay.hidden = true;
    if (dom.winOverlay) dom.winOverlay.hidden = true;
    if (dom.startScreen) dom.startScreen.hidden = false;
    if (dom.gameScreen) dom.gameScreen.hidden = true;
  }

  function resumeSavedProgress() {
    var saved = loadProgress();
    if (!saved) return false;
    if (!saved.puzzle || !saved.playerBoard) return false;

    state.difficulty = isKnownDifficulty(saved.difficulty) ? saved.difficulty : 'easy';
    state.puzzle = cloneGrid(saved.puzzle);
    state.playerBoard = cloneGrid(saved.playerBoard);
    state.givenCells = buildGivenMap(saved.puzzle);
    state.history = [];
    state.selected = null;
    state.elapsedSeconds = saved.elapsedSeconds || 0;
    state.timerRunning = false;
    state.timerStartedAt = 0;
    state.paused = false;
    state.won = false;

    if (dom.startScreen) dom.startScreen.hidden = true;
    if (dom.gameScreen) dom.gameScreen.hidden = false;

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

  function handleStartButtons(event) {
    var target = event.target;
    while (target && target !== dom.startScreen) {
      if (target.classList && target.classList.contains('start-btn')) {
        var difficulty = target.getAttribute('data-difficulty');
        if (isKnownDifficulty(difficulty)) {
          startPuzzleWithDifficulty(difficulty);
        }
        return;
      }
      target = target.parentNode;
    }
  }

  function handleKeyDown(event) {
    if (state.paused || state.won) return;
    if (dom.gameScreen && dom.gameScreen.hidden) return;
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
      if (!state.paused && !state.won && dom.gameScreen && !dom.gameScreen.hidden) {
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
    try {
      var swUrl = new URL('sw.js', window.location.href);
      navigator.serviceWorker.register(swUrl.href, { scope: './' }).catch(function () {});
    } catch (e) {
      // تجاهل أي فشل في التسجيل.
    }
  }

  function init() {
    dom.startScreen = $('startScreen');
    dom.gameScreen = $('gameScreen');
    dom.board = $('sudokuBoard');
    dom.timerDisplay = $('timerDisplay');
    dom.progressText = $('progressText');
    dom.progressFill = $('progressFill');
    dom.pauseBtn = $('pauseBtn');
    dom.pauseOverlay = $('pauseOverlay');
    dom.winOverlay = $('winOverlay');
    dom.winTime = $('winTime');

    createBoardElement();

    if (dom.startScreen) {
      dom.startScreen.addEventListener('click', handleStartButtons);
    }

    var numberPad = document.querySelector('.number-pad');
    if (numberPad) numberPad.addEventListener('click', handleNumberPad);

    var eraseBtn = $('eraseBtn');
    if (eraseBtn) eraseBtn.addEventListener('click', eraseCell);

    var undoBtn = $('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoMove);

    if (dom.pauseBtn) dom.pauseBtn.addEventListener('click', togglePause);

    var newPuzzleBtn = $('newPuzzleBtn');
    if (newPuzzleBtn) newPuzzleBtn.addEventListener('click', showStartScreen);

    var resumeBtn = $('resumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

    var newGameBtn = $('newGameBtn');
    if (newGameBtn) newGameBtn.addEventListener('click', showStartScreen);

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
      showStartScreen();
    }

    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
