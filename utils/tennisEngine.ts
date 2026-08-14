import {
  MatchState,
  MatchConfig,
  MatchStats,
  PlayerId,
  PointAction,
  PointScore,
  SetScore,
  ShotType,
  Language,
  JournalEntry,
  IndividualStats,
  IndividualStatsKey,
} from '../types';
import { translations } from './translations';

/**
 * NOTE FOR THE DEVELOPER:
 * This file was reconstructed — the original tennisEngine.ts was not present in the
 * project files that were uploaded, only its usages (imports/calls) were. The shape below
 * (function signatures, MatchState fields) matches exactly what the rest of the app expects,
 * and the scoring rules follow standard tennis conventions, but a couple of judgment calls
 * were made where the rules aren't fully standardized. Search "ASSUMPTION" below.
 */

const opponentOf = (id: PlayerId): PlayerId => (id === 'p1' ? 'p2' : 'p1');

export function emptyStats(): MatchStats {
  return {
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    returnWinners: 0,
    returnErrors: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
    firstServesIn: 0,
    firstServePointsWon: 0,
    secondServePointsWon: 0,
    secondServePointsTotal: 0,
    servicePointsWon: 0,
    servicePointsTotal: 0,
    returnPointsWon: 0,
    returnFirstServePointsWon: 0,
    returnSecondServePointsWon: 0,
    totalPointsWon: 0,
    breakPointsWon: 0,
    breakPointsOpportunities: 0,
    breakPointsSaved: 0,
    breakPointsFaced: 0,
  };
}

// Fresh per-partner stat block for a brand new doubles match.
export function createIndividualStats(): IndividualStats {
  return { p1a: emptyStats(), p1b: emptyStats(), p2a: emptyStats(), p2b: emptyStats() };
}

const defaultConfig: MatchConfig = {
  setsToWin: 2,
  totalSetsMode: 3,
  gamesPerSet: 6,
  advantage: 'standard',
  finalSetType: 'standard',
  initialServer: 'p1',
  matchType: 'singles',
};

export function getInitialState(lang: Language): MatchState {
  return {
    status: 'setup',
    config: defaultConfig,
    players: {
      p1: lang === 'ru' ? 'Игрок 1' : 'Player 1',
      p2: lang === 'ru' ? 'Игрок 2' : 'Player 2',
    },
    teamPlayers: null,
    server: 'p1',
    isSecondServe: false,
    broadcastId: null,
    startTime: null,
    points: { p1: '0', p2: '0' },
    rawPoints: { p1: 0, p2: 0 },
    games: { p1: 0, p2: 0 },
    sets: [{ p1: 0, p2: 0 }],
    isTiebreak: false,
    tiebreakScore: { p1: 0, p2: 0 },
    winner: null,
    history: [],
    journal: [],
    stats: { p1: emptyStats(), p2: emptyStats() },
    individualStats: null,
  };
}

function computeSetsWon(sets: SetScore[]): { p1: number; p2: number } {
  let p1 = 0;
  let p2 = 0;
  for (const s of sets) {
    if (s.winner === 'p1') p1++;
    else if (s.winner === 'p2') p2++;
  }
  return { p1, p2 };
}

function formatPoint(raw: number, oppRaw: number, noAd: boolean): PointScore {
  const MAP: PointScore[] = ['0', '15', '30', '40'];
  if (raw < 3) return MAP[raw];
  if (oppRaw < 3) return '40';
  if (noAd) return '40'; // No-Ad: sudden death at 40-40, never shows "Ad"
  if (raw === oppRaw) return '40'; // Deuce, shown as 40-40
  if (raw > oppRaw) return 'Ad';
  return '40';
}

/**
 * Returns the current live status of the point about to be played, from either
 * player's perspective: match point, set point, or (for the returner) break point.
 * Priority: match-point > set-point > break-point.
 */
export function getPointStatus(state: MatchState): 'match-point' | 'set-point' | 'break-point' | null {
  if (state.winner || state.status !== 'active') return null;

  const { config } = state;
  const noAd = config.advantage === 'no-ad';
  const setsWon = computeSetsWon(state.sets);
  const currentSetIndex = state.sets.length - 1;
  const isDeciderSet = currentSetIndex === config.totalSetsMode - 1;
  // ASSUMPTION: a "super tiebreak" only replaces games in the deciding set of a multi-set match.
  const isSuperTB =
    state.isTiebreak && isDeciderSet && config.finalSetType === 'super-tiebreak' && config.totalSetsMode > 1;

  let anyMatchPoint = false;
  let anySetPoint = false;
  let anyBreakPoint = false;

  (['p1', 'p2'] as PlayerId[]).forEach((player) => {
    const opp = opponentOf(player);
    let winsGame: boolean;

    if (state.isTiebreak) {
      const target = isSuperTB ? 10 : 7;
      const p = state.tiebreakScore[player] + 1;
      const o = state.tiebreakScore[opp];
      winsGame = p >= target && p - o >= 2;
    } else {
      const p = state.rawPoints[player] + 1;
      const o = state.rawPoints[opp];
      winsGame = noAd ? p >= 4 && p > o : p >= 4 && p - o >= 2;
    }

    if (!winsGame) return;

    const winsSet = state.isTiebreak
      ? true
      : (() => {
          const g = state.games[player] + 1;
          const o = state.games[opp];
          return g >= config.gamesPerSet && g - o >= 2;
        })();

    if (winsSet) {
      const setsAfter = setsWon[player] + 1;
      if (setsAfter >= config.setsToWin) anyMatchPoint = true;
      else anySetPoint = true;
    } else if (!state.isTiebreak && player !== state.server) {
      anyBreakPoint = true;
    }
  });

  if (anyMatchPoint) return 'match-point';
  if (anySetPoint) return 'set-point';
  if (anyBreakPoint) return 'break-point';
  return null;
}

export function undoLastPoint(state: MatchState): MatchState {
  if (state.history.length === 0) return state;
  const idx = state.history.length - 1;
  const previous = state.history[idx];
  // The stored snapshot has history stripped (see processPoint) — reattach everything that
  // came before it, which is simply the earlier portion of the current live history array.
  return { ...previous, history: state.history.slice(0, idx) };
}

const shotLabelKey: Partial<Record<ShotType, keyof typeof translations['en']>> = {
  ace: 'ace',
  winner: 'winnerShot',
  'return-winner': 'returnWinner',
  'unforced-error': 'unforcedError',
  'forced-error': 'forcedError',
  'double-fault': 'doubleFault',
  'return-error': 'returnError',
};

// Maps a shot type to the single MatchStats counter it bumps by 1. Shared between the
// team-level stats (always updated) and the individual per-partner stats (doubles only).
type CounterField = 'aces' | 'doubleFaults' | 'winners' | 'unforcedErrors' | 'forcedErrors' | 'returnWinners' | 'returnErrors';
const counterFieldForType: Partial<Record<ShotType, CounterField>> = {
  ace: 'aces',
  'double-fault': 'doubleFaults',
  winner: 'winners',
  'unforced-error': 'unforcedErrors',
  'forced-error': 'forcedErrors',
  'return-winner': 'returnWinners',
  'return-error': 'returnErrors',
};

export function processPoint(state: MatchState, action: PointAction, lang: Language): MatchState {
  if (state.winner || state.status !== 'active') return state;

  // IMPORTANT: the stored snapshot must NOT carry its own `history` field, otherwise every
  // snapshot embeds a full copy of every earlier snapshot (which embeds every one before that,
  // and so on), and the state doubles in size every single point — a match of even 20 points
  // would produce a >100MB state and hang JSON.stringify (used by "Download JSON" and by the
  // Firebase broadcast sync). undoLastPoint() below reattaches the correct history slice instead.
  const snapshot: MatchState = { ...state, history: [] };
  const t = translations[lang];

  // --- Determine the real actor and real point winner, resolving the fault/double-fault case ---
  const isErrorByActor = action.type === 'unforced-error' || action.type === 'forced-error' || action.type === 'return-error';
  const actorId: PlayerId = isErrorByActor ? opponentOf(action.winner) : action.winner;

  let type: ShotType = action.type;
  let pointWinner: PlayerId = action.winner;

  if (type === 'fault') {
    if (!state.isSecondServe) {
      // First-serve fault: no point is decided yet, just move to second serve.
      return { ...state, isSecondServe: true, history: [...state.history, snapshot] };
    }
    // Second fault in a row = double fault, the returner wins the point outright.
    type = 'double-fault';
    pointWinner = opponentOf(actorId);
  }

  const server = state.server;
  const returner = opponentOf(server);
  const wasSecondServe = state.isSecondServe;

  const p1Stats: MatchStats = { ...state.stats.p1 };
  const p2Stats: MatchStats = { ...state.stats.p2 };
  const statsFor = (id: PlayerId) => (id === 'p1' ? p1Stats : p2Stats);

  const serverStats = statsFor(server);
  const returnerStats = statsFor(returner);

  // --- Serve totals (every resolved point is either a 1st-serve or 2nd-serve point) ---
  serverStats.servicePointsTotal += 1;
  if (!wasSecondServe) serverStats.firstServesIn += 1;
  else serverStats.secondServePointsTotal += 1;

  // --- Shot-type specific counters (team-level, always) + per-partner counters (doubles only) ---
  let individualStats: IndividualStats | null = state.individualStats ? { ...state.individualStats } : null;
  const counterField = counterFieldForType[type];
  if (counterField) {
    statsFor(actorId)[counterField] += 1;
    if (individualStats && action.actorSlot) {
      const key = `${actorId}${action.actorSlot}` as IndividualStatsKey;
      individualStats = {
        ...individualStats,
        [key]: { ...individualStats[key], [counterField]: individualStats[key][counterField] + 1 },
      };
    }
  }

  // --- Break point detection (tracked only in regular games, not tiebreaks) ---
  if (!state.isTiebreak) {
    const noAd = state.config.advantage === 'no-ad';
    const rp = state.rawPoints[returner] + 1;
    const sp = state.rawPoints[server];
    const isBreakPointNow = noAd ? rp >= 4 && rp > sp : rp >= 4 && rp - sp >= 2;
    if (isBreakPointNow) {
      serverStats.breakPointsFaced += 1;
      returnerStats.breakPointsOpportunities += 1;
      if (pointWinner === returner) returnerStats.breakPointsWon += 1;
      else serverStats.breakPointsSaved += 1;
    }
  }

  // --- Service / return points won ---
  if (pointWinner === server) {
    serverStats.servicePointsWon += 1;
    if (!wasSecondServe) serverStats.firstServePointsWon += 1;
    else serverStats.secondServePointsWon += 1;
  } else {
    returnerStats.returnPointsWon += 1;
    if (!wasSecondServe) returnerStats.returnFirstServePointsWon += 1;
    else returnerStats.returnSecondServePointsWon += 1;
  }
  statsFor(pointWinner).totalPointsWon += 1;

  // --- Resolve the point into raw score / tiebreak score, then cascade game -> set -> match ---
  let rawPoints = { ...state.rawPoints };
  let tiebreakScore = { ...state.tiebreakScore };
  let games = { ...state.games };
  let sets: SetScore[] = state.sets.map((s) => ({ ...s }));
  let isTiebreak = state.isTiebreak;
  let server_ = state.server;

  const currentSetIndex = sets.length - 1;
  const isDeciderSet = currentSetIndex === state.config.totalSetsMode - 1;
  const isSuperTB =
    isTiebreak && isDeciderSet && state.config.finalSetType === 'super-tiebreak' && state.config.totalSetsMode > 1;

  let gameWon = false;
  let setWon = false;
  let matchWon = false;

  if (isTiebreak) {
    tiebreakScore = { ...tiebreakScore, [pointWinner]: tiebreakScore[pointWinner] + 1 };
    const target = isSuperTB ? 10 : 7;
    const w = tiebreakScore[pointWinner];
    const l = tiebreakScore[opponentOf(pointWinner)];
    gameWon = w >= target && w - l >= 2;

    // Tiebreak server rotation: first point continues the existing server, then alternates every 2 points.
    const totalTB = tiebreakScore.p1 + tiebreakScore.p2;
    server_ = totalTB % 2 === 1 ? opponentOf(server_) : server_;
  } else {
    rawPoints = { ...rawPoints, [pointWinner]: rawPoints[pointWinner] + 1 };
    const noAd = state.config.advantage === 'no-ad';
    const w = rawPoints[pointWinner];
    const l = rawPoints[opponentOf(pointWinner)];
    gameWon = noAd ? w >= 4 && w > l : w >= 4 && w - l >= 2;
  }

  if (gameWon) {
    if (isTiebreak) {
      setWon = true;
      if (isSuperTB) {
        sets[currentSetIndex] = { p1: tiebreakScore.p1, p2: tiebreakScore.p2, winner: pointWinner };
        games = { p1: sets[currentSetIndex].p1, p2: sets[currentSetIndex].p2 };
      } else {
        const winnerGames = games[pointWinner] + 1;
        const loserGames = games[opponentOf(pointWinner)];
        sets[currentSetIndex] = {
          p1: pointWinner === 'p1' ? winnerGames : loserGames,
          p2: pointWinner === 'p2' ? winnerGames : loserGames,
          tiebreakPoints: { ...tiebreakScore },
          winner: pointWinner,
        };
        games = { p1: sets[currentSetIndex].p1, p2: sets[currentSetIndex].p2 };
      }
    } else {
      games = { ...games, [pointWinner]: games[pointWinner] + 1 };
      sets[currentSetIndex] = { ...sets[currentSetIndex], p1: games.p1, p2: games.p2 };

      const w = games[pointWinner];
      const l = games[opponentOf(pointWinner)];
      if (w >= state.config.gamesPerSet && w - l >= 2) {
        setWon = true;
        sets[currentSetIndex] = { ...sets[currentSetIndex], winner: pointWinner };
      } else if (w === state.config.gamesPerSet && l === state.config.gamesPerSet) {
        // ASSUMPTION: tiebreak triggers when both players reach gamesPerSet-gamesPerSet (e.g. 6-6, or 4-4
        // for short sets). Some short-set formats (e.g. official "Fast4") trigger at 3-3 instead — adjust
        // this condition if that's what you want.
        isTiebreak = true;
        tiebreakScore = { p1: 0, p2: 0 };
      }
      // Server alternates after every completed game, including the one that starts a tiebreak.
      server_ = opponentOf(server_);
    }

    rawPoints = { p1: 0, p2: 0 };
  }

  if (setWon) {
    const setsWonNow = computeSetsWon(sets);
    if (setsWonNow[pointWinner] >= state.config.setsToWin) {
      matchWon = true;
    } else {
      const nextSetIndex = sets.length;
      const nextIsDecider = nextSetIndex === state.config.totalSetsMode - 1;
      const nextIsSuperTB = nextIsDecider && state.config.finalSetType === 'super-tiebreak' && state.config.totalSetsMode > 1;
      sets.push({ p1: 0, p2: 0 });
      games = { p1: 0, p2: 0 };
      isTiebreak = nextIsSuperTB;
      tiebreakScore = { p1: 0, p2: 0 };
      rawPoints = { p1: 0, p2: 0 };
    }
  }

  const noAdFinal = state.config.advantage === 'no-ad';
  const points = {
    p1: formatPoint(rawPoints.p1, rawPoints.p2, noAdFinal),
    p2: formatPoint(rawPoints.p2, rawPoints.p1, noAdFinal),
  };

  // --- Journal entry ---
  const shotKey = shotLabelKey[type];
  const actorDisplayName =
    state.teamPlayers && action.actorSlot
      ? state.teamPlayers[actorId][action.actorSlot === 'a' ? 0 : 1]
      : state.players[actorId];
  const description =
    type === 'normal'
      ? `${state.players[pointWinner]} — ${t.pointWonBy}`
      : `${actorDisplayName} — ${shotKey ? t[shotKey] : type}`;

  const scoreStr = isTiebreak && !gameWon ? `${tiebreakScore.p1}-${tiebreakScore.p2}` : `${points.p1}-${points.p2}`;
  const setScoreStr =
    sets
      .filter((s) => s.winner || s.p1 > 0 || s.p2 > 0)
      .map((s) => `${s.p1}-${s.p2}`)
      .join(', ') || '0-0';

  const journalEntry: JournalEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    description,
    score: scoreStr,
    winner: pointWinner,
    type,
    setScore: setScoreStr,
  };

  return {
    ...state,
    server: server_,
    isSecondServe: false,
    points,
    rawPoints,
    games,
    sets,
    isTiebreak,
    tiebreakScore,
    winner: matchWon ? pointWinner : null,
    status: matchWon ? 'finished' : state.status,
    stats: { p1: p1Stats, p2: p2Stats },
    individualStats,
    journal: [...state.journal, journalEntry],
    history: [...state.history, snapshot],
  };
}
