CINEFLEX BUILD 4.3 — MODERATION, ROLES & SECURITY

NEW ADMIN PAGES
- User Moderation
- Admin Roles
- Audit Logs

ROLES
- super_admin: all controls
- moderator: user moderation and audit access
- content_manager: homepage/content tools
- support: requests, reports, and limited moderation

SETUP
1. Upload and replace all files in this package.
2. Merge FIRESTORE_RULES_BUILD43.txt inside your existing Firestore service block.
3. Keep only one rules_version and one service cloud.firestore block.
4. Publish the rules.
5. Clear the PWA/site cache or reinstall the app.
6. Open admin.html with emviemsalva@gmail.com.

IMPORTANT
Firebase Authentication cannot be fully disabled from browser-only code. Build 4.3 enforces suspension in the app and Firestore. Permanent disabling of an Auth account requires a trusted server or Firebase Admin SDK, which can be added in a future backend build.
