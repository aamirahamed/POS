import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TransactionType = 'debit' | 'credit';

export interface Transaction {
  id: string;
  date: string;           // ISO date string
  amount: number;         // positive = credit, negative = debit
  accountNumber: string;
  accountName: string;
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

export interface BankAccount {
  id: string;
  connectionId: string;
  name: string;
  institutionName: string;
  accountNumber: string;
  type: string;
  currency: string;
  balance: number;
  lastSyncedAt: string | null;
}

export interface CategoryCorrection {
  merchantKey: string;   // lowercase merchant name
  category: string;
}

export interface FinanceState {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  categoryCorrections: CategoryCorrection[];
  lastImportDate: string | null;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: string | null;
  // actions
  importTransactions: (transactions: Transaction[]) => void;
  updateTransactionCategory: (id: string, category: string) => void;
  clearTransactions: () => void;
  syncBankData: () => Promise<{ synced: number; error?: string }>;
  loadFromSupabase: () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, string> = {
  'Groceries': '🛒',
  'Food & Drinks': '🍔',
  'Transport': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Health & Lifestyle': '🧘',
  'Income': '💰',
  'YD Salary': '💼',
  'Utilities': '⚡',
  'Subscriptions': '📱',
  'Rent': '🏠',
  'Bills': '🧾',
  'Transfers': '🔄',
  'Other': '📦',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#34d399',
  'Food & Drinks': '#f59e0b',
  'Transport': '#60a5fa',
  'Shopping': '#a78bfa',
  'Entertainment': '#f472b6',
  'Health & Lifestyle': '#2dd4bf',
  'Income': '#10b981',
  'YD Salary': '#10b981',
  'Utilities': '#fb923c',
  'Subscriptions': '#818cf8',
  'Rent': '#6366f1',
  'Bills': '#f43f5e',
  'Transfers': '#94a3b8',
  'Other': '#64748b',
};

// Convert Supabase row → Transaction interface
function rowToTransaction(row: any): Transaction {
  const amount = parseFloat(row.amount);
  const isCredit = row.direction === 'credit';
  return {
    id: row.id,
    date: row.date,
    amount: amount,
    accountNumber: '',
    accountName: row.account_name ?? '',
    transactionType: row.direction,
    transactionDetails: row.description ?? '',
    balance: 0,
    category: row.category ?? 'Other',
    merchantName: row.merchant_name ?? row.description ?? '',
    processedOn: row.synced_at ?? row.date,
    isIncome: isCredit,
    isSpending: !isCredit,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      bankAccounts: [],
      categoryCorrections: [],
      lastImportDate: null,
      isSyncing: false,
      syncError: null,
      lastSyncedAt: null,

      // ── Legacy CSV import (kept for fallback) ─────────────────────────────
      importTransactions: (incoming) => {
        const { transactions, categoryCorrections } = get();
        const existingIds = new Set(transactions.map((t) => t.id));
        const newTxns = incoming.filter((t) => !existingIds.has(t.id));

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

      updateTransactionCategory: async (id, category) => {
        const { transactions, categoryCorrections } = get();
        const txn = transactions.find((t) => t.id === id);

        const updated = transactions.map((t) =>
          t.id === id ? { ...t, category } : t
        );

        if (txn) {
          const key = txn.merchantName.trim().toLowerCase();
          const exists = categoryCorrections.find((c) => c.merchantKey === key);
          const newCorrections = exists
            ? categoryCorrections.map((c) => (c.merchantKey === key ? { ...c, category } : c))
            : [...categoryCorrections, { merchantKey: key, category }];

          set({ transactions: updated, categoryCorrections: newCorrections });

          // Persist correction to Supabase for future syncs
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('category_corrections')
                .upsert({ user_id: user.id, merchant_key: key, category }, { onConflict: 'user_id,merchant_key' });

              // Also update the transaction in Supabase
              await supabase
                .from('bank_transactions')
                .update({ category })
                .eq('id', id)
                .eq('user_id', user.id);
            }
          } catch (e) {
            console.warn('Could not persist category correction to Supabase', e);
          }
        } else {
          set({ transactions: updated });
        }
      },

      clearTransactions: () => {
        set({ transactions: [], bankAccounts: [], lastImportDate: null, lastSyncedAt: null });
      },

      // ── Redbark Sync ──────────────────────────────────────────────────────
      syncBankData: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Not logged in');

          const { data, error } = await supabase.functions.invoke('sync-redbark', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          // Reload transactions from Supabase after sync
          await get().loadFromSupabase();

          set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
          return { synced: data?.synced ?? 0 };
        } catch (e: any) {
          const msg = e?.message ?? 'Sync failed';
          set({ isSyncing: false, syncError: msg });
          return { synced: 0, error: msg };
        }
      },

      // ── Load persisted data from Supabase ─────────────────────────────────
      loadFromSupabase: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const [accountsRes, txRes] = await Promise.all([
            supabase
              .from('bank_accounts')
              .select('*')
              .eq('user_id', user.id)
              .order('name'),
            supabase
              .from('bank_transactions')
              .select('*')
              .eq('user_id', user.id)
              .order('date', { ascending: false })
              .limit(500),
          ]);

          const bankAccounts: BankAccount[] = (accountsRes.data ?? []).map((a: any) => ({
            id: a.id,
            connectionId: a.connection_id,
            name: a.name,
            institutionName: a.institution_name,
            accountNumber: a.account_number,
            type: a.type,
            currency: a.currency,
            balance: parseFloat(a.balance ?? '0'),
            lastSyncedAt: a.last_synced_at,
          }));

          const transactions: Transaction[] = (txRes.data ?? []).map(rowToTransaction);

          set({ bankAccounts, transactions, lastImportDate: transactions.length > 0 ? new Date().toISOString() : null });
        } catch (e) {
          console.warn('Could not load finance data from Supabase', e);
        }
      },
    }),
    {
      name: 'pos-finance-store',
      // Only persist legacy CSV transactions + corrections locally; live data comes from Supabase
      partialize: (state) => ({
        categoryCorrections: state.categoryCorrections,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
