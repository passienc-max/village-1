# Parent Link — The Village (PRD)

## Original problem statement
1. Finish the MVP
    * Parent sign-up/login
    * Create a request: ride, laundry help, groceries, school activities, etc.
    * Volunteers can see and accept requests
    * Messaging/notifications
    * Basic profiles
    * Safety/reporting features
    * Local resources directory
    * Business/organization listings
Can we make sure we have all this on the webpage

User choices: JWT email/password + Google sign-in; in-app chat per request + notification bell + email notifications; admin adds listings, logged-in users suggest for approval; name "Parent Link — The Village", serving Southern Oregon / Klamath County; build from scratch.

## Architecture
- Backend FastAPI: server.py, core.py (db, auth helper JWT+Google session, notify), auth_routes.py, routes.py (profiles, requests, chat, notifications, reports), admin_routes.py (listings + admin), seed.py, email_service.py (Emergent managed Resend)
- Frontend React + shadcn: AuthContext, Navbar w/ NotificationBell, pages Landing, Auth, Onboarding, Dashboard, VolunteerBoard, RequestDetail (+ChatPanel), Profile, UserProfile, SafetyHub, Resources/Businesses (Directory), AdminPanel
- MongoDB collections: users, user_sessions, login_attempts, requests, messages, notifications, reports, listings

## User personas
Parents/caregivers in Klamath County; volunteer neighbors; Village admin (passienc@gmail.com)

## Implemented (2026-10-08)
- Email/password JWT auth (httpOnly cookies, refresh, brute-force lockout) + Emergent Google login with role onboarding
- Requests with 7 categories, urgency, community, date/time; volunteer board with filters; accept / in progress / complete / step back / cancel
- Per-request private chat (polling), notification bell, email alerts on accept/message/status (opt-out in profile)
- Profiles (edit + public view with stats), reports on users/requests/general, Safety hub w/ 911/988/211
- Resources directory (6 seeded statewide/local orgs), Business directory (empty until admin adds/approves), suggestion flow
- Admin panel: stats, reports, suggestions approve/reject, add/delete listings, cancel requests, suspend users
- Tested: 32/34 backend + all critical frontend flows; lockout behind proxy fixed

## Backlog
- P1: Volunteer verification badge (admin-approved), password reset email, block user
- P1: Real-time chat via websockets, unread chat counts
- P2: Map view of requests, recurring requests, ratings/thank-you notes, SMS alerts
