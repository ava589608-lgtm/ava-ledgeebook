import React, { useState, useEffect } from 'react';
import {
  Upload,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  Hash,
  Paperclip,
  X,
  Check,
  AlertCircle,
  Camera,
  Layers,
} from 'lucide-react';
import { AccountType, AppSettings, CategoryConfig, FlowType, Transaction } from '../types';
import { compressImage } from '../services/driveService';

interface AddTransactionProps {
  categories: CategoryConfig[];
  settings: AppSettings;
  editingTransaction: Transaction | null;
  isSaving: boolean;
  onSave: (
    data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string },
    file: { name: string; mimeType: string; base64Data: string } | null
  ) => Promise<void>;
  onCancelEdit: () => void;
}

export const AddTransaction: React.FC<AddTransactionProps> = ({
  categories,
  settings,
  editingTransaction,
  isSaving,
  onSave,
  onCancelEdit,
}) => {
  const getToday = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [account, setAccount] = useState<AccountType>('Bank');
  const [type, setType] = useState<FlowType>('In');
  const [date, setDate] = useState<string>(getToday());
  const [total, setTotal] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [partySelect, setPartySelect] = useState<string>('');
  const [partyManual, setPartyManual] = useState<string>('');
  const [hasVat, setHasVat] = useState<boolean>(false);
  const [vatRate, setVatRate] = useState<string>(String(settings.defaultVat || 5));
  const [desc, setDesc] = useState<string>('');
  const [ref, setRef] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default category when categories load
  useEffect(() => {
    if (!categoryName && categories.length > 0) {
      setCategoryName(categories[0].name);
    }
  }, [categories, categoryName]);

  // Handle edit mode
  useEffect(() => {
    if (editingTransaction) {
      setAccount(editingTransaction.account);
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setTotal(String(editingTransaction.total));
      setCategoryName(editingTransaction.category);
      setDesc(editingTransaction.desc || '');
      setRef(editingTransaction.ref || '');
      setExistingUrl(editingTransaction.url || '');
      setSelectedFile(null);
      setPreviewUrl(null);

      const hasVatVal = editingTransaction.vat > 0;
      setHasVat(hasVatVal);
      if (hasVatVal) {
        setVatRate(String(editingTransaction.vatRate));
      }

      // Check party in category options
      const cat = categories.find((c) => c.name === editingTransaction.category);
      const isKnown = cat?.options.includes(editingTransaction.party);
      if (isKnown) {
        setPartySelect(editingTransaction.party);
        setPartyManual('');
      } else {
        setPartySelect('__manual');
        setPartyManual(editingTransaction.party || '');
      }
    } else {
      resetForm();
    }
  }, [editingTransaction, categories]);

  const resetForm = () => {
    setAccount('Bank');
    setType('In');
    setDate(getToday());
    setTotal('');
    if (categories.length > 0) {
      setCategoryName(categories[0].name);
    }
    setPartySelect('');
    setPartyManual('');
    setHasVat(false);
    setVatRate(String(settings.defaultVat || 5));
    setDesc('');
    setRef('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingUrl('');
    setErrorMsg(null);
  };

  const currentCategory = categories.find((c) => c.name === categoryName) || {
    name: categoryName || 'General',
    label: type === 'In' ? 'Received from' : 'Paid to',
    options: [],
  };

  const fieldLabel = currentCategory.label || (type === 'In' ? 'Received from' : 'Paid to');

  // Calculate VAT
  const totalNum = parseFloat(total) || 0;
  const rateNum = parseFloat(vatRate) || 0;
  const vatAmount = hasVat && rateNum > 0 ? (totalNum * rateNum) / (100 + rateNum) : 0;
  const netAmount = totalNum - vatAmount;

  const fmt = (n: number) =>
    (n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!totalNum || totalNum <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }
    if (!date) {
      setErrorMsg('Please select a valid transaction date.');
      return;
    }

    const party =
      currentCategory.options.length > 0 && partySelect !== '__manual'
        ? partySelect
        : partyManual.trim();

    let compressedFile: { name: string; mimeType: string; base64Data: string } | null = null;
    if (selectedFile) {
      try {
        compressedFile = await compressImage(selectedFile);
      } catch (err: any) {
        console.error('File compression error:', err);
        setErrorMsg('Failed to process receipt image. Please try again or use another file.');
        return;
      }
    }

    try {
      await onSave(
        {
          id: editingTransaction ? editingTransaction.id : undefined,
          date,
          account,
          type,
          category: currentCategory.name,
          field: fieldLabel,
          party,
          desc: desc.trim(),
          ref: ref.trim(),
          total: totalNum,
          vatRate: hasVat ? rateNum : 0,
          vat: Math.round(vatAmount * 100) / 100,
          net: Math.round(netAmount * 100) / 100,
          url: existingUrl,
        },
        compressedFile
      );

      resetForm();
    } catch (saveErr: any) {
      setErrorMsg(saveErr.message || 'Error saving transaction.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs">
      {/* Editing Banner */}
      {editingTransaction && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">Editing transaction #{editingTransaction.id.slice(-6)}</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="font-bold underline text-amber-900 hover:text-black cursor-pointer"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Segmented Control */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
            Select Account
          </label>
          <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setAccount('Bank')}
              className={`py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                account === 'Bank'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Bank Account
            </button>
            <button
              type="button"
              onClick={() => setAccount('Petty Cash')}
              className={`py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                account === 'Petty Cash'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Petty Cash
            </button>
          </div>
        </div>

        {/* Money Flow Segmented Control */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
            Cash Flow Direction
          </label>
          <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('In')}
              className={`py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                type === 'In'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              + Money In (Receipt)
            </button>
            <button
              type="button"
              onClick={() => setType('Out')}
              className={`py-2 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                type === 'Out'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              − Money Out (Payment)
            </button>
          </div>
        </div>

        {/* Date and Amount Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-stone-900 focus:outline-hidden text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-stone-400" />
              <span>Total Amount ({settings.currency})</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-bold text-base focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
              required
            />
          </div>
        </div>

        {/* Quick Amount presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-stone-400 mr-1 font-medium">Quick add:</span>
          {[50, 100, 250, 500, 1000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setTotal(String((parseFloat(total) || 0) + amt))}
              className="text-xs px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-md text-stone-700 font-medium transition-colors cursor-pointer"
            >
              +{amt}
            </button>
          ))}
          {total && (
            <button
              type="button"
              onClick={() => setTotal('')}
              className="text-xs px-2 py-1 text-red-600 hover:text-red-700 font-medium transition-colors ml-auto cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category & Dynamic Field */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-stone-400" />
              <span>Category</span>
            </label>
            <select
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setPartySelect('');
                setPartyManual('');
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-stone-900 focus:outline-hidden text-sm"
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              <span>{fieldLabel}</span>
            </label>
            {currentCategory.options.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={partySelect}
                  onChange={(e) => setPartySelect(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-stone-900 focus:outline-hidden text-sm"
                >
                  <option value="">Select {fieldLabel.toLowerCase()}</option>
                  {currentCategory.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="__manual">+ Other / Enter custom...</option>
                </select>
                {partySelect === '__manual' && (
                  <input
                    type="text"
                    placeholder={`Enter custom ${fieldLabel.toLowerCase()}`}
                    value={partyManual}
                    onChange={(e) => setPartyManual(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-stone-900 focus:outline-hidden"
                    autoFocus
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                placeholder={`Enter ${fieldLabel.toLowerCase()}`}
                value={partyManual}
                onChange={(e) => setPartyManual(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-stone-900 focus:outline-hidden text-sm"
              />
            )}
          </div>
        </div>

        {/* VAT Section */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasVat}
              onChange={(e) => setHasVat(e.target.checked)}
              className="w-4 h-4 rounded-sm text-stone-900 focus:ring-stone-900 border-stone-300 cursor-pointer"
            />
            <span className="text-xs font-semibold text-stone-800">
              This amount includes VAT (Tax Invoice)
            </span>
          </label>

          {hasVat && (
            <div className="pt-2 border-t border-stone-200 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-500 mb-1">
                    VAT Rate %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-500 mb-1">
                    VAT Amount
                  </label>
                  <div className="px-3 py-1.5 rounded-lg bg-stone-200/60 border border-stone-300 text-sm font-bold text-stone-800">
                    {fmt(vatAmount)} {settings.currency}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-stone-500 flex items-center justify-between">
                <span>
                  Net: <b>{fmt(netAmount)}</b> + VAT ({rateNum}%): <b>{fmt(vatAmount)}</b>
                </span>
                <span>
                  Total: <b>{fmt(totalNum)}</b> {settings.currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Description & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Description / Memo</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Diesel 50L, Brake pad replacement, Fare"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-stone-900 focus:outline-hidden text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-stone-400" />
              <span>Reference / Cheque / Voucher #</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CHQ-1049, RCP-0891, INV-44"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-stone-900 focus:outline-hidden text-sm"
            />
          </div>
        </div>

        {/* Receipt / Voucher Attachment */}
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-stone-400" />
            <span>Receipt, Invoice or Cheque Image</span>
            {existingUrl && !selectedFile && (
              <span className="text-[11px] text-emerald-700 font-semibold ml-auto">
                (Receipt currently attached in Drive)
              </span>
            )}
          </label>

          <div className="flex items-center gap-3">
            <label className="flex-1 border-2 border-dashed border-stone-300 hover:border-stone-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
              <Camera className="w-4 h-4 text-stone-500" />
              <span className="text-xs font-semibold text-stone-700">
                {selectedFile ? selectedFile.name : 'Choose receipt photo or PDF'}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {previewUrl && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-300 shrink-0">
                <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Receipts are automatically uploaded to your Google Drive "Cashbook Receipts" folder.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-98 text-white font-bold text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving to Google Sheets & Drive...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 text-emerald-400" />
                <span>{editingTransaction ? 'Update Transaction' : 'Save Transaction'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
