CINEFLEX BUILD 3.0 — WATCH PARTY FOUNDATION

NEW
- Create private Watch Party rooms
- Join through 6-character code or invite URL
- Firebase real-time party chat
- Emoji reactions
- Live participant presence
- Host badge and host-only Start / Resync command
- Shared movie/TV/season/episode state
- Mobile responsive party lounge

IMPORTANT SETUP
1. Upload every file from this package.
2. Open FIRESTORE_RULES_WATCH_PARTY.txt.
3. Merge those rules inside your existing `match /databases/{database}/documents` block.
4. Publish the Firestore rules.

PLAYER LIMITATION
zxcstream.xyz runs in a cross-origin iframe. Browsers do not allow CineFlex to read or control its exact playback time unless the provider exposes a postMessage/player API. This build synchronizes room state, selected title/episode, and Start/Resync commands. Exact pause/seek synchronization can be enabled later when the provider supplies a supported API.
