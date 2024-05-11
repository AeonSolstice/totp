export const b32 = {
  ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  ALPHABET_MAP: {},

  decode(s) {
    const buf = new Uint8Array(Math.ceil((s.length * 5) / 8));

    let bits = 0;
    let bitsLen = 0;
    let bufPos = 0;

    for (const c of s) {
      bits = (bits << 5) | this.ALPHABET_MAP[c];
      bitsLen += 5;

      while (bitsLen >= 8) {
        buf[bufPos++] = bits >>> (bitsLen - 8);
        bitsLen -= 8;
      }
    }

    return buf;
  },

  encode(buf) {
    let s = '';
    let bits = 0;
    let bitsLen = 0;

    for (const b of buf) {
      bits = (bits << 8) | b;
      bitsLen += 8;

      while (bitsLen >= 5) {
        s += this.ALPHABET[(bits >>> (bitsLen - 5)) & 31];
        bitsLen -= 5;
      }
    }

    if (bitsLen > 0) {
      s += this.ALPHABET[(bits << (5 - bitsLen)) & 31];
    }

    return s;
  },
};

for (let i = 0; i < b32.ALPHABET.length; i++) {
  b32.ALPHABET_MAP[(b32.ALPHABET_MAP[i] = b32.ALPHABET[i])] = i;
}

export const hotp = {
  HALF: 2 ** 32,

  async generate({ key, digits = 6, counter = 0 }) {
    const buf = new DataView(new ArrayBuffer(8));
    buf.setUint32(0, Math.floor(counter / this.HALF));
    buf.setUint32(4, counter % this.HALF);

    const secret = await window.crypto.subtle.importKey(
      'raw',
      key,
      {
        name: 'HMAC',
        hash: 'SHA-1',
      },
      false,
      ['sign'],
    );

    const hmac = new Uint8Array(
      await window.crypto.subtle.sign('HMAC', secret, buf),
    );

    const o = hmac[hmac.length - 1] & 15;

    return (
      (((hmac[o] & 127) << 24) |
        ((hmac[o + 1] & 255) << 16) |
        ((hmac[o + 2] & 255) << 8) |
        (hmac[o + 3] & 255)) %
      10 ** digits
    )
      .toString()
      .padStart(digits, '0');
  },

  async validate({
    key,
    digits = 6,
    counter = 0,
    token,
    windowBack = 1,
    windowForward = 1,
  }) {
    for (let i = -windowBack; i <= windowForward; i++) {
      if (
        (await this.generate({
          key,
          digits,
          counter: counter + i,
        })) === token
      ) {
        return i;
      }
    }
  },
};

export const totp = {
  generate({ key, digits = 6, period = 30, ts = Date.now() }) {
    return hotp.generate({
      key,
      digits,
      counter: Math.floor(ts / 1000 / period),
    });
  },

  validate({
    key,
    digits = 6,
    period = 30,
    ts = Date.now(),
    token,
    windowBack = 1,
    windowForward = 1,
  }) {
    return hotp.validate({
      key,
      digits,
      counter: Math.floor(ts / 1000 / period),
      token,
      windowBack,
      windowForward,
    });
  },
};
