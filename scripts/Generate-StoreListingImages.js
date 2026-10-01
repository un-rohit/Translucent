/**
 * Generates Microsoft Store listing promotional images.
 * Layout: Caption on TOP + big screenshot in middle + tags on BOTTOM
 * Output: 1366×768px PNG per screenshot, saved to admin/public/store-listings/
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve(__dirname, '../admin/public/Translucent');
const outputDir = path.resolve(__dirname, '../admin/public/store-listings');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const slides = [
  {
    file: 'Full Invisible Broswer.png',
    out: '01-invisible-browser.png',
    headline: 'Browse Invisibly',
    sub: 'Float a full AI browser above any app — completely hidden from screen recordings & screen share.',
    tags: ['🌐 WebView2 Engine', '👻 Screen Capture Protected', '⚡ Zero Performance Impact'],
    accent: '#7c3aed',
  },
  {
    file: 'chat with AI .png',
    out: '02-ai-chat.png',
    headline: 'AI Chat. Always Ready.',
    sub: 'Gemini, GPT-4o, Groq & DeepSeek — chat with any AI model in your floating stealth panel.',
    tags: ['🤖 Multi-Provider AI', '💬 Chat History Sync', '🔒 Protected Window'],
    accent: '#6d28d9',
  },
  {
    file: 'Ghost mode.png',
    out: '03-ghost-mode.png',
    headline: 'Ghost Mode — Truly Invisible.',
    sub: 'Clicks pass right through the window. Hidden from Zoom, Teams, Discord & OBS. Works everywhere.',
    tags: ['👻 Click-Through Mode', '🛡️ Win32 Display Affinity', '⌨️ Ctrl+Shift+T Toggle'],
    accent: '#5b21b6',
  },
  {
    file: 'settings.png',
    out: '04-ai-settings.png',
    headline: 'Any AI. Your API Key.',
    sub: 'Switch between Google Gemini, OpenAI GPT, Groq, DeepSeek or OpenRouter in one click.',
    tags: ['🔑 Bring Your Own Key', '🔄 Hot-Swap Models', '📡 Custom API Endpoint'],
    accent: '#4f46e5',
  },
  {
    file: 'preloaded prompts.png',
    out: '05-prompts.png',
    headline: 'One-Click Smart Prompts.',
    sub: 'Pre-built prompts for interviews, coding, debugging, and analysis — always at your fingertips.',
    tags: ['⚡ Instant Prompts', '💡 Interview Mode', '🧑‍💻 Code Review'],
    accent: '#7c3aed',
  },
  {
    file: 'audio input settings.png',
    out: '06-audio.png',
    headline: 'Hear Everything. Miss Nothing.',
    sub: 'WASAPI loopback captures meeting audio and feeds it into AI for real-time live captions.',
    tags: ['🎙️ WASAPI Loopback', '📝 Live Captions', '🔇 Works Offline'],
    accent: '#0f766e',
  },
  {
    file: 'built-in broswer.png',
    out: '07-builtin-browser.png',
    headline: 'AI + Browser. Side by Side.',
    sub: 'Dual WebView2 multi-tab browser lets you research while your AI panel stays always on top.',
    tags: ['📑 Multi-Tab', '🌐 Full WebView2', '🤖 AI + Browse Together'],
    accent: '#1d4ed8',
  },
  {
    file: 'Device susbscrition .png',
    out: '08-subscription.png',
    headline: 'Your License. Your Devices.',
    sub: 'Manage licensed devices, view subscription status, and control access from one place.',
    tags: ['🔐 Device License', '📋 Subscription Control', '☁️ Cloud Sync'],
    accent: '#047857',
  },
];

function buildHTML(slide, imgBase64) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1366px;
    height: 768px;
    background: #07070b;
    font-family: -apple-system, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  /* Ambient background glow */
  .bg-glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .bg-glow::before {
    content: '';
    position: absolute;
    top: -60px; left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 300px;
    background: ${slide.accent}28;
    border-radius: 50%;
    filter: blur(80px);
  }
  .bg-glow::after {
    content: '';
    position: absolute;
    bottom: -40px; left: 50%;
    transform: translateX(-50%);
    width: 700px; height: 200px;
    background: ${slide.accent}20;
    border-radius: 50%;
    filter: blur(70px);
  }

  /* ── TOP CAPTION BAR ── */
  .top-bar {
    position: relative;
    z-index: 10;
    width: 100%;
    padding: 18px 48px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    background: linear-gradient(to bottom, #07070b, rgba(7,7,11,0.85));
  }

  /* Brand left */
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .brand-icon {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, ${slide.accent}, #a855f7);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    box-shadow: 0 3px 16px ${slide.accent}55;
  }
  .brand-name {
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.3px;
  }
  .brand-sep {
    width: 1px; height: 18px;
    background: rgba(255,255,255,0.15);
    margin: 0 4px;
  }

  /* Headline center */
  .headline-wrap {
    flex: 1;
    text-align: center;
    padding: 0 32px;
  }
  .headline {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.8px;
    line-height: 1.1;
    background: linear-gradient(135deg, #ffffff, #c4b5fd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sub {
    font-size: 12px;
    color: #a1a1aa;
    margin-top: 3px;
    font-weight: 400;
    line-height: 1.4;
  }

  /* Store badge right */
  .store-badge {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    padding: 5px 12px;
  }
  .store-badge span {
    font-size: 11px;
    font-weight: 600;
    color: #c4b5fd;
  }

  /* ── SCREENSHOT AREA ── */
  .screenshot-area {
    position: relative;
    z-index: 5;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 32px 8px;
    overflow: hidden;
  }

  .screenshot-frame {
    position: relative;
    max-height: 100%;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow:
      0 0 0 1px ${slide.accent}30,
      0 8px 48px rgba(0,0,0,0.8),
      0 0 80px ${slide.accent}18;
  }
  .screenshot-frame img {
    display: block;
    height: 100%;
    max-height: 560px;
    width: auto;
    object-fit: cover;
    object-position: top center;
  }

  /* left/right side fades */
  .screenshot-area::before {
    content: '';
    position: absolute;
    top: 0; left: 0; bottom: 0;
    width: 50px;
    background: linear-gradient(to right, #07070b, transparent);
    z-index: 6;
  }
  .screenshot-area::after {
    content: '';
    position: absolute;
    top: 0; right: 0; bottom: 0;
    width: 50px;
    background: linear-gradient(to left, #07070b, transparent);
    z-index: 6;
  }

  /* ── BOTTOM TAGS BAR ── */
  .bottom-bar {
    position: relative;
    z-index: 10;
    width: 100%;
    padding: 12px 48px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.07);
    background: linear-gradient(to top, #07070b, rgba(7,7,11,0.85));
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: #d4d4d8;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    padding: 6px 14px;
    border-radius: 20px;
    white-space: nowrap;
  }

  .tag-accent {
    border-color: ${slide.accent}55;
    background: ${slide.accent}15;
    color: #e9d5ff;
  }

  /* Accent dot separator */
  .tag-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: ${slide.accent};
    opacity: 0.6;
    flex-shrink: 0;
  }
</style>
</head>
<body>
  <div class="bg-glow"></div>

  <!-- ── TOP: Brand + Headline + Store Badge ── -->
  <div class="top-bar">
    <div class="brand">
      <div class="brand-icon">⚡</div>
      <span class="brand-name">Translucent</span>
      <div class="brand-sep"></div>
      <span style="font-size:11px;color:#71717a;font-weight:600;">for Windows</span>
    </div>

    <div class="headline-wrap">
      <div class="headline">${slide.headline}</div>
      <div class="sub">${slide.sub}</div>
    </div>

    <div class="store-badge">
      <span>🪟 Microsoft Store</span>
    </div>
  </div>

  <!-- ── MIDDLE: Big Screenshot ── -->
  <div class="screenshot-area">
    <div class="screenshot-frame">
      <img src="data:image/png;base64,${imgBase64}" alt="App Screenshot" />
    </div>
  </div>

  <!-- ── BOTTOM: Feature Tags ── -->
  <div class="bottom-bar">
    ${slide.tags.map((t, i) => `
      ${i > 0 ? '<div class="tag-dot"></div>' : ''}
      <div class="tag ${i === 0 ? 'tag-accent' : ''}">${t}</div>
    `).join('')}
  </div>
</body>
</html>`;
}

async function generateImages() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const slide of slides) {
    const imgPath = path.join(screenshotsDir, slide.file);
    if (!fs.existsSync(imgPath)) {
      console.log(`⚠️  Skipping missing: ${slide.file}`);
      continue;
    }

    const imgBase64 = fs.readFileSync(imgPath).toString('base64');
    const html = buildHTML(slide, imgBase64);

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const outPath = path.join(outputDir, slide.out);
    await page.screenshot({ path: outPath, type: 'png', clip: { x: 0, y: 0, width: 1366, height: 768 } });
    await page.close();

    console.log(`✅ ${slide.out}`);
  }

  await browser.close();
  console.log(`\n🎉 All ${slides.length} store listing images saved to:\n   ${outputDir}`);
}

generateImages().catch(err => { console.error(err); process.exit(1); });
