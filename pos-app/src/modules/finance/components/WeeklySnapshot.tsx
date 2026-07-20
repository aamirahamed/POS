import { FC } from 'react';
import { motion } from 'framer-motion';
import { Home, PiggyBank, Info } from 'lucide-react';
import { HealthStatus, CommittedCosts } from '@/utils/financeUtils';

interface WeeklySnapshotProps {
  cycleLabel: string;
  salaryAmount: number;
  lockedAmount: number;
  usableIncome: number;
  spent: number;             // discretionary only (rent/savings excluded)
  healthStatus: HealthStatus;
  hasPayData: boolean;
  committedCosts?: CommittedCosts | null;
}

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  dim?: boolean;
  accent?: string;
}

const Metric: FC<MetricProps> = ({ label, value, sub, dim, accent }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">{label}</p>
    <p
      className={`text-2xl font-bold leading-none ${dim ? 'text-slate-500' : 'text-white'}`}
      style={accent ? { color: accent } : undefined}
    >
      {value}
    </p>
    {sub && <p className="text-[11px] text-slate-500 mt-1 leading-tight">{sub}</p>}
  </div>
);

const fmt = (n: number) => `$${n.toFixed(0)}`;

const WeeklySnapshot: FC<WeeklySnapshotProps> = ({
  cycleLabel,
  salaryAmount,
  lockedAmount,
  usableIncome,
  spent,
  healthStatus,
  hasPayData,
  committedCosts,
}) => {
  const remaining = usableIncome - spent;
  const savingsRate =
    usableIncome > 0 ? Math.max(0, Math.round(((usableIncome - spent) / usableIncome) * 100)) : null;

  const hasCommitted = committedCosts && (committedCosts.rentProrated > 0 || committedCosts.weeklySavings > 0);
  // True discretionary budget = salary - committed costs
  const trueDiscretionary = hasCommitted
    ? salaryAmount - committedCosts!.totalCommitted
    : usableIncome;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative bg-gradient-to-br from-[#1c2640] to-[#141d2e] border border-white/10 rounded-2xl p-6 overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: healthStatus.color }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-6 relative">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Current Pay Cycle</p>
          <p className="text-sm font-semibold text-slate-200">{cycleLabel}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${healthStatus.bg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${healthStatus.dot} animate-pulse`} />
          <span className="text-xs font-semibold" style={{ color: healthStatus.color }}>
            {healthStatus.label}
          </span>
        </div>
      </div>

      {hasPayData ? (
        <>
          {/* ── Salary + Committed Costs Breakdown ── */}
          <div className="mb-5 pb-5 border-b border-white/6 relative space-y-3">
            {/* Salary row */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Salary Received</p>
              <p className="text-xl font-bold text-white">{fmt(salaryAmount)}</p>
            </div>

            {/* Committed costs — only shown when configured */}
            {hasCommitted && (
              <div className="space-y-1.5">
                {committedCosts!.rentProrated > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Home size={11} className="text-slate-500" />
                      <p className="text-[10px] text-slate-500">
                        Housing (${committedCosts!.rentMonthly}/mo ÷ 2 cycles)
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-400">−{fmt(committedCosts!.rentProrated)}</p>
                  </div>
                )}
                {committedCosts!.weeklySavings > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PiggyBank size={11} className="text-slate-500" />
                      <p className="text-[10px] text-slate-500">Savings Transfer</p>
                    </div>
                    <p className="text-sm font-medium text-slate-400">−{fmt(committedCosts!.weeklySavings)}</p>
                  </div>
                )}
                {/* Divider + true discretionary */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-500/70">
                      True Discretionary Budget
                    </p>
                    <Info size={9} className="text-slate-600" />
                  </div>
                  <p className="text-base font-bold" style={{ color: trueDiscretionary > 0 ? '#34d399' : '#f87171' }}>
                    {trueDiscretionary >= 0 ? fmt(trueDiscretionary) : `−${fmt(Math.abs(trueDiscretionary))}`}
                  </p>
                </div>
              </div>
            )}

            {/* Legacy locked amount — shown only if no committed costs configured */}
            {!hasCommitted && lockedAmount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Committed / Saved</p>
                <p className="text-xl font-semibold text-slate-400">−{fmt(lockedAmount)}</p>
              </div>
            )}
          </div>

          {/* ── Usable income + spend ── */}
          <div className="mb-5 relative">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
              {hasCommitted ? 'Discretionary Spent' : 'Usable Income'}
            </p>
            {hasCommitted ? (
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold" style={{ color: healthStatus.color }}>
                  {fmt(spent)}
                </p>
                <p className="text-sm text-slate-500 mb-1">
                  of {fmt(trueDiscretionary)} budget
                </p>
              </div>
            ) : (
              <>
                <p className="text-4xl font-bold" style={{ color: healthStatus.color }}>
                  {fmt(usableIncome)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Available for lifestyle & spending</p>
              </>
            )}
          </div>

          {/* Bottom metrics */}
          <div className="grid grid-cols-3 gap-4 relative">
            {hasCommitted ? (
              <>
                <Metric label="Spent" value={fmt(spent)} />
                <Metric
                  label="Remaining"
                  value={remaining >= 0 ? fmt(remaining) : `−${fmt(Math.abs(remaining))}`}
                  accent={remaining >= 0 ? '#34d399' : '#f87171'}
                />
                <Metric
                  label="Burn Rate"
                  value={`${Math.round((spent / Math.max(1, trueDiscretionary)) * 100)}%`}
                  sub={spent > trueDiscretionary ? 'Over budget' : 'Of budget'}
                  accent={spent > trueDiscretionary ? '#f87171' : undefined}
                />
              </>
            ) : (
              <>
                <Metric label="Spent" value={fmt(spent)} />
                <Metric
                  label="Remaining"
                  value={remaining >= 0 ? fmt(remaining) : `−${fmt(Math.abs(remaining))}`}
                  accent={remaining >= 0 ? '#34d399' : '#f87171'}
                />
                <Metric
                  label="Savings Rate"
                  value={savingsRate !== null ? `${savingsRate}%` : '—'}
                  sub={savingsRate !== null ? (savingsRate >= 40 ? 'On track' : 'Watch this') : undefined}
                />
              </>
            )}
          </div>

          {/* Progress bar */}
          {(hasCommitted ? trueDiscretionary : usableIncome) > 0 && (
            <div className="mt-5 relative">
              <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (spent / Math.max(1, hasCommitted ? trueDiscretionary : usableIncome)) * 100)}%`
                  }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      spent / Math.max(1, hasCommitted ? trueDiscretionary : usableIncome) > 0.8 ? '#f87171' :
                      spent / Math.max(1, hasCommitted ? trueDiscretionary : usableIncome) > 0.6 ? '#f59e0b' : '#34d399',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-600">$0 spent</span>
                <span className="text-[10px] text-slate-600">
                  {fmt(hasCommitted ? trueDiscretionary : usableIncome)} budget
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* No salary data — fall back to basic spend display */
        <div className="grid grid-cols-2 gap-4 relative">
          <Metric label="Spent This Cycle" value={fmt(spent)} />
          <Metric label="No salary detected" value="—" dim sub="Sync or import salary transactions?" />
        </div>
      )}
    </motion.div>
  );
};

export default WeeklySnapshot;
