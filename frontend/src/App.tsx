import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext.js';
import { LoginModal } from './components/LoginModal.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { EmailList } from './components/EmailList.js';
import { EmailDetail } from './components/EmailDetail.js';
import { ComposeModal } from './components/ComposeModal.js';
import { SlackConnectModal } from './components/SlackConnectModal.js';
import { apiClient } from './api/client.js';
import { EmailJob, SlackStatus } from './types/index.js';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

  // Email Data
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Search State (Elasticsearch)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmailJob[] | null>(null);
  const [searchSource, setSearchSource] = useState<string | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);

  // Slack Status
  const [slackStatus, setSlackStatus] = useState<SlackStatus | undefined>(undefined);

  // Fetch emails
  const loadEmails = useCallback(async () => {
    try {
      setLoadingEmails(true);

      const [schedRes, sentRes, statsRes] = await Promise.all([
        apiClient.getScheduledEmails(1, 50),
        apiClient.getSentEmails(1, 50),
        apiClient.getDashboardStats(),
      ]);

      // If database is completely empty on very first install, seed sample demo data once
      if (schedRes.total === 0 && sentRes.total === 0 && !localStorage.getItem('reachinbox_seeded')) {
        localStorage.setItem('reachinbox_seeded', 'true');
        try {
          await apiClient.seedData();
          const [freshSched, freshSent] = await Promise.all([
            apiClient.getScheduledEmails(1, 50),
            apiClient.getSentEmails(1, 50),
          ]);
          setScheduledEmails(freshSched.emails);
          setSentEmails(freshSent.emails);
          setScheduledCount(freshSched.total);
          setSentCount(freshSent.total);
        } catch {
          // ignore
        }
      } else {
        setScheduledEmails(schedRes.emails);
        setSentEmails(sentRes.emails);
        setScheduledCount(statsRes.counts.scheduled);
        setSentCount(statsRes.counts.sent);
      }

      setSlackStatus(statsRes.slack);
    } catch (err) {
      console.error('Failed to load email data:', err);
    } finally {
      setLoadingEmails(false);
    }
  }, []);

  // Check URL query parameters (for Slack OAuth callback return)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_connected') === 'true') {
      setIsSlackModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Initial load and periodic polling for real-time queue visibility
  useEffect(() => {
    if (user) {
      loadEmails();
      const interval = setInterval(loadEmails, 5000);
      return () => clearInterval(interval);
    }
  }, [user, loadEmails]);

  // Elasticsearch live query effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchSource(undefined);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await apiClient.searchEmails(searchQuery.trim());
        setSearchResults(results.emails);
        setSearchSource(results.source);
      } catch (err) {
        console.error('Elasticsearch search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCancelEmail = async (id: string) => {
    try {
      await apiClient.cancelEmail(id);
      await loadEmails();
    } catch (err) {
      console.error('Failed to cancel email:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  // Display emails depending on active search vs tab
  const displayedEmails = searchResults !== null
    ? searchResults
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF9]">
      {/* Sidebar matching Figma Screenshot 2 */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedEmail(null);
          setSearchQuery('');
        }}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        slackStatus={slackStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={loadEmails}
          isSearching={isSearching}
          searchSource={searchSource}
        />

        {/* View switching: Detail View vs List View */}
        <div className="flex-1 overflow-y-auto">
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onDelete={handleCancelEmail}
            />
          ) : (
            <EmailList
              emails={displayedEmails}
              loading={loadingEmails}
              type={activeTab}
              onSelectEmail={(email) => setSelectedEmail(email)}
              onCancelEmail={handleCancelEmail}
            />
          )}
        </div>
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduledSuccess={() => {
          loadEmails();
          setActiveTab('scheduled');
        }}
      />

      {/* Slack Integration Modal */}
      <SlackConnectModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        slackStatus={slackStatus}
        onStatusUpdated={loadEmails}
      />
    </div>
  );
};
