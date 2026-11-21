// render.js — everything the eye sees: the gallery floor, lamp light, crates
// and planters, wardens with their vision cones, Pip the courier, the relics
// and the vault exit. Top-down, hand-drawn with canvas shapes — no images.

import { TILE, COLS, ROWS } from './level.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE } from './detection.js';
import { guardCone } from './guards.js';

const W = COLS * TILE;
const H = ROWS * TILE;

// Pre-render the static floor once: checker tiles with a faint grain.
function buildFloorPattern() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#232a3d' : '#202637';
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,0.02)';
      g.fillRect(x * TILE, y * TILE, TILE, 2);
    }
  }
  // Speckled marble grain.
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    g.fillRect(x, y, 2, 2);
  }
  return c;
}

let floorPattern = null;

function drawCone(ctx, guard, color, alpha) {
  const cone = guardCone(guard);
  const grad = ctx.createRadialGradient(cone.x, cone.y, 10, cone.x, cone.y, GUARD_RANGE);
  grad.addColorStop(0, color.replace('A', String(alpha)));
  grad.addColorStop(0.75, color.replace('A', String(alpha * 0.55)));
  grad.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cone.x, cone.y);
  ctx.arc(cone.x, cone.y, GUARD_RANGE, cone.facing - GUARD_HALF_ANGLE, cone.facing + GUARD_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
}

function drawGuard(ctx, guard, detection) {
  const suspicious = detection.value > 35 && !detection.alarmed;
  const color = detection.alarmed
    ? 'rgba(255,70,60,A)'
    : suspicious
      ? 'rgba(255,170,60,A)'
      : 'rgba(255,214,90,A)';
  drawCone(ctx, guard, color, detection.alarmed ? 0.34 : suspicious ? 0.3 : 0.22);

  // Faint dotted patrol route, so the player can learn the loop.
  ctx.strokeStyle = 'rgba(255,214,90,0.16)';
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  guard.waypoints.forEach((w, i) => {
    if (i === 0) ctx.moveTo(w.x, w.y);
    else ctx.lineTo(w.x, w.y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Body: maroon uniform, brass buttons, a cap.
  const bob = Math.sin(guard.stepPhase * 2) * 1.2;
  ctx.fillStyle = '#7e2a33';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();
  // Nose: the direction the warden faces.
  ctx.fillStyle = '#f5d98a';
  ctx.beginPath();
  ctx.arc(
    guard.x + Math.cos(guard.facing) * 13,
    guard.y + Math.sin(guard.facing) * 13,
    3.5, 0, Math.PI * 2,
  );
  ctx.fill();

  // "?" while suspicious, "!" while hunting.
  if (detection.alarmed || suspicious) {
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = detection.alarmed ? '#ff5040' : '#ffb13d';
    ctx.fillText(detection.alarmed ? '!' : '?', guard.x, guard.y - 20);
  }
}

function drawPlayer(ctx, player) {
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 9, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Teal cloak, hood, and a pale face looking where Pip moves.
  ctx.fillStyle = player.hiddenInPlanter ? '#2f8f7a' : '#35b5a0';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8fff8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f4e9d2';
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(player.facing) * 6,
    player.y + Math.sin(player.facing) * 6,
    5, 0, Math.PI * 2,
  );
  ctx.fill();
  // Sneaking: a low crouch ring around Pip.
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(53,181,160,0.7)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Hidden in a planter: leafy cover over Pip.
  if (player.hiddenInPlanter) {
    ctx.fillStyle = 'rgba(46,125,72,0.85)';
    for (const [ox, oy] of [[-7, -6], [7, -7], [0, -10], [-8, 3], [8, 3]]) {
      ctx.beginPath();
      ctx.arc(player.x + ox, player.y + oy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRelic(ctx, relic, time) {
  if (relic.taken) return;
  const pulse = 0.6 + Math.sin(time * 3 + relic.x) * 0.25;
  ctx.save();
  ctx.translate(relic.x, relic.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = `rgba(255,205,80,${pulse})`;
  ctx.shadowColor = '#ffcd50';
  ctx.shadowBlur = 14;
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(relic.x, relic.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawExit(ctx, exit, open, time) {
  const glow = open ? 0.85 : 0.35;
  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.fillStyle = `rgba(80,255,150,${glow * 0.25})`;
  ctx.shadowColor = '#50ff96';
  ctx.shadowBlur = open ? 22 : 8;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Door frame and arrow.
  ctx.strokeStyle = '#50ff96';
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 11, exit.y - 11, 22, 22);
  ctx.fillStyle = '#d9ffe9';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bounce = open ? Math.sin(time * 4) * 2 : 0;
  ctx.fillText('➤', exit.x, exit.y + bounce);
  ctx.textBaseline = 'alphabetic';
  if (!open) {
    ctx.fillStyle = 'rgba(217,255,233,0.75)';
    ctx.font = '11px sans-serif';
    ctx.fillText('locked', exit.x, exit.y + 26);
  }
}

export function render(ctx, state) {
  const { level, player, guards, detection, time } = state;
  if (!floorPattern) floorPattern = buildFloorPattern();
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(floorPattern, 0, 0);

  // Warm lamp pools on the floor.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of level.lamps) {
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, 120);
    grad.addColorStop(0, 'rgba(255,190,90,0.20)');
    grad.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 120, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Walls, crates and planters.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = level.grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (t === '#') {
        ctx.fillStyle = '#3a4157';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#4d5878';
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
      } else if (t === 'C') {
        ctx.fillStyle = '#6b4a2b';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = '#8a6238';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 2);
        ctx.lineTo(px + TILE - 2, py + TILE - 2);
        ctx.moveTo(px + TILE - 2, py + 2);
        ctx.lineTo(px + 2, py + TILE - 2);
        ctx.stroke();
      } else if (t === 'B') {
        ctx.fillStyle = '#2e7d48';
        for (const [ox, oy] of [[9, 10], [22, 9], [16, 20], [10, 23], [23, 22]]) {
          ctx.beginPath();
          ctx.arc(px + ox, py + oy, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#4caf6d';
        ctx.beginPath();
        ctx.arc(px + 15, py + 14, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === 'L') {
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Lamp posts.
  for (const lamp of level.lamps) {
    ctx.fillStyle = '#1c2130';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffce6b';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const relic of level.relics) drawRelic(ctx, relic, time);
  drawExit(ctx, level.exit, state.exitOpen, time);

  // The pebble: a small stone, then a ringing circle where it landed.
  if (player.pebble) {
    const p = player.pebble;
    ctx.fillStyle = '#c9c9c9';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (p.landed) {
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p.ring)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 + p.ring * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (const guard of guards) drawGuard(ctx, guard, detection);
  drawPlayer(ctx, player);

  // Night vignette centred on Pip: the lit floor near the thief, dark at the
  // edges — it shows at a glance where it is safe to stand.
  const vg = ctx.createRadialGradient(player.x, player.y, 130, player.x, player.y, 560);
  vg.addColorStop(0, 'rgba(3,5,14,0)');
  vg.addColorStop(1, 'rgba(3,5,14,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

export { W, H };
