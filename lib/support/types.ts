export type UserSupportTicket = {
  id: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};
