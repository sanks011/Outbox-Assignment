import React from 'react';
import { X, Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: {
    filename: string;
    size?: string;
    url: string;
    isImage?: boolean;
    type?: string;
  } | null;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  isOpen,
  onClose,
  attachment,
}) => {
  if (!isOpen || !attachment) return null;

  const isImage =
    attachment.isImage ||
    attachment.type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(attachment.filename);

  const isPdf =
    attachment.type === 'application/pdf' ||
    /\.pdf$/i.test(attachment.filename);

  const isText =
    attachment.type?.startsWith('text/') ||
    /\.(txt|csv|json|md|log|js|ts|html)$/i.test(attachment.filename);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/70">
          <div className="flex items-center gap-3 overflow-hidden">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div className="truncate">
              <h3 className="text-sm font-semibold text-gray-900 truncate" title={attachment.filename}>
                {attachment.filename}
              </h3>
              {attachment.size && (
                <span className="text-[11px] text-gray-400">{attachment.size}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachment.url}
              download={attachment.filename}
              className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open</span>
            </a>

            <div className="w-[1px] h-4 bg-gray-200 mx-1" />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Preview Content */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 overflow-auto">
          {isImage ? (
            <img
              src={attachment.url}
              alt={attachment.filename}
              className="max-w-full max-h-full object-contain rounded-lg shadow-md"
            />
          ) : isPdf ? (
            <iframe
              src={attachment.url}
              title={attachment.filename}
              className="w-full h-full rounded-lg border border-gray-200 bg-white"
            />
          ) : isText ? (
            <iframe
              src={attachment.url}
              title={attachment.filename}
              className="w-full h-full rounded-lg border border-gray-200 bg-white p-4 font-mono text-xs"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 max-w-sm">
              <FileText className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-800 mb-1">{attachment.filename}</p>
              <p className="text-xs text-gray-500 mb-4">
                This file type cannot be previewed inline. Download to view.
              </p>
              <a
                href={attachment.url}
                download={attachment.filename}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download {attachment.size ? `(${attachment.size})` : 'File'}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
