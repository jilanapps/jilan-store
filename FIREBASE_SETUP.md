# 🔐 Jilan Store Admin — Firebase Setup Guide
### (Roman Urdu + English)

> **Kyun zaroori hai?** GitHub Pages sirf *static* website host karta hai — us me asal login/security mumkin nahi. Is liye admin ka private data (cost, margin, orders, customer phone) **Firebase** (Google ka free service) me mehfooz rakha gaya hai. Bina Firebase ke admin **secure nahi** hoga — is liye nakli password wala login nahi lagaya gaya. **Security tight!** 🔒

**Why needed?** GitHub Pages is static hosting — it cannot do real authentication. All private admin data lives in **Firebase** (free tier). Without it, the dashboard honestly refuses to offer a fake login.

---

## Step 1 — Firebase project banayein (5 min)

1. Jao: **https://console.firebase.google.com**
2. Apne Google account se login karein
3. **"Add project" / "Create a project"** dabayein
4. Naam rakhein: `jilan-store-admin`
5. Google Analytics: **Disable** kar dein (zaroori nahi) → **Create project**

## Step 2 — Login (Authentication) ON karein

1. Left menu → **Build → Authentication** → **Get started**
2. **Sign-in method** tab → **Email/Password** → **Enable** → **Save**
3. **Users** tab → **Add user**
   - Email: apna email (masalan `asif@gmail.com`)
   - Password: **mazboot password** (kam az kam 10 harf, capital + number)
   - **Add user** dabayein
4. ⚠️ **Yahi aapka admin account hai.** Yahan koi "default password" nahi — aap ne khud banaya.

> **Note:** Admin page par *signup* ka button nahi hai — naya admin sirf yahan Console se ban sakta hai. Yehi asal security hai.

## Step 3 — Database (Firestore) banayein

1. Left menu → **Build → Firestore Database** → **Create database**
2. **Start in production mode** chunein → **Next**
3. Location: `asia-south1` (Mumbai — Pakistan ke qareeb) → **Enable**
4. **Rules** tab kholein → pura text delete karke **`admin/firestore.rules`** file ka code paste karein → **Publish** dabayein

> Ye rules kehte hain: *bina login ke koi data nahi dekh sakta.* 🔒

## Step 4 — Web app ki config copy karein

1. Project home (⚙️ **Project settings** — left bottom gear icon)
2. Neeche **"Your apps"** → **`</>` Web** icon dabayein
3. Nickname: `jilan-admin` → **Register app**
4. Jo `firebaseConfig = { ... }` code mile, uski values copy karein:
   - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`

## Step 5 — Config admin me lagayein

**Option A (asan — GitHub web se):**
1. GitHub repo `jilan-store` kholein → `admin/firebase-config.js`
2. ✏️ Edit → `PASTE_...` values ki jagah apni asal values paste karein → **Commit**

**Option B (Muse se):** Mujhe config bhej dein (chat me **kabhi password nahi** — sirf ye 6 config values), main laga dunga.

> ⚠️ **apiKey public hoti hai** — ye secret nahi, ghabrayein nahi. Security **Rules + Login** se hai, key se nahi.

## Step 6 — Login karein ✅

1. Kholein: **https://jilanapps.github.io/jilan-store/admin/**
2. Apna email + password likhein → **Login**
3. Pehli dafa: **Settings** me delivery charges set karein
4. **Products** me jaa kar Markaz cost darj karein (ya CSV import)

---

## 💰 Kya free hai? (Free tier limits)

| Cheez | Free limit | Aapke liye |
|---|---|---|
| Authentication | Unlimited email logins | ✅ bilkul free |
| Firestore reads | 50,000 / din | ✅ hazaron orders ke liye kafi |
| Firestore writes | 20,000 / din | ✅ kafi |
| Storage | 1 GB | ✅ kafi (sirf text data) |

> Google kabhi limits badal sakta hai — lekin is chhote business ke liye free tier **saalon** tak kafi hai.

## 🛡️ Security summary (seedhi baat)

- ❌ Koi hardcoded password **nahi** — purani `admin.html` wali kamzori khatam
- ✅ Login: Firebase Authentication (Google ke servers verify karte hain)
- ✅ Data: Firestore — **Rules** bina login ke har request **block** karti hain
- ✅ Cost/margin **kabhi** public `products.json` me nahi — verify shuda
- ✅ Customer phone/address sirf login ke baad
- ⚠️ Ek kaam aapka: password mazboot rakhein aur kisi se share na karein

## ❓ Masla ho to

- **"Firebase connect nahi hua"** screen → Step 5 dobara check karein (config paste hui?)
- **Login fail** → Step 2 me user bana? Email/password sahi?
- **"Permission denied"** → Step 3 ke Rules publish hue? (`allow read, write: if request.auth != null`)
- Baqi har cheez ke liye: **Muse se poochein** — main madad karunga. 🤝
