
import React, { useState } from 'react';
import { MatchState, Language, PlayerId } from '../types';
import { getPointStatus } from '../utils/tennisEngine';
import { translations } from '../utils/translations';
import { Globe, Radio, Eye, Trophy } from 'lucide-react';

interface ScoreboardProps {
  state: MatchState;
  lang: Language;
  onToggleLang: () => void;
  onBroadcast?: (id: string) => void;
  readOnly?: boolean;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ state, lang, onToggleLang, onBroadcast, readOnly }) => {
  const { players, teamPlayers, sets, games, points, server, serverSlot, isTiebreak, tiebreakScore, winner, isSecondServe, broadcastId, config } = state;
  const t = translations[lang];
  const [showCopied, setShowCopied] = useState(false);

  const getPoints = (player: 'p1' | 'p2') => {
    if (winner) return '-';
    if (isTiebreak) return tiebreakScore[player];
    return points[player];
  };

  const status = getPointStatus(state);
  const getStatusText = () => {
      if (status === 'match-point') return t.matchPoint;
      if (status === 'set-point') return t.setPoint;
      if (status === 'break-point') return t.breakPoint;
      return '';
  };
  // Break point is a danger moment for the server, so it earns the clay (danger) accent;
  // match/set point is an opportunity to close it out, so it stays tennis-green (positive).
  const statusColorClass = status === 'break-point' ? 'text-clay-light' : 'text-tennis-green';

  const handleBroadcastClick = async () => {
      if (readOnly) return; // Viewers cannot start a broadcast

      const currentId = broadcastId || Math.random().toString(36).substring(2, 9);
      
      if (!broadcastId && onBroadcast) {
          onBroadcast(currentId);
      }

      // Changed to query parameter for simpler static hosting support
      const link = `${window.location.origin}${window.location.pathname}?live=${currentId}`;

      try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(link);
          } else {
              console.warn('Clipboard API unavailable');
          }
          setShowCopied(true);
      } catch (err) {
          console.error('Copy error:', err);
          setShowCopied(true);
      }
      
      setTimeout(() => setShowCopied(false), 2000);
  };

  const ScoreRow = ({ id }: { id: PlayerId }) => {
    const isServing = server === id && !winner;
    const isWinner = winner === id;
    return (
      <div className={`flex items-center gap-2 sm:gap-3 py-1.5 px-2 -mx-2 rounded-xl transition-colors ${isServing ? 'bg-white/[0.04]' : ''}`}>
        <span
          aria-hidden="true"
          className={`w-2 h-2 rounded-full shrink-0 transition-all ${isServing ? 'bg-tennis-green shadow-[0_0_8px_#ccff00]' : 'bg-transparent'}`}
        />
        <span className={`font-display font-semibold text-[15px] sm:text-lg truncate flex-1 min-w-0 flex items-center gap-1.5 ${isWinner ? 'text-tennis-green' : isServing ? 'text-white' : 'text-slate-300'}`}>
          <span className="truncate">{players[id]}</span>
          {config.matchType === 'doubles' && teamPlayers && server === id && !winner && serverSlot && (
            <span className="text-[10px] text-tennis-green font-medium shrink-0">· {teamPlayers[id][serverSlot === 'a' ? 0 : 1]}</span>
          )}
          {isWinner && <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 fill-current" />}
        </span>

        {/* Completed sets, small and muted */}
        <div className="flex gap-1.5 shrink-0">
          {[0, 1, 2, 3, 4].slice(0, state.config.totalSetsMode).map((idx) => {
            if (idx >= sets.length - 1) return null; // only finished sets
            const s = sets[idx];
            const won = id === 'p1' ? s.p1 > s.p2 : s.p2 > s.p1;
            return (
              <span key={idx} className={`font-mono text-xs sm:text-sm w-4 text-center tabular-nums ${won ? 'text-white font-bold' : 'text-slate-500'}`}>
                {id === 'p1' ? s.p1 : s.p2}
              </span>
            );
          })}
        </div>

        {/* Current set games */}
        <span className="font-mono text-lg sm:text-xl font-bold w-6 text-center tabular-nums text-slate-100 shrink-0 border-l border-white/10 pl-2 sm:pl-3">
          {id === 'p1' ? games.p1 : games.p2}
        </span>

        {/* Current point, highlighted */}
        <span
          className={`font-mono text-xl sm:text-2xl font-black w-10 sm:w-12 text-center tabular-nums rounded-lg py-0.5 shrink-0 ${
            isTiebreak ? 'text-clay-light bg-clay/10' : 'text-tennis-green bg-tennis-green/10'
          }`}
        >
          {getPoints(id)}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur border-b border-white/10 shadow-xl sticky top-0 z-20 safe-top">
      <div className="max-w-3xl mx-auto px-3 sm:px-4">

        {/* Top strip: broadcast + language */}
        <div className="flex items-center justify-end gap-2 pt-2 pb-1">
            <button 
                onClick={handleBroadcastClick}
                disabled={readOnly}
                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ${
                    readOnly 
                    ? 'bg-clay/15 text-clay-light border border-clay/40 cursor-default'
                    : broadcastId 
                        ? 'bg-clay/15 text-clay-light animate-pulse border border-clay/40' 
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
            >
                {readOnly ? (
                    <>
                      <Eye className="w-3 h-3 animate-pulse" />
                      {t.live} VIEW
                    </>
                ) : broadcastId ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-clay-light"></div>
                      {showCopied ? t.linkCopied : t.live}
                    </>
                ) : (
                    <>
                       <Radio className="w-3 h-3" />
                       {t.broadcast}
                    </>
                )}
            </button>

            <button 
                onClick={onToggleLang}
                className="text-slate-500 hover:text-white flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 px-2.5 py-1 rounded-full"
            >
                <Globe className="w-3 h-3" />
                {lang === 'en' ? 'RU' : 'EN'}
            </button>
        </div>

        {/* Score rows */}
        <div className="pb-1.5">
          <ScoreRow id="p1" />
          <ScoreRow id="p2" />
        </div>

        {/* Status row */}
        <div className="flex justify-between items-center pb-2 h-4">
             <div className="flex gap-3">
                 {isTiebreak && !winner && (
                    <div className="text-[11px] font-mono uppercase text-clay-light tracking-widest">{t.tieBreak}</div>
                 )}
                 {!winner && status && (
                     <div className={`text-[11px] font-black uppercase tracking-widest animate-pulse ${statusColorClass}`}>
                         {getStatusText()}
                     </div>
                 )}
             </div>
             
             {isSecondServe && !winner && (
               <div className="text-[11px] font-bold text-clay-light uppercase tracking-widest">{t.secondServe}</div>
             )}
        </div>

      </div>
    </div>
  );
};
