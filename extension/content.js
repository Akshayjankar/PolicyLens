// PolicyLens Content Script
// Runs on every page at document_idle to detect privacy policy links

(function () {
  'use strict';

  const PRIVACY_TEXT_PATTERNS = [
    /privacy\s*policy/i,
    /data\s*policy/i,
    /privacy\s*notice/i,
    /\bprivacy\b/i,
  ];

  const PRIVACY_HREF_PATTERNS = [
    /\/privacy(?:-policy)?(?:\/|$)/i,
    /\/legal\/privacy/i,
    /\/data-policy/i,
    /\/policies\/privacy/i,
  ];

  function scoreLink(anchor) {
    let score = 0;
    const text = (anchor.textContent || '').trim();
    const href = (anchor.getAttribute('href') || '').toLowerCase();

    // Text match (higher priority)
    for (const pattern of PRIVACY_TEXT_PATTERNS) {
      if (pattern.test(text)) {
        score += 10;
        break;
      }
    }

    // Href match
    for (const pattern of PRIVACY_HREF_PATTERNS) {
      if (pattern.test(href)) {
        score += 5;
        break;
      }
    }

    // Footer bonus
    const inFooter = !!anchor.closest('footer, [role="contentinfo"], .footer, #footer, [class*="footer"]');
    if (inFooter) score += 3;

    return score;
  }

  function resolveUrl(href) {
    try {
      return new URL(href, window.location.href).href;
    } catch {
      return null;
    }
  }

  function findPrivacyPolicyUrl() {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    let best = null;
    let bestScore = 0;

    for (const anchor of anchors) {
      const score = scoreLink(anchor);
      if (score > bestScore) {
        const resolved = resolveUrl(anchor.getAttribute('href'));
        if (resolved) {
          bestScore = score;
          best = resolved;
        }
      }
    }

    // Must have at least some signal
    return bestScore >= 5 ? best : null;
  }

  const foundUrl = findPrivacyPolicyUrl();

  // Notify background service worker — it will store privacyUrl_${tabId}
  chrome.runtime.sendMessage({
    type: 'PRIVACY_URL_FOUND',
    url: foundUrl
  }).catch(() => {
    // Background may not be ready yet — that's fine
  });
})();
