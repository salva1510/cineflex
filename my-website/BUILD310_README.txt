CINEFLEX BUILD 310.0 — 30-DAY LOGIN VIP REWARD

NEW
- Secure account-based 30-day consecutive login challenge
- Automatic daily check-in for signed-in viewers
- Homepage progress bar and next-reward countdown
- Completing day 30 unlocks one free 30-day VIP membership
- Existing active VIP is extended by another 30 days
- Reward can only be claimed once per account
- Firestore rules prevent rapid fake check-ins and repeat claims

IMPORTANT DEPLOYMENT STEP
Publish the included firestore.rules in Firebase Console / Firebase CLI.
Without the updated rules, daily progress and automatic VIP activation cannot be saved.

Upload all files in my-website, especially:
- index.html
- css/modules/comeback309.css
- js/modules/login-reward310.js
- firestore.rules
