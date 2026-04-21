const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = path.join(__dirname, '../public/icons')

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

const svg = (size) => {
  const r = size * 0.42
  const cx = size / 2
  const fontSize = size * 0.3
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0d0d1a"/>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="#00c853"/>
  <text x="${cx}" y="${cx}"
    font-family="Arial,Helvetica,sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central">CT</text>
</svg>`
}

async function generate() {
  for (const size of sizes) {
    const outPath = path.join(outputDir, `icon-${size}.png`)
    await sharp(Buffer.from(svg(size))).png().toFile(outPath)
    console.log(`Generated icon-${size}.png`)
  }
}

generate().catch(err => { console.error(err); process.exit(1) })
