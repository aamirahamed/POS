import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FinanceSettings {
  fullRent: number;   // Full monthly rent (both shares) e.g. $2,934
  rentShare: number;  // Your share e.g. $1,467

  update: (patch: Partial<Omit<FinanceSettings, 'update'>>) => void;
}

const DEFAULTS = {
  fullRent: 2934,
  rentShare: 1467,
};

export const useFinanceSettings = create<FinanceSettings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (patch) => set((s) => ({ ...s, ...patch })),
    }),
    {
      name: 'pos-finance-settings',
      partialize: (s) => ({ fullRent: s.fullRent, rentShare: s.rentShare }),
    }
  )
);
