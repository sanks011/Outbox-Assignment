import React, { useState } from 'react';
import { ArrowLeft, Star, Archive, Trash2, ChevronDown, Paperclip, ExternalLink, FileText, Eye } from 'lucide-react';
import { EmailJob, EmailAttachment } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { AttachmentPreviewModal } from './AttachmentPreviewModal.js';

interface EmailDetailProps {
  email: EmailJob;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBack, onDelete }) => {
  const { user } = useAuth();
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);

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
            src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
            alt={user?.name || "Profile"}
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
              {parsedAttachments.map((att, idx) => {
                const isImage =
                  (att as any).isImage ||
                  (att as any).type?.startsWith('image/') ||
                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename);

                return (
                  <div
                    key={idx}
                    onClick={() => setPreviewAttachment(att)}
                    className="w-48 bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                    title="Click to preview file"
                  >
                    <div className="h-28 bg-gray-100 overflow-hidden relative">
                      {isImage ? (
                        <img
                          src={att.url}
                          alt={att.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-2 text-gray-500 group-hover:bg-emerald-50/50 transition-colors">
                          <FileText className="w-8 h-8 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] uppercase font-bold text-gray-400 group-hover:text-emerald-700">
                            {att.filename.split('.').pop() || 'FILE'}
                          </span>
                        </div>
                      )}

                      {/* Hover Overlay with Preview Eye Icon */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                        <Eye className="w-4 h-4" />
                        <span className="text-[11px] font-medium">Preview</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-800 truncate" title={att.filename}>
                        {att.filename}
                      </div>
                      <div className="text-[11px] text-gray-400 shrink-0 ml-1">{att.size}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Attachment Full-Screen Preview Lightbox */}
      <AttachmentPreviewModal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        attachment={previewAttachment}
      />
    </div>
  );
};
