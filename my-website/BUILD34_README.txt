CINEFLEX BUILD 3.4 — USER PROGRESSION

Included:
- XP and level system
- CineCoins
- Daily login reward and streak
- Achievement collection
- Progress dashboard
- XP rewards for playback starts, ratings, comments, and hosting a Watch Party
- Local fallback plus Firestore cloud sync per user/profile

FIRESTORE PATH:
/users/{uid}/profiles/{profileId}/system/progression

Your current authenticated-user catch-all rule already permits this path.
For stricter production rules, allow each user to read/write only their own user document tree.

TEST:
1. Upload all files.
2. Clear site/PWA cache or reinstall the PWA.
3. Log in and select a profile.
4. The trophy button appears above the bottom navigation.
5. A daily reward appears once per calendar day.

NOTE:
Playback XP is awarded when a title is started. Exact completion tracking is not possible through the current cross-origin external player without its official playback API.
