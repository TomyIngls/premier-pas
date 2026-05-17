'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HeroType } from '@/lib/game/types';
import { HERO_INFO } from '@/lib/game/constants';

function randomRoomId() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export default function GameLobby() {
  const router = useRouter();
  const [selectedHero, setSelectedHero] = useState<HeroType>('knight');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [screen, setScreen] = useState<'main' | 'join'>('main');

  const heroes: HeroType[] = ['knight', 'archer', 'wizard', 'tank'];

  function goCreate() {
    const name = playerName.trim() || 'Joueur';
    const room = randomRoomId();
    router.push(`/game/${room}?name=${encodeURIComponent(name)}&hero=${selectedHero}&host=1`);
  }

  function goJoin() {
    if (!joinCode.trim()) return;
    const name = playerName.trim() || 'Joueur';
    router.push(`/game/${joinCode.toUpperCase().trim()}?name=${encodeURIComponent(name)}&hero=${selectedHero}&host=0`);
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white flex flex-col items-center justify-center p-4 select-none">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black tracking-tight mb-1" style={{ textShadow: '0 0 30px #818cf8' }}>
          ⚔️ BRAWL ROYALE
        </h1>
        <p className="text-indigo-300 text-sm">Brawl Stars × Clash Royale</p>
      </div>

      {/* Name input */}
      <div className="w-full max-w-xs mb-6">
        <input
          type="text"
          placeholder="Ton pseudo..."
          maxLength={16}
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center text-lg font-bold outline-none focus:border-indigo-400 placeholder-white/30"
        />
      </div>

      {/* Hero selection */}
      <div className="mb-6 w-full max-w-xs">
        <p className="text-indigo-300 text-xs text-center mb-3 uppercase tracking-widest">Choisis ton héros</p>
        <div className="grid grid-cols-2 gap-3">
          {heroes.map(h => {
            const info = HERO_INFO[h];
            const active = selectedHero === h;
            return (
              <button
                key={h}
                onClick={() => setSelectedHero(h)}
                className={`rounded-xl p-3 border-2 text-left transition-all ${
                  active ? 'border-indigo-400 bg-indigo-500/20 scale-105' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="text-2xl mb-1">{info.emoji}</div>
                <div className="font-bold text-sm">{info.name}</div>
                <div className="text-xs text-white/50 leading-tight">{info.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      {screen === 'main' ? (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={goCreate}
            className="w-full py-4 rounded-2xl font-black text-lg bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg"
            style={{ boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}
          >
            🎮 Créer une salle
          </button>
          <button
            onClick={() => setScreen('join')}
            className="w-full py-4 rounded-2xl font-black text-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
          >
            🔗 Rejoindre une salle
          </button>
          <button
            onClick={() => {
              const room = randomRoomId();
              const name = playerName.trim() || 'Joueur';
              router.push(`/game/${room}?name=${encodeURIComponent(name)}&hero=${selectedHero}&host=1&solo=1`);
            }}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white/60"
          >
            🤖 Jouer seul (vs IA)
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <p className="text-center text-indigo-300 font-bold">Entre le code de salle</p>
          <input
            type="text"
            placeholder="EX: AB12C"
            maxLength={5}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-center text-2xl font-black tracking-widest outline-none focus:border-indigo-400"
          />
          <button
            onClick={goJoin}
            disabled={joinCode.length < 3}
            className="w-full py-4 rounded-2xl font-black text-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Rejoindre →
          </button>
          <button onClick={() => setScreen('main')} className="text-white/40 text-sm text-center">
            ← Retour
          </button>
        </div>
      )}
    </div>
  );
}
