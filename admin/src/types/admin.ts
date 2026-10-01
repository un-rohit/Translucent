export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  plan: 'pro' | 'basic' | 'lifetime';
  active_device_id: string | null;
  active_device_name: string | null;
  created_at: string;
  expires_at: string | null;
  notes?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalRevenue: number;
}

export interface AppConfig {
  paymentUrl: string;
  supportContact: string;
  googleClientId: string;
  downloadUrl: string;
  telegramBotUsername: string;
  telegramUpiId: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
