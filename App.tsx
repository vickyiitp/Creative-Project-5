import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AudioEngine } from './services/AudioEngine';
import { GameState, BuildingResult } from './types';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(100);
  
  const audioEngineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    if (gameState === GameState.MENU) {
      document.body.classList.remove('locked');
    } else {
      document.body.classList.add('locked');
      window.scrollTo(0, 0);
    }
  }, [gameState]);

  useEffect(() => {
    if (health <= 0 && gameState === GameState.PLAYING) {
      handleGameOver();
    }
    if (audioEngineRef.current) {
      const intensity = Math.max(0, health / 100);
      audioEngineRef.current.setIntensity(intensity);
    }
  }, [health, gameState]);

  const startGame = async () => {
    if (audioEngineRef.current) {
        setScore(0);
        setCombo(0);
        setHealth(100);
        await audioEngineRef.current.start();
        setGameState(GameState.PLAYING);
    }
  };

  const handleScoreUpdate = useCallback((points: number, result: BuildingResult) => {
    if (result === BuildingResult.MISS) {
      setCombo(0);
      setHealth(prev => Math.max(0, prev - 15));
    } else {
      const multiplier = 1 + Math.floor(combo / 5) * 0.5;
      setScore(prev => prev + Math.floor(points * multiplier));
      setCombo(prev => prev + 1);
      if (result === BuildingResult.PERFECT) {
          setHealth(prev => Math.min(100, prev + 5));
      }
    }
  }, [combo]);
  
  const handlePassiveMiss = useCallback(() => {
    setCombo(0);
    setHealth(prev => Math.max(0, prev - 10));
  }, []);

  const handleGameOver = () => {
    if (audioEngineRef.current) {
        audioEngineRef.current.stop();
    }
    setGameState(GameState.GAMEOVER);
  };

  return (
    <ErrorBoundary>
        <div className={`relative min-h-screen bg-black select-none font-sans ${gameState === GameState.PLAYING ? 'h-screen overflow-hidden' : ''}`}>
        {audioEngineRef.current && (
            <div className="fixed inset-0 z-0">
                <GameCanvas 
                    audioEngine={audioEngineRef.current}
                    gameState={gameState}
                    onScoreUpdate={handleScoreUpdate}
                    onPassiveMiss={handlePassiveMiss}
                    onGameOver={handleGameOver}
                />
            </div>
        )}
        <UIOverlay 
            gameState={gameState}
            score={score}
            combo={combo}
            health={health}
            onStart={startGame}
            onRestart={startGame}
        />
        </div>
    </ErrorBoundary>
  );
}

export default App;