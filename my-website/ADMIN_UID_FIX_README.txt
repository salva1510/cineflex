CINEFLEX ADMIN UID FIX

Owner email: emviemsalva@gmail.com
Owner Firebase UID: M3GxGOkF9ZWoezkICNpvS5ID1Hz2

CHANGED:
- admin.html now accepts the owner UID even when Firebase does not expose an email.
- admin.js accepts either the owner email or owner UID.
- firestore.rules recognizes the owner by UID or email.
- Added cineflexConfig admin write rule needed by Admin Studio.

IMPORTANT:
1. Upload the updated website files.
2. Copy firestore.rules into Firebase Console > Firestore Database > Rules, then Publish.
3. Clear the old site/PWA cache or uninstall and reinstall the PWA.
4. Open admin.html and sign in.
