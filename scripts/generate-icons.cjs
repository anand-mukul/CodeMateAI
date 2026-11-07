// Generate simple valid PNG icons for Chrome Extension
const fs = require('fs');
const path = require('path');

function createSimplePNG(size) {
  // We can write a 1x1 or sized PNG with canvas or minimal PNG buffer
  // Minimal RGBA PNG structure
  const zlib = require('zlib');
  
  const width = size;
  const height = size;
  
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < width; x++) {
      // Create indigo/purple gradient icon
      const inCircle = Math.sqrt((x - width/2)**2 + (y - height/2)**2) <= (width/2 - 1);
      if (inCircle) {
        row.push(99, 102, 241, 255); // Indigo #6366f1
      } else {
        row.push(0, 0, 0, 0); // Transparent
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
    // Standard CRC32
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

[16, 32, 48, 128].forEach(size => {
  const p = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(p, createSimplePNG(size));
  console.log('Created icon:', p);
});

