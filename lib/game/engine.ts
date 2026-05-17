import type { GameState, Hero, Unit, Tower, Team, CardType, Vec2 } from './types';
import { ARENA_H, ARENA_W, UNIT_STATS, ELIXIR_RATE, ELIXIR_MAX } from './constants';

function dist(a: Vec2, b: Vec2) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function enemyTeam(t: Team): Team {
  return t === 'blue' ? 'red' : 'blue';
}

function enemyTowerPos(team: Team): Vec2 {
  return team === 'blue' ? { x: 200, y: 70 } : { x: 200, y: 630 };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export function tickGame(state: GameState, dt: number, localPlayerId: string): GameState {
  if (state.phase !== 'playing') return state;

  const newState = deepClone(state);

  // Elixir for local player only
  const lp = newState.players[localPlayerId];
  if (lp) {
    lp.elixir = Math.min(ELIXIR_MAX, lp.elixir + ELIXIR_RATE * dt);
  }

  const now = Date.now() / 1000;

  // Update units
  const units = Object.values(newState.units);
  const heroes = Object.values(newState.heroes).filter(h => h.isAlive);
  const towers = newState.towers;

  for (const unit of units) {
    if (unit.health <= 0) {
      delete newState.units[unit.id];
      continue;
    }

    const enemy = enemyTeam(unit.team);

    // Find nearest enemy target
    let nearestEnemy: { id: string; pos: Vec2; dist: number } | null = null;

    for (const u of units) {
      if (u.team === enemy && u.health > 0) {
        const d = dist(unit.position, u.position);
        if (!nearestEnemy || d < nearestEnemy.dist) nearestEnemy = { id: u.id, pos: u.position, dist: d };
      }
    }
    for (const h of heroes) {
      if (h.team === enemy) {
        const d = dist(unit.position, h.position);
        if (!nearestEnemy || d < nearestEnemy.dist) nearestEnemy = { id: h.id, pos: h.position, dist: d };
      }
    }
    const enemyTower = towers.find(t => t.team === enemy);
    if (enemyTower) {
      const d = dist(unit.position, enemyTower.position);
      if (!nearestEnemy || d < nearestEnemy.dist) nearestEnemy = { id: enemyTower.id, pos: enemyTower.position, dist: d };
    }

    if (!nearestEnemy) continue;

    if (nearestEnemy.dist <= unit.attackRange) {
      // Attack
      if (now - unit.lastAttackTime >= unit.attackCooldown) {
        unit.lastAttackTime = now;
        const targetUnit = newState.units[nearestEnemy.id];
        const targetHero = newState.heroes[nearestEnemy.id];
        const targetTower = towers.find(t => t.id === nearestEnemy!.id);
        if (targetUnit) targetUnit.health -= unit.attackDamage;
        else if (targetHero) targetHero.health -= unit.attackDamage;
        else if (targetTower) targetTower.health -= unit.attackDamage;
      }
    } else {
      // Move toward target
      const dir = normalize({ x: nearestEnemy.pos.x - unit.position.x, y: nearestEnemy.pos.y - unit.position.y });
      unit.position.x = clamp(unit.position.x + dir.x * unit.speed * dt, 15, ARENA_W - 15);
      unit.position.y = clamp(unit.position.y + dir.y * unit.speed * dt, 15, ARENA_H - 15);
    }
  }

  // Tower attacks
  for (const tower of towers) {
    if (tower.health <= 0) continue;
    const enemy = enemyTeam(tower.team);
    let nearestEnemy: { pos: Vec2; dist: number; ref: Hero | Unit | null } | null = null;

    for (const u of units) {
      if (u.team === enemy) {
        const d = dist(tower.position, u.position);
        if (!nearestEnemy || d < nearestEnemy.dist) nearestEnemy = { pos: u.position, dist: d, ref: u };
      }
    }
    for (const h of heroes) {
      if (h.team === enemy) {
        const d = dist(tower.position, h.position);
        if (!nearestEnemy || d < nearestEnemy.dist) nearestEnemy = { pos: h.position, dist: d, ref: h };
      }
    }

    if (nearestEnemy && nearestEnemy.dist <= tower.attackRange) {
      if (now - tower.lastAttackTime >= tower.attackCooldown) {
        tower.lastAttackTime = now;
        if (nearestEnemy.ref) nearestEnemy.ref.health -= tower.attackDamage;
      }
    }
  }

  // Hero health and alive check
  for (const hero of Object.values(newState.heroes)) {
    if (hero.health <= 0 && hero.isAlive) {
      hero.isAlive = false;
      hero.health = 0;
    }
  }

  // Win condition
  for (const tower of towers) {
    if (tower.health <= 0) {
      newState.winner = enemyTeam(tower.team);
      newState.phase = 'ended';
    }
  }

  return newState;
}

export function spawnUnit(
  state: GameState,
  team: Team,
  cardType: CardType,
  targetX: number,
  targetY: number,
  unitId: string
): GameState {
  const unitMap: Record<string, string> = {
    knight_card: 'knight',
    archer_card: 'archer',
    giant_card: 'giant',
    goblin_card: 'goblin',
  };

  const unitType = unitMap[cardType];
  if (!unitType) {
    // Spell: fireball or freeze
    if (cardType === 'fireball_card') {
      return applyFireball(state, team, targetX, targetY);
    }
    if (cardType === 'freeze_card') {
      return applyFreeze(state, team, targetX, targetY);
    }
    return state;
  }

  const stats = UNIT_STATS[unitType];
  const newState = deepClone(state);

  newState.units[unitId] = {
    id: unitId,
    type: unitType as any,
    team,
    position: { x: targetX, y: targetY },
    health: stats.hp,
    maxHealth: stats.hp,
    speed: stats.speed,
    attackDamage: stats.atk,
    attackRange: stats.range,
    attackCooldown: stats.cd,
    lastAttackTime: 0,
  };

  return newState;
}

function applyFireball(state: GameState, team: Team, cx: number, cy: number): GameState {
  const newState = deepClone(state);
  const radius = 80;
  const damage = 500;

  for (const unit of Object.values(newState.units)) {
    if (unit.team !== team) {
      const d = dist(unit.position, { x: cx, y: cy });
      if (d <= radius) unit.health -= damage;
    }
  }
  for (const hero of Object.values(newState.heroes)) {
    if (hero.team !== team) {
      const d = dist(hero.position, { x: cx, y: cy });
      if (d <= radius) hero.health -= damage;
    }
  }
  for (const tower of newState.towers) {
    if (tower.team !== team) {
      const d = dist(tower.position, { x: cx, y: cy });
      if (d <= radius) tower.health -= damage / 2;
    }
  }
  return newState;
}

function applyFreeze(state: GameState, _team: Team, cx: number, cy: number): GameState {
  // Freeze doesn't change health — just cosmetic for now (real freeze needs timer)
  // We mark units with a freeze flag by setting their speed to 0 temporarily
  // For simplicity, apply 200 damage to enemies in range
  const newState = deepClone(state);
  const radius = 100;
  const damage = 200;
  const enemy = enemyTeam(_team);

  for (const unit of Object.values(newState.units)) {
    if (unit.team === enemy) {
      const d = dist(unit.position, { x: cx, y: cy });
      if (d <= radius) unit.health -= damage;
    }
  }
  return newState;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
