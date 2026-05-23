export type AdminDashboard = {
  users: { total: number; activeLast7d: number };
  usage: {
    today: {
      aiCalls: number;
      cloudSttChunks: number;
      meetings: number;
      activeUsers: number;
    };
    topCloudUsers: Array<{
      uid: string;
      email: string | null;
      plan: string;
      cloudSttChunks: number;
      aiCalls: number;
    }>;
  };
  billing: {
    stripeConfigured: boolean;
    mrr: number | null;
    activeSubscriptions: number | null;
    message: string;
  };
  flags: { open: number };
  support: { open: number };
};

export type AdminUserRow = {
  uid: string;
  email: string | null;
  disabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  role: string;
  plan: string;
  suspended: boolean;
  platform: string | null;
  usageToday: { aiCalls: number; cloudSttChunks: number };
};

export type AdminFlag = {
  id: string;
  uid?: string;
  day?: string;
  reason?: string;
  status?: string;
  cloudSttChunks?: number;
  createdAt?: unknown;
};

export type AdminUserDetail = {
  uid: string;
  email: string | null;
  disabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
  role: string;
  plan: string;
  suspended: boolean;
  platform: string | null;
  adminNotes: string;
  trialEndsAt: number | null;
  usageByDay: Array<{
    day: string;
    aiCalls: number;
    cloudSttChunks: number;
    meetings: number;
  }>;
};

export type AdminSupportTicket = {
  id: string;
  uid: string;
  email: string | null;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: unknown;
  updatedAt: unknown;
};
