import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Finance Settings Store ────────────────────────────────────────────────────
// Persists user-defined committed cost configuration so the weekly view
// shows true discretionary spending only.

export interface FinanceSettings {
  // Rent
  monthlyRentShare: number;       // User's share of monthly rent (e.g. $1,467)
  rentKeywords: string[];         // Keywords to detect rent debits (e.g. ["rent", "real estate"])

  // Savings transfers
  weeklySavingsTransfer: number;  // Weekly committed savings transfer amount (e.g. $410)
  savingsTransferKeywords: string[]; // Keywords for savings transfers

  // Auto-detect internal transfers (Personal ↔ Savings)
  autoDetectInternals: boolean;   // Flag round-trips between own accounts
  internalMatchWindowDays: number; // Days tolerance for matching (default 2)
  internalMatchToleranceAUD: number; // Dollar tolerance for matching (default $5)

  // Actions
  update: (patch: Partial<Omit<FinanceSettings, 'update'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  monthlyRentShare: 1467,
  rentKeywords: ['rent', 'rental', 'real estate', 'property management', 'residential'],
  weeklySavingsTransfer: 410,
  savingsTransferKeywords: ['linked acc', 'linked account', 'online transfer', 'savings'],
  autoDetectInternals: true,
  internalMatchWindowDays: 2,
  internalMatchToleranceAUD: 10,
};

export const useFinanceSettings = create<FinanceSettings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set((s) => ({ ...s, ...DEFAULTS })),
    }),
    {
      name: 'pos-finance-settings',
      partialize: (s) => ({
        monthlyRentShare: s.monthlyRentShare,
        rentKeywords: s.rentKeywords,
        weeklySavingsTransfer: s.weeklySavingsTransfer,
        savingsTransferKeywords: s.savingsTransferKeywords,
        autoDetectInternals: s.autoDetectInternals,
        internalMatchWindowDays: s.internalMatchWindowDays,
        internalMatchToleranceAUD: s.internalMatchToleranceAUD,
      }),
    }
  )
);
