CINEFLEX FIRESTORE SETUP — BUILD 8.4

Use only this file:
  firestore.rules

Firebase steps:
1. Open Firebase Console.
2. Go to Firestore Database > Rules.
3. Replace the current rules with the complete contents of firestore.rules.
4. Click Publish.
5. Log out and log back in to Admin Studio.
6. Hard refresh with Ctrl + F5.

Important paths used by this build:
- Homepage config: cineflexConfig/homepage
- VIP status: users/{uid}/membership/status
- Watch-time balance: users/{uid}/watchTime/balance

The old FIRESTORE_RULES_*.txt patch files were moved to:
  _archive/rules_patches/
Do not copy or publish those old patch files individually.
