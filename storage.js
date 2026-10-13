// DrDer-Sudoku storage.js
// وحدة التخزين المحلي. تعتمد على localStorage فقط، ولا تتعامل مع DOM.
// لا تشترط مطابقة لوحة اللاعب لحل مخزّن؛ التحقق من صحة الفوز يجري في app.js.

var STORAGE_KEYS = {
  progress: 'DrDerSudoku:progress',
  bestTimes: 'DrDerSudoku:bestTimes',
  completed: 'DrDerSudoku:completed',
  settings: 'DrDerSudoku:settings',
  history: 'DrDerSudoku:history'
};

var DEFAULT_SETTINGS = {
  highlightSame: true,
  highlightRowCol: true,
  showConflicts: true,
  autoRemoveNotes: false,
  theme: 'dark-gold'
};

var HISTORY_LIMIT = 300;

var SUPPORTED_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
var SUPPORTED_THEMES = ['dark-gold'];

function isPlainInt(v) {
  return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
}

function isValidBoardShape(board) {
  if (!Array.isArray(board) || board.length !== 9) return false;
  for (var r = 0; r < 9; r++) {
    if (!Array.isArray(board[r]) || board[r].length !== 9) return false;
  }
  return true;
}

function isValidBoardValues(board) {
  if (!isValidBoardShape(board)) return false;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var v = board[r][c];
      if (!isPlainInt(v) || v < 0 || v > 9) return false;
    }
  }
  return true;
}

function isValidSudokuBoard(board) {
  if (!isValidBoardValues(board)) return false;
  var r, c, v;
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

function cloneBoardSafe(board) {
  if (!isValidBoardShape(board)) return null;
  var copy = [];
  for (var r = 0; r < 9; r++) {
    var row = [];
    for (var c = 0; c < 9; c++) row.push(board[r][c]);
    copy.push(row);
  }
  return copy;
}

// isPlayerBoardCompatible: يتحقق من أن الأرقام الأصلية في اللغز لم تتغير في لوحة اللاعب.
// لا يشترط أن تكون لوحة اللاعب مكتملة أو خالية من التعارضات أثناء اللعب.
function isPlayerBoardCompatible(puzzle, playerBoard) {
  if (!isValidBoardShape(puzzle) || !isValidBoardShape(playerBoard)) return false;
  if (!isValidBoardValues(puzzle) || !isValidBoardValues(playerBoard)) return false;
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var p = puzzle[r][c];
      if (p === 0) continue;
      if (playerBoard[r][c] !== p) return false;
    }
  }
  return true;
}

function isValidDifficulty(difficulty) {
  if (typeof difficulty !== 'string') return false;
  for (var i = 0; i < SUPPORTED_DIFFICULTIES.length; i++) {
    if (SUPPORTED_DIFFICULTIES[i] === difficulty) return true;
  }
  return false;
}

function isValidTheme(theme) {
  if (typeof theme !== 'string') return false;
  for (var i = 0; i < SUPPORTED_THEMES.length; i++) {
    if (SUPPORTED_THEMES[i] === theme) return true;
  }
  return false;
}

// ---------- التخزين الآمن ----------

function isStorageAvailable() {
  try {
    if (typeof localStorage === 'undefined') return false;
    var key = 'DrDerSudoku:probe';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

function safeGetItem(key) {
  if (typeof key !== 'string' || key.length === 0) return null;
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeSetItem(key, value) {
  if (typeof key !== 'string' || key.length === 0) return false;
  if (typeof value !== 'string') return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function safeRemoveItem(key) {
  if (typeof key !== 'string' || key.length === 0) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

function safeParseJSON(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function safeStringifyJSON(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return null;
  }
}

// ---------- التقدم الحالي ----------

// saveProgress: يحفظ لوحة اللغز ولوحة اللاعب دون اشتراط تطابق مع حل مخزّن.
// يتحقق فقط من أن لوحة اللاعب تحترم الأرقام الأصلية.
function saveProgress(data) {
  if (!data || typeof data !== 'object') return false;

  var level = isPlainInt(data.level) && data.level >= 1 ? data.level : null;
  if (level === null) return false;

  var difficulty = isValidDifficulty(data.difficulty) ? data.difficulty : null;
  if (difficulty === null) return false;

  var puzzle = isValidSudokuBoard(data.puzzle) ? cloneBoardSafe(data.puzzle) : null;
  if (puzzle === null) return false;

  var playerBoard = isValidBoardValues(data.playerBoard) ? cloneBoardSafe(data.playerBoard) : null;
  if (playerBoard === null) return false;

  if (!isPlayerBoardCompatible(puzzle, playerBoard)) return false;

  var elapsedSeconds = isPlainInt(data.elapsedSeconds) && data.elapsedSeconds >= 0 ? data.elapsedSeconds : 0;
  var paused = data.paused === true;
  var seed = data.seed !== undefined && data.seed !== null ? String(data.seed) : null;

  var payload = {
    level: level,
    difficulty: difficulty,
    seed: seed,
    puzzle: puzzle,
    playerBoard: playerBoard,
    elapsedSeconds: elapsedSeconds,
    paused: paused,
    savedAt: Date.now()
  };

  var text = safeStringifyJSON(payload);
  if (text === null) return false;
  return safeSetItem(STORAGE_KEYS.progress, text);
}

function loadProgress() {
  var text = safeGetItem(STORAGE_KEYS.progress);
  if (text === null) return null;
  var parsed = safeParseJSON(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  var level = isPlainInt(parsed.level) && parsed.level >= 1 ? parsed.level : null;
  if (level === null) return null;

  var difficulty = isValidDifficulty(parsed.difficulty) ? parsed.difficulty : null;
  if (difficulty === null) return null;

  var puzzle = isValidSudokuBoard(parsed.puzzle) ? cloneBoardSafe(parsed.puzzle) : null;
  if (puzzle === null) return null;

  var playerBoard = isValidBoardValues(parsed.playerBoard) ? cloneBoardSafe(parsed.playerBoard) : null;
  if (playerBoard === null) return null;

  if (!isPlayerBoardCompatible(puzzle, playerBoard)) return null;

  var elapsedSeconds = isPlainInt(parsed.elapsedSeconds) && parsed.elapsedSeconds >= 0 ? parsed.elapsedSeconds : 0;
  var paused = parsed.paused === true;
  var seed = parsed.seed !== undefined && parsed.seed !== null ? String(parsed.seed) : null;

  return {
    level: level,
    difficulty: difficulty,
    seed: seed,
    puzzle: puzzle,
    playerBoard: playerBoard,
    elapsedSeconds: elapsedSeconds,
    paused: paused
  };
}

function clearProgress() {
  return safeRemoveItem(STORAGE_KEYS.progress);
}

// ---------- أفضل الأوقات ----------

function loadBestTimesMap() {
  var text = safeGetItem(STORAGE_KEYS.bestTimes);
  if (text === null) return {};
  var parsed = safeParseJSON(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  var cleaned = {};
  for (var key in parsed) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
    var levelNum = Number(key);
    if (!isPlainInt(levelNum) || levelNum < 1) continue;
    var value = parsed[key];
    if (!isPlainInt(value) || value < 0) continue;
    cleaned[String(levelNum)] = value;
  }
  return cleaned;
}

function saveBestTime(level, seconds) {
  if (!isPlainInt(level) || level < 1) return false;
  if (!isPlainInt(seconds) || seconds < 0) return false;
  var map = loadBestTimesMap();
  var key = String(level);
  var current = map[key];
  if (isPlainInt(current) && current <= seconds) return true;
  map[key] = seconds;
  var text = safeStringifyJSON(map);
  if (text === null) return false;
  return safeSetItem(STORAGE_KEYS.bestTimes, text);
}

function getBestTime(level) {
  if (!isPlainInt(level) || level < 1) return null;
  var map = loadBestTimesMap();
  var value = map[String(level)];
  if (isPlainInt(value) && value >= 0) return value;
  return null;
}

// ---------- المراحل المكتملة ----------

function loadCompletedMap() {
  var text = safeGetItem(STORAGE_KEYS.completed);
  if (text === null) return {};
  var parsed = safeParseJSON(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  var cleaned = {};
  for (var key in parsed) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
    var levelNum = Number(key);
    if (!isPlainInt(levelNum) || levelNum < 1) continue;
    var entry = parsed[key];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    cleaned[String(levelNum)] = entry;
  }
  return cleaned;
}

function saveCompletedLevel(level, data) {
  if (!isPlainInt(level) || level < 1) return false;
  var payload = {
    level: level,
    seconds: (data && isPlainInt(data.seconds) && data.seconds >= 0) ? data.seconds : null,
    difficulty: (data && isValidDifficulty(data.difficulty)) ? data.difficulty : null,
    completedAt: Date.now()
  };
  var map = loadCompletedMap();
  map[String(level)] = payload;
  var text = safeStringifyJSON(map);
  if (text === null) return false;
  return safeSetItem(STORAGE_KEYS.completed, text);
}

function getCompletedLevel(level) {
  if (!isPlainInt(level) || level < 1) return null;
  var map = loadCompletedMap();
  var entry = map[String(level)];
  if (!entry || typeof entry !== 'object') return null;
  var entryLevel = isPlainInt(entry.level) && entry.level >= 1 ? entry.level : level;
  var seconds = isPlainInt(entry.seconds) && entry.seconds >= 0 ? entry.seconds : null;
  var difficulty = isValidDifficulty(entry.difficulty) ? entry.difficulty : null;
  var completedAt = isPlainInt(entry.completedAt) ? entry.completedAt : null;
  return {
    level: entryLevel,
    seconds: seconds,
    difficulty: difficulty,
    completedAt: completedAt
  };
}

// ---------- الإعدادات ----------

function saveSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  var merged = {
    highlightSame: typeof settings.highlightSame === 'boolean' ? settings.highlightSame : DEFAULT_SETTINGS.highlightSame,
    highlightRowCol: typeof settings.highlightRowCol === 'boolean' ? settings.highlightRowCol : DEFAULT_SETTINGS.highlightRowCol,
    showConflicts: typeof settings.showConflicts === 'boolean' ? settings.showConflicts : DEFAULT_SETTINGS.showConflicts,
    autoRemoveNotes: typeof settings.autoRemoveNotes === 'boolean' ? settings.autoRemoveNotes : DEFAULT_SETTINGS.autoRemoveNotes,
    theme: isValidTheme(settings.theme) ? settings.theme : DEFAULT_SETTINGS.theme
  };
  var text = safeStringifyJSON(merged);
  if (text === null) return false;
  return safeSetItem(STORAGE_KEYS.settings, text);
}

function loadSettings() {
  var text = safeGetItem(STORAGE_KEYS.settings);
  var parsed = text === null ? null : safeParseJSON(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
  return {
    highlightSame: typeof parsed.highlightSame === 'boolean' ? parsed.highlightSame : DEFAULT_SETTINGS.highlightSame,
    highlightRowCol: typeof parsed.highlightRowCol === 'boolean' ? parsed.highlightRowCol : DEFAULT_SETTINGS.highlightRowCol,
    showConflicts: typeof parsed.showConflicts === 'boolean' ? parsed.showConflicts : DEFAULT_SETTINGS.showConflicts,
    autoRemoveNotes: typeof parsed.autoRemoveNotes === 'boolean' ? parsed.autoRemoveNotes : DEFAULT_SETTINGS.autoRemoveNotes,
    theme: isValidTheme(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme
  };
}

// ---------- سجل التوقيعات ----------

function loadPuzzleHistory() {
  var text = safeGetItem(STORAGE_KEYS.history);
  if (text === null) return [];
  var parsed = safeParseJSON(text);
  if (!Array.isArray(parsed)) return [];
  var cleaned = [];
  var seen = {};
  for (var i = 0; i < parsed.length; i++) {
    var item = parsed[i];
    var sig = null;
    if (typeof item === 'string' && item.length > 0) {
      sig = item;
    } else if (item && typeof item === 'object' && typeof item.signature === 'string' && item.signature.length > 0) {
      sig = item.signature;
    }
    if (sig === null) continue;
    if (seen[sig]) continue;
    seen[sig] = true;
    cleaned.push(sig);
  }
  return cleaned;
}

function savePuzzleHistory(signature) {
  if (typeof signature !== 'string' || signature.length === 0) return false;
  var history = loadPuzzleHistory();
  for (var i = 0; i < history.length; i++) {
    if (history[i] === signature) return true;
  }
  history.push(signature);
  while (history.length > HISTORY_LIMIT) {
    history.shift();
  }
  var text = safeStringifyJSON(history);
  if (text === null) return false;
  return safeSetItem(STORAGE_KEYS.history, text);
}
