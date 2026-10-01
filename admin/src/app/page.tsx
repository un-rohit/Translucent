'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
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
            <a href="#showcase" className="hover:text-purple-300 transition-colors">Interface</a>
            <a href="#how-it-works" className="hover:text-purple-300 transition-colors">How It Works</a>
            <a href="#download" className="hover:text-purple-300 transition-colors">Download</a>
            <a href="#faq" className="hover:text-purple-300 transition-colors">FAQ</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
              title="Admin Licensing Console"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Console</span>
            </Link>

            <a
              href="#download"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-950/40 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
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
          <span>Translucent Pro v1.0.4.0 Live for Windows 10 &amp; 11</span>
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
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary MSIX Download */}
          <a
            href="/downloads/Translucent.msix"
            download="Translucent.msix"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Recommended</div>
              <div className="text-sm font-bold">Download Store Package (.msix)</div>
            </div>
          </a>

          {/* Secondary Standalone EXE */}
          <a
            href="/downloads/Translucent.exe"
            download="Translucent.exe"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-semibold text-zinc-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.2] transition-all"
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Standalone .EXE (Portable)</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Signed Windows Store Package (.msix)
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Windows 10 / 11 (64-bit) Compatible
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Cloudinary Cloud Storage &amp; Local Cache
          </span>
        </div>
      </section>

      {/* ─── Interactive Window Showcase Mockup ─── */}
      <section id="showcase" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-3xl border border-white/[0.12] bg-[#121217]/80 backdrop-blur-2xl shadow-2xl shadow-purple-950/40 overflow-hidden">
          {/* Window Chrome Header */}
          <div className="h-11 bg-[#181822]/90 border-b border-white/[0.08] px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="ml-2 text-xs font-semibold text-zinc-400 flex items-center gap-2">
                <span>Invisible Chat — Active Acrylic Overlay</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PROTECTED
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1 text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                <Cloud className="w-3 h-3 text-purple-400" />
                <span>Cloud Synced</span>
              </span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="bg-[#14141c] border-b border-white/[0.06] px-4 py-2 flex items-center gap-2 text-xs font-medium">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              💬 Gemini Chat &amp; Code
            </button>
            <button
              onClick={() => setActiveTab('snip')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === 'snip'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              📸 Stealth Screen Snip
            </button>
            <button
              onClick={() => setActiveTab('browser')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === 'browser'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              🌐 Dual WebView2 Browser
            </button>
          </div>

          {/* Interactive Window Body */}
          <div className="p-6 sm:p-8 min-h-[340px] flex flex-col justify-between">
            {activeTab === 'chat' && (
              <div className="space-y-4 animate-in fade-in">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-md bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs sm:text-sm shadow-md">
                    <p>How do I prevent memory leaks when handling WASAPI loopback audio in C# WPF?</p>
                    <span className="text-[10px] text-purple-200 mt-1 block text-right font-mono">15:30</span>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="max-w-lg bg-[#1a1a24] border border-white/[0.08] text-zinc-100 rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm space-y-2.5 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Gemini 2.5 Flash</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-xs">
                      Always implement <code className="text-purple-300 font-mono bg-purple-950/40 px-1 py-0.5 rounded">IDisposable</code> on your <code className="text-cyan-300 font-mono">WasapiLoopbackCapture</code> instance, unsubscribe from <code className="text-amber-300 font-mono">DataAvailable</code> before stopping, and flush your audio circular buffer:
                    </p>
                    <div className="bg-[#0e0e14] rounded-xl p-3 border border-white/[0.06] font-mono text-[11px] text-zinc-300 overflow-x-auto">
                      <span className="text-purple-400">capture</span>.DataAvailable -= OnAudioDataAvailable;<br />
                      <span className="text-purple-400">capture</span>.StopRecording();<br />
                      <span className="text-purple-400">capture</span>.Dispose();
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'snip' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Camera className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Stealth Region Screen Snipping</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Press <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/20 rounded font-mono text-[11px] text-purple-300">Ctrl + Shift + S</kbd> to freeze and snip any region of your screen. The snip is uploaded to Cloudinary and instantly analyzed by Gemini.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'browser' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Layers className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Dual Engine WebView2 Multi-Tab</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Browse documentation, StackOverflow, or external dashboards right inside your translucent overlay with hardware audio loopback and 1-click prompt fast-deck.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Hotkey Badges */}
            <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-semibold">GLOBAL HOTKEYS:</span>
                <button
                  onClick={() => handleCopyHotkey('Ctrl+Shift+H')}
                  className="flex items-center gap-1 font-mono text-[11px] text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded-lg border border-purple-500/20 transition-colors"
                  title="Click to copy"
                >
                  <span>Ctrl + Shift + H (Vanish)</span>
                  {copiedHotkey === 'Ctrl+Shift+H' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                </button>

                <button
                  onClick={() => handleCopyHotkey('Ctrl+Shift+S')}
                  className="flex items-center gap-1 font-mono text-[11px] text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 transition-colors"
                  title="Click to copy"
                >
                  <span>Ctrl + Shift + S (Snip)</span>
                  {copiedHotkey === 'Ctrl+Shift+S' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                </button>
              </div>

              <div className="text-[11px] text-zinc-400 font-mono">
                Powered by Gemini 2.5 Flash
              </div>
            </div>
          </div>
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
            {/* MSIX Card */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Recommended Format
                  </span>
                  <span className="text-xs font-mono text-zinc-400">64.28 MB</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Store App Package (.msix)</h4>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  Official Windows Store signed package. Safe 1-click installation with clean updates and full trust verification.
                </p>
              </div>

              <a
                href="/downloads/Translucent.msix"
                download="Translucent.msix"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Translucent.msix</span>
              </a>
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
            <Link href="/admin" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">
              Admin Console
            </Link>
            <a href="#features" className="hover:text-white transition-colors">
              Features
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
