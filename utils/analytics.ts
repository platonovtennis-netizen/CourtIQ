import { MatchStats } from '../types';

export const pct = (num: number, den: number): number => den ? Math.round((num / den) * 100) : 0;
export const ratePer100 = (num: number, den: number): number => den ? Math.round((num / den) * 10000) / 100 : 0;

export interface ServeAnalytics {
  firstServeIn: number;
  firstServeFaults: number;
  firstServePointsWon: number;
  secondServeIn: number;
  secondServePointsWon: number;
  servicePointsWon: number;
  hold: number;
  acesPer100: number;
  doubleFaultRate: number;
  breakPointsSaved: number;
  serviceGames: number;
  serviceGamesWon: number;
}

export function getServeAnalytics(s: MatchStats): ServeAnalytics {
  return {
    firstServeIn: pct(s.firstServesIn, s.firstServeAttempts),
    firstServeFaults: s.firstServeFaults,
    firstServePointsWon: pct(s.firstServePointsWon, s.firstServesIn),
    secondServeIn: pct(s.secondServesIn, s.secondServePointsTotal),
    secondServePointsWon: pct(s.secondServePointsWon, s.secondServePointsTotal),
    servicePointsWon: pct(s.servicePointsWon, s.servicePointsTotal),
    hold: pct(s.serviceGamesWon, s.serviceGamesPlayed),
    acesPer100: ratePer100(s.aces, s.servicePointsTotal),
    doubleFaultRate: pct(s.doubleFaults, s.servicePointsTotal),
    breakPointsSaved: pct(s.breakPointsSaved, s.breakPointsFaced),
    serviceGames: s.serviceGamesPlayed,
    serviceGamesWon: s.serviceGamesWon,
  };
}

export function getReturnAnalytics(s: MatchStats, opponentServe: MatchStats) {
  return {
    pointsWon: pct(s.returnPointsWon, opponentServe.servicePointsTotal),
    vsFirstServe: pct(s.returnFirstServePointsWon, opponentServe.firstServesIn),
    vsSecondServe: pct(s.returnSecondServePointsWon, opponentServe.secondServePointsTotal),
    breakConversion: pct(s.breakPointsWon, s.breakPointsOpportunities),
  };
}
