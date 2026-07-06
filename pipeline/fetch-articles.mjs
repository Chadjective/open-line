#!/usr/bin/env node
// fetch-articles.mjs — RSS ingestion for one instance.
//
// Loads instances/<id>/config.json, pulls every feed in config.rss_sources,
// keeps entries that mention a configured keyword, dedupes against the existing
// articles.json, and returns the NEW entries (with a best-effort article body)
// for summarize.mjs to enrich. Politician-agnostic — everything comes from config.
//
//   node pipeline/fetch-articles.mjs <instance_id>     # dry run: print fresh count

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'rss-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'OpenLineBot/1.0 (+https://openline.ca)' },
  customFields: { item: [['content:encoded', 'contentEncoded']] },
});

export function loadInstance(instanceId) {
  const dir = resolve(root, 'instances', instanceId);
  if (!existsSync(resolve(dir, 'config.json'))) {
    throw new Error(`No config.json for instance "${instanceId}"`);
  }
  const config = JSON.parse(readFileSync(resolve(dir, 'config.json'), 'utf8'));
  const articlesPath = resolve(dir, 'articles.json');
  const existing = existsSync(articlesPath)
    ? JSON.parse(readFileSync(articlesPath, 'utf8'))
    : { instance_id: instanceId, last_updated: null, articles: [] };
  return { dir, articlesPath, config, existing };
}

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);

export function makeId(entry, sourceName) {
  const date = (entry.published_at || '').slice(0, 10);
  return [date, slug(sourceName), slug(entry.title)].filter(Boolean).join('-');
}

export function matchesKeywords(text, keywords) {
  const hay = (text || '').toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

function stripHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pull readable paragraph text from a fetched HTML page (no jsdom dependency).
function extractArticleText(html = '') {
  const m = html.match(/<article[\s\S]*?<\/article>/i);
  const scope = m ? m[0] : html;
  const paras = [...scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((x) => stripHtml(x[1]))
    .filter((t) => t.length > 40);
  return paras.join('\n').slice(0, 8000);
}

async function fetchPageBody(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'OpenLineBot/1.0 (+https://openline.ca)' },
    });
    if (!res.ok) {
      // Abandoned response bodies hold sockets open and can keep the process alive — cancel.
      await res.body?.cancel().catch(() => {});
      return '';
    }
    return extractArticleText(await res.text());
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

// Best available body: prefer the feed's full content, fall back to the page.
async function bestBody(item, link) {
  const feedBody = stripHtml(item.contentEncoded || item.content || item.contentSnippet || item.summary || '');
  if (feedBody.length >= 800) return feedBody.slice(0, 8000);
  const page = await fetchPageBody(link);
  return (page.length > feedBody.length ? page : feedBody).slice(0, 8000);
}

export async function fetchFreshArticles(instanceId) {
  const { config, existing } = loadInstance(instanceId);
  const seen = new Set(existing.articles.map((a) => a.id));

  const entries = [];
  for (const source of config.rss_sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items || []) {
        entries.push({ item, sourceName: source.name });
      }
    } catch (err) {
      console.warn(`  [${instanceId}] feed failed: ${source.name} — ${err.message}`);
    }
  }

  const fresh = [];
  for (const { item, sourceName } of entries) {
    const title = (item.title || '').trim();
    const link = item.link || item.guid || '';
    const haystack = `${title} ${item.contentSnippet || item.content || ''}`;
    if (!title || !link) continue;
    if (!matchesKeywords(haystack, config.filter_keywords)) continue;

    const published_at = item.isoDate || item.pubDate || '';
    const base = {
      title,
      source_name: sourceName,
      source_url: link,
      published_at: published_at ? new Date(published_at).toISOString() : '',
    };
    const id = makeId(base, sourceName);
    if (seen.has(id)) continue;
    seen.add(id); // also dedupe within this run

    fresh.push({ ...base, id, body: await bestBody(item, link) });
  }

  console.log(`  [${instanceId}] ${entries.length} entries scanned, ${fresh.length} new and on-topic`);
  return { config, existing, fresh };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2] || 'calldoug';
  fetchFreshArticles(id)
    .then(({ fresh }) => {
      for (const a of fresh) console.log(`   • ${a.source_name}: ${a.title} (body ${a.body.length} chars)`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
