// DrDer-Sudoku app.js
// واجهة اللعبة ومنطق التفاعل.
// يعتمد على engine.js وstorage.js.

(function () {
  'use strict';

  var DIFFICULTY_LABELS = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
    expert: 'خبير',
    unresolved: 'غير محدد'
  };

  var state = {
    level: 1,
    difficulty: 'easy',
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
    won: false,
    hintedCells: {},
    lastCompletedLevel: null
  };

  var dom = {};
  var cellsMatrix = null;

  function $(id) {
    return document.getElementById(id);
  }

  function cloneGrid(grid) {
    if (!isValidBoardShape(grid)) return null;

    var copy = [];

    for (var r = 0; r < 9; r++) {
      copy.push(grid[r].slice());
    }

    return copy;
  }

  function buildGivenMap(puzzle) {
    var map = [];

    for (var r = 0; r < 9; r++) {
      var row = [];

      for (var c = 0; c < 9; c++) {
        row.push(puzzle[r][c] !== 0);
      }

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
    if (dom.timerDisplay) {
      dom.timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }
  }

  function startTimer() {
    if (state.won || state.paused || state.timerRunning) return;

    state.timerRunning = true;
    state.timerStartedAt = Date.now();
  }

  function pauseTimer() {
    if (!state.timerRunning) return;

    var now = Date.now();

    state.elapsedSeconds += Math.floor(
      (now - state.timerStartedAt) / 1000
    );

    state.timerRunning = false;
    state.timerStartedAt = 0;

    updateTimerDisplay();
  }

  function resumeTimer() {
    if (state.won || state.paused || state.timerRunning) return;

    state.timerRunning = true;
    state.timerStartedAt = Date.now();
  }

  function stopTimer() {
    if (state.timerRunning) {
      var now = Date.now();

      state.elapsedSeconds += Math.floor(
        (now - state.timerStartedAt) / 1000
      );

      state.timerRunning = false;
      state.timerStartedAt = 0;
    }

    updateTimerDisplay();
  }

  function tickTimer() {
    if (!state.timerRunning || !dom.timerDisplay) return;

    var delta = Math.floor(
      (Date.now() - state.timerStartedAt) / 1000
    );

    dom.timerDisplay.textContent = formatTime(
      state.elapsedSeconds + delta
    );
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
        cell.setAttribute(
          'aria-label',
          'خلية ' + (r + 1) + ' ' + (c + 1)
        );

        if (c === 2 || c === 5) {
          cell.classList.add('box-right');
        }

        if (r === 2 || r === 5) {
          cell.classList.add('box-bottom');
        }

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
    if (!cellsMatrix || !state.playerBoard || !state.givenCells) {
      return;
    }

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var el = cellsMatrix[r][c];
        var value = state.playerBoard[r][c];

        el.textContent = value === 0 ? '' : String(value);

        el.classList.remove(
          'given',
          'error',
          'hinted',
          'same-number',
          'peer',
          'selected'
        );

        if (state.givenCells[r][c]) {
          el.classList.add('given');
        }

        if (state.hintedCells[r + '_' + c]) {
          el.classList.add('hinted');
        }
      }
    }

    applyHighlights();
    updateProgress();
  }

  // يحدد جميع الخلايا التي تتكرر أرقامها في صف أو عمود أو مربع.
  function computeConflicts(board) {
    board = board || state.playerBoard;

    var conflicts = {};

    if (!isValidBoardShape(board)) return conflicts;

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var value = board[r][c];

        if (value === 0) continue;

        var duplicate = false;

        for (var cc = 0; cc < 9; cc++) {
          if (cc !== c && board[r][cc] === value) {
            duplicate = true;
            break;
          }
        }

        if (!duplicate) {
          for (var rr = 0; rr < 9; rr++) {
            if (rr !== r && board[rr][c] === value) {
              duplicate = true;
              break;
            }
          }
        }

        if (!duplicate) {
          var boxRow = Math.floor(r / 3) * 3;
          var boxCol = Math.floor(c / 3) * 3;

          for (
            var br = boxRow;
            br < boxRow + 3 && !duplicate;
            br++
          ) {
            for (var bc = boxCol; bc < boxCol + 3; bc++) {
              if (
                (br !== r || bc !== c) &&
                board[br][bc] === value
              ) {
                duplicate = true;
                break;
              }
            }
          }
        }

        if (duplicate) {
          conflicts[r + '_' + c] = true;
        }
      }
    }

    return conflicts;
  }

  // يبرز الخلية المحددة ونظيراتها، ويظهر جميع التعارضات بالأحمر.
  function applyHighlights() {
    var sel = state.selected;

    if (!cellsMatrix) return;

    if (sel) {
      var selVal = state.playerBoard[sel.row][sel.col];
      var selectedElement = getCellElement(sel.row, sel.col);

      if (selectedElement) {
        selectedElement.classList.add('selected');
      }

      for (var r = 0; r < 9; r++) {
        for (var c = 0; c < 9; c++) {
          if (r === sel.row && c === sel.col) continue;

          var cell = cellsMatrix[r][c];

          if (r === sel.row || c === sel.col) {
            cell.classList.add('peer');
          }

          if (selVal !== 0 && state.playerBoard[r][c] === selVal) {
            cell.classList.add('same-number');
          }
        }
      }
    }

    var conflicts = computeConflicts(state.playerBoard);

    for (var key in conflicts) {
      if (!Object.prototype.hasOwnProperty.call(conflicts, key)) {
        continue;
      }

      var parts = key.split('_');
      var conflictElement = getCellElement(
        Number(parts[0]),
        Number(parts[1])
      );

      if (conflictElement) {
        conflictElement.classList.add('error');
      }
    }
  }

  function updateProgress() {
    if (!dom.progressText || !dom.progressFill || !state.playerBoard) {
      return;
    }

    var filled = 0;

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (state.playerBoard[r][c] !== 0) {
          filled++;
        }
      }
    }

    dom.progressText.textContent = filled + ' / 81';
    dom.progressFill.style.width =
      (filled / 81 * 100).toFixed(1) + '%';
  }

  function updateStatusBar() {
    if (dom.levelDisplay) {
      dom.levelDisplay.textContent = String(state.level);
    }

    if (dom.difficultyDisplay) {
      dom.difficultyDisplay.textContent =
        DIFFICULTY_LABELS[state.difficulty] || state.difficulty;
    }
  }

  function selectCell(row, col) {
    if (state.paused || state.won) return;
    if (!isValidCoordinate(row, col)) return;

    state.selected = { row: row, col: col };

    renderBoard();
  }

  function recordHistory(entry) {
    state.history.push(entry);

    if (state.history.length > 200) {
      state.history.shift();
    }
  }

  function placeNumber(num) {
    if (state.paused || state.won || !state.selected) return;
    if (!isPlainInt(num) || num < 1 || num > 9) return;

    var r = state.selected.row;
    var c = state.selected.col;

    if (state.givenCells[r][c]) return;

    var previous = state.playerBoard[r][c];

    if (previous === num) return;

    state.playerBoard[r][c] = num;

    recordHistory({
      row: r,
      col: c,
      previous: previous
    });

    delete state.hintedCells[r + '_' + c];

    renderBoard();
    checkWin();
    persistProgress();
  }

  function eraseCell() {
    if (state.paused || state.won || !state.selected) return;

    var r = state.selected.row;
    var c = state.selected.col;

    if (state.givenCells[r][c]) return;

    var previous = state.playerBoard[r][c];

    if (previous === 0) return;

    state.playerBoard[r][c] = 0;

    recordHistory({
      row: r,
      col: c,
      previous: previous
    });

    delete state.hintedCells[r + '_' + c];

    renderBoard();
    persistProgress();
  }

  function undoMove() {
    if (state.paused || state.won || state.history.length === 0) {
      return;
    }

    var entry = state.history.pop();

    if (!entry) return;
    if (state.givenCells[entry.row][entry.col]) return;

    state.playerBoard[entry.row][entry.col] = entry.previous;

    delete state.hintedCells[
      entry.row + '_' + entry.col
    ];

    state.selected = {
      row: entry.row,
      col: entry.col
    };

    renderBoard();
    persistProgress();
  }

  function isValidCoordinate(row, col) {
    return (
      typeof row === 'number' &&
      typeof col === 'number' &&
      isFinite(row) &&
      isFinite(col) &&
      Math.floor(row) === row &&
      Math.floor(col) === col &&
      row >= 0 && row < 9 &&
      col >= 0 && col < 9
    );
  }

  function isPlainInt(value) {
    return (
      typeof value === 'number' &&
      isFinite(value) &&
      Math.floor(value) === value
    );
  }

  function isValidBoardShape(board) {
    if (!Array.isArray(board) || board.length !== 9) {
      return false;
    }

    for (var r = 0; r < 9; r++) {
      if (!Array.isArray(board[r]) || board[r].length !== 9) {
        return false;
      }

      for (var c = 0; c < 9; c++) {
        var value = board[r][c];

        if (
          !isPlainInt(value) ||
          value < 0 ||
          value > 9
        ) {
          return false;
        }
      }
    }

    return true;
  }

  // يتحقق من عدم تعارض الرقم مع بقية الخلايا.
  function isSafePlacement(row, col, num) {
    if (!isValidCoordinate(row, col)) return false;
    if (!isPlainInt(num) || num < 1 || num > 9) return false;
    if (!isValidBoardShape(state.playerBoard)) return false;

    for (var c = 0; c < 9; c++) {
      if (c !== col && state.playerBoard[row][c] === num) {
        return false;
      }
    }

    for (var r = 0; r < 9; r++) {
      if (r !== row && state.playerBoard[r][col] === num) {
        return false;
      }
    }

    var boxRow = Math.floor(row / 3) * 3;
    var boxCol = Math.floor(col / 3) * 3;

    for (var br = boxRow; br < boxRow + 3; br++) {
      for (var bc = boxCol; bc < boxCol + 3; bc++) {
        if (
          (br !== row || bc !== col) &&
          state.playerBoard[br][bc] === num
        ) {
          return false;
        }
      }
    }

    return true;
  }

  // يتحقق من أن الشبكة المكتملة حل صحيح للسودوكو.
  function isCompleteValidSolution(board) {
    if (!isValidBoardShape(board)) return false;

    for (var r = 0; r < 9; r++) {
      var rowSeen = {};

      for (var c = 0; c < 9; c++) {
        var rowValue = board[r][c];

        if (rowValue < 1 || rowValue > 9 || rowSeen[rowValue]) {
          return false;
        }

        rowSeen[rowValue] = true;
      }
    }

    for (var c = 0; c < 9; c++) {
      var colSeen = {};

      for (var r = 0; r < 9; r++) {
        var colValue = board[r][c];

        if (colValue < 1 || colValue > 9 || colSeen[colValue]) {
          return false;
        }

        colSeen[colValue] = true;
      }
    }

    for (var boxRow = 0; boxRow < 9; boxRow += 3) {
      for (var boxCol = 0; boxCol < 9; boxCol += 3) {
        var boxSeen = {};

        for (var r = boxRow; r < boxRow + 3; r++) {
          for (var c = boxCol; c < boxCol + 3; c++) {
            var boxValue = board[r][c];

            if (
              boxValue < 1 ||
              boxValue > 9 ||
              boxSeen[boxValue]
            ) {
              return false;
            }

            boxSeen[boxValue] = true;
          }
        }
      }
    }

    return true;
  }

  // يضمن أن الحل المرجعي حل كامل وصحيح ويطابق الأرقام الأصلية.
  function solutionMatchesPuzzle(solution, puzzle) {
    if (!isCompleteValidSolution(solution)) return false;
    if (!isValidBoardShape(puzzle)) return false;

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var given = puzzle[r][c];

        if (given !== 0 && solution[r][c] !== given) {
          return false;
        }
      }
    }

    return true;
  }

  /*
   * التلميح:
   * - الخلايا الأصلية لا تتغير.
   * - الخلايا الفارغة أو التي أدخل اللاعب فيها رقماً قابلة للتلميح.
   * - الرقم يؤخذ من الحل المرجعي الصحيح للمرحلة.
   * - تعارضات الخلايا الأخرى لا تمنع التلميح.
   * - لا تظهر أي رسائل للمستخدم.
   */
  function applyHint() {
    if (state.paused || state.won || !state.selected) return;

    var row = state.selected.row;
    var col = state.selected.col;

    if (!isValidCoordinate(row, col)) return;

    if (
      !state.playerBoard ||
      !state.puzzle ||
      !state.givenCells ||
      !state.solution
    ) {
      return;
    }

    // لا تغيّر الأرقام التي جاءت مع اللغز.
    if (state.givenCells[row][col]) return;

    // لا تعتمد على تعارضات لوحة اللاعب.
    if (!solutionMatchesPuzzle(state.solution, state.puzzle)) return;

    var answer = state.solution[row][col];

    if (!isPlainInt(answer) || answer < 1 || answer > 9) return;

    var previous = state.playerBoard[row][col];

    // إذا كانت الخانة تحتوي بالفعل على الإجابة الصحيحة، فلا حاجة للتغيير.
    if (previous === answer) return;

    // استبدال الرقم الخاطئ أو ملء الخانة الفارغة بالإجابة الصحيحة.
    state.playerBoard[row][col] = answer;

    recordHistory({
      row: row,
      col: col,
      previous: previous
    });

    state.hintedCells[row + '_' + col] = true;
    state.selected = { row: row, col: col };

    // يعيد التلوين حساب التعارضات في كامل اللوحة.
    renderBoard();
    checkWin();
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

  function restartLevel() {
    if (!state.puzzle) return;

    state.playerBoard = cloneGrid(state.puzzle);
    state.history = [];
    state.hintedCells = {};
    state.selected = null;
    state.won = false;
    state.elapsedSeconds = 0;
    state.timerRunning = false;
    state.timerStartedAt = 0;

    if (dom.winOverlay) {
      dom.winOverlay.hidden = true;
    }

    updateTimerDisplay();
    renderBoard();

    if (!state.paused) {
      startTimer();
    }

    persistProgress();
  }

  function checkWin() {
    if (state.won || !state.playerBoard) return;

    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (state.playerBoard[r][c] === 0) {
          return;
        }
      }
    }

    if (!isCompleteValidSolution(state.playerBoard)) {
      return;
    }

    state.won = true;
    stopTimer();

    var time = state.elapsedSeconds;

    state.lastCompletedLevel = state.level;

    saveBestTime(state.level, time);

    saveCompletedLevel(state.level, {
      seconds: time,
      difficulty: state.difficulty
    });

    var best = getBestTime(state.level);

    dom.winTime.textContent = formatTime(time);
    dom.winBestTime.textContent =
      best !== null ? formatTime(best) : formatTime(time);

    dom.winOverlay.hidden = false;

    updateStatusBar();
    clearProgress();
  }

  function persistProgress() {
    if (state.won || !state.puzzle || !state.playerBoard) return;

    saveProgress({
      level: state.level,
      difficulty: state.difficulty,
      seed: state.seed,
      puzzle: state.puzzle,
      playerBoard: state.playerBoard,
      elapsedSeconds: state.timerRunning
        ? state.elapsedSeconds +
          Math.floor(
            (Date.now() - state.timerStartedAt) / 1000
          )
        : state.elapsedSeconds,
      paused: state.paused
    });
  }

  function loadLevel(level) {
    var difficulty = getDifficultyForLevel(level);
    var baseSeed = 'DrDer-Sudoku-v1';

    var result = createLevel(level, difficulty, {
      baseSeed: baseSeed,
      maxAttempts: 10,
      allowMultipleSolutions: true
    });

    if (!result || result.failed || !result.puzzle) {
      return false;
    }

    var solution = null;

    if (result.solution) {
      solution = cloneGrid(result.solution);
    } else {
      var solved = solveBoard(cloneGrid(result.puzzle));

      if (solved && solved.solved && solved.board) {
        solution = cloneGrid(solved.board);
      }
    }

    if (!solution) return false;

    state.level = level;

    state.difficulty = isDifficultyName(result.actualDifficulty)
      ? result.actualDifficulty
      : (
          isDifficultyName(result.requestedDifficulty)
            ? result.requestedDifficulty
            : difficulty
        );

    state.seed = result.seed;
    state.puzzle = cloneGrid(result.puzzle);
    state.solution = solution;
    state.playerBoard = cloneGrid(result.puzzle);
    state.givenCells = buildGivenMap(result.puzzle);
    state.history = [];
    state.hintedCells = {};
    state.selected = null;
    state.elapsedSeconds = 0;
    state.timerRunning = false;
    state.timerStartedAt = 0;
    state.paused = false;
    state.won = false;

    if (result.signature) {
      savePuzzleHistory(result.signature);
    }

    return true;
  }

  function startNewLevel(level) {
    stopTimer();

    dom.pauseOverlay.hidden = true;
    dom.winOverlay.hidden = true;
    dom.pauseBtn.textContent = 'إيقاف';
    dom.pauseBtn.classList.remove('active');

    var ok = loadLevel(level);

    if (!ok) {
      dom.progressText.textContent = 'تعذر توليد المرحلة';
      return;
    }

    updateTimerDisplay();
    updateStatusBar();
    renderBoard();
    startTimer();
    persistProgress();
  }

  function resumeSavedProgress() {
    var saved = loadProgress();

    if (!saved || !saved.puzzle || !saved.playerBoard) {
      return false;
    }

    if (
      !isValidBoardShape(saved.puzzle) ||
      !isValidBoardShape(saved.playerBoard)
    ) {
      return false;
    }

    var difficulty = isDifficultyName(saved.difficulty)
      ? saved.difficulty
      : getDifficultyForLevel(saved.level);

    var levelData = createLevel(saved.level, difficulty, {
      baseSeed: 'DrDer-Sudoku-v1',
      maxAttempts: 10,
      allowMultipleSolutions: true
    });

    var solution = null;

    if (
      levelData &&
      !levelData.failed &&
      levelData.puzzle &&
      levelData.seed === saved.seed &&
      levelData.solution
    ) {
      solution = cloneGrid(levelData.solution);
    }

    if (!solution) {
      var solvedSaved = solveBoard(cloneGrid(saved.puzzle));

      if (
        solvedSaved &&
        solvedSaved.solved &&
        solvedSaved.board
      ) {
        solution = cloneGrid(solvedSaved.board);
      }
    }

    if (!solution) return false;

    state.level = saved.level;
    state.difficulty = difficulty;
    state.seed = saved.seed;
    state.puzzle = cloneGrid(saved.puzzle);
    state.solution = solution;
    state.playerBoard = cloneGrid(saved.playerBoard);
    state.givenCells = buildGivenMap(saved.puzzle);
    state.history = [];
    state.hintedCells = {};
    state.selected = null;
    state.elapsedSeconds = Math.max(
      0,
      Number(saved.elapsedSeconds) || 0
    );
    state.timerRunning = false;
    state.timerStartedAt = 0;
    state.paused = false;
    state.won = false;

    // لا نسمح للبيانات المحفوظة بتغيير الأرقام الأصلية.
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (state.givenCells[r][c]) {
          state.playerBoard[r][c] = state.puzzle[r][c];
        }
      }
    }

    updateTimerDisplay();
    updateStatusBar();
    renderBoard();
    startTimer();

    return true;
  }

  function handleBoardClick(event) {
    var target = event.target;

    if (
      !target ||
      !target.classList ||
      !target.classList.contains('cell')
    ) {
      return;
    }

    var row = Number(target.getAttribute('data-row'));
    var col = Number(target.getAttribute('data-col'));

    if (!isValidCoordinate(row, col)) return;

    selectCell(row, col);
  }

  function handleNumberPad(event) {
    var target = event.target;

    if (
      !target ||
      !target.classList ||
      !target.classList.contains('num-btn')
    ) {
      return;
    }

    var num = Number(target.getAttribute('data-num'));

    if (!isPlainInt(num)) return;

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

    if (
      key === 'Backspace' ||
      key === 'Delete' ||
      key === '0'
    ) {
      eraseCell();
      event.preventDefault();
      return;
    }

    if (!state.selected) return;

    var r = state.selected.row;
    var c = state.selected.col;

    if (key === 'ArrowUp') {
      if (r > 0) selectCell(r - 1, c);
      event.preventDefault();
    } else if (key === 'ArrowDown') {
      if (r < 8) selectCell(r + 1, c);
      event.preventDefault();
    } else if (key === 'ArrowLeft') {
      if (c > 0) selectCell(r, c - 1);
      event.preventDefault();
    } else if (key === 'ArrowRight') {
      if (c < 8) selectCell(r, c + 1);
      event.preventDefault();
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (state.timerRunning) {
        pauseTimer();
      }

      persistProgress();
    } else if (!state.paused && !state.won) {
      resumeTimer();
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

    navigator.serviceWorker
      .register('sw.js')
      .catch(function () {});
  }

  function init() {
    dom.board = $('sudokuBoard');
    dom.levelDisplay = $('levelDisplay');
    dom.difficultyDisplay = $('difficultyDisplay');
    dom.timerDisplay = $('timerDisplay');
    dom.progressText = $('progressText');
    dom.progressFill = $('progressFill');
    dom.pauseBtn = $('pauseBtn');
    dom.pauseOverlay = $('pauseOverlay');
    dom.winOverlay = $('winOverlay');
    dom.winTime = $('winTime');
    dom.winBestTime = $('winBestTime');

    if (!dom.board) return;

    createBoardElement();

    var numberPad = document.querySelector('.number-pad');

    if (numberPad) {
      numberPad.addEventListener('click', handleNumberPad);
    }

    $('eraseBtn').addEventListener('click', eraseCell);
    $('undoBtn').addEventListener('click', undoMove);
    $('hintBtn').addEventListener('click', applyHint);
    $('pauseBtn').addEventListener('click', togglePause);
    $('restartBtn').addEventListener('click', restartLevel);
    $('resumeBtn').addEventListener('click', togglePause);

    $('nextLevelBtn').addEventListener('click', function () {
      startNewLevel(getNextLevel(state.level));
    });

    document.addEventListener('keydown', handleKeyDown);

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    window.addEventListener('beforeunload', handleBeforeUnload);

    setInterval(tickTimer, 1000);

    var resumed = false;

    try {
      resumed = resumeSavedProgress();
    } catch (error) {
      resumed = false;
    }

    if (!resumed) {
      startNewLevel(1);
    }

    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
