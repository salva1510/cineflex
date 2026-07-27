# CineFlex modular structure — Build 6.1

- `home.js` — compatibility layer and established page behavior
- `js/core/foundation.js` — shared foundations
- `js/core/api-client61.js` — cached JSON requests, timeouts, cache utilities
- `js/modules/stream-engine61.js` — stream providers, selection, diagnostics
- `js/modules/player60.js` — presence and cross-device progress
- `js/modules/community53.js` — reactions, achievements and activity
- `js/modules/personal-home51.js` — personalized rows
- `js/modules/watch-party.js` — Watch Party logic
- `css/modules/architecture61.css` — Build 6.1 stream selector styles

Future refactors should move one stable feature at a time out of `home.js`, keeping public function names as compatibility wrappers until all callers are migrated.
