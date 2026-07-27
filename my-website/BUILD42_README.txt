CINEFLEX BUILD 4.2 — CONTENT MANAGEMENT & ANALYTICS
===================================================

NEW USER FEATURES
- Request Movie / TV / Anime center
- Broken link and playback issue reporting
- Notification bell with real-time admin announcements
- Automatic selected movie / season / episode details in reports

NEW ADMIN FEATURES
- Content request inbox with status workflow
- Broken link report inbox with status workflow
- Real-time notification publisher
- TMDB Quick Import using movie/TV ID
- Imported content library
- Basic request/report analytics

INSTALL
1. Upload and replace all files from this package.
2. Clear website cache and installed PWA cache, or reinstall the PWA.
3. Open admin.html using the admin account.
4. Test Request Movie from the website menu.
5. Test Report from an opened movie details modal.

FIRESTORE COLLECTIONS USED
- contentRequests
- brokenLinkReports
- cineflexNotifications
- importedContent

SECURITY NOTE
Your current global authenticated-user rule will make this build work, but it is broad.
Use FIRESTORE_RULES_BUILD42.txt for a safer starting point. Review any other existing
collections before replacing your production rules.
