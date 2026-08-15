
export type PlayerId = 'p1' | 'p2';

export type Language = 'en' | 'ru';

export interface Player {
  id: PlayerId;
  name: string;
}

export type PointScore = '0' | '15' | '30' | '40' | 'Ad';

export interface SetScore {
  p1: number;
  p2: number;
  type?: 'standard' | 'super-tiebreak';
  tiebreakPoints?: { p1: number; p2: number };
  winner?: PlayerId;
}

export type MatchMode = 'simple' | 'advanced';

export type MatchType = 'singles' | 'doubles';

// Which of the two partners on a team performed a given shot (doubles only).
export type TeamSlot = 'a' | 'b';

export interface MatchConfig {
  setsToWin: 1 | 2 | 3;
  totalSetsMode: 1 | 3 | 5;
  gamesPerSet: 4 | 6;
  advantage: 'standard' | 'no-ad';
  finalSetType: 'standard' | 'super-tiebreak';
  initialServer?: PlayerId; 
  matchType: MatchType;
}

// Doubles partner names per side, e.g. teamPlayers.p1 = ['Ivan', 'Petr'].
export interface TeamPlayers {
  p1: [string, string];
  p2: [string, string];
}

export interface MatchStats {
  aces: number;
  doubleFaults: number;
  winners: number;
  returnWinners: number;
  returnErrors: number;
  unforcedErrors: number;
  forcedErrors: number;
  firstServeAttempts: number;
  firstServesIn: number;
  firstServeFaults: number;
  secondServesIn: number;
  firstServePointsWon: number;
  secondServePointsWon: number;
  secondServePointsTotal: number;
  servicePointsWon: number;
  servicePointsTotal: number;
  serviceGamesPlayed: number;
  serviceGamesWon: number;
  returnPointsWon: number;
  returnFirstServePointsWon: number;
  returnSecondServePointsWon: number;
  totalPointsWon: number;
  breakPointsWon: number;
  breakPointsOpportunities: number;
  breakPointsSaved: number;
  breakPointsFaced: number;
}

export interface PlayerStats {
  p1: MatchStats;
  p2: MatchStats;
}

// Per-partner breakdown of shot-type counters (doubles only). Keys are `${side}${slot}`.
export interface IndividualStats {
  p1a: MatchStats;
  p1b: MatchStats;
  p2a: MatchStats;
  p2b: MatchStats;
}

export type IndividualStatsKey = keyof IndividualStats;

export interface JournalEntry {
  id: string;
  timestamp: number;
  description: string;
  score: string; 
  winner: PlayerId | 'none';
  type: ShotType;
  setScore: string;
  /** Completed game score, e.g. 1-0. Present only on the point that closes a game. */
  gameScore?: string;
}

export interface PointEvent {
  id: string;
  timestamp: number;
  action: PointAction;
  language: Language;
}

export interface MatchState {
  /** Persisted schema version. Increment when MatchState changes incompatibly. */
  stateVersion: number;
  status: 'setup' | 'active' | 'finished';
  config: MatchConfig;
  players: { p1: string; p2: string };
  teamPlayers: TeamPlayers | null;
  server: PlayerId;
  /** Current serving partner in doubles. Ignored for singles. */
  serverSlot: TeamSlot | null;
  /** First serving partner chosen by each team for the current set. */
  doublesServerSlots: { p1: TeamSlot | null; p2: TeamSlot | null };
  isSecondServe: boolean; 
  broadcastId: string | null; 
  startTime: number | null;
  
  points: { p1: PointScore; p2: PointScore }; 
  rawPoints: { p1: number; p2: number }; 
  games: { p1: number; p2: number }; 
  sets: SetScore[]; 
  
  isTiebreak: boolean;
  tiebreakScore: { p1: number; p2: number };
  
  winner: PlayerId | null;
  /** Deprecated snapshot history. Kept only for migration of pre-v2 saved matches. */
  history: MatchState[];
  /** Compact event log used for replay/undo. New matches never store snapshots here. */
  eventLog: PointEvent[];
  journal: JournalEntry[];
  
  stats: PlayerStats;
  individualStats: IndividualStats | null;
}

export type ShotType = 
  | 'ace' 
  | 'winner' 
  | 'return-winner'
  | 'unforced-error' 
  | 'forced-error' 
  | 'double-fault'
  | 'fault' 
  | 'return-error'
  | 'normal';

export interface PointAction {
  winner: PlayerId;
  type: ShotType;
  // Which partner on the acting side hit the shot. Only used/meaningful in doubles matches.
  actorSlot?: TeamSlot;
}
