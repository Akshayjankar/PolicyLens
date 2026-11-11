"""LLM analysis logic — calls Gemini REST API via httpx (no SDK dependency) with heuristic fallback."""

import asyncio
import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException
from prompts import ANALYSIS_SYSTEM_PROMPT

load_dotenv()

logger = logging.getLogger(__name__)

# Configurable models: defaults to gemini-1.5-flash with modern fallbacks
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
CANDIDATE_MODELS = [
    PRIMARY_MODEL,
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
]
# Deduplicate while preserving order
CANDIDATE_MODELS = list(dict.fromkeys(CANDIDATE_MODELS))


def _clean_json_str(raw: str) -> str:
    """Strip markdown fences, leading/trailing whitespace, and comments."""
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw.strip(), flags=re.MULTILINE)
    raw = raw.strip()
    return raw


def _sanitize_analysis(data: Dict[str, Any], source: str = "gemini") -> Dict[str, Any]:
    """Ensure all required fields exist and conform to schemas."""
    score = data.get("overall_score", 50)
    try:
        score = int(score)
    except (ValueError, TypeError):
        score = 50
    score = max(0, min(100, score))

    grade = data.get("grade")
    if not grade or grade not in ("A", "B", "C", "D", "F"):
        if score >= 80:
            grade = "A"
        elif score >= 65:
            grade = "B"
        elif score >= 50:
            grade = "C"
        elif score >= 35:
            grade = "D"
        else:
            grade = "F"

    risk_badges = []
    for item in data.get("risk_badges", []):
        if not isinstance(item, dict):
            continue
        verdict = str(item.get("verdict", "PARTIAL")).upper()
        if verdict not in ("YES", "NO", "PARTIAL", "UNCLEAR"):
            verdict = "PARTIAL"
        severity = str(item.get("severity", "yellow")).lower()
        if severity not in ("red", "yellow", "green"):
            severity = "yellow"
        risk_badges.append({
            "category": str(item.get("category", "General")),
            "verdict": verdict,
            "severity": severity,
            "plain_english": str(item.get("plain_english", ""))[:200],
        })

    dangerous_clauses = []
    for item in data.get("dangerous_clauses", []):
        if not isinstance(item, dict):
            continue
        dangerous_clauses.append({
            "original": str(item.get("original", ""))[:400],
            "plain_english": str(item.get("plain_english", ""))[:200],
        })

    neg_raw = data.get("negotiation_score") or {}
    neg_score = neg_raw.get("score", 50)
    try:
        neg_score = int(neg_score)
    except (ValueError, TypeError):
        neg_score = 50

    negotiation_score = {
        "score": max(0, min(100, neg_score)),
        "opt_out_data_selling": bool(neg_raw.get("opt_out_data_selling", False)),
        "download_your_data": bool(neg_raw.get("download_your_data", False)),
        "full_account_deletion": bool(neg_raw.get("full_account_deletion", False)),
        "summary": str(neg_raw.get("summary", "You have moderate control over your data.")),
    }

    return {
        "overall_score": score,
        "grade": grade,
        "policy_last_updated": data.get("policy_last_updated"),
        "retention_period": data.get("retention_period"),
        "tracking_cookies": data.get("tracking_cookies"),
        "risk_badges": risk_badges,
        "dangerous_clauses": dangerous_clauses,
        "negotiation_score": negotiation_score,
        "source": source,
    }


def heuristic_analyze_policy(text: str) -> Dict[str, Any]:
    """
    Fast rule-based policy analyzer that runs offline without external APIs.
    Used as an automatic fallback if Gemini API is unavailable or quota is exceeded.
    """
    lower = text.lower()
    score = 65

    # 1. Date extraction
    date_match = re.search(
        r"(?:last\s+updated|effective\s+date|last\s+revised|updated\s+on)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})",
        text,
        re.IGNORECASE,
    )
    policy_date = None
    if date_match:
        policy_date = date_match.group(1)

    # 2. Sells data check
    sells_data = False
    shares_third = False
    if re.search(r"we\s+do\s+not\s+sell\s+(?:your\s+)?personal\s+data|never\s+sell", lower):
        sells_badge = {"category": "Sells Your Data", "verdict": "NO", "severity": "green", "plain_english": "The policy states they do not sell your personal data."}
        score += 10
    elif re.search(r"\bsell\b.*\bpersonal\s+information\b|\bshare\b.*\bfor\s+(?:advertising|marketing)\b", lower):
        sells_badge = {"category": "Sells Your Data", "verdict": "YES", "severity": "red", "plain_english": "May share or sell information for targeted advertising."}
        score -= 20
        sells_data = True
    else:
        sells_badge = {"category": "Sells Your Data", "verdict": "PARTIAL", "severity": "yellow", "plain_english": "Data selling practices are not clearly restricted."}

    # 3. Location Tracking
    if re.search(r"precise\s+geolocation|gps\s+location|precise\s+location", lower):
        loc_badge = {"category": "Location Tracking", "verdict": "YES", "severity": "red", "plain_english": "Collects precise GPS and geolocation information."}
        score -= 10
    elif re.search(r"approximate\s+location|ip\s+address\s+location", lower):
        loc_badge = {"category": "Location Tracking", "verdict": "PARTIAL", "severity": "yellow", "plain_english": "Collects coarse or IP-based location data only."}
    else:
        loc_badge = {"category": "Location Tracking", "verdict": "NO", "severity": "green", "plain_english": "No direct continuous GPS tracking mentioned."}

    # 4. Data Deletion
    can_delete = False
    if re.search(r"right\s+to\s+delete|request\s+deletion|delete\s+your\s+data|erasure", lower):
        del_badge = {"category": "Data Deletion", "verdict": "YES", "severity": "green", "plain_english": "Explicit right to request deletion of your personal data."}
        score += 8
        can_delete = True
    else:
        del_badge = {"category": "Data Deletion", "verdict": "NO", "severity": "red", "plain_english": "No clear process for permanent personal data deletion."}
        score -= 10

    # 5. Encryption
    if re.search(r"encrypt|ssl|tls|aes|industry\s+standard\s+security", lower):
        enc_badge = {"category": "Encryption", "verdict": "YES", "severity": "green", "plain_english": "Mentions industry-standard encryption for stored and transmitted data."}
        score += 5
    else:
        enc_badge = {"category": "Encryption", "verdict": "NO", "severity": "yellow", "plain_english": "Specific technical encryption measures are not detailed."}

    # 6. Third Parties
    if re.search(r"share\s+with\s+(?:third\s+parties|partners|affiliates|service\s+providers)", lower):
        third_badge = {"category": "Shares With Third Parties", "verdict": "YES", "severity": "yellow", "plain_english": "Shares personal data with partners and third-party vendors."}
        shares_third = True
    else:
        third_badge = {"category": "Shares With Third Parties", "verdict": "NO", "severity": "green", "plain_english": "Does not broadly share data with external third parties."}
        score += 5

    # 7. Children Protection
    if re.search(r"under\s+13|coppa|children|minors", lower):
        child_badge = {"category": "Children Protection", "verdict": "YES", "severity": "green", "plain_english": "Contains specific provisions protecting minors under 13."}
    else:
        child_badge = {"category": "Children Protection", "verdict": "NO", "severity": "yellow", "plain_english": "Does not explicitly mention child data protection policies."}

    # 8. Data Portability
    can_download = False
    if re.search(r"portability|download\s+your\s+data|export\s+your\s+information|obtain\s+a\s+copy", lower):
        port_badge = {"category": "Data Portability", "verdict": "YES", "severity": "green", "plain_english": "Provides options to request a copy or export your data."}
        score += 6
        can_download = True
    else:
        port_badge = {"category": "Data Portability", "verdict": "NO", "severity": "yellow", "plain_english": "Data download/export is not explicitly described."}

    # 9. Account Deletion
    can_full_delete = False
    if re.search(r"delete\s+your\s+account|close\s+your\s+account|account\s+termination", lower):
        acc_badge = {"category": "Account Deletion", "verdict": "YES", "severity": "green", "plain_english": "Users can delete or close their accounts."}
        can_full_delete = True
    else:
        acc_badge = {"category": "Account Deletion", "verdict": "NO", "severity": "red", "plain_english": "No straightforward account termination instructions."}
        score -= 5

    badges = [
        sells_badge,
        loc_badge,
        del_badge,
        enc_badge,
        third_badge,
        child_badge,
        port_badge,
        acc_badge,
    ]

    # Find noteworthy clauses
    clauses = []
    lines = [s.strip() for s in text.split(".") if len(s.strip()) > 35]
    for line in lines:
        l_low = line.lower()
        if any(w in l_low for w in ("third party", "advertising", "retain", "share", "modify", "consent")):
            clean_q = re.sub(r"\s+", " ", line).strip()
            if 30 <= len(clean_q) <= 240:
                clauses.append({
                    "original": clean_q,
                    "plain_english": "May retain or share user activity data across affiliated services.",
                })
        if len(clauses) >= 3:
            break

    if not clauses:
        clauses.append({
            "original": "We may update this privacy statement from time to time to reflect changes to our practices.",
            "plain_english": "Policy can be modified without mandatory direct advance notice.",
        })

    # Cookies
    cookies = "analytics_opt_out"
    if "functional cookies only" in lower:
        cookies = "functional_only"
    elif "no opt-out" in lower:
        cookies = "no_opt_out"

    score = max(20, min(95, score))

    neg_score = 40
    if not sells_data:
        neg_score += 20
    if can_delete:
        neg_score += 15
    if can_download:
        neg_score += 15
    if can_full_delete:
        neg_score += 10

    raw_result = {
        "overall_score": score,
        "policy_last_updated": policy_date,
        "retention_period": "Subject to active account lifecycle",
        "tracking_cookies": cookies,
        "risk_badges": badges,
        "dangerous_clauses": clauses,
        "negotiation_score": {
            "score": neg_score,
            "opt_out_data_selling": not sells_data,
            "download_your_data": can_download,
            "full_account_deletion": can_full_delete,
            "summary": f"You maintain {neg_score}% control over your personal data on this platform.",
        },
    }

    return _sanitize_analysis(raw_result, source="heuristic")


async def analyze_policy(policy_text: str) -> dict:
    """
    Send policy text to Google Gemini via the REST API with multi-model fallback.
    Falls back gracefully to the heuristic engine if API key is invalid or quota is reached.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # If API key is completely missing or is default placeholder, fall back cleanly
    if not api_key or api_key == "your_gemini_api_key_here":
        logger.warning("GEMINI_API_KEY is not configured. Utilizing PolicyLens heuristic engine.")
        return heuristic_analyze_policy(policy_text)

    payload = {
        "system_instruction": {"parts": [{"text": ANALYSIS_SYSTEM_PROMPT}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Analyze this privacy policy and return ONLY valid JSON, "
                            "no markdown fences:\n\n"
                            + policy_text[:14000]
                        )
                    }
                ],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": 2048,
            "temperature": 0.1,
        },
    }

    last_error_detail = None

    for model_name in CANDIDATE_MODELS:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        logger.info("Attempting Gemini analysis with model: %s", model_name)

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=40.0) as client:
                    resp = await client.post(
                        api_url,
                        params={"key": api_key},
                        json=payload,
                    )

                    # Model not found or not supported for this API version -> try next model
                    if resp.status_code == 404:
                        logger.warning("Model %s returned 404 Not Found. Trying fallback model.", model_name)
                        last_error_detail = f"Model {model_name} not available (404)"
                        break

                    # Rate limited / Quota exhausted
                    if resp.status_code == 429:
                        logger.warning("Model %s hit 429 rate limit. Trying fallback model.", model_name)
                        last_error_detail = "Gemini API quota exceeded (429)"
                        break

                    # Transient server overload
                    if resp.status_code in (500, 503):
                        await asyncio.sleep(1.5 * (attempt + 1))
                        last_error_detail = f"Gemini server error {resp.status_code}"
                        continue

                    # Invalid API key
                    if resp.status_code in (400, 403):
                        err_text = resp.text
                        logger.error("Gemini API key error (%s): %s", resp.status_code, err_text)
                        # If API key is rejected by Google, fall back to heuristic rather than crashing the extension
                        logger.warning("Falling back to local heuristic analysis due to API key error.")
                        return heuristic_analyze_policy(policy_text)

                    resp.raise_for_status()
                    data = resp.json()

                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    cleaned = _clean_json_str(raw_text)
                    parsed = json.loads(cleaned)

                    logger.info("Successfully analyzed policy using %s", model_name)
                    return _sanitize_analysis(parsed, source="gemini")

            except (KeyError, IndexError, json.JSONDecodeError) as parse_err:
                logger.warning("Failed to parse Gemini JSON from %s: %s", model_name, parse_err)
                last_error_detail = f"Invalid JSON response: {parse_err}"
                break
            except httpx.ReadTimeout:
                logger.warning("Timeout contacting Gemini with %s (attempt %d)", model_name, attempt + 1)
                last_error_detail = "Gemini API read timeout"
                continue
            except Exception as exc:
                logger.warning("Exception calling Gemini model %s: %s", model_name, exc)
                last_error_detail = str(exc)
                break

    # If all models failed or timed out, gracefully return heuristic analysis
    logger.warning("All Gemini model attempts failed (%s). Using heuristic analysis fallback.", last_error_detail)
    fallback_res = heuristic_analyze_policy(policy_text)
    fallback_res["_warning"] = f"Generated via heuristic engine (Gemini: {last_error_detail})"
    return fallback_res
