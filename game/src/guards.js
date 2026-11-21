// guards.js — the night wardens: patrol, suspicion, investigation, chase.
//
// A warden walks its patrol loop, pausing at each waypoint and looking around.
// Wardens find their own way with a breadth-first search over the floor tiles,
// so a patrol can turn corners and slip around crates instead of needing a
// straight corridor. When a warden catches a glimpse of the thief it turns
// toward the thief and its "?" shows; on a full alarm every warden runs at the
// thief's last seen spot. A thrown pebble pulls the nearest warden over to
// investigate the noise.

import { TILE, COLS, ROWS, isWalkable } from './level.js';
import { angleDifference } from './detection.js';

export const GUARD_RADIUS = 13;
const PATROL_PAUSE = 1.1; // seconds spent looking around at a waypoint
const INVESTIGATE_TIME = 4; // seconds spent staring at a noise
const CHASE_SPEED = 118;
const CATCH_DISTANCE = 26;
const REPATH_INTERVAL = 0.5; // seconds between chase re-plans

// Breadth-first search over walkable tiles. Returns the tile centres to walk
// through, from the tile after the start to the target tile, or [] when the
// target is unreachable or already underfoot.
export function findPath(level, sx, sy, tx, ty) {
  const startX = Math.floor(sx / TILE);
  const startY = Math.floor(sy / TILE);
  const goalX = Math.floor(tx / TILE);
  const goalY = Math.floor(ty / TILE);
  if (startX === goalX && startY === goalY) return [];
  const key = (x, y) => y * COLS + x;
  const cameFrom = new Map();
  const seen = new Set([key(startX, startY)]);
  const queue = [[startX, startY]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === goalX && cy === goalY) {
      const path = [];
      let cur = key(goalX, goalY);
      while (cur !== key(startX, startY)) {
        const px = cur % COLS;
        const py = Math.floor(cur / COLS);
        path.unshift({ x: px * TILE + TILE / 2, y: py * TILE + TILE / 2 });
        cur = cameFrom.get(cur);
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (seen.has(key(nx, ny))) continue;
      if (!isWalkable(level, nx * TILE + TILE / 2, ny * TILE + TILE / 2)) continue;
      seen.add(key(nx, ny));
      cameFrom.set(key(nx, ny), key(cx, cy));
      queue.push([nx, ny]);
    }
  }
  return [];
}

export function createGuard(def, index) {
  const start = def.waypoints[0];
  return {
    id: index,
    x: start.x,
    y: start.y,
    facing: Math.PI / 2,
    waypointIndex: 1 % def.waypoints.length,
    waypoints: def.waypoints,
    speed: def.speed,
    pauseTimer: 0.4,
    mode: 'patrol', // patrol | suspicious | investigate | chase
    path: [],
    pathIndex: 0,
    repathTimer: 0,
    investigateTarget: null,
    investigateTimer: 0,
    stepPhase: 0,
    heardNoise: 0,
  };
}

function setGuardPath(guard, level, tx, ty) {
  guard.path = findPath(level, guard.x, guard.y, tx, ty);
  guard.pathIndex = 0;
}

function turnToward(guard, targetAngle, dt, rate) {
  const diff = angleDifference(targetAngle, guard.facing);
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.facing += step;
}

// Walk the planned path at speed. Returns true when the path is exhausted.
function followPath(guard, level, speed, dt, canStand) {
  if (guard.pathIndex >= guard.path.length) return true;
  const target = guard.path[guard.pathIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) {
    guard.pathIndex += 1;
    return guard.pathIndex >= guard.path.length;
  }
  const nx = guard.x + (dx / dist) * speed * dt;
  const ny = guard.y + (dy / dist) * speed * dt;
  if (canStand(level, nx, guard.y, GUARD_RADIUS)) guard.x = nx;
  if (canStand(level, guard.x, ny, GUARD_RADIUS)) guard.y = ny;
  guard.facing = Math.atan2(dy, dx);
  guard.stepPhase += (speed * dt) / 14;
  return Math.hypot(target.x - guard.x, target.y - guard.y) < 4;
}

// A pebble lands: the nearest warden in earshot goes to look.
export function alertGuardsToNoise(guards, level, x, y) {
  let best = null;
  let bestDist = 300; // earshot
  for (const g of guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bestDist) { best = g; bestDist = d; }
  }
  if (best) {
    best.mode = 'investigate';
    best.investigateTarget = { x, y };
    best.investigateTimer = INVESTIGATE_TIME;
    best.heardNoise = 1;
    setGuardPath(best, level, x, y);
  }
  return best;
}

export function updateGuard(guard, level, player, detection, dt, canStand) {
  guard.heardNoise = Math.max(0, guard.heardNoise - dt * 0.5);

  if (detection.alarmed) {
    // Hunt: run at the thief's last seen spot, re-planning as it moves.
    guard.mode = 'chase';
    guard.repathTimer -= dt;
    const target = detection.lastSeenPos || player;
    if (guard.repathTimer <= 0) {
      setGuardPath(guard, level, target.x, target.y);
      guard.repathTimer = REPATH_INTERVAL;
    }
    followPath(guard, level, CHASE_SPEED, dt, canStand);
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_DISTANCE) return 'caught';
    return null;
  }

  if (guard.mode === 'investigate') {
    const arrived = followPath(guard, level, guard.speed * 1.35, dt, canStand);
    if (arrived) {
      guard.investigateTimer -= dt;
      turnToward(guard, guard.facing + Math.PI * 1.4, dt, 2.4); // look around
      if (guard.investigateTimer <= 0) {
        guard.mode = 'patrol';
        guard.investigateTarget = null;
        guard.path = [];
      }
    }
    return null;
  }

  if (detection.value > 35 && detection.lastSeen) {
    // Suspicious: turn toward the glimpse, but keep patrolling.
    guard.mode = 'suspicious';
    turnToward(guard, Math.atan2(player.y - guard.y, player.x - guard.x), dt, 3.2);
    if (detection.value < 20) guard.mode = 'patrol';
    return null;
  }

  // Patrol: walk the loop, pause and scan at each waypoint.
  guard.mode = 'patrol';
  if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    turnToward(guard, guard.facing + Math.PI * 0.8, dt, 1.6);
    return null;
  }
  if (guard.pathIndex >= guard.path.length) {
    const target = guard.waypoints[guard.waypointIndex];
    if (Math.hypot(target.x - guard.x, target.y - guard.y) < 8) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseTimer = PATROL_PAUSE;
      return null;
    }
    setGuardPath(guard, level, target.x, target.y);
    if (guard.path.length === 0) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseTimer = PATROL_PAUSE;
      return null;
    }
  }
  const arrived = followPath(guard, level, guard.speed, dt, canStand);
  if (arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseTimer = PATROL_PAUSE;
  }
  return null;
}

// Where the warden's cone points, for the renderer.
export function guardCone(guard) {
  return { x: guard.x, y: guard.y, facing: guard.facing };
}
