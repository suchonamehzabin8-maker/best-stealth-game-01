[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/suchonamehzabin8-maker/best-stealth-game-01/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/suchonamehzabin8-maker/best-stealth-game-01/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# The Quiet Gallery — a stealth game

Pip the courier delivered the wrong parcel to the wrong museum, and it is
locked in the vault wing after closing. Slip in after dark, pocket the three
relics that prove the parcel is yours, and reach the glowing exit without
ever being caught. Three wings, each with more wardens and tighter cover.

Built for the make.fun bounty: https://make.fun/bounty/best-stealth-game-20261121-1759

## How to play

Open `game/index.html` in desktop Chrome (serve `game/` from any static
server, e.g. `node serve.ts` in the kit, or `python3 -m http.server` inside
`game/`). No build step, no network requests — every sound is synthesized
with WebAudio.

- **Move:** WASD or arrow keys
- **Sneak:** hold Shift — half speed, half the noise, wardens spot you half as fast
- **Throw a pebble:** click (or Space) — the nearest warden in earshot goes to investigate the sound
- **Mute:** M · **Restart:** R

Wardens patrol set routes (their dotted loops are drawn on the floor) with
lantern-lit vision cones. Crates block their sight, planters hide you
completely. The suspicion meter climbs when a warden sees you — faster up
close — and drains when you break line of sight, so a near miss is
recoverable. Fill it and the alarm sounds: every warden hunts you until you
stay hidden long enough for the hunt to end. Get caught during an alarm and
the run is over.

## Files

- `game/index.html` — the page, HUD and overlays
- `game/src/main.js` — bootstrap, frame loop, HUD wiring
- `game/src/game.js` — game state, win/lose, the per-frame update
- `game/src/level.js` — the three museum floors (tile maps, parsing, collision)
- `game/src/guards.js` — warden patrol, suspicion, investigation, chase
- `game/src/detection.js` — vision cones, line of sight, the suspicion meter
- `game/src/player.js` — Pip: walking, sneaking, pebble throws
- `game/src/audio.js` — synthesized footsteps, stings, alarms and chimes
- `game/src/render.js` — the top-down gallery, cones, lamps and night light
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — scripted scenes for the screenshots (`?shot=...`)
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
