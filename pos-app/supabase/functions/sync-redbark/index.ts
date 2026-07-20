// Supabase Edge Function: sync-redbark
// Fetches accounts and transactions from Redbark API and upserts into Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REDBARK_API_KEY = Deno.env.get('REDBARK_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const REDBARK_BASE = 'https://api.redbark.com/v1';

// Category mapping from Redbark raw categories to friendly labels
const CATEGORY_MAP: Record<string, string> = {
  FOOD_AND_DRINK: 'Food & Drinks',
  MERCHANDISE: 'Shopping',
  TRANSFER_IN: 'Transfers',
  TRANSFER_OUT: 'Transfers',
  GENERAL_MERCHANDISE: 'Shopping',
  GROCERIES: 'Groceries',
  PERSONAL_CARE: 'Health & Lifestyle',
  ENTERTAINMENT: 'Entertainment',
  TRANSPORTATION: 'Transport',
  TRAVEL: 'Transport',
  UTILITIES: 'Utilities',
  SUBSCRIPTION: 'Subscriptions',
  HEALTHCARE: 'Health & Lifestyle',
  EDUCATION: 'Other',
  INCOME: 'Income',
  RENT: 'Rent',
  BILLS: 'Bills',
};

function mapCategory(raw: string | null): string {
  if (!raw) return 'Other';
  return CATEGORY_MAP[raw.toUpperCase()] ?? 'Other';
}

// Determine if a credit transaction is a salary/payroll credit
function detectIncome(description: string, direction: string, amount: number): string {
  if (direction !== 'credit') return 'Other';
  const desc = description.toLowerCase();
  // Explicitly mark payroll as 'YD Salary' for financeUtils pay cycle detection
  if (/payroll|salary|wages/i.test(desc)) return 'YD Salary';
  // Peer transfers, rent income, large credits
  if (amount > 500 && direction === 'credit') return 'Income';
  return 'Transfers';
}

async function redbarkFetch(path: string) {
  const res = await fetch(`${REDBARK_BASE}${path}`, {
    headers: { Authorization: `Bearer ${REDBARK_API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redbark API error ${res.status}: ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Authenticate caller via their JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    // Use service role client for DB writes (bypasses RLS for bulk upsert)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extract user ID from caller JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // ── Step 1: Fetch accounts from Redbark ────────────────────────────────
    const accountsResponse = await redbarkFetch('/accounts');
    const accounts: any[] = accountsResponse.data ?? [];

    if (accounts.length === 0) {
      return Response.json({ message: 'No bank accounts found in Redbark', synced: 0 });
    }

    // ── Step 1b: Fetch balances for all accounts ───────────────────────────
    const accountIds = accounts.map((a: any) => a.id).join(',');
    const connectionId = accounts[0]?.connectionId;
    let balanceMap: Record<string, number> = {};

    try {
      const balancesResponse = await redbarkFetch(
        `/balances?accountIds=${accountIds}&connectionId=${connectionId}`
      );
      for (const b of balancesResponse.data ?? []) {
        balanceMap[b.accountId] = parseFloat(b.currentBalance ?? '0');
      }
    } catch (e) {
      console.warn('Could not fetch balances', e);
    }

    // Upsert accounts into bank_accounts table (with balances)
    const accountRows = accounts.map((a: any) => ({
      id: a.id,
      user_id: userId,
      connection_id: a.connectionId,
      name: a.name,
      institution_name: a.institutionName,
      account_number: a.accountNumber,
      type: a.type ?? 'transaction',
      currency: a.currency ?? 'AUD',
      balance: balanceMap[a.id] ?? 0,
      last_synced_at: new Date().toISOString(),
    }));

    const { error: accountsError } = await supabase
      .from('bank_accounts')
      .upsert(accountRows, { onConflict: 'id' });

    if (accountsError) throw accountsError;

    // ── Step 2: Fetch transactions per account ─────────────────────────────
    let totalSynced = 0;
    const syncErrors: string[] = [];

    // Load user's saved category corrections for auto-applying
    const { data: corrections } = await supabase
      .from('category_corrections')
      .select('merchant_key, category')
      .eq('user_id', userId);

    const correctionMap: Record<string, string> = {};
    for (const c of corrections ?? []) {
      correctionMap[c.merchant_key] = c.category;
    }

    for (const account of accounts) {
      try {
        const txRes = await redbarkFetch(
          `/transactions?connectionId=${account.connectionId}&accountId=${account.id}&limit=200`
        );
        const transactions: any[] = txRes.data ?? [];

        const txRows = transactions.map((tx: any) => {
          const amount = parseFloat(tx.amount);
          const merchantKey = (tx.merchantName ?? tx.description ?? '').toLowerCase().trim();
          
          // Determine category: user correction > Redbark category > income detection
          let category: string;
          if (correctionMap[merchantKey]) {
            category = correctionMap[merchantKey];
          } else if (tx.direction === 'credit') {
            category = detectIncome(tx.description ?? '', tx.direction, Math.abs(amount));
          } else {
            category = mapCategory(tx.category);
          }

          return {
            id: tx.id,
            user_id: userId,
            account_id: account.id,
            account_name: tx.accountName ?? account.name,
            date: tx.date,
            datetime: tx.datetime,
            amount: amount,
            direction: tx.direction,
            description: tx.description,
            merchant_name: tx.merchantName,
            category,
            raw_category: tx.category,
            status: tx.status ?? 'posted',
            synced_at: new Date().toISOString(),
          };
        });

        if (txRows.length > 0) {
          const { error: txError } = await supabase
            .from('bank_transactions')
            .upsert(txRows, { onConflict: 'id' });

          if (txError) {
            syncErrors.push(`Account ${account.name}: ${txError.message}`);
          } else {
            totalSynced += txRows.length;
          }
        }
      } catch (e: any) {
        syncErrors.push(`Account ${account.name}: ${e.message}`);
      }
    }

    return Response.json(
      {
        message: `Synced ${totalSynced} transactions across ${accounts.length} accounts`,
        accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
        synced: totalSynced,
        errors: syncErrors,
      },
      {
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    console.error('sync-redbark error:', err);
    return Response.json(
      { error: err.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
