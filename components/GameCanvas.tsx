import React, { useRef, useEffect, useCallback } from 'react';
import { AudioEngine } from '../services/AudioEngine';
import { Building, BuildingResult, GameState } from '../types';

interface GameCanvasProps {
  audioEngine: AudioEngine;
  gameState: GameState;
  onScoreUpdate: (points: number, result: BuildingResult) => void;
  onPassiveMiss: () => void;
  onGameOver: () => void;
}

const COLORS = {
  grid: '#d946ef',
  gridFar: '#4c1d95',
  sunTop: '#fbbf24',
  sunBottom: '#db2777',
  skyTop: '#0d0221',
  skyMid: '#240b36',
  skyBottom: '#4c1d95',
  buildingActive: '#06b6d4',
  buildingLocked: '#c026d3',
  star: '#ffffff',
  glyph: '#059669',
  pulse: '#22d3ee',
  laser: '#ef4444',
  blueprint: 'rgba(34, 211, 238, 0.15)'
};

const GLYPH_CHARS = 'アーウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

export const GameCanvas: React.FC<GameCanvasProps> = ({ audioEngine, gameState, onScoreUpdate, onPassiveMiss, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const buildingsRef = useRef<Building[]>([]);
  const lastTimeRef = useRef(0);
  const beatDurationRef = useRef(0);
  const feedbackRef = useRef<{ text: string, color: string, alpha: number, y: number } | null>(null);
  const shakeRef = useRef(0);

  // Background state
  const starsRef = useRef<{x: number, y: number, size: number, speed: number}[]>([]);
  const blueprintsRef = useRef<{x: number, y: number, z: number, rotation: number, type: number}[]>([]);
  const cityTrafficRef = useRef<{y: number, z: number, lane: number, speed: number, color: string}[]>([]);
  const dataRainRef = useRef<{x: number, y: number, char: string, speed: number}[]>([]);
  const gridPulsesRef = useRef<{z: number, lane: number, speed: number, alpha: number}[]>([]);

  const GRID_WIDTH = 2500;
  const GRID_DEPTH = 3000;
  const VANISHING_POINT_Y_OFFSET = -120;
  const BUILD_LINE_Z = 200;

  const project = (x: number, y: number, z: number, width: number, height: number, cameraX: number = 0) => {
    const fov = 350;
    const cameraY = 180;
    const rX = x - cameraX;
    const rY = y - cameraY;
    const rZ = z;
    if (rZ <= 0) return null;
    const scale = fov / rZ;
    const pX = rX * scale + width / 2;
    const pY = rY * scale + height / 2 + VANISHING_POINT_Y_OFFSET;
    return { x: pX, y: pY, scale };
  };

  useEffect(() => {
    if (audioEngine) {
      beatDurationRef.current = 60 / audioEngine.getBPM();
    }
  }, [audioEngine]);

  const handleInput = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    const currentTime = audioEngine.getCurrentTime();
    const target = buildingsRef.current
        .filter(b => !b.isLocked)
        .sort((a, b) => Math.abs(a.z - BUILD_LINE_Z) - Math.abs(b.z - BUILD_LINE_Z))[0];

    if (target) {
        const timeSinceLastBeat = currentTime % beatDurationRef.current;
        const progress = timeSinceLastBeat / beatDurationRef.current;
        const beatErr = Math.min(progress, 1 - progress);
        
        let result = BuildingResult.MISS;
        let points = 0;
        
        if (beatErr < 0.08) {
            result = BuildingResult.PERFECT;
            points = 1000;
            shakeRef.current = 35;
        } else if (beatErr < 0.22) {
            result = BuildingResult.GOOD;
            points = 500;
            shakeRef.current = 15;
        } else {
             shakeRef.current = 5;
        }

        if (result !== BuildingResult.MISS) {
            target.isLocked = true;
            target.quality = result;
            target.height = result === BuildingResult.PERFECT ? 1.0 : 0.6;
            target.color = result === BuildingResult.PERFECT ? COLORS.buildingLocked : '#fde047';
            feedbackRef.current = { text: result, color: result === BuildingResult.PERFECT ? '#22d3ee' : '#fde047', alpha: 1.0, y: 0 };
            onScoreUpdate(points, result);
        } else {
            feedbackRef.current = { text: "MISS", color: '#ef4444', alpha: 1.0, y: 0 };
            onScoreUpdate(0, BuildingResult.MISS);
        }
    }
  }, [gameState, audioEngine, onScoreUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Enter') handleInput();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const initScene = (w: number, h: number) => {
        starsRef.current = Array.from({length: 300}, () => ({
            x: Math.random() * w, y: Math.random() * h, size: Math.random() * 2, speed: Math.random() * 0.05 + 0.01
        }));
        blueprintsRef.current = Array.from({length: 8}, () => ({
            x: (Math.random() - 0.5) * 2000, y: (Math.random() - 0.5) * 1000, z: Math.random() * 2000 + 1000, rotation: Math.random() * Math.PI, type: Math.floor(Math.random() * 3)
        }));
        dataRainRef.current = Array.from({length: 40}, () => ({
            x: Math.random() * w, y: Math.random() * h, char: GLYPH_CHARS[Math.floor(Math.random() * GLYPH_CHARS.length)], speed: Math.random() * 300 + 100
        }));
        cityTrafficRef.current = Array.from({length: 12}, () => ({
            y: (Math.random() - 0.5) * 400, z: Math.random() * 3000, lane: (Math.floor(Math.random() * 6) - 3) * 400, speed: Math.random() * 1000 + 500, color: Math.random() > 0.5 ? '#22d3ee' : '#d946ef'
        }));
    };

    const drawAnimePilot = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, bass: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.4 + bass * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Helmet silhouette
        ctx.moveTo(-30, 0); ctx.lineTo(-25, -40); ctx.lineTo(0, -50); ctx.lineTo(25, -40); ctx.lineTo(30, 0);
        ctx.lineTo(20, 20); ctx.lineTo(-20, 20); ctx.closePath();
        ctx.stroke();
        // Visor
        ctx.fillStyle = `rgba(217, 70, 239, ${0.1 + bass * 0.2})`;
        ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(20, -10); ctx.lineTo(22, -30); ctx.lineTo(-22, -30); ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Glitch lines
        if (Math.random() < 0.1) {
            ctx.beginPath(); ctx.moveTo(-50, Math.random() * 40 - 20); ctx.lineTo(50, Math.random() * 40 - 20); ctx.stroke();
        }
        ctx.restore();
    };

    const render = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initScene(canvas.width, canvas.height);
      }

      const w = canvas.width; const h = canvas.height;
      const centerX = w / 2;

      let audioTime = time / 1000;
      let bassEnergy = 0.2 + Math.sin(time/500) * 0.1;
      let isRunning = false;
      
      if (audioEngine && audioEngine.isRunning()) {
          audioTime = audioEngine.getCurrentTime();
          const freqs = audioEngine.getVisualData();
          bassEnergy = (freqs[1] || 0) / 255.0;
          isRunning = true;
      }

      const bpm = isRunning ? audioEngine.getBPM() : 115;
      const beatProgress = (audioTime * (bpm/60)) % 1;
      const speed = isRunning ? (500 + (bassEnergy * 300)) : 200;

      // 1. SKY & BACKGROUND EFFECTS
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, COLORS.skyTop);
      bgGrad.addColorStop(0.4, COLORS.skyMid);
      bgGrad.addColorStop(0.8, COLORS.skyBottom);
      bgGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Data Rain
      ctx.font = '12px monospace';
      dataRainRef.current.forEach(d => {
          ctx.fillStyle = `rgba(34, 211, 238, ${Math.random() * 0.3})`;
          ctx.fillText(d.char, d.x, d.y);
          d.y = (d.y + d.speed * deltaTime) % h;
          if (Math.random() < 0.05) d.char = GLYPH_CHARS[Math.floor(Math.random() * GLYPH_CHARS.length)];
      });

      // Segmented Anime Sun
      const sunY = h * 0.35;
      const sunSize = 180 + bassEnergy * 40;
      const sunX = centerX;
      
      ctx.save();
      ctx.shadowBlur = 40; ctx.shadowColor = COLORS.sunBottom;
      for(let i = 0; i < 6; i++) {
        const segH = sunSize / 4;
        const yOffset = (i * (segH + 8)) - sunSize;
        if (yOffset + segH > -sunSize && yOffset < sunSize) {
            const grad = ctx.createLinearGradient(sunX, sunY + yOffset, sunX, sunY + yOffset + segH);
            grad.addColorStop(0, COLORS.sunTop); grad.addColorStop(1, COLORS.sunBottom);
            ctx.fillStyle = grad;
            ctx.beginPath();
            // Calculate segment width based on circle arc
            const angle1 = Math.acos(Math.max(-1, Math.min(1, yOffset / sunSize)));
            const angle2 = Math.acos(Math.max(-1, Math.min(1, (yOffset + segH) / sunSize)));
            const width1 = Math.sin(angle1) * sunSize;
            const width2 = Math.sin(angle2) * sunSize;
            ctx.moveTo(sunX - width1, sunY + yOffset);
            ctx.lineTo(sunX + width1, sunY + yOffset);
            ctx.lineTo(sunX + width2, sunY + yOffset + segH);
            ctx.lineTo(sunX - width2, sunY + yOffset + segH);
            ctx.closePath();
            ctx.fill();
        }
      }
      ctx.restore();

      // 2. 3D GRID & CITY
      const horizonY = project(0, 0, GRID_DEPTH, w, h)?.y || h / 2;
      
      // Horizon glow
      const horizonGrad = ctx.createLinearGradient(0, horizonY - 100, 0, horizonY);
      horizonGrad.addColorStop(0, 'transparent'); horizonGrad.addColorStop(1, 'rgba(217, 70, 239, 0.4)');
      ctx.fillStyle = horizonGrad; ctx.fillRect(0, horizonY - 100, w, 100);

      // Distant City (Anime Style)
      ctx.fillStyle = '#0d0221';
      ctx.beginPath(); ctx.moveTo(0, horizonY);
      for(let i=0; i<w; i+=40) {
          const bh = 50 + Math.sin(i * 0.01) * 100 + (Math.random() * 20);
          ctx.lineTo(i, horizonY - bh);
          ctx.lineTo(i+30, horizonY - bh);
      }
      ctx.lineTo(w, horizonY); ctx.fill();

      // Grid
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
      for (let x = -GRID_WIDTH; x <= GRID_WIDTH; x += 200) {
        const p1 = project(x, 0, 50, w, h); const p2 = project(x, 0, GRID_DEPTH, w, h);
        if (p1 && p2) {
          ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
      const offsetZ = (audioTime * speed) % 200;
      for (let z = 0; z < GRID_DEPTH; z += 200) {
        const cz = z - offsetZ; if (cz < 50) continue;
        const p1 = project(-GRID_WIDTH, 0, cz, w, h); const p2 = project(GRID_WIDTH, 0, cz, w, h);
        if (p1 && p2) {
          ctx.globalAlpha = Math.max(0, 1 - cz/GRID_DEPTH); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // 3. GAMEPLAY OBJECTS
      if (gameState === GameState.PLAYING) {
          buildingsRef.current.forEach(b => {
            b.z -= speed * deltaTime;
            if (!b.isLocked && !b.hasMissed && b.z < BUILD_LINE_Z - 60) {
                b.hasMissed = true;
                onPassiveMiss();
            }
          });
          buildingsRef.current = buildingsRef.current.filter(b => b.z > -200);
          if (buildingsRef.current.length < 8) {
              const lastZ = buildingsRef.current.length ? buildingsRef.current[buildingsRef.current.length-1].z : 1500;
              buildingsRef.current.push({
                  id: Math.random(), type: 'skyscraper', height: 0.2, color: COLORS.buildingActive, z: lastZ + 400, x: (Math.floor(Math.random()*5)-2)*250, isLocked: false, quality: null
              });
          }
      }

      buildingsRef.current.sort((a, b) => b.z - a.z).forEach(b => {
          const p = project(b.x, 0, b.z, w, h);
          if (!p) return;
          const bh = (b.isLocked ? b.height * 250 : 50 + Math.sin(time/200) * 40) * p.scale;
          const bw = 120 * p.scale;
          ctx.fillStyle = b.color;
          ctx.fillRect(p.x - bw/2, p.y - bh, bw, bh);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(p.x - bw/2, p.y - bh, bw, bh);
          // Windows
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          for(let i=1; i<4; i++) ctx.fillRect(p.x - bw/2 + 10*p.scale, p.y - bh + (i*40)*p.scale, bw - 20*p.scale, 5*p.scale);
      });

      // Build Line
      const blp1 = project(-500, 0, BUILD_LINE_Z, w, h); const blp2 = project(500, 0, BUILD_LINE_Z, w, h);
      if (blp1 && blp2) {
          ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 4 + Math.sin(time/100)*2;
          ctx.shadowBlur = 15; ctx.shadowColor = '#ffff00';
          ctx.beginPath(); ctx.moveTo(blp1.x, blp1.y); ctx.lineTo(blp2.x, blp2.y); ctx.stroke();
          ctx.shadowBlur = 0;
      }

      // 4. ANIME HUD OVERLAYS
      const hudScale = Math.min(w, h) / 1000;
      // Left HUD - Pilot
      ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.fillRect(40 * hudScale, 40 * hudScale, 180 * hudScale, 220 * hudScale);
      ctx.strokeStyle = COLORS.pulse; ctx.strokeRect(40 * hudScale, 40 * hudScale, 180 * hudScale, 220 * hudScale);
      drawAnimePilot(ctx, 130 * hudScale, 160 * hudScale, 1.5 * hudScale, bassEnergy);
      ctx.fillStyle = COLORS.pulse; ctx.font = `${10*hudScale}px monospace`;
      ctx.fillText("PILOT_ID: NEON_ARCHITECT", 50*hudScale, 60*hudScale);
      ctx.fillText(`SYNC: ${(80 + bassEnergy*20).toFixed(1)}%`, 50*hudScale, 245*hudScale);

      // Right HUD - Diagnostics
      const rx = w - 220 * hudScale;
      ctx.fillStyle = 'rgba(255, 0, 255, 0.05)';
      ctx.fillRect(rx, 40 * hudScale, 180 * hudScale, 150 * hudScale);
      ctx.strokeStyle = COLORS.grid; ctx.strokeRect(rx, 40 * hudScale, 180 * hudScale, 150 * hudScale);
      ctx.beginPath();
      for(let i=0; i<10; i++) {
          const ly = 40 * hudScale + 140 * hudScale - (Math.random() * 100 * hudScale);
          ctx.lineTo(rx + (i*20)*hudScale, ly);
      }
      ctx.stroke();

      // Feedback Text
      if (feedbackRef.current) {
          const fb = feedbackRef.current;
          ctx.font = `bold ${Math.floor(50 * fb.alpha)}px 'Orbitron'`; ctx.textAlign = 'center';
          ctx.fillStyle = fb.color; ctx.globalAlpha = fb.alpha;
          ctx.shadowBlur = 20; ctx.shadowColor = fb.color;
          ctx.fillText(fb.text, centerX, h/2 + fb.y);
          fb.alpha -= 0.03; fb.y -= 1;
          if (fb.alpha <= 0) feedbackRef.current = null;
          ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [audioEngine, gameState, onPassiveMiss]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full block z-0 touch-none"
      onClick={handleInput}
    />
  );
};