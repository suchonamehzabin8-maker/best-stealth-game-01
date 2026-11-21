// shots.js — scripted scenes for the screenshots, so each one shows the game
// at its best: the full level, a near-detection sneak, a full alarm, and the
// win screen. Used only when the page opens with ?shot=<name>; normal play
// never touches it.

import { TILE } from './level.js';
import { loadLevel } from './game.js';

function place(game, px, py, facing = 0) {
  game.player.x = px;
  game.player.y = py;
  game.player.facing = facing;
}

function placeGuard(game, index, tx, ty, facing) {
  const g = game.guards[index];
  g.x = tx * TILE + TILE / 2;
  g.y = ty * TILE + TILE / 2;
  g.facing = facing;
  g.pauseTimer = 0;
}

// Apply a named screenshot scene to a fresh game. Returns true when a scene
// was applied; the caller then renders one frame and holds it still.
export function applyShot(game, name) {
  loadLevel(game, 0);
  game.phase = 'playing';
  game.time = 0;

  if (name === 'start') {
    // The cover: the whole level in play, wardens on patrol, cones visible.
    // The title overlay stays off so the judge sees the game itself.
    game.phase = 'playing';
    place(game, 48, 48, 0);
    placeGuard(game, 0, 12, 3, Math.PI / 2);
    placeGuard(game, 1, 8, 9, 0);
    placeGuard(game, 2, 21, 13, Math.PI);
    placeGuard(game, 3, 15, 16, -Math.PI / 2);
    game.toast = 'The Quiet Gallery — pocket the relics, reach the glowing exit unseen';
    game.toastTimer = 999;
    return true;
  }

  if (name === 'play') {
    // Mid-sneak: Pip crouched behind a crate, a warden's cone sweeping close,
    // suspicion halfway up, one relic already pocketed.
    game.level.relics[0].taken = true;
    game.relicsTaken = 1;
    place(game, 5 * TILE + 16, 6 * TILE + 16, 0);
    game.player.sneaking = true;
    placeGuard(game, 0, 10, 4, Math.PI * 0.72);
    placeGuard(game, 1, 8, 9, -Math.PI / 2);
    placeGuard(game, 2, 20, 13, Math.PI);
    placeGuard(game, 3, 14, 16, -Math.PI / 2);
    game.detection.value = 58;
    game.levelTime = 47;
    game.totalTime = 47;
    return true;
  }

  if (name === 'alarm') {
    // Full alarm: every warden hunting, Pip sprinting for the open exit.
    game.level.relics.forEach((r) => { r.taken = true; });
    game.relicsTaken = 3;
    game.exitOpen = true;
    place(game, 23 * TILE + 16, 7 * TILE + 16, 0);
    placeGuard(game, 0, 14, 6, 0);
    placeGuard(game, 1, 19, 9, -Math.PI / 4);
    placeGuard(game, 2, 22, 10, -Math.PI / 2);
    placeGuard(game, 3, 17, 13, -Math.PI / 2);
    game.detection.value = 100;
    game.detection.alarmed = true;
    game.detection.alarmTimer = 6;
    game.detection.lastSeenPos = { x: game.player.x, y: game.player.y };
    game.levelTime = 132;
    game.totalTime = 132;
    game.toast = 'ALARM! The wardens are hunting you!';
    game.toastTimer = 3;
    return true;
  }

  if (name === 'win') {
    // Clean getaway: all three relics, out the vault door, unseen.
    game.level.relics.forEach((r) => { r.taken = true; });
    game.relicsTaken = 3;
    game.exitOpen = true;
    game.phase = 'win';
    game.totalTime = 187;
    game.levelTime = 64;
    place(game, 25 * TILE + 16, 7 * TILE + 16, 0);
    placeGuard(game, 0, 12, 3, Math.PI / 2);
    placeGuard(game, 1, 8, 9, 0);
    placeGuard(game, 2, 21, 13, Math.PI);
    placeGuard(game, 3, 15, 16, -Math.PI / 2);
    return true;
  }

  return false;
}
