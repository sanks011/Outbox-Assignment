import axios from 'axios';
import { User, EmailJob, SenderAccount, DashboardStats, SlackStatus } from '../types/index.js';

const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = {
  // Auth
  async getAuthConfig(): Promise<{ googleClientId: string | null; hasSlackWebhook: boolean; hasSlackOAuth: boolean }> {
    const res = await api.get('/auth/config');
    return res.data;
  },

  async loginWithEmail(email: string, password?: string): Promise<{ token: string; user: User }> {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('reachinbox_token', res.data.token);
    }
    return res.data;
  },

  async loginWithGoogle(credential?: string, userInfo?: any): Promise<{ token: string; user: User }> {
    const res = await api.post('/auth/google', { credential, userInfo });
    if (res.data.token) {
      localStorage.setItem('reachinbox_token', res.data.token);
    }
    return res.data;
  },

  async demoLogin(): Promise<{ token: string; user: User }> {
    const res = await api.post('/auth/demo');
    if (res.data.token) {
      localStorage.setItem('reachinbox_token', res.data.token);
    }
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout() {
    localStorage.removeItem('reachinbox_token');
  },

  // Emails
  async getScheduledEmails(page = 1, limit = 50): Promise<{ total: number; emails: EmailJob[] }> {
    const res = await api.get('/emails/scheduled', { params: { page, limit } });
    return res.data;
  },

  async getSentEmails(page = 1, limit = 50): Promise<{ total: number; emails: EmailJob[] }> {
    const res = await api.get('/emails/sent', { params: { page, limit } });
    return res.data;
  },

  async getEmailDetail(id: string): Promise<EmailJob> {
    const res = await api.get(`/emails/detail/${id}`);
    return res.data;
  },

  async searchEmails(query: string, status?: string): Promise<{ source: string; total: number; emails: EmailJob[] }> {
    const res = await api.get('/emails/search', { params: { q: query, status } });
    return res.data;
  },

  async cancelEmail(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  },

  async getSenders(): Promise<SenderAccount[]> {
    const res = await api.get('/emails/senders');
    return res.data;
  },

  async addSender(email: string, name?: string): Promise<SenderAccount> {
    const res = await api.post('/emails/senders', { email, name });
    return res.data;
  },

  async seedData(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/emails/seed');
    return res.data;
  },

  // Scheduler
  async scheduleEmails(payload: {
    from: string;
    to: string[];
    subject: string;
    body: string;
    scheduledTime?: string | null;
    delayBetweenEmails: number;
    hourlyLimit: number;
    attachments?: any[];
  }): Promise<{ success: boolean; count: number; jobs: any[] }> {
    const res = await api.post('/schedule', payload);
    return res.data;
  },

  // Slack
  async getSlackStatus(): Promise<SlackStatus> {
    const res = await api.get('/slack/status');
    return res.data;
  },

  async saveSlackWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/slack/webhook', { webhookUrl });
    return res.data;
  },

  async disconnectSlack(): Promise<{ success: boolean }> {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },

  async getSlackOAuthUrl(): Promise<{ url: string }> {
    const res = await api.get('/slack/oauth/start');
    return res.data;
  },

  async triggerTestSlackAlert(sender?: string, hourlyLimit?: number): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/slack/test-alert', { sender, hourlyLimit });
    return res.data;
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
};
