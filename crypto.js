/* ==========================================================================
   crypto.js  —  SHA-256 خالص (بدون وابستگی) + توابع هش رمز عبور
   روی هر هاستی حتی بدون HTTPS هم کار می‌کند.
   ========================================================================== */
const K = [];
const H0 = [];
(function init() {
  let n = 2, count = 0;
  while (count < 64) {
    let prime = true;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) { prime = false; break; }
    if (prime) {
      if (count < 8) H0[count] = ((Math.pow(n, 1 / 2) % 1) * 4294967296) | 0;
      K[count] = ((Math.pow(n, 1 / 3) % 1) * 4294967296) | 0;
      count++;
    }
    n++;
  }
})();

export function sha256(str) {
  const bytes = new TextEncoder().encode(str);
  const l = bytes.length;
  const n = ((l + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(n);
  buf.set(bytes);
  buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(n - 8, Math.floor((l * 8) / 4294967296));
  dv.setUint32(n - 4, (l * 8) >>> 0);
  const h = H0.slice();
  const w = new Array(64);
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getInt32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], c = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((c >>> 17) | (c << 15)) ^ ((c >>> 19) | (c << 13)) ^ (c >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

/** هش رمز با نمک و تکرار (کندسازی حملات حدسی) */
export function hashPassword(password, salt, rounds = 1500) {
  let h = sha256(salt + ":" + password);
  for (let i = 0; i < rounds; i++) h = sha256(h + salt);
  return h;
}

export function randomSalt(len = 16) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function recoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  const chars = Array.from(a, (x) => alphabet[x % alphabet.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

export function passwordStrength(p) {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 9) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}
