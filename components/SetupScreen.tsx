import React, { useState } from 'react';
import { MatchConfig, Language, PlayerId, MatchType, TeamPlayers } from '../types';
import { Play, Globe, User, Trophy, Users } from 'lucide-react';
import { translations } from '../utils/translations';

interface SetupScreenProps {
  lang: Language;
  onStart: (p1: string, p2: string, config: MatchConfig, teamPlayers?: TeamPlayers) => void;
  onToggleLang: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ lang, onStart, onToggleLang }) => {
  const t = translations[lang];
  const [matchType, setMatchType] = useState<MatchType>('singles');
  const [p1Name, setP1Name] = useState(t.player1);
  const [p2Name, setP2Name] = useState(t.player2);
  const [p1PartnerName, setP1PartnerName] = useState(t.partner1);
  const [p2PartnerName, setP2PartnerName] = useState(t.partner2);
  const [setsMode, setSetsMode] = useState<1 | 3 | 5>(3);
  const [gamesPerSet, setGamesPerSet] = useState<4 | 6>(6);
  const [advantage, setAdvantage] = useState<'standard' | 'no-ad'>('standard');
  const [finalSet, setFinalSet] = useState<'standard' | 'super-tiebreak'>('standard');
  const [firstServer, setFirstServer] = useState<PlayerId>('p1');
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-6 pt-6 md:pt-10 bg-slate-950 text-white safe-top safe-bottom safe-x">
      <div className="w-full max-w-md flex justify-end mb-2">
        <button 
          onClick={onToggleLang}
          className="text-slate-400 hover:text-white flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-full font-bold uppercase text-xs tracking-wider"
        >
          <Globe size={16} />
          {lang === 'en' ? 'Russian' : 'English'}
        </button>
      </div>

      <div className="w-full max-w-md space-y-6 md:space-y-8 flex-1 flex flex-col justify-center py-4">
        <div className="text-center">
          <div className="mb-0 inline-flex">
             {!logoError ? (
               <img 
                 src="https://fdmw4tuurixhnt6l.public.blob.vercel-storage.com/icon.png" 
                 alt="Logo" 
                 className="w-24 h-24 object-contain" 
                 onError={() => setLogoError(true)}
               />
             ) : (
               <Trophy className="w-24 h-24 text-tennis-green" />
             )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{t.setupTitle}</h1>
          <p className="text-slate-400 text-sm md:text-base">{t.setupSubtitle}</p>
        </div>

        <div className="glass-panel p-4 md:p-6 rounded-2xl border border-white/10 space-y-6 shadow-2xl">

          {/* Match Format: Singles / Doubles */}
          <div>
            <label className="block text-[10px] md:text-xs font-semibold uppercase text-slate-400 mb-2">{t.matchFormat}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMatchType('singles')}
                className={`py-2.5 rounded-md font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                  matchType === 'singles'
                    ? 'bg-tennis-green text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {t.singlesMode}
              </button>
              <button
                onClick={() => setMatchType('doubles')}
                className={`py-2.5 rounded-md font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                  matchType === 'doubles'
                    ? 'bg-tennis-green text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {t.doublesMode}
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Players */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1 px-1">
                 <label className="text-[10px] md:text-xs font-semibold uppercase text-slate-400 flex-1">{t.playerNames}</label>
                 <label className="text-[10px] md:text-xs font-semibold uppercase text-slate-400 flex-1 text-right">{t.firstServer}</label>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
                <input
                    type="text"
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 md:px-4 py-3 focus:outline-none focus:border-tennis-green text-base md:text-lg font-medium transition-colors"
                    placeholder={t.player1}
                />
                <button 
                    onClick={() => setFirstServer('p1')}
                    className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl flex items-center justify-center border-2 transition-all ${firstServer === 'p1' ? 'bg-tennis-green border-tennis-green text-black' : 'bg-slate-900 border-slate-700 text-slate-600 hover:border-slate-500'}`}
                >
                    <User className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </div>
            {matchType === 'doubles' && (
                <input
                    type="text"
                    value={p1PartnerName}
                    onChange={(e) => setP1PartnerName(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 md:px-4 py-2.5 focus:outline-none focus:border-tennis-green text-sm md:text-base font-medium transition-colors text-slate-300"
                    placeholder={t.partner1}
                />
            )}

            <div className="flex items-center gap-2 md:gap-4">
                <input
                    type="text"
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 md:px-4 py-3 focus:outline-none focus:border-tennis-green text-base md:text-lg font-medium transition-colors"
                    placeholder={t.player2}
                />
                <button 
                    onClick={() => setFirstServer('p2')}
                    className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl flex items-center justify-center border-2 transition-all ${firstServer === 'p2' ? 'bg-tennis-green border-tennis-green text-black' : 'bg-slate-900 border-slate-700 text-slate-600 hover:border-slate-500'}`}
                >
                    <User className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </div>
            {matchType === 'doubles' && (
                <input
                    type="text"
                    value={p2PartnerName}
                    onChange={(e) => setP2PartnerName(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 md:px-4 py-2.5 focus:outline-none focus:border-tennis-green text-sm md:text-base font-medium transition-colors text-slate-300"
                    placeholder={t.partner2}
                />
            )}
          </div>

          <div className="h-px bg-slate-800" />

          {/* Rules */}
          <div className="space-y-4">
            
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[10px] md:text-xs font-semibold uppercase text-slate-400 mb-2">{t.sets}</label>
                <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                  {[1, 3, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSetsMode(num as 1|3|5)}
                      className={`py-2.5 rounded-lg font-bold transition-all text-xs md:text-sm ${
                        setsMode === num 
                        ? 'bg-tennis-green text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] md:text-xs font-semibold uppercase text-slate-400 mb-2">{t.gamesPerSet}</label>
                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                  {[4, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setGamesPerSet(num as 4|6)}
                      className={`py-2.5 rounded-lg font-bold transition-all text-xs md:text-sm ${
                        gamesPerSet === num 
                        ? 'bg-tennis-green text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {t.to} {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-semibold uppercase text-slate-400 mb-2">{t.advantageRule}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAdvantage('standard')}
                  className={`py-2.5 rounded-lg font-medium text-xs md:text-sm transition-colors ${
                    advantage === 'standard' ? 'bg-court-blue text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t.standard}
                </button>
                <button
                  onClick={() => setAdvantage('no-ad')}
                  className={`py-2.5 rounded-lg font-medium text-xs md:text-sm transition-colors ${
                    advantage === 'no-ad' ? 'bg-court-blue text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t.noAd}
                </button>
              </div>
            </div>

             <div>
              <label className="block text-[10px] md:text-xs font-semibold uppercase text-slate-400 mb-2">{t.decider}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFinalSet('standard')}
                  className={`py-2.5 rounded-lg font-medium text-xs md:text-sm transition-colors ${
                    finalSet === 'standard' ? 'bg-court-blue text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t.standardSet}
                </button>
                <button
                  onClick={() => setFinalSet('super-tiebreak')}
                  className={`py-2.5 rounded-lg font-medium text-xs md:text-sm transition-colors ${
                    finalSet === 'super-tiebreak' ? 'bg-court-blue text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {t.superTiebreak}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => onStart(
              p1Name,
              p2Name,
              {
                totalSetsMode: setsMode,
                setsToWin: Math.ceil(setsMode / 2) as 1|2|3,
                gamesPerSet,
                advantage,
                finalSetType: finalSet,
                initialServer: firstServer,
                matchType,
              },
              matchType === 'doubles'
                ? {
                    p1: [p1Name || t.player1, p1PartnerName || t.partner1],
                    p2: [p2Name || t.player2, p2PartnerName || t.partner2],
                  }
                : undefined
            )}
            className="w-full bg-gradient-to-r from-tennis-green to-lime-500 hover:from-lime-400 hover:to-lime-500 text-black font-bold py-3 md:py-4 rounded-xl text-base md:text-lg shadow-lg hover:shadow-tennis-green/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            {t.startMatch}
          </button>

        </div>
      </div>
    </div>
  );
};
