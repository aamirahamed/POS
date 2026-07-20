import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_COLORS, CATEGORY_ICONS, Transaction } from '@/store/useFinanceStore';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { TxnTag } from '@/utils/financeUtils';

const ALL_CATEGORIES = [
  'Groceries', 'Food & Drinks', 'Transport', 'Shopping', 'Entertainment',
  'Health', 'Income', 'YD Salary', 'Utilities', 'Subscriptions', 'Transfers', 'Other',
];

// Visual badge metadata for non-discretionary tags
const TAG_LABELS: Partial<Record<TxnTag, { label: string; color: string }>> = {
  internal:          { label: 'Internal Transfer', color: '#64748b' },
  rent:              { label: 'Rent',               color: '#818cf8' },
  committed_savings: { label: 'Savings',            color: '#34d399' },
  income_committed:  { label: 'Rent Contribution',  color: '#a78bfa' },
};

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateCategory: (id: string, category: string) => void;
  initialCount?: number;
}

const TransactionRow: FC<{
  txn: Transaction & { tag?: TxnTag };
  onUpdateCategory: (id: string, category: string) => void;
}> = ({ txn, onUpdateCategory }) => {
  const [editingCat, setEditingCat] = useState(false);
  const color = CATEGORY_COLORS[txn.category] ?? '#64748b';
  const icon = CATEGORY_ICONS[txn.category] ?? '📦';

  const tagMeta = txn.tag ? TAG_LABELS[txn.tag] : null;
  const isExcluded = !!tagMeta; // excluded from discretionary spend

  const formattedDate = (() => {
    try {
      return format(new Date(txn.date + 'T00:00:00'), 'dd MMM');
    } catch {
      return txn.date;
    }
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 py-3 px-1 border-b border-white/5 last:border-0 group ${
        isExcluded ? 'opacity-60' : ''
      }`}
    >
      {/* Category icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ background: `${color}18` }}
      >
        {icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate leading-tight">
          {txn.merchantName || txn.transactionDetails.slice(0, 40)}
        </p>
        {editingCat ? (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { onUpdateCategory(txn.id, cat); setEditingCat(false); }}
                className="text-[10px] px-2 py-0.5 rounded-full border transition-colors hover:opacity-80"
                style={{
                  borderColor: CATEGORY_COLORS[cat] ?? '#64748b',
                  color: CATEGORY_COLORS[cat] ?? '#64748b',
                  background: `${CATEGORY_COLORS[cat] ?? '#64748b'}15`,
                }}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setEditingCat(false)}
              className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full border border-white/10"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {/* Non-discretionary badge takes priority */}
            {tagMeta ? (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                style={{
                  color: tagMeta.color,
                  background: `${tagMeta.color}18`,
                  borderColor: `${tagMeta.color}30`,
                }}
              >
                {tagMeta.label}
              </span>
            ) : (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ color, background: `${color}18` }}
              >
                {txn.category}
              </span>
            )}
            <button
              onClick={() => setEditingCat(true)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-all"
            >
              <Edit3 size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Date + Amount */}
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-semibold ${
            txn.isIncome ? 'text-emerald-400' : isExcluded ? 'text-slate-500' : 'text-white'
          }`}
        >
          {txn.isIncome ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{formattedDate}</p>
      </div>
    </motion.div>
  );
};

const TransactionList: FC<TransactionListProps> = ({
  transactions,
  onUpdateCategory,
  initialCount = 12,
}) => {
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? transactions : transactions.slice(0, initialCount);

  if (transactions.length === 0) return (
    <p className="text-xs text-slate-600 text-center py-6">No transactions match this filter</p>
  );

  return (
    <div>
      <div>
        {displayed.map((txn) => (
          <TransactionRow
            key={txn.id}
            txn={txn as Transaction & { tag?: TxnTag }}
            onUpdateCategory={onUpdateCategory}
          />
        ))}
      </div>

      {transactions.length > initialCount && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          {showAll ? (
            <><ChevronUp size={14} /> Show less</>
          ) : (
            <><ChevronDown size={14} /> Show {transactions.length - initialCount} more</>
          )}
        </button>
      )}
    </div>
  );
};

export default TransactionList;
