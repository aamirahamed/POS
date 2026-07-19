import { FC, useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, ChevronLeft, ChevronRight, Search, X, Trash2,
  Building2, CheckCircle2, AlertCircle, Loader2, Banknote
} from 'lucide-react';
import { useFinanceStore } from '@/store/useFinanceStore';
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
  PayCycle,
} from '@/utils/financeUtils';

import WeeklySnapshot from './components/WeeklySnapshot';
import WeekComparison from './components/WeekComparison';
import WeeklyInsights from './components/WeeklyInsights';
import DailyTimeline from './components/DailyTimeline';
import TransactionList from './components/TransactionList';

// ── Bank Account Cards ────────────────────────────────────────────────────────
const AccountCards: FC<{ onSync: () => void; isSyncing: boolean; lastSynced: string | null }> = ({
  onSync, isSyncing, lastSynced
}) => {
  const { bankAccounts, transactions } = useFinanceStore();

  const totalBalance = bankAccounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const lastSyncLabel = lastSynced
    ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSynced))
    : null;

  // Calculate total spend across all txns this calendar month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSpend = transactions
    .filter(t => t.date.startsWith(thisMonth) && t.isSpending)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-3">
      {/* Connected accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bankAccounts.map((account) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1a2235] to-[#141d2e] border border-white/8 rounded-2xl p-4 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-6 translate-x-6" />
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Building2 size={15} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white leading-tight">{account.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{account.accountNumber}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-medium">
                Live
              </span>
            </div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">{account.institutionName}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-xs text-slate-400 capitalize">{account.type} · {account.currency}</p>
              {account.balance != null && account.balance !== 0 ? (
                <p className="text-lg font-bold text-white">
                  ${account.balance.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              ) : (
                <p className="text-sm text-slate-600 italic">Sync to load balance</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sync status bar */}
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
const NoCycleBanner: FC = () => (
  <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
    <p className="font-medium mb-0.5">No salary transactions detected</p>
    <p className="text-amber-400/70 text-xs">
      Looking for salary credits to define pay cycles. Showing all transactions grouped by calendar week as a fallback.
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

  const [showClear, setShowClear] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Spending' | 'Income'>('All');
  const [syncSuccess, setSyncSuccess] = useState<number | null>(null);

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

  // ── Detect pay cycles ─────────────────────────────────────────────────────
  const payCycles = useMemo(() => detectPayCycles(transactions), [transactions]);
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
    () => (activeCycle ? getPayCycleTransactions(transactions, activeCycle) : []),
    [transactions, activeCycle?.id]
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
    () => (prevCycle ? getPayCycleTransactions(transactions, prevCycle) : []),
    [transactions, prevCycle?.id]
  );
  const twoCyclesAgoTxns = useMemo(
    () => (twoCyclesAgo ? getPayCycleTransactions(transactions, twoCyclesAgo) : []),
    [transactions, twoCyclesAgo?.id]
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
  const filteredTxns = useMemo(() => {
    const haystack = hasPayCycles && activeCycle ? thisCycleTxns : transactions.slice(0, 200);
    return haystack.filter((t) => {
      if (
        search &&
        !t.merchantName.toLowerCase().includes(search.toLowerCase()) &&
        !t.transactionDetails.toLowerCase().includes(search.toLowerCase())
      ) return false;
      if (filterType === 'Spending' && !t.isSpending) return false;
      if (filterType === 'Income' && !t.isIncome) return false;
      return true;
    });
  }, [thisCycleTxns, transactions, search, filterType, hasPayCycles, activeCycle]);

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
        {/* Bank account cards — always show if connected */}
        {hasBankAccounts && (
          <AccountCards onSync={handleSync} isSyncing={isSyncing} lastSynced={lastSyncedAt} />
        )}

        {!hasData ? (
          <EmptyState onSync={handleSync} isSyncing={isSyncing} error={syncError} />
        ) : (
          <>
            {!hasPayCycles && <NoCycleBanner />}

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
                    placeholder="Search transactions…"
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
                  {(['All', 'Spending', 'Income'] as const).map((f) => (
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
          </>
        )}
      </div>
    </div>
  );
};

export default FinancePage;
