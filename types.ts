
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
  firstServesIn: number;
  firstServePointsWon: number;
  secondServePointsWon: number;
  secondServePointsTotal: number;
  servicePointsWon: number;
  servicePointsTotal: number;
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
}

export interface MatchState {
  status: 'setup' | 'active' | 'finished';
  config: MatchConfig;
  players: { p1: string; p2: string };
  teamPlayers: TeamPlayers | null;
  server: PlayerId;
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
  history: MatchState[]; 
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
