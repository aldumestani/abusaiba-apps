/* نظام الأكواد الموقّعة — HMAC-SHA256 يعمل بدون إنترنت
   شكل الكود: [نوع+مرجع]-[اليوم]-[توقيع]   مثال: D13-4KQ-7HX2MZ
   D = إكمال درس/تمرين ، B = وسام ، C = شهادة مرحلة                        */
(function (global) {
  'use strict';
  const SECRET = 'AbuSaybah-CodeKids-2026::k7#Qm2$xV9!pL4@wZ';
  const DATA_SECRET = 'CodeKids-DataSeal::r8N!t3Yq@5Hc';
  const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 حرفاً بلا 0/O/1/I
  const EPOCH = Date.UTC(2026, 0, 1);

  // ---------- SHA-256 ----------
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  function sha256(bytes) {
    const l = bytes.length, bl = ((l + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(bl); m.set(bytes); m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(bl - 4, (l * 8) >>> 0); dv.setUint32(bl - 8, Math.floor(l / 0x20000000));
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const W = new Uint32Array(64);
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bl; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = r(W[i-15],7) ^ r(W[i-15],18) ^ (W[i-15] >>> 3);
        const s1 = r(W[i-2],17) ^ r(W[i-2],19) ^ (W[i-2] >>> 10);
        W[i] = (W[i-16] + s0 + W[i-7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e,6) ^ r(e,11) ^ r(e,25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
        const t2 = ((r(a,2) ^ r(a,13) ^ r(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0]+=a; H[1]+=b; H[2]+=c; H[3]+=d; H[4]+=e; H[5]+=f; H[6]+=g; H[7]+=h;
    }
    const out = new Uint8Array(32); const odv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i]);
    return out;
  }
  const enc = s => new TextEncoder().encode(s);
  function hmac(key, msg) {
    let k = enc(key); if (k.length > 64) k = sha256(k);
    const kp = new Uint8Array(64); kp.set(k);
    const ip = kp.map(x => x ^ 0x36), op = kp.map(x => x ^ 0x5c);
    const m = enc(msg);
    const inner = new Uint8Array(64 + m.length); inner.set(ip); inner.set(m, 64);
    const ih = sha256(inner);
    const outer = new Uint8Array(96); outer.set(op); outer.set(ih, 64);
    return sha256(outer);
  }
  function toB32(bytes, len) {
    let bits = 0, val = 0, s = '';
    for (const b of bytes) { val = (val << 8) | b; bits += 8;
      while (bits >= 5 && s.length < len) { s += ALPHA[(val >>> (bits - 5)) & 31]; bits -= 5; }
      if (s.length >= len) break; }
    return s;
  }
  function numB32(n, len) { let s = ''; for (let i = 0; i < len; i++) { s = ALPHA[n % 32] + s; n = Math.floor(n / 32); } return s; }
  function b32Num(s) { let n = 0; for (const ch of s) { const v = ALPHA.indexOf(ch); if (v < 0) return -1; n = n * 32 + v; } return n; }

  // ---------- توحيد الكتابة العربية ----------
  function normName(s) {
    return String(s || '').replace(/[ً-ْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }
  // اليوم بحسب التوقيت المحلي للجهاز
  const dayNum = (date) => { const d = date ? new Date(date) : new Date(); return Math.max(0, Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000)); };
  const dayDate = (n) => new Date(2026, 0, 1 + n, 12);

  function make(kind, ref, student, date) {
    const d = dayNum(date), dd = numB32(d, 3);
    const msg = [kind, ref, d, normName(student.name), student.grade + '-' + student.section].join('|');
    return kind + ref + '-' + dd + '-' + toB32(hmac(SECRET, msg), 6);
  }
  function clean(code) {
    return String(code || '').toUpperCase().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/O/g, '0').replace(/[\s_–—]/g, '-').replace(/-+/g, '-').trim();
  }
  function parse(code) {
    const m = /^([DBC])([0-9]{1,3})-([2-9A-Z]{3})-([2-9A-Z]{6})$/.exec(clean(code));
    if (!m) return null;
    const day = b32Num(m[3]);
    return { kind: m[1], ref: m[2], day, date: dayDate(day), sig: m[4], code: m.slice(1, 2).join('') + m[2] + '-' + m[3] + '-' + m[4] };
  }
  function verify(code, student) {
    const p = parse(code); if (!p) return { ok: false, reason: 'format' };
    const expect = make(p.kind, p.ref, student, p.date);
    return { ok: expect === p.code, parsed: p };
  }
  function seal(obj) { return toB32(hmac(DATA_SECRET, JSON.stringify(obj)), 16); }

  global.Codes = { make, parse, verify, clean, normName, seal, dayNum, dayDate };
})(window);
