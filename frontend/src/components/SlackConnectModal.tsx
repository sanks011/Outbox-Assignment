import React, { useState } from 'react';
import { Slack, X, CheckCircle2, AlertTriangle, Send, Link, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { SlackStatus } from '../types/index.js';

interface SlackConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackStatus?: SlackStatus;
  onStatusUpdated: () => void;
}

export const SlackConnectModal: React.FC<SlackConnectModalProps> = ({
  isOpen,
  onClose,
  slackStatus,
  onStatusUpdated,
}) => {
  if (!isOpen) return null;

  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const { url } = await apiClient.getSlackOAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Slack OAuth app credentials not yet configured in .env. You can connect using Incoming Webhook URL below.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;

    try {
      setLoading(true);
      setMessage(null);
      const res = await apiClient.saveSlackWebhook(webhookUrl.trim());
      setMessage({ type: 'success', text: res.message });
      setWebhookUrl('');
      onStatusUpdated();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save webhook URL',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Slack notifications?')) return;
    try {
      setLoading(true);
      await apiClient.disconnectSlack();
      setMessage({ type: 'success', text: 'Slack disconnected successfully.' });
      onStatusUpdated();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to disconnect Slack' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestAlert = async () => {
    try {
      setTestSending(true);
      setMessage(null);
      const res = await apiClient.triggerTestSlackAlert('oliver.brown@domain.io', 50);
      setMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.response?.data?.error || 'Failed to send test alert. Is your webhook valid?',
      });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A154B] flex items-center justify-center text-white">
              <Slack className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Slack Rate Limit Alerts
              </h3>
              <p className="text-xs text-gray-400">
                Live alerts triggered the moment an hourly sender quota is exceeded
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Current Connection Status */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
              <span>Status:</span>
              {slackStatus?.isConnected ? (
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  Connected
                </span>
              ) : (
                <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full text-[11px]">
                  Not Connected
                </span>
              )}
            </div>
            {slackStatus?.isConnected && (
              <div className="text-[11px] text-gray-500 mt-1">
                Workspace: <span className="font-medium text-gray-800">{slackStatus.teamName}</span>
                {slackStatus.channel && ` | Channel: #${slackStatus.channel}`}
              </div>
            )}
          </div>

          {slackStatus?.isConnected && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={testSending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testSending ? 'Sending...' : 'Test Alert'}</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                title="Disconnect"
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Option A: Slack OAuth Button */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700">Option 1: Real OAuth Authorize Flow</div>
          <button
            type="button"
            onClick={handleOAuthConnect}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#4A154B] hover:bg-[#3F113F] text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            <Slack className="w-4 h-4" />
            <span>Connect Slack via OAuth</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="text-[11px] text-gray-400">or</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        {/* Option B: Direct Incoming Webhook */}
        <form onSubmit={handleSaveWebhook} className="space-y-3">
          <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-gray-500" />
            <span>Option 2: Direct Incoming Webhook URL</span>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-500 text-gray-800"
            />
            <button
              type="submit"
              disabled={loading || !webhookUrl.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Paste any Slack webhook to receive instant live rate-limit alert notifications during your demo.
          </p>
        </form>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
