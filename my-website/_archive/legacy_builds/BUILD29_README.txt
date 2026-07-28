CINEFLEX BUILD 29 - LIVE ONLINE VIEWERS

Added:
- Live online viewer counter in top navigation.
- Floating online viewer badge visible to visitors.
- Live Website Viewers card inside menu drawer.
- Firestore heartbeat presence system.
- Stale session filter, so closed tabs disappear automatically.
- Guest/user support with fallback if Firestore permission is blocked.

Firebase note:
This uses Firestore collection: cineflex_online_viewers
If the counter stays at 1, allow read/write for this collection in Firebase rules.
