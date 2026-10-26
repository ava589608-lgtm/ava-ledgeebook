import React from 'react';
import { User } from 'firebase/auth';
import { FileSpreadsheet, FolderGit2, RefreshCw, LogOut, CheckCircle2, Cloud, Sparkles } from 'lucide-react';
import { SyncState } from '../types';

interface HeaderProps {
  user: User | null;
  syncState: SyncState;
  onLogin: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  syncState,
  onLogin,
  onLogout,
  onSyncNow,
}) => {
  return (
    <header className="mb-4">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-md shadow-stone-900/10">
            <span className="font-extrabold text-lg tracking-tight">CB</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">Cashbook</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Workspace Edition
              </span>
            </div>
            <p className="text-xs text-stone-500">Bank & Petty cash manager with Google Sheets & Drive</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Sheet link if available */}
          {syncState.spreadsheetUrl && (
            <a
              href={syncState.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="Open Google Sheet in new tab"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sheet</span>
            </a>
          )}

          {/* Drive receipts folder link if available */}
          {syncState.folderUrl && (
            <a
              href={syncState.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
              title="Open Receipts Folder in Google Drive"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Receipts</span>
            </a>
          )}

          {/* Sync status / manual trigger */}
          {user && (
            <button
              onClick={onSyncNow}
              disabled={syncState.isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer disabled:opacity-60"
              title="Sync with Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{syncState.isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

          {/* User authentication control */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-stone-300 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-stone-800 leading-tight truncate max-w-[120px]">
                  {user.displayName || user.email}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Connected</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="gsi-material-button shadow-xs !h-9 !text-xs !py-0"
              type="button"
            >
              <div className="gsi-material-button-icon !w-4 !h-4 !min-w-[16px] !mr-2">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud status bar when connected */}
      {!user && (
        <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-stone-700">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Sign in with Google to sync all transactions directly to <b>Google Sheets</b> and save receipts in <b>Google Drive</b>.
            </span>
          </div>
          <button
            onClick={onLogin}
            className="text-xs font-bold text-emerald-800 hover:underline shrink-0 ml-2"
          >
            Connect &rarr;
          </button>
        </div>
      )}
    </header>
  );
};
