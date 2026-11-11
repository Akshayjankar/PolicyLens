"""Detects privacy policy URLs from a given website."""

import re
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup

# Known privacy policy URLs for popular sites (shortcuts)
KNOWN_POLICIES = {
    'youtube.com': 'https://www.youtube.com/t/privacy',
    'www.youtube.com': 'https://www.youtube.com/t/privacy',
    'google.com': 'https://policies.google.com/privacy',
    'www.google.com': 'https://policies.google.com/privacy',
    'facebook.com': 'https://www.facebook.com/privacy/policy',
    'www.facebook.com': 'https://www.facebook.com/privacy/policy',
    'instagram.com': 'https://help.instagram.com/privacy/policy',
    'www.instagram.com': 'https://help.instagram.com/privacy/policy',
    'twitter.com': 'https://twitter.com/privacy',
    'x.com': 'https://twitter.com/privacy',
}

PRIVACY_TEXT_PATTERNS = [
    re.compile(r'privacy\s+policy', re.IGNORECASE),
    re.compile(r'data\s+policy', re.IGNORECASE),
    re.compile(r'privacy\s+notice', re.IGNORECASE),
    re.compile(r'^privacy$', re.IGNORECASE),
]

PRIVACY_HREF_PATTERNS = [
    re.compile(r'/privacy(?:-policy)?(?:/|$)', re.IGNORECASE),
    re.compile(r'/legal/privacy', re.IGNORECASE),
    re.compile(r'/data-policy', re.IGNORECASE),
    re.compile(r'/policies/privacy', re.IGNORECASE),
]

COMMON_PATHS = [
    '/privacy',
    '/privacy-policy',
    '/legal/privacy',
    '/data-policy',
    '/policies/privacy',
]


def _score_anchor(tag, base_url: str) -> tuple[int, str | None]:
    """Score a BeautifulSoup anchor tag and return (score, resolved_url)."""
    text = tag.get_text(strip=True)
    href = tag.get('href', '').strip()
    if not href or href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
        return 0, None
    score = 0

    for pattern in PRIVACY_TEXT_PATTERNS:
        if pattern.search(text):
            score += 10
            break

    for pattern in PRIVACY_HREF_PATTERNS:
        if pattern.search(href):
            score += 5
            break

    # Footer bonus
    for parent in tag.parents:
        if parent.name in ('footer',) or (
            isinstance(parent.get('class'), list) and
            any('footer' in c.lower() for c in parent.get('class', []))
        ) or parent.get('role') == 'contentinfo':
            score += 3
            break

    if score == 0:
        return 0, None

    try:
        resolved = urljoin(base_url, href)
        return score, resolved
    except Exception:
        return 0, None


async def detect_privacy_policy_url(site_url: str) -> str | None:
    """
    Attempt to detect the privacy policy URL for a given website.

    Returns the URL string if found, or None.
    """
    # Check known shortcuts first
    parsed_site = urlparse(site_url)
    domain = parsed_site.netloc.lower()
    if domain in KNOWN_POLICIES:
        return KNOWN_POLICIES[domain]
    
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36'
        )
    }

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,  # Increased timeout for large pages like YouTube
            headers=headers,
        ) as client:
            # 1. Fetch homepage
            try:
                resp = await client.get(site_url)
                resp.raise_for_status()
            except Exception:
                return None

            soup = BeautifulSoup(resp.text, 'html.parser')
            anchors = soup.find_all('a', href=True)

            best_url = None
            best_score = 0

            for tag in anchors:
                score, url = _score_anchor(tag, str(resp.url))
                if score > best_score:
                    best_score = score
                    best_url = url

            if best_score >= 5 and best_url:
                return best_url

            # 2. Try common URL patterns via HEAD requests
            parsed = urlparse(site_url)
            base = f"{parsed.scheme}://{parsed.netloc}"

            for path in COMMON_PATHS:
                candidate = base + path
                try:
                    head = await client.head(candidate, timeout=5.0)
                    if head.status_code < 400:
                        return candidate
                except Exception:
                    continue

    except Exception:
        pass

    return None
