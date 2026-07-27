CINEFLEX BUILD 6.0 — NETFLIX-CLASS FOUNDATION

NEW
- Cinematic player overlay with live status, watch clock, Next Episode, Fullscreen and Close controls.
- Live viewers presence heartbeat per movie/episode.
- Cross-device progress records for logged-in users.
- Local progress fallback for guests and offline situations.
- Device label and last-watched estimate.
- Player logic separated into js/modules/player60.js and css/modules/player60.css.

IMPORTANT LIMIT
The external zxcstream iframe is cross-origin and does not expose its exact playback timestamp. CineFlex therefore syncs estimated active watch time, movie, season and episode. Exact in-video seeking depends on the provider.

INSTALL
1. Replace the site files with this package.
2. Merge FIRESTORE_RULES_BUILD60.txt into your existing Firestore rules.
3. Clear site data / cache once. Reinstall the PWA if the old cache remains.
