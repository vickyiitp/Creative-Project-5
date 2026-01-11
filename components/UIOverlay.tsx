
import React, { useState, useEffect, useMemo } from 'react';
import { GameState } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: number;
  combo: number;
  health: number;
  onStart: () => void;
  onRestart: () => void;
}

interface CyberButtonProps {
  onClick: () => void;
  // children is made optional to satisfy TS compiler in certain JSX configurations
  children?: React.ReactNode;
  className?: string;
}

const CyberButton = ({ onClick, children, className = "" }: CyberButtonProps) => (
  <button 
    onClick={onClick}
    className={`group relative hex-button bg-cyan-500/10 hover:bg-cyan-400/20 border-l-4 border-cyan-400 transition-all duration-300 p-6 ${className}`}
  >
    <div className="flex items-center gap-4">
      <div className="w-2 h-2 bg-cyan-400 animate-pulse"></div>
      <span className="font-orbitron font-black text-white tracking-[0.3em] uppercase group-hover:text-cyan-300 transition-colors">
        {children}
      </span>
    </div>
    <div className="absolute top-0 right-0 w-8 h-[2px] bg-cyan-400/30 group-hover:w-full transition-all"></div>
  </button>
);

interface HUDPanelProps {
  title: string;
  // children is made optional to satisfy TS compiler in certain JSX configurations
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const HUDPanel = ({ title, children, className = "", style = {} }: HUDPanelProps) => (
  <div 
    className={`cyber-panel p-6 neon-border-glow group ${className}`}
    style={style}
  >
    <div className="flex justify-between items-center mb-4 border-b border-cyan-500/20 pb-2">
      <h4 className="text-[10px] font-mono font-bold text-cyan-400 tracking-[0.2em] uppercase">{title}</h4>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-cyan-400/40"></div>
        <div className="w-1.5 h-1.5 bg-cyan-400/40 animate-pulse"></div>
      </div>
    </div>
    {children}
  </div>
);

const MenuBackground = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth - 0.5), 
        y: (e.clientY / window.innerHeight - 0.5) 
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.4 + 0.1,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#060214]">
      {/* Background Glow */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.15)_0%,transparent_70%)] transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}
      ></div>
      
      {/* Starfield Layer */}
      <div className="absolute inset-0 opacity-30">
        {stars.map(star => (
          <div 
            key={star.id}
            className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* The Iconic Synth Sun */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-70">
        <div className="w-[350px] h-[350px] md:w-[650px] md:h-[650px] rounded-full bg-gradient-to-t from-fuchsia-600 via-rose-500 to-amber-300 relative overflow-hidden shadow-[0_0_120px_rgba(217,70,239,0.25)] border-t border-white/10">
          {Array.from({ length: 18 }).map((_, i) => (
            <div 
              key={i} 
              className="w-full bg-[#060214] absolute left-0" 
              style={{ height: `${i * 1.8}px`, bottom: `${i * 14}px` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Grid Floor with Perspective */}
      <div 
        className="absolute bottom-[-20%] left-[-25%] w-[150%] h-[80%] animate-grid-scroll"
        style={{
          transform: 'perspective(600px) rotateX(65deg)',
          backgroundImage: `
            linear-gradient(to right, rgba(217, 70, 239, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(217, 70, 239, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          maskImage: 'linear-gradient(to bottom, transparent, black 85%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 85%)'
        }}
      ></div>
    </div>
  );
};

export const UIOverlay: React.FC<UIOverlayProps> = ({ gameState, score, combo, health, onStart, onRestart }) => {
  const [bootSequence, setBootSequence] = useState(true);
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBootSequence(false), 1800);
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 120);
    }, 5000);
    return () => {
        clearTimeout(timer);
        clearInterval(glitchTimer);
    };
  }, []);

  if (bootSequence && gameState === GameState.MENU) {
    return (
      <div className="fixed inset-0 bg-[#060214] z-[200] flex flex-col items-center justify-center font-mono text-cyan-400">
        <div className="max-w-xs w-full">
          <div className="text-[9px] mb-8 opacity-40 tracking-[0.6em] text-center uppercase">Initializing_Neural_Link</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span>CPU_ARCH:</span><span className="text-white">QUANTUM_7</span></div>
            <div className="flex justify-between"><span>GRID_SYNC:</span><span className="text-white">ESTABLISHED</span></div>
            <div className="flex justify-between"><span>LATENCY:</span><span className="text-green-400">0.02ms</span></div>
          </div>
          <div className="w-full h-[2px] bg-cyan-950 mt-8 relative overflow-hidden border-x border-cyan-400/20">
            <div className="absolute inset-0 bg-cyan-400 animate-[shimmer_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full z-10 ${gameState === GameState.PLAYING ? 'h-screen pointer-events-none fixed top-0' : ''}`}>
      
      {gameState === GameState.MENU && <MenuBackground />}

      {/* Gameplay HUD */}
      {gameState === GameState.PLAYING && (
        <div className="w-full h-full p-6 md:p-12 flex flex-col justify-between animate-fade-in pointer-events-none">
          <div className="flex justify-between items-start pointer-events-auto">
            <HUDPanel title="NEON_VALUATION" className="min-w-[220px]">
              <div className="text-5xl text-white font-orbitron font-black tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                {score.toString().padStart(6, '0')}
              </div>
              <div className="text-[9px] text-cyan-400/60 font-mono mt-3 tracking-[0.3em] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                Capital Market Stable
              </div>
            </HUDPanel>

            <div className="text-right">
              {combo > 1 && (
                <div className="text-5xl text-fuchsia-500 font-orbitron font-black animate-glitch tracking-tighter italic drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                  X{combo}
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-8 pointer-events-auto">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-orbitron font-bold text-red-500 tracking-[0.4em]">CORE_STABILITY</span>
              <span className="text-[10px] font-mono text-red-400">{health}%</span>
            </div>
            <div className="w-full h-1.5 bg-red-950/30 border border-red-500/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                  style={{ width: `${health}%`}}
                ></div>
            </div>
          </div>

          <div className="w-full flex justify-center mb-16">
             <div className="cyber-panel px-12 py-6 bg-cyan-950/30 border-cyan-400/40 backdrop-blur-xl">
                <p className="text-xs font-black tracking-[0.5em] text-white font-orbitron flex items-center gap-4">
                  <span className="w-2 h-2 bg-cyan-400 animate-pulse"></span>
                  LOCK GRID <span className="text-cyan-400">[SPACE]</span>
                  <span className="w-2 h-2 bg-cyan-400 animate-pulse"></span>
                </p>
             </div>
          </div>
        </div>
      )}

      {/* Premium Landing UI */}
      {gameState === GameState.MENU && (
        <div className="w-full flex flex-col">
          
          <section className="h-screen w-full flex flex-col items-center justify-center p-6 relative">
            
            {/* Parallax HUD Side Elements */}
            <HUDPanel 
              title="SECTOR_07_DIAG" 
              className="absolute left-16 top-1/3 hidden xl:block w-72 opacity-40 hover:opacity-100 transition-all duration-500 border-l-4 border-l-fuchsia-500"
            >
              <div className="space-y-3 font-mono text-[9px] text-cyan-100/50">
                <div className="flex justify-between border-b border-white/5 pb-1"><span>POPULATION:</span><span className="text-cyan-400">4.2M</span></div>
                <div className="flex justify-between border-b border-white/5 pb-1"><span>POWER_GRID:</span><span className="text-green-400">STABLE</span></div>
                <div className="flex justify-between"><span>AIR_QUALITY:</span><span className="text-yellow-400">CYBER_HAZE</span></div>
              </div>
            </HUDPanel>

            <HUDPanel 
              title="NEURAL_FEED" 
              className="absolute right-16 bottom-1/3 hidden xl:block w-72 opacity-40 hover:opacity-100 transition-all duration-500 border-r-4 border-r-cyan-400"
            >
              <div className="h-24 overflow-hidden font-mono text-[8px] text-cyan-300/60 leading-relaxed scroll-smooth">
                [OK] SCANNING_BPM...<br/>
                [OK] GRID_RESOLUTION_720P...<br/>
                [OK] AUDIO_BUFFER_SYNCED...<br/>
                [OK] VAPOR_ENGINE_ENGAGED...<br/>
                [OK] ARCHITECT_IDENTIFIED...
              </div>
            </HUDPanel>

            <div className="z-10 text-center animate-fade-in flex flex-col items-center">
              <div className="inline-block px-5 py-1.5 mb-10 bg-cyan-500/10 border border-cyan-400/30 rounded-full backdrop-blur-md">
                 <span className="text-[9px] font-orbitron font-black tracking-[1em] text-cyan-400 uppercase">Sector_07 // Active_Construct</span>
              </div>

              <div className={`relative mb-12 transition-transform duration-75 ${glitchActive ? 'translate-x-1 -skew-x-2' : ''}`}>
                <h1 className="text-7xl md:text-[12rem] font-black text-white font-orbitron tracking-tighter leading-none select-none">
                  SYNTH<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-400 drop-shadow-[0_0_50px_rgba(34,211,238,0.4)]">CITY</span>
                </h1>
                {glitchActive && <div className="absolute inset-0 bg-fuchsia-500/10 mix-blend-screen animate-pulse"></div>}
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-center">
                <CyberButton onClick={onStart} className="min-w-[280px]">Begin Integration</CyberButton>
                <button 
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                  className="px-12 py-6 text-white/30 hover:text-white font-orbitron font-bold tracking-[0.4em] transition-all uppercase text-[10px] flex items-center gap-4 group"
                >
                  Briefing_Protocols
                  <span className="w-10 h-[1px] bg-white/10 group-hover:bg-cyan-400 group-hover:w-16 transition-all"></span>
                </button>
              </div>
            </div>

            <div className="absolute bottom-16 flex flex-col items-center gap-4 opacity-30 hover:opacity-100 transition-opacity cursor-pointer animate-bounce" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
              <div className="w-[1px] h-16 bg-gradient-to-b from-cyan-400 to-transparent"></div>
              <span className="text-[8px] font-orbitron tracking-[0.5em] text-cyan-400 uppercase">Scroll_For_Details</span>
            </div>
          </section>

          <div className="bg-[#060214]/90 backdrop-blur-2xl relative z-20 border-t border-white/5">
            
            <section className="max-w-7xl mx-auto px-8 py-40 grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { 
                  title: "SONIC_LOCK", 
                  desc: "Advanced rhythm-lock mechanisms synchronized to a high-fidelity 115BPM neural stream.",
                  icon: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                },
                { 
                  title: "GRID_RENDER", 
                  desc: "Real-time 3D architectural projection using a proprietary vapor-logic rendering engine.",
                  icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                },
                { 
                  title: "ARCH_VAL", 
                  desc: "Performance-based fiscal simulation. Elevate your status in the sector with precise construction.",
                  icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                }
              ].map((item, i) => (
                <div key={i} className="cyber-panel p-10 group hover:bg-cyan-500/5 transition-all border-b-2 border-b-transparent hover:border-b-cyan-500">
                  <div className="mb-8 text-cyan-400 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">
                    <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                       <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-orbitron font-black text-white mb-4 uppercase tracking-tighter">{item.title}</h3>
                  <p className="text-sm font-mono text-cyan-100/50 leading-loose">{item.desc}</p>
                </div>
              ))}
            </section>

            <section className="max-w-6xl mx-auto px-8 py-32 flex flex-col items-center text-center">
                <h2 className="text-4xl md:text-6xl font-orbitron font-black text-white mb-8 tracking-tighter uppercase">
                  Welcome To The<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-rose-400">Next Generation</span>
                </h2>
                <div className="w-24 h-1 bg-cyan-500/40 mb-12"></div>
                <p className="text-lg md:text-xl font-mono text-white/60 max-w-3xl leading-relaxed mb-16">
                  Synth-City is more than a game—it's a rhythmic architectural experiment. Join thousands of architects in the neon wasteland as we rebuild the future, one beat at a time.
                </p>
                <CyberButton onClick={onStart} className="px-20">Initialize Terminal</CyberButton>
            </section>

            <footer className="py-20 text-center border-t border-white/5 bg-black/20">
                <div className="text-[10px] font-orbitron font-black text-white/20 tracking-[1.5em] uppercase mb-6">Simulation_Interface_Terminal</div>
                <div className="flex justify-center gap-12 text-[9px] font-mono text-cyan-400/40 uppercase tracking-widest">
                  <span>(C) 2088 Neon_Architects</span>
                  <span>//</span>
                  <span>Neo-Tokyo District 4</span>
                  <span>//</span>
                  <span>Stable_v2.0</span>
                </div>
            </footer>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAMEOVER && (
         <div className="fixed inset-0 flex items-center justify-center pointer-events-auto bg-[#060214]/98 z-[100] animate-fade-in p-6">
          <div className="max-w-xl w-full cyber-panel p-16 border-red-500/40 shadow-[0_0_120px_rgba(239,68,68,0.15)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-red-500/50 animate-pulse"></div>
            <div className="mb-8 text-red-500 font-mono text-[10px] tracking-[0.8em] uppercase">Critical_Integrity_Loss</div>
            <h2 className="text-6xl text-white font-orbitron font-black tracking-tighter mb-4 uppercase">SYSTEM_DOWN</h2>
            
            <div className="my-12 py-12 bg-white/5 border-y border-white/5 relative">
              <div className="absolute top-0 left-4 text-[8px] font-mono text-white/20">FINAL_VALUATION</div>
              <p className="text-7xl text-white font-orbitron font-black drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{score}</p>
            </div>

            <CyberButton onClick={onRestart} className="w-full border-red-500 text-red-500 bg-red-500/5 hover:bg-red-500/20">
              Reboot_Core
            </CyberButton>
          </div>
        </div>
      )}
    </div>
  );
};
