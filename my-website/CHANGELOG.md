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

## v2.2.0 — Hero Engine 2.0
- Added modular `js/modules/hero.js` and `css/modules/hero.css`.
- Added cinematic featured-title rotation, progress indicator, dots, and manual controls.
- Added muted YouTube trailer preview with safe fallback to the TMDB backdrop.
- Added hero metadata and a functional per-profile My List action.
- Added mobile-specific hero layout and reduced-motion support.
- Removed the old duplicated hero bridge from `home.js`.
