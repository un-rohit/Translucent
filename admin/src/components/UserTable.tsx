'use client';

import React, { useState, useMemo } from 'react';
import { AdminUser } from '@/types/admin';
import {
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Laptop,
  Copy,
  Check,
  Calendar,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface UserTableProps {
  users: AdminUser[];
  isLoading: boolean;
  onApprove: (user: AdminUser) => void;
  onRevoke: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type FilterStatus = 'all' | 'active' | 'pending' | 'expired' | 'revoked';

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  onApprove,
  onRevoke,
  onDelete,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [copiedDevId, setCopiedDevId] = useState<string | null>(null);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    return {
      all: users.length,
      active: users.filter((u) => u.status === 'active').length,
      pending: users.filter((u) => u.status === 'pending').length,
      expired: users.filter((u) => u.status === 'expired').length,
      revoked: users.filter((u) => u.status === 'revoked').length,
    };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Status filter
      if (activeFilter !== 'all' && u.status !== activeFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const emailMatch = u.email?.toLowerCase().includes(q);
        const nameMatch = u.name?.toLowerCase().includes(q);
        const deviceMatch = u.active_device_id?.toLowerCase().includes(q) || u.active_device_name?.toLowerCase().includes(q);
        const planMatch = u.plan?.toLowerCase().includes(q);
        if (!emailMatch && !nameMatch && !deviceMatch && !planMatch) {
          return false;
        }
      }

      return true;
    });
  }, [users, activeFilter, searchQuery]);

  const handleCopyDeviceId = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(deviceId);
    setCopiedDevId(deviceId);
    onToast('Hardware Device ID copied to clipboard', 'info');
    setTimeout(() => {
      setCopiedDevId(null);
    }, 2000);
  };

  const getStatusBadge = (status: AdminUser['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            Pending
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Revoked
          </span>
        );
      default:
        return null;
    }
  };

  const getPlanBadge = (plan: string) => {
    if (plan === 'lifetime') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/30">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Lifetime
        </span>
      );
    }
    if (plan === 'pro') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Pro
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
        {plan || 'Basic'}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121217]/90 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Search & Tabs Header */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'active', 'pending', 'expired', 'revoked'] as FilterStatus[]).map((tab) => {
            const count = counts[tab];
            const isSelected = activeFilter === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                    : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05]'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, name, hardware device ID..."
            className="w-full rounded-xl bg-[#181820] border border-white/[0.08] pl-9.5 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0e0e13] text-zinc-400 uppercase tracking-wider text-[10px] font-semibold border-b border-white/[0.06]">
            <tr>
              <th className="py-3 px-4 sm:px-5">User Account</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Bound Device</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Expiration</th>
              <th className="py-3 px-4">Registered</th>
              <th className="py-3 px-4 sm:px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="inline-block animate-spin text-xl text-purple-400">⏳</span>
                    <p className="text-xs font-medium">Loading user records from database...</p>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400">No users found matching filter</p>
                    <p className="text-xs text-zinc-600">Try changing your search terms or filter selection</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const initial = (u.name || u.email || 'U')[0].toUpperCase();
                const expDate = u.expires_at ? new Date(u.expires_at).toLocaleDateString() : 'Lifetime';
                const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
                const isCopied = copiedDevId === u.active_device_id;

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* User */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar_url}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full border border-white/[0.1] object-cover shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-700 to-indigo-800 flex items-center justify-center text-white font-bold text-xs shrink-0 border border-purple-400/20">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[180px] sm:max-w-[220px]">
                            {u.name || 'Anonymous User'}
                          </p>
                          <p className="text-zinc-400 text-[11px] truncate max-w-[180px] sm:max-w-[220px]">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(u.status)}
                    </td>

                    {/* Hardware Device */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.active_device_id || u.active_device_name ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-medium text-white text-xs">
                            <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{u.active_device_name || 'Windows PC'}</span>
                          </div>
                          {u.active_device_id && (
                            <button
                              onClick={(e) => handleCopyDeviceId(e, u.active_device_id!)}
                              className="group/btn flex items-center gap-1 font-mono text-[10px] text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/20 w-fit transition-colors"
                              title={`Hardware ID: ${u.active_device_id} (Click to copy)`}
                            >
                              <span>
                                {u.active_device_id.length > 12
                                  ? `${u.active_device_id.substring(0, 12)}...`
                                  : u.active_device_id}
                              </span>
                              {isCopied ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-60 group-hover/btn:opacity-100" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPlanBadge(u.plan)}
                    </td>

                    {/* Expiration */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-300 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>{expDate}</span>
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 text-[11px]">
                      {regDate}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.status !== 'active' ? (
                          <button
                            onClick={() => onApprove(u)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                            title="Activate subscription"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onRevoke(u)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all hover:scale-105 active:scale-95"
                            title="Revoke subscription"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        )}

                        <button
                          onClick={() => onDelete(u)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete user from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
