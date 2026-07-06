#!/usr/bin/env node
// Builds the platform meta-site into dist/:
//   - dist/issues.json : every article across all built instances, plus the issue index
//   - dist/index.html  : an interactive "issue-first" browser — pick an issue (e.g. housing)
//                        and see it across all three levels of government at once.
// Reads the platform roster + each instance's config/articles; adding an instance needs no edit.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const platform = JSON.parse(readFileSync(resolve(root, 'platform.json'), 'utf8'));

const built = platform.siblings.filter((s) => existsSync(resolve(distDir, s.instance_id)));

const instances = [];
const articles = [];
for (const s of built) {
  const config = JSON.parse(readFileSync(resolve(root, 'instances', s.instance_id, 'config.json'), 'utf8'));
  instances.push({
    instance_id: s.instance_id,
    platform_name: s.platform_name,
    level: s.level || config.level || '',
    accent_color: config.accent_color,
  });
  const feed = JSON.parse(readFileSync(resolve(root, 'instances', s.instance_id, 'articles.json'), 'utf8'));
  for (const a of feed.articles || []) {
    articles.push({
      instance_id: s.instance_id,
      platform_name: s.platform_name,
      accent_color: config.accent_color,
      level: s.level || config.level || '',
      id: a.id,
      title: a.title,
      source_name: a.source_name,
      published_at: a.published_at,
      tags: a.tags || [],
      levels: a.levels || [],
      blurb: (a.summary || '').split('\n')[0].slice(0, 160),
      href: `./${s.instance_id}/#/a/${encodeURIComponent(a.id)}`,
    });
  }
}
articles.sort((a, b) => Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0));

// Issue index: each tag → which instances cover it. Cross-cutting issues (≥2 instances) first.
const tagInstances = {};
for (const a of articles) for (const t of a.tags) (tagInstances[t] ||= new Set()).add(a.instance_id);
const issues = Object.entries(tagInstances)
  .map(([tag, set]) => ({ tag, instances: [...set], count: articles.filter((a) => a.tags.includes(tag)).length }))
  .sort((a, b) => b.instances.length - a.instances.length || b.count - a.count);

const data = {
  platform: { name: platform.name, tagline: platform.tagline },
  instances,
  issues,
  articles,
};
writeFileSync(resolve(distDir, 'issues.json'), JSON.stringify(data, null, 2));

const a = platform.analytics || {};
const analyticsSnippet =
  a.enabled && a.domain
    ? `<script defer data-domain="${a.domain}" src="${a.src || 'https://plausible.io/js/script.js'}"></script>`
    : '';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${platform.name} — accountability across every level</title>
  <meta name="description" content="${platform.tagline}" />
  ${analyticsSnippet}
  <style>
    :root { color-scheme: dark; --bg:#0D0D1F; --card:#181834; --border:#28284d; --text:#F4F4F8; --dim:#A6A6C2; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); padding:0 16px 56px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; -webkit-font-smoothing:antialiased; }
    .wrap { max-width:720px; margin:0 auto; }
    header { padding:36px 0 8px; text-align:center; }
    h1 { margin:0 0 6px; font-size:30px; letter-spacing:-0.02em; }
    .tag { margin:0; color:var(--dim); }
    .inst-row { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin:18px 0 8px; }
    .inst { display:flex; flex-direction:column; gap:2px; text-decoration:none; color:inherit;
      background:var(--card); border:1px solid var(--border); border-left-width:4px; border-radius:12px; padding:10px 16px; }
    .inst .n { font-weight:800; }
    .inst .l { font-size:11px; color:var(--dim); text-transform:capitalize; }
    h2 { font-size:14px; text-transform:uppercase; letter-spacing:0.06em; color:var(--dim); margin:28px 0 10px; }
    .chips { display:flex; flex-wrap:wrap; gap:8px; }
    .chip { cursor:pointer; background:var(--card); color:var(--dim); border:1px solid var(--border);
      border-radius:999px; padding:7px 13px; font-size:13px; text-transform:capitalize; }
    .chip.cross { color:var(--text); }
    .chip.cross::before { content:"◆ "; color:#7b7bf0; }
    .chip.active { background:#5b5be0; color:#fff; border-color:#5b5be0; }
    .results { display:flex; flex-direction:column; gap:12px; margin-top:16px; }
    .card { display:block; text-decoration:none; color:inherit; background:var(--card);
      border:1px solid var(--border); border-left-width:4px; border-radius:14px; padding:14px 16px; }
    .meta { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--dim); margin-bottom:6px; flex-wrap:wrap; }
    .badge { font-weight:700; }
    .lv { font-size:11px; border:1px solid var(--border); border-radius:999px; padding:1px 7px; text-transform:capitalize; color:var(--dim); }
    .title { font-size:16px; font-weight:600; margin:0 0 6px; line-height:1.3; }
    .blurb { margin:0; font-size:14px; color:var(--dim); }
    .empty { color:var(--dim); padding:20px 0; }
    .count { color:var(--dim); font-weight:400; font-size:13px; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${platform.name}</h1>
      <p class="tag">${platform.tagline}</p>
      <div class="inst-row" id="instances"></div>
    </header>
    <h2>Browse by issue <span class="count">— ◆ spans multiple levels</span></h2>
    <div class="chips" id="chips"></div>
    <div class="results" id="results"></div>
  </div>
  <script>
    const esc = (s) => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let DATA, active = '';
    fetch('./issues.json').then(r => r.json()).then(d => { DATA = d; renderInstances(); renderChips(); renderResults(); });

    function renderInstances() {
      document.getElementById('instances').innerHTML = DATA.instances.map(i =>
        \`<a class="inst" style="border-left-color:\${esc(i.accent_color)}" href="./\${esc(i.instance_id)}/">
          <span class="n">\${esc(i.platform_name)}</span><span class="l">\${esc(i.level)}</span></a>\`).join('');
    }
    function renderChips() {
      const all = \`<button class="chip \${active===''?'active':''}" data-tag="">All issues</button>\`;
      const chips = DATA.issues.map(iss => {
        const cross = iss.instances.length >= 2 ? 'cross' : '';
        const on = active === iss.tag ? 'active' : '';
        return \`<button class="chip \${cross} \${on}" data-tag="\${esc(iss.tag)}">\${esc(iss.tag)}</button>\`;
      }).join('');
      const el = document.getElementById('chips');
      el.innerHTML = all + chips;
      el.querySelectorAll('.chip').forEach(b => b.onclick = () => { active = b.dataset.tag; renderChips(); renderResults(); });
    }
    function renderResults() {
      const list = active ? DATA.articles.filter(a => a.tags.includes(active)) : DATA.articles;
      const el = document.getElementById('results');
      if (!list.length) { el.innerHTML = '<p class="empty">No stories yet.</p>'; return; }
      el.innerHTML = list.map(a => {
        const lvls = (a.levels||[]).map(l => \`<span class="lv">\${esc(l)}</span>\`).join('');
        const date = a.published_at ? new Date(a.published_at).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}) : '';
        return \`<a class="card" style="border-left-color:\${esc(a.accent_color)}" href="\${esc(a.href)}">
          <div class="meta"><span class="badge" style="color:\${esc(a.accent_color)}">\${esc(a.platform_name)}</span>
            <span>·</span><span>\${esc(a.source_name)}</span><span>·</span><span>\${esc(date)}</span>\${lvls}</div>
          <p class="title">\${esc(a.title)}</p><p class="blurb">\${esc(a.blurb)}…</p></a>\`;
      }).join('');
    }
  </script>
</body>
</html>
`;
writeFileSync(resolve(distDir, 'index.html'), html);
console.log(`Wrote dist/index.html + dist/issues.json — ${articles.length} articles, ${issues.length} issues, ${built.length} instances`);
