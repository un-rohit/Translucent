'use client';

import React, { useState } from 'react';
import { api, getBaseApiUrl, setBaseApiUrl } from '@/services/api';
import { ShieldCheck, Lock, ArrowRight, Eye, EyeOff, Server, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onToast }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getBaseApiUrl());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter the admin password');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      if (serverUrl.trim()) {
        setBaseApiUrl(serverUrl.trim());
      }
      await api.login(password);
      onToast('✓ Welcome back, Admin!', 'success');
      onLoginSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid admin password';
      setErrorMessage(msg);
      onToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#09090c] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl border border-white/[0.08] bg-[#121217]/85 p-8 shadow-2xl backdrop-blur-xl shadow-purple-950/30">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/25 mb-4">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Translucent Admin</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Secure subscription &amp; device licensing portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Enter administrator password"
                  autoFocus
                  className="w-full rounded-xl bg-[#181820] border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Server endpoint toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowServerConfig(!showServerConfig)}
                className="text-[11px] text-zinc-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                <Server className="w-3 h-3" />
                <span>{showServerConfig ? 'Hide Server URL' : 'Configure Server URL'}</span>
              </button>

              {showServerConfig && (
                <div className="mt-2 animate-in fade-in">
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full rounded-xl bg-[#181820] border border-white/[0.08] px-3 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Points to the Node.js / Express backend server.</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-purple-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In to Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center text-[11px] text-zinc-500">
            <span>Translucent Desktop Stealth Assistant • Built for Windows</span>
          </div>
        </div>
      </div>
    </div>
  );
};
