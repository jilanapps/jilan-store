# Jilan Key — Bismillah se shuru (2026-10-27)
Alag system, Installock se alag. Live Installock ko kuch nahi chhera gaya.

## Usool (user ke alfaaz me, 2026-10-27 raat)
- Aik key = aik mobile. Key sirf aik IMEI se bandhi hogi.
- System dukaan daar ke paas, key + mobile ka record us ke paas.
- Backup Dr Asif (Master) ke paas — key kho jaye ya dashboard kharab
  ho jaye to Master backup se dobara set karke de sakega.
- Lock screen ke saare function Installock wale hi honge
  (purple lock, PIN Unlock, Shop Contact, WiFi/Data,
  JazzCash / Easypaisa / Raast ID pay, TID).
- Key sirf text nahi — bank se verify kiye baghair fake TID se
  auto-unlock NAHI (Installock TID usool waisa hi rahega).

## Key format
JLN-XXXX-XXXX-XXXX (sirf A-Z, 2-9; 0/O aur 1/I nahi, taake
phone par likhne me ghalti na ho). Har key ke saath:
  key, status (unused / active / revoked / expired),
  boundImei (pehli activation par lock, phir kabhi nahi badlega),
  shopName, shopContact, createdBy (Master), createdAt,
  activatedAt, revokedAt, backupCopy (Master ke paas hamesha).

## Activation usool
1. Phone par key likho -> system check karega: key mojood?
   unused? revoked to nahi?
2. Unused + valid -> isi phone ke IMEI se bandh jao, status=active.
3. Doosre phone par wahi key -> REJECT (already bound to another IMEI).
4. Master revoke kare -> phone unlock/lock band, key dobara kaam nahi.
5. Backup restore: Master apne backup se wahi key + IMEI dobara
   dukaan daar ko de sakta hai (nayi key banane ki zaroorat nahi).

## Files
- keygen.js — Master key generator + activation check (offline test)
- master-dashboard.html — Master key page (generate / view / revoke)
- activation-logic.md — phone-side activation steps (Installock lock
  functions reuse, key mode alag)
