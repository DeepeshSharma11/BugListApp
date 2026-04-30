# Memory.md — BugTaskApp

## Last Updated: 2026-04-30

## Project Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python) + Supabase + Groq LLM
- **Infra**: Nginx reverse proxy, Docker, Cloudflare Workers

## Architecture
- `frontend/src/` — React SPA
- `backend/app/main.py` — All FastAPI routes (878+ lines)
- `backend/app/services/llm.py` — Groq LLM service
- `backend/app/services/email.py` — Email service

## Key Routes (Backend)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bugs/ai-enhance` | LLM bug report enhancer (NEW) |
| GET | `/api/bugs/check` | Duplicate fingerprint check |
| POST | `/api/bugs/` | Create bug |
| PATCH | `/api/bugs/{id}` | Update bug |
| GET | `/api/leaderboard` | Team leaderboard |
| POST | `/api/support` | Support ticket |
| POST | `/api/admin/support/{id}/draft` | LLM support draft |

## LLM Service (`llm.py`)
- `generate_support_draft(subject, message)` — admin support reply
- `generate_bug_enhancement(raw_input)` — NEW: structures raw text into bug fields (title, description, steps, severity)

## Frontend Utils
- `utils/deviceTier.ts` — NEW: Memoized tier detection (low/mid/high). Used for animation gating.
- `utils/debounce.ts` — debounce hook

## Device Tier Logic
- **Low**: cores ≤ 2 AND (mem ≤ 2GB OR slow network) → no animations
- **Mid**: cores ≤ 4 AND mem ≤ 4GB → 150ms transitions
- **High**: everything else → 220ms transitions + image previews

## Submit Page Changes (2026-04-30)
- Added **AI Assist** button → panel → `/api/bugs/ai-enhance` → auto-fills form
- Severity picker → 4-button visual selector (low/medium/high/critical)
- Screenshot previews with remove button (mid/high tier only)
- Drag-active dropzone state
- Tier-aware animations via `getDeviceTier()`

## Footer UI Changes (2026-04-30)
- Improved Footer UI hide/show logic using `fixed bottom-0`.
- Footer is now hidden dynamically only when scrolling down (requires >50px scroll), providing more reading space.
- Adjusted typography and spacing for better readability based on user feedback.
- Fixed overlapping issue by adding bottom padding (`pb-20`/`pb-24`) to the main Layout wrapper.

## Notification Panel (2026-04-30)
- Removed `/dashboard/notifications` page route from `App.tsx`
- Created `components/NotificationPanel.tsx` — slide-in drawer from right
- NavBar bell icon (desktop + mobile) now toggles the panel instead of navigating
- Features: backdrop overlay, ESC to close, body scroll lock, emoji icons per type, relative time, mark read/all, clear all
- `onUnreadCountChange` callback syncs badge count back to NavBar
