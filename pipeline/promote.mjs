#!/usr/bin/env node
// promote.mjs — human-review action: publish a held article into the live feed.
//
//   node pipeline/promote.mjs <instance_id> <article_id>
//   node pipeline/promote.mjs calldoug 2026-07-06-ricochet-some-story
//
// Moves the item out of instances/<id>/held.json, strips the gate fields, and merges
// it into articles.json (newest-first, trimmed/archived like any pipeline write).
// Commit + push afterwards (the deploy dispatch publishes it). To REJECT a held item
// permanently, just leave it in held.json — it stays deduped and never publishes.

import { writeFileSync } from 'node:fs';
import { loadInstance } from './fetch-articles.mjs';
import { trimAndArchive } from './summarize.mjs';

const [instanceId, articleId] = process.argv.slice(2);
if (!instanceId || !articleId) {
  console.error('Usage: node pipeline/promote.mjs <instance_id> <article_id>');
  process.exit(1);
}

const { dir, articlesPath, heldPath, existing, held } = loadInstance(instanceId);
const item = held.articles.find((a) => a.id === articleId);
if (!item) {
  console.error(`No held article "${articleId}" in ${instanceId}. Held ids:`);
  for (const a of held.articles) console.error(`  - ${a.id}`);
  process.exit(1);
}

const { hold_for_review, hold_reason, held_at, ...clean } = item;
const remaining = held.articles.filter((a) => a.id !== articleId);
const merged = trimAndArchive(dir, [clean, ...existing.articles.filter((a) => a.id !== articleId)]);

writeFileSync(
  articlesPath,
  JSON.stringify({ instance_id: instanceId, last_updated: new Date().toISOString(), articles: merged }, null, 2) + '\n',
);
writeFileSync(heldPath, JSON.stringify({ instance_id: instanceId, articles: remaining }, null, 2) + '\n');

console.log(`Promoted "${item.title}" to ${instanceId} feed (${merged.length} articles).`);
console.log('Now commit + push — the deploy will publish it.');
process.exit(0);
