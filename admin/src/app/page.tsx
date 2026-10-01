'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminStats, AdminUser, ToastMessage } from '@/types/admin';
import { api, getAdminToken, removeAdminToken } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { StatsOverview } from '@/components/StatsOverview';
import { UserTable } from '@/components/UserTable';
import { ApproveModal } from '@/components/ApproveModal';
import { SettingsModal } from '@/components/SettingsModal';
import { LoginView } from '@/components/LoginView';
import { ToastContainer } from '@/components/Toast';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserForApproval, setSelectedUserForApproval] = useState<AdminUser | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const [statsData, usersData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getUsers().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setUsers(usersData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      if (msg.includes('expired') || msg.includes('Unauthorized')) {
        setIsAuthenticated(false);
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setIsAuthenticated(true);
      loadData();
    } else {
      setIsAuthenticated(false);
    }
  }, [loadData]);

  // Periodic polling every 45s if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadData]);

  const handleLogout = () => {
    removeAdminToken();
    setIsAuthenticated(false);
    setStats(null);
    setUsers([]);
    addToast('Signed out successfully', 'info');
  };

  const handleApproveConfirm = async (durationDays: number, plan: string, notes?: string) => {
    if (!selectedUserForApproval) return;
    try {
      const res = await api.approveUser(selectedUserForApproval.id, { durationDays, plan, notes });
      addToast(`✓ Activated subscription for ${selectedUserForApproval.email}`, 'success');
      // Update local user state immediately
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserForApproval.id ? res.user : u))
      );
      // Reload stats
      api.getStats().then(setStats).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleRevoke = async (user: AdminUser) => {
    if (!window.confirm(`Revoke subscription for ${user.email}? This will immediately lock their client features.`)) {
      return;
    }

    try {
      const res = await api.revokeUser(user.id);
      addToast(`✕ Subscription revoked for ${user.email}`, 'info');
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
      api.getStats().then(setStats).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Revoke failed';
      addToast(msg, 'error');
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Permanently delete ${user.email} from the database? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteUser(user.id);
      addToast(`🗑️ User ${user.email} deleted`, 'info');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      api.getStats().then(setStats).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      addToast(msg, 'error');
    }
  };

  // Initial loading splash
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#09090c] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <span className="text-2xl animate-spin text-purple-500">⚡</span>
          <p className="text-xs uppercase tracking-widest font-mono text-zinc-500">Initializing Translucent Console...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> show login view
  if (!isAuthenticated) {
    return (
      <>
        <LoginView
          onLoginSuccess={() => {
            setIsAuthenticated(true);
            loadData();
          }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090c] text-white flex flex-col">
      {/* Navbar */}
      <Navbar
        onRefresh={() => loadData(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Stats Overview */}
        <StatsOverview stats={stats} isLoading={isLoading && !stats} />

        {/* User Management Table */}
        <UserTable
          users={users}
          isLoading={isLoading}
          onApprove={(user) => setSelectedUserForApproval(user)}
          onRevoke={handleRevoke}
          onDelete={handleDelete}
          onToast={addToast}
        />
      </main>

      {/* Modals & Toasts */}
      <ApproveModal
        user={selectedUserForApproval}
        isOpen={Boolean(selectedUserForApproval)}
        onClose={() => setSelectedUserForApproval(null)}
        onConfirm={handleApproveConfirm}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onToast={addToast}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
