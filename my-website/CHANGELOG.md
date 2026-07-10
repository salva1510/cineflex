# CineFlex Changelog

## v2.0.1-cleanup
- Cleaned project structure without removing active features.
- Moved old Build 23–29 patch files into `_archive/legacy-builds/`.
- Removed duplicate `profiles.css` load from the bottom of `index.html`.
- Added clear script load order comments in `index.html`.
- Moved CineFlex identity foundation into `css/core/identity.css` and `js/core/foundation.js`.
- Updated service worker cache version and made caching safer with `Promise.allSettled`.
- Added project structure documentation in `_docs/PROJECT_STRUCTURE.md`.

## Preserved
- Login/auth files.
- Profiles.
- Player.
- Comments.
- Ratings.
- Live viewers/community features.
