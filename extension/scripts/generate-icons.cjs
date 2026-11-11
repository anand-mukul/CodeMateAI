// CodeMate AI — High-Resolution Branded Icon Generator
// Generates crisp, production-grade PNG icons with smooth squircle background & code glyph
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createBrandedPNG(size) {
  const width = size;
  const height = size;
  const rows = [];

  for (let y = 0; y < height; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < width; x++) {
      // Normalized coordinates: center is (0, 0), range is approximately [-0.5, 0.5]
      const nx = (x + 0.5) / width - 0.5;
      const ny = (y + 0.5) / height - 0.5;

      // Rounded rectangle / squircle geometry
      const r = 0.20; // Corner radius
      const hw = 0.44; // Half width
      const hh = 0.44; // Half height

      const dx = Math.max(0, Math.abs(nx) - (hw - r));
      const dy = Math.max(0, Math.abs(ny) - (hh - r));
      const distFromCorner = Math.hypot(dx, dy);
      const isInsideCard = distFromCorner <= r;

      if (!isInsideCard) {
        // Transparent background outside squircle
        row.push(0, 0, 0, 0);
        continue;
      }

      // Smooth anti-aliased boundary edge factor [0..1]
      const edgeDist = r - distFromCorner;
      const alphaScale = Math.min(1, Math.max(0, edgeDist * width));

      // Diagonal gradient: Top-Left (#4338ca Indigo) to Bottom-Right (#7c3aed Violet)
      const gradFactor = Math.min(1, Math.max(0, (nx + ny + 0.7) / 1.4));
      let bgR = Math.round(67 + gradFactor * (124 - 67));
      let bgG = Math.round(56 + gradFactor * (58 - 56));
      let bgB = Math.round(202 + gradFactor * (237 - 202));
      let bgA = Math.round(255 * alphaScale);

      // Inner hairline border highlight
      const isNearEdge = edgeDist < (2.0 / width) && edgeDist > (0.2 / width);
      if (isNearEdge) {
        bgR = Math.min(255, bgR + 40);
        bgG = Math.min(255, bgG + 40);
        bgB = Math.min(255, bgB + 50);
      }

      // Stylized Glyph Drawing (Code Brackets "< />" or "M")
      // Left bracket '<'
      const inLeftTop = (ny >= -0.22 && ny <= 0.0) && Math.abs((ny + 0.22) - (nx + 0.26) * 1.8) < (0.8 / Math.max(16, size / 2.5));
      const inLeftBot = (ny >= 0.0 && ny <= 0.22) && Math.abs((0.22 - ny) - (nx + 0.26) * 1.8) < (0.8 / Math.max(16, size / 2.5));
      const inLeftBracket = inLeftTop || inLeftBot;

      // Right bracket '>'
      const inRightTop = (ny >= -0.22 && ny <= 0.0) && Math.abs((ny + 0.22) - (-nx + 0.26) * 1.8) < (0.8 / Math.max(16, size / 2.5));
      const inRightBot = (ny >= 0.0 && ny <= 0.22) && Math.abs((0.22 - ny) - (-nx + 0.26) * 1.8) < (0.8 / Math.max(16, size / 2.5));
      const inRightBracket = inRightTop || inRightBot;

      // Center slash '/'
      const inSlash = Math.abs(ny * 0.35 + nx) < (0.35 / Math.max(12, size / 3.0)) && (Math.abs(ny) <= 0.24);

      const isGlyphPixel = inLeftBracket || inRightBracket || inSlash;

      if (isGlyphPixel) {
        // Crisp white / cyan glyph
        row.push(255, 255, 255, Math.round(255 * alphaScale));
      } else {
        row.push(bgR, bgG, bgB, bgA);
      }
    }
    rows.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    let c = 0xffffffff;
    for (let i = 0; i < body.length; i++) {
      c ^= body[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
      }
    }
    crc.writeInt32BE(~c, 0);
    return Buffer.concat([len, body, crc]);
  }

  const header = Buffer.from([137, 80, 78, 79, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const dir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

[16, 32, 48, 128].forEach((size) => {
  const p = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(p, createBrandedPNG(size));
  console.log(`[✓] Generated CodeMate AI Icon: ${size}x${size} -> ${p}`);
});
