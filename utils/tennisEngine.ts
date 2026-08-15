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
  PointEvent,
  IndividualStatsKey,
  TeamSlot,
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
    firstServeAttempts: 0,
    firstServesIn: 0,
    firstServeFaults: 0,
    secondServesIn: 0,
    firstServePointsWon: 0,
    secondServePointsWon: 0,
    secondServePointsTotal: 0,
    servicePointsWon: 0,
    servicePointsTotal: 0,
    serviceGamesPlayed: 0,
    serviceGamesWon: 0,
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

export const CURRENT_STATE_VERSION = 3;

export function getInitialState(lang: Language): MatchState {
  return {
    stateVersion: CURRENT_STATE_VERSION,
    status: 'setup',
    config: defaultConfig,
    players: {
      p1: lang === 'ru' ? 'Игрок 1' : 'Player 1',
      p2: lang === 'ru' ? 'Игрок 2' : 'Player 2',
    },
    teamPlayers: null,
    server: 'p1',
    serverSlot: null,
    doublesServerSlots: { p1: null, p2: null },
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
    eventLog: [],
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

function normalizeStats(input: Partial<MatchStats> | undefined): MatchStats {
  return {
    ...emptyStats(),
    ...(input ?? {}),
    firstServeAttempts: input?.firstServeAttempts ?? input?.firstServesIn ?? 0,
    firstServeFaults: input?.firstServeFaults ?? Math.max(0, (input?.firstServeAttempts ?? input?.firstServesIn ?? 0) - (input?.firstServesIn ?? 0)),
    secondServesIn: input?.secondServesIn ?? Math.max(0, (input?.secondServePointsTotal ?? 0) - (input?.doubleFaults ?? 0)),
    serviceGamesPlayed: input?.serviceGamesPlayed ?? 0,
    serviceGamesWon: input?.serviceGamesWon ?? 0,
  };
}

function normalizeIndividualStats(input: IndividualStats | null | undefined): IndividualStats | null {
  if (!input) return null;
  return {
    p1a: normalizeStats(input.p1a),
    p1b: normalizeStats(input.p1b),
    p2a: normalizeStats(input.p2a),
    p2b: normalizeStats(input.p2b),
  };
}

export function migrateMatchState(input: MatchState): MatchState {
  const state = input as MatchState & { stateVersion?: number; eventLog?: PointEvent[]; serverSlot?: TeamSlot | null };
  const normalizedEvents = (state.eventLog ?? []).map((event) => ({
    ...event,
    language: event.language ?? 'en',
  }));
  return {
    ...state,
    stateVersion: CURRENT_STATE_VERSION,
    eventLog: normalizedEvents,
    serverSlot: state.serverSlot ?? null,
    doublesServerSlots: state.doublesServerSlots ?? { p1: null, p2: null },
    history: state.history ?? [],
    stats: { p1: normalizeStats(state.stats?.p1), p2: normalizeStats(state.stats?.p2) },
    individualStats: normalizeIndividualStats(state.individualStats),
  };
}

function createReplayBase(state: MatchState): MatchState {
  return {
    ...state,
    status: 'active',
    stateVersion: CURRENT_STATE_VERSION,
    server: state.config.initialServer ?? 'p1',
    serverSlot: null,
    doublesServerSlots: { p1: null, p2: null },
    isSecondServe: false,
    points: { p1: '0', p2: '0' },
    rawPoints: { p1: 0, p2: 0 },
    games: { p1: 0, p2: 0 },
    sets: [{ p1: 0, p2: 0 }],
    isTiebreak: false,
    tiebreakScore: { p1: 0, p2: 0 },
    winner: null,
    history: [],
    eventLog: [],
    journal: [],
    stats: { p1: emptyStats(), p2: emptyStats() },
    individualStats: state.individualStats ? createIndividualStats() : null,
  };
}

export function undoLastPoint(state: MatchState): MatchState {
  const current = migrateMatchState(state);
  if (current.eventLog.length > 0) {
    const remaining = current.eventLog.slice(0, -1);
    let replayed = createReplayBase(current);
    for (const event of remaining) {
      replayed = processPointInternal(replayed, event.action, event.language, false);
    }
    return { ...replayed, eventLog: remaining, broadcastId: current.broadcastId, startTime: current.startTime };
  }

  // Backward-compatible undo for a v1 state that was loaded before migration.
  if (current.history.length > 0) {
    const idx = current.history.length - 1;
    const previous = current.history[idx];
    return { ...previous, stateVersion: CURRENT_STATE_VERSION, eventLog: [], history: current.history.slice(0, idx), serverSlot: previous.serverSlot ?? null, doublesServerSlots: previous.doublesServerSlots ?? { p1: null, p2: null } };
  }
  return current;
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

function makePointEvent(action: PointAction, language: Language): PointEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    action: { ...action },
    language,
  };
}

export function selectDoublesServer(state: MatchState, slot: TeamSlot): MatchState {
  if (state.config.matchType !== 'doubles' || state.status !== 'active' || state.winner) return state;
  return {
    ...state,
    serverSlot: slot,
    doublesServerSlots: { ...state.doublesServerSlots, [state.server]: slot },
  };
}

export function processPoint(state: MatchState, action: PointAction, lang: Language): MatchState {
  return processPointInternal(migrateMatchState(state), action, lang, true);
}

function processPointInternal(state: MatchState, action: PointAction, lang: Language, recordEvent = true): MatchState {
  if (state.winner || state.status !== 'active') return state;

  // IMPORTANT: the stored snapshot must NOT carry its own `history` field, otherwise every
  // snapshot embeds a full copy of every earlier snapshot (which embeds every one before that,
  // and so on), and the state doubles in size every single point — a match of even 20 points
  // would produce a >100MB state and hang JSON.stringify (used by "Download JSON" and by the
  // Firebase broadcast sync). undoLastPoint() below reattaches the correct history slice instead.
  const currentState = migrateMatchState(state);
  state = currentState;
  const t = translations[lang];

  // --- Resolve serving side / partner before recording the point ---
  const server = state.server;
  const returner = opponentOf(server);
  const wasSecondServe = state.isSecondServe;

  // In doubles the first serving partner of a team is chosen once per set.
  // All subsequent service points use the stored serverSlot automatically.
  if (state.config.matchType === 'doubles' && !state.serverSlot) {
    const selectedSlot = action.actorSlot;
    if (!selectedSlot) return state;
    state = {
      ...state,
      serverSlot: selectedSlot,
      doublesServerSlots: { ...state.doublesServerSlots, [server]: selectedSlot },
    };
  }

  // --- Determine the real actor and real point winner, resolving the fault/double-fault case ---
  const isErrorByActor = action.type === 'unforced-error' || action.type === 'forced-error' || action.type === 'return-error';
  const actorId: PlayerId = (action.type === 'ace' || action.type === 'fault' || action.type === 'double-fault')
    ? server
    : (isErrorByActor ? opponentOf(action.winner) : action.winner);

  let type: ShotType = action.type;
  let pointWinner: PlayerId = action.winner;

  if (type === 'fault') {
    if (!state.isSecondServe) {
      // First-serve fault: it is an attempted first serve, but not a service point.
      // Keep the event in the log while moving to the second serve.
      const nextStats = { p1: { ...state.stats.p1 }, p2: { ...state.stats.p2 } };
      nextStats[server].firstServeAttempts += 1;
      nextStats[server].firstServeFaults += 1;
      let nextIndividual = state.individualStats ? { ...state.individualStats } : null;
      const key = state.config.matchType === 'doubles' && state.serverSlot ? `${server}${state.serverSlot}` as IndividualStatsKey : null;
      if (nextIndividual && key) nextIndividual = { ...nextIndividual, [key]: { ...nextIndividual[key], firstServeAttempts: nextIndividual[key].firstServeAttempts + 1, firstServeFaults: nextIndividual[key].firstServeFaults + 1 } };
      return {
        ...state,
        stats: nextStats,
        individualStats: nextIndividual,
        isSecondServe: true,
        eventLog: recordEvent
          ? [...state.eventLog, makePointEvent({ ...action, actorSlot: state.config.matchType === 'doubles' ? state.serverSlot ?? action.actorSlot : action.actorSlot }, lang)]
          : state.eventLog,
      };
    }
    // Second fault in a row = double fault, the returner wins the point outright.
    type = 'double-fault';
    pointWinner = opponentOf(actorId);
  }

  const p1Stats: MatchStats = { ...state.stats.p1 };
  const p2Stats: MatchStats = { ...state.stats.p2 };
  const statsFor = (id: PlayerId) => (id === 'p1' ? p1Stats : p2Stats);

  const serverStats = statsFor(server);
  const returnerStats = statsFor(returner);
  const resolvedActorSlot = state.config.matchType === 'doubles' && actorId === server ? state.serverSlot ?? undefined : action.actorSlot;
  const resolvedAction: PointAction = resolvedActorSlot ? { ...action, actorSlot: resolvedActorSlot } : { ...action };
  let individualStats: IndividualStats | null = state.individualStats ? { ...state.individualStats } : null;
  const serverIndividualKey = state.config.matchType === 'doubles' && state.serverSlot
    ? `${server}${state.serverSlot}` as IndividualStatsKey
    : null;
  const returnerIndividualKey = state.config.matchType === 'doubles' && action.actorSlot && actorId === returner
    ? `${returner}${action.actorSlot}` as IndividualStatsKey
    : null;
  if (individualStats && serverIndividualKey) individualStats = { ...individualStats, [serverIndividualKey]: { ...individualStats[serverIndividualKey] } };
  if (individualStats && returnerIndividualKey && returnerIndividualKey !== serverIndividualKey) individualStats = { ...individualStats, [returnerIndividualKey]: { ...individualStats[returnerIndividualKey] } };
  const serverIndividual = individualStats && serverIndividualKey ? individualStats[serverIndividualKey] : null;
  const returnerIndividual = individualStats && returnerIndividualKey ? individualStats[returnerIndividualKey] : null;

  // --- Serve totals ---
  // A first-serve percentage must use ALL first-serve attempts as its denominator,
  // including first-serve faults. servicePointsTotal counts resolved points only.
  if (!wasSecondServe) {
    serverStats.firstServeAttempts += 1;
    serverStats.firstServesIn += 1;
    if (serverIndividual) {
      serverIndividual.firstServeAttempts += 1;
      serverIndividual.firstServesIn += 1;
    }
  } else {
    serverStats.secondServePointsTotal += 1;
    if (type !== 'double-fault') {
      serverStats.secondServesIn += 1;
    }
    if (serverIndividual) {
      serverIndividual.secondServePointsTotal += 1;
      if (type !== 'double-fault') serverIndividual.secondServesIn += 1;
    }
  }

  // --- Serve totals (every resolved point is a service point) ---
  serverStats.servicePointsTotal += 1;
  if (serverIndividual) serverIndividual.servicePointsTotal += 1;

  // --- Shot-type specific counters (team-level, always) + per-partner counters (doubles only) ---
  const counterField = counterFieldForType[type];
  if (counterField) {
    statsFor(actorId)[counterField] += 1;
    if (individualStats && resolvedActorSlot) {
      const key = `${actorId}${resolvedActorSlot}` as IndividualStatsKey;
      individualStats = {
        ...individualStats,
        [key]: { ...individualStats[key], [counterField]: individualStats[key][counterField] + 1 },
      };
    }
  }

  const currentServerIndividual = individualStats && serverIndividualKey ? individualStats[serverIndividualKey] : null;
  const currentReturnerIndividual = individualStats && returnerIndividualKey ? individualStats[returnerIndividualKey] : null;

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
    if (currentServerIndividual) {
      currentServerIndividual.servicePointsWon += 1;
      if (!wasSecondServe) currentServerIndividual.firstServePointsWon += 1;
      else currentServerIndividual.secondServePointsWon += 1;
      currentServerIndividual.totalPointsWon += 1;
    }
  } else {
    returnerStats.returnPointsWon += 1;
    if (!wasSecondServe) returnerStats.returnFirstServePointsWon += 1;
    else returnerStats.returnSecondServePointsWon += 1;
    if (currentReturnerIndividual) {
      currentReturnerIndividual.returnPointsWon += 1;
      if (!wasSecondServe) currentReturnerIndividual.returnFirstServePointsWon += 1;
      else currentReturnerIndividual.returnSecondServePointsWon += 1;
      currentReturnerIndividual.totalPointsWon += 1;
    }
  }
  statsFor(pointWinner).totalPointsWon += 1;

  // --- Resolve the point into raw score / tiebreak score, then cascade game -> set -> match ---
  let rawPoints = { ...state.rawPoints };
  let tiebreakScore = { ...state.tiebreakScore };
  let games = { ...state.games };
  let sets: SetScore[] = state.sets.map((s) => ({ ...s }));
  let isTiebreak = state.isTiebreak;
  let server_ = state.server;
  let serverSlot_ = state.serverSlot;
  let doublesServerSlots_ = { ...state.doublesServerSlots };

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

    // Tiebreak server rotation: first point is served by the player who started the
    // tiebreak; thereafter the other side serves two points, alternating every two.
    const totalTB = tiebreakScore.p1 + tiebreakScore.p2;
    if (totalTB === 1) {
      server_ = opponentOf(server_);
      if (state.config.matchType === 'doubles') serverSlot_ = doublesServerSlots_[server_] ?? null;
    } else if (totalTB % 2 === 1) {
      server_ = opponentOf(server_);
      if (state.config.matchType === 'doubles') {
        const firstSlot = doublesServerSlots_[server_];
        serverSlot_ = firstSlot ? (firstSlot === 'a' ? 'b' : 'a') : null;
        if (firstSlot) doublesServerSlots_[server_] = serverSlot_;
      }
    }
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
        sets[currentSetIndex] = { p1: tiebreakScore.p1, p2: tiebreakScore.p2, type: 'super-tiebreak', winner: pointWinner };
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
      // Record completed service-game efficiency for the team and, when known, the
      // individual server. Tiebreaks are not service games.
      serverStats.serviceGamesPlayed += 1;
      if (pointWinner === server) serverStats.serviceGamesWon += 1;
      if (currentServerIndividual) {
        currentServerIndividual.serviceGamesPlayed += 1;
        if (pointWinner === server) currentServerIndividual.serviceGamesWon += 1;
      }

      // Server alternates after every completed game. In doubles, the first
      // serving partner is chosen once per team per set; that team then alternates
      // partners on each later service game. At a new set the choices are reset.
      server_ = opponentOf(server_);
      if (state.config.matchType === 'doubles') {
        const firstSlot = doublesServerSlots_[server_];
        serverSlot_ = firstSlot ? (firstSlot === 'a' ? 'b' : 'a') : null;
        if (firstSlot) doublesServerSlots_[server_] = serverSlot_;
      }
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
      if (state.config.matchType === 'doubles') {
        doublesServerSlots_ = { p1: null, p2: null };
        serverSlot_ = null;
      }
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
  // The journal carries the full set scoreboard, including a newly started 0-0 set.
  const setScoreStr = sets.map((s) => `${s.p1}-${s.p2}`).join(', ') || '0-0';

  const gameScore = gameWon && !isSuperTB ? `${games.p1}-${games.p2}` : undefined;
  const journalEntry: JournalEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    description,
    score: scoreStr,
    winner: pointWinner,
    type,
    setScore: setScoreStr,
    ...(gameScore ? { gameScore } : {}),
  };

  return {
    ...state,
    server: server_,
    serverSlot: serverSlot_,
    doublesServerSlots: doublesServerSlots_,
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
    eventLog: recordEvent ? [...state.eventLog, makePointEvent(resolvedAction, lang)] : state.eventLog,
    history: state.history,
  };
}
