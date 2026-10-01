'use client';

import React, { useState, useEffect } from 'react';
import { AppConfig } from '@/types/admin';
import { api, getBaseApiUrl, setBaseApiUrl } from '@/services/api';
import { X, Save, Lock, Bot, CreditCard, Link as LinkIcon, HelpCircle, Server } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const [config, setConfig] = useState<AppConfig>({
    paymentUrl: '',
    supportContact: '',
    googleClientId: '',
    downloadUrl: '',
    telegramBotUsername: '',
    telegramUpiId: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomApiUrl(getBaseApiUrl());
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPublicConfig();
      setConfig(data);
    } catch {
      onToast('Could not load current configuration from server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (customApiUrl.trim()) {
        setBaseApiUrl(customApiUrl.trim());
      }

      await api.updateSettings({
        ...config,
        ...(newPassword.trim().length >= 6 ? { newPassword: newPassword.trim() } : {}),
      });

      onToast('System settings updated successfully!', 'success');
      setNewPassword('');
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
      onToast(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.1] bg-[#141419] p-6 shadow-2xl shadow-purple-950/40 my-8">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="font-semibold text-white text-base">Global System Settings</h3>
            <p className="text-xs text-zinc-400">Configure licensing, payment bot, and application links</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-400">
            <span className="inline-block animate-spin mr-2">⏳</span> Loading configuration...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Backend API URL */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-purple-400" />
                Backend Server URL
              </label>
              <input
                type="text"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                placeholder="http://localhost:3000 or https://translucent-livid.vercel.app"
                className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">The URL where the Express + Supabase backend is hosted.</p>
            </div>

            {/* Telegram Bot Username & UPI ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  Telegram Bot
                </label>
                <input
                  type="text"
                  value={config.telegramBotUsername}
                  onChange={(e) => setConfig({ ...config, telegramBotUsername: e.target.value })}
                  placeholder="TranslucentPayBot"
                  className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  Telegram UPI ID
                </label>
                <input
                  type="text"
                  value={config.telegramUpiId}
                  onChange={(e) => setConfig({ ...config, telegramUpiId: e.target.value })}
                  placeholder="rohit.1604@superyes"
                  className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Download URL & Google OAuth Client ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                  Client Download URL
                </label>
                <input
                  type="text"
                  value={config.downloadUrl}
                  onChange={(e) => setConfig({ ...config, downloadUrl: e.target.value })}
                  placeholder="/downloads/Translucent.exe"
                  className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                  Support Contact
                </label>
                <input
                  type="text"
                  value={config.supportContact}
                  onChange={(e) => setConfig({ ...config, supportContact: e.target.value })}
                  placeholder="support@translucent.ai"
                  className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Google Client ID */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Google OAuth Client ID</label>
              <input
                type="text"
                value={config.googleClientId}
                onChange={(e) => setConfig({ ...config, googleClientId: e.target.value })}
                className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Change Admin Password */}
            <div className="pt-2 border-t border-white/[0.08]">
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Change Admin Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep existing password"
                className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Minimum 6 characters. Affects future admin logins.</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-950/40 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
