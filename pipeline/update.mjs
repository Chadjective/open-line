#!/usr/bin/env node
// update.mjs — the entrypoint the scheduled job runs.
//
//   node pipeline/update.mjs --all            # update every instance (+ cross-post)
//   node pipeline/update.mjs calldoug         # update one instance (no cross-post)
//   node pipeline/update.mjs --all --dry-run  # fetch + dedupe only, no model calls, no writes
//
// Cross-level stories: after each instance summarizes its own matches, any article the
// model flags as implicating MULTIPLE levels of government is offered to the other
// instances at those levels. Each instance's own prompt then validates relevance and
// writes its own framing — so one federal/provincial/municipal story can land on all three.

import { readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  prepareInstance,
  summarizeArticle,
  commitInstance,
  commitHeld,
  summarizeInstance,
  loadTemplate,
  modelToken,
} from './summarize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const instancesDir = resolve(__dirname, '..', 'instances');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wantsAll = args.includes('--all');
const named = args.filter((a) => !a.startsWith('--'));

function discoverInstances() {
  return readdirSync(instancesDir).filter((name) => {
    const full = resolve(instancesDir, name);
    return statSync(full).isDirectory() && existsSync(resolve(full, 'config.json'));
  });
}

// Which instances should a multi-level story be cross-posted to?
// Pure + exported for testing. Offers only to instances whose level is implicated
// and that don't already have the article; the model still gates relevance downstream.
export function crosspostTargets(levels, instancesMeta, haveIds) {
  if (!Array.isArray(levels) || levels.length < 2) return [];
  return instancesMeta.filter((m) => levels.includes(m.level) && !haveIds.has(m.id)).map((m) => m.id);
}

const instances = wantsAll ? discoverInstances() : named;
if (!instances.length) {
  console.error('Usage: node pipeline/update.mjs (--all | <instance_id> ...) [--dry-run]');
  process.exit(1);
}
if (!dryRun && !modelToken()) {
  console.error('No model token. Set GITHUB_TOKEN (with models:read) / GH_TOKEN, or run with --dry-run.');
  process.exit(1);
}

console.log(`Open Line pipeline — ${dryRun ? 'DRY RUN' : 'live'} — instances: ${instances.join(', ')}\n`);

let totalAdded = 0;
let failures = 0;

// Single-instance run (or dry run): no cross-post — keep it simple and side-effect-light.
if (dryRun || instances.length === 1) {
  for (const id of instances) {
    console.log(`== ${id} ==`);
    try {
      const r = await summarizeInstance(id, { dryRun });
      totalAdded += r.added || 0;
    } catch (err) {
      failures += 1;
      console.error(`  [${id}] FAILED: ${err.message}`);
    }
  }
} else {
  const template = loadTemplate();

  // Prepare every instance (fetch + dedupe).
  const preps = {};
  for (const id of instances) {
    try {
      preps[id] = await prepareInstance(id);
    } catch (err) {
      failures += 1;
      console.error(`  [${id}] prepare FAILED: ${err.message}`);
    }
  }
  const live = Object.values(preps);
  const meta = live.map((p) => ({ id: p.id, level: p.config.level }));

  const newByInstance = Object.fromEntries(live.map((p) => [p.id, []]));
  const heldByInstance = Object.fromEntries(live.map((p) => [p.id, []]));
  const rawById = new Map(); // id -> raw article (with body), from any feed
  const haveIds = new Map(); // articleId -> Set of instance ids that have it
  const levelsById = new Map(); // articleId -> union of levels from PUBLISHED summaries

  const has = (articleId, instId) => (haveIds.get(articleId) || new Set()).has(instId);
  const mark = (articleId, instId) => {
    if (!haveIds.has(articleId)) haveIds.set(articleId, new Set());
    haveIds.get(articleId).add(instId);
  };
  for (const p of live) for (const a of [...p.existing.articles, ...p.held.articles]) mark(a.id, p.id);

  // Pass 1 — each instance summarizes its own keyword matches.
  for (const p of live) {
    console.log(`== ${p.id} (direct) ==`);
    for (const article of p.fresh) {
      rawById.set(article.id, article);
      try {
        const enriched = await summarizeArticle(template, p.config, article);
        if (!enriched) {
          console.log(`  [${p.id}] – skipped (irrelevant): ${article.title}`);
          continue;
        }
        mark(article.id, p.id);
        if (enriched.hold_for_review) {
          // Self-gated: goes to the review digest, not the feed — and does NOT drive
          // cross-posting (a story we won't publish here shouldn't be pushed elsewhere
          // on our initiative; each instance can still match it via its own keywords).
          heldByInstance[p.id].push(enriched);
          console.log(`  [${p.id}] ⏸ held for review: ${article.title} — ${enriched.hold_reason}`);
          continue;
        }
        newByInstance[p.id].push(enriched);
        const prev = levelsById.get(article.id) || new Set();
        enriched.levels.forEach((l) => prev.add(l));
        levelsById.set(article.id, prev);
        console.log(`  [${p.id}] ✓ ${article.title}  [levels: ${enriched.levels.join(', ') || 'n/a'}]`);
      } catch (err) {
        console.error(`  [${p.id}] ✗ ${article.title} — ${err.message}`);
      }
    }
  }

  // Pass 2 — cross-post multi-level stories to the other implicated instances.
  console.log(`\n== cross-level pass ==`);
  for (const [articleId, levelSet] of levelsById) {
    const levels = [...levelSet];
    const targets = crosspostTargets(levels, meta, haveIds.get(articleId) || new Set());
    if (!targets.length) continue;
    const raw = rawById.get(articleId);
    for (const targetId of targets) {
      const p = preps[targetId];
      try {
        const enriched = await summarizeArticle(template, p.config, raw);
        if (!enriched) {
          console.log(`  → ${targetId}: not relevant to this office — skipped`);
          continue;
        }
        mark(articleId, targetId);
        if (enriched.hold_for_review) {
          heldByInstance[targetId].push(enriched);
          console.log(`  → ${targetId}: ⏸ held for review — ${enriched.hold_reason}`);
          continue;
        }
        newByInstance[targetId].push(enriched);
        console.log(`  → ${targetId}: cross-posted "${raw.title}"`);
      } catch (err) {
        console.error(`  → ${targetId}: cross-post failed — ${err.message}`);
      }
    }
  }

  // Pass 3 — write each instance's feed and held registry.
  console.log('');
  let totalHeld = 0;
  for (const p of live) {
    const h = commitHeld(p, heldByInstance[p.id]);
    totalHeld += h.held || 0;
    const r = commitInstance(p, newByInstance[p.id]);
    totalAdded += r.added || 0;
    if (r.added) console.log(`  [${p.id}] wrote ${r.added} new (feed now ${r.total})`);
    if (h.held) console.log(`  [${p.id}] held ${h.held} for review`);
  }

  // Pass 4 — the daily human-review digest: what the gate held (with reasons and the
  // full drafted output), plus everything that auto-published (retroactive review).
  const reviewDir = resolve(__dirname, '..', 'review');
  const digestPath = resolve(reviewDir, 'digest.md');
  if (totalAdded || totalHeld) {
    if (!existsSync(reviewDir)) mkdirSync(reviewDir, { recursive: true });
    const lines = [`# OpenLine review digest — ${new Date().toISOString().slice(0, 10)}`, ''];
    lines.push(`**${totalAdded} auto-published · ${totalHeld} held for review.**`, '');
    if (totalHeld) {
      lines.push(`## ⏸ Held for review (${totalHeld})`, '');
      lines.push('Approve with `node pipeline/promote.mjs <instance> <article-id>`, or delete the entry from `instances/<instance>/held.json` to let the pipeline retry it fresh.', '');
      for (const p of live) {
        for (const a of heldByInstance[p.id]) {
          lines.push(`### [${p.id}] ${a.title}`);
          lines.push(`- **Why held:** ${a.hold_reason || '(no reason given)'}`);
          lines.push(`- **Source:** ${a.source_name} — ${a.source_url}`);
          lines.push(`- **Drafted ask:** ${a.suggested_ask}`);
          lines.push('', '<details><summary>Full drafted output</summary>', '', '```json', JSON.stringify(a, null, 2), '```', '', '</details>', '');
        }
      }
    }
    if (totalAdded) {
      lines.push(`## ✓ Auto-published (${totalAdded}) — retroactive review`, '');
      for (const p of live) {
        for (const a of newByInstance[p.id]) {
          lines.push(`- **[${p.id}]** ${a.title} ([source](${a.source_url})) — ask: “${a.suggested_ask}”`);
        }
      }
      lines.push('');
    }
    writeFileSync(digestPath, lines.join('\n'));
    console.log(`\n  review digest written: review/digest.md`);
  } else if (existsSync(digestPath)) {
    rmSync(digestPath); // nothing this run — an empty digest shouldn't trigger an issue
  }
}

console.log(`\nDone. ${totalAdded} new article(s) across ${instances.length} instance(s).`);
if (failures) {
  console.error(`${failures} instance(s) failed.`);
  process.exit(1);
}
// Exit explicitly: lingering keep-alive sockets/timers from feed + model fetches can hold the
// event loop open after all work is done — in CI that hung the job until the 6h kill switch.
process.exit(0);
