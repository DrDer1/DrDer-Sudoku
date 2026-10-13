// DrDer-Sudoku engine.js
// محرك سودوكو مستقل عن واجهة المستخدم.
// التقييم الداخلي للصعوبة تقريبي بحسب التقنيات المدعومة فقط.

var DIFFICULTY_TARGETS = {
  easy: { min: 36, max: 45 },
  medium: { min: 46, max: 51 },
  hard: { min: 52, max: 56 },
  expert: { min: 57, max: 64 }
};

// ---------- التحقق من البنية والقيم ----------

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

// ---------- الوصول إلى الوحدات ----------

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

// ---------- اللوحة الفارغة والنسخ ----------

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

// ---------- صلاحية الحركة والمرشحون ----------

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

// ---------- الخلايا الفارغة والاختيار ----------

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

// ---------- اكتمال اللوحة والتحقق من صحة الحل ----------

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

// ---------- الحل وعد الحلول ----------

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

// ---------- العشوائية ----------

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

// ---------- الصعوبة وحذف الخلايا ----------

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

function removeCells(solution, difficulty, rng) {
  var target = isDifficultyName(difficulty) ? DIFFICULTY_TARGETS[difficulty] : DIFFICULTY_TARGETS.medium;
  var fail = {
    puzzle: null,
    emptyCells: 0,
    unique: false,
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
  for (var i = 0; i < shuffled.length; i++) {
    if (currentEmpty >= target.max) break;
    var row = shuffled[i].row;
    var col = shuffled[i].col;
    if (puzzle[row][col] === 0) continue;
    var backup = puzzle[row][col];
    puzzle[row][col] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[row][col] = backup;
    } else {
      currentEmpty++;
    }
  }

  var emptyCells = countEmptyCells(puzzle);
  var unique = countSolutions(puzzle, 2) === 1;
  var targetReached = unique && emptyCells >= target.min && emptyCells <= target.max;

  return {
    puzzle: puzzle,
    emptyCells: emptyCells,
    unique: unique,
    targetReached: targetReached,
    targetMin: target.min,
    targetMax: target.max
  };
}

// ---------- توليد اللغز ----------

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
    var removal = removeCells(solution, requested, rng);
    if (!removal.puzzle || !removal.unique) continue;

    var result = {
      puzzle: removal.puzzle,
      solution: solution,
      difficulty: requested,
      requestedDifficulty: requested,
      actualDifficulty: null,
      seed: attemptSeed,
      emptyCells: removal.emptyCells,
      unique: true,
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
    actualDifficulty: null,
    seed: baseSeed,
    emptyCells: 0,
    unique: false,
    targetReached: false,
    targetMin: DIFFICULTY_TARGETS[requested].min,
    targetMax: DIFFICULTY_TARGETS[requested].max,
    fallback: false,
    failed: true,
    reason: 'generation-failed'
  };
}

// ---------- دوال الكشف عن الأنماط ----------

function findNakedSingles(board) {
  var result = [];
  if (!isValidBoardShape(board)) return result;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      var list = getCandidates(board, r, c);
      if (list.length === 1) result.push({ row: r, col: c, num: list[0] });
    }
  }
  return result;
}

function findHiddenSingles(board) {
  var result = [];
  if (!isValidBoardShape(board)) return result;
  var r, c, num;
  for (r = 0; r < 9; r++) {
    for (num = 1; num <= 9; num++) {
      var countR = 0, posR = null, hasR = false;
      for (c = 0; c < 9; c++) {
        if (board[r][c] === num) { hasR = true; break; }
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
          countR++; posR = { row: r, col: c };
        }
      }
      if (!hasR && countR === 1) result.push({ row: posR.row, col: posR.col, num: num });
    }
  }
  for (c = 0; c < 9; c++) {
    for (num = 1; num <= 9; num++) {
      var countC = 0, posC = null, hasC = false;
      for (r = 0; r < 9; r++) {
        if (board[r][c] === num) { hasC = true; break; }
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
          countC++; posC = { row: r, col: c };
        }
      }
      if (!hasC && countC === 1) result.push({ row: posC.row, col: posC.col, num: num });
    }
  }
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      for (num = 1; num <= 9; num++) {
        var countB = 0, posB = null, hasB = false;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === num) hasB = true;
            if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
              countB++; posB = { row: r, col: c };
            }
          }
        }
        if (!hasB && countB === 1) result.push({ row: posB.row, col: posB.col, num: num });
      }
    }
  }
  return result;
}

function findNakedPairs(board) {
  var result = [];
  if (!isValidBoardShape(board)) return result;
  var candidates = buildCandidates(board);

  function scanUnit(cells) {
    var map = {};
    for (var i = 0; i < cells.length; i++) {
      var row = cells[i].row, col = cells[i].col;
      var list = candidates[row][col];
      if (!list || list.length !== 2) continue;
      var key = list.slice().sort(function (a, b) { return a - b; }).join(',');
      if (!map[key]) map[key] = [];
      map[key].push({ row: row, col: col });
    }
    for (var k in map) {
      if (map[k].length === 2) {
        result.push({
          type: 'nakedPair',
          cells: map[k].slice(),
          nums: k.split(',').map(Number),
          unit: cells.slice()
        });
      }
    }
  }

  var r, c;
  for (r = 0; r < 9; r++) {
    var rowCells = [];
    for (c = 0; c < 9; c++) rowCells.push({ row: r, col: c });
    scanUnit(rowCells);
  }
  for (c = 0; c < 9; c++) {
    var colCells = [];
    for (r = 0; r < 9; r++) colCells.push({ row: r, col: c });
    scanUnit(colCells);
  }
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      var boxCells = [];
      for (r = br * 3; r < br * 3 + 3; r++) {
        for (c = bc * 3; c < bc * 3 + 3; c++) boxCells.push({ row: r, col: c });
      }
      scanUnit(boxCells);
    }
  }
  return result;
}

function findPointingPairs(board) {
  var result = [];
  if (!isValidBoardShape(board)) return result;
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      for (var num = 1; num <= 9; num++) {
        var already = false;
        var r, c;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === num) already = true;
          }
        }
        if (already) continue;
        var rows = {}, cols = {}, count = 0, rowCount = 0, colCount = 0, onlyRow = -1, onlyCol = -1;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
              count++;
              if (!rows[r]) { rows[r] = true; rowCount++; onlyRow = r; }
              if (!cols[c]) { cols[c] = true; colCount++; onlyCol = c; }
            }
          }
        }
        if (count < 2) continue;
        if (rowCount === 1) result.push({ type: 'pointingRow', num: num, row: onlyRow, boxRow: br, boxCol: bc });
        if (colCount === 1) result.push({ type: 'pointingCol', num: num, col: onlyCol, boxRow: br, boxCol: bc });
      }
    }
  }
  return result;
}

function findXWing(board) {
  var result = [];
  if (!isValidBoardShape(board)) return result;
  var num, r, c;
  for (num = 1; num <= 9; num++) {
    var rowPositions = [];
    for (r = 0; r < 9; r++) {
      var cols = [], hasRow = false;
      for (c = 0; c < 9; c++) {
        if (board[r][c] === num) { hasRow = true; break; }
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) cols.push(c);
      }
      if (!hasRow && cols.length === 2) rowPositions.push({ row: r, cols: cols });
    }
    for (var i = 0; i < rowPositions.length; i++) {
      for (var j = i + 1; j < rowPositions.length; j++) {
        var a = rowPositions[i], b = rowPositions[j];
        if (a.cols[0] === b.cols[0] && a.cols[1] === b.cols[1]) {
          result.push({ type: 'xwingRows', num: num, rows: [a.row, b.row], cols: [a.cols[0], a.cols[1]] });
        }
      }
    }
  }
  for (num = 1; num <= 9; num++) {
    var colPositions = [];
    for (c = 0; c < 9; c++) {
      var rws = [], hasCol = false;
      for (r = 0; r < 9; r++) {
        if (board[r][c] === num) { hasCol = true; break; }
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) rws.push(r);
      }
      if (!hasCol && rws.length === 2) colPositions.push({ col: c, rows: rws });
    }
    for (var i2 = 0; i2 < colPositions.length; i2++) {
      for (var j2 = i2 + 1; j2 < colPositions.length; j2++) {
        var a2 = colPositions[i2], b2 = colPositions[j2];
        if (a2.rows[0] === b2.rows[0] && a2.rows[1] === b2.rows[1]) {
          result.push({ type: 'xwingCols', num: num, cols: [a2.col, b2.col], rows: [a2.rows[0], a2.rows[1]] });
        }
      }
    }
  }
  return result;
}

// ---------- إدارة المرشحين ----------

function propagatePlacedNumber(candidates, row, col, num) {
  var i;
  for (i = 0; i < 9; i++) {
    if (i !== col) {
      var lr = candidates[row][i];
      if (lr) {
        var ir = lr.indexOf(num);
        if (ir !== -1) lr.splice(ir, 1);
      }
    }
  }
  for (i = 0; i < 9; i++) {
    if (i !== row) {
      var lc = candidates[i][col];
      if (lc) {
        var ic = lc.indexOf(num);
        if (ic !== -1) lc.splice(ic, 1);
      }
    }
  }
  var boxRow = Math.floor(row / 3) * 3;
  var boxCol = Math.floor(col / 3) * 3;
  for (var r = boxRow; r < boxRow + 3; r++) {
    for (var c = boxCol; c < boxCol + 3; c++) {
      if (r === row && c === col) continue;
      var lb = candidates[r][c];
      if (lb) {
        var ib = lb.indexOf(num);
        if (ib !== -1) lb.splice(ib, 1);
      }
    }
  }
}

function refreshCandidates(board, candidates) {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] !== 0) {
        candidates[r][c] = null;
        continue;
      }
      var current = candidates[r][c];
      if (!current) {
        var list = [];
        for (var num = 1; num <= 9; num++) {
          if (isValidMove(board, r, c, num)) list.push(num);
        }
        candidates[r][c] = list;
      } else {
        var filtered = [];
        for (var i = 0; i < current.length; i++) {
          var n = current[i];
          if (isValidMove(board, r, c, n)) filtered.push(n);
        }
        candidates[r][c] = filtered;
      }
    }
  }
}

function candidatesConsistent(board, candidates) {
  if (!validateBoard(board)) return false;
  if (!Array.isArray(candidates) || candidates.length !== 9) return false;
  var r, c, i, n, k;
  for (r = 0; r < 9; r++) {
    if (!Array.isArray(candidates[r]) || candidates[r].length !== 9) return false;
    for (c = 0; c < 9; c++) {
      var cell = candidates[r][c];
      if (board[r][c] !== 0) {
        if (cell !== null) return false;
        continue;
      }
      if (!Array.isArray(cell)) return false;
      if (cell.length === 0) return false;
      for (i = 0; i < cell.length; i++) {
        n = cell[i];
        if (!isPlainInt(n) || n < 1 || n > 9) return false;
        if (!isValidMove(board, r, c, n)) return false;
        for (k = i + 1; k < cell.length; k++) {
          if (cell[k] === n) return false;
        }
      }
    }
  }
  for (r = 0; r < 9; r++) {
    for (var num = 1; num <= 9; num++) {
      var present = false, hasPlace = false;
      for (c = 0; c < 9; c++) {
        if (board[r][c] === num) { present = true; break; }
      }
      if (present) continue;
      for (c = 0; c < 9; c++) {
        var listR = candidates[r][c];
        if (listR && listR.indexOf(num) !== -1) { hasPlace = true; break; }
      }
      if (!hasPlace) return false;
    }
  }
  for (c = 0; c < 9; c++) {
    for (var num2 = 1; num2 <= 9; num2++) {
      var present2 = false, hasPlace2 = false;
      for (r = 0; r < 9; r++) {
        if (board[r][c] === num2) { present2 = true; break; }
      }
      if (present2) continue;
      for (r = 0; r < 9; r++) {
        var listC = candidates[r][c];
        if (listC && listC.indexOf(num2) !== -1) { hasPlace2 = true; break; }
      }
      if (!hasPlace2) return false;
    }
  }
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      for (var num3 = 1; num3 <= 9; num3++) {
        var present3 = false, hasPlace3 = false;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === num3) present3 = true;
          }
        }
        if (present3) continue;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            var listB = candidates[r][c];
            if (listB && listB.indexOf(num3) !== -1) hasPlace3 = true;
          }
        }
        if (!hasPlace3) return false;
      }
    }
  }
  return true;
}

function tryPlace(board, candidates, row, col, num) {
  if (board[row][col] !== 0) return false;
  if (!isPlainInt(num) || num < 1 || num > 9) return false;
  var list = candidates[row][col];
  if (!list || list.indexOf(num) === -1) return false;
  if (!isValidMove(board, row, col, num)) return false;
  board[row][col] = num;
  candidates[row][col] = null;
  propagatePlacedNumber(candidates, row, col, num);
  return true;
}

// ---------- تطبيق التقنيات ----------

function applyNakedSingles(board, candidates) {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      var list = candidates[r][c];
      if (!list || list.length !== 1) continue;
      if (tryPlace(board, candidates, r, c, list[0])) return true;
    }
  }
  return false;
}

function applyHiddenSingles(board, candidates) {
  var r, c, num;
  for (r = 0; r < 9; r++) {
    for (num = 1; num <= 9; num++) {
      var hasR = false;
      for (c = 0; c < 9; c++) { if (board[r][c] === num) { hasR = true; break; } }
      if (hasR) continue;
      var cntR = 0, posR = null;
      for (c = 0; c < 9; c++) {
        var listR = candidates[r][c];
        if (listR && listR.indexOf(num) !== -1) { cntR++; posR = { row: r, col: c }; }
      }
      if (cntR === 1 && posR) {
        if (tryPlace(board, candidates, posR.row, posR.col, num)) return true;
      }
    }
  }
  for (c = 0; c < 9; c++) {
    for (num = 1; num <= 9; num++) {
      var hasC = false;
      for (r = 0; r < 9; r++) { if (board[r][c] === num) { hasC = true; break; } }
      if (hasC) continue;
      var cntC = 0, posC = null;
      for (r = 0; r < 9; r++) {
        var listC = candidates[r][c];
        if (listC && listC.indexOf(num) !== -1) { cntC++; posC = { row: r, col: c }; }
      }
      if (cntC === 1 && posC) {
        if (tryPlace(board, candidates, posC.row, posC.col, num)) return true;
      }
    }
  }
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      for (num = 1; num <= 9; num++) {
        var hasB = false;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === num) hasB = true;
          }
        }
        if (hasB) continue;
        var cntB = 0, posB = null;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            var listB = candidates[r][c];
            if (listB && listB.indexOf(num) !== -1) { cntB++; posB = { row: r, col: c }; }
          }
        }
        if (cntB === 1 && posB) {
          if (tryPlace(board, candidates, posB.row, posB.col, num)) return true;
        }
      }
    }
  }
  return false;
}

function applyNakedPairs(board, candidates) {
  var changed = false;
  var eliminations = [];

  function collectUnit(cells) {
    var map = {};
    var i, row, col, list, k;
    for (i = 0; i < cells.length; i++) {
      row = cells[i].row; col = cells[i].col;
      list = candidates[row][col];
      if (!list || list.length !== 2) continue;
      k = list.slice().sort(function (a, b) { return a - b; }).join(',');
      if (!map[k]) map[k] = [];
      map[k].push({ row: row, col: col });
    }
    for (var key in map) {
      var group = map[key];
      if (group.length !== 2) continue;
      var pairNums = key.split(',').map(Number);
      var a = group[0], b = group[1];
      for (i = 0; i < cells.length; i++) {
        row = cells[i].row; col = cells[i].col;
        if ((row === a.row && col === a.col) || (row === b.row && col === b.col)) continue;
        list = candidates[row][col];
        if (!list) continue;
        for (var n = 0; n < pairNums.length; n++) {
          if (list.indexOf(pairNums[n]) !== -1) {
            eliminations.push({ row: row, col: col, num: pairNums[n] });
          }
        }
      }
    }
  }

  var r, c;
  for (r = 0; r < 9; r++) {
    var rowCells = [];
    for (c = 0; c < 9; c++) rowCells.push({ row: r, col: c });
    collectUnit(rowCells);
  }
  for (c = 0; c < 9; c++) {
    var colCells = [];
    for (r = 0; r < 9; r++) colCells.push({ row: r, col: c });
    collectUnit(colCells);
  }
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      var boxCells = [];
      for (r = br * 3; r < br * 3 + 3; r++) {
        for (c = bc * 3; c < bc * 3 + 3; c++) boxCells.push({ row: r, col: c });
      }
      collectUnit(boxCells);
    }
  }

  for (var e = 0; e < eliminations.length; e++) {
    var row2 = eliminations[e].row;
    var col2 = eliminations[e].col;
    var num2 = eliminations[e].num;
    var list2 = candidates[row2][col2];
    if (!list2) continue;
    var idx = list2.indexOf(num2);
    if (idx !== -1) { list2.splice(idx, 1); changed = true; }
  }

  return changed;
}

function applyPointingPairs(board, candidates) {
  var changed = false;
  var eliminations = [];

  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      for (var num = 1; num <= 9; num++) {
        var already = false, r, c;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === num) already = true;
          }
        }
        if (already) continue;
        var rows = {}, cols = {}, count = 0, rowCount = 0, colCount = 0, onlyRow = -1, onlyCol = -1;
        for (r = br * 3; r < br * 3 + 3; r++) {
          for (c = bc * 3; c < bc * 3 + 3; c++) {
            var list = candidates[r][c];
            if (list && list.indexOf(num) !== -1) {
              count++;
              if (!rows[r]) { rows[r] = true; rowCount++; onlyRow = r; }
              if (!cols[c]) { cols[c] = true; colCount++; onlyCol = c; }
            }
          }
        }
        if (count < 2) continue;
        if (rowCount === 1) {
          for (c = 0; c < 9; c++) {
            if (c >= bc * 3 && c < bc * 3 + 3) continue;
            var l1 = candidates[onlyRow][c];
            if (l1 && l1.indexOf(num) !== -1) {
              eliminations.push({ row: onlyRow, col: c, num: num });
            }
          }
        }
        if (colCount === 1) {
          for (r = 0; r < 9; r++) {
            if (r >= br * 3 && r < br * 3 + 3) continue;
            var l2 = candidates[r][onlyCol];
            if (l2 && l2.indexOf(num) !== -1) {
              eliminations.push({ row: r, col: onlyCol, num: num });
            }
          }
        }
      }
    }
  }

  for (var e = 0; e < eliminations.length; e++) {
    var row2 = eliminations[e].row;
    var col2 = eliminations[e].col;
    var num2 = eliminations[e].num;
    var list2 = candidates[row2][col2];
    if (!list2) continue;
    var idx = list2.indexOf(num2);
    if (idx !== -1) { list2.splice(idx, 1); changed = true; }
  }

  return changed;
}

function applyXWing(board, candidates) {
  var changed = false;
  var eliminations = [];
  var num, r, c;

  for (num = 1; num <= 9; num++) {
    var rowPositions = [];
    for (r = 0; r < 9; r++) {
      var cols = [], hasRow = false;
      for (c = 0; c < 9; c++) {
        if (board[r][c] === num) { hasRow = true; break; }
        var list = candidates[r][c];
        if (list && list.indexOf(num) !== -1) cols.push(c);
      }
      if (!hasRow && cols.length === 2) rowPositions.push({ row: r, cols: cols });
    }
    for (var i = 0; i < rowPositions.length; i++) {
      for (var j = i + 1; j < rowPositions.length; j++) {
        var a = rowPositions[i], b = rowPositions[j];
        if (a.cols[0] !== b.cols[0] || a.cols[1] !== b.cols[1]) continue;
        var col1 = a.cols[0], col2 = a.cols[1];
        for (r = 0; r < 9; r++) {
          if (r === a.row || r === b.row) continue;
          var l1 = candidates[r][col1];
          if (l1 && l1.indexOf(num) !== -1) eliminations.push({ row: r, col: col1, num: num });
          var l2 = candidates[r][col2];
          if (l2 && l2.indexOf(num) !== -1) eliminations.push({ row: r, col: col2, num: num });
        }
      }
    }
  }

  for (num = 1; num <= 9; num++) {
    var colPositions = [];
    for (c = 0; c < 9; c++) {
      var rws = [], hasCol = false;
      for (r = 0; r < 9; r++) {
        if (board[r][c] === num) { hasCol = true; break; }
        var list2 = candidates[r][c];
        if (list2 && list2.indexOf(num) !== -1) rws.push(r);
      }
      if (!hasCol && rws.length === 2) colPositions.push({ col: c, rows: rws });
    }
    for (var i3 = 0; i3 < colPositions.length; i3++) {
      for (var j3 = i3 + 1; j3 < colPositions.length; j3++) {
        var a3 = colPositions[i3], b3 = colPositions[j3];
        if (a3.rows[0] !== b3.rows[0] || a3.rows[1] !== b3.rows[1]) continue;
        var row1 = a3.rows[0], row2 = a3.rows[1];
        for (c = 0; c < 9; c++) {
          if (c === a3.col || c === b3.col) continue;
          var m1 = candidates[row1][c];
          if (m1 && m1.indexOf(num) !== -1) eliminations.push({ row: row1, col: c, num: num });
          var m2 = candidates[row2][c];
          if (m2 && m2.indexOf(num) !== -1) eliminations.push({ row: row2, col: c, num: num });
        }
      }
    }
  }

  for (var e = 0; e < eliminations.length; e++) {
    var row3 = eliminations[e].row;
    var col3 = eliminations[e].col;
    var num3 = eliminations[e].num;
    var list3 = candidates[row3][col3];
    if (!list3) continue;
    var idx = list3.indexOf(num3);
    if (idx !== -1) { list3.splice(idx, 1); changed = true; }
  }

  return changed;
}

function countCandidateTotal(candidates) {
  var total = 0;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var list = candidates[r][c];
      if (list) total += list.length;
    }
  }
  return total;
}

// ---------- تقييم الصعوبة ----------

// تقييم داخلي تقريبي بحسب التقنيات المدعومة فقط.
// لا يُستخدم Backtracking للحل، بل فقط للتحقق من التفرد.
function rateDifficulty(puzzle) {
  if (!validateBoard(puzzle)) {
    return {
      status: 'invalid',
      difficulty: 'unknown',
      score: 0,
      techniques: {},
      solved: false,
      ratingComplete: false,
      reason: 'invalid-board'
    };
  }

  var solCount = countSolutions(puzzle, 2);
  if (solCount === 0) {
    return {
      status: 'invalid',
      difficulty: 'unknown',
      score: 0,
      techniques: {},
      solved: false,
      ratingComplete: false,
      reason: 'no-solution'
    };
  }
  if (solCount > 1) {
    return {
      status: 'invalid',
      difficulty: 'unknown',
      score: 0,
      techniques: {},
      solved: false,
      ratingComplete: false,
      reason: 'multiple-solutions'
    };
  }

  var board = cloneBoard(puzzle);
  if (board === null) {
    return {
      status: 'invalid',
      difficulty: 'unknown',
      score: 0,
      techniques: {},
      solved: false,
      ratingComplete: false,
      reason: 'clone-failed'
    };
  }

  var candidates = buildCandidates(board);
  var techniques = {
    nakedSingles: 0,
    hiddenSingles: 0,
    nakedPairs: 0,
    pointingPairs: 0,
    xwing: 0,
    placements: 0,
    eliminations: 0
  };

  var WEIGHTS = {
    nakedSingles: 1,
    hiddenSingles: 2,
    nakedPairs: 4,
    pointingPairs: 5,
    xwing: 8
  };

  var GUARD_MAX = 2000;
  var guard = 0;
  var guardHit = false;

  while (true) {
    if (guard >= GUARD_MAX) { guardHit = true; break; }
    guard++;

    if (!candidatesConsistent(board, candidates)) {
      return {
        status: 'invalid',
        difficulty: 'invalid',
        score: 0,
        techniques: techniques,
        solved: false,
        ratingComplete: false,
        reason: 'inconsistent-candidates'
      };
    }

    if (isBoardComplete(board)) break;

    var before, after;

    before = countEmptyCells(board);
    if (applyNakedSingles(board, candidates)) {
      after = countEmptyCells(board);
      if (after < before) {
        techniques.nakedSingles++;
        techniques.placements += (before - after);
        continue;
      }
    }

    before = countEmptyCells(board);
    if (applyHiddenSingles(board, candidates)) {
      after = countEmptyCells(board);
      if (after < before) {
        techniques.hiddenSingles++;
        techniques.placements += (before - after);
        continue;
      }
    }

    before = countCandidateTotal(candidates);
    if (applyNakedPairs(board, candidates)) {
      after = countCandidateTotal(candidates);
      if (after < before) {
        techniques.nakedPairs++;
        techniques.eliminations += (before - after);
        if (!candidatesConsistent(board, candidates)) {
          return {
            status: 'invalid',
            difficulty: 'invalid',
            score: 0,
            techniques: techniques,
            solved: false,
            ratingComplete: false,
            reason: 'inconsistent-after-naked-pairs'
          };
        }
        continue;
      }
    }

    before = countCandidateTotal(candidates);
    if (applyPointingPairs(board, candidates)) {
      after = countCandidateTotal(candidates);
      if (after < before) {
        techniques.pointingPairs++;
        techniques.eliminations += (before - after);
        if (!candidatesConsistent(board, candidates)) {
          return {
            status: 'invalid',
            difficulty: 'invalid',
            score: 0,
            techniques: techniques,
            solved: false,
            ratingComplete: false,
            reason: 'inconsistent-after-pointing'
          };
        }
        continue;
      }
    }

    before = countCandidateTotal(candidates);
    if (applyXWing(board, candidates)) {
      after = countCandidateTotal(candidates);
      if (after < before) {
        techniques.xwing++;
        techniques.eliminations += (before - after);
        if (!candidatesConsistent(board, candidates)) {
          return {
            status: 'invalid',
            difficulty: 'invalid',
            score: 0,
            techniques: techniques,
            solved: false,
            ratingComplete: false,
            reason: 'inconsistent-after-xwing'
          };
        }
        continue;
      }
    }

    break;
  }

  if (guardHit) {
    return {
      status: 'unresolved',
      difficulty: 'unresolved',
      score: 0,
      techniques: techniques,
      solved: false,
      ratingComplete: false,
      reason: 'guard-exceeded'
    };
  }

  var solved = isBoardComplete(board) && validateBoard(board);

  var score =
    techniques.nakedSingles * WEIGHTS.nakedSingles +
    techniques.hiddenSingles * WEIGHTS.hiddenSingles +
    techniques.nakedPairs * WEIGHTS.nakedPairs +
    techniques.pointingPairs * WEIGHTS.pointingPairs +
    techniques.xwing * WEIGHTS.xwing;

  if (!solved) {
    return {
      status: 'unresolved',
      difficulty: 'unresolved',
      score: score,
      techniques: techniques,
      solved: false,
      ratingComplete: false,
      reason: 'techniques-exhausted'
    };
  }

  var difficulty;
  if (score <= 40) difficulty = 'easy';
  else if (score <= 90) difficulty = 'medium';
  else if (score <= 160) difficulty = 'hard';
  else difficulty = 'expert';

  return {
    status: 'solved',
    difficulty: difficulty,
    score: score,
    techniques: techniques,
    solved: true,
    ratingComplete: true,
    reason: 'logical-complete'
  };
}

// ---------- التوليد حسب الصعوبة ----------

function difficultyRank(name) {
  switch (name) {
    case 'easy': return 0;
    case 'medium': return 1;
    case 'hard': return 2;
    case 'expert': return 3;
    default: return -1;
  }
}

function generatePuzzleByDifficulty(difficulty, options) {
  var requested = isDifficultyName(difficulty) ? difficulty : 'medium';
  var opts = options || {};
  var maxAttempts = (isPlainInt(opts.maxAttempts) && opts.maxAttempts > 0) ? opts.maxAttempts : 10;
  var baseSeed = opts.seed !== undefined ? String(opts.seed) : ('auto-' + Date.now());

  var bestFallback = null;
  var bestDistance = Infinity;

  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var result = generatePuzzle({
      difficulty: requested,
      seed: baseSeed + '_gpd_' + attempt,
      maxAttempts: 3
    });

    if (!result || !result.puzzle || result.unique !== true) continue;

    var rating = rateDifficulty(result.puzzle);
    if (!rating || rating.status === 'invalid') continue;

    var requestedRank = difficultyRank(requested);
    var actualRank = difficultyRank(rating.difficulty);

    if (rating.ratingComplete === true && rating.status === 'solved' && actualRank === requestedRank) {
      return {
        puzzle: result.puzzle,
        solution: result.solution,
        difficulty: requested,
        requestedDifficulty: requested,
        actualDifficulty: requested,
        seed: result.seed,
        emptyCells: result.emptyCells,
        unique: true,
        rating: rating,
        fallback: false,
        failed: false
      };
    }

    var distance;
    if (actualRank < 0) {
      distance = 1000;
    } else {
      distance = Math.abs(actualRank - requestedRank) * 10;
      if (rating.ratingComplete !== true) distance += 5;
      if (!result.targetReached) distance += 1;
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      bestFallback = {
        puzzle: result.puzzle,
        solution: result.solution,
        difficulty: requested,
        requestedDifficulty: requested,
        actualDifficulty: (actualRank < 0 ? null : rating.difficulty),
        seed: result.seed,
        emptyCells: result.emptyCells,
        unique: true,
        rating: rating,
        fallback: true,
        failed: false
      };
    }
  }

  if (bestFallback !== null) return bestFallback;

  return {
    puzzle: null,
    solution: null,
    difficulty: requested,
    requestedDifficulty: requested,
    actualDifficulty: null,
    seed: baseSeed,
    emptyCells: 0,
    unique: false,
    rating: null,
    fallback: false,
    failed: true,
    reason: 'generation-failed'
  };
}

// ---------- المراحل والبذور والتوقيع ----------

function getLevelSeed(level, baseSeed) {
  var n = Number(level);
  if (!isPlainInt(n) || n < 1) return null;
  var base = baseSeed !== undefined ? String(baseSeed) : 'DrDer';
  return base + ':level:' + String(n);
}

function createLevel(level, difficulty, options) {
  var opts = options || {};
  var requested = isDifficultyName(difficulty) ? difficulty : 'medium';
  var seed = getLevelSeed(level, opts.baseSeed);

  if (seed === null) {
    return {
      level: level,
      difficulty: requested,
      requestedDifficulty: requested,
      actualDifficulty: null,
      seed: null,
      puzzle: null,
      solution: null,
      emptyCells: 0,
      unique: false,
      rating: null,
      signature: null,
      fallback: true,
      failed: true,
      reason: 'invalid-level'
    };
  }

  var result = generatePuzzleByDifficulty(requested, {
    seed: seed,
    maxAttempts: opts.maxAttempts || 10
  });

  if (!result || !result.puzzle || result.failed) {
    return {
      level: level,
      difficulty: requested,
      requestedDifficulty: requested,
      actualDifficulty: null,
      seed: seed,
      puzzle: null,
      solution: null,
      emptyCells: 0,
      unique: false,
      rating: null,
      signature: null,
      fallback: true,
      failed: true,
      reason: 'generation-failed'
    };
  }

  var signature = createLevelSignature(result.puzzle);

  return {
    level: level,
    difficulty: requested,
    requestedDifficulty: requested,
    actualDifficulty: result.actualDifficulty,
    seed: seed,
    puzzle: result.puzzle,
    solution: result.solution,
    emptyCells: result.emptyCells,
    unique: result.unique === true,
    rating: result.rating,
    signature: signature,
    fallback: result.fallback === true,
    failed: false
  };
}

function getNextLevel(currentLevel) {
  var n = Number(currentLevel);
  if (!isPlainInt(n) || n < 1) return 1;
  return n + 1;
}

function getDifficultyForLevel(level) {
  var n = Number(level);
  if (!isPlainInt(n) || n < 1) return 'easy';
  if (n <= 5) return 'easy';
  if (n <= 15) return 'medium';
  if (n <= 30) return 'hard';
  if (n <= 50) return 'expert';
  var cycle = (n - 51) % 12;
  if (cycle < 3) return 'medium';
  if (cycle < 7) return 'hard';
  if (cycle < 11) return 'expert';
  return 'medium';
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
