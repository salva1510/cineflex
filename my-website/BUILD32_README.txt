CINEFLEX BUILD 3.2 — PUBLIC ROOMS & LIVE PRESENCE

WHAT'S NEW
- Public or Private room selector before room creation
- Live public-room lounge inside Watch Party
- One-tap Join Room buttons
- Live room viewer count
- Online presence dots and stale-member filtering
- Host/member labels preserved
- Mobile-responsive public room cards
- Service worker cache bumped so the new files load correctly

HOW TO TEST
1. Upload/replace every file from this package.
2. Publish the Firestore rules already used by Build 3.1.
3. Clear the browser/site cache once, or close and reopen the installed PWA.
4. Log in, open a movie/series details page, and open Watch Party.
5. Choose Public, then Create Room.
6. Open CineFlex in another account/device. The room should appear under Public Watch Rooms.

IMPORTANT
Public rooms are visible only to authenticated CineFlex users under the current Firestore rules.
Exact cross-device play/pause/seek remains limited by the external zxcstream iframe because it does not expose a supported player-control API.
