'use client';


import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  EyeOff,
  Camera,
  Cloud,
  Volume2,
  Zap,
  Lock,
  ExternalLink,
  ChevronDown,
  Check,
  Laptop,
  Sparkles,
  ArrowRight,
  Copy,
  Terminal,
  Layers
} from 'lucide-react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'snip' | 'browser'>('chat');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copiedHotkey, setCopiedHotkey] = useState<string | null>(null);

  const handleCopyHotkey = (hotkey: string) => {
    navigator.clipboard.writeText(hotkey);
    setCopiedHotkey(hotkey);
    setTimeout(() => setCopiedHotkey(null), 2000);
  };

  const faqs = [
    {
      q: 'How does Ghost Stealth Mode hide the app from screen sharing?',
      a: 'Translucent uses the native Windows User32 display affinity API (SetWindowDisplayAffinity). This instructs the Windows Desktop Window Manager (DWM) compositor to completely exclude the window from screen recordings, OBS Studio, Zoom, Microsoft Teams, Discord, and Google Meet screen shares.',
    },
    {
      q: 'Where are my chat history and screenshots stored?',
      a: 'Translucent uses a dual-layer storage architecture. Fast temporary cache is saved locally on your device for instant offline startup. In the background, chats, screen snips, and attached files are debounced and synchronized permanently to your Cloudinary cloud storage so your history restores on any PC.',
    },
    {
      q: 'What is the difference between the .MSIX and .EXE packages?',
      a: 'The .MSIX package is the modern Windows Store App package that installs cleanly with full trust, verified code signing, and automatic updates. The .EXE is a portable, single-file standalone executable that runs immediately without any installation.',
    },
    {
      q: 'Does it require an internet connection for live captions?',
      a: 'No. Live meeting speech-to-text captions are powered by native Windows offline speech recognition (System.Speech), meaning you get zero-latency audio transcription completely offline.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-purple-500/30 selection:text-purple-200 overflow-x-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-150px] left-1/4 w-[650px] h-[650px] bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[350px] right-1/6 w-[550px] h-[550px] bg-indigo-600/12 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-100px] left-1/3 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
      </div>

      {/* ─── Navigation Header ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/25 border border-purple-400/25 group-hover:scale-105 transition-transform">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Translucent</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  PRO v1.0.4
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono tracking-wide">Stealth AI Copilot for Windows</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
            <a href="#features" className="hover:text-purple-300 transition-colors">Features</a>
            <a href="#screenshots" className="hover:text-purple-300 transition-colors">Screenshots</a>
            <a href="#ai-models" className="hover:text-purple-300 transition-colors">AI Models</a>
            <a href="#how-it-works" className="hover:text-purple-300 transition-colors">How It Works</a>
            <Link href="/docs" className="text-purple-400 hover:text-purple-300 transition-colors font-bold">Docs</Link>
            <a href="#download" className="hover:text-purple-300 transition-colors">Download</a>
            <a href="#faq" className="hover:text-purple-300 transition-colors">FAQ</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center pl-1">
            <a
              href="https://get.microsoft.com/installer/download/9n12bcrjxl2q?referrer=appbadge&cid=header"
              target="_self"
              className="hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
              title="Get Translucent on Microsoft Store"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://get.microsoft.com/images/en-us%20dark.svg"
                onError={(e) => { e.currentTarget.src = "/ms-store-badge-dark.svg"; }}
                alt="Get it from Microsoft"
                className="h-9 w-auto"
              />
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 text-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold shadow-lg shadow-purple-950/20 mb-8 animate-in fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>🪟 Now available on Microsoft Store — Windows 10 &amp; 11</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
          The Invisible AI Copilot<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
            Engineered for Stealth &amp; Speed
          </span>
        </h1>

        {/* Subhead */}
        <p className="mt-6 text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed">
          An ultra-lightweight translucent acrylic glass desktop assistant that floats above any window. Built with vanish hotkeys, real-time screen snip vision, system audio routing, and Gemini 2.5 Flash intelligence.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">

          {/* Primary — Official Microsoft Store Badge */}
          <a
            href="https://get.microsoft.com/installer/download/9n12bcrjxl2q?referrer=appbadge&cid=hero"
            target="_self"
            className="hover:opacity-90 hover:scale-[1.04] active:scale-[0.98] transition-all drop-shadow-2xl"
            title="Get Translucent on Microsoft Store"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://get.microsoft.com/images/en-us%20dark.svg"
              onError={(e) => { e.currentTarget.src = "/ms-store-badge-dark.svg"; }}
              alt="Get it from Microsoft"
              className="h-14 w-auto"
            />
          </a>

          {/* Direct Store Protocol for Windows */}
          <a
            href="ms-windows-store://pdp/?productid=9N12BCRJXL2Q"
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/30 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-lg shadow-blue-950/40"
            title="Open directly in Microsoft Store application"
          >
            <ExternalLink className="w-4 h-4 text-cyan-300" />
            <span>Open in Store App</span>
          </a>

          {/* Secondary — Standalone EXE */}
          <a
            href="/downloads/Translucent.exe"
            download="Translucent.exe"
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-semibold text-zinc-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.2] transition-all"
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Portable .EXE</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-blue-400" />
            Available on Microsoft Store
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Windows 10 / 11 (64-bit) Compatible
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Signed &amp; Verified by Microsoft
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Cloudinary Cloud Storage &amp; Local Cache
          </span>
        </div>
      </section>

      {/* Real Screenshot Showcase */}
      <section id="showcase" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Tab selector */}
        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {([
            { key: 'chat',    label: '💬 AI Chat' },
            { key: 'snip',    label: '👻 Ghost Mode' },
            { key: 'browser', label: '🌐 Built-in Browser' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === key
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-950/50'
                  : 'text-zinc-400 hover:text-white bg-white/[0.04] border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Screenshot Frame */}
        <div className="rounded-2xl border border-white/[0.12] bg-[#0e0e14] shadow-2xl shadow-purple-950/40 overflow-hidden">
          {/* Window chrome */}
          <div className="h-10 bg-[#181822] border-b border-white/[0.07] px-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-[11px] font-semibold text-zinc-400 flex items-center gap-2">
                Translucent — Stealth AI Copilot
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase tracking-wide">Hidden from capture</span>
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              <Cloud className="w-3 h-3" /> Cloud Synced
            </span>
          </div>

          {/* Real Screenshot */}
          <div className="relative w-full bg-black">
            {activeTab === 'chat' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/Translucent/chat with AI .png" alt="AI Chat" className="w-full object-cover animate-in fade-in duration-300" />
            )}
            {activeTab === 'snip' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/Translucent/Ghost mode.png" alt="Ghost Stealth Mode" className="w-full object-cover animate-in fade-in duration-300" />
            )}
            {activeTab === 'browser' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/Translucent/built-in broswer.png" alt="Built-in Browser" className="w-full object-cover animate-in fade-in duration-300" />
            )}
          </div>
        </div>

        {/* Thumbnail strip — all 8 screenshots */}
        <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[
            { src: '/Translucent/chat with AI .png',          label: 'AI Chat' },
            { src: '/Translucent/Ghost mode.png',             label: 'Ghost Mode' },
            { src: '/Translucent/built-in broswer.png',       label: 'Browser' },
            { src: '/Translucent/Full Invisible Broswer.png', label: 'Full View' },
            { src: '/Translucent/preloaded prompts.png',      label: 'Prompts' },
            { src: '/Translucent/audio input settings.png',   label: 'Audio' },
            { src: '/Translucent/settings.png',               label: 'Settings' },
            { src: '/Translucent/Device susbscrition .png',   label: 'License' },
          ].map(({ src, label }) => (
            <div
              key={src}
              className="group cursor-pointer"
              onClick={() => {
                if (src.includes('chat')) setActiveTab('chat');
                else if (src.includes('Ghost')) setActiveTab('snip');
                else if (src.includes('built') || src.includes('Full')) setActiveTab('browser');
              }}
            >
              <div className="rounded-xl overflow-hidden border border-white/[0.08] group-hover:border-purple-500/40 transition-all group-hover:scale-[1.05]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="w-full h-14 object-cover object-top" />
              </div>
              <p className="text-center text-[9px] text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>
      {/* ─── Features Grid ─── */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-widest font-bold text-purple-400 mb-3">Power User Architecture</h2>
          <h3 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Engineered for Stealth, Speed &amp; Accuracy
          </h3>
          <p className="mt-4 text-zinc-400 text-sm sm:text-base">
            Everything you need for seamless, unobtrusive intelligence directly on your Windows desktop.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/90 p-6 backdrop-blur-md hover:border-purple-500/30 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
              <EyeOff className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Ghost Stealth Mode</h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              Completely hidden from screen sharing software (Zoom, Teams, Discord, OBS) using hardware-level Win32 display affinity.
            </p>
            <span className="font-mono text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Win32 WDA_EXCLUDEFROMCAPTURE
            </span>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/90 p-6 backdrop-blur-md hover:border-emerald-500/30 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Instant Screen Snip Analysis</h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              Crop any window, complex code error, or interview question with a keyboard shortcut and receive instant analysis directly in chat.
            </p>
            <span className="font-mono text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Hotkey: Ctrl + Shift + S
            </span>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/90 p-6 backdrop-blur-md hover:border-blue-500/30 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
              <Cloud className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Dual-Layer Cloud &amp; Device Sync</h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              Instant local cache on your PC, paired with background Cloudinary cloud backups. Chats, snips, and attached files sync across all devices.
            </p>
            <span className="font-mono text-[11px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Cloudinary + Local Cache
            </span>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/90 p-6 backdrop-blur-md hover:border-amber-500/30 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
              <Volume2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">WASAPI Meeting Audio Feed</h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              Capture meeting speaker audio or your microphone and feed it into browser tabs or offline speech recognition for live captions.
            </p>
            <span className="font-mono text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              NAudio WASAPI Loopback
            </span>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/90 p-6 backdrop-blur-md hover:border-indigo-500/30 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Prompt Fast-Deck</h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              Curated quick-action chips for rapid technical answers, STAR-format interview responses, and concise solution breakdowns.
            </p>
            <span className="font-mono text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              1-Click Prompt Injection
            </span>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/90 p-6 backdrop-blur-md hover:border-rose-500/30 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Google OAuth &amp; Hardware Lock</h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              Single-device hardware license enforcement ensures complete privacy and prevents unauthorized account sharing.
            </p>
            <span className="font-mono text-[11px] text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Supabase + Google OAuth 2.0
            </span>
          </div>
        </div>
      </section>

      {/* ─── Real App Screenshots Gallery ─── */}
      <section id="screenshots" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs uppercase tracking-widest font-bold text-purple-400 mb-3">Real App Screenshots</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            See Translucent in Action
          </h3>
          <p className="mt-4 text-zinc-400 text-sm">
            Every pixel of your workflow, invisible to screen capture — but visible to you.
          </p>
        </div>

        {/* Screenshot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { src: '/Translucent/Full Invisible Broswer.png', label: 'Full Invisible Browser', caption: 'Float a full browser overlay above any app — completely hidden from screen capture.', tag: '🌐 Browser' },
            { src: '/Translucent/chat with AI .png', label: 'Chat with AI', caption: 'Ask Gemini, GPT, or Groq anything — directly inside your translucent floating panel.', tag: '🤖 AI Chat' },
            { src: '/Translucent/Ghost mode.png', label: 'Ghost Mode Active', caption: 'Ghost Mode makes clicks pass through the window — it becomes truly invisible.', tag: '👻 Ghost Mode' },
            { src: '/Translucent/settings.png', label: 'AI Provider Settings', caption: 'Switch between Gemini, GPT, Groq, DeepSeek or OpenRouter with your own API key.', tag: '⚙️ Settings' },
            { src: '/Translucent/preloaded prompts.png', label: 'Preloaded Prompts', caption: 'One-click smart prompts for interviews, code review, debugging, and more.', tag: '⚡ Prompts' },
            { src: '/Translucent/audio input settings.png', label: 'Audio Input Settings', caption: 'Route meeting audio or microphone into AI context for live captions.', tag: '🎙️ Audio' },
            { src: '/Translucent/built-in broswer.png', label: 'Built-in Browser', caption: 'Dual WebView2 multi-tab browser — browse docs and AI side by side.', tag: '📑 Multi-Tab' },
            { src: '/Translucent/Device susbscrition .png', label: 'Device & Subscription', caption: 'Manage your licensed devices and subscription status from one place.', tag: '🔐 License' },
          ].map((shot, i) => (
            <div
              key={i}
              className="group relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#121217]/80 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-950/40"
            >
              {/* Screenshot Image */}
              <div className="relative w-full aspect-video overflow-hidden bg-black/40">
                <img
                  src={shot.src}
                  alt={shot.label}
                  className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-500"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <p className="text-white text-[11px] leading-relaxed">{shot.caption}</p>
                </div>
              </div>
              {/* Card Footer */}
              <div className="px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">{shot.label}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                  {shot.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Store Banner */}
        <div className="mt-12 rounded-3xl overflow-hidden border border-white/[0.10] shadow-2xl shadow-purple-950/30">
          <img
            src="/Translucent/store-banner.jpg"
            alt="Translucent — Your Invisible AI Assistant for Windows"
            className="w-full object-cover"
          />
        </div>
      </section>

      {/* ─── How It Works (3 Steps) ─── */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-widest font-bold text-purple-400 mb-3">Seamless Setup</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Up and Running in 30 Seconds
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl bg-[#121217]/60 border border-white/[0.08] p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 font-bold text-lg flex items-center justify-center mx-auto mb-4">
              01
            </div>
            <h4 className="text-base font-bold text-white mb-2">Download &amp; Install</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Download the signed <code className="text-emerald-400">.msix</code> or standalone <code className="text-purple-400">.exe</code> package below. Native .NET 8 ensures zero lag.
            </p>
          </div>

          <div className="rounded-2xl bg-[#121217]/60 border border-white/[0.08] p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 font-bold text-lg flex items-center justify-center mx-auto mb-4">
              02
            </div>
            <h4 className="text-base font-bold text-white mb-2">Sign in with Google</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Click &quot;Sign in with Google&quot; to bind your software license securely with your account and device ID.
            </p>
          </div>

          <div className="rounded-2xl bg-[#121217]/60 border border-white/[0.08] p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 font-bold text-lg flex items-center justify-center mx-auto mb-4">
              03
            </div>
            <h4 className="text-base font-bold text-white mb-2">Summon Anywhere</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Press <code className="text-purple-300">Ctrl + Shift + V</code> anytime to summon your translucent floating copilot over any program.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Multi-Provider AI Documentation Section ─── */}
      <section id="ai-models" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#121217]/90 via-[#0d0d12]/90 to-[#070709] p-8 sm:p-12 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                MULTI-PROVIDER AI ENGINE
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Connect Any AI Model with Instant Switching
              </h3>
              <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Translucent isn&apos;t locked to a single provider. Switch freely between Google Gemini, Groq, OpenAI, DeepSeek, OpenRouter, and local Ollama directly in Settings (⚙️ icon) with dedicated key memory.
              </p>
            </div>

            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-950/40 transition-all hover:scale-105 shrink-0 self-start md:self-auto"
            >
              <span>Full Documentation &amp; Setup Guide</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* AI Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Google Gemini */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm">Google Gemini</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Default &amp; Vision
                </span>
              </div>
              <div className="text-xs text-zinc-400 mb-3 leading-relaxed">
                1M token context for deep reasoning and real-time screen snip analysis with automatic 503 failover.
              </div>
              <div className="font-mono text-[11px] text-zinc-300 mb-4 bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                gemini-3.8-flash, gemini-2.5-flash
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                <span>Get API Key (aistudio.google.com)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Groq */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm">Groq</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Free &amp; Ultra Fast
                </span>
              </div>
              <div className="text-xs text-zinc-400 mb-3 leading-relaxed">
                World&apos;s fastest LPU inference streaming at 500+ tokens/sec. 100% free developer tier.
              </div>
              <div className="font-mono text-[11px] text-zinc-300 mb-4 bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                llama-3.3-70b-versatile, llama-3.1-8b
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                <span>Get Free Key (console.groq.com)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* OpenAI */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm">OpenAI (GPT-4o)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Gold Standard
                </span>
              </div>
              <div className="text-xs text-zinc-400 mb-3 leading-relaxed">
                State-of-the-art accuracy for architectural design, code review, and structured responses.
              </div>
              <div className="font-mono text-[11px] text-zinc-300 mb-4 bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                gpt-4o, gpt-4o-mini, o3-mini
              </div>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                <span>Get API Key (platform.openai.com)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* DeepSeek */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm">DeepSeek</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Deep Reasoning
                </span>
              </div>
              <div className="text-xs text-zinc-400 mb-3 leading-relaxed">
                High-performance reasoning and mathematical deductions with low token costs.
              </div>
              <div className="font-mono text-[11px] text-zinc-300 mb-4 bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                deepseek-chat, deepseek-reasoner
              </div>
              <a
                href="https://platform.deepseek.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                <span>Get API Key (platform.deepseek.com)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* OpenRouter */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm">OpenRouter</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Any Model
                </span>
              </div>
              <div className="text-xs text-zinc-400 mb-3 leading-relaxed">
                Access 300+ models including Claude 3.5 Sonnet, Llama 3.3, and Mistral with a single key.
              </div>
              <div className="font-mono text-[11px] text-zinc-300 mb-4 bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                meta-llama/llama-3.3-70b, claude-3.5
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                <span>Get API Key (openrouter.ai)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Local Ollama */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-zinc-500/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm">Local / Ollama</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-300 border border-zinc-500/20">
                  100% Offline &amp; Private
                </span>
              </div>
              <div className="text-xs text-zinc-400 mb-3 leading-relaxed">
                Run zero-leak models locally on your GPU. Zero API fees, zero rate limits, full privacy.
              </div>
              <div className="font-mono text-[11px] text-zinc-300 mb-4 bg-black/40 p-2 rounded-lg border border-white/[0.04]">
                llama3, mistral, deepseek-r1
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                http://localhost:11434 (No Key Needed)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Download Section ─── */}
      <section id="download" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl border border-white/[0.12] bg-[#14141c]/90 p-8 sm:p-12 shadow-2xl backdrop-blur-2xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Download Translucent Pro
            </h3>
            <p className="mt-3 text-sm text-zinc-400">
              Select your preferred Windows distribution package. Fully compatible with Windows 10 and Windows 11.
            </p>
          </div>

          {/* Download Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Microsoft Store Card */}
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/[0.08] to-purple-500/[0.03] p-6 flex flex-col justify-between hover:border-blue-500/50 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                    Official Microsoft Store
                  </span>
                  <span className="text-xs font-mono text-zinc-400">Windows 10 / 11</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Translucent on Microsoft Store</h4>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  Certified, signed, and distributed by Microsoft. Enjoy seamless one-click installation, background automatic updates, and full sandbox security.
                </p>

                {/* Microsoft Store Official Badge */}
                <div className="mb-5 flex items-center justify-center sm:justify-start">
                  <a
                    href="https://get.microsoft.com/installer/download/9n12bcrjxl2q?referrer=appbadge&cid=download_section"
                    target="_self"
                    className="hover:opacity-90 hover:scale-105 active:scale-95 transition-all drop-shadow-lg"
                    title="Download Translucent from Microsoft Store"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://get.microsoft.com/images/en-us%20dark.svg"
                      onError={(e) => { e.currentTarget.src = "/ms-store-badge-dark.svg"; }}
                      alt="Get it from Microsoft"
                      className="h-12 w-auto"
                    />
                  </a>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <a
                  href="ms-windows-store://pdp/?productid=9N12BCRJXL2Q"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4 text-cyan-300" />
                  <span>Open in Microsoft Store App</span>
                </a>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pt-1">
                  <a
                    href="https://apps.microsoft.com/store/detail/9N12BCRJXL2Q?cid=DevShareMWAPCS"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-purple-300 transition-colors inline-flex items-center gap-1"
                  >
                    <span>Web Store Listing</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                  <a
                    href="/downloads/Translucent.msix"
                    download="Translucent.msix"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Offline .MSIX (64 MB)
                  </a>
                </div>
              </div>
            </div>

            {/* Standalone EXE Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col justify-between hover:border-purple-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Portable Standalone
                  </span>
                  <span className="text-xs font-mono text-zinc-400">64.28 MB</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Standalone Executable (.exe)</h4>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  Self-contained portable binary. Zero installation required—simply double-click to launch immediately.
                </p>
              </div>

              <a
                href="/downloads/Translucent.exe"
                download="Translucent.exe"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-all"
              >
                <Download className="w-4 h-4 text-purple-400" />
                <span>Download Translucent.exe</span>
              </a>
            </div>
          </div>

          {/* Specs List */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <span className="text-[11px] text-zinc-500 block uppercase">OS</span>
              <span className="text-xs font-semibold text-white">Windows 10 / 11 (64-bit)</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block uppercase">Architecture</span>
              <span className="text-xs font-semibold text-white">x64 (AMD64)</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block uppercase">Framework</span>
              <span className="text-xs font-semibold text-white">.NET 8 (Self-Contained)</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block uppercase">License</span>
              <span className="text-xs font-semibold text-purple-400">PRO v1.0.4.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase tracking-widest font-bold text-purple-400 mb-2">Frequently Asked Questions</h2>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">Everything You Need to Know</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#121217]/70 backdrop-blur-md overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-white hover:text-purple-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180 text-purple-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.04] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#070709] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              ⚡
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Translucent Technologies</p>
              <p className="text-[11px] text-zinc-500">© 2026 Translucent. All rights reserved.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400">
            <a href="/downloads/Translucent.msix" className="hover:text-white transition-colors" download="Translucent.msix">
              Store Package (.msix)
            </a>
            <a href="/downloads/Translucent.exe" className="hover:text-white transition-colors" download="Translucent.exe">
              Standalone (.exe)
            </a>
            <a
              href="https://apps.microsoft.com/store/detail/9N12BCRJXL2Q?cid=DevShareMWAPCS"
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
            >
              Microsoft Store
            </a>
            <Link href="/docs" className="hover:text-white transition-colors">
              Documentation &amp; AI Setup
            </Link>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#ai-models" className="hover:text-white transition-colors">
              AI Models
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
