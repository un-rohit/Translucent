'use client';

import React from 'react';
import { AdminStats } from '@/types/admin';
import { Users, UserCheck, Clock, DollarSign, TrendingUp } from 'lucide-react';

interface StatsOverviewProps {
  stats: AdminStats | null;
  isLoading: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, isLoading }) => {
  const cards = [
    {
      title: 'Total Users',
      value: stats ? stats.totalUsers.toLocaleString() : '—',
      icon: Users,
      color: 'from-blue-500/20 via-blue-500/5 to-transparent',
      borderColor: 'border-blue-500/25',
      iconColor: 'text-blue-400',
      badge: 'All accounts',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Active PRO Users',
      value: stats ? stats.activeUsers.toLocaleString() : '—',
      icon: UserCheck,
      color: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      borderColor: 'border-emerald-500/25',
      iconColor: 'text-emerald-400',
      badge: stats && stats.totalUsers > 0 
        ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% conversion`
        : 'Active licenses',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Pending Approvals',
      value: stats ? stats.pendingUsers.toLocaleString() : '—',
      icon: Clock,
      color: 'from-amber-500/20 via-amber-500/5 to-transparent',
      borderColor: 'border-amber-500/25',
      iconColor: 'text-amber-400',
      badge: stats && stats.pendingUsers > 0 ? 'Action required' : 'Clear',
      badgeColor: stats && stats.pendingUsers > 0 
        ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' 
        : 'text-zinc-400 bg-zinc-800 border-zinc-700',
    },
    {
      title: 'Est. 30d Revenue',
      value: stats ? `$${stats.totalRevenue.toLocaleString()}` : '—',
      icon: DollarSign,
      color: 'from-purple-500/20 via-purple-500/5 to-transparent',
      borderColor: 'border-purple-500/25',
      iconColor: 'text-purple-400',
      badge: 'PRO Subscriptions',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-[#121217]/90 p-5 backdrop-blur-md shadow-lg transition-all duration-200 hover:translate-y-[-2px] hover:border-opacity-60`}
          >
            {/* Top gradient highlight */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} pointer-events-none opacity-50`} />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{card.title}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                    {isLoading ? (
                      <span className="inline-block w-16 h-7 bg-white/5 animate-pulse rounded" />
                    ) : (
                      card.value
                    )}
                  </h3>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] ${card.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="relative z-10 mt-4 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                <TrendingUp className="w-3 h-3" />
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
