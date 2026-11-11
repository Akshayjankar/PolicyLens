/* PolicyLens Extension — MV3 vanilla ES2022 */
/* eslint-disable no-undef */

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';
let _backendUrl = DEFAULT_BACKEND_URL;
let _tab = null;
let _currentResult = null;
let _isAnalyzing = false;

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const ICONS = {
  sells_your_data: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2m-3-7h4a1 1 0 0 1 0 2H9a1 1 0 0 0 0 2h6"/></svg>`,
  location_tracking: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  data_deletion: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  encryption: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  shares_with_third_parties: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  children_protection: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  data_portability: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  account_deletion: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>`,
  data_retention: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  tracking_cookies: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><circle cx="8.5" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/></svg>`,
  shield: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`,
  settings: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  external: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>`,
  download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
};

function getPracticeIcon(label) {
  const norm = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (ICONS[norm]) return ICONS[norm];
  if (norm.includes('sell')) return ICONS.sells_your_data;
  if (norm.includes('locat')) return ICONS.location_tracking;
  if (norm.includes('delet') && norm.includes('account')) return ICONS.account_deletion;
  if (norm.includes('delet')) return ICONS.data_deletion;
  if (norm.includes('encrypt')) return ICONS.encryption;
  if (norm.includes('third')) return ICONS.shares_with_third_parties;
  if (norm.includes('child')) return ICONS.children_protection;
  if (norm.includes('portab')) return ICONS.data_portability;
  if (norm.includes('retent')) return ICONS.data_retention;
  if (norm.includes('cookie') || norm.includes('track')) return ICONS.tracking_cookies;
  return ICONS.shield;
}

// ─── Entry Point ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const root = document.getElementById('root');
  root.innerHTML = '';

  // Load custom backend URL if user configured it
  try {
    const cfg = await chrome.storage.local.get('config_backend_url');
    if (cfg.config_backend_url) _backendUrl = cfg.config_backend_url;
  } catch { /* ignore */ }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    _tab = tabs[0];

    if (!_tab || !_tab.url || _tab.url.startsWith('chrome://') || _tab.url.startsWith('chrome-extension://') || _tab.url.startsWith('edge://')) {
      root.appendChild(buildHeader(null, false));
      root.appendChild(buildStateCard({
        icon: '🔒',
        title: 'Browser System Page',
        desc: 'PolicyLens analyzes privacy policies on web domains. Please open a regular website to analyze.',
      }));
      return;
    }

    const url = new URL(_tab.url);
    const hostname = stripWww(url.hostname);

    // 1. Instant Cache Check: If already analyzed, render immediately!
    let cached = null;
    try {
      const storage = await chrome.storage.local.get(hostname);
      if (storage[hostname]) cached = storage[hostname];
    } catch { /* ignore */ }

    if (cached) {
      _currentResult = cached;
      renderApp(root, hostname, cached, false);
      return;
    }

    // 2. No cache: perform live analysis
    await runAnalysis(root, url, hostname);

  } catch (err) {
    console.error('[PolicyLens] Init error:', err);
    root.appendChild(buildHeader(null, false));
    root.appendChild(buildStateCard({
      icon: '⚠️',
      title: 'Initialization Error',
      desc: 'Unable to read the current tab. Please reload the page and try again.',
      hint: String(err.message || err),
    }));
  }
}

// ─── Live Analysis Workflow ────────────────────────────────────────────────

async function runAnalysis(root, url, hostname, isRefresh = false) {
  if (_isAnalyzing) return;
  _isAnalyzing = true;

  root.innerHTML = '';
  root.appendChild(buildHeader(hostname, true));
  root.appendChild(buildDomainBar(hostname, null));

  const skeleton = buildSkeleton();
  root.appendChild(skeleton.el);

  skeleton.setStatus('Checking backend connection…');

  const res = await fetchAnalysis(url, hostname, skeleton.setStatus);
  _isAnalyzing = false;

  root.removeChild(skeleton.el);

  if (res.ok && res.data) {
    _currentResult = res.data;
    try {
      await chrome.storage.local.set({ [hostname]: res.data });
    } catch { /* ignore */ }
    renderApp(root, hostname, res.data, false);
  } else {
    // If live call failed, but we had a cached copy, show cached copy with a warning
    let previousCache = null;
    try {
      const st = await chrome.storage.local.get(hostname);
      if (st[hostname]) previousCache = st[hostname];
    } catch { /* ignore */ }

    if (previousCache) {
      _currentResult = previousCache;
      renderApp(root, hostname, previousCache, true, res.error);
    } else {
      renderErrorState(root, hostname, res, url);
    }
  }
}

// ─── Network Analysis Fetcher ──────────────────────────────────────────────

async function fetchAnalysis(url, hostname, setStatus) {
  // Test connection on configured backend, fallback to localhost if 127.0.0.1 failed
  let activeBackend = _backendUrl;
  let backendOk = false;

  const testUrls = [activeBackend];
  if (activeBackend.includes('127.0.0.1')) {
    testUrls.push(activeBackend.replace('127.0.0.1', 'localhost'));
  } else if (activeBackend.includes('localhost')) {
    testUrls.push(activeBackend.replace('localhost', '127.0.0.1'));
  }

  for (const testBase of testUrls) {
    try {
      const health = await fetch(`${testBase}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3500),
      });
      if (health.ok) {
        activeBackend = testBase;
        backendOk = true;
        break;
      }
    } catch {
      // try next
    }
  }

  if (!backendOk) {
    return {
      ok: false,
      type: 'BACKEND_OFFLINE',
      error: 'Backend is not reachable',
      hint: `Cannot connect to ${activeBackend}.\n\nTo start the backend, run in terminal:\ncd backend\npython main.py`,
    };
  }

  // Best-effort grab detected privacy policy link from content script
  let privacyUrl = null;
  try {
    await new Promise(r => setTimeout(r, 200));
    const session = await chrome.storage.session.get(`privacyUrl_${_tab.id}`);
    privacyUrl = session[`privacyUrl_${_tab.id}`] || null;
  } catch { /* ignore */ }

  // Clean tracking query params from privacyUrl
  if (privacyUrl) {
    try {
      const pUrl = new URL(privacyUrl);
      ['entry_point', 'fbclid', 'gclid', 'ref', 'source'].forEach(k => pUrl.searchParams.delete(k));
      privacyUrl = pUrl.href;
    } catch { /* keep as is */ }
  }

  // Extract visible page text if active tab is currently on a privacy policy page
  let inPagePolicyText = null;
  const isPolicyPath = /privacy|terms|legal|policy|data-protection/i.test(url.pathname);
  if (isPolicyPath && _tab && _tab.id) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: _tab.id },
        func: () => document.body ? document.body.innerText : '',
      });
      if (results && results[0] && results[0].result) {
        const text = String(results[0].result).trim();
        if (text.length > 150) {
          inPagePolicyText = text.slice(0, 45000);
        }
      }
    } catch { /* ignore if script injection restricted */ }
  }

  const siteUrl = `${url.protocol}//${url.hostname}`;
  setStatus('Fetching & analyzing privacy policy…');

  try {
    const resp = await fetch(`${activeBackend}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_url: siteUrl,
        policy_url: privacyUrl || (isPolicyPath ? url.href : null),
        policy_text: inPagePolicyText,
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (resp.status === 404) {
      return {
        ok: false,
        type: 'POLICY_NOT_FOUND',
        error: 'Privacy policy could not be located',
        hint: `No public privacy policy link was detected for ${hostname}.\nTry browsing directly to their Privacy page and click PolicyLens.`,
      };
    }

    if (!resp.ok) {
      let detail = `HTTP ${resp.status} Error`;
      try {
        const body = await resp.json();
        detail = body.detail || detail;
      } catch { /* ignore */ }

      return {
        ok: false,
        type: 'API_ERROR',
        error: 'Backend returned an error',
        hint: detail,
      };
    }

    setStatus('Structuring insights…');
    const apiData = await resp.json();
    const shaped = shapeApiResponse(hostname, apiData);
    return { ok: true, data: shaped };

  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return {
        ok: false,
        type: 'TIMEOUT',
        error: 'Analysis timed out (exceeded 90s)',
        hint: 'The site or AI service took too long to respond. Please try again.',
      };
    }
    return {
      ok: false,
      type: 'NETWORK_ERROR',
      error: 'Network connection failed',
      hint: String(err.message || err),
    };
  }
}

// ─── Policy Deep Linking & Chrome Text Fragments ────────────────────────────

const PRACTICE_KEYWORDS_MAP = {
  'Sells Your Data': 'sell personal data',
  'Location Tracking': 'precise location',
  'Data Deletion': 'request deletion',
  'Encryption': 'encryption',
  'Shares With Third Parties': 'third party',
  'Children Protection': 'children under 13',
  'Data Portability': 'download your data',
  'Account Deletion': 'delete your account',
  'Data retention': 'retention',
  'Tracking cookies': 'cookies',
};

function makeTextFragmentUrl(policyUrl, quoteOrKeywords) {
  if (!policyUrl) return null;
  try {
    const urlObj = new URL(policyUrl);
    urlObj.hash = ''; // clear any existing hash
    
    if (!quoteOrKeywords || !quoteOrKeywords.trim()) {
      return urlObj.href;
    }

    // Clean text: strip special quotes, punctuation, extra spaces
    const clean = quoteOrKeywords
      .replace(/[“"”'’`]/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = clean.split(' ').filter(w => w.length > 2);
    if (words.length === 0) return urlObj.href;

    if (words.length >= 8) {
      // Precise text range match: textStart,textEnd
      const start = words.slice(0, 4).join(' ');
      const end = words.slice(-4).join(' ');
      urlObj.hash = `:~:text=${encodeURIComponent(start)},${encodeURIComponent(end)}`;
    } else {
      // Single text match
      const match = words.slice(0, Math.min(6, words.length)).join(' ');
      urlObj.hash = `:~:text=${encodeURIComponent(match)}`;
    }

    return urlObj.href;
  } catch {
    return policyUrl;
  }
}

function jumpToPolicy(policyUrl, quoteOrKeywords) {
  const target = makeTextFragmentUrl(policyUrl, quoteOrKeywords);
  if (target) {
    chrome.tabs.create({ url: target });
  }
}

// ─── Main App Renderer ─────────────────────────────────────────────────────

function renderApp(root, hostname, data, hasCachedWarning = false, warningMsg = '') {
  root.innerHTML = '';

  // Header
  root.appendChild(buildHeader(hostname, false, () => {
    runAnalysis(root, new URL(_tab.url), hostname, true);
  }));

  // Warning banner if live refresh failed and showing cache
  if (hasCachedWarning) {
    const banner = document.createElement('div');
    banner.className = 'pl-cache-banner';
    banner.innerHTML = `
      <span>⚠️ Live refresh failed (${escHtml(warningMsg)}). Showing previous snapshot.</span>
      <button style="background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;font-weight:700">Retry</button>
    `;
    banner.querySelector('button').addEventListener('click', () => {
      runAnalysis(root, new URL(_tab.url), hostname, true);
    });
    root.appendChild(banner);
  }

  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'pl-scroll-wrap';

  // Domain bar
  scrollWrap.appendChild(buildDomainBar(hostname, data.policyUrl));

  // Date metadata if available
  if (data.policyLastUpdated) {
    scrollWrap.appendChild(buildDateMeta(data.policyLastUpdated));
  }

  const redFlagsCount = (data.clauses || []).length;
  const controlScore = data.controlScore ?? 50;

  // Hero Privacy Score with quick-glance chips
  scrollWrap.appendChild(buildHeroScore(data.score, data.grade, data.verdict, data.source, redFlagsCount, controlScore));

  // Segmented Tabs
  const tabsBar = buildTabsBar(redFlagsCount);
  scrollWrap.appendChild(tabsBar);

  // Panel 1: Core Practices
  const panelPractices = document.createElement('div');
  panelPractices.id = 'tab-panel-practices';
  panelPractices.className = 'pl-panel is-active';
  panelPractices.appendChild(buildPracticesGrid(data.practices || [], data.retentionPeriod, data.trackingCookies, data.policyUrl));
  scrollWrap.appendChild(panelPractices);

  // Panel 2: Red Flags / Clauses
  const panelClauses = document.createElement('div');
  panelClauses.id = 'tab-panel-clauses';
  panelClauses.className = 'pl-panel';
  panelClauses.appendChild(buildClausesStack(data.clauses || [], data.policyUrl));
  scrollWrap.appendChild(panelClauses);

  // Panel 3: User Rights & Control
  const panelRights = document.createElement('div');
  panelRights.id = 'tab-panel-rights';
  panelRights.className = 'pl-panel';
  panelRights.appendChild(buildControlPanel(controlScore, data.controlItems || [], data.retentionPeriod, data.trackingCookies, data.policyUrl));
  scrollWrap.appendChild(panelRights);

  root.appendChild(scrollWrap);

  // Sticky bottom action bar
  root.appendChild(buildActionsBar(data, hostname));
}

// ─── Header & Chrome ───────────────────────────────────────────────────────

function buildHeader(hostname, isSpinning = false, onRefresh = null) {
  const header = document.createElement('header');
  header.className = 'pl-header';

  header.innerHTML = `
    <div class="pl-brand">
      <div class="pl-brand-icon">${ICONS.shield}</div>
      <span class="pl-brand-title">PolicyLens</span>
      <span class="pl-brand-badge">Shield</span>
    </div>
    <div class="pl-header-tools">
      <button class="pl-tool-btn" id="btn-refresh" title="Refresh Analysis">
        <span class="${isSpinning ? 'pl-spinner' : ''}">${isSpinning ? '' : ICONS.refresh}</span>
      </button>
      <button class="pl-tool-btn" id="btn-settings" title="Settings">
        ${ICONS.settings}
      </button>
    </div>
  `;

  const refreshBtn = header.querySelector('#btn-refresh');
  if (onRefresh && !isSpinning) {
    refreshBtn.addEventListener('click', onRefresh);
  }

  const settingsBtn = header.querySelector('#btn-settings');
  settingsBtn.addEventListener('click', () => {
    openSettingsModal(header.parentElement);
  });

  return header;
}

function buildDomainBar(hostname, policyUrl) {
  const bar = document.createElement('div');
  bar.className = 'pl-domain-bar';

  const info = document.createElement('div');
  info.className = 'pl-domain-info';

  const img = document.createElement('img');
  img.className = 'pl-domain-favicon';
  img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  img.alt = '';
  img.onerror = () => { img.style.display = 'none'; };

  const name = document.createElement('span');
  name.className = 'pl-domain-name';
  name.textContent = hostname;

  info.appendChild(img);
  info.appendChild(name);
  bar.appendChild(info);

  if (policyUrl) {
    const link = document.createElement('a');
    link.className = 'pl-policy-link';
    link.href = '#';
    link.innerHTML = `<span>Policy</span>${ICONS.external}`;
    link.title = 'View full privacy policy in new tab';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: policyUrl });
    });
    bar.appendChild(link);
  }

  return bar;
}

function buildDateMeta(isoDate) {
  const el = document.createElement('div');
  el.className = 'pl-date-meta';

  let dateStr = isoDate;
  let isStale = false;
  try {
    const d = new Date(isoDate);
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (d < twoYearsAgo) isStale = true;
    }
  } catch { /* keep raw */ }

  el.innerHTML = `
    <span>Updated: <strong style="color:var(--text-primary)">${escHtml(dateStr)}</strong></span>
    ${isStale ? '<span class="pl-stale-tag">Stale (&gt;2 yrs)</span>' : ''}
  `;
  return el;
}

// ─── Hero Privacy Score ────────────────────────────────────────────────────

function buildHeroScore(score, grade, verdict, source, redFlagsCount = 0, controlScore = 50) {
  const hero = document.createElement('div');
  hero.className = 'pl-hero';

  const card = document.createElement('div');
  card.className = 'pl-score-card';

  // SVG Gauge calculations (radius = 30 -> circum ~ 188.5)
  const radius = 30;
  const circum = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circum - (pct / 100) * circum;

  let strokeColor = '#10B981'; // green
  if (pct < 45) strokeColor = '#EF4444'; // red
  else if (pct < 75) strokeColor = '#F59E0B'; // amber

  const gradeClass = `grade-${(grade || 'c').toLowerCase()}`;

  let verdictHeadline = 'Good Privacy Protection';
  if (pct < 40) verdictHeadline = 'High Privacy Concerns';
  else if (pct < 70) verdictHeadline = 'Moderate Protection';

  card.innerHTML = `
    <div class="pl-gauge-wrap">
      <svg class="pl-gauge-svg" viewBox="0 0 72 72">
        <circle class="pl-gauge-bg" cx="36" cy="36" r="${radius}" />
        <circle class="pl-gauge-bar" cx="36" cy="36" r="${radius}"
          stroke="${strokeColor}"
          stroke-dasharray="${circum}"
          stroke-dashoffset="${circum}" />
      </svg>
      <span class="pl-gauge-value">${score}</span>
    </div>

    <div class="pl-score-details">
      <div class="pl-score-badge-row">
        <span class="pl-grade-pill ${gradeClass}">Grade ${escHtml(grade || 'C')}</span>
        <span class="pl-score-level">${verdictHeadline}</span>
      </div>
      <p class="pl-score-summary">${escHtml(verdict || 'Analysis completed based on current privacy terms.')}</p>
      ${source === 'heuristic' ? '<span class="pl-engine-tag">⚡ Fast Heuristic Engine</span>' : ''}
    </div>
  `;

  // Animate circular gauge fill
  requestAnimationFrame(() => {
    const circle = card.querySelector('.pl-gauge-bar');
    if (circle) circle.style.strokeDashoffset = `${offset}`;
  });

  // Quick glance chips bar with interactive tab jumping
  const glanceBar = document.createElement('div');
  glanceBar.className = 'pl-glance-bar';
  glanceBar.innerHTML = `
    <div class="pl-glance-chip" data-target="tab-panel-practices" title="View all 8 privacy practices">
      <span class="pl-glance-num">8</span>
      <span class="pl-glance-txt">Practices</span>
    </div>
    <div class="pl-glance-chip ${redFlagsCount > 0 ? 'has-flags' : ''}" data-target="tab-panel-clauses" title="View ${redFlagsCount} red flag clauses">
      <span class="pl-glance-num">${redFlagsCount}</span>
      <span class="pl-glance-txt">Red Flags</span>
    </div>
    <div class="pl-glance-chip" data-target="tab-panel-rights" title="View your data control score">
      <span class="pl-glance-num">${controlScore}%</span>
      <span class="pl-glance-txt">Autonomy</span>
    </div>
  `;

  glanceBar.querySelectorAll('.pl-glance-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetId = chip.dataset.target;
      const tabBtn = document.querySelector(`.pl-tab-btn[data-target="${targetId}"]`);
      if (tabBtn) tabBtn.click();
    });
  });

  hero.appendChild(card);
  hero.appendChild(glanceBar);
  return hero;
}

// ─── Segmented Tabs ────────────────────────────────────────────────────────

function buildTabsBar(redFlagsCount) {
  const tabs = document.createElement('nav');
  tabs.className = 'pl-tabs';

  tabs.innerHTML = `
    <button class="pl-tab-btn is-active" data-target="tab-panel-practices">
      <span>Practices</span>
    </button>
    <button class="pl-tab-btn" data-target="tab-panel-clauses">
      <span>Red Flags</span>
      <span class="pl-tab-count">${redFlagsCount}</span>
    </button>
    <button class="pl-tab-btn" data-target="tab-panel-rights">
      <span>Your Rights</span>
    </button>
  `;

  tabs.querySelectorAll('.pl-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('.pl-tab-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const targetId = btn.dataset.target;
      document.querySelectorAll('.pl-panel').forEach(panel => {
        panel.classList.toggle('is-active', panel.id === targetId);
      });
    });
  });

  return tabs;
}

// ─── Tab 1: Practices Grid ─────────────────────────────────────────────────

function buildPracticesGrid(practices, retentionPeriod, trackingCookies, policyUrl) {
  const wrap = document.createElement('div');

  const grid = document.createElement('div');
  grid.className = 'practices-grid';

  for (const p of practices) {
    const card = document.createElement('div');
    card.className = 'practice-card';

    const status = (p.status || 'partial').toLowerCase();
    const pillClass = `pill-${status}`;

    let displayPill = 'Partial';
    if (status === 'yes') displayPill = 'Yes';
    else if (status === 'no') displayPill = 'No';
    else if (status === 'unclear') displayPill = 'Unclear';

    card.innerHTML = `
      <div class="practice-card-top">
        <div class="practice-card-icon">${getPracticeIcon(p.label)}</div>
        <span class="practice-pill ${pillClass}">${displayPill}</span>
      </div>
      <div class="practice-card-label">${escHtml(p.label)}</div>
      <div class="practice-card-detail">${escHtml(p.detail || 'Standard policy provisions apply.')}</div>
      <div class="practice-card-footer">
        <span style="font-size:10px;color:var(--text-muted)">Details</span>
        <button class="practice-jump-link" title="Jump directly to this section in the privacy policy">
          <span>Source</span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
        </button>
      </div>
    `;

    // Click on detail text toggles expansion
    card.addEventListener('click', () => {
      const detailEl = card.querySelector('.practice-card-detail');
      if (detailEl.style.webkitLineClamp === 'unset') {
        detailEl.style.webkitLineClamp = '2';
      } else {
        detailEl.style.webkitLineClamp = 'unset';
      }
    });

    // Click on Source button jumps directly to that section in the policy
    const sourceBtn = card.querySelector('.practice-jump-link');
    if (sourceBtn) {
      sourceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kw = PRACTICE_KEYWORDS_MAP[p.label] || p.label;
        jumpToPolicy(policyUrl, kw);
      });
    }

    grid.appendChild(card);
  }

  wrap.appendChild(grid);

  // Quick metadata strip for retention and cookies
  const metaStrip = document.createElement('div');
  metaStrip.className = 'pl-quick-meta';

  let cookieDesc = 'Standard';
  if (trackingCookies === 'functional_only') cookieDesc = 'Strictly Functional';
  else if (trackingCookies === 'analytics_opt_out') cookieDesc = 'Opt-out Available';
  else if (trackingCookies === 'no_opt_out') cookieDesc = 'No Opt-out';

  metaStrip.innerHTML = `
    <div class="pl-meta-badge">
      <span class="pl-meta-title">Data Retention</span>
      <span class="pl-meta-value">${escHtml(retentionPeriod || 'Not specified')}</span>
    </div>
    <div class="pl-meta-badge">
      <span class="pl-meta-title">Cookies</span>
      <span class="pl-meta-value">${escHtml(cookieDesc)}</span>
    </div>
  `;

  wrap.appendChild(metaStrip);
  return wrap;
}

// ─── Tab 2: Red Flags (3D Flip Cards with Deep Linking) ─────────────────────

function buildClausesStack(clauses, policyUrl) {
  const stack = document.createElement('div');
  stack.className = 'clauses-stack';

  if (!clauses || clauses.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'clause-empty';
    empty.innerHTML = `
      <div style="font-size:24px;margin-bottom:6px">🛡️</div>
      <strong>No severe clause red flags detected</strong>
      <p style="margin-top:4px">No overly aggressive or highly unusual legal rights forfeiture clauses were found.</p>
    `;
    stack.appendChild(empty);
    return stack;
  }

  clauses.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'clause-flip-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Clause #${index + 1}: click to flip between plain-English and original policy quote`);

    card.innerHTML = `
      <div class="clause-flip-inner">
        <!-- Front side: Plain-English explanation -->
        <div class="clause-flip-front">
          <div class="clause-flip-header">
            <span class="clause-tag clause-tag-front">⚠️ Red Flag #${index + 1}</span>
            <span class="clause-flip-hint">Tap to flip ↻</span>
          </div>
          <div class="clause-flip-consequence">${escHtml(item.consequence || 'Potential concern regarding personal data usage')}</div>
          <div class="clause-flip-footer">
            <span style="color:var(--warning);font-weight:700">See Quote ↻</span>
            <button class="practice-jump-link" style="color:var(--text-primary);font-weight:600" title="Open and highlight this exact line in privacy policy">
              <span>Source</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            </button>
          </div>
        </div>

        <!-- Back side: Original verbatim quote -->
        <div class="clause-flip-back">
          <div class="clause-flip-header">
            <span class="clause-tag clause-tag-back">📄 Original Wording</span>
            <span class="clause-flip-hint">Tap to flip ↻</span>
          </div>
          <div class="clause-flip-quote-wrap">
            <div class="clause-flip-quote">"${escHtml(item.quote || 'Exact wording not available.')}"</div>
          </div>
          <div class="clause-flip-footer">
            <span style="color:var(--primary);font-weight:700">← Back</span>
            <button class="clause-jump-btn" title="Open and highlight this exact line in privacy policy">
              <span>Jump to Line ↗</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Flip card on body click
    const toggle = () => card.classList.toggle('is-flipped');
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    // Deep link buttons: stop propagation so card doesn't flip unexpectedly
    const frontSourceBtn = card.querySelector('.clause-flip-front .practice-jump-link');
    if (frontSourceBtn) {
      frontSourceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToPolicy(policyUrl, item.quote);
      });
    }

    const backJumpBtn = card.querySelector('.clause-jump-btn');
    if (backJumpBtn) {
      backJumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToPolicy(policyUrl, item.quote);
      });
    }

    stack.appendChild(card);
  });

  return stack;
}

// ─── Tab 3: Your Rights (User Control & Data Governance) ───────────────────

function buildControlPanel(score, items, retention, cookies, policyUrl) {
  const card = document.createElement('div');
  card.className = 'control-card';

  card.innerHTML = `
    <div class="control-bar-header">
      <span class="control-bar-label">User Data Autonomy</span>
      <span class="control-bar-score">${score}%</span>
    </div>
    <div class="control-track">
      <div class="control-fill" style="width: 0%"></div>
    </div>
    <ul class="control-checklist"></ul>
  `;

  const fill = card.querySelector('.control-fill');
  requestAnimationFrame(() => {
    fill.style.width = `${Math.max(0, Math.min(100, score))}%`;
  });

  const list = card.querySelector('.control-checklist');
  items.forEach(it => {
    const li = document.createElement('li');
    li.className = 'control-item';
    li.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%';
    li.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span class="control-icon-circle ${it.granted ? 'yes' : 'no'}">
          ${it.granted ? '✓' : '✕'}
        </span>
        <span style="font-size:12px">${escHtml(it.label)}</span>
      </div>
      <button class="practice-jump-link" style="margin-left:auto" title="Locate in privacy policy">
        <span>Source</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
      </button>
    `;

    const jumpBtn = li.querySelector('.practice-jump-link');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kw = it.label.replace(/^Can\s+(?:request\s+)?/i, '');
        jumpToPolicy(policyUrl, kw);
      });
    }

    list.appendChild(li);
  });

  return card;
}

// ─── Bottom Actions Bar ────────────────────────────────────────────────────

function buildActionsBar(data, hostname) {
  const bar = document.createElement('div');
  bar.className = 'pl-actions-bar';

  const shareBtn = document.createElement('button');
  shareBtn.className = 'pl-btn';
  shareBtn.innerHTML = `${ICONS.download}<span>Share Report</span>`;
  shareBtn.addEventListener('click', () => shareAsImage(data, hostname, shareBtn));

  const policyBtn = document.createElement('button');
  policyBtn.className = 'pl-btn pl-btn-primary';
  const url = data.policyUrl || `https://${hostname}/privacy`;
  policyBtn.innerHTML = `<span>View Full Policy</span>${ICONS.external}`;
  policyBtn.addEventListener('click', () => chrome.tabs.create({ url }));

  bar.appendChild(shareBtn);
  bar.appendChild(policyBtn);
  return bar;
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function buildSkeleton() {
  const el = document.createElement('div');
  el.className = 'pl-skeleton';

  const statusBanner = document.createElement('div');
  statusBanner.className = 'pl-status-banner';
  statusBanner.innerHTML = `<div class="pl-spinner"></div><span id="skeleton-text">Analyzing privacy policy…</span>`;

  el.appendChild(statusBanner);
  el.insertAdjacentHTML('beforeend', `
    <div class="pl-skeleton-pulse" style="height: 100px; margin-top: 4px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
      <div class="pl-skeleton-pulse" style="height: 75px;"></div>
      <div class="pl-skeleton-pulse" style="height: 75px;"></div>
      <div class="pl-skeleton-pulse" style="height: 75px;"></div>
      <div class="pl-skeleton-pulse" style="height: 75px;"></div>
    </div>
  `);

  return {
    el,
    setStatus: (txt) => {
      const span = el.querySelector('#skeleton-text');
      if (span) span.textContent = txt;
    },
  };
}

// ─── Error State Card ──────────────────────────────────────────────────────

function renderErrorState(root, hostname, res, url) {
  root.innerHTML = '';
  root.appendChild(buildHeader(hostname, false));

  const card = document.createElement('div');
  card.className = 'pl-card-state';

  let title = 'Analysis Failed';
  if (res.type === 'BACKEND_OFFLINE') title = 'Backend Server Offline';
  else if (res.type === 'POLICY_NOT_FOUND') title = 'Policy Not Found';
  else if (res.type === 'API_ERROR') title = 'Analysis Error';

  card.innerHTML = `
    <div class="pl-state-icon">⚠️</div>
    <div class="pl-state-title">${escHtml(title)}</div>
    <div class="pl-state-desc">${escHtml(res.error || 'Something went wrong during analysis.')}</div>
    ${res.hint ? `<div class="pl-state-hint">${escHtml(res.hint)}</div>` : ''}
    <div style="display:flex;gap:8px;width:100%;margin-top:8px">
      <button class="pl-btn" id="btn-err-settings" style="flex:1">Settings</button>
      <button class="pl-btn pl-btn-primary" id="btn-err-retry" style="flex:1">Retry Now</button>
    </div>
  `;

  card.querySelector('#btn-err-retry').addEventListener('click', () => {
    runAnalysis(root, url, hostname, true);
  });

  card.querySelector('#btn-err-settings').addEventListener('click', () => {
    openSettingsModal(root);
  });

  root.appendChild(card);
}

function buildStateCard({ icon, title, desc, hint }) {
  const card = document.createElement('div');
  card.className = 'pl-card-state';
  card.innerHTML = `
    <div class="pl-state-icon">${icon}</div>
    <div class="pl-state-title">${escHtml(title)}</div>
    <div class="pl-state-desc">${escHtml(desc)}</div>
    ${hint ? `<div class="pl-state-hint">${escHtml(hint)}</div>` : ''}
  `;
  return card;
}

// ─── Settings Modal ────────────────────────────────────────────────────────

function openSettingsModal(parent) {
  const existing = parent.querySelector('.pl-modal-overlay');
  if (existing) { parent.removeChild(existing); return; }

  const overlay = document.createElement('div');
  overlay.className = 'pl-modal-overlay';

  overlay.innerHTML = `
    <div class="pl-modal">
      <div class="pl-modal-header">
        <span class="pl-modal-title">PolicyLens Settings</span>
        <button class="pl-modal-close" id="modal-close">&times;</button>
      </div>

      <div class="pl-form-group">
        <label class="pl-form-label">Backend API URL</label>
        <input type="text" class="pl-form-input" id="setting-backend" value="${escHtml(_backendUrl)}" />
        <span style="font-size:10px;color:var(--text-muted)">Default: http://127.0.0.1:8000</span>
      </div>

      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="pl-btn" id="setting-clear-cache" style="flex:1">Clear Cache</button>
        <button class="pl-btn pl-btn-primary" id="setting-save" style="flex:1">Save</button>
      </div>
    </div>
  `;

  overlay.querySelector('#modal-close').addEventListener('click', () => parent.removeChild(overlay));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) parent.removeChild(overlay);
  });

  overlay.querySelector('#setting-save').addEventListener('click', async () => {
    const val = overlay.querySelector('#setting-backend').value.trim();
    if (val) {
      _backendUrl = val.replace(/\/+$/, '');
      await chrome.storage.local.set({ config_backend_url: _backendUrl });
    }
    parent.removeChild(overlay);
  });

  overlay.querySelector('#setting-clear-cache').addEventListener('click', async () => {
    await chrome.storage.local.clear();
    alert('Local PolicyLens cache cleared.');
    parent.removeChild(overlay);
  });

  parent.appendChild(overlay);
}

// ─── Share as Image (html2canvas) ──────────────────────────────────────────

async function shareAsImage(data, hostname, btn) {
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="pl-spinner"></span><span>Exporting…</span>`;

  try {
    const card = buildExportCard(data, hostname);
    document.body.appendChild(card);

    if (typeof html2canvas !== 'function') {
      throw new Error('html2canvas library not loaded');
    }

    // Wait a frame so layout, fonts, and inline styles are fully computed
    await new Promise(resolve => requestAnimationFrame(resolve));

    const cardWidth = card.offsetWidth || 380;
    const cardHeight = card.offsetHeight || 520;

    const canvas = await html2canvas(card, {
      backgroundColor: '#0B0F17',
      scale: 2,
      useCORS: true,
      logging: false,
      x: 0,
      y: 0,
      width: cardWidth,
      height: cardHeight,
      windowWidth: cardWidth,
      windowHeight: cardHeight,
      scrollX: 0,
      scrollY: 0,
    });

    document.body.removeChild(card);

    const link = document.createElement('a');
    link.download = `PolicyLens-${hostname}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('[PolicyLens] Export error:', err);
    alert('Failed to generate image: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function buildExportCard(data, hostname) {
  const score = data.score || 0;
  const grade = data.grade || 'C';
  const practices = (data.practices || []).slice(0, 8);
  const clauses = (data.clauses || []).slice(0, 2);
  const controlScore = data.controlScore ?? 50;

  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 380px;
    box-sizing: border-box;
    background: #0B0F17;
    color: #94A3B8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    z-index: -9999;
    pointer-events: none;
  `;

  let practicesHtml = practices.map(p => {
    let color = '#F59E0B';
    let bg = 'rgba(245, 158, 11, 0.12)';
    if (p.status === 'yes') { color = '#10B981'; bg = 'rgba(16, 185, 129, 0.12)'; }
    if (p.status === 'no') { color = '#EF4444'; bg = 'rgba(239, 68, 68, 0.12)'; }
    return `
      <div style="background:#131A26;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;font-weight:600;color:#F8FAFC;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px">${escHtml(p.label)}</span>
        <span style="font-size:10px;font-weight:700;color:${color};background:${bg};padding:1px 5px;border-radius:4px">${escHtml(p.status.toUpperCase())}</span>
      </div>
    `;
  }).join('');

  let clausesHtml = clauses.map(c => `
    <div style="background:#131A26;border:1px solid rgba(255,255,255,0.08);border-left:3px solid #F59E0B;border-radius:6px;padding:8px 10px;margin-bottom:6px">
      <div style="font-size:11px;font-weight:600;color:#F8FAFC;margin-bottom:2px">${escHtml(c.consequence || 'Risky clause')}</div>
      <div style="font-size:10px;font-style:italic;color:#94A3B8;line-height:1.3">"${escHtml(c.quote || '')}"</div>
    </div>
  `).join('');

  let gradeColor = '#10B981';
  if (score < 45) gradeColor = '#EF4444';
  else if (score < 75) gradeColor = '#F59E0B';

  wrap.innerHTML = `
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px">
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:20px;height:20px;border-radius:5px;background:#6366F1;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold">🛡</div>
        <span style="font-size:14px;font-weight:800;color:#FFFFFF">PolicyLens</span>
        <span style="font-size:9px;font-weight:700;color:#6366F1;background:rgba(99,102,241,0.18);padding:1px 5px;border-radius:10px">AUDIT</span>
      </div>
      <div style="font-size:12px;font-weight:700;color:#CBD5E1">${escHtml(hostname)}</div>
    </div>

    <!-- Score Card -->
    <div style="background:#131A26;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:16px;margin-bottom:14px">
      <div style="font-size:38px;font-weight:900;color:#FFFFFF;line-height:1">${score}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:10px;font-weight:800;color:${gradeColor};background:rgba(255,255,255,0.06);border:1px solid ${gradeColor}44;padding:2px 6px;border-radius:4px">GRADE ${escHtml(grade)}</span>
          <span style="font-size:12px;font-weight:700;color:#FFFFFF">${score >= 70 ? 'Good Protection' : (score >= 45 ? 'Moderate Risk' : 'High Concern')}</span>
        </div>
        <div style="font-size:11px;color:#94A3B8;line-height:1.3">${escHtml(data.verdict || 'Privacy assessment completed.')}</div>
      </div>
    </div>

    <!-- Practices Section -->
    <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Data Practices</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
      ${practicesHtml}
    </div>

    ${clauses.length > 0 ? `
      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Key Clauses Identified</div>
      <div style="margin-bottom:12px">
        ${clausesHtml}
      </div>
    ` : ''}

    <!-- User Autonomy Footer -->
    <div style="background:#131A26;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span style="font-size:11px;color:#94A3B8">User Data Autonomy</span>
      <span style="font-size:12px;font-weight:800;color:#6366F1">${controlScore}%</span>
    </div>

    <!-- Watermark -->
    <div style="text-align:center;font-size:10px;color:#475569;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px">
      Generated by PolicyLens • Instant Privacy Intelligence
    </div>
  `;

  return wrap;
}

// ─── Data Shaping ──────────────────────────────────────────────────────────

function shapeApiResponse(hostname, api) {
  const statusMap = { YES: 'yes', NO: 'no', PARTIAL: 'partial', UNCLEAR: 'unclear' };

  const practices = (api.risk_badges || []).map((b) => ({
    label: b.category || 'General',
    status: statusMap[String(b.verdict).toUpperCase()] || 'partial',
    detail: b.plain_english || '',
  }));

  const clauses = (api.dangerous_clauses || []).map((c) => ({
    quote: c.original || '',
    consequence: c.plain_english || '',
  }));

  const neg = api.negotiation_score || {};
  const controlItems = [
    { label: 'Can opt out of data selling', granted: !!neg.opt_out_data_selling },
    { label: 'Can download / export personal data', granted: !!neg.download_your_data },
    { label: 'Can request complete account deletion', granted: !!neg.full_account_deletion },
  ];

  const verdictMap = {
    A: 'Strong data protections with minimal user risk.',
    B: 'Respectable privacy practices with minor trade-offs.',
    C: 'Average protections — multiple data-sharing caveats.',
    D: 'Weak user protections with significant data collection.',
    F: 'High risk — aggressive data monetization and minimal rights.',
  };

  return {
    hostname,
    score: api.overall_score ?? 50,
    grade: api.grade ?? 'C',
    verdict: verdictMap[api.grade] || 'Review privacy provisions before sharing sensitive details.',
    policyUrl: api.policy_url ?? null,
    practices,
    clauses,
    controlScore: neg.score ?? 50,
    controlItems,
    policyLastUpdated: api.policy_last_updated ?? null,
    retentionPeriod: api.retention_period ?? null,
    trackingCookies: api.tracking_cookies ?? null,
    source: api.source ?? 'gemini',
    analysedAt: Date.now(),
  };
}

// ─── Utility Helpers ───────────────────────────────────────────────────────

function stripWww(hostname) {
  return String(hostname || '').replace(/^www\./i, '');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
