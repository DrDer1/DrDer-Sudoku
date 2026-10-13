function createEmptyBoard() {
  const board = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(0);
    }
    board.push(row);
  }
  return board;
}

function cloneBoard(board) {
  const copy = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(board[r][c]);
    }
    copy.push(row);
  }
  return copy;
}

function isValidMove(board, row, col, num) {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
  if (row < 0 || row > 8 || col < 0 || col > 8) return false;
  if (!Number.isInteger(num) || num < 1 || num > 9) return false;

  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) return false;
  }

  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) return false;
    }
  }

  return true;
}

function getCandidates(board, row, col) {
  if (row < 0 || row > 8 || col < 0 || col > 8) return [];
  if (board[row][col] !== 0) return [];

  const candidates = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidMove(board, row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

function findEmptyCell(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function findBestEmptyCell(board) {
  let best = null;
  let bestCount = 10;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const candidates = getCandidates(board, r, c);
        if (candidates.length < bestCount) {
          bestCount = candidates.length;
          best = { row: r, col: c, candidates: candidates };
          if (bestCount === 1) return best;
        }
      }
    }
  }
  return best;
}

function isBoardComplete(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

function validateBoard(board) {
  if (!Array.isArray(board) || board.length !== 9) return false;

  for (let r = 0; r < 9; r++) {
    if (!Array.isArray(board[r]) || board[r].length !== 9) return false;
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (!Number.isInteger(v) || v < 0 || v > 9) return false;
    }
  }

  for (let r = 0; r < 9; r++) {
    const seen = new Set();
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }

  for (let c = 0; c < 9; c++) {
    const seen = new Set();
    for (let r = 0; r < 9; r++) {
      const v = board[r][c];
      if (v === 0) continue;
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Set();
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          const v = board[r][c];
          if (v === 0) continue;
          if (seen.has(v)) return false;
          seen.add(v);
        }
      }
    }
  }

  return true;
}

function solveBoard(board) {
  if (!validateBoard(board)) {
    return { solved: false, board: null };
  }

  const work = cloneBoard(board);

  function backtrack() {
    const best = findBestEmptyCell(work);
    if (best === null) {
      return isBoardComplete(work);
    }

    if (best.candidates.length === 0) return false;

    const row = best.row;
    const col = best.col;
    const candidates = best.candidates;

    for (let i = 0; i < candidates.length; i++) {
      const num = candidates[i];
      work[row][col] = num;
      if (backtrack()) return true;
      work[row][col] = 0;
    }
    return false;
  }

  const solved = backtrack();
  if (solved) {
    return { solved: true, board: work };
  }
  return { solved: false, board: null };
}

function countSolutions(board, limit = 2) {
  if (!validateBoard(board)) return 0;
  if (limit <= 0) return 0;

  const work = cloneBoard(board);
  let count = 0;

  function backtrack() {
    if (count >= limit) return;

    const best = findBestEmptyCell(work);
    if (best === null) {
      if (isBoardComplete(work)) {
        count++;
      }
      return;
    }

    if (best.candidates.length === 0) return;

    const row = best.row;
    const col = best.col;
    const candidates = best.candidates;

    for (let i = 0; i < candidates.length; i++) {
      const num = candidates[i];
      work[row][col] = num;
      backtrack();
      work[row][col] = 0;
      if (count >= limit) return;
    }
  }

  backtrack();
  return count;
}

function shuffleArray(array, rng) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function createRng(seed) {
  let h = 2166136261 >>> 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  if (h === 0) h = 0x9e3779b9;

  let state = h >>> 0;

  return function rng() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSolvedBoard(rng) {
  const board = createEmptyBoard();

  function fill() {
    const best = findBestEmptyCell(board);
    if (best === null) return true;

    if (best.candidates.length === 0) return false;

    const shuffled = shuffleArray(best.candidates, rng);
    const row = best.row;
    const col = best.col;
    for (let i = 0; i < shuffled.length; i++) {
      const num = shuffled[i];
      board[row][col] = num;
      if (fill()) return true;
      board[row][col] = 0;
    }
    return false;
  }

  fill();
  return board;
}

const DIFFICULTY_TARGETS = {
  easy: { min: 36, max: 45 },
  medium: { min: 46, max: 51 },
  hard: { min: 52, max: 56 },
  expert: { min: 57, max: 64 }
};

function removeCells(solution, difficulty, rng) {
  const puzzle = cloneBoard(solution);
  const target = DIFFICULTY_TARGETS[difficulty] || DIFFICULTY_TARGETS.medium;

  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push({ row: r, col: c });
    }
  }

  const shuffled = shuffleArray(positions, rng);

  let removed = 0;

  for (let i = 0; i < shuffled.length; i++) {
    if (removed >= target.max) break;

    const row = shuffled[i].row;
    const col = shuffled[i].col;
    if (puzzle[row][col] === 0) continue;

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const solutions = countSolutions(puzzle, 2);
    if (solutions !== 1) {
      puzzle[row][col] = backup;
      continue;
    }

    removed++;

    if (removed >= target.min && removed >= target.max) break;
  }

  const emptyCells = removed;
  const unique = countSolutions(puzzle, 2) === 1;

  return { puzzle: puzzle, emptyCells: emptyCells, unique: unique };
}

function generatePuzzle(options) {
  const opts = options || {};
  const difficulty = opts.difficulty || 'medium';
  const maxAttempts = opts.maxAttempts || 5;
  const seed = opts.seed !== undefined ? opts.seed : Date.now();

  let lastResult = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = seed + '_' + attempt;
    const rng = createRng(attemptSeed);
    const solution = generateSolvedBoard(rng);
    const removal = removeCells(solution, difficulty, rng);

    lastResult = {
      puzzle: removal.puzzle,
      solution: solution,
      difficulty: difficulty,
      seed: attemptSeed,
      emptyCells: removal.emptyCells,
      unique: removal.unique
    };

    const target = DIFFICULTY_TARGETS[difficulty] || DIFFICULTY_TARGETS.medium;
    if (removal.unique && removal.emptyCells >= target.min) {
      return lastResult;
    }
  }

  return lastResult;
}

function findNakedSingles(board) {
  const result = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      const candidates = getCandidates(board, r, c);
      if (candidates.length === 1) {
        result.push({ row: r, col: c, num: candidates[0] });
      }
    }
  }
  return result;
}

function findHiddenSingles(board) {
  const result = [];

  for (let r = 0; r < 9; r++) {
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      let pos = null;
      let already = false;
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === num) { already = true; break; }
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
          count++;
          pos = { row: r, col: c };
        }
      }
      if (!already && count === 1) {
        result.push({ row: pos.row, col: pos.col, num: num });
      }
    }
  }

  for (let c = 0; c < 9; c++) {
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      let pos = null;
      let already = false;
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === num) { already = true; break; }
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
          count++;
          pos = { row: r, col: c };
        }
      }
      if (!already && count === 1) {
        result.push({ row: pos.row, col: pos.col, num: num });
      }
    }
  }

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      for (let num = 1; num <= 9; num++) {
        let count = 0;
        let pos = null;
        let already = false;
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === num) { already = true; }
            if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
              count++;
              pos = { row: r, col: c };
            }
          }
        }
        if (!already && count === 1) {
          result.push({ row: pos.row, col: pos.col, num: num });
        }
      }
    }
  }

  return result;
}

function findNakedPairs(board) {
  const result = [];

  function scanUnit(cells) {
    const map = {};
    for (let i = 0; i < cells.length; i++) {
      const row = cells[i].row;
      const col = cells[i].col;
      if (board[row][col] !== 0) continue;
      const candidates = getCandidates(board, row, col);
      if (candidates.length !== 2) continue;
      const key = candidates.join(',');
      if (!map[key]) map[key] = [];
      map[key].push({ row: row, col: col });
    }
    for (const key in map) {
      if (map[key].length === 2) {
        const pair = map[key];
        const nums = key.split(',').map(Number);
        result.push({
          type: 'nakedPair',
          cells: pair,
          nums: nums,
          unit: cells
        });
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) row.push({ row: r, col: c });
    scanUnit(row);
  }

  for (let c = 0; c < 9; c++) {
    const col = [];
    for (let r = 0; r < 9; r++) col.push({ row: r, col: c });
    scanUnit(col);
  }

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = [];
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          box.push({ row: r, col: c });
        }
      }
      scanUnit(box);
    }
  }

  return result;
}

function findPointingPairs(board) {
  const result = [];

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      for (let num = 1; num <= 9; num++) {
        let count = 0;
        const rows = new Set();
        const cols = new Set();
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) {
            if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
              count++;
              rows.add(r);
              cols.add(c);
            }
          }
        }
        if (count >= 2 && count <= 3) {
          if (rows.size === 1) {
            const row = rows.values().next().value;
            result.push({ type: 'pointingRow', num: num, row: row, boxRow: br, boxCol: bc });
          }
          if (cols.size === 1) {
            const col = cols.values().next().value;
            result.push({ type: 'pointingCol', num: num, col: col, boxRow: br, boxCol: bc });
          }
        }
      }
    }
  }

  return result;
}

function findXWing(board) {
  const result = [];

  function findInRows() {
    for (let num = 1; num <= 9; num++) {
      const rowPositions = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
            cols.push(c);
          }
        }
        if (cols.length === 2) {
          rowPositions.push({ row: r, cols: cols });
        }
      }
      for (let i = 0; i < rowPositions.length; i++) {
        for (let j = i + 1; j < rowPositions.length; j++) {
          const a = rowPositions[i];
          const b = rowPositions[j];
          if (a.cols[0] === b.cols[0] && a.cols[1] === b.cols[1]) {
            result.push({
              type: 'xwingRows',
              num: num,
              rows: [a.row, b.row],
              cols: [a.cols[0], a.cols[1]]
            });
          }
        }
      }
    }
  }

  function findInCols() {
    for (let num = 1; num <= 9; num++) {
      const colPositions = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) {
          if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
            rows.push(r);
          }
        }
        if (rows.length === 2) {
          colPositions.push({ col: c, rows: rows });
        }
      }
      for (let i = 0; i < colPositions.length; i++) {
        for (let j = i + 1; j < colPositions.length; j++) {
          const a = colPositions[i];
          const b = colPositions[j];
          if (a.rows[0] === b.rows[0] && a.rows[1] === b.rows[1]) {
            result.push({
              type: 'xwingCols',
              num: num,
              cols: [a.col, b.col],
              rows: [a.rows[0], a.rows[1]]
            });
          }
        }
      }
    }
  }

  findInRows();
  findInCols();

  return result;
}

function rateDifficulty(puzzle) {
  if (!validateBoard(puzzle)) {
    return { difficulty: 'unknown', score: 0, techniques: {}, solved: false };
  }

  const work = cloneBoard(puzzle);
  const techniques = {
    nakedSingles: 0,
    hiddenSingles: 0,
    nakedPairs: 0,
    pointingPairs: 0,
    xwing: 0,
    backtracking: 0
  };

  let progress = true;
  let guard = 0;

  while (progress && guard < 200) {
    guard++;
    progress = false;

    const naked = findNakedSingles(work);
    if (naked.length > 0) {
      for (let i = 0; i < naked.length; i++) {
        work[naked[i].row][naked[i].col] = naked[i].num;
      }
      techniques.nakedSingles += naked.length;
      progress = true;
      continue;
    }

    const hidden = findHiddenSingles(work);
    if (hidden.length > 0) {
      let placed = 0;
      for (let i = 0; i < hidden.length; i++) {
        const row = hidden[i].row;
        const col = hidden[i].col;
        const num = hidden[i].num;
        if (work[row][col] === 0 && isValidMove(work, row, col, num)) {
          work[row][col] = num;
          placed++;
        }
      }
      if (placed > 0) {
        techniques.hiddenSingles += placed;
        progress = true;
        continue;
      }
    }

    const pairs = findNakedPairs(work);
    if (pairs.length > 0) {
      techniques.nakedPairs += pairs.length;
      progress = true;
    }

    const pointing = findPointingPairs(work);
    if (pointing.length > 0) {
      techniques.pointingPairs += pointing.length;
      progress = true;
    }

    const xwing = findXWing(work);
    if (xwing.length > 0) {
      techniques.xwing += xwing.length;
      progress = true;
    }
  }

  if (!isBoardComplete(work)) {
    techniques.backtracking = 1;
  }

  const score =
    techniques.nakedSingles * 1 +
    techniques.hiddenSingles * 2 +
    techniques.nakedPairs * 4 +
    techniques.pointingPairs * 5 +
    techniques.xwing * 8 +
    techniques.backtracking * 15;

  let difficulty = 'easy';
  if (score <= 20) difficulty = 'easy';
  else if (score <= 45) difficulty = 'medium';
  else if (score <= 80) difficulty = 'hard';
  else difficulty = 'expert';

  if (techniques.backtracking > 0 && difficulty === 'easy') {
    difficulty = 'medium';
  }

  return {
    difficulty: difficulty,
    score: score,
    techniques: techniques,
    solved: isBoardComplete(work)
  };
}

function generatePuzzleByDifficulty(difficulty, options) {
  const opts = options || {};
  const maxAttempts = opts.maxAttempts || 12;
  const seed = opts.seed !== undefined ? opts.seed : Date.now();

  let best = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = generatePuzzle({
      difficulty: difficulty,
      seed: seed + '_diff_' + attempt,
      maxAttempts: 3
    });

    if (!result || !result.unique) continue;

    const rating = rateDifficulty(result.puzzle);
    if (rating.difficulty === difficulty) {
      return {
        puzzle: result.puzzle,
        solution: result.solution,
        difficulty: difficulty,
        seed: result.seed,
        emptyCells: result.emptyCells,
        unique: true,
        rating: rating
      };
    }

    if (best === null || Math.abs(rating.score) > bestScore) {
      best = {
        puzzle: result.puzzle,
        solution: result.solution,
        difficulty: rating.difficulty,
        seed: result.seed,
        emptyCells: result.emptyCells,
        unique: true,
        rating: rating
      };
      bestScore = rating.score;
    }
  }

  if (best) {
    return {
      puzzle: best.puzzle,
      solution: best.solution,
      difficulty: difficulty,
      requestedDifficulty: difficulty,
      actualDifficulty: best.difficulty,
      seed: best.seed,
      emptyCells: best.emptyCells,
      unique: true,
      rating: best.rating,
      fallback: true
    };
  }

  const fallback = generatePuzzle({ difficulty: difficulty, seed: seed, maxAttempts: 3 });
  return {
    puzzle: fallback.puzzle,
    solution: fallback.solution,
    difficulty: difficulty,
    requestedDifficulty: difficulty,
    actualDifficulty: difficulty,
    seed: fallback.seed,
    emptyCells: fallback.emptyCells,
    unique: fallback.unique,
    rating: rateDifficulty(fallback.puzzle),
    fallback: true
  };
}

function getLevelSeed(level, baseSeed) {
  const base = baseSeed !== undefined ? String(baseSeed) : 'DrDer';
  return base + ':level:' + String(level);
}

function createLevel(level, difficulty, options) {
  const opts = options || {};
  const seed = getLevelSeed(level, opts.baseSeed);

  const result = generatePuzzleByDifficulty(difficulty, {
    seed: seed,
    maxAttempts: opts.maxAttempts || 10
  });

  const signature = createLevelSignature(result.puzzle);

  return {
    level: level,
    difficulty: difficulty,
    seed: seed,
    puzzle: result.puzzle,
    solution: result.solution,
    emptyCells: result.emptyCells,
    unique: result.unique,
    rating: result.rating,
    signature: signature,
    fallback: result.fallback === true
  };
}

function getNextLevel(currentLevel) {
  const n = Number(currentLevel);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n) + 1;
}

function getDifficultyForLevel(level) {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  if (n <= 5) return 'easy';
  if (n <= 15) return 'medium';
  if (n <= 30) return 'hard';
  if (n <= 50) return 'expert';
  const cycle = (n - 51) % 12;
  if (cycle < 3) return 'medium';
  if (cycle < 7) return 'hard';
  if (cycle < 11) return 'expert';
  return 'medium';
}

function createLevelSignature(puzzle) {
  if (!Array.isArray(puzzle)) return '';
  let sig = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      sig += puzzle[r][c];
    }
  }
  let hash = 0;
  for (let i = 0; i < sig.length; i++) {
    hash = ((hash << 5) - hash + sig.charCodeAt(i)) | 0;
  }
  return 'sig_' + (hash >>> 0).toString(36);
}

function isRepeatedPuzzle(signature, history) {
  if (!signature || !Array.isArray(history)) return false;
  return history.indexOf(signature) !== -1;
}
