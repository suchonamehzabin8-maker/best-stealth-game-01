// level.js — the museum's floors: tile maps, parsing, walkability and sight blocking.
//
// Legend (one character per tile, 30 columns x 20 rows):
//   '#' wall        '.' floor       'C' crate (cover: blocks movement and sight)
//   'B' planter    'P' player start 'E' exit   'A' relic (collectable)
//   'L' lamp (light pool, decoration only)
//
// Levels are hand-drawn maps. Guards patrol between waypoints given in tile
// coordinates; every patrol leg runs along open floor so a guard never has to
// path around a wall.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;

const LEVEL_1 = {
  name: 'The Quiet Gallery',
  sub: 'Level 1 — learn the patrols',
  map: [
    '##############################',
    '#P...........................#',
    '#............................#',
    '#..CC....BB......CC.......A..#',
    '#..CC....BB......CC..........#',
    '#............................#',
    '#.....####.......####........#',
    '#.....#..#.......#..#....E...#',
    '#.A...#..#...CC..#..#........#',
    '#.....#..#...CC..#..#........#',
    '#.....####.......####........#',
    '#............................#',
    '#..CC.....BB.......CC........#',
    '#..CC.....BB.......CC....A...#',
    '#............................#',
    '#......####......####........#',
    '#......#..#......#..#........#',
    '#......#..#......#..#........#',
    '#............................#',
    '##############################',
  ],
  lamps: [[5, 2], [15, 2], [25, 2], [5, 17], [15, 17], [25, 17], [15, 9]],
  guards: [
    { waypoints: [[6, 2], [23, 2], [23, 5], [6, 5]], speed: 52 },
    { waypoints: [[2, 8], [5, 8], [5, 11], [2, 11]], speed: 48 },
    { waypoints: [[17, 12], [26, 12], [26, 14], [17, 14]], speed: 55 },
    { waypoints: [[8, 18], [19, 18], [19, 14], [8, 14]], speed: 46 },
  ],
};

const LEVEL_2 = {
  name: 'The Marble Wing',
  sub: 'Level 2 — more wardens, tighter cover',
  map: [
    '##############################',
    '#P....CC......BB......CC.....#',
    '#............................#',
    '#..####....####....####...A..#',
    '#..#..#....#..#....#..#......#',
    '#..#..#....#..#....#..#..E...#',
    '#..####....####....####......#',
    '#............................#',
    '#....CC.......BB.......CC....#',
    '#....CC.......BB.......CC....#',
    '#............................#',
    '#.A...####.....####......CC..#',
    '#.....#..#.....#..#......CC..#',
    '#.....#..#.....#..#.........##',
    '#.....####.....####..........#',
    '#............................#',
    '#..BB.....CC......BB.....A...#',
    '#..BB.....CC......BB.........#',
    '#............................#',
    '##############################',
  ],
  lamps: [[4, 1], [14, 1], [25, 1], [9, 9], [20, 9], [4, 18], [25, 18]],
  guards: [
    { waypoints: [[2, 2], [27, 2], [27, 7], [2, 7]], speed: 56 },
    { waypoints: [[5, 10], [14, 10], [14, 15], [5, 15]], speed: 58 },
    { waypoints: [[17, 10], [24, 10], [24, 15], [17, 15]], speed: 50 },
    { waypoints: [[3, 16], [12, 16], [12, 18], [3, 18]], speed: 54 },
    { waypoints: [[16, 16], [25, 16], [25, 18], [16, 18]], speed: 52 },
  ],
};

const LEVEL_3 = {
  name: 'The Gilded Vault',
  sub: 'Level 3 — the vault is never unwatched',
  map: [
    '##############################',
    '#P..CC....BB.....CC....BB....#',
    '#............................#',
    '#..###......###......###..A..#',
    '#..#.#......#.#......#.#.....#',
    '#..###......###......###.....#',
    '#.........................E..#',
    '#....CC......BB......CC......#',
    '#....CC......BB......CC......#',
    '#............................#',
    '#.A..####....####....####....#',
    '#....#..#....#..#....#..#....#',
    '#....#..#....#..#....#..#....#',
    '#....####....####....####....#',
    '#............................#',
    '#..BB....CC......BB....CC....#',
    '#..BB....CC......BB....CC..A.#',
    '#............................#',
    '#............................#',
    '##############################',
  ],
  lamps: [[6, 1], [15, 1], [24, 1], [10, 9], [19, 9], [6, 18], [24, 18]],
  guards: [
    { waypoints: [[2, 2], [11, 2], [11, 6], [2, 6]], speed: 60 },
    { waypoints: [[13, 2], [20, 2], [20, 6], [13, 6]], speed: 58 },
    { waypoints: [[25, 2], [25, 8], [16, 8], [16, 2]], speed: 62 },
    { waypoints: [[4, 9], [12, 9], [12, 14], [4, 14]], speed: 56 },
    { waypoints: [[17, 10], [26, 10], [26, 14], [17, 14]], speed: 60 },
    { waypoints: [[8, 18], [20, 18], [20, 16], [8, 16]], speed: 54 },
  ],
};

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];

// Parse a level definition into a grid of tile codes plus entity spawns.
export function parseLevel(def) {
  const grid = [];
  let playerStart = null;
  let exit = null;
  const relics = [];
  for (let y = 0; y < ROWS; y++) {
    const row = def.map[y];
    const out = [];
    for (let x = 0; x < COLS; x++) {
      const ch = row[x];
      if (ch === 'P') { playerStart = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; out.push('.'); }
      else if (ch === 'E') { exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; out.push('.'); }
      else if (ch === 'A') { relics.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false }); out.push('.'); }
      else out.push(ch);
    }
    grid.push(out);
  }
  return {
    name: def.name,
    sub: def.sub,
    grid,
    lamps: def.lamps.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
    playerStart,
    exit,
    relics,
    guardDefs: def.guards.map((g) => ({
      waypoints: g.waypoints.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
      speed: g.speed,
    })),
  };
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

// A tile the player and guards can stand on.
export function isWalkable(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '.' || t === 'B' || t === 'L';
}

// A tile that stops a line of sight: walls and crates. Planters are low
// cover — they hide a crouching thief but a warden can see over them.
export function blocksSight(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'C';
}

// Is this point inside a planter? Standing in one hides the thief outright.
export function inPlanter(level, px, py) {
  return tileAt(level, px, py) === 'B';
}

// Circle-vs-tile collision: can a circle of radius r sit at (px, py)?
export function canStand(level, px, py, r) {
  return (
    isWalkable(level, px - r, py - r) &&
    isWalkable(level, px + r, py - r) &&
    isWalkable(level, px - r, py + r) &&
    isWalkable(level, px + r, py + r)
  );
}
