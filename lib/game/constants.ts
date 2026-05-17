import type { Card, HeroType } from './types';

export const ARENA_W = 400;
export const ARENA_H = 700;

export const TOWER_BLUE = { id: 'tower_blue', team: 'blue' as const, position: { x: 200, y: 630 }, health: 3000, maxHealth: 3000, attackRange: 120, attackDamage: 40, attackCooldown: 1.2, lastAttackTime: 0 };
export const TOWER_RED  = { id: 'tower_red',  team: 'red'  as const, position: { x: 200, y: 70  }, health: 3000, maxHealth: 3000, attackRange: 120, attackDamage: 40, attackCooldown: 1.2, lastAttackTime: 0 };

export const HERO_SPAWN: Record<string, { x: number; y: number }> = {
  blue: { x: 200, y: 500 },
  red:  { x: 200, y: 200 },
};

export const HERO_STATS: Record<HeroType, { hp: number; speed: number; atk: number; range: number; cd: number }> = {
  knight: { hp: 1200, speed: 90,  atk: 120, range: 45,  cd: 0.9 },
  archer: { hp: 800,  speed: 110, atk: 80,  range: 130, cd: 0.7 },
  wizard: { hp: 700,  speed: 80,  atk: 160, range: 150, cd: 1.4 },
  tank:   { hp: 2000, speed: 60,  atk: 140, range: 40,  cd: 1.2 },
};

export const HERO_INFO: Record<HeroType, { name: string; emoji: string; color: string; desc: string }> = {
  knight: { name: 'Chevalier', emoji: '⚔️', color: '#F59E0B', desc: 'Équilibré, solide au corps à corps' },
  archer: { name: 'Archer',    emoji: '🏹', color: '#10B981', desc: 'Rapide, attaque à distance' },
  wizard: { name: 'Mage',      emoji: '🔮', color: '#8B5CF6', desc: 'Très puissant, fragile' },
  tank:   { name: 'Colosse',   emoji: '🛡️', color: '#6B7280', desc: 'Énorme PV, lent' },
};

export const UNIT_STATS: Record<string, { hp: number; speed: number; atk: number; range: number; cd: number }> = {
  knight:  { hp: 600,  speed: 70,  atk: 90,  range: 40,  cd: 1.1 },
  archer:  { hp: 300,  speed: 80,  atk: 65,  range: 120, cd: 0.8 },
  giant:   { hp: 2000, speed: 40,  atk: 110, range: 45,  cd: 1.5 },
  goblin:  { hp: 200,  speed: 120, atk: 50,  range: 35,  cd: 0.6 },
};

export const ALL_CARDS: Card[] = [
  { type: 'knight_card',   cost: 3, name: 'Chevalier', emoji: '⚔️', color: '#F59E0B' },
  { type: 'archer_card',   cost: 2, name: 'Archer',    emoji: '🏹', color: '#10B981' },
  { type: 'giant_card',    cost: 5, name: 'Géant',     emoji: '🗿', color: '#6B7280' },
  { type: 'goblin_card',   cost: 2, name: 'Gobelin',   emoji: '👺', color: '#84CC16' },
  { type: 'fireball_card', cost: 4, name: 'Boule de Feu', emoji: '🔥', color: '#EF4444' },
  { type: 'freeze_card',   cost: 4, name: 'Gel',       emoji: '❄️', color: '#38BDF8' },
];

export const CARD_BY_TYPE = Object.fromEntries(ALL_CARDS.map(c => [c.type, c]));

export const ELIXIR_RATE = 1 / 2.8; // elixir per second
export const ELIXIR_MAX = 10;

export const DECK: Record<HeroType, string[]> = {
  knight: ['knight_card', 'giant_card',   'fireball_card', 'archer_card'],
  archer: ['archer_card', 'goblin_card',  'fireball_card', 'knight_card'],
  wizard: ['fireball_card', 'freeze_card','archer_card',   'giant_card'],
  tank:   ['giant_card',  'knight_card',  'freeze_card',   'goblin_card'],
};
