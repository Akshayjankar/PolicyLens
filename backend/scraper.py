"""Fetches and cleans privacy policy text from a URL with robust anti-bot & query-cleaning fallbacks."""

import logging
import re
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

MAX_WORDS = 12_000
REMOVE_TAGS = ['script', 'style', 'nav', 'header', 'footer', 'noscript', 'iframe', 'svg', 'button']

# Tracking parameters that trigger anti-bot or 400 Bad Request on sites like Facebook
DISALLOWED_QUERY_KEYS = {
    'entry_point', 'fbclid', 'gclid', 'utm_source', 'utm_medium',
    'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source', 'locale'
}

BROWSER_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
}


def clean_url_for_scraping(url: str) -> list[str]:
    """
    Generate candidate URLs to fetch, stripping tracking query parameters
    that frequently cause 400 Bad Request on platforms like Facebook / Meta.
    """
    candidates = []
    try:
        parsed = urlparse(url)
        # 1. Cleaned URL without tracking queries
        qs = parse_qs(parsed.query, keep_blank_values=False)
        clean_qs = {k: v for k, v in qs.items() if k.lower() not in DISALLOWED_QUERY_KEYS}

        new_query = urlencode(clean_qs, doseq=True)
        clean_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, ''))
        
        # 2. Stripped of all queries
        bare_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path.rstrip('/') + '/', '', '', ''))

        if clean_url != url:
            candidates.append(clean_url)
        candidates.append(bare_url)
        candidates.append(url)
    except Exception:
        candidates.append(url)

    # Return unique candidates in order of preference
    return list(dict.fromkeys(candidates))


async def fetch_and_clean_policy(policy_url: str) -> str:
    """
    Fetch a privacy policy page and return cleaned plain text.
    Handles anti-bot 400/403 errors by cycling through cleaned URL candidates and browser headers.
    """
    candidates = clean_url_for_scraping(policy_url)
    last_error = None
    html_content = None

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=25.0,
        headers=BROWSER_HEADERS,
        verify=True,
    ) as client:
        for candidate in candidates:
            try:
                logger.info("Attempting to fetch privacy policy from: %s", candidate)
                resp = await client.get(candidate)
                if resp.status_code == 200 and len(resp.text) > 100:
                    html_content = resp.text
                    break
                elif resp.status_code in (400, 403, 404):
                    logger.warning("Got status %d for %s; trying fallback URL variant...", resp.status_code, candidate)
                    last_error = f"Status {resp.status_code} for {candidate}"
                    continue
                else:
                    resp.raise_for_status()
                    html_content = resp.text
                    break
            except Exception as exc:
                logger.warning("Fetch failed for candidate %s: %s", candidate, exc)
                last_error = str(exc)

    if not html_content:
        raise httpx.HTTPError(f"Could not retrieve policy from {policy_url}: {last_error}")

    soup = BeautifulSoup(html_content, 'html.parser')

    # Remove noisy tags
    for tag_name in REMOVE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    # Extract visible text
    text = soup.get_text(separator=' ')

    # Collapse whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    # Truncate if over word limit
    words = text.split()
    if len(words) > MAX_WORDS:
        text = ' '.join(words[:MAX_WORDS]) + '\n\n[Policy truncated for analysis]'

    return text
