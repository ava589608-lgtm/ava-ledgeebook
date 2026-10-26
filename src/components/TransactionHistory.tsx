import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Building2,
  Coins,
  Edit2,
  Trash2,
  Paperclip,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
} from 'lucide-react';
import { AppSettings, CategoryConfig, Transaction } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  categories: CategoryConfig[];
  settings: AppSettings;
  onEdit: (tx: Transaction) => void;
  onDeleteRequest: (tx: Transaction) => void;
  onViewReceipt: (url: string, title: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  categories,
  settings,
  onEdit,
  onDeleteRequest,
  onViewReceipt,
}) => {
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const lastMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Filtered rows
  const filtered = useMemo(() => {
    return transactions
      .filter((r) => {
        if (filterAccount && r.account !== filterAccount) return false;
        if (filterCategory && r.category !== filterCategory) return false;
        if (filterMonth && !r.date.startsWith(filterMonth)) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const target = `${r.desc} ${r.party} ${r.ref} ${r.category} ${r.account} ${r.total}`.toLowerCase();
          if (!target.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [transactions, filterAccount, filterCategory, filterMonth, searchQuery]);

  // Aggregate sums
  const stats = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;
    filtered.forEach((r) => {
      if (r.type === 'In') {
        inTotal += r.total;
      } else {
        outTotal += r.total;
      }
    });
    return {
      count: filtered.length,
      inTotal,
      outTotal,
      net: inTotal - outTotal,
    };
  }, [filtered]);

  const fmt = (n: number) =>
    (n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Date',
      'Account',
      'Type',
      'Category',
      'Party Label',
      'Party / Name',
      'Description',
      'Reference',
      'Net Amount',
      'VAT Rate',
      'VAT Amount',
      'Total Amount',
      'Receipt Link',
    ];

    const rows = filtered.map((r) => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${r.account}"`,
      `"${r.type}"`,
      `"${r.category}"`,
      `"${r.field || ''}"`,
      `"${(r.party || '').replace(/"/g, '""')}"`,
      `"${(r.desc || '').replace(/"/g, '""')}"`,
      `"${(r.ref || '').replace(/"/g, '""')}"`,
      r.net,
      r.vatRate,
      r.vat,
      r.total,
      `"${r.url || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashbook_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Account Filter */}
          <div className="relative">
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Accounts</option>
              <option value="Bank">Bank Account</option>
              <option value="Petty Cash">Petty Cash</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer appearance-none truncate"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Month Filter */}
          <div className="relative">
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-700 bg-stone-50"
            />
          </div>

          {/* Search text */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search memo, party, ref, voucher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-800 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-stone-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Month Chips & Export */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-stone-400">Preset:</span>
            <button
              onClick={() => setFilterMonth(currentMonthStr)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filterMonth === currentMonthStr
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setFilterMonth(lastMonthStr)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filterMonth === lastMonthStr
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Last Month
            </button>
            {filterMonth && (
              <button
                onClick={() => setFilterMonth('')}
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-500 hover:text-stone-900"
              >
                All Time
              </button>
            )}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Line */}
      <div className="flex items-center justify-between px-2 text-xs text-stone-500 font-medium flex-wrap gap-2">
        <div>
          <span className="font-bold text-stone-800">{stats.count}</span> entries found
        </div>
        <div className="flex items-center gap-3">
          <span>
            In: <b className="text-emerald-700">{fmt(stats.inTotal)}</b>
          </span>
          <span>
            Out: <b className="text-rose-700">{fmt(stats.outTotal)}</b>
          </span>
          <span>
            Net:{' '}
            <b className={stats.net >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
              {fmt(stats.net)} {settings.currency}
            </b>
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center">
            <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h4 className="font-semibold text-stone-700 text-sm">No transactions found</h4>
            <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
              Try adjusting your search criteria, clearing month filters, or add a new transaction above.
            </p>
          </div>
        ) : (
          filtered.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-xl border border-stone-200 p-3.5 shadow-xs hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
            >
              {/* Left Details */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* Title & Memo */}
                <div className="font-bold text-stone-900 text-sm leading-snug break-words">
                  {tx.desc || tx.category || 'Transaction'}
                </div>

                {/* Tags Line */}
                <div className="flex items-center flex-wrap gap-1.5 text-xs text-stone-500">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider text-white ${
                      tx.account === 'Bank' ? 'bg-blue-600' : 'bg-amber-600'
                    }`}
                  >
                    {tx.account === 'Bank' ? (
                      <Building2 className="w-2.5 h-2.5" />
                    ) : (
                      <Coins className="w-2.5 h-2.5" />
                    )}
                    {tx.account}
                  </span>

                  {tx.category && (
                    <span className="inline-block px-2 py-0.5 rounded-full font-medium text-[11px] bg-stone-100 text-stone-700 border border-stone-200">
                      {tx.category}
                    </span>
                  )}

                  <span className="text-stone-400 text-[11px] font-medium">{tx.date}</span>
                </div>

                {/* Party & Reference Line */}
                {(tx.party || tx.ref) && (
                  <div className="text-xs text-stone-600">
                    {tx.party && (
                      <span>
                        <span className="text-stone-400">{tx.field || 'Party'}:</span>{' '}
                        <b className="text-stone-800">{tx.party}</b>
                      </span>
                    )}
                    {tx.party && tx.ref && <span className="text-stone-300 mx-1.5">·</span>}
                    {tx.ref && (
                      <span>
                        <span className="text-stone-400">Ref:</span>{' '}
                        <span className="font-mono text-stone-700">{tx.ref}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* VAT Line if applicable */}
                {tx.vat > 0 && (
                  <div className="text-[11px] text-stone-500">
                    VAT {fmt(tx.vat)} ({tx.vatRate}%) · Net {fmt(tx.net)} {settings.currency}
                  </div>
                )}

                {/* Actions row: View receipt, Edit, Delete */}
                <div className="pt-1 flex items-center gap-3 text-xs">
                  {tx.url && (
                    <button
                      onClick={() => onViewReceipt(tx.url!, tx.desc || tx.party || 'Receipt')}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span>View Receipt</span>
                    </button>
                  )}

                  <button
                    onClick={() => onEdit(tx)}
                    className="inline-flex items-center gap-1 font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => onDeleteRequest(tx)}
                    className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Right: Total Amount */}
              <div className="sm:text-right shrink-0">
                <div
                  className={`text-lg sm:text-xl font-black tracking-tight ${
                    tx.type === 'In' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {tx.type === 'In' ? '+' : '−'}
                  {fmt(tx.total)}
                  <span className="text-xs font-semibold text-stone-400 ml-1">
                    {settings.currency}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
