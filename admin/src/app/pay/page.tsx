'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Send,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  User,
  AlertCircle
} from 'lucide-react';

function PayContent() {
  const searchParams = useSearchParams();
  const rawEmail = searchParams.get('email') || '';
  const rawUserId = searchParams.get('userId') || '';

  const [upiId, setUpiId] = useState('rohit.1604@superyes');
  const [telegramBot, setTelegramBot] = useState('TranslucentPayBot');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrCode, setUtrCode] = useState('');
  const [utrStatus, setUtrStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/public/config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg.telegramUpiId) setUpiId(cfg.telegramUpiId);
        if (cfg.telegramBotUsername) setTelegramBot(cfg.telegramBotUsername.replace(/^@/, ''));
      })
      .catch(() => {});
  }, []);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrCode.trim()) return;

    setIsSubmitting(true);
    setUtrStatus(null);

    try {
      const res = await fetch('/api/payment/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utr: utrCode.trim(),
          email: rawEmail,
          userId: rawUserId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUtrStatus({
          message: 'Payment verification submitted! Return to Translucent and click Check Status.',
          isError: false,
        });
        setUtrCode('');
      } else {
        setUtrStatus({
          message: data.error || 'Failed to submit payment details.',
          isError: true,
        });
      }
    } catch {
      setUtrStatus({
        message: 'Payment submitted! Verification in progress. Please check Translucent in a few minutes.',
        isError: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build Telegram deep link
  const startPayload = rawUserId
    ? `sub_${rawUserId}`
    : rawEmail
    ? `sub_${rawEmail.replace(/[@.]/g, '_')}`
    : '';
  const telegramUrl = `https://t.me/${telegramBot}${startPayload ? `?start=${startPayload}` : ''}`;

  return (
    <div className="w-full max-w-lg relative z-10">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Translucent</span>
      </Link>

      {/* Main Payment Card */}
      <div className="rounded-3xl border border-white/[0.1] bg-[#121217]/90 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center">
        {/* Badge & Title */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/25 mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 mb-3">
          ⭐ Pro Lifetime Access
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Unlock Translucent Pro
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
          Unlimited AI screen snipping, meeting loopback audio, dual browser tabs, and lifetime updates.
        </p>

        {/* Target Account Pill if opened with query parameters */}
        {rawEmail && (
          <div className="mt-4 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">
                  Activating For
                </div>
                <div className="text-xs text-white font-mono truncate font-bold">
                  {rawEmail}
                </div>
              </div>
            </div>
            <div className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30 shrink-0">
              Ready to Link
            </div>
          </div>
        )}

        {/* Pricing Highlight */}
        <div className="mt-6 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">One-Time Price</span>
            <span className="text-xs text-emerald-400 font-medium">Zero recurring subscriptions</span>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-white font-mono">₹99</span>
            <span className="text-xs text-zinc-500 line-through ml-2">₹499</span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#181822] border border-white/[0.08] mb-6">
          <div className="w-48 h-48 rounded-xl bg-white p-2.5 shadow-lg mb-4 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/qr_payment.png"
              alt="UPI Payment QR Code"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-2">
            <QrCode className="w-4 h-4 text-purple-400" />
            Scan with Any UPI App (GPay, PhonePe, Paytm)
          </span>

          {/* Copy UPI ID */}
          <div className="flex items-center gap-2 mt-2">
            <div className="font-mono text-xs text-purple-200 bg-purple-950/50 px-3 py-1.5 rounded-xl border border-purple-500/30">
              {upiId}
            </div>
            <button
              onClick={handleCopyUpi}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-sm cursor-pointer"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* 3 Step Activation Guide */}
        <div className="text-left text-xs text-zinc-300 space-y-3 mb-6 bg-white/[0.02] p-5 rounded-2xl border border-white/[0.06]">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 text-purple-300">
            ⚡ Instant 1-Minute Activation:
          </h4>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</div>
            <p>Pay <strong className="text-white">₹99</strong> via QR code above or UPI ID <code className="text-purple-300 font-mono">{upiId}</code>.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</div>
            <p>Tap the Telegram button below or enter your 12-digit UTR below.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</div>
            <p>Return to the Translucent desktop app and click <strong className="text-emerald-400">🔄 Check Status</strong> to unlock instantly!</p>
          </div>
        </div>

        {/* Telegram Bot Button */}
        <a
          href={telegramUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-indigo-950/50 hover:scale-[1.01] active:scale-[0.99] transition-all mb-4"
        >
          <Send className="w-4 h-4" />
          <span>Verify via @{telegramBot} on Telegram</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>

        {/* Optional UTR Submission Form */}
        <form onSubmit={handleUtrSubmit} className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-left">
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
            Or submit 12-digit UPI Transaction ID (UTR)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={utrCode}
              onChange={(e) => setUtrCode(e.target.value)}
              placeholder="e.g. 427819284729"
              className="flex-1 rounded-xl bg-[#181822] border border-white/[0.08] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              type="submit"
              disabled={isSubmitting || !utrCode.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {utrStatus && (
            <div
              className={`mt-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                utrStatus.isError
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}
            >
              {utrStatus.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{utrStatus.message}</span>
            </div>
          )}
        </form>

        {/* Footer note */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center text-[11px] text-zinc-500">
          Need support? Contact <a href="mailto:support@translucent.ai" className="text-purple-400 hover:underline">support@translucent.ai</a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-purple-500/30 selection:text-purple-200 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px]" />
      </div>

      <Suspense fallback={<div className="text-zinc-500 text-xs">Loading payment details...</div>}>
        <PayContent />
      </Suspense>
    </div>
  );
}
