// main.ts — The Quiet Gallery's hand-in program (Node 22, stdlib only).
//
// The game is plain static files under game/ (index.html plus ES modules, no
// build step, no network), and screenshots/ holds four renders of the game
// itself. This program copies both into /output (or MAKEFUN_OUTPUT_DIR
// outside the grader) and writes /output/dossier.json with buildDossier from
// the vendored make.fun library, so the judge can read the game.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps, from the kit: at most 4 screenshots of 256 KiB each,
// game/ at most 993 files and 48 MiB, paths at most 1000 bytes, and the
// dossier text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
