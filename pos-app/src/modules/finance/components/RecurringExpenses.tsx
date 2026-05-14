import { FC } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/store/useFinanceStore';
import { RefreshCcw } from 'lucide-react';

interface RecurringItem {
  merchantName: string;
  category: string;
  count: number;
  avgAmount: number;
  lastDate: string;
  frequency: string;
}

interface RecurringExpensesProps {
  data: RecurringItem[];
}

const FREQ_COLORS: Record<string, string> = {
  Weekly: '#34d399',
  Fortnightly: '#60a5fa',
  Monthly: '#a78bfa',
  Quarterly: '#f59e0b',
  Occasionally: '#64748b',
};

const RecurringExpenses: FC<RecurringExpensesProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Recurring Expenses</h3>
        <p className="text-slate-500 text-sm text-center py-6">
          Import more transactions to detect recurring expenses
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Recurring Expenses</h3>
        <RefreshCcw size={14} className="text-slate-500" />
      </div>

      <div className="flex flex-col gap-3">
        {data.slice(0, 8).map((item, i) => {
          const catColor = CATEGORY_COLORS[item.category] ?? '#64748b';
          const catIcon = CATEGORY_ICONS[item.category] ?? '📦';
          const freqColor = FREQ_COLORS[item.frequency] ?? '#64748b';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ background: `${catColor}18` }}
              >
                {catIcon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.merchantName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ color: freqColor, background: `${freqColor}18` }}
                  >
                    {item.frequency}
                  </span>
                  <span className="text-[10px] text-slate-500">{item.count}× seen</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-white">${item.avgAmount.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">avg/visit</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RecurringExpenses;
