// DrDer-Sudoku engine.js
// محرك سودوكو 9×9 مستقل عن واجهة المستخدم.
// يقبل اللغز إذا كان قابلًا للحل، دون اشتراط حل وحيد.
// لا توجد مراحل ولا تقييم صعوبة منطقي؛ الصعوبة تعني عدد الفراغات فقط.

var DIFFICULTY_TARGETS = {
  easy: { min: 30, max: 40 },
  medium: { min: 42, max: 52 },
  hard: { min: 54, max: 64 }
};

function isPlainInt(v) {
  return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
}

function isValidCellValue(value) {
  return isPlainInt(value) && value >= 0 && value <= 9;
}

function isValidCoordinate(row, col) {
  return isPlainInt(row) && isPlainInt(col) && row >= 0 && row <= 8 && col >= 0 && col <= 8;
}

function isValidBoardShape(board) {
  if (!Array.isArray(board) || board.length !== 9) return false;
  for (var r = 0; r < 9; r++) {
    if (!Array.isArray(board[r]) || board[r].length !== 9) return false;
  }
  return true;
}

function validateBoard(board) {
  if (!isValidBoardShape(board)) return false;
  var r, c, v;
  for (r = 0; r < 9; r++) {
    for (c = 0; c < 9; c++) {
      v = board[r][c];
      if (!isValidCellValue(v)) return false;
    }
  }
  for (r = 0; r < 9; r++) {
    var seenR = {};
    for (c = 0; c < 9; c++) {
      v = board[r][c];
      if (v === 0) continue;
      if (seenR[v]) return false;
      seenR[v] = true;
    }
  }
  for (c = 0; c < 9; c++) {
    var seenC = {};
    for (r = 0; r < 9; r++) {
      v = board[r][c];
      if (v === 0) continue;
      if (seenC[v]) return false;
      seenC[v] = true;
    }
  }
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      var seenB = {};
      for (r = br * 3; r < br * 3 + 3; r++) {
        for (c = bc * 3; c < bc * 3 + 3; c++) {
          v = board[r][c];
          if (v === 0) continue;
          if (seenB[v]) return false;
          seenB[v] = true;
        }
      }
    }
  }
  return true;
}

function isValidPuzzle(board) {
  return validateBoard(board);
}

function getRowCells(board, row) {
  if (!isValidBoardShape(board) || !isPlainInt(row) || row < 0 || row > 8) return [];
  var cells = [];
  for (var c = 0; c < 9; c++) {
    cells.push({ row: row, col: c, value: board[row][c] });
  }
  return cells;
}

function getColumnCells(board, col) {
  if (!isValidBoardShape(board) || !isPlainInt(col) || col < 0 || col > 8) return [];
  var cells = [];
  for (var r = 0; r < 9; r++) {
    cells.push({ row: r, col: col, value: board[r][col] });
  }
  return cells;
}

function getBoxCells(board, row, col) {
  if (!isValidBoardShape(board) || !isValidCoordinate(row, col)) return [];
  var boxRow = Math.floor(row / 3) * 3;
  var boxCol = Math.floor(col / 3) * 3;
  var cells = [];
  for (var r = boxRow; r < boxRow + 3; r++) {
    for (var c = boxCol; c < boxCol + 3; c++) {
      cells.push({ row: r, col: c, value: board[r][c] });
    }
  }
  return cells;
}

function getMissingNumbers(board, cells) {
  var present = {};
  var i;
  for (i = 0; i < cells.length; i++) {
    var v = cells[i].value;
    if (v >= 1 && v <= 9) present[v] = true;
  }
  var missing = [];
  for (var n = 1; n <= 9; n++) {
    if (!present[n]) missing.push(n);
  }
  return missing;
}

function createEmptyBoard() {
  var board = [];
  for (var r = 0; r < 9; r++) {
    var row = [];
    for (var c = 0; c < 9; c++) row.push(0);
    board.push(row);
  }
  return board;
}

function cloneBoard(board) {
  if (!isValidBoardShape(board)) return null;
  var copy = [];
  for (var r = 0; r < 9; r++) {
    var newRow = [];
    for (var c = 0; c < 9; c++) newRow.push(board[r][c]);
    copy.push(newRow);
  }
  return copy;
}

function cloneCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length !== 9) return null;
  var copy = [];
  for (var r = 0; r < 9; r++) {
    if (!Array.isArray(candidates[r]) || candidates[r].length !== 9) return null;
    var newRow = [];
    for (var c = 0; c < 9; c++) {
      var cell = candidates[r][c];
      newRow.push(cell === null ? null : cell.slice());
    }
    copy.push(newRow);
  }
  return copy;
}

function isValidMove(board, row, col, num) {
  if (!isValidBoardShape(board)) return false;
  if (!isValidCoordinate(row, col)) return false;
  if (!isPlainInt(num) || num < 1 || num > 9) return false;
  if (board[row][col] !== 0) return false;
  var r, c;
  for (c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  for (r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  var boxRow = Math.floor(row / 3) * 3;
  var boxCol = Math.floor(col / 3) * 3;
  for (r = boxRow; r < boxRow + 3; r++) {
    for (c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function getCandidates(board, row, col) {
  if (!isValidBoardShape(board)) return [];
  if (!isValidCoordinate(row, col)) return [];
  if (board[row][col] !== 0) return [];
  var list = [];
  for (var num = 1; num <= 9; num++) {
    if (isValidMove(board, row, col, num)) list.push(num);
  }
  return list;
}

function buildCandidates(board) {
  var result = [];
  for (var r = 0; r < 9; r++) {
    var row = [];
    for (var c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        var list = [];
        for (var num = 1; num <= 9; num++) {
          if (isValidMove(board, r, c, num)) list.push(num);
        }
        row.push(list);
      } else {
        row.push(null);
      }
    }
    result.push(row);
  }
  return result;
}

function findEmptyCell(board) {
  if (!isValidBoardShape(board)) return null;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] === 0) return { row: r, col: c };
    }
  }
  return null;
}

function findBestEmptyCell(board) {
  var best = null;
  var bestCount = 10;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      var list = getCandidates(board, r, c);
      if (list.length < bestCount) {
        bestCount = list.length;
        best = { row: r, col: c, candidates: list };
        if (bestCount === 0 || bestCount === 1) return best;
      }
    }
  }
  return best;
}

function isBoardComplete(board) {
  if (!isValidBoardShape(board)) return false;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

function validateSolvedBoard(board) {
  if (!isBoardComplete(board)) return false;
  return validateBoard(board);
}

function solveBoard(board) {
  if (!validateBoard(board)) return { solved: false, board: null };
  var work = cloneBoard(board);
  if (work === null) return { solved: false, board: null };

  function backtrack() {
    var best = findBestEmptyCell(work);
    if (best === null) return isBoardComplete(work);
    if (best.candidates.length === 0) return false;
    var row = best.row, col = best.col, list = best.candidates;
    for (var i = 0; i < list.length; i++) {
      work[row][col] = list[i];
      if (backtrack()) return true;
      work[row][col] = 0;
    }
    return false;
  }

  if (backtrack() && validateSolvedBoard(work)) {
    return { solved: true, board: work };
  }
  return { solved: false, board: null };
}

function countSolutions(board, limit) {
  var max;
  if (isPlainInt(limit) && limit > 0) max = limit;
  else max = 2;
  if (!validateBoard(board)) return 0;
  var work = cloneBoard(board);
  if (work === null) return 0;
  var count = 0;

  function backtrack() {
    if (count >= max) return;
    var best = findBestEmptyCell(work);
    if (best === null) {
      if (validateSolvedBoard(work)) count++;
      return;
    }
    if (best.candidates.length === 0) return;
    var row = best.row, col = best.col, list = best.candidates;
    for (var i = 0; i < list.length; i++) {
      work[row][col] = list[i];
      backtrack();
      work[row][col] = 0;
      if (count >= max) return;
    }
  }

  backtrack();
  return count;
}

function createRng(seed) {
  var h = 2166136261 >>> 0;
  var str = String(seed === undefined ? 'DrDer' : seed);
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  if (h === 0) h = 0x9e3779b9;
  var state = h >>> 0;
  return function rng() {
    state = (state + 0x6D2B79F5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray(array, rng) {
  if (!Array.isArray(array)) return [];
  var fn = typeof rng === 'function' ? rng : Math.random;
  var arr = array.slice();
  for (var i = arr.length - 1; i > 0; i--) {
    var raw = fn();
    var value = (typeof raw === 'number' && isFinite(raw)) ? raw : 0;
    if (value < 0) value = 0;
    if (value >= 1) value = 0.999999999;
    var j = Math.floor(value * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function generateSolvedBoard(rng) {
  var fn = typeof rng === 'function' ? rng : createRng('DrDer-default');
  var board = createEmptyBoard();

  function fill() {
    var best = findBestEmptyCell(board);
    if (best === null) return true;
    if (best.candidates.length === 0) return false;
    var shuffled = shuffleArray(best.candidates, fn);
    var row = best.row, col = best.col;
    for (var i = 0; i < shuffled.length; i++) {
      board[row][col] = shuffled[i];
      if (fill()) return true;
      board[row][col] = 0;
    }
    return false;
  }

  if (!fill()) return null;
  if (!validateSolvedBoard(board)) return null;
  return board;
}

function isDifficultyName(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(DIFFICULTY_TARGETS, name);
}

function countEmptyCells(board) {
  if (!isValidBoardShape(board)) return 0;
  var n = 0;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] === 0) n++;
    }
  }
  return n;
}

function removeCells(solution, difficulty, rng, options) {
  var opts = options || {};
  var target = isDifficultyName(difficulty) ? DIFFICULTY_TARGETS[difficulty] : DIFFICULTY_TARGETS.medium;
  var fail = {
    puzzle: null,
    emptyCells: 0,
    unique: false,
    solvable: false,
    targetReached: false,
    targetMin: target.min,
    targetMax: target.max
  };
  if (!validateBoard(solution) || !isBoardComplete(solution)) return fail;
  var fn = typeof rng === 'function' ? rng : createRng('remove-default');
  var puzzle = cloneBoard(solution);
  if (puzzle === null) return fail;

  var positions = [];
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) positions.push({ row: r, col: c });
  }
  var shuffled = shuffleArray(positions, fn);

  var currentEmpty = 0;
  var allowUnsolved = opts.allowUnsolved === true;

  for (var i = 0; i < shuffled.length; i++) {
    if (currentEmpty >= target.max) break;
    var row = shuffled[i].row;
    var col = shuffled[i].col;
    if (puzzle[row][col] === 0) continue;
    var backup = puzzle[row][col];
    puzzle[row][col] = 0;

    var solvable = allowUnsolved ? true : (countSolutions(puzzle, 1) >= 1);
    if (!solvable) {
      puzzle[row][col] = backup;
    } else {
      currentEmpty++;
    }
  }

  var emptyCells = countEmptyCells(puzzle);
  var solvableFinal = countSolutions(puzzle, 1) >= 1;
  var unique = countSolutions(puzzle, 2) === 1;
  var targetReached = solvableFinal && emptyCells >= target.min && emptyCells <= target.max;

  return {
    puzzle: puzzle,
    emptyCells: emptyCells,
    unique: unique,
    solvable: solvableFinal,
    targetReached: targetReached,
    targetMin: target.min,
    targetMax: target.max
  };
}

function generatePuzzle(options) {
  var opts = options || {};
  var requested = isDifficultyName(opts.difficulty) ? opts.difficulty : 'medium';
  var maxAttempts = (isPlainInt(opts.maxAttempts) && opts.maxAttempts > 0) ? opts.maxAttempts : 5;
  var baseSeed = opts.seed !== undefined ? String(opts.seed) : ('auto-' + Date.now());

  var best = null;
  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var attemptSeed = baseSeed + '_' + attempt;
    var rng = createRng(attemptSeed);
    var solution = generateSolvedBoard(rng);
    if (!solution) continue;
    var removal = removeCells(solution, requested, rng, {});
    if (!removal.puzzle) continue;
    if (removal.solvable !== true) continue;

    var result = {
      puzzle: removal.puzzle,
      solution: solution,
      difficulty: requested,
      requestedDifficulty: requested,
      seed: attemptSeed,
      emptyCells: removal.emptyCells,
      unique: removal.unique === true,
      solvable: true,
      targetReached: removal.targetReached,
      targetMin: removal.targetMin,
      targetMax: removal.targetMax,
      fallback: !removal.targetReached,
      failed: false
    };
    if (removal.targetReached) return result;
    if (best === null) best = result;
  }

  if (best !== null) return best;

  return {
    puzzle: null,
    solution: null,
    difficulty: requested,
    requestedDifficulty: requested,
    seed: baseSeed,
    emptyCells: 0,
    unique: false,
    solvable: false,
    targetReached: false,
    targetMin: DIFFICULTY_TARGETS[requested].min,
    targetMax: DIFFICULTY_TARGETS[requested].max,
    fallback: false,
    failed: true,
    reason: 'generation-failed'
  };
}

function createLevelSignature(puzzle) {
  if (!validateBoard(puzzle)) return null;
  var sig = '';
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      sig += String(puzzle[r][c]);
    }
  }
  return sig;
}

function isRepeatedPuzzle(signature, history) {
  if (typeof signature !== 'string' || signature.length === 0) return false;
  if (!Array.isArray(history)) return false;
  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (typeof entry === 'string') {
      if (entry === signature) return true;
    } else if (entry && typeof entry === 'object') {
      if (typeof entry.signature === 'string' && entry.signature === signature) return true;
    }
  }
  return false;
}
