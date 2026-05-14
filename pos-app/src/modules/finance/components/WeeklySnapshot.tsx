import { FC } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { HealthStatus } from '@/utils/financeUtils';

interface WeeklySnapshotProps {
  cycleLabel: string;
  salaryAmount: number;
  lockedAmount: number;
  usableIncome: number;
  spent: number;             // discretionary only
  healthStatus: HealthStatus;
  hasPayData: boolean;
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

const WeeklySnapshot: FC<WeeklySnapshotProps> = ({
  cycleLabel,
  salaryAmount,
  lockedAmount,
  usableIncome,
  spent,
  healthStatus,
  hasPayData,
}) => {
  const remaining = usableIncome - spent;
  const savingsRate =
    usableIncome > 0 ? Math.max(0, Math.round(((usableIncome - spent) / usableIncome) * 100)) : null;

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
          {/* Salary row */}
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/6 relative">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Salary Received</p>
              <p className="text-3xl font-bold text-white">${salaryAmount.toFixed(0)}</p>
            </div>
            {lockedAmount > 0 && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 mb-1">
                  <Lock size={10} className="text-slate-500" />
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Rent / Savings</p>
                </div>
                <p className="text-xl font-semibold text-slate-400">-${lockedAmount.toFixed(0)}</p>
              </div>
            )}
          </div>

          {/* Usable income highlight */}
          <div className="mb-5 relative">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Usable Income</p>
            <p className="text-4xl font-bold" style={{ color: healthStatus.color }}>
              ${usableIncome.toFixed(0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Available for lifestyle & spending</p>
          </div>

          {/* Bottom metrics */}
          <div className="grid grid-cols-3 gap-4 relative">
            <Metric label="Spent" value={`$${spent.toFixed(0)}`} />
            <Metric
              label="Remaining"
              value={remaining >= 0 ? `$${remaining.toFixed(0)}` : `-$${Math.abs(remaining).toFixed(0)}`}
              accent={remaining >= 0 ? '#34d399' : '#f87171'}
            />
            <Metric
              label="Savings Rate"
              value={savingsRate !== null ? `${savingsRate}%` : '—'}
              sub={savingsRate !== null ? (savingsRate >= 40 ? 'On track' : 'Watch this') : undefined}
            />
          </div>

          {/* Progress bar: spent vs usable */}
          {usableIncome > 0 && (
            <div className="mt-5 relative">
              <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (spent / usableIncome) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      spent / usableIncome > 0.8 ? '#f87171' :
                      spent / usableIncome > 0.6 ? '#f59e0b' : '#34d399',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-600">$0 spent</span>
                <span className="text-[10px] text-slate-600">${usableIncome.toFixed(0)} usable</span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* No salary data — fall back to basic spend display */
        <div className="grid grid-cols-2 gap-4 relative">
          <Metric label="Spent This Cycle" value={`$${spent.toFixed(0)}`} />
          <Metric label="No salary detected" value="—" dim sub="Import includes salary transactions?" />
        </div>
      )}
    </motion.div>
  );
};

export default WeeklySnapshot;
