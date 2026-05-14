import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TransactionType = 'debit' | 'credit';

export interface Transaction {
  id: string;
  date: string;           // ISO date string
  amount: number;         // positive = credit, negative = debit
  accountNumber: string;
  transactionType: string;
  transactionDetails: string;
  balance: number;
  category: string;
  merchantName: string;
  processedOn: string;
  // derived
  isIncome: boolean;
  isSpending: boolean;
}

export interface CategoryCorrection {
  merchantKey: string;   // lowercase merchant name
  category: string;
}

export interface FinanceState {
  transactions: Transaction[];
  categoryCorrections: CategoryCorrection[];
  lastImportDate: string | null;
  // actions
  importTransactions: (transactions: Transaction[]) => void;
  updateTransactionCategory: (id: string, category: string) => void;
  clearTransactions: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, string> = {
  'Groceries': '🛒',
  'Food & Drinks': '🍔',
  'Transport': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Health': '💊',
  'Income': '💰',
  'YD Salary': '💼',
  'Utilities': '⚡',
  'Subscriptions': '📱',
  'Transfers': '🔄',
  'Other': '📦',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#34d399',
  'Food & Drinks': '#f59e0b',
  'Transport': '#60a5fa',
  'Shopping': '#a78bfa',
  'Entertainment': '#f472b6',
  'Health': '#2dd4bf',
  'Income': '#10b981',
  'YD Salary': '#10b981',
  'Utilities': '#fb923c',
  'Subscriptions': '#818cf8',
  'Transfers': '#94a3b8',
  'Other': '#64748b',
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categoryCorrections: [],
      lastImportDate: null,

      importTransactions: (incoming) => {
        const { transactions, categoryCorrections } = get();

        // Merge: deduplicate by id, incoming wins
        const existingIds = new Set(transactions.map((t) => t.id));
        const newTxns = incoming.filter((t) => !existingIds.has(t.id));

        // Apply stored corrections
        const corrected = newTxns.map((t) => {
          const key = t.merchantName.trim().toLowerCase();
          const correction = categoryCorrections.find((c) => c.merchantKey === key);
          if (correction) return { ...t, category: correction.category };
          return t;
        });

        set({
          transactions: [...transactions, ...corrected].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
          lastImportDate: new Date().toISOString(),
        });
      },

      updateTransactionCategory: (id, category) => {
        const { transactions, categoryCorrections } = get();
        const txn = transactions.find((t) => t.id === id);

        const updated = transactions.map((t) =>
          t.id === id ? { ...t, category } : t
        );

        // Remember this correction for future imports
        if (txn) {
          const key = txn.merchantName.trim().toLowerCase();
          const exists = categoryCorrections.find((c) => c.merchantKey === key);
          const newCorrections = exists
            ? categoryCorrections.map((c) => (c.merchantKey === key ? { ...c, category } : c))
            : [...categoryCorrections, { merchantKey: key, category }];

          set({ transactions: updated, categoryCorrections: newCorrections });
        } else {
          set({ transactions: updated });
        }
      },

      clearTransactions: () => {
        set({ transactions: [], lastImportDate: null });
      },
    }),
    {
      name: 'pos-finance-store',
    }
  )
);
