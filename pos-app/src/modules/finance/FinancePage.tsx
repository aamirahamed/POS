import { FC, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, ChevronLeft, ChevronRight, Search, X, Trash2 } from 'lucide-react';
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

import ImportModal from './components/ImportModal';
import WeeklySnapshot from './components/WeeklySnapshot';
import WeekComparison from './components/WeekComparison';
import WeeklyInsights from './components/WeeklyInsights';
import DailyTimeline from './components/DailyTimeline';
import TransactionList from './components/TransactionList';

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState: FC<{ onImport: () => void }> = ({ onImport }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-24 text-center px-6"
  >
    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-6 text-4xl">
      💳
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Pay Cycle Awareness</h2>
    <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-2">
      Import 60 days of NAB transactions to track your spending against each pay cycle.
    </p>
    <p className="text-slate-600 text-xs mb-8">
      Salary → Locked $350 → Usable Income → Spending
    </p>
    <button
      onClick={onImport}
      id="finance-import-btn"
      className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_8px_24px_rgba(52,211,153,0.25)]"
    >
      <Upload size={16} />
      Import NAB Transactions
    </button>
  </motion.div>
);

// ── No Pay Cycle Banner ───────────────────────────────────────────────────────
const NoCycleBanner: FC = () => (
  <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
    <p className="font-medium mb-0.5">No salary transactions detected</p>
    <p className="text-amber-400/70 text-xs">
      The system looks for TransactionType "Salary" in your NAB export. Ensure your CSV includes salary credits.
      Showing all transactions grouped by calendar week as a fallback.
    </p>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const FinancePage: FC = () => {
  const { transactions, updateTransactionCategory, clearTransactions } = useFinanceStore();
  const [importOpen, setImportOpen] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Spending' | 'Income'>('All');

  // ── Detect pay cycles ─────────────────────────────────────────────────────
  const payCycles = useMemo(() => detectPayCycles(transactions), [transactions]);
  const hasPayCycles = payCycles.length > 0;

  // Navigate pay cycles (newest first index = 0)
  const [cycleIdx, setCycleIdx] = useState(0);

  // Newest-first list for navigation
  const sortedCycles = useMemo(
    () => [...payCycles].sort((a, b) => b.cycleStart.localeCompare(a.cycleStart)),
    [payCycles]
  );

  // On new import, jump to the current cycle
  const currentCycleIdx = useMemo(() => {
    if (sortedCycles.length === 0) return 0;
    const cur = getCurrentPayCycle(sortedCycles);
    return sortedCycles.findIndex((c) => c.id === cur?.id) ?? 0;
  }, [sortedCycles]);

  // Active cycle (use currentCycleIdx as default, allow manual navigation)
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

  // ── Previous and two-cycles-ago data ─────────────────────────────────────
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
    return thisCycleTxns.filter((t) => {
      if (
        search &&
        !t.merchantName.toLowerCase().includes(search.toLowerCase()) &&
        !t.transactionDetails.toLowerCase().includes(search.toLowerCase())
      ) return false;
      if (filterType === 'Spending' && !t.isSpending) return false;
      if (filterType === 'Income' && !t.isIncome) return false;
      return true;
    });
  }, [thisCycleTxns, search, filterType]);

  const handleUpdateCategory = useCallback(updateTransactionCategory, [updateTransactionCategory]);
  const hasData = transactions.length > 0;

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
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pay Cycle Tracker</p>
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
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                onClick={() => setImportOpen(true)}
                id="finance-import-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(52,211,153,0.2)]"
              >
                <Upload size={13} />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>

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
              Removes all transactions. Category corrections are kept.
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
        {!hasData ? (
          <EmptyState onImport={() => setImportOpen(true)} />
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

            {/* 4 — Daily Timeline (Thu–Wed) */}
            <DailyTimeline days={dailyDays} />

            {/* 5 — Transactions (lower priority) */}
            <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search this cycle…"
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

      <ImportModal
        isOpen={importOpen}
        onClose={() => {
          setImportOpen(false);
          setManualIdx(null); // return to current cycle after import
        }}
      />
    </div>
  );
};

export default FinancePage;
