export type Team = 'blue' | 'red';
export type HeroType = 'knight' | 'archer' | 'wizard' | 'tank';
export type CardType = 'knight_card' | 'archer_card' | 'giant_card' | 'fireball_card' | 'goblin_card' | 'freeze_card';
export type UnitType = 'knight' | 'archer' | 'giant' | 'goblin';

export interface Vec2 { x: number; y: number; }

export interface Hero {
  id: string;
  type: HeroType;
  team: Team;
  playerId: string;
  position: Vec2;
  health: number;
  maxHealth: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  lastAttackTime: number;
  isAlive: boolean;
}

export interface Unit {
  id: string;
  type: UnitType;
  team: Team;
  position: Vec2;
  health: number;
  maxHealth: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  lastAttackTime: number;
}

export interface Tower {
  id: string;
  team: Team;
  position: Vec2;
  health: number;
  maxHealth: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  lastAttackTime: number;
}

export interface Card {
  type: CardType;
  cost: number;
  name: string;
  emoji: string;
  color: string;
}

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  heroType: HeroType;
  elixir: number;
  hand: CardType[];
  isReady: boolean;
  isHost: boolean;
}

export interface GameState {
  phase: 'lobby' | 'countdown' | 'playing' | 'ended';
  countdown: number;
  heroes: Record<string, Hero>;
  units: Record<string, Unit>;
  towers: Tower[];
  players: Record<string, PlayerState>;
  winner: Team | null;
  mode: 'solo' | 'team';
}

export type GameAction =
  | { type: 'join'; playerId: string; playerName: string; heroType: HeroType; isHost: boolean }
  | { type: 'ready'; playerId: string }
  | { type: 'start' }
  | { type: 'hero_pos'; playerId: string; x: number; y: number }
  | { type: 'play_card'; playerId: string; cardType: CardType; cardIndex: number; targetX: number; targetY: number; unitId: string }
  | { type: 'unit_damage'; unitId: string; damage: number }
  | { type: 'hero_damage'; playerId: string; damage: number }
  | { type: 'tower_damage'; towerId: string; damage: number }
  | { type: 'elixir_update'; playerId: string; elixir: number };
