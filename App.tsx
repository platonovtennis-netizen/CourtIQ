import React, { useState, useEffect } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { MatchInterface } from './components/MatchInterface';
import { MatchState, PointAction, MatchConfig, Language, TeamPlayers } from './types';
import { getInitialState, processPoint, undoLastPoint, createIndividualStats } from './utils/tennisEngine';
import { ref, set, onValue, off } from 'firebase/database';
import { db } from './utils/firebase';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ru'); 
  const [matchState, setMatchState] = useState<MatchState>(getInitialState(lang));
  const [isViewer, setIsViewer] = useState(false);

  // Check for viewer mode on mount and subscribe to Firebase
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const liveId = params.get('live');

    if (liveId) {
        setIsViewer(true);
        const matchRef = ref(db, `matches/${liveId}`);
        
        // Subscribe to real-time updates
        const unsubscribe = onValue(matchRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setMatchState(data);
            }
        }, (error) => {
            console.error("Firebase read error:", error);
        });

        return () => {
            off(matchRef);
            unsubscribe(); // Clean up listener
        };
    }
  }, []);

  // Broadcast mode: Save state to Firebase whenever it changes
  useEffect(() => {
    if (!isViewer && matchState.broadcastId) {
        const matchRef = ref(db, `matches/${matchState.broadcastId}`);
        // Using set() overwrites the data at this location
        set(matchRef, matchState).catch((err) => {
            console.error("Firebase write error:", err);
        });
    }
  }, [matchState, isViewer]);

  const toggleLang = () => {
      setLang(prev => prev === 'en' ? 'ru' : 'en');
  }

  const handleStartMatch = (p1: string, p2: string, config: MatchConfig, teamPlayers?: TeamPlayers) => {
    const p1Default = lang === 'ru' ? 'Игрок 1' : 'Player 1';
    const p2Default = lang === 'ru' ? 'Игрок 2' : 'Player 2';
    const isDoubles = config.matchType === 'doubles' && !!teamPlayers;

    setMatchState(prev => ({
      ...prev,
      status: 'active',
      config,
      server: config.initialServer || 'p1',
      startTime: Date.now(),
      players: isDoubles
        ? {
            p1: `${teamPlayers!.p1[0]} / ${teamPlayers!.p1[1]}`,
            p2: `${teamPlayers!.p2[0]} / ${teamPlayers!.p2[1]}`,
          }
        : {
            p1: p1 || p1Default,
            p2: p2 || p2Default,
          },
      teamPlayers: isDoubles ? teamPlayers! : null,
      individualStats: isDoubles ? createIndividualStats() : null,
    }));
  };

  const handlePoint = (action: PointAction) => {
    if (isViewer) return;
    setMatchState(current => processPoint(current, action, lang));
  };

  const handleUndo = () => {
    if (isViewer) return;
    setMatchState(current => undoLastPoint(current));
  };

  const handleEndMatch = async () => {
    if (isViewer) return;
    if (confirm(lang === 'ru' ? "Завершить текущий матч и выйти?" : "End current match and exit?")) {
      
      // Ensure the final state is synced to Firebase before we disconnect locally
      if (matchState.broadcastId) {
          try {
             const finalState = { ...matchState };
             const matchRef = ref(db, `matches/${matchState.broadcastId}`);
             await set(matchRef, finalState);
          } catch (e) {
              console.error("Failed to save final state", e);
          }
      }

      // Reset local state for the broadcaster
      const newState = getInitialState(lang);
      setMatchState(newState);
      
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('live');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleBroadcast = (id: string) => {
    setMatchState(prev => ({ ...prev, broadcastId: id }));
  };

  return (
    <div className="h-full">
      {matchState.status === 'setup' && !isViewer && (
        <SetupScreen onStart={handleStartMatch} lang={lang} onToggleLang={toggleLang} />
      )}

      {(matchState.status === 'active' || matchState.status === 'finished' || isViewer) && (
        <MatchInterface 
          state={matchState} 
          lang={lang}
          onPoint={handlePoint} 
          onUndo={handleUndo} 
          onEndMatch={handleEndMatch}
          onShowStats={() => {}}
          onToggleLang={toggleLang}
          onBroadcast={handleBroadcast}
          readOnly={isViewer}
        />
      )}
    </div>
  );
};

export default App;