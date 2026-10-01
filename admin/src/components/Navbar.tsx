'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Settings, LogOut, ShieldCheck, ExternalLink, Laptop } from 'lucide-react';
import { getBaseApiUrl } from '@/services/api';

interface NavbarProps {
  onRefresh: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  onOpenSettings,
  onLogout,
  isRefreshing,
}) => {
  const [apiUrl, setApiUrl] = useState<string>('http://localhost:3000');

  useEffect(() => {
    setApiUrl(getBaseApiUrl());
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#0c0c10]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/25 border border-purple-400/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">Translucent</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
                Admin Console
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[200px]" title={apiUrl}>
                  {apiUrl.replace(/^https?:\/\//, '')}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
            title="Open Landing / Client Download Page"
          >
            <Laptop className="w-3.5 h-3.5 text-zinc-400" />
            <span>Store / App</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all disabled:opacity-50"
            title="Refresh Users & Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all"
            title="Global System Settings"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400 hover:text-purple-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <div className="h-5 w-px bg-white/[0.08] mx-1"></div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
            title="Sign out of Admin Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
