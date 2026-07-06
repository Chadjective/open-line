// Open Line — shared app bootstrap. Politician-agnostic: everything specific
// arrives via ./config.json and ./articles.json, which the build emits per instance.

import {
  initStore,
  toggleSaved,
  toggleCalled,
  getTheme,
  setTheme,
} from './store.js';
import {
  feedView,
  articleView,
  callView,
  savedView,
  aboutView,
  loadingView,
  errorView,
} from './render.js';

const app = document.getElementById('app');

const state = {
  config: null,
  articles: [],
  filter: '',
};

// Privacy-respecting analytics: fires custom events only if the Plausible stub is present
// (injected at build when analytics is enabled). No-ops otherwise — no cookies, no PII.
function track(event, props) {
  try {
    if (window.plausible) window.plausible(event, props ? { props } : undefined);
  } catch {
    /* never let analytics break the app */
  }
}

// --- data loading ---------------------------------------------------------
async function loadConfig() {
  const res = await fetch('./config.json');
  if (!res.ok) throw new Error('Could not load instance config.');
  return res.json();
}

async function loadArticles(bust = false) {
  const url = bust ? `./articles.json?t=${Date.now()}` : './articles.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load stories.');
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.articles || [];
  // newest first
  return list.slice().sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}

// --- routing --------------------------------------------------------------
function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean); // e.g. ['a','<id>']
  if (parts.length === 0) return { name: 'feed' };
  if (parts[0] === 'a') return { name: 'article', id: decodeURIComponent(parts[1] || '') };
  if (parts[0] === 'call') return { name: 'call', id: decodeURIComponent(parts[1] || '') };
  if (parts[0] === 'saved') return { name: 'saved' };
  if (parts[0] === 'about') return { name: 'about' };
  return { name: 'feed' };
}

function findArticle(id) {
  return state.articles.find((a) => a.id === id) || null;
}

function render() {
  const route = parseRoute();
  let html = '';
  switch (route.name) {
    case 'article':
      html = articleView(findArticle(route.id), state.config);
      break;
    case 'call':
      html = callView(findArticle(route.id), state.config);
      track('View call screen', { instance: state.config.instance_id, article: route.id });
      break;
    case 'saved':
      html = savedView(state);
      break;
    case 'about':
      html = aboutView(state.config);
      break;
    case 'feed':
    default:
      html = feedView(state);
  }
  app.innerHTML = html;
  // route changes scroll to top (except keep position handled by browser on back)
  if (route.name !== 'feed') window.scrollTo(0, 0);
}

// --- theme ----------------------------------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// --- events ---------------------------------------------------------------
async function handleAction(action, el) {
  switch (action) {
    case 'toggle-theme': {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next);
      applyTheme(next);
      break;
    }
    case 'filter': {
      state.filter = el.dataset.tag || '';
      render();
      break;
    }
    case 'refresh': {
      el.disabled = true;
      el.textContent = '↻ Refreshing…';
      try {
        state.articles = await loadArticles(true);
      } catch {
        /* keep existing */
      }
      render();
      break;
    }
    case 'save': {
      toggleSaved(el.dataset.id);
      track('Save', { instance: state.config.instance_id, article: el.dataset.id });
      render();
      break;
    }
    case 'called': {
      toggleCalled(el.dataset.id);
      track('Mark called', { instance: state.config.instance_id, article: el.dataset.id });
      render();
      break;
    }
    case 'share': {
      track('Share', { instance: state.config.instance_id, article: el.dataset.id });
      const a = findArticle(el.dataset.id);
      const url = location.href;
      const shareData = { title: a ? a.title : state.config.platform_name, url };
      try {
        if (navigator.share) await navigator.share(shareData);
        else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          el.textContent = 'Copied!';
          setTimeout(() => (el.textContent = 'Share'), 1500);
        }
      } catch {
        /* user cancelled share — ignore */
      }
      break;
    }
  }
}

function wireEvents() {
  app.addEventListener('click', (e) => {
    // The core success metric: a tap on the tel: (or mailto:) link. Fire before navigation.
    const link = e.target.closest('a[href]');
    if (link) {
      const href = link.getAttribute('href') || '';
      const inst = state.config && state.config.instance_id;
      if (href.startsWith('tel:')) track('Call: phone', { instance: inst });
      else if (href.startsWith('mailto:')) track('Call: email', { instance: inst });
    }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    handleAction(el.dataset.action, el);
  });

  window.addEventListener('hashchange', render);

  // Lightweight pull-to-refresh on the feed.
  let startY = 0;
  let pulling = false;
  app.addEventListener(
    'touchstart',
    (e) => {
      if (parseRoute().name !== 'feed' || window.scrollY > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
    },
    { passive: true },
  );
  app.addEventListener(
    'touchmove',
    async (e) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 90) {
        pulling = false;
        try {
          state.articles = await loadArticles(true);
          render();
        } catch {
          /* ignore */
        }
      }
    },
    { passive: true },
  );
  app.addEventListener('touchend', () => (pulling = false), { passive: true });
}

// --- service worker -------------------------------------------------------
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }
}

// --- boot -----------------------------------------------------------------
async function boot() {
  applyTheme(getTheme());
  app.innerHTML = loadingView();
  try {
    state.config = await loadConfig();
    initStore(state.config.instance_id);
    document.documentElement.style.setProperty('--accent', state.config.accent_color);
    document.title = state.config.platform_name;
    state.articles = await loadArticles();
  } catch (err) {
    app.innerHTML = errorView(
      "We couldn't load this instance. Check your connection and try again.",
    );
    return;
  }
  wireEvents();
  registerSW();
  render();
}

boot();
