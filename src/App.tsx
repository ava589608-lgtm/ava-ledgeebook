import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  PlusCircle,
  Clock,
  PieChart,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

import {
  initAuth,
  googleSignIn,
  logout as authLogout,
  getAccessToken,
} from './firebase';
import {
  AppSettings,
  CategoryConfig,
  SyncState,
  Transaction,
} from './types';
import {
  loadLocalCategories,
  loadLocalSettings,
  loadLocalTransactions,
  saveLocalCategories,
  saveLocalSettings,
  saveLocalTransactions,
  getCachedSyncInfo,
  setCachedSyncInfo,
  DEFAULT_CATEGORIES,
} from './services/storageService';
import {
  findOrCreateReceiptsFolder,
  uploadReceiptToDrive,
} from './services/driveService';
import {
  findOrCreateCashbookSheet,
  fetchSheetData,
  syncAllTransactionsToSheet,
  saveCategoriesToSheet,
  saveSettingsToSheet,
} from './services/sheetsService';

import { Header } from './components/Header';
import { BalanceCards } from './components/BalanceCards';
import { AddTransaction } from './components/AddTransaction';
import { TransactionHistory } from './components/TransactionHistory';
import { Analytics } from './components/Analytics';
import { SettingsTab } from './components/SettingsTab';
import { ConfirmModal } from './components/ConfirmModal';
import { ReceiptModal } from './components/ReceiptModal';

export default function App() {
  // App Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadLocalSettings());

  // User and Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Sync State
  const cachedSync = getCachedSyncInfo();
  const [syncState, setSyncState] = useState<SyncState>({
    spreadsheetId: cachedSync.spreadsheetId,
    spreadsheetUrl: cachedSync.spreadsheetUrl,
    folderId: cachedSync.folderId,
    folderUrl: cachedSync.folderUrl,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
  });

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'analytics' | 'settings'>('add');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal States
  const [receiptModal, setReceiptModal] = useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
  }>({
    isOpen: false,
    url: null,
    title: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((current) => (current?.text === text ? null : current));
    }, 3200);
  };

  // Initial local load
  useEffect(() => {
    const localTxs = loadLocalTransactions();
    const localCats = loadLocalCategories();
    const localSets = loadLocalSettings();
    setTransactions(localTxs);
    setCategories(localCats);
    setSettings(localSets);
  }, []);

  // Workspace Sync Handler
  const syncWithGoogleWorkspace = useCallback(
    async (accessToken: string) => {
      setSyncState((s) => ({ ...s, isSyncing: true, syncError: null }));

      try {
        // 1. Find or create receipts folder in Google Drive
        let folderId = syncState.folderId;
        let folderUrl = syncState.folderUrl;
        if (!folderId) {
          const folder = await findOrCreateReceiptsFolder(accessToken);
          folderId = folder.id;
          folderUrl = folder.webViewLink;
          setCachedSyncInfo({ folderId, folderUrl });
        }

        // 2. Find or create Google Sheet
        const currentCats = categories.length > 0 ? categories : loadLocalCategories();
        const currentSets = settings;

        const sheetResult = await findOrCreateCashbookSheet(
          accessToken,
          currentCats,
          currentSets,
          folderId || undefined
        );

        const spreadsheetId = sheetResult.spreadsheetId;
        const spreadsheetUrl = sheetResult.spreadsheetUrl;
        setCachedSyncInfo({ spreadsheetId, spreadsheetUrl });

        // 3. If sheet was existing, pull data from it
        if (!sheetResult.isNew) {
          const sheetData = await fetchSheetData(accessToken, spreadsheetId);
          if (sheetData.transactions && sheetData.transactions.length > 0) {
            setTransactions(sheetData.transactions);
            saveLocalTransactions(sheetData.transactions);
          } else if (transactions.length > 0) {
            // Sheet is empty, push local data to sheet
            await syncAllTransactionsToSheet(accessToken, spreadsheetId, transactions);
          }

          if (sheetData.categories && sheetData.categories.length > 0) {
            setCategories(sheetData.categories);
            saveLocalCategories(sheetData.categories);
          }
          if (sheetData.settings) {
            const mergedSets = { ...settings, ...sheetData.settings };
            setSettings(mergedSets);
            saveLocalSettings(mergedSets);
          }
          if (sheetData.receiptsFolderId && !folderId) {
            folderId = sheetData.receiptsFolderId;
            folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
          }
        } else {
          // It's a new sheet, push current local transactions into it
          if (transactions.length > 0) {
            await syncAllTransactionsToSheet(accessToken, spreadsheetId, transactions);
          }
        }

        setSyncState({
          spreadsheetId,
          spreadsheetUrl,
          folderId,
          folderUrl,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString(),
          syncError: null,
        });

        showToast('Synced with Google Sheets & Drive', 'success');
      } catch (err: any) {
        console.error('Workspace sync error:', err);
        setSyncState((s) => ({
          ...s,
          isSyncing: false,
          syncError: err.message || 'Sync failed',
        }));
        showToast(`Sync issue: ${err.message}`, 'error');
      }
    },
    [categories, settings, syncState.folderId, syncState.folderUrl, transactions]
  );

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        syncWithGoogleWorkspace(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [syncWithGoogleWorkspace]);

  // Login handler
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        showToast(`Welcome, ${res.user.displayName || 'User'}!`, 'success');
        await syncWithGoogleWorkspace(res.accessToken);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      showToast(err.message || 'Login failed', 'error');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    setToken(null);
    showToast('Signed out of Google Workspace', 'info');
  };

  // Manual sync trigger
  const handleForceSync = async () => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      showToast('Please sign in with Google to sync', 'info');
      return;
    }
    await syncWithGoogleWorkspace(currentToken);
  };

  // Save Transaction (Add or Update)
  const handleSaveTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string },
    file: { name: string; mimeType: string; base64Data: string } | null
  ) => {
    setIsSaving(true);
    try {
      let finalUrl = data.url || '';
      const currentToken = token || (await getAccessToken());

      // If user uploaded a file and we have Google Drive access
      if (file) {
        if (currentToken && syncState.folderId) {
          try {
            const uploadRes = await uploadReceiptToDrive(currentToken, syncState.folderId, file);
            finalUrl = uploadRes.webViewLink;
          } catch (uploadErr) {
            console.error('Drive upload failed, saving file as local data URL:', uploadErr);
            finalUrl = `data:${file.mimeType};base64,${file.base64Data}`;
          }
        } else {
          // Offline fallback
          finalUrl = `data:${file.mimeType};base64,${file.base64Data}`;
        }
      }

      const isEdit = Boolean(data.id);
      let updatedTransactions: Transaction[] = [];

      if (isEdit && data.id) {
        const existingTx = transactions.find((t) => t.id === data.id);
        const updatedTx: Transaction = {
          ...data,
          id: data.id,
          url: finalUrl || data.url,
          createdAt: existingTx ? existingTx.createdAt : new Date().toISOString(),
        };
        updatedTransactions = transactions.map((t) => (t.id === data.id ? updatedTx : t));
        showToast('Transaction updated', 'success');
      } else {
        const newTx: Transaction = {
          ...data,
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: finalUrl,
          createdAt: new Date().toISOString(),
        };
        updatedTransactions = [newTx, ...transactions];
        showToast('Transaction saved', 'success');
      }

      setTransactions(updatedTransactions);
      saveLocalTransactions(updatedTransactions);
      setEditingTransaction(null);
      setActiveTab('history');

      // Sync to Google Sheets if connected
      if (currentToken && syncState.spreadsheetId) {
        syncAllTransactionsToSheet(currentToken, syncState.spreadsheetId, updatedTransactions).catch(
          (e) => {
            console.error('Background sheet sync failed:', e);
          }
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Transaction with MANDATORY confirmation
  const handleDeleteRequest = (tx: Transaction) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this transaction? This action will remove the record from your cashbook and Google Sheets.`,
      detail: `${tx.date} · ${tx.account} · ${tx.type === 'In' ? '+' : '−'}${tx.total.toFixed(2)} ${settings.currency} · ${tx.desc || tx.category || 'Transaction'}`,
      confirmLabel: 'Delete Transaction',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        const updated = transactions.filter((t) => t.id !== tx.id);
        setTransactions(updated);
        saveLocalTransactions(updated);
        showToast('Transaction deleted', 'info');

        const currentToken = token || (await getAccessToken());
        if (currentToken && syncState.spreadsheetId) {
          try {
            await syncAllTransactionsToSheet(currentToken, syncState.spreadsheetId, updated);
          } catch (e) {
            console.error('Error syncing deletion to Google Sheets:', e);
          }
        }
      },
    });
  };

  // Edit Transaction
  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingTransaction(null);
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setIsSaving(true);
    try {
      setSettings(newSettings);
      saveLocalSettings(newSettings);
      showToast('Settings saved successfully', 'success');

      const currentToken = token || (await getAccessToken());
      if (currentToken && syncState.spreadsheetId) {
        await saveSettingsToSheet(
          currentToken,
          syncState.spreadsheetId,
          newSettings,
          syncState.folderId || undefined
        );
      }
    } catch (err: any) {
      showToast(`Error saving settings: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Categories
  const handleSaveCategories = async (newCategories: CategoryConfig[]) => {
    setIsSaving(true);
    try {
      setCategories(newCategories);
      saveLocalCategories(newCategories);
      showToast('Categories updated', 'success');

      const currentToken = token || (await getAccessToken());
      if (currentToken && syncState.spreadsheetId) {
        await saveCategoriesToSheet(currentToken, syncState.spreadsheetId, newCategories);
      }
    } catch (err: any) {
      showToast(`Error saving categories: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset Categories with Confirmation
  const handleResetCategoriesRequest = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Categories to Defaults',
      message:
        'This will reset all category definitions and their dependent field presets back to default vehicle, maintenance, and expense categories.',
      confirmLabel: 'Reset to Defaults',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        setCategories(DEFAULT_CATEGORIES);
        saveLocalCategories(DEFAULT_CATEGORIES);
        showToast('Categories reset to defaults', 'info');

        const currentToken = token || (await getAccessToken());
        if (currentToken && syncState.spreadsheetId) {
          await saveCategoriesToSheet(currentToken, syncState.spreadsheetId, DEFAULT_CATEGORIES);
        }
      },
    });
  };

  // View Receipt Modal
  const handleViewReceipt = (url: string, title: string) => {
    setReceiptModal({
      isOpen: true,
      url,
      title,
    });
  };

  return (
    <div className="min-h-screen bg-[#f2f5f3] text-[#1b2a28] pb-16 pt-3 px-3 sm:px-4">
      {/* Container matching Figtree clean width */}
      <div className="max-w-2xl mx-auto">
        {/* Top Header */}
        <Header
          user={user}
          syncState={syncState}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSyncNow={handleForceSync}
        />

        {/* Real-time Balances */}
        <BalanceCards transactions={transactions} settings={settings} />

        {/* Tab Navigation */}
        <div className="flex gap-1.5 p-1 bg-stone-200/70 rounded-xl mb-4 border border-stone-200 shadow-2xs">
          <button
            onClick={() => {
              setActiveTab('add');
            }}
            className={`flex-1 py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-[#1b2a28] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{editingTransaction ? 'Edit Entry' : 'Add Entry'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
            }}
            className={`flex-1 py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#1b2a28] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>History ({transactions.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('analytics');
            }}
            className={`flex-1 py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#1b2a28] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
            }}
            className={`flex-1 py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#1b2a28] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Tab Panels */}
        <main>
          {activeTab === 'add' && (
            <AddTransaction
              categories={categories}
              settings={settings}
              editingTransaction={editingTransaction}
              isSaving={isSaving}
              onSave={handleSaveTransaction}
              onCancelEdit={handleCancelEdit}
            />
          )}

          {activeTab === 'history' && (
            <TransactionHistory
              transactions={transactions}
              categories={categories}
              settings={settings}
              onEdit={handleEdit}
              onDeleteRequest={handleDeleteRequest}
              onViewReceipt={handleViewReceipt}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics transactions={transactions} settings={settings} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              categories={categories}
              syncState={syncState}
              isSaving={isSaving}
              onSaveSettings={handleSaveSettings}
              onSaveCategories={handleSaveCategories}
              onResetCategories={handleResetCategoriesRequest}
              onForceSync={handleForceSync}
            />
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 py-2.5 px-4 rounded-full bg-[#1b2a28] text-white text-xs font-semibold shadow-xl border border-stone-700 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          {toastMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Confirmation Modal (Mandatory for destructive actions) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
      />

      {/* Receipt Viewer Modal */}
      <ReceiptModal
        isOpen={receiptModal.isOpen}
        url={receiptModal.url}
        title={receiptModal.title}
        onClose={() => setReceiptModal({ isOpen: false, url: null, title: '' })}
      />
    </div>
  );
}
