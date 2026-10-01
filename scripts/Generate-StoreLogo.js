/**
 * Generates Translucent logo PNGs for Microsoft Store
 * Sizes: 300x300, 150x150, 71x71
 * Saved to: admin/public/store-listings/logos/
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outputDir = path.resolve(__dirname, '../admin/public/store-listings/logos');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const sizes = [
  { size: 300, out: 'logo-300x300.png', label: '1:1 App tile icon' },
  { size: 150, out: 'logo-150x150.png', label: '1:1 Store logo' },
  { size: 71,  out: 'logo-71x71.png',   label: '1:1 Small tile' },
];

function buildLogoHTML(size) {
  const iconSize   = Math.round(size * 0.60);   // inner icon circle
  const fontSize   = Math.round(size * 0.34);   // T letter
  const glowSize   = Math.round(size * 0.80);   // outer glow ring
  const borderW    = Math.max(2, Math.round(size * 0.025));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .wrap {
    width: ${size}px;
    height: ${size}px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0d0d14;
    border-radius: ${Math.round(size * 0.22)}px;
    overflow: hidden;
  }

  /* Background radial glow */
  .wrap::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 80% at 50% 40%, #4c1d9533 0%, transparent 70%),
      radial-gradient(ellipse 60% 60% at 50% 60%, #7c3aed22 0%, transparent 60%);
  }

  /* Outer subtle ring */
  .ring-outer {
    position: absolute;
    width: ${glowSize}px;
    height: ${glowSize}px;
    border-radius: 50%;
    border: ${borderW}px solid rgba(139,92,246,0.15);
  }

  /* Main icon circle */
  .icon-circle {
    position: relative;
    width: ${iconSize}px;
    height: ${iconSize}px;
    border-radius: 50%;
    background: linear-gradient(145deg, #1a1035, #0f0920);
    border: ${borderW}px solid rgba(139,92,246,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 0 ${Math.round(size * 0.12)}px rgba(124,58,237,0.50),
      0 0 ${Math.round(size * 0.25)}px rgba(124,58,237,0.20),
      inset 0 1px 0 rgba(255,255,255,0.08);
  }

  /* Gloss shimmer inside circle */
  .icon-circle::before {
    content: '';
    position: absolute;
    top: 8%;
    left: 15%;
    width: 70%;
    height: 40%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.10) 0%, transparent 70%);
    border-radius: 50%;
  }

  /* T letter */
  .letter {
    font-family: -apple-system, 'Segoe UI', 'SF Pro Display', sans-serif;
    font-size: ${fontSize}px;
    font-weight: 900;
    letter-spacing: -0.03em;
    background: linear-gradient(170deg, #e0d0ff 0%, #a78bfa 40%, #7c3aed 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    user-select: none;
    line-height: 1;
    margin-top: ${Math.round(size * 0.01)}px;
    filter: drop-shadow(0 0 ${Math.round(size*0.03)}px rgba(167,139,250,0.8));
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="ring-outer"></div>
    <div class="icon-circle">
      <span class="letter">T</span>
    </div>
  </div>
</body>
</html>`;
}

async function generateLogos() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const { size, out } of sizes) {
    const html = buildLogoHTML(size);
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));

    const outPath = path.join(outputDir, out);
    await page.screenshot({
      path: outPath,
      type: 'png',
      omitBackground: false,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    await page.close();
    console.log(`✅ ${out} (${size}×${size})`);
  }

  await browser.close();
  console.log(`\n🎉 All logos saved to:\n   ${outputDir}`);
}

generateLogos().catch(err => { console.error(err); process.exit(1); });
