import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FolderGit2,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { AppSettings, CategoryConfig, SyncState } from '../types';

interface SettingsTabProps {
  settings: AppSettings;
  categories: CategoryConfig[];
  syncState: SyncState;
  isSaving: boolean;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onSaveCategories: (categories: CategoryConfig[]) => Promise<void>;
  onResetCategories: () => void;
  onForceSync: () => void;
}

const COMMON_FIELD_LABELS = [
  'Paid to',
  'Received from',
  'Vehicle number',
  'Driver',
  'Supplier',
  'Employee',
  'Customer',
  'Client / Route',
  'Department',
  'Voucher Party',
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  categories,
  syncState,
  isSaving,
  onSaveSettings,
  onSaveCategories,
  onResetCategories,
  onForceSync,
}) => {
  // Local state for opening balances and settings
  const [bankOpen, setBankOpen] = useState(String(settings.bankOpen));
  const [pettyOpen, setPettyOpen] = useState(String(settings.pettyOpen));
  const [defaultVat, setDefaultVat] = useState(String(settings.defaultVat));
  const [lowBalance, setLowBalance] = useState(String(settings.lowBalanceThreshold));
  const [currency, setCurrency] = useState(settings.currency || 'AED');

  // Local state for categories editor
  const [catList, setCatList] = useState<
    { name: string; label: string; optionsStr: string }[]
  >([]);

  useEffect(() => {
    setBankOpen(String(settings.bankOpen));
    setPettyOpen(String(settings.pettyOpen));
    setDefaultVat(String(settings.defaultVat));
    setLowBalance(String(settings.lowBalanceThreshold));
    setCurrency(settings.currency || 'AED');
  }, [settings]);

  useEffect(() => {
    setCatList(
      categories.map((c) => ({
        name: c.name,
        label: c.label,
        optionsStr: c.options.join(', '),
      }))
    );
  }, [categories]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      bankOpen: parseFloat(bankOpen) || 0,
      pettyOpen: parseFloat(pettyOpen) || 0,
      defaultVat: parseFloat(defaultVat) || 0,
      lowBalanceThreshold: parseFloat(lowBalance) || 0,
      currency: currency.trim() || 'AED',
    });
  };

  const handleSaveCategories = async () => {
    const formatted: CategoryConfig[] = catList
      .filter((c) => c.name.trim() !== '')
      .map((c) => ({
        name: c.name.trim(),
        label: c.label.trim() || 'Paid to',
        options: c.optionsStr
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      }));

    await onSaveCategories(formatted);
  };

  const handleAddCategory = () => {
    setCatList((prev) => [
      ...prev,
      { name: '', label: 'Paid to', optionsStr: '' },
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    setCatList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCatChange = (
    index: number,
    field: 'name' | 'label' | 'optionsStr',
    value: string
  ) => {
    setCatList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Google Workspace Cloud Sync Info */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-stone-900 text-sm">Google Workspace Integration</h2>
          </div>
          {syncState.lastSyncedAt && (
            <span className="text-[11px] text-stone-400">
              Synced {new Date(syncState.lastSyncedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        <p className="text-xs text-stone-500 mb-4">
          All financial data is synced with your Google Drive spreadsheet and files.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Sheet Details */}
          <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Google Sheet Ledger</span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono truncate mt-0.5">
                {syncState.spreadsheetId || 'Not initialized yet'}
              </p>
            </div>
            {syncState.spreadsheetUrl && (
              <a
                href={syncState.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Drive Folder Details */}
          <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                <FolderGit2 className="w-4 h-4 text-blue-600" />
                <span>Google Drive Receipts Folder</span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono truncate mt-0.5">
                {syncState.folderId || 'Not initialized yet'}
              </p>
            </div>
            {syncState.folderUrl && (
              <a
                href={syncState.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
              >
                <span>Open in Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onForceSync}
          disabled={syncState.isSyncing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-200 hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
          <span>Force Refresh & Sync from Sheet</span>
        </button>
      </div>

      {/* Opening Balances and VAT Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h2 className="font-bold text-stone-900 text-sm mb-3">Opening Balances & Currency</h2>
        <form onSubmit={handleSaveSettings} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Bank Opening Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={bankOpen}
                onChange={(e) => setBankOpen(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-semibold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Petty Cash Opening Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={pettyOpen}
                onChange={(e) => setPettyOpen(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-semibold bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Default VAT %
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={defaultVat}
                onChange={(e) => setDefaultVat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-semibold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Low Balance Alert
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={lowBalance}
                onChange={(e) => setLowBalance(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-semibold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Currency Label
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="AED, $, €, £"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-semibold bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            Save Settings & Opening Balances
          </button>
        </form>
      </div>

      {/* Categories Configuration Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-stone-900 text-sm">Categories & Custom Fields</h2>
          <button
            type="button"
            onClick={onResetCategories}
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
          <span>
            Each category has its own field label (e.g. <b>Vehicle number</b>, <b>Supplier</b>, or <b>Paid to</b>).
            Add saved choices separated by commas to get quick select dropdowns when entering transactions.
          </span>
        </div>

        <div className="space-y-3 mb-4">
          {catList.map((cat, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2.5 transition-all hover:border-stone-300"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-500 mb-0.5">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => handleCatChange(idx, 'name', e.target.value)}
                    placeholder="e.g. Fuel, Salaries, Spare Parts"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-500 mb-0.5">
                    Field Label
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list={`label-list-${idx}`}
                      value={cat.label}
                      onChange={(e) => handleCatChange(idx, 'label', e.target.value)}
                      placeholder="e.g. Vehicle number, Paid to"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm bg-white"
                    />
                    <datalist id={`label-list-${idx}`}>
                      {COMMON_FIELD_LABELS.map((lbl) => (
                        <option key={lbl} value={lbl} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-0.5">
                  Saved Choices (comma-separated; leave empty to type manually)
                </label>
                <textarea
                  value={cat.optionsStr}
                  onChange={(e) => handleCatChange(idx, 'optionsStr', e.target.value)}
                  placeholder="e.g. Bus #101, Bus #102, Van #201"
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(idx)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Category</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleAddCategory}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Category</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCategories}
            disabled={isSaving}
            className="w-full sm:flex-1 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Categories to Google Sheets</span>
          </button>
        </div>
      </div>
    </div>
  );
};
