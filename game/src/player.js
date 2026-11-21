// player.js — Pip, the night courier: walk, sneak, and toss a pebble.
//
// WASD / arrows move. Hold Shift to sneak: half speed, half the noise, and
// wardens spot you half as fast. Click (or Space) to toss a pebble toward the
// mouse — the nearest warden in earshot goes to investigate the sound.

import { inPlanter } from './level.js';

export const PLAYER_RADIUS = 12;
const WALK_SPEED = 148;
const SNEAK_SPEED = 78;
const PEBBLE_RANGE = 280;
const PEBBLE_COOLDOWN = 0.8;
const STEP_LENGTH = 26; // pixels between footstep sounds

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    facing: 0,
    sneaking: false,
    moving: false,
    hiddenInPlanter: false,
    pebbles: 5,
    pebbleCooldown: 0,
    stepAccumulator: 0,
    stepSide: 0, // alternates left/right foot
    pebble: null, // the pebble currently in flight / just landed
  };
}

export function updatePlayer(player, input, level, dt, canStand) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  const len = Math.hypot(dx, dy);
  player.moving = len > 0;
  player.sneaking = !!input.sneak;
  player.pebbleCooldown = Math.max(0, player.pebbleCooldown - dt);

  if (player.moving) {
    dx /= len;
    dy /= len;
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;
    if (canStand(level, nx, player.y, PLAYER_RADIUS)) player.x = nx;
    if (canStand(level, player.x, ny, PLAYER_RADIUS)) player.y = ny;
    player.facing = Math.atan2(dy, dx);
    // Footstep timing: one step per STEP_LENGTH travelled.
    player.stepAccumulator += speed * dt;
    if (player.stepAccumulator >= STEP_LENGTH) {
      player.stepAccumulator -= STEP_LENGTH;
      player.stepSide = 1 - player.stepSide;
      player.justStepped = true;
    } else {
      player.justStepped = false;
    }
  } else {
    player.justStepped = false;
  }

  player.hiddenInPlanter = inPlanter(level, player.x, player.y);

  // A pebble in flight arcs to its target, then rests and rings.
  if (player.pebble) {
    const p = player.pebble;
    p.t += dt * 2.4;
    if (p.t >= 1) {
      p.x = p.targetX;
      p.y = p.targetY;
      p.landed = true;
      p.ring = 0;
      p.restTimer -= dt;
      if (p.restTimer <= 0) player.pebble = null;
    } else {
      const e = p.t;
      p.x = p.fromX + (p.targetX - p.fromX) * e;
      p.y = p.fromY + (p.targetY - p.fromY) * e;
    }
    if (p.landed) p.ring = Math.min(1, (p.ring ?? 0) + dt * 1.6);
  }
  return player;
}

// Throw a pebble toward (tx, ty). Returns the landing point, or null.
export function throwPebble(player, tx, ty) {
  if (player.pebbles <= 0 || player.pebbleCooldown > 0) return null;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy);
  const range = Math.min(dist, PEBBLE_RANGE);
  const scale = dist > 0 ? range / dist : 0;
  const targetX = player.x + dx * scale;
  const targetY = player.y + dy * scale;
  player.pebbles -= 1;
  player.pebbleCooldown = PEBBLE_COOLDOWN;
  player.pebble = {
    fromX: player.x,
    fromY: player.y,
    targetX,
    targetY,
    x: player.x,
    y: player.y,
    t: 0,
    landed: false,
    ring: 0,
    restTimer: 2.2,
    announced: false,
  };
  return { x: targetX, y: targetY };
}
