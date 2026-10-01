'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Laptop,
  CreditCard,
  AlertCircle,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  status: string;
  plan: string;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState(false);

  // Extract query parameters, including fallback to OAuth state param
  const rawState = searchParams.get('state') || '';
  let desktopPort = searchParams.get('port') || '50002';
  let deviceId = searchParams.get('deviceId') || '';
  let deviceName = searchParams.get('deviceName') || 'Windows PC';
  let sessionId = searchParams.get('sessionId') || '';

  if (rawState) {
    const portMatch = rawState.match(/port=(\d+)/);
    if (portMatch) desktopPort = portMatch[1];
    const devMatch = rawState.match(/deviceId=([^&]+)/);
    if (devMatch) deviceId = decodeURIComponent(devMatch[1]);
    const nameMatch = rawState.match(/deviceName=([^&]+)/);
    if (nameMatch) deviceName = decodeURIComponent(nameMatch[1]);
    const sessMatch = rawState.match(/sessionId=([^&]+)/);
    if (sessMatch) sessionId = decodeURIComponent(sessMatch[1]);
  }

  const code = searchParams.get('code');
  const authError = searchParams.get('error');

  useEffect(() => {
    if (authError) {
      setErrorMessage(`Google Sign-In canceled or denied: ${authError}`);
      return;
    }
    if (code) {
      handleExchangeCode(code);
    }
  }, [code, authError]);

  const handleExchangeCode = async (authCode: string) => {
    setIsLoading(true);
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await fetch('/api/auth/google/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode, redirectUri, deviceId, deviceName, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google authentication failed');

      // Clean URL params after successful OAuth code extraction
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      await completeSignIn(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const cfgRes = await fetch('/api/public/config');
      const cfg = await cfgRes.json();
      const clientId = cfg.googleClientId;

      if (!clientId) {
        throw new Error('Google Client ID is not configured on the server.');
      }

      const redirectUri = window.location.origin + window.location.pathname;
      const state = `port=${desktopPort}&deviceId=${encodeURIComponent(deviceId)}&deviceName=${encodeURIComponent(deviceName)}&sessionId=${encodeURIComponent(sessionId)}`;
      const oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=openid%20email%20profile` +
        `&state=${encodeURIComponent(state)}` +
        `&prompt=select_account`;

      window.location.href = oauthUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not launch Google Sign-In';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const handleDirectAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || email.split('@')[0],
          deviceId,
          deviceName,
          sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign-In failed');
      await completeSignIn(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-In failed';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const completeSignIn = async (data: { token: string; user: AuthUser }) => {
    setUser(data.user);
    setAuthToken(data.token);

    // Auto-copy token to clipboard for seamless VMware / remote handoff
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && data.token) {
        await navigator.clipboard.writeText(data.token);
        setCopiedToken(true);
      }
    } catch {}

    // 1. Post to cloud session store so VMware, remote desktops, and cross-device apps pick it up automatically
    if (sessionId) {
      try {
        fetch('/api/auth/session-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            token: data.token,
            user: data.user,
          }),
        }).catch(() => {});
      } catch {}
    }

    // 2. Silently attempt local loopback in the background (works when browser is local)
    const callbackUrl = `http://127.0.0.1:${desktopPort}/callback/?token=${encodeURIComponent(
      data.token
    )}&email=${encodeURIComponent(data.user.email)}&name=${encodeURIComponent(
      data.user.name
    )}&status=${encodeURIComponent(data.user.status)}&deviceId=${encodeURIComponent(
      deviceId
    )}&deviceName=${encodeURIComponent(deviceName)}`;

    try {
      fetch(callbackUrl, { mode: 'no-cors' }).catch(() => {});
    } catch {}

    try {
      const img = new Image();
      img.src = callbackUrl;
    } catch {}

    // NOTE: We deliberately DO NOT force `window.location.href = callbackUrl`.
    // Top-level redirection to 127.0.0.1 causes ERR_CONNECTION_REFUSED when running inside VMware or remote browsers!
  };

  const handleCopyToken = () => {
    if (!authToken) return;
    navigator.clipboard.writeText(authToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  return (
    <div className="w-full max-w-md relative z-10">
      <div className="rounded-3xl border border-white/[0.08] bg-[#121217]/90 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center">
        {/* Logo Badge */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/25 mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>

        {user ? (
          /* Success Screen */
          <div className="space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Successfully Signed In!</h2>
            <p className="text-xs text-zinc-400">
              Your Translucent license is connected. You can safely return to the desktop app.
            </p>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">User:</span>
                <span className="text-white font-semibold">{user.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Email:</span>
                <span className="text-zinc-300 font-mono">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Status:</span>
                <span
                  className={`capitalize font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    user.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {user.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Device:</span>
                <span className="text-purple-300 font-mono">{deviceName}</span>
              </div>
            </div>

            {/* Cloud & VMware Handoff Confirmation */}
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200 text-left flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cloud session sync active. Returning to your Windows app automatically.</span>
            </div>

            {/* Manual Token Copy Button (Safe for VMware / Hyper-V / Remote Desktops) */}
            {authToken && (
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleCopyToken}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  {copiedToken ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-purple-400" />
                  )}
                  <span>{copiedToken ? '✓ Token Copied to Clipboard!' : '📋 Copy Token (For VMware / Manual Login)'}</span>
                </button>
                <p className="text-[11px] text-zinc-400">
                  Using VMware? Click above to copy, then in Translucent desktop click <strong>Paste Token</strong>.
                </p>
              </div>
            )}

            {user.status !== 'active' && (
              <Link
                href={`/pay?userId=${user.id}&email=${encodeURIComponent(user.email)}`}
                className="mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-950/40 transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span>Activate Pro License (₹99)</span>
              </Link>
            )}
          </div>
        ) : (
          /* Sign-In Form */
          <>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to Translucent</h1>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              Connect your Google account to sync your software license &amp; cloud storage
            </p>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-left animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5 text-zinc-500 text-xs uppercase tracking-wider">
              <span className="flex-1 h-px bg-white/[0.08]" />
              <span>or direct email</span>
              <span className="flex-1 h-px bg-white/[0.08]" />
            </div>

            {/* Direct Email Form */}
            <form onSubmit={handleDirectAuth} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl bg-[#181820] border border-white/[0.08] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Your Name (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl bg-[#181820] border border-white/[0.08] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-semibold text-white shadow-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Verifying...' : 'Sign In with Email'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Device Info */}
            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-zinc-400">
              <Laptop className="w-3.5 h-3.5 text-zinc-500" />
              <span>Bound to: <strong className="text-zinc-200">{deviceName}</strong></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-purple-500/30 selection:text-purple-200 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Suspense fallback={<div className="text-zinc-500 text-xs">Loading sign-in...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
