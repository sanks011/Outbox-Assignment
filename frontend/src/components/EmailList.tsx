import React from 'react';
import { Clock, Star, ExternalLink, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { EmailJob } from '../types/index.js';

interface EmailListProps {
  emails: EmailJob[];
  loading: boolean;
  type: 'scheduled' | 'sent';
  onSelectEmail: (email: EmailJob) => void;
  onCancelEmail?: (id: string) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  loading,
  type,
  onSelectEmail,
  onCancelEmail,
}) => {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 bg-gray-50 border border-gray-100 rounded-xl animate-pulse flex items-center px-4 gap-4"
          >
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
            <div className="w-24 h-5 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-4 bg-gray-200 rounded"></div>
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          {type === 'scheduled' ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {type === 'scheduled' ? 'No scheduled emails yet' : 'No sent emails yet'}
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          {type === 'scheduled'
            ? 'Emails queued for delayed delivery or scheduled for a future time will appear here.'
            : 'Emails processed and sent via Ethereal SMTP will be archived here with preview links.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 bg-white">
      {emails.map((email) => {
        const isScheduled = email.status === 'scheduled' || email.status === 'rescheduled';
        const isProcessing = email.status === 'processing';
        const isFailed = email.status === 'failed';

        // Format scheduled time matching Figma: "Tue 9:15:12 AM"
        const formattedDate = new Date(email.scheduledFor).toLocaleString('en-US', {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        // Strip HTML tags for clean snippet preview
        const plainBody = email.body ? email.body.replace(/<[^>]*>?/gm, ' ').trim() : '';

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#FAFAF9] transition-colors cursor-pointer group select-none text-xs"
          >
            {/* Recipient info: "To: John Smith" */}
            <div className="w-44 shrink-0 font-medium text-gray-900 truncate">
              <span className="text-gray-400 font-normal mr-1">To:</span>
              <span>{email.to.replace(/<.*?>/, '')}</span>
            </div>

            {/* Status Pill matching Figma Screenshot 2 */}
            <div className="shrink-0">
              {isScheduled && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2] text-[11px] font-medium whitespace-nowrap">
                  <Clock className="w-3 h-3 text-[#E65100]" />
                  <span>{formattedDate}</span>
                </span>
              )}

              {isProcessing && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium whitespace-nowrap">
                  <RotateCw className="w-3 h-3 text-blue-600 animate-spin" />
                  <span>Sending now</span>
                </span>
              )}

              {email.status === 'sent' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F3F4F6] text-[#374151] border border-gray-200 text-[11px] font-medium whitespace-nowrap">
                  Sent
                </span>
              )}

              {isFailed && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-medium whitespace-nowrap">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  Failed
                </span>
              )}
            </div>

            {/* Subject and Body snippet preview */}
            <div className="flex-1 truncate text-gray-600">
              <span className="font-semibold text-gray-900 mr-2">{email.subject}</span>
              <span className="text-gray-400 font-normal">-</span>
              <span className="text-gray-500 ml-2 font-normal truncate">{plainBody}</span>
            </div>

            {/* Actions & Ethereal preview link */}
            <div className="shrink-0 flex items-center gap-3">
              {email.etherealUrl && (
                <a
                  href={email.etherealUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View fake email in Ethereal"
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 border border-emerald-200"
                >
                  <span>Ethereal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {isScheduled && onCancelEmail && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Cancel this scheduled email?')) {
                      onCancelEmail(email.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[11px] text-red-600 hover:underline px-1 py-0.5"
                >
                  Cancel
                </button>
              )}

              {/* Star Icon (Figma Screenshot 2 right-aligned) */}
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-300 hover:text-amber-400 transition-colors p-1"
              >
                <Star className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
