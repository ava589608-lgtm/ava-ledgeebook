import React from 'react';
import { ExternalLink, X, FileText, Download } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  url: string | null;
  title: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  url,
  title,
  onClose,
}) => {
  if (!isOpen || !url) return null;

  const isPdf = url.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
            <h3 className="font-semibold text-stone-900 truncate text-base">{title || 'Receipt / Voucher'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
            >
              <span>Open in Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-stone-100 min-h-[300px]">
          {isPdf ? (
            <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-stone-200 max-w-sm">
              <FileText className="w-16 h-16 text-red-500 mx-auto mb-3" />
              <p className="font-medium text-stone-800 text-sm mb-4">PDF Document Receipt</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>View & Download PDF</span>
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt="Receipt voucher"
              className="max-h-[70vh] w-auto max-w-full rounded-lg shadow-sm object-contain"
              onError={(e) => {
                // If direct hotlinking is blocked by Drive CORS, show fallback box with drive link
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'text-center p-8 bg-white rounded-xl shadow-sm border border-stone-200 max-w-sm';
                  fallback.innerHTML = `
                    <div class="text-stone-600 mb-3 text-sm">Preview secured by Google Drive</div>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                      Open Receipt in Google Drive &rarr;
                    </a>
                  `;
                  parent.appendChild(fallback);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
