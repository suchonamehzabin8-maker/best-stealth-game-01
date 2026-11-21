// game.js — the game itself: state, the per-frame update, win and lose.
//
// States: title → playing → (levelclear → next level) → win, or caught.
// The thief wins a level by pocketing every relic and slipping out of the
// glowing exit unseen. A warden that touches the thief during a full alarm
// ends the run.

import { LEVELS, parseLevel, canStand, TILE } from './level.js';
import { createDetection, updateDetection, guardSeesPlayer } from './detection.js';
import { createGuard, updateGuard, alertGuardsToNoise } from './guards.js';
import { createPlayer, updatePlayer, throwPebble, PLAYER_RADIUS } from './player.js';
import {
  createAudio, ensureAudio, startAmbientPad, toggleMute,
  playFootstep, playGuardStep, playSuspicionSting, playAlarmStart,
  playPickup, playPebble, playWinChime, playCaught,
} from './audio.js';

export function createGame() {
  return {
    phase: 'title', // title | playing | levelclear | win | caught
    levelIndex: 0,
    level: null,
    player: null,
    guards: [],
    detection: createDetection(),
    relicsTaken: 0,
    exitOpen: false,
    time: 0,
    levelTime: 0,
    totalTime: 0,
    audio: createAudio(),
    toast: '',
    toastTimer: 0,
    nearMissShown: false,
    caughtBy: null,
  };
}

export function loadLevel(game, index) {
  game.levelIndex = index;
  game.level = parseLevel(LEVELS[index]);
  game.player = createPlayer(game.level.playerStart);
  game.guards = game.level.guardDefs.map((d, i) => createGuard(d, i));
  game.detection = createDetection();
  game.relicsTaken = 0;
  game.exitOpen = false;
  game.levelTime = 0;
  game.toast = '';
  game.nearMissShown = false;
  game.caughtBy = null;
}

export function startGame(game) {
  game.totalTime = 0;
  loadLevel(game, 0);
  game.phase = 'playing';
  ensureAudio(game.audio);
  startAmbientPad(game.audio);
}

function setToast(game, text, seconds = 2.5) {
  game.toast = text;
  game.toastTimer = seconds;
}

export function updateGame(game, input, dt) {
  if (game.phase !== 'playing') return;
  game.time += dt;
  game.levelTime += dt;
  game.totalTime += dt;
  if (game.toastTimer > 0) game.toastTimer -= dt;

  const audio = game.audio;
  const player = game.player;
  const level = game.level;

  // Mute toggle.
  if (input.pressedKeys.has('KeyM')) {
    input.pressedKeys.delete('KeyM');
    const muted = toggleMute(audio);
    setToast(game, muted ? 'Sound off (M to turn back on)' : 'Sound on', 1.5);
  }

  // Movement and footsteps.
  updatePlayer(player, input, level, dt, canStand);
  if (player.justStepped) playFootstep(audio, player.sneaking, player.stepSide);

  // Pebble toss: click or Space, toward the mouse (or straight ahead).
  const wantPebble = input.clicked || input.pressedKeys.has('Space');
  if (wantPebble) {
    input.clicked = false;
    input.pressedKeys.delete('Space');
    ensureAudio(audio);
    const tx = input.clickX ?? player.x + Math.cos(player.facing) * 120;
    const ty = input.clickY ?? player.y + Math.sin(player.facing) * 120;
    const landing = throwPebble(player, tx, ty);
    if (landing) {
      playPebble(audio);
      const warden = alertGuardsToNoise(game.guards, level, landing.x, landing.y);
      if (warden) setToast(game, 'A warden heard that — he is coming to look', 2);
    }
  }

  // Vision: the nearest distance at which any warden sees the thief.
  let nearestSeen = null;
  for (const guard of game.guards) {
    const d = guardSeesPlayer(level, guard, player);
    if (d !== null && (nearestSeen === null || d < nearestSeen)) nearestSeen = d;
  }
  const wasAlarmed = game.detection.alarmed;
  const wasSuspicious = game.detection.value > 35;
  updateDetection(game.detection, nearestSeen, player.sneaking, dt);
  if (nearestSeen !== null) {
    game.detection.lastSeenPos = { x: player.x, y: player.y };
  }
  if (!wasSuspicious && game.detection.value > 35 && !game.detection.alarmed) {
    playSuspicionSting(audio);
    setToast(game, 'Spotted! Break line of sight — now!', 2);
  }
  if (!wasAlarmed && game.detection.alarmed) {
    playAlarmStart(audio);
    setToast(game, 'ALARM! The wardens are hunting you!', 3);
  }
  // A near miss: suspicion climbed past half and then fell away.
  if (!game.nearMissShown && game.detection.value > 50) game.nearMissShown = true;
  if (game.nearMissShown && game.detection.value < 15 && !game.detection.alarmed) {
    game.nearMissShown = false;
    setToast(game, 'Close one — they lost you. Breathe.', 2.5);
  }

  // Wardens move; a chase that reaches the thief ends the run.
  for (const guard of game.guards) {
    const stepBefore = Math.floor(guard.stepPhase);
    const result = updateGuard(guard, level, player, game.detection, dt, canStand);
    if (result === 'caught') {
      game.phase = 'caught';
      game.caughtBy = guard.id;
      playCaught(audio);
      return;
    }
    // Guard footsteps: audible when a warden walks near.
    if (Math.floor(guard.stepPhase) !== stepBefore) {
      playGuardStep(audio, Math.hypot(guard.x - player.x, guard.y - player.y));
    }
  }

  // Relics: walk over one to pocket it.
  for (const relic of level.relics) {
    if (!relic.taken && Math.hypot(relic.x - player.x, relic.y - player.y) < PLAYER_RADIUS + 14) {
      relic.taken = true;
      game.relicsTaken += 1;
      playPickup(audio);
      if (game.relicsTaken >= level.relics.length) {
        game.exitOpen = true;
        playWinChime(audio);
        setToast(game, 'All relics pocketed — the vault door is open. Run for the exit!', 3);
      } else {
        setToast(game, `Relic pocketed — ${game.relicsTaken} of ${level.relics.length}`, 2);
      }
    }
  }

  // Exit: only open once every relic is pocketed.
  if (game.exitOpen && Math.hypot(level.exit.x - player.x, level.exit.y - player.y) < TILE) {
    if (game.levelIndex + 1 < LEVELS.length) {
      game.phase = 'levelclear';
    } else {
      game.phase = 'win';
      playWinChime(audio);
    }
  }
}

export function nextLevel(game) {
  loadLevel(game, game.levelIndex + 1);
  game.phase = 'playing';
  setToast(game, `${game.level.name} — ${game.level.sub}`, 3);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
