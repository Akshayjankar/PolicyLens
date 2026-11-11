"""PolicyLens FastAPI application — entry point and all routes."""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import PolicySnapshot
from schemas import AnalyzeRequest, AnalyzeResponse, SnapshotSummary
from detector import detect_privacy_policy_url
from scraper import fetch_and_clean_policy
from analyzer import analyze_policy

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

try:
    from diff_match_patch import diff_match_patch
    _DMP_AVAILABLE = True
except ImportError:
    _DMP_AVAILABLE = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title='PolicyLens API',
    description='Analyze privacy policies and return structured risk reports.',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['GET', 'POST', 'OPTIONS'],
    allow_headers=['*'],
)


class PrivateNetworkMiddleware(BaseHTTPMiddleware):
    """Add Private Network Access header so Chrome allows extension→localhost requests."""
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get('origin', '*')
        if request.method == 'OPTIONS':
            response = JSONResponse(content='', status_code=200)
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
            response.headers['Access-Control-Allow-Headers'] = '*'
            response.headers['Access-Control-Allow-Private-Network'] = 'true'
            response.headers['Access-Control-Max-Age'] = '600'
            return response
        response = await call_next(request)
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Private-Network'] = 'true'
        return response


app.add_middleware(PrivateNetworkMiddleware)


@app.get('/health')
def health_check():
    """Health check endpoint."""
    return {'status': 'ok'}


@app.post('/analyze', response_model=AnalyzeResponse)
async def analyze_site(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
):
    """
    Analyze a website's privacy policy.

    1. Detect privacy policy URL if not supplied.
    2. Fetch and clean the policy text.
    3. Compare with previous snapshot to detect changes.
    4. Run LLM analysis.
    5. Save snapshot to DB.
    6. Return structured report.
    """
    site_url = request.site_url.rstrip('/')
    policy_url = request.policy_url
    policy_text = request.policy_text

    # 1. Detect URL if not provided
    if not policy_url:
        policy_url = await detect_privacy_policy_url(site_url)

    if not policy_url and not policy_text:
        raise HTTPException(
            status_code=404,
            detail=f'Could not automatically locate privacy policy for {site_url}. Try navigating directly to their privacy policy page.'
        )

    if not policy_url:
        policy_url = f"{site_url}/privacy"

    # 2. Fetch and clean policy text if not supplied by extension
    if not policy_text or len(policy_text.strip()) < 80:
        try:
            policy_text = await fetch_and_clean_policy(policy_url)
        except Exception as exc:
            logger.exception("Failed to fetch policy from %s", policy_url)
            raise HTTPException(
                status_code=500,
                detail=f'Failed to fetch privacy policy: {exc}'
            ) from exc

    # 3. Check for previous snapshot
    previous = (
        db.query(PolicySnapshot)
        .filter(PolicySnapshot.site_url == site_url)
        .order_by(PolicySnapshot.analyzed_at.desc())
        .first()
    )

    policy_changed = False
    previous_analysis_date = None
    diff_html = None

    if previous:
        policy_changed = previous.policy_text.strip() != policy_text.strip()
        previous_analysis_date = previous.analyzed_at

        if policy_changed and _DMP_AVAILABLE:
            dmp = diff_match_patch()
            diffs = dmp.diff_main(previous.policy_text, policy_text)
            dmp.diff_cleanupSemantic(diffs)
            diff_html = dmp.diff_prettyHtml(diffs)

    # 4. Run LLM analysis
    try:
        analysis = await analyze_policy(policy_text)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("analyze_policy raised unexpected error")
        raise HTTPException(status_code=500, detail=f"Analysis error: {exc}") from exc

    # 5. Determine grade
    overall_score = analysis.get('overall_score', 50)
    grade = analysis.get('grade', 'C')

    # 6. Save snapshot
    snapshot = PolicySnapshot(
        site_url=site_url,
        policy_url=policy_url,
        policy_text=policy_text,
        analysis=analysis,
        overall_score=overall_score,
        analyzed_at=datetime.utcnow(),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    # 7. Build response
    return AnalyzeResponse(
        site_url=site_url,
        policy_url=policy_url,
        overall_score=overall_score,
        grade=grade,
        risk_badges=analysis.get('risk_badges', []),
        dangerous_clauses=analysis.get('dangerous_clauses', []),
        negotiation_score=analysis.get('negotiation_score', {}),
        policy_changed=policy_changed,
        previous_analysis_date=previous_analysis_date,
        diff_html=diff_html,
        snapshot_id=snapshot.id,
        policy_last_updated=analysis.get('policy_last_updated'),
        retention_period=analysis.get('retention_period'),
        tracking_cookies=analysis.get('tracking_cookies'),
        source=analysis.get('source', 'gemini'),
    )


@app.get('/history', response_model=list[SnapshotSummary])
def get_history(
    site_url: str = Query(..., description='Site URL to retrieve history for'),
    db: Session = Depends(get_db),
):
    """
    Return all previous analysis snapshots for a given site URL,
    ordered by most recent first.
    """
    site_url = site_url.rstrip('/')
    snapshots = (
        db.query(PolicySnapshot)
        .filter(PolicySnapshot.site_url == site_url)
        .order_by(PolicySnapshot.analyzed_at.desc())
        .all()
    )
    return snapshots


if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
