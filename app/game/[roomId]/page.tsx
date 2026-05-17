'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { GameState, GameAction, Team, HeroType, CardType, Hero } from '@/lib/game/types';
import { tickGame, spawnUnit } from '@/lib/game/engine';
import {
  ARENA_W, ARENA_H, HERO_STATS, HERO_INFO, CARD_BY_TYPE, DECK,
  TOWER_BLUE, TOWER_RED, HERO_SPAWN, ELIXIR_MAX, ALL_CARDS,
} from '@/lib/game/constants';

// ─── Supabase client (browser-safe) ─────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

function buildInitialState(mode: 'solo' | 'team'): GameState {
  return {
    phase: 'lobby',
    countdown: 3,
    heroes: {},
    units: {},
    towers: [
      { ...TOWER_BLUE },
      { ...TOWER_RED },
    ],
    players: {},
    winner: null,
    mode,
  };
}

function buildHero(playerId: string, heroType: HeroType, team: Team): Hero {
  const stats = HERO_STATS[heroType];
  return {
    id: playerId,
    type: heroType,
    team,
    playerId,
    position: { ...HERO_SPAWN[team] },
    health: stats.hp,
    maxHealth: stats.hp,
    speed: stats.speed,
    attackDamage: stats.atk,
    attackRange: stats.range,
    attackCooldown: stats.cd,
    lastAttackTime: 0,
    isAlive: true,
  };
}

// ─── Canvas Renderer ──────────────────────────────────────────────────────────
function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  scale: number,
  joystick: { active: boolean; base: { x: number; y: number }; stick: { x: number; y: number } },
  selectedCard: number | null,
  localPlayerId: string,
  fireworks: FireworkParticle[],
) {
  const W = ARENA_W * scale;
  const H = ARENA_H * scale;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1035');
  bg.addColorStop(0.5, '#0d1a2e');
  bg.addColorStop(1, '#0d2235');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Arena divider
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Grid lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < ARENA_W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, H); ctx.stroke();
  }
  for (let y = 0; y < ARENA_H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(W, y * scale); ctx.stroke();
  }
  ctx.restore();

  // Towers
  for (const tower of state.towers) {
    const tx = tower.position.x * scale;
    const ty = tower.position.y * scale;
    const tw = 60 * scale, th = 60 * scale;
    const hp = tower.health / tower.maxHealth;
    const color = tower.team === 'blue' ? '#3B82F6' : '#EF4444';
    const glow = tower.team === 'blue' ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)';

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 20 * scale;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tx - tw / 2, ty - th / 2, tw, th, 8 * scale);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Tower emoji
    ctx.font = `${22 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tower.team === 'blue' ? '🏰' : '🏯', tx, ty);

    // HP bar
    const bw = 70 * scale;
    const bh = 7 * scale;
    const by = ty + th / 2 + 6 * scale;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(tx - bw / 2, by, bw, bh);
    ctx.fillStyle = hp > 0.5 ? '#22C55E' : hp > 0.25 ? '#F59E0B' : '#EF4444';
    ctx.fillRect(tx - bw / 2, by, bw * hp, bh);
  }

  // Units
  for (const unit of Object.values(state.units)) {
    if (unit.health <= 0) continue;
    const ux = unit.position.x * scale;
    const uy = unit.position.y * scale;
    const r = 14 * scale;
    const color = unit.team === 'blue' ? '#60A5FA' : '#F87171';
    const border = unit.team === 'blue' ? '#3B82F6' : '#EF4444';

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * scale;
    ctx.fillStyle = color;
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ux, uy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();

    const unitEmojis: Record<string, string> = { knight: '⚔️', archer: '🏹', giant: '🗿', goblin: '👺' };
    ctx.font = `${11 * scale}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(unitEmojis[unit.type] ?? '?', ux, uy);

    // HP bar
    const hp = unit.health / unit.maxHealth;
    const bw = 28 * scale;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(ux - bw / 2, uy - r - 8 * scale, bw, 4 * scale);
    ctx.fillStyle = hp > 0.5 ? '#22C55E' : '#F59E0B';
    ctx.fillRect(ux - bw / 2, uy - r - 8 * scale, bw * hp, 4 * scale);
  }

  // Heroes
  for (const hero of Object.values(state.heroes)) {
    if (!hero.isAlive) continue;
    const hx = hero.position.x * scale;
    const hy = hero.position.y * scale;
    const r = 18 * scale;
    const isLocal = hero.playerId === localPlayerId;
    const color = hero.team === 'blue' ? '#818CF8' : '#FB7185';
    const border = isLocal ? '#FFFFFF' : (hero.team === 'blue' ? '#4F46E5' : '#BE123C');
    const info = HERO_INFO[hero.type];

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = isLocal ? 20 * scale : 10 * scale;
    ctx.fillStyle = color;
    ctx.strokeStyle = border;
    ctx.lineWidth = isLocal ? 3 : 2;
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.font = `${13 * scale}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(info.emoji, hx, hy);

    // HP bar
    const hp = hero.health / hero.maxHealth;
    const bw = 36 * scale, bh = 5 * scale;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(hx - bw / 2, hy - r - 9 * scale, bw, bh);
    ctx.fillStyle = hp > 0.5 ? '#22C55E' : hp > 0.25 ? '#F59E0B' : '#EF4444';
    ctx.fillRect(hx - bw / 2, hy - r - 9 * scale, bw * hp, bh);

    if (isLocal) {
      ctx.font = `${9 * scale}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('TU', hx, hy + r + 8 * scale);
    }
  }

  // Deploy zone highlight when card is selected
  if (selectedCard !== null) {
    const localHero = state.heroes[localPlayerId];
    const zoneY = localHero?.team === 'blue' ? H / 2 : 0;
    const zoneH = H / 2;
    ctx.fillStyle = 'rgba(99,102,241,0.07)';
    ctx.strokeStyle = 'rgba(99,102,241,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(0, zoneY, W, zoneH);
    ctx.strokeRect(0, zoneY, W, zoneH);
    ctx.setLineDash([]);
  }

  // Joystick
  if (joystick.active) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(joystick.base.x, joystick.base.y, 40 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(joystick.stick.x, joystick.stick.y, 20 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Fireworks
  for (const p of fireworks) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─── Fireworks ────────────────────────────────────────────────────────────────
interface FireworkParticle { x: number; y: number; vx: number; vy: number; alpha: number; color: string; r: number; }

function spawnFireworks(W: number, H: number): FireworkParticle[] {
  const colors = ['#F59E0B', '#EF4444', '#10B981', '#818CF8', '#F472B6', '#38BDF8'];
  const particles: FireworkParticle[] = [];
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x: W * (0.2 + Math.random() * 0.6),
      y: H * (0.3 + Math.random() * 0.4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      r: 3 + Math.random() * 5,
    });
  }
  return particles;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GameRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const playerName = searchParams.get('name') || 'Joueur';
  const heroType = (searchParams.get('hero') || 'knight') as HeroType;
  const isHost = searchParams.get('host') === '1';
  const isSolo = searchParams.get('solo') === '1';

  const playerId = useRef(uid());
  const playerTeam = useRef<Team>(isHost ? 'blue' : 'red');

  // Game state
  const gameStateRef = useRef<GameState>(buildInitialState(isSolo ? 'solo' : 'team'));
  const [uiState, setUiState] = useState<{
    phase: string;
    countdown: number;
    elixir: number;
    hand: CardType[];
    towerBlueHp: number;
    towerRedHp: number;
    winner: Team | null;
    playerCount: number;
    roomCode: string;
    localTeam: Team;
  }>({
    phase: 'lobby',
    countdown: 3,
    elixir: 5,
    hand: DECK[heroType] as CardType[],
    towerBlueHp: 3000,
    towerRedHp: 3000,
    winner: null,
    playerCount: 0,
    roomCode: roomId,
    localTeam: playerTeam.current,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Controls
  const joystickRef = useRef({ active: false, base: { x: 0, y: 0 }, stick: { x: 0, y: 0 }, touchId: -1 });
  const heroVelRef = useRef({ x: 0, y: 0 });
  const selectedCardRef = useRef<number | null>(null);
  const [selectedCardUI, setSelectedCardUI] = useState<number | null>(null);

  const fireworksRef = useRef<FireworkParticle[]>([]);
  const lastTickRef = useRef<number>(performance.now());
  const rafRef = useRef<number>(0);

  // AI bot state for solo mode
  const aiTimerRef = useRef(0);

  // ── Broadcast helper ─────────────────────────────────────────────────────
  const broadcast = useCallback((action: GameAction) => {
    channelRef.current?.send({ type: 'broadcast', event: 'game', payload: action });
  }, []);

  // ── Apply action to local game state ────────────────────────────────────
  const applyAction = useCallback((action: GameAction) => {
    const gs = gameStateRef.current;

    if (action.type === 'join') {
      const team: Team = Object.keys(gs.players).length === 0 ? 'blue' : 'red';
      gs.players[action.playerId] = {
        id: action.playerId,
        name: action.playerName,
        team,
        heroType: action.heroType,
        elixir: 5,
        hand: DECK[action.heroType] as CardType[],
        isReady: false,
        isHost: action.isHost,
      };
      gs.heroes[action.playerId] = buildHero(action.playerId, action.heroType, team);
      if (action.playerId === playerId.current) {
        playerTeam.current = team;
      }
      return;
    }

    if (action.type === 'ready') {
      if (gs.players[action.playerId]) gs.players[action.playerId].isReady = true;
      const allReady = Object.values(gs.players).every(p => p.isReady) && Object.keys(gs.players).length >= 2;
      if (allReady || isSolo) {
        gs.phase = 'countdown';
        gs.countdown = 3;
      }
      return;
    }

    if (action.type === 'start') {
      gs.phase = 'playing';
      return;
    }

    if (action.type === 'hero_pos') {
      if (gs.heroes[action.playerId]) {
        gs.heroes[action.playerId].position = { x: action.x, y: action.y };
      }
      return;
    }

    if (action.type === 'play_card') {
      const player = gs.players[action.playerId];
      if (!player) return;
      const card = CARD_BY_TYPE[action.cardType];
      if (!card || player.elixir < card.cost) return;
      player.elixir -= card.cost;
      const newState = spawnUnit(gs, player.team, action.cardType, action.targetX, action.targetY, action.unitId);
      gameStateRef.current = newState;
      return;
    }
  }, [isSolo]);

  // ── Game loop ────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(gameLoop); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(gameLoop); return; }

    const now = performance.now();
    const dt = Math.min((now - lastTickRef.current) / 1000, 0.05);
    lastTickRef.current = now;

    const gs = gameStateRef.current;
    const scale = canvas.width / ARENA_W;

    // Countdown
    if (gs.phase === 'countdown') {
      gs.countdown -= dt;
      if (gs.countdown <= 0) {
        gs.phase = 'playing';
        if (isHost) broadcast({ type: 'start' });
      }
    }

    // Hero movement
    if (gs.phase === 'playing') {
      const hero = gs.heroes[playerId.current];
      if (hero && hero.isAlive) {
        const vel = heroVelRef.current;
        const speed = hero.speed;
        hero.position.x = Math.max(15, Math.min(ARENA_W - 15, hero.position.x + vel.x * speed * dt));
        hero.position.y = Math.max(15, Math.min(ARENA_H - 15, hero.position.y + vel.y * speed * dt));
      }

      // Tick physics
      gameStateRef.current = tickGame(gs, dt, playerId.current);

      // AI for solo mode
      if (isSolo) {
        aiTimerRef.current += dt;
        runAI(gameStateRef.current, aiTimerRef.current, dt);
      }

      // Sync hero position every 100ms (not every frame)
      if (Math.floor(now / 100) !== Math.floor((now - dt * 1000) / 100)) {
        const h = gameStateRef.current.heroes[playerId.current];
        if (h) broadcast({ type: 'hero_pos', playerId: playerId.current, x: h.position.x, y: h.position.y });
      }

      // Hero auto-attack
      heroAutoAttack(gameStateRef.current, playerId.current, now / 1000);
    }

    // Fireworks
    const newFw = fireworksRef.current
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.1, alpha: p.alpha - 0.015 }))
      .filter(p => p.alpha > 0);
    fireworksRef.current = newFw;

    // Render
    renderGame(
      ctx,
      gameStateRef.current,
      scale,
      joystickRef.current,
      selectedCardRef.current,
      playerId.current,
      fireworksRef.current,
    );

    // Draw countdown overlay
    if (gameStateRef.current.phase === 'countdown') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `bold ${80 * scale}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#818CF8'; ctx.shadowBlur = 30;
      ctx.fillText(String(Math.ceil(gameStateRef.current.countdown)), canvas.width / 2, canvas.height / 2);
      ctx.shadowBlur = 0;
    }

    // Update UI
    const newGs = gameStateRef.current;
    const lp = newGs.players[playerId.current];
    const bt = newGs.towers.find(t => t.id === 'tower_blue');
    const rt = newGs.towers.find(t => t.id === 'tower_red');

    setUiState(prev => ({
      ...prev,
      phase: newGs.phase,
      countdown: Math.ceil(newGs.countdown),
      elixir: Math.floor(lp?.elixir ?? prev.elixir),
      hand: lp?.hand ?? prev.hand,
      towerBlueHp: bt?.health ?? prev.towerBlueHp,
      towerRedHp: rt?.health ?? prev.towerRedHp,
      winner: newGs.winner,
      playerCount: Object.keys(newGs.players).length,
      localTeam: playerTeam.current,
    }));

    if (newGs.winner && fireworksRef.current.length === 0) {
      fireworksRef.current = spawnFireworks(canvas.width, canvas.height);
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [broadcast, isHost, isSolo]);

  // ── Hero auto-attack ─────────────────────────────────────────────────────
  function heroAutoAttack(gs: GameState, pid: string, now: number) {
    const hero = gs.heroes[pid];
    if (!hero || !hero.isAlive) return;
    if (now - hero.lastAttackTime < hero.attackCooldown) return;

    const enemy = hero.team === 'blue' ? 'red' : 'blue';
    let nearestDist = hero.attackRange;
    let nearestId: string | null = null;

    for (const u of Object.values(gs.units)) {
      if (u.team === enemy) {
        const d = Math.hypot(u.position.x - hero.position.x, u.position.y - hero.position.y);
        if (d <= nearestDist) { nearestDist = d; nearestId = u.id; }
      }
    }
    for (const h of Object.values(gs.heroes)) {
      if (h.team === enemy && h.isAlive) {
        const d = Math.hypot(h.position.x - hero.position.x, h.position.y - hero.position.y);
        if (d <= nearestDist) { nearestDist = d; nearestId = h.id; }
      }
    }
    for (const t of gs.towers) {
      if (t.team === enemy) {
        const d = Math.hypot(t.position.x - hero.position.x, t.position.y - hero.position.y);
        if (d <= nearestDist) { nearestDist = d; nearestId = t.id; }
      }
    }

    if (nearestId) {
      hero.lastAttackTime = now;
      const targetUnit = gs.units[nearestId];
      const targetHero = gs.heroes[nearestId];
      const targetTower = gs.towers.find(t => t.id === nearestId);
      if (targetUnit) targetUnit.health -= hero.attackDamage;
      else if (targetHero) targetHero.health -= hero.attackDamage;
      else if (targetTower) targetTower.health -= hero.attackDamage;
    }
  }

  // ── Simple AI for solo mode ──────────────────────────────────────────────
  function runAI(gs: GameState, _timer: number, dt: number) {
    const aiId = 'ai_player';
    const aiHero = gs.heroes[aiId];
    if (!aiHero || !aiHero.isAlive) return;

    const target = { x: 200, y: 600 }; // attack blue tower
    const dx = target.x - aiHero.position.x;
    const dy = target.y - aiHero.position.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      aiHero.position.x += (dx / len) * aiHero.speed * dt * 0.5;
      aiHero.position.y += (dy / len) * aiHero.speed * dt * 0.5;
    }

    // AI plays cards randomly
    const aiPlayer = gs.players[aiId];
    if (aiPlayer && Math.random() < dt * 0.3 && aiPlayer.elixir >= 3) {
      const cardTypes = ['knight_card', 'archer_card'] as CardType[];
      const card = cardTypes[Math.floor(Math.random() * cardTypes.length)];
      const cost = CARD_BY_TYPE[card]?.cost ?? 3;
      if (aiPlayer.elixir >= cost) {
        aiPlayer.elixir -= cost;
        const newState = spawnUnit(
          gs, 'red', card,
          100 + Math.random() * 200,
          200 + Math.random() * 150,
          uid()
        );
        gameStateRef.current = newState;
      }
    }
  }

  // ── Canvas resize ────────────────────────────────────────────────────────
  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gameArea = canvas.parentElement;
    if (!gameArea) return;
    const maxH = gameArea.clientHeight;
    const maxW = gameArea.clientWidth;
    const ratio = ARENA_W / ARENA_H;
    let w = maxW, h = maxW / ratio;
    if (h > maxH) { h = maxH; w = maxH * ratio; }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * devicePixelRatio);
    canvas.height = Math.floor(h * devicePixelRatio);
  }

  // ── Touch controls ───────────────────────────────────────────────────────
  function getCanvasCoords(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const W = canvas.width, H = canvas.height;
    const scale = W / ARENA_W;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const { x, y } = getCanvasCoords(canvas, t.clientX, t.clientY);

      // Left half bottom → joystick
      if (x < W * 0.5 && y > H * 0.6) {
        joystickRef.current = { active: true, base: { x, y }, stick: { x, y }, touchId: t.identifier };
        heroVelRef.current = { x: 0, y: 0 };
      }
      // Right side (card deploy or arena tap for fireball)
      else if (selectedCardRef.current !== null) {
        // Deploy card at touch position (in game coords)
        const gameX = x / scale;
        const gameY = y / scale;
        deployCard(selectedCardRef.current, gameX, gameY);
        selectedCardRef.current = null;
        setSelectedCardUI(null);
      }
    }
  }

  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const joy = joystickRef.current;
    if (!joy.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== joy.touchId) continue;
      const { x, y } = getCanvasCoords(canvas, t.clientX, t.clientY);
      const maxR = 40 * (canvas.width / ARENA_W);
      const dx = x - joy.base.x, dy = y - joy.base.y;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxR);
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : 0;
      joy.stick = { x: joy.base.x + nx * clampedDist, y: joy.base.y + ny * clampedDist };
      heroVelRef.current = { x: nx * Math.min(dist / maxR, 1), y: ny * Math.min(dist / maxR, 1) };
    }
  }

  function onTouchEnd(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const joy = joystickRef.current;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joy.touchId) {
        joystickRef.current = { ...joy, active: false };
        heroVelRef.current = { x: 0, y: 0 };
      }
    }
  }

  // ── Deploy card ──────────────────────────────────────────────────────────
  function deployCard(cardIndex: number, gameX: number, gameY: number) {
    const gs = gameStateRef.current;
    const player = gs.players[playerId.current];
    if (!player) return;
    const cardType = player.hand[cardIndex];
    if (!cardType) return;
    const card = CARD_BY_TYPE[cardType];
    if (!card || player.elixir < card.cost) return;

    const action: GameAction = {
      type: 'play_card',
      playerId: playerId.current,
      cardType,
      cardIndex,
      targetX: gameX,
      targetY: gameY,
      unitId: uid(),
    };
    applyAction(action);
    broadcast(action);
  }

  // ── Supabase channel setup ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel(`brawl_royale_${roomId}`, {
      config: { broadcast: { self: true } },
    });

    channel.on('broadcast', { event: 'game' }, ({ payload }) => {
      if (payload.playerId !== playerId.current || payload.type === 'hero_pos') {
        applyAction(payload as GameAction);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;

        const joinAction: GameAction = {
          type: 'join',
          playerId: playerId.current,
          playerName,
          heroType,
          isHost,
        };
        applyAction(joinAction);
        broadcast(joinAction);

        // Solo mode: add AI player
        if (isSolo) {
          const aiAction: GameAction = {
            type: 'join',
            playerId: 'ai_player',
            playerName: '🤖 IA',
            heroType: 'knight',
            isHost: false,
          };
          applyAction(aiAction);
          // AI is always ready
          applyAction({ type: 'ready', playerId: 'ai_player' });
        }
      }
    });

    return () => { channel.unsubscribe(); };
  }, [roomId, playerName, heroType, isHost, isSolo, applyAction, broadcast]);

  // ── Start game loop ──────────────────────────────────────────────────────
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  // ── Ready button ─────────────────────────────────────────────────────────
  function handleReady() {
    const action: GameAction = { type: 'ready', playerId: playerId.current };
    applyAction(action);
    broadcast(action);
  }

  // ── Card tap ─────────────────────────────────────────────────────────────
  function handleCardTap(i: number) {
    if (uiState.phase !== 'playing') return;
    const gs = gameStateRef.current;
    const player = gs.players[playerId.current];
    if (!player) return;
    const card = CARD_BY_TYPE[player.hand[i]];
    if (!card || player.elixir < card.cost) return;

    if (selectedCardRef.current === i) {
      // Second tap on same card: deploy at hero position
      const hero = gs.heroes[playerId.current];
      if (hero) {
        const offset = player.team === 'blue' ? -50 : 50;
        deployCard(i, hero.position.x + (Math.random() - 0.5) * 40, hero.position.y + offset);
      }
      selectedCardRef.current = null;
      setSelectedCardUI(null);
    } else {
      selectedCardRef.current = i;
      setSelectedCardUI(i);
    }
  }

  // ─── Render UI ─────────────────────────────────────────────────────────────
  const { phase, elixir, hand, towerBlueHp, towerRedHp, winner, playerCount, roomCode, localTeam } = uiState;
  const gs = gameStateRef.current;
  const localPlayer = gs.players[playerId.current];
  const localHand = localPlayer?.hand ?? hand;

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden select-none touch-none">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/80 backdrop-blur z-10" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-1.5">
          <span className="text-blue-400 text-xs font-bold">🏰</span>
          <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(towerBlueHp / 3000) * 100}%` }}
            />
          </div>
          <span className="text-blue-300 text-xs font-mono">{Math.max(0, towerBlueHp)}</span>
        </div>
        <div className="text-center">
          <span className="text-white text-xs font-black">{roomCode}</span>
          {phase === 'lobby' && (
            <div className="text-gray-400 text-xs">{playerCount}/2</div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-300 text-xs font-mono">{Math.max(0, towerRedHp)}</span>
          <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${(towerRedHp / 3000) * 100}%` }}
            />
          </div>
          <span className="text-red-400 text-xs font-bold">🏯</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden" style={{ minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          className="touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={(e) => {
            if (selectedCardRef.current === null) return;
            const canvas = canvasRef.current!;
            const scale = canvas.width / ARENA_W;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const gx = ((e.clientX - rect.left) * scaleX) / scale;
            const gy = ((e.clientY - rect.top) * scaleY) / scale;
            deployCard(selectedCardRef.current, gx, gy);
            selectedCardRef.current = null;
            setSelectedCardUI(null);
          }}
        />
      </div>

      {/* Bottom HUD */}
      <div className="bg-black/90 backdrop-blur px-3 pt-2 pb-3 z-10" style={{ flexShrink: 0 }}>
        {/* Elixir bar */}
        <div className="flex items-center gap-1 mb-2">
          <span className="text-purple-400 text-sm">💎</span>
          <div className="flex gap-0.5 flex-1">
            {Array.from({ length: ELIXIR_MAX }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-3 rounded-sm transition-all"
                style={{ background: i < elixir ? '#A855F7' : 'rgba(168,85,247,0.2)' }}
              />
            ))}
          </div>
          <span className="text-purple-300 text-sm font-bold w-5 text-right">{elixir}</span>
        </div>

        {/* Cards */}
        <div className="flex gap-2 justify-center">
          {localHand.map((cardType, i) => {
            const card = CARD_BY_TYPE[cardType];
            if (!card) return null;
            const lp = gs.players[playerId.current];
            const canAfford = (lp?.elixir ?? 0) >= card.cost;
            const isSelected = selectedCardUI === i;

            return (
              <button
                key={i}
                onTouchStart={(e) => { e.stopPropagation(); handleCardTap(i); }}
                onClick={() => handleCardTap(i)}
                className={`flex-1 max-w-[72px] rounded-xl p-2 border-2 transition-all ${
                  isSelected
                    ? 'border-white scale-110 shadow-lg'
                    : canAfford
                    ? 'border-transparent hover:border-white/50'
                    : 'border-transparent opacity-40'
                }`}
                style={{ background: isSelected ? card.color + 'cc' : card.color + '33' }}
              >
                <div className="text-xl text-center">{card.emoji}</div>
                <div className="text-white text-xs font-bold text-center leading-tight mt-0.5">{card.name}</div>
                <div className="text-center mt-1">
                  <span className="text-purple-300 text-xs font-bold">{card.cost}💎</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lobby overlay */}
      {phase === 'lobby' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 p-6">
          <h2 className="text-3xl font-black text-white mb-2">Salle {roomCode}</h2>
          {isSolo ? (
            <p className="text-gray-300 mb-6 text-center">Mode solo contre l'IA</p>
          ) : (
            <>
              <p className="text-gray-400 mb-1 text-sm">Partage ce code avec ton ami :</p>
              <div className="text-5xl font-black text-indigo-400 tracking-widest mb-6">{roomCode}</div>
              <p className="text-gray-400 mb-6 text-sm">{playerCount}/2 joueur(s) connecté(s)</p>
            </>
          )}
          <div className="flex items-center gap-2 mb-4 bg-white/10 rounded-xl px-4 py-2">
            <span className="text-2xl">{HERO_INFO[heroType].emoji}</span>
            <div>
              <div className="text-white font-bold">{HERO_INFO[heroType].name}</div>
              <div className="text-gray-400 text-xs">{HERO_INFO[heroType].desc}</div>
            </div>
          </div>
          <button
            onClick={handleReady}
            className="px-8 py-4 bg-indigo-600 rounded-2xl text-white font-black text-xl shadow-lg"
            style={{ boxShadow: '0 0 30px rgba(99,102,241,0.6)' }}
          >
            ✅ Prêt !
          </button>
        </div>
      )}

      {/* Winner overlay */}
      {winner && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-30 p-6">
          <div className="text-7xl mb-4">{winner === localTeam ? '🏆' : '💀'}</div>
          <h2 className="text-4xl font-black text-white mb-2">
            {winner === localTeam ? 'VICTOIRE !' : 'DÉFAITE !'}
          </h2>
          <p className="text-gray-300 mb-2">Équipe {winner === 'blue' ? 'bleue' : 'rouge'} gagne</p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => router.push('/game')}
              className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold"
            >
              🏠 Menu
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-bold"
            >
              🔄 Rejouer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
