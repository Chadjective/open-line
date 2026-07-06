// View templates. Pure functions returning HTML strings; app.js handles routing
// and events. Every politician-specific value comes from `config` at runtime —
// there are no hardcoded names, numbers, or instances in this file.

import { isSaved, isCalled, getSaved, getCalled, calledThisWeek } from './store.js';

// --- helpers --------------------------------------------------------------
export function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function fmtDate(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function relDay(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

function mailtoHref(article, config) {
  const c = config.contacts;
  const lines = [];
  lines.push(`Re: ${article.title}`);
  lines.push('');
  lines.push(`Dear ${config.politician.title},`);
  lines.push('');
  lines.push('I am writing as a constituent about the following:');
  lines.push('');
  article.talking_points.forEach((tp) => lines.push(`• ${tp.point}`));
  lines.push('');
  if (article.suggested_ask) lines.push(article.suggested_ask);
  lines.push('');
  lines.push(`(Re: ${article.source_name} — ${article.source_url})`);
  const subject = encodeURIComponent(`Constituent concern: ${article.title}`);
  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${c.email}?subject=${subject}&body=${body}`;
}

// --- chrome ---------------------------------------------------------------
export function header(config, active) {
  const tabs = [
    ['#/', 'Feed', 'feed'],
    ['#/saved', 'Saved', 'saved'],
    ['#/about', 'About', 'about'],
  ];
  return `
  <header class="topbar">
    <a class="brand" href="#/">${escapeHtml(config.platform_name)}</a>
    <nav class="tabs">
      ${tabs
        .map(
          ([href, label, key]) =>
            `<a href="${href}" class="tab ${active === key ? 'is-active' : ''}">${label}</a>`,
        )
        .join('')}
      <button class="theme-toggle" data-action="toggle-theme" aria-label="Toggle light/dark">◐</button>
    </nav>
  </header>`;
}

export function crossFooter(config) {
  const siblings = (config.platform && config.platform.siblings) || [];
  const platformName = (config.platform && config.platform.name) || 'Open Line';
  const links = siblings
    .map((s) =>
      s.instance_id === config.instance_id
        ? `<span class="sib is-current">${escapeHtml(s.platform_name)}</span>`
        : `<a class="sib" href="${escapeHtml(s.url)}">${escapeHtml(s.platform_name)}</a>`,
    )
    .join('<span class="sib-dot">·</span>');
  const home = config.platform && config.platform.home_url;
  return `
  <footer class="cross-footer">
    <p class="cross-line">Part of <strong>${escapeHtml(platformName)}</strong>. Also calling:</p>
    <p class="sibs">${links}</p>
    ${home ? `<p class="browse"><a href="${escapeHtml(home)}">Browse one issue across every level →</a></p>` : ''}
  </footer>`;
}

// --- feed -----------------------------------------------------------------
function articleCard(a) {
  const tags = (a.tags || [])
    .slice(0, 3)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('');
  const oneLine = (a.summary || '').split('\n')[0].slice(0, 160);
  return `
  <a class="card" href="#/a/${encodeURIComponent(a.id)}">
    <div class="card-meta">
      <span class="src">${escapeHtml(a.source_name)}</span>
      <span class="dot">·</span>
      <span class="date">${relDay(a.published_at)}</span>
      ${isCalled(a.id) ? '<span class="called-badge">✓ Called</span>' : ''}
    </div>
    <h2 class="card-title">${escapeHtml(a.title)}</h2>
    <p class="card-sum">${escapeHtml(oneLine)}${oneLine.length >= 160 ? '…' : ''}</p>
    <div class="tags">${tags}</div>
  </a>`;
}

export function feedView(state) {
  const { config, articles, filter } = state;
  const chips = (config.topic_tags || [])
    .map(
      (t) =>
        `<button class="chip ${filter === t ? 'is-active' : ''}" data-action="filter" data-tag="${escapeHtml(
          t,
        )}">${escapeHtml(t)}</button>`,
    )
    .join('');

  const shown = filter ? articles.filter((a) => (a.tags || []).includes(filter)) : articles;
  const cards = shown.length
    ? shown.map(articleCard).join('')
    : `<p class="empty">No stories tagged “${escapeHtml(filter)}” yet.</p>`;

  const week = calledThisWeek();

  return `
  ${header(config, 'feed')}
  <main class="feed" data-pull>
    <div class="hero">
      <h1 class="hero-title">${escapeHtml(config.tagline)}</h1>
      <p class="hero-sub">${escapeHtml(config.politician.name)} — ${escapeHtml(
        config.politician.title,
      )}</p>
      <div class="counter" title="Calls you've logged in the last 7 days">
        <span class="counter-num">${week}</span> called this week
      </div>
    </div>
    <div class="chips-row">
      <button class="chip ${!filter ? 'is-active' : ''}" data-action="filter" data-tag="">All</button>
      ${chips}
    </div>
    <button class="refresh" data-action="refresh">↻ Refresh</button>
    <section class="cards">${cards}</section>
    ${crossFooter(config)}
  </main>`;
}

// When a story implicates more than one level of government, point the reader at the
// sibling instances accountable for the other levels — the multi-level accountability view.
function levelsBanner(a, config) {
  const levels = Array.isArray(a.levels) ? a.levels : [];
  if (levels.length < 2) return '';
  const siblings = (config.platform && config.platform.siblings) || [];
  const others = siblings.filter(
    (s) => s.instance_id !== config.instance_id && levels.includes(s.level),
  );
  const links = others
    .map((s) => `<a href="${escapeHtml(s.url)}">${escapeHtml(s.platform_name)}</a>`)
    .join('<span class="sib-dot">·</span>');
  return `
  <div class="levels-banner">
    <p class="levels-label">This decision spans ${levels.map(escapeHtml).join(' · ')} government.</p>
    ${others.length ? `<p class="levels-also">Also accountable — call ${links}</p>` : ''}
  </div>`;
}

// --- article detail -------------------------------------------------------
export function articleView(a, config) {
  if (!a) return notFound(config);
  const summaryHtml = (a.summary || '')
    .split('\n')
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
  const points = (a.talking_points || [])
    .map(
      (tp) => `
    <li class="tp">
      <p class="tp-point">${escapeHtml(tp.point)}</p>
      ${tp.source_reference ? `<p class="tp-src">${escapeHtml(tp.source_reference)}</p>` : ''}
    </li>`,
    )
    .join('');
  const tags = (a.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  return `
  ${header(config, '')}
  <main class="article">
    <a class="back" href="#/">← All stories</a>

    <a class="source-link" href="${escapeHtml(a.source_url)}" target="_blank" rel="noopener">
      <span class="source-name">${escapeHtml(a.source_name)}</span>
      <span class="source-cta">Read the original ↗</span>
    </a>

    <h1 class="article-title">${escapeHtml(a.title)}</h1>
    <p class="article-date">${fmtDate(a.published_at)}</p>
    <div class="tags">${tags}</div>

    ${levelsBanner(a, config)}

    <section class="summary">${summaryHtml}</section>

    <section class="block">
      <h2 class="block-h">Talking points</h2>
      <p class="block-note">Prompts, not a script — say these in your own words.</p>
      <ul class="tps">${points}</ul>
    </section>

    ${
      a.suggested_ask
        ? `<section class="block ask">
        <h2 class="block-h">The ask</h2>
        <p class="ask-text">${escapeHtml(a.suggested_ask)}</p>
      </section>`
        : ''
    }

    ${
      a.tone_note
        ? `<p class="tone">${escapeHtml(a.tone_note)}</p>`
        : ''
    }

    <p class="ai-disclosure">
      Summary and talking points generated by AI from the linked source. Verify before calling.
      <a href="${escapeHtml(config.contacts.email ? `mailto:${config.contacts.email}?subject=${encodeURIComponent('Correction: ' + a.title)}` : '#/about')}">Suggest a correction</a>.
    </p>

    <div class="bottombar">
      <a class="btn-call" href="#/call/${encodeURIComponent(a.id)}">📞 Call ${escapeHtml(
        config.contacts.primary.label,
      )}</a>
      <div class="btn-row">
        <button class="btn-sec" data-action="save" data-id="${escapeHtml(a.id)}">${
          isSaved(a.id) ? '★ Saved' : '☆ Save'
        }</button>
        <button class="btn-sec" data-action="share" data-id="${escapeHtml(a.id)}">Share</button>
        <button class="btn-sec ${isCalled(a.id) ? 'is-on' : ''}" data-action="called" data-id="${escapeHtml(
          a.id,
        )}">${isCalled(a.id) ? '✓ Called' : 'Mark called'}</button>
      </div>
    </div>
  </main>`;
}

// --- call flow ------------------------------------------------------------
export function callView(a, config) {
  if (!a) return notFound(config);
  const c = config.contacts;
  const points = (a.talking_points || [])
    .map((tp) => `<li class="big-tp">${escapeHtml(tp.point)}</li>`)
    .join('');
  const findRep = c.find_my_rep;

  return `
  ${header(config, '')}
  <main class="call">
    <a class="back" href="#/a/${encodeURIComponent(a.id)}">← Back to story</a>
    <h1 class="call-h">Before you dial</h1>
    <p class="call-note">${escapeHtml(
      a.tone_note || 'Staff answer this line. Be direct, brief, and respectful.',
    )}</p>

    <ol class="big-tps">${points}</ol>
    ${a.suggested_ask ? `<p class="big-ask">${escapeHtml(a.suggested_ask)}</p>` : ''}

    <a class="btn-call big" href="tel:${escapeHtml(c.primary.phone)}">
      📞 Call ${escapeHtml(c.primary.label)}
      <span class="call-num">${escapeHtml(c.primary.display_phone)}</span>
    </a>

    ${
      c.secondary
        ? `<a class="btn-tert" href="tel:${escapeHtml(c.secondary.phone)}">${escapeHtml(
            c.secondary.label,
          )} — ${escapeHtml(c.secondary.display_phone)}</a>`
        : ''
    }
    ${c.email ? `<a class="btn-tert" href="${mailtoHref(a, config)}">✉ Email instead (draft pre-filled)</a>` : ''}
    ${
      findRep && findRep.url
        ? `<a class="btn-tert" href="${escapeHtml(findRep.url)}" target="_blank" rel="noopener">${escapeHtml(
            findRep.label,
          )} ↗</a>`
        : ''
    }

    <button class="btn-sec wide ${isCalled(a.id) ? 'is-on' : ''}" data-action="called" data-id="${escapeHtml(
      a.id,
    )}">${isCalled(a.id) ? '✓ Logged as called' : 'I made the call — log it'}</button>

    <p class="ai-disclosure">Talking points generated by AI from the linked source. Speak in your own words.</p>
  </main>`;
}

// --- saved & called -------------------------------------------------------
export function savedView(state) {
  const { config, articles } = state;
  const byId = new Map(articles.map((a) => [a.id, a]));
  const saved = getSaved().map((id) => byId.get(id)).filter(Boolean);
  const called = Object.keys(getCalled()).map((id) => byId.get(id)).filter(Boolean);

  const list = (items, empty) =>
    items.length ? items.map(articleCard).join('') : `<p class="empty">${empty}</p>`;

  return `
  ${header(config, 'saved')}
  <main class="saved">
    <h1 class="page-h">Saved &amp; Called</h1>
    <div class="counter big">
      <span class="counter-num">${calledThisWeek()}</span> called this week
    </div>

    <section class="block">
      <h2 class="block-h">Saved for later</h2>
      <div class="cards">${list(saved, 'Nothing saved yet. Tap ☆ Save on any story.')}</div>
    </section>

    <section class="block">
      <h2 class="block-h">Called about</h2>
      <div class="cards">${list(called, 'No calls logged yet.')}</div>
    </section>

    ${crossFooter(config)}
  </main>`;
}

// --- about / methodology --------------------------------------------------
export function aboutView(config) {
  const p = config.politician;
  const platformName = (config.platform && config.platform.name) || 'Open Line';
  return `
  ${header(config, 'about')}
  <main class="about">
    <h1 class="page-h">About ${escapeHtml(config.platform_name)}</h1>
    <p class="lede">${escapeHtml(config.platform_name)} aggregates news coverage of
      <strong>${escapeHtml(p.name)}</strong>, ${escapeHtml(p.title)}, and turns it into
      something you can act on: a phone call to their office.</p>

    <section class="block">
      <h2 class="block-h">How stories are sourced</h2>
      <p>Articles are pulled from public news feeds covering ${escapeHtml(
        p.jurisdiction,
      )} and filtered for coverage of ${escapeHtml(p.name)}. Every story links to the original
      reporting — that link is always the first action on the page. We don't replace journalism;
      we point you at it.</p>
    </section>

    <section class="block">
      <h2 class="block-h">How summaries are made</h2>
      <p>Summaries and talking points are generated by AI from the linked article, grounded in its
      text. We instruct the model to never fabricate, embellish, or partisan-frame — only to
      surface policy impacts and accountability. AI can still get things wrong: <strong>verify
      before you call</strong>, and read the original.</p>
    </section>

    <section class="block">
      <h2 class="block-h">Editorial stance</h2>
      <p>${escapeHtml(platformName)} holds <strong>every</strong> officeholder to the same
      accountability standard, regardless of party. This isn't a fan site and it isn't an
      opposition campaign — it's a uniform accountability lens applied to whoever holds the
      office. If you think we've fallen short of that standard, tell us.</p>
    </section>

    <section class="block">
      <h2 class="block-h">Respectful contact</h2>
      <p>Staff answer these phones, not the official. No abuse, no threats — ever. Talking
      points are prompts, not scripts. Say them in your own words.</p>
    </section>

    <section class="block">
      <h2 class="block-h">Corrections</h2>
      <p>Spotted an error? ${
        config.contacts.email
          ? `Email <a href="mailto:${escapeHtml(config.contacts.email)}?subject=Correction">a correction</a>.`
          : 'Use the correction link on any story.'
      }</p>
    </section>

    ${
      config.platform && config.platform.analytics && config.platform.analytics.enabled
        ? `<section class="block">
      <h2 class="block-h">Privacy</h2>
      <p>We use privacy-respecting analytics (no cookies, no personal data) to count how many calls
      this platform helps start. We never track who you are or who you call.</p>
    </section>`
        : ''
    }

    ${crossFooter(config)}
  </main>`;
}

export function notFound(config) {
  return `
  ${header(config, '')}
  <main class="article">
    <a class="back" href="#/">← All stories</a>
    <h1 class="article-title">Story not found</h1>
    <p>That story isn't in the current feed. It may have rolled into the archive.</p>
  </main>`;
}

export function loadingView() {
  return `<main class="loading"><p>Loading…</p></main>`;
}

export function errorView(message) {
  return `<main class="loading"><p>${escapeHtml(message)}</p></main>`;
}
