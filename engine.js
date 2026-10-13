/* DrDer-Sudoku engine.js
 * محرك سودوكو مستقل عن الواجهة.
 * التلميح يحترم جميع إدخالات المستخدم.
 * لا يعيد التلميح رقماً إلا إذا كان ثابتاً
 * في جميع الحلول المتوافقة مع اللوحة الحالية.
 */

var DIFFICULTY_TARGETS = {
  easy: { min: 36, max: 45 },
  medium: { min: 46, max: 51 },
  hard: { min: 52, max: 56 },
  expert: { min: 57, max: 64 }
};

function isPlainInt(v) {
  return typeof v === 'number' &&
    isFinite(v) &&
    Math.floor(v) === v;
}

function isValidCellValue(v) {
  return isPlainInt(v) && v >= 0 && v <= 9;
}

function isValidCoordinate(row, col) {
  return isPlainInt(row) &&
    isPlainInt(col) &&
    row >= 0 && row < 9 &&
    col >= 0 && col < 9;
}

function isValidBoardShape(board) {
  if (!Array.isArray(board) || board.length !== 9) return false;

  for (var r = 0; r < 9; r++) {
    if (!Array.isArray(board[r]) || board[r].length !== 9) {
      return false;
    }
  }

  return true;
}

function createEmptyBoard() {
  var board = [];

  for (var r = 0; r < 9; r++) {
    board.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  }

  return board;
}

function cloneBoard(board) {
  if (!isValidBoardShape(board)) return null;

  var copy = [];

  for (var r = 0; r < 9; r++) {
    copy.push(board[r].slice());
  }

  return copy;
}

function validateBoard(board) {
  if (!isValidBoardShape(board)) return false;

  var r, c, n;

  for (r = 0; r < 9; r++) {
    for (c = 0; c < 9; c++) {
      if (!isValidCellValue(board[r][c])) return false;
    }
  }

  for (r = 0; r < 9; r++) {
    var rowSeen = {};

    for (c = 0; c < 9; c++) {
      n = board[r][c];
      if (n === 0) continue;
      if (rowSeen[n]) return false;
      rowSeen[n] = true;
    }
  }

  for (c = 0; c < 9; c++) {
    var colSeen = {};

    for (r = 0; r < 9; r++) {
      n = board[r][c];
      if (n === 0) continue;
      if (colSeen[n]) return false;
      colSeen[n] = true;
    }
  }

  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      var boxSeen = {};

      for (r = br * 3; r < br * 3 + 3; r++) {
        for (c = bc * 3; c < bc * 3 + 3; c++) {
          n = board[r][c];
          if (n === 0) continue;
          if (boxSeen[n]) return false;
          boxSeen[n] = true;
        }
      }
    }
  }

  return true;
}

function isValidPuzzle(board) {
  return validateBoard(board);
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
  return isBoardComplete(board) && validateBoard(board);
}

function isValidMove(board, row, col, num) {
  if (!isValidBoardShape(board)) return false;
  if (!isValidCoordinate(row, col)) return false;
  if (!isPlainInt(num) || num < 1 || num > 9) return false;
  if (board[row][col] !== 0) return false;

  for (var c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }

  for (var r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }

  var boxRow = Math.floor(row / 3) * 3;
  var boxCol = Math.floor(col / 3) * 3;

  for (var br = boxRow; br < boxRow + 3; br++) {
    for (var bc = boxCol; bc < boxCol + 3; bc++) {
      if (board[br][bc] === num) return false;
    }
  }

  return true;
}

function getCandidates(board, row, col) {
  if (!isValidBoardShape(board)) return [];
  if (!isValidCoordinate(row, col)) return [];
  if (board[row][col] !== 0) return [];

  var result = [];

  for (var n = 1; n <= 9; n++) {
    if (isValidMove(board, row, col, n)) {
      result.push(n);
    }
  }

  return result;
}

function buildCandidates(board) {
  if (!isValidBoardShape(board)) return null;

  var result = [];

  for (var r = 0; r < 9; r++) {
    var row = [];

    for (var c = 0; c < 9; c++) {
      row.push(
        board[r][c] === 0
          ? getCandidates(board, r, c)
          : null
      );
    }

    result.push(row);
  }

  return result;
}

function cloneCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length !== 9) {
    return null;
  }

  var copy = [];

  for (var r = 0; r < 9; r++) {
    if (!Array.isArray(candidates[r]) || candidates[r].length !== 9) {
      return null;
    }

    var row = [];

    for (var c = 0; c < 9; c++) {
      var cell = candidates[r][c];

      if (cell === null) {
        row.push(null);
      } else if (Array.isArray(cell)) {
        row.push(cell.slice());
      } else {
        return null;
      }
    }

    copy.push(row);
  }

  return copy;
}

function candidatesConsistent(board, candidates) {
  if (!validateBoard(board)) return false;
  if (!Array.isArray(candidates) || candidates.length !== 9) {
    return false;
  }

  for (var r = 0; r < 9; r++) {
    if (!Array.isArray(candidates[r]) || candidates[r].length !== 9) {
      return false;
    }

    for (var c = 0; c < 9; c++) {
      var list = candidates[r][c];

      if (board[r][c] !== 0) {
        if (list !== null) return false;
        continue;
      }

      if (!Array.isArray(list) || list.length === 0) return false;

      var seen = {};

      for (var i = 0; i < list.length; i++) {
        var n = list[i];

        if (!isPlainInt(n) || n < 1 || n > 9) return false;
        if (seen[n]) return false;
        if (!isValidMove(board, r, c, n)) return false;

        seen[n] = true;
      }
    }
  }

  for (var unit = 0; unit < 27; unit++) {
    var cells = [];

    if (unit < 9) {
      for (var c1 = 0; c1 < 9; c1++) {
        cells.push({ row: unit, col: c1 });
      }
    } else if (unit < 18) {
      var col = unit - 9;

      for (var r1 = 0; r1 < 9; r1++) {
        cells.push({ row: r1, col: col });
      }
    } else {
      var box = unit - 18;
      var boxRow = Math.floor(box / 3) * 3;
      var boxCol = (box % 3) * 3;

      for (var rr = boxRow; rr < boxRow + 3; rr++) {
        for (var cc = boxCol; cc < boxCol + 3; cc++) {
          cells.push({ row: rr, col: cc });
        }
      }
    }

    for (var num = 1; num <= 9; num++) {
      var alreadyPlaced = false;
      var possible = false;

      for (var j = 0; j < cells.length; j++) {
        var cellRow = cells[j].row;
        var cellCol = cells[j].col;

        if (board[cellRow][cellCol] === num) {
          alreadyPlaced = true;
          break;
        }

        var cellCandidates = candidates[cellRow][cellCol];

        if (
          cellCandidates &&
          cellCandidates.indexOf(num) !== -1
        ) {
          possible = true;
        }
      }

      if (!alreadyPlaced && !possible) return false;
    }
  }

  return true;
}

function refreshCandidates(board, candidates) {
  if (!isValidBoardShape(board)) return null;

  var fresh = buildCandidates(board);

  if (!fresh) return null;

  if (!Array.isArray(candidates) || candidates.length !== 9) {
    return fresh;
  }

  for (var r = 0; r < 9; r++) {
    if (!Array.isArray(candidates[r]) || candidates[r].length !== 9) {
      return fresh;
    }

    for (var c = 0; c < 9; c++) {
      candidates[r][c] = board[r][c] === 0
        ? fresh[r][c].slice()
        : null;
    }
  }

  return candidates;
}

function findEmptyCell(board) {
  if (!isValidBoardShape(board)) return null;

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        return { row: r, col: c };
      }
    }
  }

  return null;
}

function findBestEmptyCell(board) {
  if (!isValidBoardShape(board)) return null;

  var best = null;
  var bestCount = 10;

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;

      var list = getCandidates(board, r, c);

      if (list.length < bestCount) {
        bestCount = list.length;
        best = {
          row: r,
          col: c,
          candidates: list
        };

        if (bestCount <= 1) return best;
      }
    }
  }

  return best;
}

/*
 * البحث عن الحلول المتوافقة مع لوحة المستخدم.
 * يمكن تحديد خلية مستهدفة لاختبار القيم الممكنة فيها.
 * يتوقف البحث عند بلوغ الحد المطلوب.
 */
function findSolutions(board, limit, targetRow, targetCol) {
  if (!validateBoard(board)) {
    return {
      count: 0,
      solutions: [],
      targetValues: []
    };
  }

  var max = isPlainInt(limit) && limit > 0 ? limit : 2;
  var work = cloneBoard(board);
  var solutions = [];
  var targetValues = [];
  var hasTarget = isValidCoordinate(targetRow, targetCol);

  function backtrack() {
    if (solutions.length >= max) return;

    var best = findBestEmptyCell(work);

    if (best === null) {
      if (validateSolvedBoard(work)) {
        solutions.push(cloneBoard(work));

        if (hasTarget) {
          var value = work[targetRow][targetCol];

          if (targetValues.indexOf(value) === -1) {
            targetValues.push(value);
          }
        }
      }

      return;
    }

    if (best.candidates.length === 0) return;

    for (var i = 0; i < best.candidates.length; i++) {
      work[best.row][best.col] = best.candidates[i];

      backtrack();

      work[best.row][best.col] = 0;

      if (solutions.length >= max) return;
    }
  }

  backtrack();

  return {
    count: solutions.length,
    solutions: solutions,
    targetValues: targetValues
  };
}

function solveBoard(board) {
  var result = findSolutions(board, 1);

  if (result.count === 0) {
    return { solved: false, board: null };
  }

  return {
    solved: true,
    board: cloneBoard(result.solutions[0])
  };
}

function countSolutions(board, limit) {
  var max = isPlainInt(limit) && limit > 0 ? limit : 2;
  return findSolutions(board, max).count;
}

/*
 * التلميح الآمن:
 * 1. يحترم كل الأرقام الموجودة في اللوحة.
 * 2. يرفض اللوحة المتعارضة أو غير القابلة للحل.
 * 3. يفحص جميع الحلول الممكنة.
 * 4. يعيد الرقم فقط إذا اتفقت الحلول كلها على القيمة نفسها.
 *
 * null تعني أن التلميح غير آمن أو غير قابل للتحديد.
 */
function getHintForCell(board, row, col) {
  if (!isValidBoardShape(board)) return null;
  if (!isValidCoordinate(row, col)) return null;
  if (!validateBoard(board)) return null;
  if (board[row][col] !== 0) return null;

  var candidates = getCandidates(board, row, col);

  if (candidates.length === 0) return null;

  /*
   * لا نكتفي بعدّ حلين هنا؛ فقد يكون الرقمان المختلفان
   * في خلية أخرى، بينما الخلية المحددة ثابتة في جميع الحلول.
   * لذلك نفحص القيم الممكنة للخلية المستهدفة مباشرة.
   */
  var possibleValues = [];

  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i];
    var testBoard = cloneBoard(board);

    testBoard[row][col] = candidate;

    if (countSolutions(testBoard, 1) > 0) {
      possibleValues.push(candidate);
    }

    if (possibleValues.length > 1) {
      return null;
    }
  }

  if (possibleValues.length !== 1) return null;

  var answer = possibleValues[0];

  if (candidates.indexOf(answer) === -1) return null;
  if (!isValidMove(board, row, col, answer)) return null;

  return answer;
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

  return function () {
    state = (state + 0x6D2B79F5) >>> 0;

    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray(array, rng) {
  if (!Array.isArray(array)) return [];

  var result = array.slice();
  var random = typeof rng === 'function' ? rng : Math.random;

  for (var i = result.length - 1; i > 0; i--) {
    var value = random();

    if (typeof value !== 'number' || !isFinite(value)) value = 0;
    if (value < 0) value = 0;
    if (value >= 1) value = 0.999999999;

    var j = Math.floor(value * (i + 1));
    var temp = result[i];

    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

function generateSolvedBoard(rng) {
  var random = typeof rng === 'function'
    ? rng
    : createRng('DrDer-default');

  var board = createEmptyBoard();

  function fill() {
    var best = findBestEmptyCell(board);

    if (best === null) return true;
    if (best.candidates.length === 0) return false;

    var options = shuffleArray(best.candidates, random);

    for (var i = 0; i < options.length; i++) {
      board[best.row][best.col] = options[i];

      if (fill()) return true;

      board[best.row][best.col] = 0;
    }

    return false;
  }

  if (!fill()) return null;

  return validateSolvedBoard(board) ? board : null;
}

function isDifficultyName(name) {
  return typeof name === 'string' &&
    Object.prototype.hasOwnProperty.call(DIFFICULTY_TARGETS, name);
}

function countEmptyCells(board) {
  if (!isValidBoardShape(board)) return 0;

  var count = 0;

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] === 0) count++;
    }
  }

  return count;
}

function removeCells(solution, difficulty, rng, options) {
  var target = isDifficultyName(difficulty)
    ? DIFFICULTY_TARGETS[difficulty]
    : DIFFICULTY_TARGETS.medium;

  var fail = {
    puzzle: null,
    emptyCells: 0,
    unique: false,
    solvable: false,
    targetReached: false,
    targetMin: target.min,
    targetMax: target.max
  };

  if (!validateSolvedBoard(solution)) return fail;

  var random = typeof rng === 'function'
    ? rng
    : createRng('remove-default');

  var puzzle = cloneBoard(solution);
  var positions = [];

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      positions.push({ row: r, col: c });
    }
  }

  positions = shuffleArray(positions, random);

  var desired = target.min +
    Math.floor(random() * (target.max - target.min + 1));

  for (var i = 0; i < positions.length; i++) {
    if (countEmptyCells(puzzle) >= desired) break;

    var pos = positions[i];
    puzzle[pos.row][pos.col] = 0;
  }

  var empty = countEmptyCells(puzzle);

  return {
    puzzle: puzzle,
    emptyCells: empty,
    unique: countSolutions(puzzle, 2) === 1,
    solvable: countSolutions(puzzle, 1) > 0,
    targetReached: empty >= target.min && empty <= target.max,
    targetMin: target.min,
    targetMax: target.max
  };
}

function generatePuzzle(options) {
  var opts = options || {};
  var difficulty = isDifficultyName(opts.difficulty)
    ? opts.difficulty
    : 'medium';

  var attempts = isPlainInt(opts.maxAttempts) && opts.maxAttempts > 0
    ? Math.min(opts.maxAttempts, 20)
    : 5;

  var baseSeed = opts.seed !== undefined
    ? String(opts.seed)
    : 'auto-' + Date.now();

  for (var attempt = 0; attempt < attempts; attempt++) {
    var seed = baseSeed + '_' + attempt;
    var rng = createRng(seed);
    var solution = generateSolvedBoard(rng);

    if (!solution) continue;

    var removal = removeCells(solution, difficulty, rng, opts);

    if (!removal.puzzle || !validateBoard(removal.puzzle)) continue;

    return {
      puzzle: removal.puzzle,
      solution: solution,
      difficulty: difficulty,
      requestedDifficulty: difficulty,
      actualDifficulty: null,
      seed: seed,
      emptyCells: removal.emptyCells,
      unique: removal.unique,
      solvable: removal.solvable,
      multiSolution: !removal.unique,
      targetReached: removal.targetReached,
      targetMin: removal.targetMin,
      targetMax: removal.targetMax,
      fallback: !removal.targetReached,
      failed: false,
      rating: null
    };
  }

  return {
    puzzle: null,
    solution: null,
    difficulty: difficulty,
    requestedDifficulty: difficulty,
    actualDifficulty: null,
    seed: baseSeed,
    emptyCells: 0,
    unique: false,
    solvable: false,
    multiSolution: false,
    targetReached: false,
    targetMin: DIFFICULTY_TARGETS[difficulty].min,
    targetMax: DIFFICULTY_TARGETS[difficulty].max,
    fallback: false,
    failed: true,
    reason: 'generation-failed',
    rating: null
  };
}

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

  var result = solveBoard(puzzle);

  return {
    status: result.solved ? 'unresolved' : 'invalid',
    difficulty: 'unresolved',
    score: 0,
    techniques: {},
    solved: false,
    ratingComplete: false,
    reason: result.solved ? 'rating-disabled' : 'no-solution'
  };
}

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

  var result = generatePuzzle({
    difficulty: requested,
    seed: opts.seed,
    maxAttempts: opts.maxAttempts
  });

  if (!result || result.failed) return result;

  result.difficulty = requested;
  result.requestedDifficulty = requested;
  result.actualDifficulty = null;
  result.rating = null;

  return result;
}

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
      solvable: false,
      multiSolution: false,
      rating: null,
      signature: null,
      fallback: true,
      failed: true,
      reason: 'invalid-level'
    };
  }

  var result = generatePuzzleByDifficulty(requested, {
    seed: seed,
    maxAttempts: opts.maxAttempts
  });

  if (!result || result.failed || !result.puzzle) {
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
      solvable: false,
      multiSolution: false,
      rating: null,
      signature: null,
      fallback: true,
      failed: true,
      reason: 'generation-failed'
    };
  }

  return {
    level: level,
    difficulty: requested,
    requestedDifficulty: requested,
    actualDifficulty: null,
    seed: seed,
    puzzle: result.puzzle,
    solution: result.solution,
    emptyCells: result.emptyCells,
    unique: result.unique,
    solvable: result.solvable,
    multiSolution: result.multiSolution,
    rating: null,
    signature: createLevelSignature(result.puzzle),
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

  var signature = '';

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      signature += String(puzzle[r][c]);
    }
  }

  return signature;
}

function isRepeatedPuzzle(signature, history) {
  if (typeof signature !== 'string' || !signature) return false;
  if (!Array.isArray(history)) return false;

  for (var i = 0; i < history.length; i++) {
    var entry = history[i];

    if (typeof entry === 'string' && entry === signature) {
      return true;
    }

    if (
      entry &&
      typeof entry === 'object' &&
      entry.signature === signature
    ) {
      return true;
    }
  }

  return false;
}
