import { FC, useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, ChevronLeft, ChevronRight, Search, X, Trash2,
  Building2, CheckCircle2, AlertCircle, Loader2, Banknote, Wallet, Settings2
} from 'lucide-react';
import { useFinanceStore, BankAccount } from '@/store/useFinanceStore';
import { useFinanceSettings } from '@/store/useFinanceSettings';
import {
  detectPayCycles,
  getCurrentPayCycle,
  getPayCycleTransactions,
  getDiscretionarySpend,
  getCategorySpendForWeek,
  getDailySpendingForCycle,
  getFinancialHealthStatus,
  buildWeekComparison,
  generateCycleInsights,
  classifyTransactions,
  PayCycle,
} from '@/utils/financeUtils';

import WeeklySnapshot from './components/WeeklySnapshot';
import WeekComparison from './components/WeekComparison';
import WeeklyInsights from './components/WeeklyInsights';
import DailyTimeline from './components/DailyTimeline';
import TransactionList from './components/TransactionList';

// ── Account Tab Selector ──────────────────────────────────────────────────────
const AccountSelector: FC<{
  accounts: BankAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ accounts, selectedId, onSelect }) => {
  if (accounts.length === 0) return null;

  return (
    <div className="flex gap-2 p-1 bg-white/4 border border-white/6 rounded-2xl">
      {accounts.map((account) => {
        const isSelected = selectedId === account.id;
        // Short label: "Personal" or "Savings" from account name
        const shortName = account.name.replace(/Account\s*#\d+/i, '').trim() || account.name;
        return (
          <motion.button
            key={account.id}
            onClick={() => onSelect(account.id)}
            layout
            className={`relative flex-1 flex flex-col items-start px-4 py-3 rounded-xl transition-all duration-200 text-left ${
              isSelected
                ? 'bg-[#1e2d45] border border-emerald-500/25 shadow-[0_0_16px_rgba(52,211,153,0.08)]'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="account-tab-indicator"
                className="absolute inset-0 rounded-xl bg-emerald-500/5"
              />
            )}
            <div className="relative flex items-center gap-2 w-full">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-emerald-500/20' : 'bg-white/8'
              }`}>
                {account.type === 'savings' || account.name.toLowerCase().includes('saving') ? (
                  <Wallet size={13} className={isSelected ? 'text-emerald-400' : 'text-slate-400'} />
                ) : (
                  <Building2 size={13} className={isSelected ? 'text-emerald-400' : 'text-slate-400'} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                  {shortName}
                </p>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">
                  {account.accountNumber}
                </p>
              </div>
              {isSelected && (
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </div>
            {/* Balance */}
            <div className="relative mt-2 pl-9">
              {account.balance != null && account.balance !== 0 ? (
                <p className={`text-base font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                  ${account.balance.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              ) : (
                <p className="text-xs text-slate-600 italic">—</p>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

// ── Sync Status Bar ───────────────────────────────────────────────────────────
const SyncBar: FC<{ onSync: () => void; isSyncing: boolean; lastSynced: string | null }> = ({
  onSync, isSyncing, lastSynced
}) => {
  const lastSyncLabel = lastSynced
    ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSynced))
    : null;

  return (
    <div className="flex items-center justify-between bg-white/3 border border-white/6 rounded-xl px-4 py-2.5">
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <Loader2 size={13} className="text-emerald-400 animate-spin" />
        ) : (
          <CheckCircle2 size={13} className="text-emerald-400" />
        )}
        <span className="text-xs text-slate-400">
          {isSyncing
            ? 'Syncing transactions from NAB...'
            : lastSyncLabel
            ? `Last synced ${lastSyncLabel}`
            : 'Connected to National Australia Bank'}
        </span>
      </div>
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState: FC<{ onSync: () => void; isSyncing: boolean; error: string | null }> = ({
  onSync, isSyncing, error
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 text-center px-6"
  >
    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
      <Banknote size={36} className="text-emerald-400" />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Connect Your Bank</h2>
    <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-1">
      Your NAB accounts are linked via Redbark Open Banking. Click below to pull in your latest transactions.
    </p>
    <p className="text-slate-600 text-xs mb-8">Powered by Consumer Data Right (CDR) · Read-only access</p>

    {error && (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 max-w-sm text-left">
        <AlertCircle size={14} className="text-red-400 shrink-0" />
        <p className="text-xs text-red-300">{error}</p>
      </div>
    )}

    <button
      onClick={onSync}
      disabled={isSyncing}
      id="finance-sync-btn"
      className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_8px_24px_rgba(52,211,153,0.25)]"
    >
      {isSyncing ? (
        <><Loader2 size={16} className="animate-spin" /> Syncing NAB Transactions...</>
      ) : (
        <><RefreshCw size={16} /> Sync Bank Accounts</>
      )}
    </button>
  </motion.div>
);

// ── No Pay Cycle Banner ───────────────────────────────────────────────────────
const NoCycleBanner: FC<{ accountName: string }> = ({ accountName }) => (
  <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
    <p className="font-medium mb-0.5">No salary deposits detected in {accountName}</p>
    <p className="text-amber-400/70 text-xs">
      Looking for payroll credits to define pay cycles. Showing all transactions for this account as a fallback.
    </p>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const FinancePage: FC = () => {
  const {
    transactions,
    bankAccounts,
    updateTransactionCategory,
    clearTransactions,
    syncBankData,
    loadFromSupabase,
    isSyncing,
    syncError,
    lastSyncedAt,
  } = useFinanceStore();

  const settings = useFinanceSettings();

  const [showClear, setShowClear] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Spending' | 'Income' | 'Internal'>('All');
  const [syncSuccess, setSyncSuccess] = useState<number | null>(null);

  // ── Account selection: default to first (Personal) account ───────────────
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Auto-select first account once accounts load
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts]);

  // When account changes, reset cycle navigation
  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    setManualIdx(null);
    setSearch('');
    setFilterType('All');
  };

  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId) ?? bankAccounts[0] ?? null;

  // ── Transactions scoped to selected account, then classified ─────────────
  const classifiedTxns = useMemo(() => {
    const allAccountTxns = selectedAccount
      ? transactions.filter(t => t.accountName === selectedAccount.name)
      : transactions;
    return classifyTransactions(allAccountTxns, {
      fullRent: settings.fullRent,
      rentShare: settings.rentShare,
    });
  }, [transactions, selectedAccount?.id, settings.fullRent, settings.rentShare]);

  // Backwards-compat alias
  const accountTxns = classifiedTxns;

  // Load from Supabase on mount
  useEffect(() => {
    loadFromSupabase();
  }, []);

  const handleSync = async () => {
    setSyncSuccess(null);
    const result = await syncBankData();
    if (!result.error) {
      setSyncSuccess(result.synced);
      setTimeout(() => setSyncSuccess(null), 4000);
    }
  };

  // ── Detect pay cycles (scoped to selected account) ────────────────────────
  const payCycles = useMemo(() => detectPayCycles(accountTxns), [accountTxns]);
  const hasPayCycles = payCycles.length > 0;

  const sortedCycles = useMemo(
    () => [...payCycles].sort((a, b) => b.cycleStart.localeCompare(a.cycleStart)),
    [payCycles]
  );

  const currentCycleIdx = useMemo(() => {
    if (sortedCycles.length === 0) return 0;
    const cur = getCurrentPayCycle(sortedCycles);
    return sortedCycles.findIndex((c) => c.id === cur?.id) ?? 0;
  }, [sortedCycles]);

  const [manualIdx, setManualIdx] = useState<number | null>(null);
  const activeCycleIdx = manualIdx ?? currentCycleIdx;
  const activeCycle: PayCycle | null = sortedCycles[activeCycleIdx] ?? null;

  const canGoNewer = activeCycleIdx > 0;
  const canGoOlder = activeCycleIdx < sortedCycles.length - 1;
  const isCurrentCycle = activeCycleIdx === currentCycleIdx;

  // ── Derive this cycle's data ──────────────────────────────────────────────
  const thisCycleTxns = useMemo(
    () => (activeCycle ? getPayCycleTransactions(accountTxns, activeCycle) : []),
    [accountTxns, activeCycle?.id]
  );

  const discretionaryTxns = useMemo(
    () => getDiscretionarySpend(thisCycleTxns, activeCycle?.lockedTxnId ?? null),
    [thisCycleTxns, activeCycle?.lockedTxnId]
  );

  const thisCycleCats = useMemo(
    () => getCategorySpendForWeek(discretionaryTxns),
    [discretionaryTxns]
  );

  const spent = useMemo(
    () => discretionaryTxns.reduce((s, t) => s + Math.abs(t.amount), 0),
    [discretionaryTxns]
  );

  const usableIncome = activeCycle?.usableIncome ?? 0;
  const healthStatus = useMemo(
    () => getFinancialHealthStatus(spent, usableIncome),
    [spent, usableIncome]
  );

  const dailyDays = useMemo(
    () => (activeCycle ? getDailySpendingForCycle(thisCycleTxns, activeCycle) : []),
    [thisCycleTxns, activeCycle?.id]
  );

  const prevCycle = sortedCycles[activeCycleIdx + 1] ?? null;
  const twoCyclesAgo = sortedCycles[activeCycleIdx + 2] ?? null;

  const prevCycleTxns = useMemo(
    () => (prevCycle ? getPayCycleTransactions(accountTxns, prevCycle) : []),
    [accountTxns, prevCycle?.id]
  );
  const twoCyclesAgoTxns = useMemo(
    () => (twoCyclesAgo ? getPayCycleTransactions(accountTxns, twoCyclesAgo) : []),
    [accountTxns, twoCyclesAgo?.id]
  );

  const prevCycleCats = useMemo(
    () => getCategorySpendForWeek(getDiscretionarySpend(prevCycleTxns, prevCycle?.lockedTxnId ?? null)),
    [prevCycleTxns, prevCycle?.lockedTxnId]
  );
  const twoCyclesAgoCats = useMemo(
    () => getCategorySpendForWeek(getDiscretionarySpend(twoCyclesAgoTxns, twoCyclesAgo?.lockedTxnId ?? null)),
    [twoCyclesAgoTxns, twoCyclesAgo?.lockedTxnId]
  );

  const comparisonRows = useMemo(
    () => buildWeekComparison(thisCycleCats, prevCycleCats, twoCyclesAgoCats),
    [thisCycleCats, prevCycleCats, twoCyclesAgoCats]
  );

  const insights = useMemo(
    () => generateCycleInsights(thisCycleCats, prevCycleCats, usableIncome),
    [thisCycleCats, prevCycleCats, usableIncome]
  );

  // ── Filtered transactions ─────────────────────────────────────────────────
  // For the transaction list we show ALL tagged transactions (including internal/rent)
  // so the user can see them — they're only excluded from the spending calculations above.
  const filteredTxns = useMemo(() => {
    // Show full account history, not just current cycle, for the list
    const haystack = accountTxns.slice(0, 300);
    return haystack.filter((t) => {
      if (
        search &&
        !t.merchantName.toLowerCase().includes(search.toLowerCase()) &&
        !t.transactionDetails.toLowerCase().includes(search.toLowerCase())
      ) return false;

      const tag = (t as any).tag as string | undefined;

      if (filterType === 'Spending') return t.isSpending && tag !== 'rent_payment';
      if (filterType === 'Income') return t.isIncome && tag !== 'rent_contribution' && tag !== 'internal';
      if (filterType === 'Internal') return tag === 'internal' || tag === 'rent_payment' || tag === 'rent_contribution';
      return true; // 'All'
    });
  }, [accountTxns, search, filterType]);

  const handleUpdateCategory = useCallback(updateTransactionCategory, [updateTransactionCategory]);
  const hasData = transactions.length > 0;
  const hasBankAccounts = bankAccounts.length > 0;
  const cycleLabel = activeCycle?.label ?? '—';

  return (
    <div className="min-h-full bg-[#0d1525]">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-[#0d1525]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            {/* Left: title + cycle nav */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Finance</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {hasBankAccounts ? 'NAB · Live Sync' : 'Pay Cycle Tracker'}
                </p>
              </div>

              {hasData && hasPayCycles && (
                <div className="flex items-center gap-0.5 bg-white/5 rounded-xl px-1 py-1 border border-white/6">
                  <button
                    onClick={() => setManualIdx(Math.min(activeCycleIdx + 1, sortedCycles.length - 1))}
                    disabled={!canGoOlder}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Older cycle"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setManualIdx(currentCycleIdx)}
                    className="px-2 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap max-w-[120px] truncate"
                    title={isCurrentCycle ? 'Current cycle' : cycleLabel}
                  >
                    {isCurrentCycle ? 'Current Cycle' : cycleLabel}
                  </button>
                  <button
                    onClick={() => setManualIdx(Math.max(activeCycleIdx - 1, 0))}
                    disabled={!canGoNewer}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Newer cycle"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              {hasData && (
                <button
                  onClick={() => setShowClear(true)}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Clear all data"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                onClick={() => setShowSettings(s => !s)}
                className={`p-2 rounded-xl transition-colors ${
                  showSettings ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
                title="Finance settings"
              >
                <Settings2 size={15} />
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                id="finance-sync-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(52,211,153,0.2)]"
              >
                {isSyncing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sync success toast ── */}
      <AnimatePresence>
        {syncSuccess !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl text-emerald-300 text-xs font-medium px-4 py-2.5 rounded-full shadow-xl"
          >
            <CheckCircle2 size={13} />
            {syncSuccess} transactions synced successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rent Settings Popover ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-3xl mx-auto px-4 pt-3"
          >
            <div className="bg-[#1a2235] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Rent Settings</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Used to hide the rent debit and flag roommate payments correctly
                  </p>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                    Full Monthly Rent
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      value={settings.fullRent}
                      onChange={e => settings.update({ fullRent: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/40 transition-colors"
                      placeholder="2934"
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Total rent both shares (hidden from expenses)</p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                    Your Rent Share
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      value={settings.rentShare}
                      onChange={e => settings.update({ rentShare: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/40 transition-colors"
                      placeholder="1467"
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Roommate payments & savings transfers of this amount are hidden</p>
                </div>
              </div>

              <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between"><span>$2,934 rent debit</span><span className="text-slate-500">Hidden from spending ✓</span></div>
                <div className="flex justify-between"><span>Nasih's ~$1,467 credit</span><span className="text-slate-500">Hidden from income ✓</span></div>
                <div className="flex justify-between"><span>Savings→Personal ~$1,467</span><span className="text-slate-500">Hidden from income ✓</span></div>
                <div className="flex justify-between"><span>$410/wk to Savings</span><span className="text-emerald-400">Shown as Rent & Bills ✓</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clear confirm ── */}
      {showClear && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1a2235] border border-white/10 rounded-2xl p-6 max-w-sm w-full"
          >
            <h3 className="text-white font-semibold mb-2">Clear all data?</h3>
            <p className="text-slate-400 text-sm mb-5">
              Removes all locally cached transactions. Re-sync anytime from Redbark.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClear(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { clearTransactions(); setShowClear(false); setManualIdx(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm text-white bg-red-500/80 hover:bg-red-500 transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-5">

        {/* ── Account Selector + Sync Bar ── always visible when accounts exist */}
        {hasBankAccounts && (
          <>
            <AccountSelector
              accounts={bankAccounts}
              selectedId={selectedAccountId}
              onSelect={handleSelectAccount}
            />
            <SyncBar onSync={handleSync} isSyncing={isSyncing} lastSynced={lastSyncedAt} />
          </>
        )}

        {!hasData ? (
          <EmptyState onSync={handleSync} isSyncing={isSyncing} error={syncError} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedAccountId ?? 'all'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              {!hasPayCycles && <NoCycleBanner accountName={selectedAccount?.name ?? 'this account'} />}

              {/* 1 — Pay Cycle Snapshot */}
              <WeeklySnapshot
                cycleLabel={cycleLabel}
                salaryAmount={activeCycle?.salaryAmount ?? 0}
                lockedAmount={activeCycle?.lockedAmount ?? 0}
                usableIncome={usableIncome}
                spent={spent}
                healthStatus={healthStatus}
                hasPayData={hasPayCycles}

              />

              {/* 2 — Cycle-over-Cycle Comparison */}
              <WeekComparison rows={comparisonRows} hasTwoWeeksAgo={twoCyclesAgoTxns.length > 0} />

              {/* 3 — Cycle Insights */}
              {insights.length > 0 && <WeeklyInsights insights={insights} />}

              {/* 4 — Daily Timeline */}
              <DailyTimeline days={dailyDays} />

              {/* 5 — Transactions */}
              <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder={`Search ${selectedAccount?.name ?? 'transactions'}…`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2.5 bg-white/4 border border-white/8 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 bg-white/4 rounded-xl p-1 shrink-0">
                    {(['All', 'Spending', 'Income', 'Internal'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilterType(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          filterType === f ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <TransactionList
                  transactions={filteredTxns}
                  onUpdateCategory={handleUpdateCategory}
                  initialCount={12}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default FinancePage;
