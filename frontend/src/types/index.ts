export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
}

export interface SenderAccount {
  id?: string;
  email: string;
  name: string;
  isDefault?: boolean;
}

export interface EmailAttachment {
  filename: string;
  size: string;
  url: string;
}

export interface EmailJob {
  id: string;
  bullJobId: string;
  userId?: string | null;
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments?: string | null;
  status: 'scheduled' | 'rescheduled' | 'processing' | 'sent' | 'failed';
  scheduledFor: string;
  sentAt?: string | null;
  failedAt?: string | null;
  errorReason?: string | null;
  delaySeconds: number;
  hourlyLimit: number;
  etherealUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlackStatus {
  isConnected: boolean;
  teamName?: string | null;
  channel?: string | null;
  webhookConfigured: boolean;
}

export interface DashboardStats {
  counts: {
    scheduled: number;
    sent: number;
    failed: number;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
  system: {
    workerConcurrency: number;
    defaultDelayBetweenEmails: number;
    maxEmailsPerHourPerSender: number;
    elasticsearchOnline: boolean;
  };
  slack: SlackStatus;
}
