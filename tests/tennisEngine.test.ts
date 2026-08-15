import { MatchConfig, MatchState, PointAction } from '../types';
import { getInitialState, processPoint, undoLastPoint, selectDoublesServer } from '../utils/tennisEngine';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function activeState(config: MatchConfig, doubles = false): MatchState {
  const state = getInitialState('en');
  return {
    ...state,
    status: 'active',
    config,
    teamPlayers: doubles ? { p1: ['A1', 'A2'], p2: ['B1', 'B2'] } : null,
    individualStats: doubles ? {
      p1a: { ...state.stats.p1 }, p1b: { ...state.stats.p1 },
      p2a: { ...state.stats.p2 }, p2b: { ...state.stats.p2 },
    } : null,
  };
}

const normal = (winner: 'p1' | 'p2'): PointAction => ({ winner, type: 'normal' });

function winGame(state: MatchState, winner: 'p1' | 'p2'): MatchState {
  for (let i = 0; i < 4; i++) state = processPoint(state, normal(winner), 'en');
  return state;
}

function winSet6Love(state: MatchState, winner: 'p1' | 'p2'): MatchState {
  for (let i = 0; i < 6; i++) state = winGame(state, winner);
  return state;
}

const standardConfig: MatchConfig = {
  setsToWin: 1, totalSetsMode: 1, gamesPerSet: 6, advantage: 'standard',
  finalSetType: 'standard', initialServer: 'p1', matchType: 'singles',
};

let state = activeState(standardConfig);
state = processPoint(state, normal('p1'), 'en');
assert(state.eventLog.length === 1, 'A resolved point must create one event');
assert(state.history.length === 0, 'New event-log matches must not grow snapshot history');
assert(state.stats.p1.servicePointsTotal === 1, 'P1 service total should increment');
assert(state.stats.p1.firstServesIn === 1, 'P1 first serves in should increment');
assert(state.stats.p1.firstServeAttempts === 1, 'P1 first serve attempts should increment');

let faultState = activeState(standardConfig);
faultState = processPoint(faultState, { winner: 'p1', type: 'fault' }, 'en');
assert(faultState.isSecondServe, 'First-serve fault should move to second serve');
assert(faultState.stats.p1.firstServeAttempts === 1 && faultState.stats.p1.firstServesIn === 0, 'First-serve fault must count as an attempt but not a made first serve');
faultState = processPoint(faultState, normal('p1'), 'en');
assert(faultState.stats.p1.servicePointsTotal === 1 && faultState.stats.p1.secondServePointsTotal === 1, 'Second-serve point must count once as a service point');

assert(faultState.stats.p1.servicePointsWon + faultState.stats.p2.returnPointsWon === faultState.stats.p1.servicePointsTotal, 'Service/return point accounting must reconcile');
assert(faultState.stats.p1.totalPointsWon + faultState.stats.p2.totalPointsWon === 1, 'Total point winners must reconcile to resolved points');

let undoState = activeState(standardConfig);
undoState = winGame(undoState, 'p1');
assert(undoState.games.p1 === 1 && undoState.games.p2 === 0, 'P1 should win a game');
assert(undoState.server === 'p2', 'Server should change after a game');
assert(undoState.stats.p1.serviceGamesPlayed === 1 && undoState.stats.p1.serviceGamesWon === 1, 'Service game win must be tracked');

const undone = undoLastPoint(undoState);
assert(undone.games.p1 === 0 && undone.games.p2 === 0 && undone.rawPoints.p1 === 3, 'Undo must replay to the previous point score');
assert(undone.eventLog.length === 3, 'Undo must remove exactly the last event');
assert(undone.history.length === 0, 'Undo must not restore snapshot history');

// Tiebreak: 6-6 followed by a 7-5 tiebreak.
let tb = activeState(standardConfig);
for (let i = 0; i < 6; i++) { tb = winGame(tb, 'p1'); tb = winGame(tb, 'p2'); }
assert(tb.isTiebreak, '6-6 must enter a tiebreak');
for (let i = 0; i < 5; i++) { tb = processPoint(tb, normal('p1'), 'en'); tb = processPoint(tb, normal('p2'), 'en'); }
tb = processPoint(tb, normal('p1'), 'en');
tb = processPoint(tb, normal('p1'), 'en');
assert(tb.winner === 'p1', 'P1 should win the match after a 7-5 tiebreak');
assert(tb.sets[0].tiebreakPoints?.p1 === 7 && tb.sets[0].tiebreakPoints?.p2 === 5, 'Tiebreak score must be stored separately');

// Super-tiebreak: a 1-set lead in best-of-3 must create a separate deciding super-tiebreak.
const superConfig: MatchConfig = { ...standardConfig, setsToWin: 2, totalSetsMode: 3, finalSetType: 'super-tiebreak' };
let st = activeState(superConfig);
st = winSet6Love(st, 'p1');
st = winSet6Love(st, 'p2');
assert(st.sets.length === 3 && st.isTiebreak, 'After a 1-1 split in best-of-3, the deciding super-tiebreak should start');
for (let i = 0; i < 8; i++) { st = processPoint(st, normal('p1'), 'en'); st = processPoint(st, normal('p2'), 'en'); }
st = processPoint(st, normal('p1'), 'en');
st = processPoint(st, normal('p1'), 'en');
assert(st.winner === 'p1', 'P1 should win a 10-8 super-tiebreak');
assert(st.sets[2].p1 === 10 && st.sets[2].p2 === 8, 'Super-tiebreak score must be stored as the deciding set score');
assert(st.sets[2].type === 'super-tiebreak' && !st.sets[2].tiebreakPoints, 'Super-tiebreak must be explicitly typed and not represented as a regular-set tiebreak');

// Doubles serving rotation: each team alternates its serving partner between its service games.
const doublesConfig: MatchConfig = { ...standardConfig, matchType: 'doubles' };
let d = activeState(doublesConfig, true);
assert(d.server === 'p1' && d.serverSlot === null, 'Doubles match should wait for the first serving partner selection');
d = selectDoublesServer(d, 'a');
assert(d.serverSlot === 'a' && d.doublesServerSlots.p1 === 'a', 'P1 partner A should be selected as the first server of the set');
d = winGame(d, 'p1');
assert(d.server === 'p2' && d.serverSlot === null, 'P2 must choose its first serving partner when its first service game begins');
d = selectDoublesServer(d, 'b');
d = winGame(d, 'p2');
assert(d.server === 'p1' && d.serverSlot === 'b', 'P1 partner B should serve the next P1 service game automatically');
d = winGame(d, 'p1');
assert(d.server === 'p2' && d.serverSlot === 'a', 'P2 partner A should serve the next P2 service game automatically');
assert(d.individualStats?.p1a.serviceGamesPlayed === 1 && d.individualStats?.p1a.serviceGamesWon === 1, 'P1 partner A service game should be tracked individually');
assert(d.individualStats?.p1b.serviceGamesPlayed === 1 && d.individualStats?.p1b.serviceGamesWon === 1, 'P1 partner B service game should be tracked individually');


// At a new set the serving order is cleared so the new set can use a new partner order.
let setReset = activeState({ ...doublesConfig, setsToWin: 2, totalSetsMode: 3 }, true);
for (let i = 0; i < 6; i++) {
  if (!setReset.serverSlot) setReset = selectDoublesServer(setReset, i % 2 === 0 ? 'a' : 'b');
  setReset = winGame(setReset, 'p1');
}
assert(setReset.server === 'p1' && setReset.serverSlot === null, 'The next set should wait for the new serving partner selection');
assert(setReset.doublesServerSlots.p1 === null && setReset.doublesServerSlots.p2 === null, 'Doubles serving order must reset at the start of every set');

// Doubles serving partner must be recorded automatically for serve events and never prompt per ace/fault.
let serveEvent = activeState(doublesConfig, true);
serveEvent = selectDoublesServer(serveEvent, 'b');
serveEvent = processPoint(serveEvent, { winner: 'p1', type: 'ace' }, 'en');
assert(serveEvent.stats.p1.aces === 1, 'Ace must count for the serving team');
assert(serveEvent.individualStats?.p1b.aces === 1, 'Ace must be attributed to the selected serving partner');
assert(serveEvent.individualStats?.p1b.servicePointsTotal === 1 && serveEvent.individualStats?.p1b.servicePointsWon === 1, 'Serve point must be attributed to the selected doubles server');
assert(serveEvent.eventLog[0].action.actorSlot === 'b', 'Serve event must persist the serving partner for replay');

// A completed game must keep the visible game score in the journal instead of only resetting point score to 0-0.
let journalState = activeState(standardConfig);
journalState = winGame(journalState, 'p1');
assert(journalState.journal[journalState.journal.length - 1]?.score === '0-0', 'Completed game point score should reset to 0-0');
assert(journalState.journal[journalState.journal.length - 1]?.gameScore === '1-0', 'Completed game journal entry must expose the game score');
assert(journalState.journal[journalState.journal.length - 1]?.setScore === '1-0', 'Completed game journal entry must expose the current set scoreboard');

let secondSetJournal = activeState({ ...standardConfig, setsToWin: 2, totalSetsMode: 3 });
secondSetJournal = winSet6Love(secondSetJournal, 'p1');
secondSetJournal = processPoint(secondSetJournal, normal('p1'), 'en');
assert(secondSetJournal.journal[secondSetJournal.journal.length - 1]?.setScore === '6-0, 0-0', 'Journal must show both set scores when the second set starts');

// Schema version must be present and current on every new state.
assert(state.stateVersion === 3, 'New states must carry stateVersion=3');

console.log('All Court IQ tennis engine tests passed.');
