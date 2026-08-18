# KeepPassive + Jarvis

KeepPassive is the site. Jarvis is the operator view. Both show **today’s Amazon article** in the same slot (`#amazon-today`).

Marketplace data comes from **this logged-in Chrome only**. There is no SP-API client and no Whatnot Seller API client. Whatnot is not accepting developer-program applicants; Amazon’s daily Seller News item sits behind the Seller Central session, which is why the public blog was easy to miss.

## Run

```
cd keeppassive
npm install
npm test
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Jarvis is `#/jarvis`.

## This Chrome

1. Leave Jarvis running on port 4173.
2. Chrome → `chrome://extensions` → Developer mode → Load unpacked → `keeppassive/extension`.
3. Sign in to Seller Central and Whatnot **in that same Chrome profile**.
4. Click the KeepPassive icon → Capture Amazon / Capture Whatnot.

Capture walks the hub pages already allowed to that session. If a sign-in form is showing, it stops. It does not type a password, store cookies, or call Amazon/Whatnot developer APIs. JSON the page already fetched in that tab can be forwarded to Jarvis on localhost; tokens and cookie fields are stripped.

## Article slot

After an Amazon capture, Jarvis prefers the Seller News item taken from the logged-in home/Learn page. Until then it fills the slot from the public Selling Partner Blog so the section is never blank.
