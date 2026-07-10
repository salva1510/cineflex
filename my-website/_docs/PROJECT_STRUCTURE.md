# CineFlex Project Structure

## Active files loaded by index.html
- `firebase.js` – Firebase configuration and shared Firebase globals.
- `js/core/foundation.js` – CineFlex 2.0 UI foundation helpers.
- `home.js` – Main homepage, TMDB, player, drawer, community runtime.
- `auth.js` – Login/logout and authentication UI.
- `profiles.js` – Profile management.
- `home.css` – Main site styling.
- `css/core/identity.css` – CineFlex identity / neon glass styling.
- `profiles.css` – Profile page and profile modal styling.

## Archive
Old build patch files were moved to `_archive/legacy-builds/` so they will not conflict with the active app.

## Next cleanup target
Gradually split `home.js` into smaller modules:
- `js/player/player.js`
- `js/community/community.js`
- `js/hero/hero.js`
- `js/drawer/drawer.js`
- `js/tmdb/tmdb.js`
