CINEFLEX BUILD 4.1 — ADMIN STUDIO + HOMEPAGE EDITOR

ADMIN URL
---------
Open: /admin.html
Authorized admin email in this build:
emviemsalva@gmail.com

WHAT WORKS
----------
- Admin login verification
- Registered-user and profile counts
- Active Watch Party room overview
- Live room member totals when room documents expose memberCount/viewerCount
- Homepage announcement editor
- Announcement colors and optional link
- Featured Movie/TV override using TMDB ID
- Featured badge and homepage headline controls
- Maintenance notice
- Real-time Firestore homepage configuration

FIRESTORE DOCUMENT
------------------
Collection: cineflexConfig
Document: homepage

SECURITY NOTE
-------------
The Admin Studio has a client-side email guard. Your current broad Firestore rule allows every authenticated account to write broadly. Before public launch, replace that broad rule with collection-specific production rules so only the admin can write cineflexConfig.

TEST
----
1. Upload all files.
2. Clear site/PWA cache or reinstall the PWA.
3. Log in using emviemsalva@gmail.com.
4. Open https://YOUR-DOMAIN/admin.html
5. Publish an announcement.
6. Open the homepage in another tab/device and confirm it appears.
7. For a featured title, choose Movie or TV and enter its numeric TMDB ID.
