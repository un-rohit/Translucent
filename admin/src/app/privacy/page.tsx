'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Check, Lock, Cpu, EyeOff } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-purple-500/30 selection:text-purple-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Main Card */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#121217]/90 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-6 mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25 mb-3">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Official Legal Document
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 font-mono">
              Last Updated: October 2026 • Translucent (Rohit Indsutries)
            </p>
          </div>

          <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">
            <p>
              Welcome to <strong className="text-white">Translucent</strong>. Your privacy and trust are our highest priorities. This Privacy Policy describes how Translucent collects, uses, and safeguards information when you use our Windows desktop application and related services.
            </p>

            {/* Section 1 */}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block"></span>
                1. Information We Do NOT Collect
              </h2>
              <p className="text-zinc-400 mb-3">
                Translucent is built from the ground up with a privacy-first, stealth architecture:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">No Keystroke Logging:</strong> We never log, store, or monitor your keystrokes. Global keyboard shortcuts are processed locally by Windows solely to toggle application visibility.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">No Background Screen Tracking:</strong> Translucent never monitors or records your screen in the background. Screen capture is initiated strictly on-demand by the user via the Snip tool.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">No Personal Data Selling:</strong> We do not sell, rent, or monetize your personal data to any third party or advertising broker.</span>
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block"></span>
                2. Information Processed Locally on Your Device
              </h2>
              <p className="text-zinc-400 mb-3">
                Core user preferences are cached locally in secure app storage on your computer:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>UI preferences (transparency level, window opacity, hotkey combinations, overlay geometry).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Embedded browser tab cookies and site data (managed securely within Microsoft WebView2).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Temporary offline cache stored under <code className="text-purple-300 font-mono">%LOCALAPPDATA%\InvisibleChat\history.json</code> for instant offline startup.</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block"></span>
                3. Artificial Intelligence &amp; Cloud Storage
              </h2>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
                <p>
                  <strong className="text-white">AI Vision &amp; Prompt Processing:</strong> When you interact with the AI assistant or analyze a screen snip, your specific prompt text or snippet image is securely transmitted via encrypted HTTPS (TLS 1.3) directly to the AI service provider API (Google Gemini). This data is processed in real time to generate responses and is not retained for unauthorized profiling.
                </p>
                <p>
                  <strong className="text-white">Cloud Storage:</strong> Conversations, screen snips, and attached files are optionally synchronized in the background to your encrypted Cloudinary storage so they restore across devices.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block"></span>
                4. Windows Capabilities &amp; Full Trust
              </h2>
              <p className="text-zinc-400">
                Translucent declares the <code className="text-emerald-400 font-mono">runFullTrust</code> capability in its Windows Store package. This capability is required strictly to:
              </p>
              <ul className="space-y-2 mt-3">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Render non-intrusive acrylic desktop overlay windows above other applications.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Register user-configured keyboard shortcuts (hotkeys) to summon or vanish the assistant.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Host the embedded browser container powered by Microsoft Edge WebView2.</span>
                </li>
              </ul>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block"></span>
                5. Contact Information
              </h2>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-zinc-300">
                <p><strong>Developer / Publisher:</strong> Rohit Indsutries</p>
                <p><strong>Email:</strong> <a href="mailto:support@translucent.ai" className="text-purple-400 hover:underline">support@translucent.ai</a></p>
                <p><strong>Official Website:</strong> <a href="https://translucent-livid.vercel.app" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">https://translucent-livid.vercel.app</a></p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-white/[0.08] text-center text-xs text-zinc-500">
            © 2026 Rohit Indsutries • Translucent. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
