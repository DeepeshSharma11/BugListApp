import os
import hashlib
import mimetypes
import logging
from uuid import uuid4
from typing import List, Optional
import math
from fastapi import FastAPI, Form, File, UploadFile, HTTPException, Request
from pydantic import BaseModel, EmailStr
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import aiosmtplib
from email.message import EmailMessage

class SupportTicketRequest(BaseModel):
    user_id: Optional[str] = None
    user_email: str
    subject: str
    message: str

class SupportReplyRequest(BaseModel):
    reply: str
    status: str

from dotenv import load_dotenv
from supabase import create_client
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

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

ADMIN_SECRET = os.getenv("ADMIN_SECRET")

logger.info("Initializing Supabase client...")
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "akshatgupta1452@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

app = FastAPI(title="Bug Tracker API")

# --- Rate Limiter ---
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow local frontend dev server and production Cloudflare domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://bugtrac.deepeshtech8433.workers.dev"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_FILES = 5
BUCKET = "bug-screenshots"


def compute_fingerprint(title: str, description: str, environment: str) -> str:
    norm = (title + "\n" + description + "\n" + (environment or "")).strip().lower()
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


@app.get("/api/bugs/check")
@limiter.limit("30/minute")
def check_duplicate(request: Request, title: str, description: str = "", environment: str = ""):
    """Compute fingerprint server-side and check for existing bug.
    Returns 200 + {exists:false} or 200 + {exists:true, id, title}
    """
    fp = compute_fingerprint(title, description, environment)
    try:
        res = sb.table("bugs").select("id,title").eq("fingerprint", fp).execute()
    except Exception:
        logger.exception("Exception when querying bugs for duplicate check")
        raise HTTPException(status_code=500, detail="DB error")

    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail="DB error")
    data = getattr(res, "data", None)
    if data and len(data) > 0:
        existing = data[0]
        return {"exists": True, "id": existing["id"], "title": existing["title"]}
    return {"exists": False}


@app.get("/api/bugs/{bug_id}")
@limiter.limit("60/minute")
def get_bug(request: Request, bug_id: str):
    try:
        res = sb.table("bugs").select("*").eq("id", bug_id).execute()
    except Exception:
        logger.exception("Exception when fetching bug by id")
        raise HTTPException(status_code=500, detail="DB error")
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail="DB error")
    data = getattr(res, "data", None)
    if not data or len(data) == 0:
        raise HTTPException(status_code=404, detail="Bug not found")
    return data[0]


@app.get("/api/bugs")
@limiter.limit("60/minute")
def list_bugs(
    request: Request,
    submitted_by: Optional[str] = None,
    team_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
):
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 20
    # Cap per_page to reasonable maximum
    per_page = min(per_page, 100)

    try:
        # Build base query and request exact count
        query = sb.table("bugs").select(
            "id,title,severity,status,priority,submitted_by,team_id,created_at,category",
            count="exact",
        )
        if submitted_by:
            query = query.eq("submitted_by", submitted_by)
        if team_id:
            query = query.eq("team_id", team_id)
        if status:
            query = query.eq("status", status)
        if severity:
            query = query.eq("severity", severity)
        if priority:
            query = query.eq("priority", priority)
        if category:
            query = query.eq("category", category)
        offset = (page - 1) * per_page
        res = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    except Exception:
        logger.exception("Exception when listing bugs")
        raise HTTPException(status_code=500, detail="DB error")

    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail="DB error")

    items = getattr(res, "data", []) or []
    total = getattr(res, "count", None)

    # Fallback: if client doesn't return count, query separately
    if total is None:
        try:
            count_res = sb.table("bugs").select("id", count="exact")
            if submitted_by:
                count_res = count_res.eq("submitted_by", submitted_by)
            if team_id:
                count_res = count_res.eq("team_id", team_id)
            if status:
                count_res = count_res.eq("status", status)
            if severity:
                count_res = count_res.eq("severity", severity)
            if priority:
                count_res = count_res.eq("priority", priority)
            if category:
                count_res = count_res.eq("category", category)
            count_exec = count_res.execute()
            total = getattr(count_exec, "count", None) or (len(getattr(count_exec, "data", []) or []))
        except Exception:
            logger.exception("Exception when counting bugs")
            total = len(items)

    total = int(total or 0)
    total_pages = math.ceil(total / per_page) if per_page > 0 else 1
    # Ensure at least one page to keep frontend UI sane
    total_pages = max(1, int(total_pages))

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


@app.post("/api/bugs/")
@limiter.limit("5/minute")
def create_bug(
    request: Request,
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
    try:
        res = sb.table("bugs").select("id,title").eq("fingerprint", fingerprint).execute()
    except Exception as e:
        logger.exception("Exception when querying bugs for fingerprint check")
        raise HTTPException(status_code=500, detail="DB error")

    if getattr(res, "error", None):
        logger.error(f"Database error during fingerprint check: {getattr(res, 'error', None)}")
        raise HTTPException(status_code=500, detail="DB error")
    data = getattr(res, "data", None)
    if data and len(data) > 0:
        existing = data[0]
        logger.info(f"Duplicate bug found: {existing['id']}")
        return JSONResponse(status_code=409, content={"detail": "duplicate", "id": existing["id"], "title": existing["title"]})

    # Resolve team slug (useful for client-side uploads)
    try:
        team_res = sb.table("teams").select("slug").eq("id", team_id).execute()
    except Exception:
        logger.exception("Exception when querying team slug")
        raise HTTPException(status_code=400, detail="Invalid team_id or cannot find team slug")

    if getattr(team_res, "error", None) or not getattr(team_res, "data", None):
        logger.error(f"Team validation failed for team_id: {team_id}")
        raise HTTPException(status_code=400, detail="Invalid team_id or cannot find team slug")
    team_slug = team_res.data[0]["slug"]

    # Insert bug (without screenshots first)
    tags_arr = [t.strip() for t in (tags or "").split(",") if t.strip()]
    # If tags were used to send category/customCategory, persist the first tag as `category` for filtering
    category_val = tags_arr[0] if len(tags_arr) > 0 else None
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
        "category": category_val,
        "screenshot_urls": [],
        "submitted_by": submitted_by,
        "team_id": team_id,
        "assigned_to": None,
        "is_duplicate": False,
        "fingerprint": fingerprint,
        "tags": tags_arr,
    }
    try:
        insert_res = sb.table("bugs").insert(bug_obj).execute()
    except Exception:
        logger.exception("Exception when inserting new bug")
        raise HTTPException(status_code=500, detail="DB insert error")

    if getattr(insert_res, "error", None):
        raise HTTPException(status_code=500, detail=str(getattr(insert_res, "error")))
    created = getattr(insert_res, "data", [None])[0]
    bug_id = created["id"]

    # Upload files if any
    urls = []
    if files:
        if len(files) > MAX_FILES:
            raise HTTPException(status_code=400, detail=f"Max {MAX_FILES} images allowed")
        # Get team slug
        try:
            team_res = sb.table("teams").select("slug").eq("id", team_id).execute()
        except Exception:
            logger.exception("Exception when querying team slug for uploads")
            raise HTTPException(status_code=400, detail="Invalid team_id or cannot find team slug")
        if getattr(team_res, "error", None) or not getattr(team_res, "data", None):
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
            if getattr(upload, "error", None):
                logger.error(f"Upload failed for {f.filename}: {getattr(upload, 'error', None)}")
                raise HTTPException(status_code=500, detail=f"Upload failed for {f.filename}")
            # Get public url (bucket should be public-read per spec)
            public = sb.storage.from_(BUCKET).get_public_url(path)
            urls.append(public["publicURL"] if isinstance(public, dict) and "publicURL" in public else public)

        # Update bug with screenshot URLs
        upd = sb.table("bugs").update({"screenshot_urls": urls}).eq("id", bug_id).execute()
        if getattr(upd, "error", None):
            logger.error(f"Failed to update bug screenshots: {getattr(upd, 'error', None)}")
            raise HTTPException(status_code=500, detail="Failed to update bug with screenshots")

    return {"id": bug_id, "screenshot_urls": urls, "team_slug": team_slug}


@app.post("/api/bugs/{bug_id}/screenshots")
@limiter.limit("20/minute")
def update_screenshots(request: Request, bug_id: str, urls: List[str]):
    """Update screenshot_urls for a bug. Accepts JSON array of URLs."""
    upd = sb.table("bugs").update({"screenshot_urls": urls}).eq("id", bug_id).execute()
    if getattr(upd, "error", None):
        logger.error(f"Failed to update screenshots for {bug_id}: {getattr(upd, 'error', None)}")
        raise HTTPException(status_code=500, detail="Failed to update screenshots")
    return {"id": bug_id, "screenshot_urls": urls}


def _require_admin(request: Request):
    if not ADMIN_SECRET:
        logger.error("ADMIN_SECRET not configured on server")
        raise HTTPException(status_code=403, detail="Admin secret not configured")
    hdr = request.headers.get("x-admin-secret")
    if not hdr or hdr != ADMIN_SECRET:
        logger.warning("Unauthorized admin attempt")
        raise HTTPException(status_code=403, detail="Unauthorized")


@app.post("/api/admin/bugs/cleanup")
@limiter.limit("5/minute")
def admin_cleanup(request: Request, days: int = 90, dry_run: bool = True):
    """Delete bugs older than `days`. Protected by `x-admin-secret` header.
    If `dry_run` is true, returns count but does not delete.
    """
    _require_admin(request)
    if days <= 0:
        raise HTTPException(status_code=400, detail="days must be > 0")
    # cutoff in ISO format
    from datetime import datetime, timedelta

    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat() + 'Z'
    logger.info(f"Admin cleanup requested: days={days}, dry_run={dry_run}, cutoff={cutoff}")
    try:
        # count matching
        count_res = sb.table("bugs").select("id", count="exact").lt("created_at", cutoff).execute()
    except Exception:
        logger.exception("Exception when counting old bugs")
        raise HTTPException(status_code=500, detail="DB error")
    if getattr(count_res, "error", None):
        logger.error(f"Error counting old bugs: {getattr(count_res,'error',None)}")
        raise HTTPException(status_code=500, detail="DB error")
    # Supabase python client may return count in res.count or res.data length depending on settings
    total = getattr(count_res, "count", None) or (len(getattr(count_res, "data", []) if getattr(count_res, "data", None) else []))
    if dry_run:
        return {"deleted": 0, "match_count": total, "dry_run": True}

    try:
        del_res = sb.table("bugs").delete().lt("created_at", cutoff).execute()
    except Exception:
        logger.exception("Exception when deleting old bugs")
        raise HTTPException(status_code=500, detail="DB error")
    if getattr(del_res, "error", None):
        logger.error(f"Error deleting old bugs: {getattr(del_res,'error',None)}")
        raise HTTPException(status_code=500, detail="DB error")
    deleted_count = len(getattr(del_res, "data", []))
    logger.info(f"Admin cleanup completed, deleted {deleted_count} bugs")
    return {"deleted": deleted_count, "match_count": total, "dry_run": False}


@app.get("/api/admin/notifications")
@limiter.limit("30/minute")
def admin_list_notifications(request: Request, recipient_id: Optional[str] = None, limit: int = 50):
    """Admin-only: list recent notifications (for debugging)."""
    _require_admin(request)
    try:
        query = sb.table("notifications").select("*").order("created_at", desc=True).limit(limit)
        if recipient_id:
            query = query.eq("recipient_id", recipient_id)
        res = query.execute()
    except Exception:
        logger.exception("Exception when querying notifications")
        raise HTTPException(status_code=500, detail="DB error")
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail="DB error")
    return getattr(res, "data", [])


@app.post("/api/admin/debug_notify")
def admin_debug_notify(
    request: Request,
    recipient_id: str = Form(...),
    p_type: str = Form(...),
    p_title: str = Form(...),
    p_message: str = Form(...),
    p_entity_type: Optional[str] = Form(None),
    p_entity_id: Optional[str] = Form(None),
):
    """Admin-only: call DB `create_notification` function to create a notification for testing."""
    _require_admin(request)
    try:
        # Call the DB function via RPC
        rpc_params = {
            "p_recipient_id": recipient_id,
            "p_type": p_type,
            "p_title": p_title,
            "p_message": p_message,
            "p_entity_type": p_entity_type,
            "p_entity_id": p_entity_id,
        }
        res = sb.rpc("create_notification", rpc_params).execute()
    except Exception:
        logger.exception("Exception when calling create_notification RPC")
        raise HTTPException(status_code=500, detail="RPC error")
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail="RPC error")
    return {"ok": True}


class BugUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    category: Optional[str] = None


@app.patch("/api/bugs/{bug_id}")
@limiter.limit("20/minute")
def update_bug(request: Request, bug_id: str, update: BugUpdate):
    """Partial update for bug. Triggers in DB will generate notifications as needed."""
    allowed_fields = {k: v for k, v in update.dict().items() if v is not None}
    if not allowed_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    # Log before update for debugging notification triggers
    try:
        before_res = sb.table("bugs").select("status,assigned_to,submitted_by,title").eq("id", bug_id).execute()
    except Exception:
        logger.exception("Exception when fetching bug before update")
        before_res = None
    before = (getattr(before_res, "data", []) or [None])[0]
    logger.info(f"Updating bug {bug_id} - before: {before}")

    try:
        res = sb.table("bugs").update(allowed_fields).eq("id", bug_id).execute()
    except Exception:
        logger.exception("Exception when updating bug")
        raise HTTPException(status_code=500, detail="DB error")
    if getattr(res, "error", None):
        logger.error(f"Failed to update bug {bug_id}: {getattr(res, 'error', None)}")
        raise HTTPException(status_code=500, detail="DB error")
    data = getattr(res, "data", None)
    if not data:
        raise HTTPException(status_code=404, detail="Bug not found or not updated")
    # Log after update for debugging
    logger.info(f"Updated bug {bug_id} - after: {data[0]}")
    return data[0]

@app.post("/api/support")
@limiter.limit("5/minute")
def create_support_ticket(request: Request, ticket: SupportTicketRequest):
    logger.info(f"Received support ticket from {ticket.user_email}")
    try:
        data = {
            "user_email": ticket.user_email,
            "subject": ticket.subject,
            "message": ticket.message,
        }
        if ticket.user_id:
            data["user_id"] = ticket.user_id
            
        res = sb.table("support_tickets").insert(data).execute()
        if getattr(res, "error", None):
            logger.error(f"Failed to create support ticket: {res.error}")
            raise HTTPException(status_code=500, detail="Failed to submit ticket")
            
        return {"status": "success", "message": "Ticket submitted successfully"}
    except Exception as e:
        logger.exception("Error creating support ticket")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/admin/support")
def get_support_tickets(request: Request):
    admin_secret = request.headers.get("x-admin-secret")
    if not admin_secret or admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        res = sb.table("support_tickets").select("*").order("created_at", desc=True).execute()
        if getattr(res, "error", None):
            raise HTTPException(status_code=500, detail="Database error")
        return getattr(res, "data", [])
    except Exception as e:
        logger.exception("Error fetching support tickets")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/admin/support/{ticket_id}/reply")
async def reply_support_ticket(request: Request, ticket_id: str, reply_data: SupportReplyRequest):
    admin_secret = request.headers.get("x-admin-secret")
    if not admin_secret or admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        # First get the ticket to get user's email and subject
        res = sb.table("support_tickets").select("*").eq("id", ticket_id).execute()
        if getattr(res, "error", None) or not getattr(res, "data", []):
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        ticket = res.data[0]
        user_email = ticket["user_email"]
        subject = ticket["subject"]

        # Send email via SMTP
        msg = EmailMessage()
        msg["From"] = f"BugTracker Support <{SMTP_EMAIL}>"
        msg["To"] = user_email
        msg["Subject"] = f"Re: {subject} (BugTracker Support)"
        
        email_body = f"""Hello,

Thank you for reaching out to BugTracker Support.

Regarding your ticket "{subject}":
{reply_data.reply}

Best regards,
The BugTracker Team
"""
        msg.set_content(email_body)

        try:
            if not SMTP_PASSWORD:
                logger.warning("SMTP_PASSWORD is not set. Email will not be sent.")
            else:
                await aiosmtplib.send(
                    msg,
                    hostname="smtp.gmail.com",
                    port=587,
                    start_tls=True,
                    username=SMTP_EMAIL,
                    password=SMTP_PASSWORD
                )
                logger.info(f"Reply email sent successfully to {user_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {user_email}: {e}")
            raise HTTPException(status_code=500, detail="Failed to send email reply")

        # Update ticket in database
        update_res = sb.table("support_tickets").update({
            "status": reply_data.status,
            "message": ticket["message"] + f"\n\n--- Admin Reply ---\n{reply_data.reply}"
        }).eq("id", ticket_id).execute()

        if getattr(update_res, "error", None):
            logger.error(f"Failed to update ticket {ticket_id}: {update_res.error}")
            raise HTTPException(status_code=500, detail="Failed to update ticket status")

        return {"status": "success", "message": "Reply sent successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error processing reply for ticket {ticket_id}")
        raise HTTPException(status_code=500, detail="Internal server error")
