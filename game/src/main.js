// main.js — bootstrap: canvas, HUD, overlays, and the frame loop.
//
// The HUD and the title / win / caught screens are DOM above the canvas so
// they stay crisp; the game itself is one canvas. With ?shot=<name> in the
// URL the game renders one scripted frame and holds it still for a screenshot.

import { W, H, render } from './render.js';
import { createInput, wasPressed, consumePress } from './input.js';
import { createGame, startGame, updateGame, nextLevel, formatTime } from './game.js';
import { applyShot } from './shots.js';
import { loadLevel } from './game.js';
import { ensureAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

const hud = {
  objective: document.getElementById('hud-objective'),
  meter: document.getElementById('hud-meter-fill'),
  meterLabel: document.getElementById('hud-meter-label'),
  relics: document.getElementById('hud-relics'),
  time: document.getElementById('hud-time'),
  pebbles: document.getElementById('hud-pebbles'),
  level: document.getElementById('hud-level'),
  toast: document.getElementById('hud-toast'),
};

const overlays = {
  title: document.getElementById('overlay-title'),
  levelclear: document.getElementById('overlay-levelclear'),
  win: document.getElementById('overlay-win'),
  caught: document.getElementById('overlay-caught'),
  winTime: document.getElementById('win-time'),
  caughtText: document.getElementById('caught-text'),
  levelclearText: document.getElementById('levelclear-text'),
};

const game = createGame();
const input = createInput(canvas);
loadLevel(game, 0);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = shotName ? applyShot(game, shotName) : false;

function showOverlay(name) {
  for (const [key, el] of Object.entries(overlays)) {
    if (el && key !== 'winTime' && key !== 'caughtText' && key !== 'levelclearText') {
      el.classList.toggle('hidden', key !== name);
    }
  }
}

function updateHud() {
  const det = game.detection;
  hud.objective.textContent = game.exitOpen
    ? 'All relics pocketed — reach the glowing exit!'
    : `Pocket the relics, then slip out unseen — ${game.relicsTaken} of ${game.level.relics.length} found`;
  hud.meter.style.width = `${det.value}%`;
  hud.meter.className = 'meter-fill' + (det.alarmed ? ' alarmed' : det.value > 35 ? ' suspicious' : '');
  hud.meterLabel.textContent = det.alarmed ? 'ALARM' : det.value > 35 ? 'SPOTTED' : 'UNSEEN';
  hud.relics.textContent = `◆ ${game.relicsTaken}/${game.level.relics.length}`;
  hud.time.textContent = formatTime(game.totalTime);
  hud.pebbles.textContent = `● pebbles ${game.player.pebbles}`;
  hud.level.textContent = `${game.level.name} — ${game.levelIndex + 1}/3`;
  if (game.toastTimer > 0) {
    hud.toast.textContent = game.toast;
    hud.toast.classList.remove('hidden');
  } else {
    hud.toast.classList.add('hidden');
  }
}

function handlePhaseKeys() {
  if (game.phase === 'title' && (wasPressed(input, 'Enter') || input.clicked)) {
    consumePress(input, 'Enter');
    input.clicked = false;
    ensureAudio(game.audio);
    startGame(game);
    showOverlay(null);
  } else if (game.phase === 'levelclear' && (wasPressed(input, 'Enter') || input.clicked)) {
    consumePress(input, 'Enter');
    input.clicked = false;
    nextLevel(game);
    showOverlay(null);
  } else if ((game.phase === 'win' || game.phase === 'caught') && (wasPressed(input, 'KeyR') || wasPressed(input, 'Enter') || input.clicked)) {
    consumePress(input, 'KeyR');
    consumePress(input, 'Enter');
    input.clicked = false;
    startGame(game);
    showOverlay(null);
  }
}

let lastPhase = null;
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  game.time += dt;

  handlePhaseKeys();
  if (game.phase === 'playing') updateGame(game, input, dt);

  if (game.phase !== lastPhase) {
    lastPhase = game.phase;
    if (game.phase === 'title') showOverlay('title');
    else if (game.phase === 'levelclear') {
      overlays.levelclearText.textContent = `${game.level.name} cleared in ${formatTime(game.levelTime)} — the next wing awaits.`;
      showOverlay('levelclear');
    } else if (game.phase === 'win') {
      overlays.winTime.textContent = `All three wings cleared in ${formatTime(game.totalTime)} — unseen, unheard, gone.`;
      showOverlay('win');
    } else if (game.phase === 'caught') {
      overlays.caughtText.textContent = `Warden ${game.caughtBy + 1} caught Pip in the ${game.level.name}. The parcel stays in the vault… this time.`;
      showOverlay('caught');
    } else {
      showOverlay(null);
    }
  }

  render(ctx, game);
  updateHud();
  if (!shotMode) requestAnimationFrame(frame);
}

if (shotMode) {
  // One frozen frame for the screenshot; still paint the HUD and overlays.
  if (game.phase === 'title') {
    showOverlay('title');
  } else if (game.phase === 'win') {
    overlays.winTime.textContent = `All three wings cleared in ${formatTime(game.totalTime)} — unseen, unheard, gone.`;
    showOverlay('win');
  } else {
    showOverlay(null);
  }
  render(ctx, game);
  updateHud();
  window.__shotReady = true;
} else {
  showOverlay('title');
  requestAnimationFrame(frame);
}
