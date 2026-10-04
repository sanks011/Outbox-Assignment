import React from 'react';
import { ArrowLeft, Star, Archive, Trash2, ChevronDown, Paperclip, ExternalLink } from 'lucide-react';
import { EmailJob, EmailAttachment } from '../types/index.js';

interface EmailDetailProps {
  email: EmailJob;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBack, onDelete }) => {
  // Parse attachments if JSON string
  let parsedAttachments: EmailAttachment[] = [];
  if (email.attachments) {
    try {
      parsedAttachments = JSON.parse(email.attachments);
    } catch {
      parsedAttachments = [];
    }
  }

  // Format sent/scheduled date
  const displayDate = email.sentAt
    ? new Date(email.sentAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : new Date(email.scheduledFor).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

  const senderInitial = email.from ? email.from.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() || 'A' : 'A';

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto">
      {/* Detail Header Bar matching Figma Screenshot 3 */}
      <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {email.subject}
          </h2>
        </div>

        {/* Top Right Action Icons: Star, Archive, Delete */}
        <div className="flex items-center gap-3 text-gray-400">
          <button className="p-1.5 hover:text-amber-500 hover:bg-gray-50 rounded-lg transition-colors">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Archive className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Delete this email record?')) {
                  onDelete(email.id);
                  onBack();
                }
              }}
              className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Profile"
            className="w-7 h-7 rounded-full object-cover"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 max-w-4xl space-y-6">
        {/* Sender Info Bar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Green Initial Avatar Circle */}
            <div className="w-10 h-10 rounded-full bg-[#00A854] text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {senderInitial}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>{email.from}</span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-700">
                <span>to me</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            {email.etherealUrl && (
              <a
                href={email.etherealUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium hover:bg-emerald-100 flex items-center gap-1"
              >
                <span>View in Ethereal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span>{displayDate}</span>
          </div>
        </div>

        {/* Email HTML / Rich Body Content */}
        <div
          className="prose prose-sm max-w-none text-gray-800 leading-relaxed pt-2"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {/* Attachments Section matching Figma Screenshot 3 */}
        {parsedAttachments.length > 0 && (
          <div className="pt-6 border-t border-gray-100 space-y-3">
            <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({parsedAttachments.length})</span>
            </div>

            <div className="flex flex-wrap gap-4">
              {parsedAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="w-48 bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="h-28 bg-gray-100 overflow-hidden relative">
                    <img
                      src={att.url}
                      alt={att.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-medium text-gray-800 truncate" title={att.filename}>
                      {att.filename}
                    </div>
                    <div className="text-[11px] text-gray-400">{att.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
