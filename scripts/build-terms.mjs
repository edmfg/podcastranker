// Regenerate public/terms.json from src/terms.js so the front-end and the CLI
// share one source of truth. Runs locally (npm run build:terms) and on Vercel
// (buildCommand in vercel.json).
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TERMS, CATEGORIES } from '../src/terms.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(
  join(root, 'public', 'terms.json'),
  JSON.stringify({ categories: CATEGORIES, terms: TERMS }, null, 2)
);
console.log(`Wrote public/terms.json — ${TERMS.length} terms, ${Object.keys(CATEGORIES).length} categories`);
