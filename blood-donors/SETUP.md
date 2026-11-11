# Basti Dawa Blood Society (BDBS) — Setup Guide

App + web: https://jilanapps.github.io/jilan-store/blood-donors/
Short link (use this everywhere — QR codes, share text, posts):
https://jilanapps.github.io/jilan-store/bdbs/
APK: https://jilanapps.github.io/jilan-store/blood-donors/blood-donors-v1-test.apk

**Cost: Rs 0 at every step.** Firebase free (Spark) plan is enough for this
app. No card, no paid service, no Firebase Storage in v1.

## 1. Create a NEW Firebase project (do NOT reuse the Installock project)
1. Open https://console.firebase.google.com/ in a browser (on the laptop).
2. Click **Add project** → project name: `basti-dawa-blood-society` →
   **Continue** → Google Analytics: **OFF** (not needed) → **Create project**.
3. Wait for "Your new project is ready" → **Continue**.

## 2. Enable Email/Password sign-in
1. Left menu → **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → **Email/Password** → **Enable** → **Save**.

## 3. Create the Firestore database
1. Left menu → **Build → Firestore Database** → **Create database**.
2. Location: pick any (e.g. `asia-south1`) → **Next**.
3. Start in **production mode** → **Create**.

## 4. Paste the security rules
1. Firestore Database → tab **Rules** → delete the default text.
2. Copy the whole file `firestore.rules` from this folder and paste it →
   **Publish**.
3. These rules mean: donor/member phone, CNIC, address, disease and
   father name are **admin-only**; the public only ever sees name, blood
   group, city, designation and membership validity.

## 5. Get the web-app keys and paste them into the app
1. Project Settings (gear icon, top left) → **General** → **Your apps** →
   **Web app** `</>` → nickname `BDBS Web` → **Register app**.
2. Copy the `firebaseConfig` values (apiKey, authDomain, projectId,
   storageBucket, messagingSenderId, appId).
3. Open `firebase-config.js` in this folder and replace each
   `PASTE_YOUR_...` value with the copied value. Save + upload the file
   to the same folder on the store (replace the old one).
4. Until the keys are pasted, the app runs in **local demo mode**: public
   pages work with clearly-marked DEMO entries, and the login/admin
   sections show **"Setup pending — Firebase keys needed"**.

## 6. Create the admin account
1. **Authentication → Users → Add user**.
2. Email: the admin email (e.g. the organisation email). Password: a
   strong password — write it down safely. **Never share it.**
3. This is the only login for the app + web admin panel.
4. Forgot password works from the app's Login screen (Firebase sends a
   reset email to the admin email).

## 7. Social links (already set)
The real links are already in `index.html`:
- WhatsApp: https://wa.me/923069140867 (Founder Muhammad Asif Javaid, 03069140867)
- Facebook: https://www.facebook.com/profile.php?id=61568131213778
- TikTok: https://www.tiktok.com/@basti.dawa.bloodsociety

Only change them in `index.html` if the organisation's links change.

## 8. Photos — size limit (v1)
Donor/member photos are stored as small base64 text inside Firestore
documents (no Storage in v1). The app auto-resizes photos to max 300 px.
**Firestore document limit is 1 MB** — keep photos small; if a photo
fails to save, choose a smaller image.

## 9. How the app works (data)
- Collections: `donors` (full, admin-only) + `donorsPublic` (public-safe
  mirror) · `members` (full, admin-only) + `membersPublic` (verify page)
  · `requests` (full, admin-only) + `requestsPublic` (public list) ·
  `activities` (public read, admin write) · `certificates` (admin-only) ·
  `counters` (certificate numbers).
- Member QR encodes the SHORT link
  `https://jilanapps.github.io/jilan-store/bdbs/?verify=<memberDocId>`
  (the short page redirects to the verify page) — the verify page shows
  ONLY photo, name, designation, ID No., blood group and validity, with
  a VERIFIED badge (or NOT VERIFIED if expired / not found). The full
  verify URL is `https://jilanapps.github.io/jilan-store/blood-donors/verify.html?id=<memberDocId>`.
- Certificate reference format: `BDBS-CERT-YYYY-XXXX` (sequential per
  year, generated in the admin panel after a donation is recorded).

## 10. Checklist before going fully live
- [ ] Firebase project created (free) + Auth enabled + Firestore created
- [ ] Rules published from `firestore.rules`
- [ ] Keys pasted into `firebase-config.js` and re-uploaded
- [ ] Admin user created in Authentication
- [ ] Social links replaced (TODO-SOCIAL-LINKS)
- [ ] Test: login works → add a donor → public search shows name/group/
      city only (no phone) → member QR verify page shows VERIFIED
- [ ] Demo entries removed (admin panel → delete the DEMO rows)
