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
