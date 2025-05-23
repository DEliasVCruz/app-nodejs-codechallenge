let random: unknown;

if (typeof process === "object") {
  const nodeCrypto = await import("node:crypto");
  random = nodeCrypto.randomFillSync;
  // Do Node.js specific things here
} else {
  random = crypto.getRandomValues;
  // Do web browser specific things here
}

let idLastTimestamp = 0;
let idLastBuffer = new DataView(new ArrayBuffer(16));

export function id(): bigint {
  // Ensure timestamp monotonically increases and generate a new random on each new timestamp.
  let timestamp = Date.now();
  if (timestamp <= idLastTimestamp) {
    timestamp = idLastTimestamp;
  } else {
    idLastTimestamp = timestamp;
    (random as any)(idLastBuffer);
  }

  // Increment the u80 in idLastBuffer using carry arithmetic on u32s (as JS doesn't have fast u64).
  const littleEndian = true;
  const randomLo32 = idLastBuffer.getUint32(0, littleEndian) + 1;
  const randomHi32 =
    idLastBuffer.getUint32(4, littleEndian) + (randomLo32 > 0xffffffff ? 1 : 0);
  const randomHi16 =
    idLastBuffer.getUint16(8, littleEndian) + (randomHi32 > 0xffffffff ? 1 : 0);
  if (randomHi16 > 0xffff) {
    throw new Error("random bits overflow on monotonic increment");
  }

  // Store the incremented random monotonic and the timestamp into the buffer.
  idLastBuffer.setUint32(0, randomLo32 & 0xffffffff, littleEndian);
  idLastBuffer.setUint32(4, randomHi32 & 0xffffffff, littleEndian);
  idLastBuffer.setUint16(8, randomHi16, littleEndian); // No need to mask since checked above.
  idLastBuffer.setUint16(10, timestamp & 0xffff, littleEndian); // timestamp lo.
  idLastBuffer.setUint32(12, (timestamp >>> 16) & 0xffffffff, littleEndian); // timestamp hi.

  // Then return the buffer's contents as a little-endian u128 bigint.
  const lo = idLastBuffer.getBigUint64(0, littleEndian);
  const hi = idLastBuffer.getBigUint64(8, littleEndian);
  return (hi << 64n) | lo;
}
