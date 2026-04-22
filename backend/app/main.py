import os
import hashlib
import mimetypes
import logging
from uuid import uuid4
from typing import List, Optional
from fastapi import FastAPI, Form, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from supabase import create_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")

logger.info("Initializing Supabase client...")
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="Bug Tracker API")

ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_FILES = 5
BUCKET = "bug-screenshots"


def compute_fingerprint(title: str, description: str, environment: str) -> str:
    norm = (title + "\n" + description + "\n" + (environment or "")).strip().lower()
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


@app.post("/api/bugs/")
def create_bug(
    title: str = Form(...),
    description: str = Form(...),
    steps_to_reproduce: Optional[str] = Form(None),
    expected_behavior: Optional[str] = Form(None),
    actual_behavior: Optional[str] = Form(None),
    severity: str = Form("medium"),
    priority: str = Form("normal"),
    environment: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # comma-separated
    submitted_by: str = Form(...),  # profile id
    team_id: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
):
    logger.info(f"Received request to create bug: '{title}' by user {submitted_by} for team {team_id}")
    
    # Validate lengths
    if len(description or "") < 20:
        logger.warning(f"Bug creation failed: description too short ({len(description or '')} chars)")
        raise HTTPException(status_code=400, detail="Description must be at least 20 characters")

    # Compute fingerprint
    fingerprint = compute_fingerprint(title, description, environment or "")
    # Check duplicate
    res = sb.table("bugs").select("id,title").eq("fingerprint", fingerprint).execute()
    if res.error:
        logger.error(f"Database error during fingerprint check: {res.error}")
        raise HTTPException(status_code=500, detail="DB error")
    if res.data and len(res.data) > 0:
        existing = res.data[0]
        logger.info(f"Duplicate bug found: {existing['id']}")
        return JSONResponse(status_code=409, content={"detail": "duplicate", "id": existing["id"], "title": existing["title"]})

    # Resolve team slug (useful for client-side uploads)
    team_res = sb.table("teams").select("slug").eq("id", team_id).execute()
    if team_res.error or not team_res.data:
        logger.error(f"Team validation failed for team_id: {team_id}")
        raise HTTPException(status_code=400, detail="Invalid team_id or cannot find team slug")
    team_slug = team_res.data[0]["slug"]

    # Insert bug (without screenshots first)
    tags_arr = [t.strip() for t in (tags or "").split(",") if t.strip()]
    bug_obj = {
        "title": title,
        "description": description,
        "steps_to_reproduce": steps_to_reproduce,
        "expected_behavior": expected_behavior,
        "actual_behavior": actual_behavior,
        "severity": severity,
        "priority": priority,
        "environment": environment,
        "version": version,
        "screenshot_urls": [],
        "submitted_by": submitted_by,
        "team_id": team_id,
        "assigned_to": None,
        "is_duplicate": False,
        "fingerprint": fingerprint,
        "tags": tags_arr,
    }
    insert_res = sb.table("bugs").insert(bug_obj).execute()
    if insert_res.error:
        raise HTTPException(status_code=500, detail=str(insert_res.error))
    created = insert_res.data[0]
    bug_id = created["id"]

    # Upload files if any
    urls = []
    if files:
        if len(files) > MAX_FILES:
            raise HTTPException(status_code=400, detail=f"Max {MAX_FILES} images allowed")
        # Get team slug
        team_res = sb.table("teams").select("slug").eq("id", team_id).execute()
        if team_res.error or not team_res.data:
            raise HTTPException(status_code=400, detail="Invalid team_id or cannot find team slug")
        team_slug = team_res.data[0]["slug"]

        for f in files:
            if f.content_type not in ALLOWED_MIME:
                raise HTTPException(status_code=400, detail=f"Invalid MIME type: {f.content_type}")
            contents = f.file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"File {f.filename} exceeds max size")
            # Prevent certain extensions
            lower = (f.filename or "").lower()
            if lower.endswith(".svg") or lower.endswith(".pdf") or lower.endswith(".exe"):
                raise HTTPException(status_code=400, detail="Prohibited file type")
            ext = "jpg"
            if f.content_type == "image/png":
                ext = "png"
            elif f.content_type == "image/webp":
                ext = "webp"
            elif f.content_type == "image/gif":
                ext = "gif"
            elif f.content_type == "image/jpeg":
                ext = "jpg"
            filename = f"{str(uuid4())}.{ext}"
            path = f"{team_slug}/{bug_id}/{filename}"
            upload = sb.storage.from_(BUCKET).upload(path, contents, {'content-type': f.content_type})
            if upload.error:
                raise HTTPException(status_code=500, detail=f"Upload failed for {f.filename}")
            # Get public url (bucket should be public-read per spec)
            public = sb.storage.from_(BUCKET).get_public_url(path)
            urls.append(public["publicURL"] if isinstance(public, dict) and "publicURL" in public else public)

        # Update bug with screenshot URLs
        upd = sb.table("bugs").update({"screenshot_urls": urls}).eq("id", bug_id).execute()
        if upd.error:
            raise HTTPException(status_code=500, detail="Failed to update bug with screenshots")

    return {"id": bug_id, "screenshot_urls": urls, "team_slug": team_slug}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))


@app.get("/api/bugs/check")
def check_duplicate(title: str, description: str = "", environment: str = ""):
    """Compute fingerprint server-side and check for existing bug.
    Returns 200 + {exists:false} or 200 + {exists:true, id, title}
    """
    fp = compute_fingerprint(title, description, environment)
    res = sb.table("bugs").select("id,title").eq("fingerprint", fp).execute()
    if res.error:
        raise HTTPException(status_code=500, detail="DB error")
    if res.data and len(res.data) > 0:
        existing = res.data[0]
        return {"exists": True, "id": existing["id"], "title": existing["title"]}
    return {"exists": False}


@app.post("/api/bugs/{bug_id}/screenshots")
def update_screenshots(bug_id: str, urls: List[str]):
    """Update screenshot_urls for a bug. Accepts JSON array of URLs."""
    upd = sb.table("bugs").update({"screenshot_urls": urls}).eq("id", bug_id).execute()
    if upd.error:
        raise HTTPException(status_code=500, detail="Failed to update screenshots")
    return {"id": bug_id, "screenshot_urls": urls}
