// Jilan Key — Master generator + activation check (offline, no Firebase yet)
// Usage: node keygen.js  -> prints a sample key + activation tests
function makeKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
  let parts = [];
  for (let p = 0; p < 3; p++) {
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    parts.push(s);
  }
  return 'JLN-' + parts.join('-');
}
// Activation: key record, bound IMEI is locked at first activation.
function activate(record, imei) {
  if (record.status === 'revoked') return { ok: false, why: 'Key revoked by Master' };
  if (record.status === 'active' && record.boundImei !== imei)
    return { ok: false, why: 'Ye key doosre mobile se bandhi hai — is mobile par nahi chalegi' };
  if (record.status === 'active' && record.boundImei === imei)
    return { ok: true, why: 'Pehle se isi mobile par active hai' };
  record.status = 'active'; record.boundImei = imei; record.activatedAt = new Date().toISOString();
  return { ok: true, why: 'Key active — isi mobile se bandh gayi' };
}
if (require.main === module) {
  const key = makeKey();
  console.log('Sample Jilan Key:', key);
  let rec = { key, status: 'unused', boundImei: '' };
  console.log('Phone A:', activate(rec, '867153043229607'.slice(0, 15)).why);
  console.log('Phone B (same key):', activate(rec, '123456789012345').why);
  console.log('Phone A again:', activate(rec, '867153043229607'.slice(0, 15)).why);
  rec.status = 'revoked';
  console.log('After Master revoke, Phone A:', activate(rec, '867153043229607'.slice(0, 15)).why);
}
module.exports = { makeKey, activate };
