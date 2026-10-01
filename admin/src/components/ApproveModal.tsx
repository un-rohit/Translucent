'use client';

import React, { useState } from 'react';
import { AdminUser } from '@/types/admin';
import { X, Check, Calendar, Shield, FileText } from 'lucide-react';

interface ApproveModalProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationDays: number, plan: string, notes?: string) => Promise<void>;
}

export const ApproveModal: React.FC<ApproveModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [durationDays, setDurationDays] = useState<number>(30);
  const [plan, setPlan] = useState<string>('pro');
  const [notes, setNotes] = useState<string>('Approved via Next.js Admin Portal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(durationDays, plan, notes);
      onClose();
    } catch {
      // handled by parent toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#141419] p-6 shadow-2xl shadow-purple-950/30">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Activate Subscription</h3>
              <p className="text-xs text-zinc-400 truncate max-w-[280px]" title={user.email}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Duration
            </label>
            <select
              value={durationDays}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDurationDays(val);
                if (val === 0) setPlan('lifetime');
                else if (plan === 'lifetime') setPlan('pro');
              }}
              className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            >
              <option value={7}>7 Days (Trial)</option>
              <option value={30}>30 Days (1 Month)</option>
              <option value={90}>90 Days (3 Months)</option>
              <option value={180}>180 Days (6 Months)</option>
              <option value={365}>365 Days (1 Year)</option>
              <option value={0}>Lifetime Access (No Expiry)</option>
            </select>
          </div>

          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Plan Type
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors capitalize"
            >
              <option value="pro">Pro Plan</option>
              <option value="lifetime">Lifetime VIP</option>
              <option value="basic">Basic Plan</option>
            </select>
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              Admin Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Telegram payment confirmed / UPI ID"
              className="w-full rounded-xl bg-[#1a1a22] border border-white/[0.1] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-zinc-500"
            />
          </div>

          {/* User info recap */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>Hardware Device:</span>
              <span className="text-zinc-200 font-mono">
                {user.active_device_name || (user.active_device_id ? 'Windows PC' : 'Not bound yet')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Account Status:</span>
              <span className="capitalize text-amber-400 font-medium">{user.status}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Activating...' : 'Confirm & Activate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
