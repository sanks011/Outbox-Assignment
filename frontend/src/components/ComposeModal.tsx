import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  ChevronDown,
  X,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
} from 'lucide-react';
import Papa from 'papaparse';
import { apiClient } from '../api/client.js';
import { SenderAccount } from '../types/index.js';
import { SendLaterPopover } from './SendLaterPopover.js';

import { useAuth } from '../context/AuthContext.js';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onScheduledSuccess,
}) => {
  if (!isOpen) return null;

  const { user } = useAuth();

  // Form State
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [selectedSender, setSelectedSender] = useState(user?.email || 'sender@reachinbox.ai');
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const [isAddingSender, setIsAddingSender] = useState(false);
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [newSenderName, setNewSenderName] = useState('');

  // Recipients
  const [toInput, setToInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [showAllRecipients, setShowAllRecipients] = useState(false);

  // Email content
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Scheduler Controls
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Fetch senders on mount
  useEffect(() => {
    async function loadSenders() {
      try {
        const list = await apiClient.getSenders();
        setSenders(list);
        if (list.length > 0) {
          const matching = list.find((s) => s.email === user?.email) || list.find((s) => s.isDefault) || list[0];
          setSelectedSender(matching.email);
        } else if (user?.email) {
          setSelectedSender(user.email);
        }
      } catch (err) {
        console.error('Failed to load senders:', err);
      }
    }
    loadSenders();
  }, [user]);

  const handleAddNewSender = async () => {
    if (!newSenderEmail.trim() || !newSenderEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      const created = await apiClient.addSender(newSenderEmail.trim(), newSenderName.trim());
      setSenders([created, ...senders]);
      setSelectedSender(created.email);
      setIsAddingSender(false);
      setNewSenderEmail('');
      setNewSenderName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add sender');
    }
  };

  // Add recipient on comma or Enter
  const handleToKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = toInput.trim().replace(',', '');
      if (trimmed && !recipients.includes(trimmed)) {
        setRecipients([...recipients, trimmed]);
        setToInput('');
      }
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  // CSV/List File Upload Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const detectedEmails: string[] = [];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

        results.data.forEach((row: any) => {
          const rowString = Array.isArray(row) ? row.join(' ') : JSON.stringify(row);
          const matches = rowString.match(emailRegex);
          if (matches) {
            matches.forEach((email) => {
              const cleaned = email.toLowerCase().trim();
              if (!detectedEmails.includes(cleaned) && !recipients.includes(cleaned)) {
                detectedEmails.push(cleaned);
              }
            });
          }
        });

        if (detectedEmails.length > 0) {
          setRecipients((prev) => [...prev, ...detectedEmails]);
          setError(null);
        } else {
          setError('No valid email addresses detected in uploaded file.');
        }
      },
      error: (err) => {
        setError(`Failed to parse file: ${err.message}`);
      },
    });

    // Reset input
    e.target.value = '';
  };

  // Rich Text Editor Commands
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  // Submit and Schedule
  const handleScheduleSubmit = async () => {
    // Collect all recipients
    const allRecipients = [...recipients];
    if (toInput.trim() && !allRecipients.includes(toInput.trim())) {
      allRecipients.push(toInput.trim());
    }

    if (allRecipients.length === 0) {
      setError('Please add at least one recipient email.');
      return;
    }

    if (!subject.trim()) {
      setError('Subject line is required.');
      return;
    }

    const htmlBody = editorRef.current?.innerHTML || body;
    if (!htmlBody.trim()) {
      setError('Email body is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiClient.scheduleEmails({
        from: selectedSender,
        to: allRecipients,
        subject,
        body: htmlBody,
        scheduledTime: scheduledDate ? scheduledDate.toISOString() : null,
        delayBetweenEmails,
        hourlyLimit,
        attachments,
      });

      onScheduledSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to schedule email');
    } finally {
      setLoading(false);
    }
  };

  // Visible recipient pills (first 3 pills, then +N badge matching Screenshot 5)
  const visiblePills = showAllRecipients ? recipients : recipients.slice(0, 3);
  const hiddenCount = recipients.length - 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[92vh] max-h-[850px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
        {/* Header Bar matching Figma Screenshot 4 & 5 */}
        <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold text-gray-900">
              Compose New Email
            </h2>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-3 relative">
            {/* Attachment paperclip with count badge */}
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg relative transition-colors"
              title="Add attachment"
            >
              <Paperclip className="w-4 h-4 text-emerald-600" />
              {attachments.length > 0 && (
                <span className="absolute 1 top-1 right-1 text-[10px] font-semibold text-gray-600">
                  {attachments.length}
                </span>
              )}
            </button>
            <input
              type="file"
              ref={attachmentInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAttachments([
                    ...attachments,
                    {
                      filename: file.name,
                      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                      url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80',
                    },
                  ]);
                }
              }}
            />

            {/* Clock Icon (Toggles Send Later Popover) */}
            <button
              type="button"
              onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
              className={`p-2 rounded-lg transition-colors ${
                scheduledDate
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
              title="Schedule Send Later"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Send Later Popover */}
            <SendLaterPopover
              isOpen={isSendLaterOpen}
              onClose={() => setIsSendLaterOpen(false)}
              currentTime={scheduledDate}
              onSelectTime={(date) => {
                setScheduledDate(date);
              }}
            />

            {/* Primary Send / Send Later Pill Button */}
            <button
              type="button"
              onClick={handleScheduleSubmit}
              disabled={loading}
              className="px-5 py-2 rounded-full border border-[#00A854] text-[#00A854] hover:bg-emerald-50 font-medium text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loading
                ? 'Scheduling...'
                : scheduledDate
                ? 'Send Later'
                : 'Send'}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-50 text-red-700 text-xs border-b border-red-100 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* From Selector matching Figma */}
          <div className="flex items-center gap-4 text-xs">
            <span className="w-20 text-gray-500 font-normal">From</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSenderDropdownOpen(!senderDropdownOpen)}
                className="px-3 py-1.5 bg-[#F4F6F5] hover:bg-[#EBEFEA] rounded-lg text-gray-800 font-medium flex items-center gap-2 border border-transparent"
              >
                <span>{selectedSender}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {senderDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 min-w-[260px]">
                  {senders.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedSender(s.email);
                        setSenderDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 text-gray-800 flex flex-col"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-[11px] text-gray-400">{s.email}</span>
                    </button>
                  ))}

                  <div className="border-t border-gray-100 p-2 mt-1">
                    {!isAddingSender ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingSender(true)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        + Add another sender email
                      </button>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="email"
                          value={newSenderEmail}
                          onChange={(e) => setNewSenderEmail(e.target.value)}
                          placeholder="sender@domain.com"
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none"
                        />
                        <input
                          type="text"
                          value={newSenderName}
                          onChange={(e) => setNewSenderName(e.target.value)}
                          placeholder="Display Name (optional)"
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none"
                        />
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingSender(false)}
                            className="px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewSender}
                            className="px-2.5 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-medium"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* To Input with Email Pills & Upload List Button */}
          <div className="flex items-start gap-4 text-xs pt-1">
            <span className="w-20 text-gray-500 font-normal pt-2">To</span>
            <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[38px] p-1.5 border-b border-gray-100">
              {/* Display Parsed Email Pills */}
              {visiblePills.map((email, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(idx)}
                    className="hover:text-red-600 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* +N Chip matching Screenshot 5 */}
              {!showAllRecipients && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecipients(true)}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-semibold hover:bg-emerald-100 transition-colors"
                >
                  +{hiddenCount}
                </button>
              )}

              {/* Input for typing manual recipient */}
              <input
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={handleToKeyDown}
                placeholder={recipients.length === 0 ? 'recipient@example.com' : 'Add more...'}
                className="flex-1 min-w-[140px] py-1 text-xs text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
              />

              {/* Upload List Button matching Figma */}
              <div className="ml-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subject Field */}
          <div className="flex items-center gap-4 text-xs pt-1">
            <span className="w-20 text-gray-500 font-normal">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 py-2 text-xs text-gray-800 placeholder:text-gray-400 outline-none border-b border-gray-100 bg-transparent"
            />
          </div>

          {/* Throttling & Rate-Limiting Controls matching Figma */}
          <div className="flex flex-wrap items-center gap-6 text-xs pt-2 text-gray-600">
            <div className="flex items-center gap-3">
              <span className="text-gray-500">Delay between 2 emails</span>
              <input
                type="number"
                min="0"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                className="w-16 px-2.5 py-1 text-xs text-center border border-gray-200 rounded-lg outline-none focus:border-emerald-500 font-mono text-gray-800"
              />
              <span className="text-gray-400 text-[11px]">sec</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-500">Hourly Limit</span>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                className="w-16 px-2.5 py-1 text-xs text-center border border-gray-200 rounded-lg outline-none focus:border-emerald-500 font-mono text-gray-800"
              />
              <span className="text-gray-400 text-[11px]">emails/hr</span>
            </div>

            {scheduledDate && (
              <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Scheduled for: {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {scheduledDate.toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => setScheduledDate(null)}
                  className="hover:text-red-600 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Rich Text Editor Container matching Figma Screenshot 4 & 5 */}
          <div className="pt-2">
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              {/* WYSIWYG Toolbar */}
              <div className="bg-[#F8FAF9] border-b border-gray-200 p-2 flex flex-wrap items-center gap-1 text-gray-600">
                <button
                  type="button"
                  onClick={() => executeCommand('undo')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('redo')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>

                <button
                  type="button"
                  onClick={() => executeCommand('bold')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('italic')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('underline')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('strikeThrough')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>

                <button
                  type="button"
                  onClick={() => executeCommand('justifyLeft')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('justifyCenter')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('justifyRight')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>

                <button
                  type="button"
                  onClick={() => executeCommand('insertOrderedList')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('insertUnorderedList')}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeCommand('formatBlock', '<blockquote>');
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Enter link URL:');
                    if (url) executeCommand('createLink', url);
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Insert Link"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeCommand('formatBlock', '<pre>');
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Editable Body Area */}
              <div
                ref={editorRef}
                contentEditable
                onInput={() => {
                  if (editorRef.current) {
                    setBody(editorRef.current.innerHTML);
                  }
                }}
                className="p-4 min-h-[220px] max-h-[300px] overflow-y-auto outline-none text-xs text-gray-800 leading-relaxed font-sans empty:before:content-['Type_Your_Reply...'] empty:before:text-gray-400"
              />
            </div>
          </div>

          {/* Attachments Card Preview Area (Bottom of Compose) */}
          {attachments.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-semibold text-gray-500">Attachments</span>
              <div className="flex flex-wrap gap-3">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="relative w-40 h-24 border border-gray-200 rounded-xl overflow-hidden group shadow-sm bg-gray-50"
                  >
                    <img src={att.url} alt={att.filename} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-white/90 p-1 text-[10px] truncate text-gray-700">
                      {att.filename}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
