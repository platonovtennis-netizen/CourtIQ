
import React, { useState, useEffect, useRef } from 'react';
import { MatchState, PointAction, ShotType, PlayerId, MatchStats, Language, TeamSlot } from '../types';
import { Scoreboard } from './Scoreboard';
import { RotateCcw, BarChart2, Activity, List, Trophy, LogOut, Download, Zap, AlertCircle, X, Circle, ArrowUpRight, ArrowDownLeft, Image as ImageIcon, Hash, Clock, ChevronRight, Users, FileText } from 'lucide-react';
import { translations } from '../utils/translations';
import { downloadMatchJson } from '../utils/exportUtils';
import { downloadMatchPdf } from '../utils/pdfExport';
import { toPng } from 'html-to-image';

interface MatchInterfaceProps {
  state: MatchState;
  lang: Language;
  onPoint: (action: PointAction) => void;
  onUndo: () => void;
  onEndMatch: () => void;
  onShowStats: () => void;
  onToggleLang: () => void;
  onBroadcast: (id: string) => void;
  readOnly?: boolean;
}

const TabButton = ({ active, label, onClick, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-display font-semibold border-b-2 transition-colors ${
      active 
      ? 'border-tennis-green text-tennis-green' 
      : 'border-transparent text-slate-400 hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

export const MatchInterface: React.FC<MatchInterfaceProps> = ({ state, lang, onPoint, onUndo, onEndMatch, onToggleLang, onBroadcast, readOnly = false }) => {
  // If readOnly, start on 'stats' tab
  const [activeTab, setActiveTab] = useState<'control' | 'stats' | 'journal'>(readOnly ? 'stats' : 'control');
  const [mode, setMode] = useState<'advanced' | 'simple'>('advanced');
  const exportRef = useRef<HTMLDivElement>(null);
  const { server, players, teamPlayers, winner, journal, stats, individualStats, isSecondServe, startTime, config } = state;
  const t = translations[lang];
  const isDoubles = config.matchType === 'doubles' && !!teamPlayers;

  // Pending shot waiting on "which partner hit it?" confirmation (doubles only).
  const [pendingAction, setPendingAction] = useState<{ actorId: PlayerId; type: ShotType } | null>(null);

  useEffect(() => {
    if (winner && activeTab === 'control') {
      setActiveTab('stats');
    }
  }, [winner]);

  // If readOnly changes, ensure we aren't stuck on control tab
  useEffect(() => {
    if (readOnly && activeTab === 'control') {
      setActiveTab('stats');
    }
  }, [readOnly]);

  const handleAction = (actorId: PlayerId, type: ShotType, slot?: TeamSlot) => {
    if (readOnly) return;
    const opponentId: PlayerId = actorId === 'p1' ? 'p2' : 'p1';
    let winnerId: PlayerId = actorId;
    if (type === 'unforced-error' || type === 'forced-error' || type === 'return-error') {
      winnerId = opponentId;
    }
    if (type === 'fault') {
      winnerId = actorId; 
    }
    onPoint({ winner: winnerId, type, actorSlot: slot });
  };

  // Used by the Advanced-mode shot buttons: in doubles, ask which partner hit it first;
  // in singles, record the point immediately exactly as before.
  const requestAction = (actorId: PlayerId, type: ShotType) => {
    if (readOnly) return;
    if (isDoubles) {
      setPendingAction({ actorId, type });
    } else {
      handleAction(actorId, type);
    }
  };

  const resolvePendingAction = (slot: TeamSlot) => {
    if (!pendingAction) return;
    handleAction(pendingAction.actorId, pendingAction.type, slot);
    setPendingAction(null);
  };

  const getPercentage = (num: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((num / total) * 100);
  };

  const getDuration = () => {
    if (!startTime) return '0h 00m';
    const diff = Date.now() - startTime;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const exportToImage = async () => {
    if (!exportRef.current) {
        console.error("Export template ref is null");
        return;
    }
    
    try {
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true, 
        backgroundColor: '#f8fafc',
        width: 1200,
        height: 1000,
        pixelRatio: 2,
        style: {
          visibility: 'visible', // Ensure visible during capture
        }
      });
      
      if (!dataUrl || dataUrl.length < 100) {
          throw new Error("Generated image is empty");
      }

      const link = document.createElement('a');
      link.download = `court-iq-analytics-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting image:', err);
      alert(lang === 'ru' ? 'Ошибка при создании изображения. Попробуйте еще раз.' : 'Error creating image. Please try again.');
    }
  };

  const exportPdf = () => {
    try {
      downloadMatchPdf(state, lang);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert(lang === 'ru' ? 'Ошибка при создании PDF. Попробуйте еще раз.' : 'Error creating PDF. Please try again.');
    }
  };

  const ControlButton = ({ label, icon: Icon, type, onClick }: { label: string, icon: any, type: 'winner' | 'error' | 'neutral' | 'serve', onClick: () => void }) => {
    const styles = {
      winner: "border-emerald-500/40 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10",
      error: "border-rose-500/40 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10",
      neutral: "border-slate-700 text-slate-400 bg-slate-800/20 hover:bg-slate-800/40",
      serve: "border-amber-500/40 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10"
    };

    return (
      <button 
        onClick={onClick}
        disabled={readOnly}
        className={`w-full min-h-[46px] flex items-center justify-center gap-1.5 md:gap-3 py-3 md:py-3.5 px-2 md:px-4 border rounded-xl md:rounded-2xl transition-all active:scale-[0.98] ${styles[type]} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" strokeWidth={2.5} />
        <span className="text-[11px] md:text-sm font-bold leading-tight text-center">{label}</span>
      </button>
    );
  };

  const StatRowUI = ({ label, p1Val, p2Val, p1Count, p2Count, lowerIsBetter = false, format = 'val' }: any) => {
    const v1 = typeof p1Val === 'number' ? p1Val : 0;
    const v2 = typeof p2Val === 'number' ? p2Val : 0;
    let p1Better = false;
    let p2Better = false;
    if (p1Count !== undefined && p2Count !== undefined) {
        p1Better = p1Count !== p2Count && (lowerIsBetter ? p1Count < p2Count : p1Count > p2Count);
        p2Better = p1Count !== p2Count && (lowerIsBetter ? p2Count < p1Count : p2Count > p1Count);
    } else {
        p1Better = v1 !== v2 && (lowerIsBetter ? v1 < v2 : v1 > v2);
        p2Better = v1 !== v2 && (lowerIsBetter ? v2 < v1 : v2 > v1);
    }

    return (
      <div className="flex flex-col py-2 md:py-3 px-2 hover:bg-white/5 transition-colors group rounded-lg">
        <div className="flex items-center justify-between mb-1 md:mb-2">
          <div className={`text-lg md:text-2xl font-mono font-black w-16 md:w-24 text-left ${p1Better ? 'text-tennis-green' : 'text-slate-400'}`}>
            {format === 'percent' ? `${v1}%` : p1Val}
          </div>
          <div className="flex-1 px-2 text-center">
            <div className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 leading-none md:leading-tight line-clamp-2 max-h-[2.5em] group-hover:text-slate-300 transition-colors">
              {label}
            </div>
          </div>
          <div className={`text-lg md:text-2xl font-mono font-black w-16 md:w-24 text-right ${p2Better ? 'text-tennis-green' : 'text-slate-400'}`}>
            {format === 'percent' ? `${v2}%` : p2Val}
          </div>
        </div>
        <div className="flex h-1 md:h-1.5 w-full gap-0.5 md:gap-1 opacity-20 group-hover:opacity-60 transition-opacity px-0.5">
           <div className="flex-1 flex justify-end">
              <div className={`h-full rounded-l-full transition-all duration-500 ${p1Better ? 'bg-tennis-green' : 'bg-slate-700'}`} style={{ width: `${v1 + v2 > 0 ? (v1 / (v1 + v2)) * 100 : 50}%` }} />
           </div>
           <div className="flex-1 flex justify-start">
              <div className={`h-full rounded-r-full transition-all duration-500 ${p2Better ? 'bg-tennis-green' : 'bg-slate-700'}`} style={{ width: `${v1 + v2 > 0 ? (v2 / (v1 + v2)) * 100 : 50}%` }} />
           </div>
        </div>
      </div>
    );
  };

  const ExportItem = ({ label, p1Val, p2Val, p1Count, p2Count, format = 'val', lowerIsBetter = false }: any) => {
    const v1 = typeof p1Val === 'number' ? p1Val : parseFloat(p1Val) || 0;
    const v2 = typeof p2Val === 'number' ? p2Val : parseFloat(p2Val) || 0;
    let p1Better = false;
    let p2Better = false;
    if (p1Count !== undefined && p2Count !== undefined) {
      p1Better = p1Count !== p2Count && (lowerIsBetter ? p1Count < p2Count : p1Count > p2Count);
      p2Better = p1Count !== p2Count && (lowerIsBetter ? p2Count < p1Count : p2Count > p1Count);
    } else {
      p1Better = v1 !== v2 && (lowerIsBetter ? v1 < v2 : v1 > v2);
      p2Better = v1 !== v2 && (lowerIsBetter ? v2 < v1 : v2 > v1);
    }

    const val1Str = format === 'percent' ? `${v1}%` : p1Val;
    const val2Str = format === 'percent' ? `${v2}%` : p2Val;

    return (
      <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
        <div className={`w-20 h-10 flex items-center justify-center rounded-2xl text-base font-black shadow-sm ${p1Better ? 'bg-[#ccff00] text-black' : 'bg-slate-50 text-slate-400'}`}>
          {val1Str}
        </div>
        <div className="flex-1 text-center px-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight block">{label}</span>
        </div>
        <div className={`w-20 h-10 flex items-center justify-center rounded-2xl text-base font-black shadow-sm ${p2Better ? 'bg-[#ccff00] text-black' : 'bg-slate-50 text-slate-400'}`}>
          {val2Str}
        </div>
      </div>
    );
  };

  const getJournalStyle = (type: ShotType) => {
    switch (type) {
      case 'ace': return { color: 'text-yellow-400', icon: Zap };
      case 'winner': 
      case 'return-winner': return { color: 'text-green-400', icon: Trophy };
      case 'unforced-error':
      case 'forced-error':
      case 'return-error':
      case 'double-fault': return { color: 'text-red-400', icon: X };
      default: return { color: 'text-slate-400', icon: Activity };
    }
  };

  const PlayerCard = ({ id }: { id: PlayerId }) => {
    const isPlayerServing = server === id;
    return (
      <div className={`flex flex-col gap-2 md:gap-4 p-2 md:p-4 rounded-2xl md:rounded-[2rem] border-2 transition-all duration-500 ${isPlayerServing ? 'bg-slate-900/40 border-tennis-green shadow-[0_0_30px_rgba(204,255,0,0.1)]' : 'bg-slate-900/20 border-slate-800'}`}>
        <div className="text-center space-y-1 md:space-y-2">
          <div className={`font-bold text-xs md:text-sm truncate px-1 ${isPlayerServing ? 'text-tennis-green' : 'text-slate-400'}`}>{players[id]}</div>
          {isPlayerServing && (
            <div className="inline-flex items-center gap-1 bg-tennis-green text-black px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest">
              <Activity className="w-2.5 h-2.5 md:w-3 md:h-3" strokeWidth={3} /> {t.serving}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 md:gap-2.5">
           {isPlayerServing ? (
              <>
                <ControlButton label={t.ace} icon={Zap} type="serve" onClick={() => requestAction(id, 'ace')} />
                <ControlButton label={isSecondServe ? t.doubleFault : t.fault} icon={AlertCircle} type="neutral" onClick={() => requestAction(id, 'fault')} />
              </>
           ) : (
              <>
                <ControlButton label={t.returnWinner} icon={ArrowUpRight} type="winner" onClick={() => requestAction(id, 'return-winner')} />
                <ControlButton label={t.returnError} icon={ArrowDownLeft} type="error" onClick={() => requestAction(id, 'return-error')} />
              </>
           )}
           <ControlButton label={t.winnerShot} icon={Trophy} type="winner" onClick={() => requestAction(id, 'winner')} />
           <ControlButton label={t.unforcedError} icon={X} type="error" onClick={() => requestAction(id, 'unforced-error')} />
           <ControlButton label={t.forcedError} icon={Circle} type="neutral" onClick={() => requestAction(id, 'forced-error')} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {pendingAction && teamPlayers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
          onClick={() => setPendingAction(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-slate-400 text-xs font-black uppercase tracking-widest mb-4">{t.whoHitIt}</div>
            <div className="flex flex-col gap-3">
              {teamPlayers[pendingAction.actorId].map((name, idx) => (
                <button
                  key={idx}
                  onClick={() => resolvePendingAction(idx === 0 ? 'a' : 'b')}
                  className="w-full bg-slate-800 hover:bg-tennis-green hover:text-black text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] text-sm md:text-base"
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingAction(null)}
              className="w-full mt-4 text-slate-500 hover:text-slate-300 text-[10px] font-black uppercase tracking-widest"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <Scoreboard state={state} lang={lang} onToggleLang={onToggleLang} onBroadcast={onBroadcast} readOnly={readOnly} />

      <div className="bg-slate-900 border-b border-white/5 px-2 shadow-lg z-10 shrink-0">
        <div className="flex max-w-3xl mx-auto">
          {/* Only show Control tab if not in readOnly mode */}
          {!readOnly && <TabButton active={activeTab === 'control'} label={t.control} onClick={() => setActiveTab('control')} icon={Activity} />}
          <TabButton active={activeTab === 'stats'} label={t.stats} onClick={() => setActiveTab('stats')} icon={BarChart2} />
          <TabButton active={activeTab === 'journal'} label={t.journal} onClick={() => setActiveTab('journal')} icon={List} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto pb-24 scroll-smooth">
          
          {activeTab === 'control' && !winner && !readOnly && (
            <div className="max-w-5xl mx-auto h-full flex flex-col p-3 md:p-6 gap-4">
              <div className="flex justify-center shrink-0">
                <div className="bg-slate-800/50 p-1.5 rounded-2xl flex text-[10px] font-black uppercase tracking-widest border border-white/5 shadow-inner">
                  <button onClick={() => setMode('simple')} className={`px-8 py-2.5 rounded-xl transition-all ${mode === 'simple' ? 'bg-slate-700 text-tennis-green shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t.simple}</button>
                  <button onClick={() => setMode('advanced')} className={`px-8 py-2.5 rounded-xl transition-all ${mode === 'advanced' ? 'bg-slate-700 text-tennis-green shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t.advanced}</button>
                </div>
              </div>

              {mode === 'simple' ? (
                <div className="flex-1 flex flex-row gap-4 max-w-2xl mx-auto w-full items-stretch justify-center pb-4">
                  <button onClick={() => handleAction('p1', 'normal')} className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 hover:border-tennis-green rounded-[2rem] flex flex-col items-center justify-center gap-4 group active:scale-95 transition-all shadow-2xl">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t.pointWonBy}</span>
                    <span className="text-xl md:text-3xl font-black text-white group-hover:text-tennis-green transition-colors px-4 text-center">{players.p1}</span>
                  </button>
                  <button onClick={() => handleAction('p2', 'normal')} className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 hover:border-tennis-green rounded-[2rem] flex flex-col items-center justify-center gap-4 group active:scale-95 transition-all shadow-2xl">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t.pointWonBy}</span>
                    <span className="text-xl md:text-3xl font-black text-white group-hover:text-tennis-green transition-colors px-4 text-center">{players.p2}</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-2 gap-3 md:gap-6 h-full pb-2">
                  <PlayerCard id="p1" />
                  <PlayerCard id="p2" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="max-w-3xl mx-auto p-2 md:p-8 space-y-2 md:space-y-6 pb-20">
               <button 
                  onClick={exportPdf} 
                  className="w-full bg-tennis-green text-black py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-lime-400 transition-colors active:scale-[0.98]"
               >
                  <FileText size={16} strokeWidth={2.5} /> {t.exportPdf}
               </button>
               <button 
                  onClick={exportToImage} 
                  className="w-full bg-slate-900/60 text-slate-300 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-[10px] md:text-xs border border-white/5 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors active:scale-[0.98]"
               >
                  <ImageIcon size={14} strokeWidth={2.5} /> {t.exportImage}
               </button>

               {mode === 'advanced' && (
                 <div className="flex gap-1.5 overflow-x-auto -mx-2 px-2 pb-1 [&::-webkit-scrollbar]:hidden">
                   {[
                     { id: 'sec-service', label: t.serviceStats },
                     { id: 'sec-return', label: t.returnStats },
                     { id: 'sec-efficiency', label: t.efficiencyStats },
                     ...(isDoubles ? [{ id: 'sec-by-player', label: t.byPlayer }] : []),
                   ].map((chip) => (
                     <a
                       key={chip.id}
                       href={`#${chip.id}`}
                       className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-tennis-green bg-slate-900/60 border border-white/5 rounded-full px-3 py-1.5 transition-colors"
                     >
                       {chip.label}
                     </a>
                   ))}
                 </div>
               )}

               <div className="space-y-0.5 md:space-y-4">
                 {/* Overall Progress */}
                 <div className="flex items-center gap-2 pt-2 md:pt-4 pb-1 border-b border-white/5 mb-0.5 md:mb-1">
                   <Hash className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-500" />
                   <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.totalPoints}</h3>
                 </div>
                 <StatRowUI label={t.totalPoints} p1Val={stats.p1.totalPointsWon} p2Val={stats.p2.totalPointsWon} />

                 {/* SIMPLE MODE STATS */}
                 {mode === 'simple' && (
                    <>
                      {/* Simplified Service */}
                      <div className="flex items-center gap-2 pt-4 md:pt-6 pb-1 border-b border-white/5 mb-0.5 md:mb-1">
                        <Activity className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-500" />
                        <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.serviceStats}</h3>
                      </div>
                      <StatRowUI label={t.pointsWonOnServe} p1Val={getPercentage(stats.p1.servicePointsWon, stats.p1.servicePointsTotal)} p2Val={getPercentage(stats.p2.servicePointsWon, stats.p2.servicePointsTotal)} format="percent" />
                      <StatRowUI label={t.breakPointsSaved} p1Val={`${stats.p1.breakPointsSaved}/${stats.p1.breakPointsFaced}`} p2Val={`${stats.p2.breakPointsSaved}/${stats.p2.breakPointsFaced}`} p1Count={stats.p1.breakPointsSaved} p2Count={stats.p2.breakPointsSaved} />

                      {/* Simplified Return */}
                      <div className="flex items-center gap-2 pt-4 md:pt-6 pb-1 border-b border-white/5 mb-0.5 md:mb-1">
                        <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-500" />
                        <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.returnStats}</h3>
                      </div>
                      <StatRowUI label={t.pointsWonOnReturn} p1Val={getPercentage(stats.p1.returnPointsWon, stats.p2.servicePointsTotal)} p2Val={getPercentage(stats.p2.returnPointsWon, stats.p1.servicePointsTotal)} format="percent" />
                      <StatRowUI label={t.breakPointsConverted} p1Val={`${stats.p1.breakPointsWon}/${stats.p1.breakPointsOpportunities}`} p2Val={`${stats.p2.breakPointsWon}/${stats.p2.breakPointsOpportunities}`} p1Count={stats.p1.breakPointsWon} p2Count={stats.p2.breakPointsWon} />
                    </>
                 )}

                 {/* ADVANCED MODE STATS */}
                 {mode === 'advanced' && (
                    <>
                     {/* Service Section */}
                     <div id="sec-service" className="flex items-center gap-2 pt-4 md:pt-6 pb-1 border-b border-white/5 mb-0.5 md:mb-1 scroll-mt-4">
                       <Activity className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-500" />
                       <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.serviceStats}</h3>
                     </div>
                     <StatRowUI label={t.aces} p1Val={stats.p1.aces} p2Val={stats.p2.aces} />
                     <StatRowUI label={t.doubleFaults} p1Val={stats.p1.doubleFaults} p2Val={stats.p2.doubleFaults} lowerIsBetter />
                     <StatRowUI label={t.firstServeIn} p1Val={getPercentage(stats.p1.firstServesIn, stats.p1.servicePointsTotal)} p2Val={getPercentage(stats.p2.firstServesIn, stats.p2.servicePointsTotal)} format="percent" />
                     <StatRowUI label={t.firstServePointsWon} p1Val={getPercentage(stats.p1.firstServePointsWon, stats.p1.firstServesIn)} p2Val={getPercentage(stats.p2.firstServePointsWon, stats.p1.firstServesIn)} format="percent" />
                     <StatRowUI label={t.secondServePointsWon} p1Val={getPercentage(stats.p1.secondServePointsWon, stats.p1.secondServePointsTotal)} p2Val={getPercentage(stats.p2.secondServePointsWon, stats.p2.secondServePointsTotal)} format="percent" />
                     <StatRowUI label={t.breakPointsSaved} p1Val={`${stats.p1.breakPointsSaved}/${stats.p1.breakPointsFaced}`} p2Val={`${stats.p2.breakPointsSaved}/${stats.p2.breakPointsFaced}`} p1Count={stats.p1.breakPointsSaved} p2Count={stats.p2.breakPointsSaved} />

                     {/* Return Section */}
                     <div id="sec-return" className="flex items-center gap-2 pt-4 md:pt-6 pb-1 border-b border-white/5 mb-0.5 md:mb-1 scroll-mt-4">
                       <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-500" />
                       <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.returnStats}</h3>
                     </div>
                     <StatRowUI label={t.returnFirstServePointsWon} p1Val={getPercentage(stats.p1.returnFirstServePointsWon, stats.p2.firstServesIn)} p2Val={getPercentage(stats.p2.returnFirstServePointsWon, stats.p1.firstServesIn)} format="percent" />
                     <StatRowUI label={t.returnSecondServePointsWon} p1Val={getPercentage(stats.p1.returnSecondServePointsWon, stats.p2.secondServePointsTotal)} p2Val={getPercentage(stats.p2.returnSecondServePointsWon, stats.p1.secondServePointsTotal)} format="percent" />
                     <StatRowUI label={t.returnWinners} p1Val={stats.p1.returnWinners} p2Val={stats.p2.returnWinners} />
                     <StatRowUI label={t.breakPointsConverted} p1Val={`${stats.p1.breakPointsWon}/${stats.p1.breakPointsOpportunities}`} p2Val={`${stats.p2.breakPointsWon}/${stats.p2.breakPointsOpportunities}`} p1Count={stats.p1.breakPointsWon} p2Count={stats.p2.breakPointsWon} />

                     {/* Efficiency Section */}
                     <div id="sec-efficiency" className="flex items-center gap-2 pt-4 md:pt-6 pb-1 border-b border-white/5 mb-0.5 md:mb-1 scroll-mt-4">
                       <BarChart2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-500" />
                       <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.efficiencyStats}</h3>
                     </div>
                     <StatRowUI label={t.winners} p1Val={stats.p1.winners} p2Val={stats.p2.winners} />
                     <StatRowUI label={t.unforcedErrors} p1Val={stats.p1.unforcedErrors} p2Val={stats.p2.unforcedErrors} lowerIsBetter />
                     <StatRowUI label={t.forcedErrors} p1Val={stats.p1.forcedErrors} p2Val={stats.p2.forcedErrors} lowerIsBetter />
                     <StatRowUI label={t.aggressiveMargin} p1Val={stats.p1.winners - stats.p1.unforcedErrors} p2Val={stats.p2.winners - stats.p2.unforcedErrors} />

                     {/* By Player (doubles only): who in each pair wins/errs more */}
                     {isDoubles && individualStats && teamPlayers && (
                       <>
                         {(['p1', 'p2'] as const).map((side) => {
                           const [nameA, nameB] = teamPlayers[side];
                           const a = individualStats[`${side}a`];
                           const b = individualStats[`${side}b`];
                           return (
                             <React.Fragment key={side}>
                               <div id={side === 'p1' ? 'sec-by-player' : undefined} className="flex items-center gap-2 pt-4 md:pt-6 pb-1 border-b border-white/5 mb-0.5 md:mb-1 scroll-mt-4">
                                 <Users className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-500" />
                                 <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                   {t.byPlayer}: {nameA} vs {nameB}
                                 </h3>
                               </div>
                               <StatRowUI label={t.winners} p1Val={a.winners} p2Val={b.winners} />
                               <StatRowUI label={t.unforcedErrors} p1Val={a.unforcedErrors} p2Val={b.unforcedErrors} lowerIsBetter />
                               <StatRowUI label={t.forcedErrors} p1Val={a.forcedErrors} p2Val={b.forcedErrors} lowerIsBetter />
                               <StatRowUI label={t.aces} p1Val={a.aces} p2Val={b.aces} />
                               <StatRowUI label={t.doubleFaults} p1Val={a.doubleFaults} p2Val={b.doubleFaults} lowerIsBetter />
                               <StatRowUI label={t.returnWinners} p1Val={a.returnWinners} p2Val={b.returnWinners} />
                               <StatRowUI label={t.returnError} p1Val={a.returnErrors} p2Val={b.returnErrors} lowerIsBetter />
                             </React.Fragment>
                           );
                         })}
                       </>
                     )}
                    </>
                 )}
               </div>

               <button onClick={() => downloadMatchJson(state)} className="w-full bg-slate-800 text-slate-400 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-[9px] md:text-[10px] border border-white/5 active:scale-[0.98] mt-4 md:mt-8">
                 {t.downloadJson}
               </button>
            </div>
          )}

          {activeTab === 'journal' && (
            <div className="max-w-3xl mx-auto p-4 space-y-4">
              {journal.map((entry) => {
                const style = getJournalStyle(entry.type);
                const isGameEnd = entry.score === '0-0';
                return (
                  <div key={entry.id} className={`bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 transition-all ${isGameEnd ? 'ring-1 ring-tennis-green/30' : ''}`}>
                    <div className="bg-slate-800 p-2 rounded-xl"><style.icon className={`w-5 h-5 ${style.color}`} /></div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${style.color}`}>{entry.description}</div>
                      <div className="text-[10px] font-black tracking-widest uppercase text-slate-500 mt-1">{entry.setScore}</div>
                    </div>
                    <div className={`font-mono font-black text-xl tracking-tighter ${isGameEnd ? 'text-white' : 'text-tennis-green'}`}>{entry.score}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- HIDDEN PROFESSIONAL EXPORT TEMPLATE --- */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -100, overflow: 'hidden' }}>
        <div ref={exportRef} className="w-[1200px] h-[1000px] p-12 flex flex-col bg-[#f8fafc] text-slate-900 font-sans">
          <div className="bg-white rounded-[60px] h-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            {/* Template Header */}
            <div className="text-center pt-10 pb-8 border-b-8 border-[#ccff00]">
               <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-[#ccff00] rounded-full shadow-[0_0_8px_#ccff00]"></div>
                  <div className="text-slate-900 font-black uppercase tracking-[0.4em] text-xs opacity-60">
                    {t.matchResult} ({mode === 'advanced' ? 'РАСШИРЕННЫЙ' : 'БАЗОВЫЙ'})
                  </div>
               </div>
               
               <div className="flex items-center justify-center gap-10 mb-6">
                  <div className={`px-12 py-4 rounded-[2.5rem] text-4xl font-black shadow-xl flex items-center gap-4 ${winner === 'p1' ? 'bg-[#ccff00] text-black border-4 border-[#ccff00]' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    {players.p1}
                    {winner === 'p1' && <Trophy className="w-8 h-8 text-black fill-current" />}
                  </div>
                  
                  {winner ? (
                     <div className="w-[60px]"></div> 
                  ) : (
                     <div className="flex flex-col items-center">
                       <span className="text-slate-200 font-black text-4xl">VS</span>
                     </div>
                  )}

                  <div className={`px-12 py-4 rounded-[2.5rem] text-4xl font-black shadow-xl flex items-center gap-4 ${winner === 'p2' ? 'bg-[#ccff00] text-black border-4 border-[#ccff00]' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    {players.p2}
                    {winner === 'p2' && <Trophy className="w-8 h-8 text-black fill-current" />}
                  </div>
               </div>

               <div className="text-8xl font-mono font-black tracking-tighter mb-4 text-slate-900">
                  {state.sets.filter(s => s.winner || (s.p1 > 0 || s.p2 > 0)).map((s, idx) => {
                      const tbScore = s.tiebreakPoints ? `(${Math.min(s.tiebreakPoints.p1, s.tiebreakPoints.p2)})` : '';
                      return (
                      <span key={idx}>
                        {s.p1}-{s.p2}<span className="text-5xl ml-1 align-top text-slate-400 font-bold">{tbScore}</span>
                        {idx < state.sets.filter(s => s.winner || (s.p1 > 0 || s.p2 > 0)).length - 1 ? ', ' : ''}
                      </span>
                      );
                  })}
               </div>
               <div className="text-slate-400 font-black uppercase tracking-widest text-lg flex items-center justify-center gap-3">
                  <Clock size={24} /> {t.duration}: {getDuration()}
               </div>
            </div>

            {/* Template 3 Columns Body */}
            <div className="grid grid-cols-3 gap-12 p-12 flex-1 items-start">
               {/* SERVE COLUMN */}
               <div className="flex flex-col">
                  <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-4 mb-6 text-slate-900">
                      <Activity size={24} />
                      <h3 className="font-black uppercase tracking-widest text-sm">{t.serviceStats}</h3>
                  </div>
                  {mode === 'advanced' ? (
                     <>
                        <ExportItem label={t.aces} p1Val={stats.p1.aces} p2Val={stats.p2.aces} />
                        <ExportItem label={t.doubleFaults} p1Val={stats.p1.doubleFaults} p2Val={stats.p2.doubleFaults} lowerIsBetter />
                        <ExportItem label={t.firstServeIn} p1Val={getPercentage(stats.p1.firstServesIn, stats.p1.servicePointsTotal)} p2Val={getPercentage(stats.p2.firstServesIn, stats.p2.servicePointsTotal)} format="percent" />
                        <ExportItem label={t.firstServePointsWon} p1Val={getPercentage(stats.p1.firstServePointsWon, stats.p1.firstServesIn)} p2Val={getPercentage(stats.p2.firstServePointsWon, stats.p2.firstServesIn)} format="percent" />
                        <ExportItem label={t.secondServePointsWon} p1Val={getPercentage(stats.p1.secondServePointsWon, stats.p1.secondServePointsTotal)} p2Val={getPercentage(stats.p2.secondServePointsWon, stats.p2.secondServePointsTotal)} format="percent" />
                        <ExportItem label={t.breakPointsSaved} p1Val={`${stats.p1.breakPointsSaved}/${stats.p1.breakPointsFaced}`} p2Val={`${stats.p2.breakPointsSaved}/${stats.p2.breakPointsFaced}`} p1Count={stats.p1.breakPointsSaved} p2Count={stats.p2.breakPointsSaved} />
                     </>
                  ) : (
                     <>
                        <ExportItem label={t.pointsWonOnServe} p1Val={getPercentage(stats.p1.servicePointsWon, stats.p1.servicePointsTotal)} p2Val={getPercentage(stats.p2.servicePointsWon, stats.p2.servicePointsTotal)} format="percent" />
                        <ExportItem label={t.breakPointsSaved} p1Val={`${stats.p1.breakPointsSaved}/${stats.p1.breakPointsFaced}`} p2Val={`${stats.p2.breakPointsSaved}/${stats.p2.breakPointsFaced}`} p1Count={stats.p1.breakPointsSaved} p2Count={stats.p2.breakPointsSaved} />
                     </>
                  )}
               </div>

               {/* RALLY COLUMN */}
               <div className="flex flex-col">
                  <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-4 mb-6 text-slate-900">
                      <Trophy size={24} />
                      <h3 className="font-black uppercase tracking-widest text-sm">{t.rally}</h3>
                  </div>
                  <ExportItem label={t.totalPoints} p1Val={stats.p1.totalPointsWon} p2Val={stats.p2.totalPointsWon} />
                  {mode === 'advanced' && (
                     <>
                        <ExportItem label={t.winners} p1Val={stats.p1.winners} p2Val={stats.p2.winners} />
                        <ExportItem label={t.unforcedErrors} p1Val={stats.p1.unforcedErrors} p2Val={stats.p2.unforcedErrors} lowerIsBetter />
                        <ExportItem label={t.forcedErrors} p1Val={stats.p1.forcedErrors} p2Val={stats.p2.forcedErrors} lowerIsBetter />
                        <ExportItem label={t.aggressiveMargin} p1Val={stats.p1.winners - stats.p1.unforcedErrors} p2Val={stats.p2.winners - stats.p2.unforcedErrors} />
                     </>
                  )}
               </div>

               {/* RETURN COLUMN */}
               <div className="flex flex-col">
                  <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-4 mb-6 text-slate-900">
                      <RotateCcw size={24} />
                      <h3 className="font-black uppercase tracking-widest text-sm">{t.returnStats}</h3>
                  </div>
                  {mode === 'advanced' ? (
                      <>
                        <ExportItem label={t.returnFirstServePointsWon} p1Val={getPercentage(stats.p1.returnFirstServePointsWon, stats.p2.firstServesIn)} p2Val={getPercentage(stats.p2.returnFirstServePointsWon, stats.p1.firstServesIn)} format="percent" />
                        <ExportItem label={t.returnSecondServePointsWon} p1Val={getPercentage(stats.p1.returnSecondServePointsWon, stats.p2.secondServePointsTotal)} p2Val={getPercentage(stats.p2.returnSecondServePointsWon, stats.p1.secondServePointsTotal)} format="percent" />
                        <ExportItem label={t.returnWinners} p1Val={stats.p1.returnWinners} p2Val={stats.p2.returnWinners} />
                      </>
                  ) : (
                      <>
                        <ExportItem label={t.pointsWonOnReturn} p1Val={getPercentage(stats.p1.returnPointsWon, stats.p2.servicePointsTotal)} p2Val={getPercentage(stats.p2.returnPointsWon, stats.p1.servicePointsTotal)} format="percent" />
                      </>
                  )}
                  <ExportItem label={t.breakPointsConverted} p1Val={`${stats.p1.breakPointsWon}/${stats.p1.breakPointsOpportunities}`} p2Val={`${stats.p2.breakPointsWon}/${stats.p2.breakPointsOpportunities}`} p1Count={stats.p1.breakPointsWon} p2Count={stats.p2.breakPointsWon} />
               </div>
            </div>

            <div className="bg-slate-900 py-10 text-center">
              <span className="text-white text-xs font-black uppercase tracking-[1em] opacity-50">COURT IQ • PRO ANALYTICS</span>
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
      <div className="bg-slate-900 p-4 border-t border-slate-800 z-10 shadow-2xl shrink-0 safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-6">
           <button onClick={onUndo} className="flex flex-col items-center justify-center text-slate-500 hover:text-white transition-all py-1 active:scale-95 group">
              <RotateCcw className="w-5 h-5 mb-1 group-hover:rotate-[-45deg] transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">{t.undo}</span>
           </button>
            <div className="flex flex-col items-center justify-center text-slate-700">
              <span className="text-[10px] font-black tracking-[0.5em]">COURT IQ</span>
              <span className="text-[9px] font-black tracking-widest">by NICOL</span>
           </div>
           <button onClick={() => onEndMatch()} className="flex flex-col items-center justify-center text-slate-500 hover:text-red-500 transition-all py-1 active:scale-95 group">
            <LogOut className="w-5 h-5 mb-1 group-hover:translate-x-1 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest">{t.exit}</span>
           </button>
        </div>
      </div>
      )}
      
      {readOnly && (
          <div className="bg-slate-900 p-4 border-t border-slate-800 z-10 shadow-2xl shrink-0 safe-bottom flex justify-center text-slate-600 font-bold text-xs uppercase tracking-widest">
            {t.viewerModeReadOnly}
          </div>
      )}
    </div>
  );
};
