/**
 * Node side image helpers for the replay tool: PNG decode / encode and simple drawing.
 * Node modules are loaded dynamically so the app's type checking (browser only) stays clean.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export interface Rgba { data: Uint8ClampedArray; width: number; height: number }

let zlib: Any
async function z() {
  if (!zlib) { const name = 'node:zlib'; zlib = await import(/* @vite-ignore */ name) }
  return zlib
}

export async function decodePng(bytes: Uint8Array): Promise<Rgba> {
  const zl = await z()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let pos = 8, width = 0, height = 0, colorType = 0, bitDepth = 0
  const idat: Uint8Array[] = []
  while (pos < bytes.length) {
    const len = view.getUint32(pos); const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8))
    const data = bytes.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      const d = new DataView(data.buffer, data.byteOffset, data.byteLength)
      width = d.getUint32(0); height = d.getUint32(4); bitDepth = data[8]; colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) throw new Error(`unsupported PNG (depth ${bitDepth}, color ${colorType})`)
  const bpp = colorType === 6 ? 4 : 3
  const joined = new Uint8Array(idat.reduce((s, d) => s + d.length, 0))
  let o = 0
  for (const d of idat) { joined.set(d, o); o += d.length }
  const raw: Uint8Array = new Uint8Array(zl.inflateSync(joined))
  const stride = width * bpp
  const px = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const out = px.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : new Uint8Array(stride)
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      out[i] = v & 255
    }
  }
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, j = 0; i < width * height; i++, j += bpp) {
    data[i * 4] = px[j]; data[i * 4 + 1] = px[j + 1]; data[i * 4 + 2] = px[j + 2]; data[i * 4 + 3] = bpp === 4 ? px[j + 3] : 255
  }
  return { data, width, height }
}

export async function encodePng(img: Rgba): Promise<Uint8Array> {
  const zl = await z()
  const { width: w, height: h, data } = img
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c })
  const crc = (b: Uint8Array) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 }
  const u32 = (v: number) => new Uint8Array([v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255])
  const chunk = (t: string, d: Uint8Array) => {
    const td = new Uint8Array(4 + d.length); td.set([...t].map((c) => c.charCodeAt(0))); td.set(d, 4)
    return [u32(d.length), td, u32(crc(td))]
  }
  const raw = new Uint8Array((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) raw.set(data.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1)
  const ihdr = new Uint8Array(13); ihdr.set(u32(w), 0); ihdr.set(u32(h), 4); ihdr[8] = 8; ihdr[9] = 6
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), ...chunk('IHDR', ihdr), ...chunk('IDAT', new Uint8Array(zl.deflateSync(raw))), ...chunk('IEND', new Uint8Array(0))]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

export function hexRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [v >> 16, (v >> 8) & 255, v & 255]
}

export function drawLine(img: Rgba, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number], width = 1, dashed = false) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
  const r = Math.floor(width / 2)
  for (let s = 0; s <= steps; s++) {
    if (dashed && Math.floor(s / 4) % 2) continue
    const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const px = x + dx, py = y + dy
      if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue
      const i = (py * img.width + px) * 4
      img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255
    }
  }
}

export async function fsp(): Promise<Any> {
  const name = 'node:fs'
  return import(/* @vite-ignore */ name)
}
