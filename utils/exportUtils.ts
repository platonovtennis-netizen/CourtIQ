import { MatchState, Language } from '../types';
import { translations } from './translations';

export const generateMatchSummary = (state: MatchState, lang: Language): string => {
    const t = translations[lang];
    const { players, sets, winner, stats } = state;
    
    // Header
    let text = `${t.setupTitle} - ${t.matchFinished}\n`;
    text += `${players.p1} vs ${players.p2}\n`;
    text += `${winner ? players[winner] + ' ' + t.winner : ''}\n\n`;
    
    // Score
    text += `${t.sets}: `;
    state.sets.forEach((set, idx) => {
        if (idx >= state.sets.length && !set.winner && set.p1 === 0 && set.p2 === 0) return;
        text += `${set.p1}-${set.p2} `;
    });
    text += `\n\n`;

    // Key Stats
    text += `--- ${t.stats} ---\n`;
    text += `${t.aces}: ${stats.p1.aces} - ${stats.p2.aces}\n`;
    text += `${t.doubleFaults}: ${stats.p1.doubleFaults} - ${stats.p2.doubleFaults}\n`;
    text += `${t.winners}: ${stats.p1.winners} - ${stats.p2.winners}\n`;
    text += `${t.unforcedErrors}: ${stats.p1.unforcedErrors} - ${stats.p2.unforcedErrors}\n`;
    text += `${t.totalPoints}: ${stats.p1.totalPointsWon} - ${stats.p2.totalPointsWon}\n`;
    
    return text;
};

export const downloadMatchJson = (state: MatchState) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchorNode.setAttribute("download", `tennis-match-${dateStr}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};
