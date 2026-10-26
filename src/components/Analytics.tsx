import React, { useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  Building2,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { AppSettings, Transaction } from '../types';

interface AnalyticsProps {
  transactions: Transaction[];
  settings: AppSettings;
}

export const Analytics: React.FC<AnalyticsProps> = ({ transactions, settings }) => {
  const fmt = (n: number) =>
    (n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Calculate totals and category breakdown
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let bankIn = 0;
    let bankOut = 0;
    let pettyIn = 0;
    let pettyOut = 0;
    let totalVat = 0;

    const expenseByCat: Record<string, number> = {};
    const incomeByCat: Record<string, number> = {};

    transactions.forEach((tx) => {
      totalVat += tx.vat || 0;

      if (tx.type === 'In') {
        totalIn += tx.total;
        if (tx.account === 'Bank') bankIn += tx.total;
        else pettyIn += tx.total;

        const cat = tx.category || 'Uncategorized';
        incomeByCat[cat] = (incomeByCat[cat] || 0) + tx.total;
      } else {
        totalOut += tx.total;
        if (tx.account === 'Bank') bankOut += tx.total;
        else pettyOut += tx.total;

        const cat = tx.category || 'Uncategorized';
        expenseByCat[cat] = (expenseByCat[cat] || 0) + tx.total;
      }
    });

    const expenseCategories = Object.entries(expenseByCat)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalOut > 0 ? (amount / totalOut) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const incomeCategories = Object.entries(incomeByCat)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalIn > 0 ? (amount / totalIn) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      bankIn,
      bankOut,
      pettyIn,
      pettyOut,
      totalVat,
      expenseCategories,
      incomeCategories,
    };
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Top High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold mb-1">
            <span>Total Income Received</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            +{fmt(stats.totalIn)}{' '}
            <span className="text-xs font-semibold text-stone-400">{settings.currency}</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Across all registered channels</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold mb-1">
            <span>Total Expenses Paid</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700">
            −{fmt(stats.totalOut)}{' '}
            <span className="text-xs font-semibold text-stone-400">{settings.currency}</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Total outflows recorded</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold mb-1">
            <span>Total VAT Claimable</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800">
              {settings.defaultVat}%
            </span>
          </div>
          <div className="text-xl font-black text-stone-900">
            {fmt(stats.totalVat)}{' '}
            <span className="text-xs font-semibold text-stone-400">{settings.currency}</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Itemized tax invoice amounts</p>
        </div>
      </div>

      {/* Account Share Breakdown (Bank vs Petty Cash) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h3 className="font-bold text-stone-900 text-sm mb-3">Account Outflow Comparison</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Bank Payments
              </span>
              <span className="text-xs font-black text-blue-950">{fmt(stats.bankOut)} {settings.currency}</span>
            </div>
            <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stats.totalOut > 0 ? (stats.bankOut / stats.totalOut) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-blue-700 mt-1.5 flex justify-between">
              <span>Share of total expenses</span>
              <span className="font-semibold">
                {stats.totalOut > 0 ? ((stats.bankOut / stats.totalOut) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                Petty Cash Disbursed
              </span>
              <span className="text-xs font-black text-amber-950">{fmt(stats.pettyOut)} {settings.currency}</span>
            </div>
            <div className="w-full bg-amber-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stats.totalOut > 0 ? (stats.pettyOut / stats.totalOut) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-amber-700 mt-1.5 flex justify-between">
              <span>Share of total expenses</span>
              <span className="font-semibold">
                {stats.totalOut > 0 ? ((stats.pettyOut / stats.totalOut) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expense by Category Breakdown */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h3 className="font-bold text-stone-900 text-sm mb-3">Expenses by Category</h3>
        {stats.expenseCategories.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">No expense transactions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.expenseCategories.map((cat, idx) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-800 truncate max-w-[200px] sm:max-w-none">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">
                      {fmt(cat.amount)} {settings.currency}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono w-10 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-stone-800 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
