# CineFlex Build 5.0 — Smart Assistant & Discovery 2.0

- Added CineFlex Smart Assistant with natural-language mood, genre, language, year, and media-type discovery.
- Added “similar to” title recommendations using TMDB recommendation endpoints.
- Added Smart Discovery 2.0 personalized homepage row.
- Added local taste/query learning without exposing private data to a third-party AI API.
- Added mobile-first assistant panel and quick prompt chips.
- Updated PWA cache version and assets.

# CineFlex Build 4.3 — Moderation, Roles & Security

- Role-based Admin Studio access foundation
- User suspension, mute, warning, and restore controls
- App-wide suspension enforcement
- Admin audit trail
- Delegated admin roles
- Updated PWA cache

# CineFlex Build 3.2 — Public Rooms & Live Presence

## Added
- Public/private privacy selector for Watch Party creation.
- Real-time Public Watch Rooms lounge.
- Join buttons for active public rooms.
- Public room viewer count maintained by the host.
- Online presence indicators and 90-second stale-member filtering.
- Live-room cards using the selected TMDB artwork.
- Friendly logged-out state for the public room feed.

## Improved
- Public room list automatically refreshes through Firestore snapshots.
- Mobile Watch Party layout for public rooms.
- Service-worker cache version updated to prevent stale Build 3.1 assets.

## Preserved
- Build 3.1 room creation fix.
- Private invite codes and links.
- Host Start / Resync command.
- Real-time chat and emoji reactions.
- Existing authentication, profiles, comments, recommendations, and player flow.

## Build 4.1 — Admin Studio
- Rebuilt `admin.html` as a responsive CineFlex Admin Studio.
- Added dashboard counts and Watch Party room monitoring.
- Added Firestore-backed homepage announcement, featured title, badge, headline, and maintenance controls.
- Added `admin-homepage.js` to deliver published settings to the main website in real time.
- Added dedicated Admin Studio styling and refreshed PWA cache version.

## Build 4.2 — Content Management & Analytics
- Added viewer Request Center for movies, TV series, and anime.
- Added Broken Link / playback issue reports with selected title and episode metadata.
- Added real-time CineFlex notification center.
- Added Admin request and report workflows with status controls.
- Added TMDB Quick Import and imported-content library.
- Added basic request/report analytics.
- Updated PWA cache to Build 4.2.

## Build 250 LTS — Foundation Release 1
- Centralized homepage authentication state in `firebase.js`.
- Added `cineflex-auth-state` event for UI modules.
- Removed redundant core listeners from `auth.js`, `home.js`, and `profiles.js`.
- Added desktop session reconciliation on focus/pageshow without another Firebase listener.
- Updated service worker cache to `cineflex-v250-foundation-1`.
- Updated core asset query versions to Build 250.

## Build 250.1 LTS — Performance & Cache
- Reduced service-worker precache to critical app-shell assets.
- Added network-first delivery for current HTML/JS/CSS.
- Added runtime media/poster caching.
- Improved service-worker update activation and stale-cache cleanup.
- Added TMDB/Firebase connection hints.

## Build 300.0 — Core Refactor
- Added a single guarded Firebase app instance across active CineFlex pages.
- Added a one-time authentication bootstrap guard and shared auth-ready Promise.
- Introduced centralized Build 300 metadata.
- Added opt-in, role-checked Developer Mode using `?debug=1` for active admins.
- Updated service-worker cache namespaces and registration version.
- Preserved existing homepage, player, VIP, footer, and pop-ad behavior.


## Build 300.4 — CMS Foundation
- Connected Admin Studio homepage settings to the public homepage.
- Added expiring announcements and row visibility/label controls.
- Added safe featured TMDB hero override with automatic trending fallback.
- Updated cache lifecycle to `cineflex-v300-cms-4`.
