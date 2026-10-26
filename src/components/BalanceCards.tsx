import React from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Building2, Coins, Wallet } from 'lucide-react';
import { AppSettings, Transaction } from '../types';

interface BalanceCardsProps {
  transactions: Transaction[];
  settings: AppSettings;
}

export const BalanceCards: React.FC<BalanceCardsProps> = ({ transactions, settings }) => {
  // Calculate Bank and Petty Cash balances
  let bankBal = settings.bankOpen;
  let pettyBal = settings.pettyOpen;
  let totalIn = 0;
  let totalOut = 0;

  transactions.forEach((tx) => {
    const delta = tx.type === 'In' ? tx.total : -tx.total;
    if (tx.account === 'Bank') {
      bankBal += delta;
    } else {
      pettyBal += delta;
    }

    if (tx.type === 'In') {
      totalIn += tx.total;
    } else {
      totalOut += tx.total;
    }
  });

  const totalBal = bankBal + pettyBal;
  const isPettyLow = pettyBal < settings.lowBalanceThreshold;
  const isBankLow = bankBal < settings.lowBalanceThreshold;

  const fmt = (n: number) =>
    (n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-2 mb-4">
      {/* Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Bank Balance Card */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 border-l-4 border-l-blue-600 shadow-xs relative overflow-hidden transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Bank Account
            </span>
            {isBankLow && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <AlertCircle className="w-3 h-3" />
                Low Balance
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black tracking-tight text-stone-900">
              <span className="text-sm font-semibold text-stone-500 mr-1">{settings.currency}</span>
              {fmt(bankBal)}
            </div>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Opening: {fmt(settings.bankOpen)} {settings.currency}
          </p>
        </div>

        {/* Petty Cash Card */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 border-l-4 border-l-amber-600 shadow-xs relative overflow-hidden transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              Petty Cash
            </span>
            {isPettyLow && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <AlertCircle className="w-3 h-3" />
                Low Balance
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black tracking-tight text-stone-900">
              <span className="text-sm font-semibold text-stone-500 mr-1">{settings.currency}</span>
              {fmt(pettyBal)}
            </div>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Opening: {fmt(settings.pettyOpen)} {settings.currency}
          </p>
        </div>

        {/* Total Cashbook Balance Card (Full Width) */}
        <div className="sm:col-span-2 bg-stone-900 text-white p-4 rounded-xl border border-stone-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 border border-stone-700 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold block">
                Total Available Cash (Bank + Petty Cash)
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                <span className="text-base font-semibold text-stone-400 mr-1.5">{settings.currency}</span>
                {fmt(totalBal)}
              </div>
            </div>
          </div>

          {/* Quick Flow Summary Chips */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800 text-xs">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800/80 text-emerald-400 border border-emerald-950/40">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>In: {fmt(totalIn)}</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800/80 text-rose-400 border border-rose-950/40">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Out: {fmt(totalOut)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
