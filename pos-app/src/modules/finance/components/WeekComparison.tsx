import { FC } from 'react';
import { motion } from 'framer-motion';
import { WeekComparisonRow } from '@/utils/financeUtils';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '@/store/useFinanceStore';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WeekComparisonProps {
  rows: WeekComparisonRow[];
  hasTwoWeeksAgo: boolean;
  onCategoryClick?: (category: string) => void;
  selectedCategory?: string | null;
}

const fmt = (n: number) => (n > 0 ? `$${n.toFixed(0)}` : '—');

const ChangeChip: FC<{ pct: number | null; thisWeek: number; lastWeek: number }> = ({ pct, thisWeek, lastWeek }) => {
  if (thisWeek === 0 && lastWeek === 0) return <span className="text-slate-600 text-xs">—</span>;
  if (lastWeek === 0 && thisWeek > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
        <TrendingUp size={11} /> New
      </span>
    );
  }
  if (pct === null) return <span className="text-slate-500 text-xs">—</span>;

  const abs = Math.abs(pct);
  const isUp = pct > 0;

  if (abs < 8) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
        <Minus size={10} /> Stable
      </span>
    );
  }

  const color = isUp ? 'text-red-400' : 'text-emerald-400';
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon size={11} />
      {Math.round(abs)}%
    </span>
  );
};

const WeekComparison: FC<WeekComparisonProps> = ({ rows, hasTwoWeeksAgo, onCategoryClick, selectedCategory }) => {
  if (rows.length === 0) {
    return (
      <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-white uppercase tracking-widest mb-3">Week-over-Week</h3>
        <p className="text-slate-500 text-sm text-center py-6">Import more weeks to unlock comparison</p>
      </div>
    );
  }

  const maxSpend = Math.max(...rows.map((r) => Math.max(r.thisWeek, r.lastWeek, r.twoWeeksAgo)), 1);

  return (
    <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white uppercase tracking-widest">Cycle-over-Cycle Spending</h3>
        <div className="hidden sm:flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-wider">
          {hasTwoWeeksAgo && <span>2 Cycles Ago</span>}
          <span>Prev Cycle</span>
          <span className="text-slate-300">This Cycle</span>
          <span>Change</span>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-white/5">
        {rows.map((row, i) => {
          const icon = CATEGORY_ICONS[row.category] ?? '📦';
          const color = CATEGORY_COLORS[row.category] ?? '#64748b';
          const thisBarW = (row.thisWeek / maxSpend) * 100;
          const lastBarW = (row.lastWeek / maxSpend) * 100;
          const isSelected = selectedCategory === row.category;

          return (
            <motion.div
              key={row.category}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onCategoryClick?.(row.category)}
              className={`py-3 flex flex-col gap-2 cursor-pointer transition-all rounded-xl px-2 -mx-2 hover:bg-white/5 active:scale-[0.99] ${
                isSelected ? 'bg-white/5 border-l-2 border-l-indigo-500 pl-3' : ''
              }`}
            >
              {/* Top row: icon + name + amounts + change */}
              <div className="flex items-center gap-3">
                <span className="text-base w-6 text-center shrink-0">{icon}</span>
                <span className="flex-1 text-sm font-medium text-white min-w-0 truncate">{row.category}</span>

                {/* Amounts — hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-4">
                  {hasTwoWeeksAgo && (
                    <span className="w-14 text-right text-sm text-slate-600">{fmt(row.twoWeeksAgo)}</span>
                  )}
                  <span className="w-14 text-right text-sm text-slate-400">{fmt(row.lastWeek)}</span>
                  <span className="w-14 text-right text-sm font-semibold text-white">{fmt(row.thisWeek)}</span>
                  <div className="w-16 text-right">
                    <ChangeChip pct={row.changePct} thisWeek={row.thisWeek} lastWeek={row.lastWeek} />
                  </div>
                </div>

                {/* Mobile: just amounts + change */}
                <div className="flex sm:hidden items-center gap-3">
                  <span className="text-sm text-slate-400">{fmt(row.lastWeek)}</span>
                  <span className="text-slate-600 text-xs">→</span>
                  <span className="text-sm font-semibold text-white">{fmt(row.thisWeek)}</span>
                  <ChangeChip pct={row.changePct} thisWeek={row.thisWeek} lastWeek={row.lastWeek} />
                </div>
              </div>

              {/* Mini bar comparison */}
              <div className="ml-9 flex flex-col gap-1">
                {row.lastWeek > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-600 w-14 shrink-0">Last week</span>
                    <div className="flex-1 h-1 bg-white/4 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-white/20" style={{ width: `${lastBarW}%` }} />
                    </div>
                  </div>
                )}
                {row.thisWeek > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-14 shrink-0">This week</span>
                    <div className="flex-1 h-1 bg-white/4 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${thisBarW}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: color }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Column legend (mobile) */}
      <div className="flex sm:hidden items-center justify-end gap-3 mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-600">
        <span>Prev cycle → This cycle · Change</span>
      </div>
    </div>
  );
};

export default WeekComparison;
