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
    overQuotaFree: number;
  };
  billing: {
    stripeConfigured: boolean;
    mrr: number | null;
    activeSubscriptions: number | null;
    pastDueSubscriptions: number | null;
    planCounts: { free: number; pro: number; power: number } | null;
    recentEvents: Array<{
      id: string;
      type: string;
      createdAt: number;
      uid: string | null;
      email: string | null;
      plan: string | null;
    }>;
    message: string;
  };
  flags: { open: number };
  support: {
    open: number;
    recentOpenTickets: Array<{
      id: string;
      uid: string;
      email: string | null;
      messagePreview: string;
      createdAt: unknown;
    }>;
  };
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
  usageMonth: {
    aiCalls: number;
    cloudSttChunks: number;
    cloudSttMinutes: number;
  };
  overQuota: boolean;
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
  usageMonth: {
    month: string;
    aiCalls: number;
    cloudSttChunks: number;
    cloudSttMinutes: number;
    limits: {
      aiCallsPerMonth: number | null;
      cloudSttMinutesPerMonth: number | null;
    };
    overQuota: boolean;
  };
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

export type AdminAuditEntry = {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetUid?: string | null;
  targetEmail?: string | null;
  reasonCode?: string;
  reasonText?: string;
  referenceId?: string;
  createdAtMs?: number;
  snapshot?: Record<string, unknown>;
};

export type RetentionPoint = {
  day: string;
  signups: number;
  activeUsers: number;
};

export type AdminConfigResponse = {
  adminEmails: string[];
  envAdminEmails: string[];
  adminIpAllowlist: string[];
  envIpAllowlist: string;
};

export type AdminOrg = {
  id: string;
  name: string;
  plan: string;
  seatLimit: number;
  memberCount: number;
  createdAtMs?: number;
};

export type AdminClientError = {
  id: string;
  uid?: string;
  email?: string | null;
  message: string;
  stack?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  route?: string | null;
  createdAtMs?: number;
};
