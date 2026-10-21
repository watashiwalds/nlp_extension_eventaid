import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Sinh icon PNG (không dùng thư viện ngoài) cho 16 / 48 / 128 px. */

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/icons');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuffer, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function roundRectCoverage(x, y, left, top, right, bottom, radius) {
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  if (x < left || x > right || y < top || y > bottom) return 0;
  if (dx * dx + dy * dy <= radius * radius) return 1;
  return 0;
}

function drawIcon(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const samples = 3;
  const radius = 0.22;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;

          const inTile = roundRectCoverage(x, y, 0.02, 0.02, 0.98, 0.98, radius);
          if (!inTile) continue;

          const t = Math.min(Math.max((y - 0.02) / 0.96, 0), 1);
          let color = [Math.round(61 - t * 24), Math.round(111 - t * 36), Math.round(240 - t * 60)];

          const inPage = roundRectCoverage(x, y, 0.25, 0.27, 0.75, 0.78, 0.07);
          if (inPage) {
            color = [255, 255, 255];
            // Thanh tiêu đề xanh của tờ lịch
            if (y >= 0.27 && y <= 0.36) color = [47, 95, 224];
            // Hai móc treo
            if (y < 0.31 && (Math.abs(x - 0.38) < 0.025 || Math.abs(x - 0.62) < 0.025)) {
              color = [36, 73, 180];
            }
            // Lưới chấm ngày
            const dots = [
              [0.36, 0.47],
              [0.5, 0.47],
              [0.64, 0.47],
              [0.36, 0.59],
              [0.5, 0.59],
              [0.64, 0.59],
              [0.36, 0.7],
              [0.5, 0.7],
            ];
            for (const [dx, dy] of dots) {
              if (Math.abs(x - dx) < 0.045 && Math.abs(y - dy) < 0.045) color = [47, 95, 224];
            }
          }

          r += color[0];
          g += color[1];
          b += color[2];
          a += 255;
        }
      }

      const total = samples * samples;
      const alpha = a / total;
      const index = (py * size + px) * 4;
      if (alpha === 0) {
        buffer[index + 3] = 0;
      } else {
        const covered = a / 255;
        buffer[index] = Math.round(r / covered);
        buffer[index + 1] = Math.round(g / covered);
        buffer[index + 2] = Math.round(b / covered);
        buffer[index + 3] = Math.round(alpha);
      }
    }
  }

  return encodePng(size, size, buffer);
}

mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = resolve(outDir, `icon${size}.png`);
  writeFileSync(file, drawIcon(size));
  console.log(`Đã tạo ${file}`);
}
