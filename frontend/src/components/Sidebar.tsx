import React, { useState } from 'react';
import { Clock, Send, Plus, ChevronDown, LogOut, Radio, Slack, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { SlackStatus } from '../types/index.js';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  scheduledCount: number;
  sentCount: number;
  slackStatus?: SlackStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCompose,
  onOpenSlackModal,
  scheduledCount,
  sentCount,
  slackStatus,
}) => {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <aside className="w-64 border-r border-gray-100 bg-white flex flex-col h-screen shrink-0 select-none">
      {/* Top Logo - Figma ONB Branding */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-extrabold text-2xl tracking-tighter text-gray-900 font-mono">
            ONB
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
            Scheduler
          </span>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-5 py-2 relative">
        <button
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
        >
          <div className="flex items-center gap-3 overflow-hidden text-left">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={user?.name || 'User'}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/20"
            />
            <div className="truncate">
              <div className="text-xs font-semibold text-gray-900 truncate">
                {user?.name || 'Oliver Brown'}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {user?.email || 'oliver.brown@domain.io'}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        </button>

        {/* Profile Dropdown */}
        {profileDropdownOpen && (
          <div className="absolute top-full left-5 right-5 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30">
            <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-500">
              Signed in as <span className="font-medium text-gray-800">{user?.email}</span>
            </div>
            <button
              onClick={() => {
                setProfileDropdownOpen(false);
                logout();
              }}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Action Button: + Compose (Figma style green outline pill) */}
      <div className="px-5 py-4">
        <button
          type="button"
          onClick={onOpenCompose}
          className="w-full py-2.5 px-4 rounded-full border border-[#00A854] text-[#00A854] hover:bg-emerald-50 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Section: CORE */}
      <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-gray-400 tracking-wider">
            CORE
          </div>

          <nav className="space-y-1">
            {/* Scheduled Emails Nav Item */}
            <button
              type="button"
              onClick={() => onTabChange('scheduled')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'scheduled'
                  ? 'bg-[#E8F5E9] text-[#1B5E20]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <span>Scheduled</span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  activeTab === 'scheduled'
                    ? 'bg-emerald-200/60 text-emerald-900'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {scheduledCount}
              </span>
            </button>

            {/* Sent Emails Nav Item */}
            <button
              type="button"
              onClick={() => onTabChange('sent')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'bg-[#E8F5E9] text-[#1B5E20]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4" />
                <span>Sent</span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  activeTab === 'sent'
                    ? 'bg-emerald-200/60 text-emerald-900'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {sentCount}
              </span>
            </button>
          </nav>
        </div>

        {/* System & Integrations Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-gray-400 tracking-wider">
            INTEGRATIONS & QUEUES
          </div>

          <div className="space-y-1">
            {/* BullMQ Dashboard Link */}
            <a
              href="/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>BullMQ Board</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </a>

            {/* Slack Integration */}
            <button
              type="button"
              onClick={onOpenSlackModal}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Slack className="w-4 h-4 text-[#4A154B]" />
                <span>Slack Alerts</span>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  slackStatus?.isConnected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {slackStatus?.isConnected ? 'Connected' : 'Setup'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
        <span>ReachInbox Scheduler</span>
        <span className="font-mono text-[10px]">v1.0.0</span>
      </div>
    </aside>
  );
};
