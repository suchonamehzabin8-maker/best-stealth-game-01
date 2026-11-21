// detection.js — what a warden can see, and how suspicion grows and fades.
//
// A warden sees the thief when the thief is inside the warden's vision cone
// (range + angle) with a clear line of sight, and is not hidden in a planter.
// Suspicion rises faster the closer the thief is, and slower while the thief
// sneaks. It drains when the thief is unseen, so a near miss is recoverable.

import { blocksSight, inPlanter } from './level.js';

export const GUARD_RANGE = 215;
export const GUARD_HALF_ANGLE = Math.PI / 4.6; // ~39 degrees each side
export const SNEAK_DETECTION_FACTOR = 0.55;

// Sampled line of sight: step along the ray and stop at the first tile that
// blocks vision. Cheap, and exact enough for a 32px grid.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(level, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can this guard see the player right now? Returns the distance when seen,
// or null when the player is out of the cone, out of range, hidden, or
// behind cover.
export function guardSeesPlayer(level, guard, player) {
  if (player.hiddenInPlanter) return null;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_RANGE) return null;
  const facing = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(facing, guard.facing)) > GUARD_HALF_ANGLE) return null;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return null;
  return dist;
}

// How fast suspicion (0..100) climbs while the player is seen at this
// distance. Close = fast, far = slow, sneaking = slower still.
export function detectionRate(dist, sneaking) {
  const closeness = 1 - dist / GUARD_RANGE; // 0 far .. 1 touching
  const rate = 14 + 62 * closeness * closeness;
  return sneaking ? rate * SNEAK_DETECTION_FACTOR : rate;
}

export const SUSPICION_DECAY = 26; // points per second while unseen

// The shared suspicion meter: 0 calm, 100 full alarm.
export function createDetection() {
  return { value: 0, alarmed: false, alarmTimer: 0, lastSeen: null };
}

export function updateDetection(det, seenDist, sneaking, dt) {
  if (seenDist !== null) {
    det.value = Math.min(100, det.value + detectionRate(seenDist, sneaking) * dt);
    det.lastSeen = { dist: seenDist };
    if (det.alarmed) det.alarmTimer = 6; // spotted again: the hunt goes on
  } else {
    det.value = Math.max(0, det.value - SUSPICION_DECAY * dt);
    det.lastSeen = null;
  }
  if (det.value >= 100 && !det.alarmed) {
    det.alarmed = true;
    det.alarmTimer = 6; // seconds the wardens hunt before giving up
  }
  if (det.alarmed) {
    det.alarmTimer -= dt;
    if (det.alarmTimer <= 0 && det.value < 100) {
      det.alarmed = false;
      det.value = 0;
    }
  }
  return det;
}
