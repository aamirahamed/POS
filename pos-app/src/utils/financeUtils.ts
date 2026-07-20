import { Transaction, CategoryCorrection } from '@/store/useFinanceStore';

// ── Transaction Classification ─────────────────────────────────────────────────
//
// Three simple rules based purely on amounts:
//
//  1. rent_payment    — The full rent debit (~$2,934) on Personal.
//                       Already pre-funded by weekly $410 savings. Hidden from spend.
//
//  2. rent_contribution — Nasih's credit (~$1,467) on Personal.
//                         Not Aamir's income — it's the rent pool. Hidden from income.
//
//  3. internal        — Savings→Personal credit (~$1,467) around the 15th.
//                       Aamir moving his own rent share back. Hidden from income.
//
//  Everything else is discretionary (including the $410/week which IS a real expense,
//  just labelled as "Rent & Bills").

export type TxnTag =
  | 'discretionary'      // Normal spend or income — counts in budget
  | 'rent_payment'       // Full $2,934 rent debit — hidden from spend
  | 'rent_contribution'  // Nasih's ~$1,467 credit — hidden from income
  | 'internal';          // Savings→Personal ~$1,467 credit — hidden from income

export interface ClassifiedTransaction extends Transaction {
  tag: TxnTag;
}

export interface ClassifyOptions {
  fullRent: number;   // Full monthly rent e.g. $2,934
  rentShare: number;  // One share e.g. $1,467
}

/**
 * Tags transactions using 3 amount-based rules.
 * All internal/own-account detection uses the description to distinguish
 * "linked account" transfers from external person payments.
 */
export function classifyTransactions(
  transactions: Transaction[],
  { fullRent, rentShare }: ClassifyOptions
): ClassifiedTransaction[] {
  const tolerance = 0.08; // ±8% tolerance on amounts

  const near = (actual: number, target: number) =>
    Math.abs(actual - target) <= target * tolerance;

  return transactions.map(t => {
    const desc = (t.transactionDetails + ' ' + t.merchantName).toLowerCase();
    const isPayroll = /payroll|salary|wages/i.test(desc);

    // Rule 1: Full rent debit on Personal (~$2,934 spending)
    if (t.isSpending && near(Math.abs(t.amount), fullRent)) {
      return { ...t, tag: 'rent_payment' as TxnTag };
    }

    // Rule 2 & 3: Credits ≈ rentShare (~$1,467) that are NOT salary
    if (t.isIncome && !isPayroll && near(t.amount, rentShare)) {
      // "Linked Acc" / own name in description = own account transfer (internal)
      const isOwnTransfer = /linked acc|online j[0-9]/i.test(desc);
      if (isOwnTransfer) {
        return { ...t, tag: 'internal' as TxnTag };
      }
      // Otherwise it's Nasih's rent contribution
      return { ...t, tag: 'rent_contribution' as TxnTag };
    }

    return { ...t, tag: 'discretionary' as TxnTag };
  });
}


// ── Category Auto-detection ────────────────────────────────────────────────────

const CATEGORY_RULES: Array<{ patterns: RegExp[]; category: string }> = [
  // Income
  { patterns: [/yd\s*(pty|ltd|salary|payroll|wages)/i, /payroll/i, /salary/i], category: 'YD Salary' },
  { patterns: [/employer/i, /wages/i, /income/i, /dividend/i], category: 'Income' },

  // Groceries
  { patterns: [/iga/i, /woolworths/i, /coles/i, /aldi/i, /harris farm/i, /fresh food/i, /supermarket/i, /fruit.*veg/i], category: 'Groceries' },

  // Food & Drinks
  { patterns: [/kopilicious/i, /cafe/i, /coffee/i, /mcdonald/i, /kfc/i, /hungry jack/i, /subway/i, /grill'd/i, /uber eats/i, /deliveroo/i, /doordash/i, /menulog/i, /restaurant/i, /bakery/i, /sushi/i, /pizza/i, /thai/i, /chinese/i, /indian/i, /bar\b/i], category: 'Food & Drinks' },

  // Transport
  { patterns: [/opal/i, /uber\b/i, /lyft/i, /transport nsw/i, /taxi/i, /parking/i, /toll/i, /shell/i, /bp\b/i, /petrol/i, /fuel/i, /ampol/i], category: 'Transport' },

  // Subscriptions
  { patterns: [/netflix/i, /spotify/i, /apple\.com\/bill/i, /google.*storage/i, /amazon prime/i, /disney/i, /binge/i, /stan\b/i, /foxtel/i, /youtube/i, /adobe/i, /microsoft/i], category: 'Subscriptions' },

  // Utilities
  { patterns: [/energy australia/i, /agl\b/i, /origin energy/i, /sydney water/i, /optus/i, /telstra/i, /vodafone/i, /tpg/i, /internet/i, /electricity/i, /water/i, /gas\b/i], category: 'Utilities' },

  // Health & Lifestyle
  { patterns: [/pharmacy/i, /chemist/i, /priceline/i, /doctor/i, /medical/i, /dental/i, /gym/i, /fitness/i, /anytime fitness/i, /healthscope/i, /haircut/i, /barber/i, /salon/i, /massage/i, /spa\b/i], category: 'Health & Lifestyle' },

  // Shopping
  { patterns: [/paymate/i, /ebay/i, /amazon/i, /kmart/i, /target/i, /big w/i, /bunnings/i, /officeworks/i, /jb hi.fi/i, /harvey norman/i, /myer/i, /david jones/i, /cotton on/i], category: 'Shopping' },

  // Rent
  { patterns: [/rent/i, /rental/i, /landlord/i, /real estate/i, /property mgmt/i, /tenancy/i], category: 'Rent' },

  // Bills
  { patterns: [/bill/i, /invoice/i, /rates/i, /insurance/i, /council/i, /bpay/i, /linkt/i, /e-toll/i], category: 'Bills' },

  // Transfers
  { patterns: [/transfer/i, /direct debit/i, /reversal/i, /refund/i], category: 'Transfers' },
];

function detectCategory(
  csvCategory: string,
  merchantName: string,
  transactionDetails: string,
  corrections: CategoryCorrection[]
): string {
  // 1. Apply learned corrections first
  const merchantKey = merchantName.trim().toLowerCase();
  const correction = corrections.find((c) => c.merchantKey === merchantKey);
  if (correction) return correction.category;

  // 2. Use CSV category only if it maps to a known human-readable name
  const csvCat = csvCategory?.trim();
  if (csvCat && csvCat.toLowerCase() !== 'uncategorised' && csvCat !== '') {
    const normalised = normaliseCsvCategory(csvCat);
    if (normalised !== null) return normalised;
    // If normaliseCsvCategory returned null, the CSV value is an
    // unrecognised code (e.g. NAB numeric IDs) — fall through to patterns.
  }

  // 3. Pattern match on merchant + details
  const searchText = `${merchantName} ${transactionDetails}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(searchText))) {
      return rule.category;
    }
  }

  return 'Other';
}

/** Returns a normalised category name, or null if the CSV value is unrecognised. */
function normaliseCsvCategory(cat: string): string | null {
  const map: Record<string, string> = {
    'groceries': 'Groceries',
    'food': 'Food & Drinks',
    'food and drink': 'Food & Drinks',
    'food & drink': 'Food & Drinks',
    'dining': 'Food & Drinks',
    'restaurants': 'Food & Drinks',
    'transport': 'Transport',
    'travel': 'Transport',
    'shopping': 'Shopping',
    'retail': 'Shopping',
    'entertainment': 'Entertainment',
    'health': 'Health & Lifestyle',
    'health & lifestyle': 'Health & Lifestyle',
    'utilities': 'Utilities',
    'subscriptions': 'Subscriptions',
    'rent': 'Rent',
    'bills': 'Bills',
    'transfer': 'Transfers',
    'transfers': 'Transfers',
    'income': 'Income',
    'salary': 'YD Salary',
  };
  return map[cat.toLowerCase()] ?? null;
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseDate(raw: string): string {
  // NAB format: DD MMM YYYY (e.g. "13 May 2026") or DD/MM/YYYY
  if (!raw) return new Date().toISOString().slice(0, 10);
  const slash = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2]}-${slash[1]}`;
  }
  const textMonth: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const text = raw.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (text) {
    return `${text[3]}-${textMonth[text[2]] ?? '01'}-${text[1].padStart(2, '0')}`;
  }
  // Fallback: try native parse
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
}

function generateId(date: string, amount: string, details: string): string {
  return btoa(`${date}-${amount}-${details}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
}

/**
 * Parses a NAB CSV file string into Transaction objects.
 * The CSV may or may not have a header row.
 */
export function parseNABCsv(
  csvText: string,
  corrections: CategoryCorrection[]
): Transaction[] {
  const lines = csvText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Detect header
  let dataLines = lines;
  const possibleHeader = lines[0].toLowerCase();
  if (possibleHeader.includes('date') || possibleHeader.includes('amount')) {
    dataLines = lines.slice(1);
  }

  const transactions: Transaction[] = [];

  for (const line of dataLines) {
    // Naive CSV split that handles quoted fields
    const cols = parseCsvLine(line);
    if (cols.length < 4) continue;

    // NAB CSV column order (flexible):
    // Date, Amount, Account Number, Transaction Type, Transaction Details, Balance, Category, Merchant Name, Processed On
    const [
      rawDate = '',
      rawAmount = '',
      accountNumber = '',
      transactionType = '',
      transactionDetails = '',
      rawBalance = '',
      csvCategory = '',
      merchantName = '',
      processedOn = '',
    ] = cols.map((c) => c.trim().replace(/^"|"$/g, ''));

    const amount = parseAmount(rawAmount);
    const balance = parseAmount(rawBalance);
    const date = parseDate(rawDate);

    // Derive merchant: prefer merchantName col, fall back to details
    const merchant = merchantName.trim() || extractMerchant(transactionDetails);

    let category = detectCategory(csvCategory, merchant, transactionDetails, corrections);

    // Override: if NAB marks TransactionType as 'Salary' and it's a credit → YD Salary
    if (transactionType.trim().toLowerCase() === 'salary' && amount > 0) {
      category = 'YD Salary';
    }

    const id = generateId(rawDate, rawAmount, transactionDetails);

    transactions.push({
      id,
      date,
      amount,
      accountNumber,
      accountName: '',
      transactionType,
      transactionDetails,
      balance,
      category,
      merchantName: merchant,
      processedOn,
      isIncome: amount > 0,
      isSpending: amount < 0,
    });
  }

  return transactions;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function extractMerchant(details: string): string {
  // Strip common prefixes like "EFTPOS", "DIRECT DEBIT", etc.
  return details
    .replace(/^(EFTPOS|POS|DIRECT CREDIT|DIRECT DEBIT|OSKO PAYMENT|BPAY BILLER|ATM WITHDRAWAL)\s*/i, '')
    .split(/\s{2,}/)[0]
    .trim() || details;
}

// ── Analytics Helpers ─────────────────────────────────────────────────────────

export function getSpendingByCategory(transactions: Transaction[]) {
  const spending = transactions.filter((t) => t.isSpending);
  const map: Record<string, number> = {};
  for (const t of spending) {
    map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
  }
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function getMonthlyTotals(transactions: Transaction[]) {
  const map: Record<string, { income: number; spending: number }> = {};
  for (const t of transactions) {
    const month = t.date.slice(0, 7); // YYYY-MM
    if (!map[month]) map[month] = { income: 0, spending: 0 };
    if (t.isIncome) map[month].income += t.amount;
    else map[month].spending += Math.abs(t.amount);
  }
  return Object.entries(map)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getWeeklySpending(transactions: Transaction[]) {
  // Get last 8 weeks
  const spending = transactions.filter((t) => t.isSpending);
  const map: Record<string, number> = {};
  for (const t of spending) {
    const d = new Date(t.date);
    // Get Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = monday.toISOString().slice(0, 10);
    map[key] = (map[key] ?? 0) + Math.abs(t.amount);
  }
  return Object.entries(map)
    .map(([week, total]) => ({ week, total }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8);
}

export function detectRecurringExpenses(transactions: Transaction[]) {
  const spending = transactions.filter((t) => t.isSpending);
  // Group by merchant
  const merchantMap: Record<string, Transaction[]> = {};
  for (const t of spending) {
    const key = t.merchantName.toLowerCase();
    if (!merchantMap[key]) merchantMap[key] = [];
    merchantMap[key].push(t);
  }

  const recurring: Array<{
    merchantName: string;
    category: string;
    count: number;
    avgAmount: number;
    lastDate: string;
    frequency: string;
  }> = [];

  for (const [, txns] of Object.entries(merchantMap)) {
    if (txns.length < 2) continue;
    const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
    const avgAmount = txns.reduce((s, t) => s + Math.abs(t.amount), 0) / txns.length;

    // Estimate frequency based on date gaps
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days =
        (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
        (1000 * 60 * 60 * 24);
      gaps.push(days);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

    let frequency = 'Occasionally';
    if (avgGap <= 8) frequency = 'Weekly';
    else if (avgGap <= 16) frequency = 'Fortnightly';
    else if (avgGap <= 35) frequency = 'Monthly';
    else if (avgGap <= 100) frequency = 'Quarterly';

    recurring.push({
      merchantName: sorted[0].merchantName,
      category: sorted[0].category,
      count: txns.length,
      avgAmount,
      lastDate: sorted[sorted.length - 1].date,
      frequency,
    });
  }

  return recurring
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.avgAmount - a.avgAmount);
}

export function generateInsights(transactions: Transaction[]): string[] {
  const insights: string[] = [];
  if (transactions.length === 0) return insights;

  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);

  const thisWeek = transactions.filter(
    (t) => t.isSpending && new Date(t.date) >= thisWeekStart
  );
  const lastWeek = transactions.filter(
    (t) =>
      t.isSpending &&
      new Date(t.date) >= lastWeekStart &&
      new Date(t.date) < thisWeekStart
  );

  const thisWeekTotal = thisWeek.reduce((s, t) => s + Math.abs(t.amount), 0);
  const lastWeekTotal = lastWeek.reduce((s, t) => s + Math.abs(t.amount), 0);

  if (lastWeekTotal > 0) {
    const pct = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
    if (pct > 10) {
      insights.push(`Your spending has increased by ${pct}% compared to last week.`);
    } else if (pct < -10) {
      insights.push(`Great work — you spent ${Math.abs(pct)}% less than last week.`);
    } else {
      insights.push(`Your spending this week is similar to last week.`);
    }
  }

  // Category insight
  const byCat = getSpendingByCategory(transactions);
  if (byCat.length > 0) {
    insights.push(`${byCat[0].category} is your biggest spending category this month.`);
  }

  // Food & Drinks count
  const foodCount = thisWeek.filter((t) => t.category === 'Food & Drinks').length;
  if (foodCount > 3) {
    insights.push(`You had ${foodCount} Food & Drink transactions this week.`);
  }

  // Weekend vs weekday
  const weekendSpend = transactions
    .filter((t) => {
      const d = new Date(t.date).getDay();
      return t.isSpending && (d === 0 || d === 6);
    })
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const weekdaySpend = transactions
    .filter((t) => {
      const d = new Date(t.date).getDay();
      return t.isSpending && d !== 0 && d !== 6;
    })
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const totalSpend = weekendSpend + weekdaySpend;
  if (totalSpend > 0) {
    const weekendPct = Math.round((weekendSpend / totalSpend) * 100);
    if (weekendPct > 40) {
      insights.push(`${weekendPct}% of your spending happens on weekends.`);
    }
  }

  return insights.slice(0, 5);
}

// ── Week-Centric Analytics (new primary model) ────────────────────────────────

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getWeekLabel(monday: Date): string {
  const sun = getSunday(monday);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sun)}`;
}

export function getWeekTransactions(transactions: Transaction[], monday: Date): Transaction[] {
  const start = monday.getTime();
  const end = getSunday(monday).getTime();
  return transactions.filter((t) => {
    const ts = new Date(t.date + 'T00:00:00').getTime();
    return ts >= start && ts <= end;
  });
}

export function getCategorySpendForWeek(weekTxns: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of weekTxns.filter((t) => t.isSpending)) {
    map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
  }
  return map;
}

export function getWeekIncomeTotal(weekTxns: Transaction[]): number {
  return weekTxns.filter((t) => t.isIncome).reduce((s, t) => s + t.amount, 0);
}

export interface DaySpend {
  day: string;
  date: string;
  total: number;
  isToday: boolean;
  isFuture: boolean;
}

export function getDailySpending(weekTxns: Transaction[], monday: Date): DaySpend[] {
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = new Date().toISOString().slice(0, 10);
  return DAY_NAMES.map((day, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const total = weekTxns
      .filter((t) => t.isSpending && t.date === dateStr)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return {
      day,
      date: dateStr,
      total,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    };
  });
}

export interface HealthStatus {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

export function getFinancialHealthStatus(spent: number, income: number): HealthStatus {
  if (income === 0) return { label: 'No Income Data', color: '#94a3b8', bg: 'bg-slate-500/15', dot: 'bg-slate-500' };
  const ratio = spent / income;
  if (ratio < 0.4) return { label: 'Healthy Week', color: '#34d399', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' };
  if (ratio < 0.6) return { label: 'Stable Spending', color: '#60a5fa', bg: 'bg-blue-500/15', dot: 'bg-blue-400' };
  if (ratio < 0.8) return { label: 'High Spending', color: '#f59e0b', bg: 'bg-amber-500/15', dot: 'bg-amber-400' };
  return { label: 'Tight Week', color: '#f87171', bg: 'bg-red-500/15', dot: 'bg-red-400' };
}

export function getAvailableWeeks(transactions: Transaction[]): Date[] {
  const seen = new Set<string>();
  const mondays: Date[] = [];
  for (const t of transactions) {
    const m = getMonday(new Date(t.date + 'T00:00:00'));
    const key = m.toISOString().slice(0, 10);
    if (!seen.has(key)) {
      seen.add(key);
      mondays.push(m);
    }
  }
  return mondays.sort((a, b) => b.getTime() - a.getTime()); // newest first
}

export interface WeekComparisonRow {
  category: string;
  twoWeeksAgo: number;
  lastWeek: number;
  thisWeek: number;
  changePct: number | null; // lastWeek → thisWeek
}

export function buildWeekComparison(
  thisWeekC: Record<string, number>,
  lastWeekC: Record<string, number>,
  twoWeeksAgoC: Record<string, number>
): WeekComparisonRow[] {
  const allCats = new Set([
    ...Object.keys(thisWeekC),
    ...Object.keys(lastWeekC),
    ...Object.keys(twoWeeksAgoC),
  ]);

  return Array.from(allCats)
    .map((category) => {
      const tw = thisWeekC[category] ?? 0;
      const lw = lastWeekC[category] ?? 0;
      const ta = twoWeeksAgoC[category] ?? 0;
      const changePct = lw > 0 ? ((tw - lw) / lw) * 100 : tw > 0 ? null : null;
      return { category, twoWeeksAgo: ta, lastWeek: lw, thisWeek: tw, changePct };
    })
    .filter((r) => r.thisWeek > 0 || r.lastWeek > 0 || r.twoWeeksAgo > 0)
    .sort((a, b) => b.thisWeek - a.thisWeek || b.lastWeek - a.lastWeek);
}

export function generateWeeklyInsights(
  thisWeekC: Record<string, number>,
  lastWeekC: Record<string, number>,
  thisWeekIncome: number
): string[] {
  const insights: string[] = [];
  const allCats = new Set([...Object.keys(thisWeekC), ...Object.keys(lastWeekC)]);

  // Find biggest category changes
  const changes: { cat: string; pct: number }[] = [];
  for (const cat of allCats) {
    const last = lastWeekC[cat] ?? 0;
    const now = thisWeekC[cat] ?? 0;
    if (last < 5 && now < 5) continue;
    const pct = last > 0 ? ((now - last) / last) * 100 : 0;
    if (Math.abs(pct) >= 25) changes.push({ cat, pct });
  }
  changes.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const bigUp = changes.find((c) => c.pct > 0);
  if (bigUp) {
    insights.push(`${bigUp.cat} spending rose by ${Math.round(bigUp.pct)}% compared to last week.`);
  }

  const bigDown = changes.find((c) => c.pct < 0);
  if (bigDown) {
    insights.push(`${bigDown.cat} spend dropped ${Math.round(Math.abs(bigDown.pct))}% — solid improvement.`);
  }

  const stableCategories = Array.from(allCats).filter((cat) => {
    const last = lastWeekC[cat] ?? 0;
    const now = thisWeekC[cat] ?? 0;
    if (last < 10) return false;
    return Math.abs(((now - last) / last) * 100) < 10;
  });
  if (stableCategories.length > 0) {
    insights.push(`${stableCategories[0]} remained stable compared to last week.`);
  }

  const thisTotal = Object.values(thisWeekC).reduce((s, v) => s + v, 0);
  const lastTotal = Object.values(lastWeekC).reduce((s, v) => s + v, 0);
  if (lastTotal > 0) {
    const diff = ((thisTotal - lastTotal) / lastTotal) * 100;
    if (diff < -15) insights.push(`You spent ${Math.round(Math.abs(diff))}% less this week overall.`);
    else if (diff > 15) insights.push(`Overall spending is up ${Math.round(diff)}% from last week.`);
    else insights.push('Total spending is tracking similar to last week.');
  }

  if (thisWeekIncome > 0) {
    const foodSpend = thisWeekC['Food & Drinks'] ?? 0;
    const pct = Math.round((foodSpend / thisWeekIncome) * 100);
    if (pct >= 15) insights.push(`Dining consumed ${pct}% of your weekly earnings.`);
  }

  return insights.slice(0, 4);
}

// ── Pay Cycle System ──────────────────────────────────────────────────────────
// The user is paid Wednesday evening. Spending cycle: Thursday → Wednesday.
// $350 is transferred immediately to savings/rent — this is "locked money".

export interface PayCycle {
  id: string;                // salary transaction id
  salaryDate: string;        // YYYY-MM-DD of salary credit (Wednesday)
  salaryAmount: number;      // gross credited amount
  lockedAmount: number;      // $350 transfer debit (0 if not found)
  lockedTxnId: string | null;
  usableIncome: number;      // salaryAmount - lockedAmount
  cycleStart: string;        // YYYY-MM-DD (Thursday)
  cycleEnd: string;          // YYYY-MM-DD (following Wednesday)
  label: string;             // "8 May → 14 May"
}

const LOCKED_AMOUNT = 350;

function fmtCycleDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function detectPayCycles(transactions: Transaction[]): PayCycle[] {
  // Identify salary credits — supports both legacy CSV (transactionType='salary')
  // and Redbark live transactions (category='YD Salary'/'Income', description contains 'payroll')
  const isSalaryTxn = (t: Transaction) => {
    if (!t.isIncome) return false;
    const type = (t.transactionType ?? '').trim().toLowerCase();
    const cat = (t.category ?? '').trim().toLowerCase();
    const desc = (t.transactionDetails ?? '').toLowerCase();
    const merchant = (t.merchantName ?? '').toLowerCase();

    // Must be an explicit salary/payroll signal — generic 'income' alone is not enough
    // (rent received, transfers etc. can also be INCOME category)
    return (
      type === 'salary' ||
      cat === 'yd salary' ||
      /payroll|salary|wages/i.test(desc) ||
      /payroll|salary|wages/i.test(merchant)
    );
  };

  const salaryCreds = transactions
    .filter(isSalaryTxn)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (salaryCreds.length === 0) return [];

  return salaryCreds.map((salary, idx) => {
    // Cycle ends the day before next pay. For the most recent open cycle where the
    // next payroll hasn't posted yet, default to a 7-day (weekly) window (start + 6).
    const nextSalary = salaryCreds[idx + 1];
    const cycleStart = salary.date;
    const cycleEnd = nextSalary ? addDays(nextSalary.date, -1) : addDays(cycleStart, 6);

    // Find the $350 TRANSFER DEBIT within 3 days of salary date
    // Supports both legacy CSV (transactionType contains 'transfer') and Redbark (category='Transfers')
    const windowEnd = addDays(salary.date, 3);
    const lockedTxn = transactions.find(
      (t) =>
        !t.isIncome &&
        Math.abs(t.amount) === LOCKED_AMOUNT &&
        (t.transactionType.toLowerCase().includes('transfer') ||
          t.category.toLowerCase() === 'transfers') &&
        t.date >= salary.date &&
        t.date <= windowEnd
    ) ?? null;

    const lockedAmount = lockedTxn ? LOCKED_AMOUNT : 0;

    return {
      id: salary.id,
      salaryDate: salary.date,
      salaryAmount: salary.amount,
      lockedAmount,
      lockedTxnId: lockedTxn?.id ?? null,
      usableIncome: salary.amount - lockedAmount,
      cycleStart,
      cycleEnd,
      label: `${fmtCycleDate(cycleStart)} → ${fmtCycleDate(cycleEnd)}`,
    };
  });
}

/** Returns the pay cycle that contains the given date (defaults to today). */
export function getCurrentPayCycle(
  cycles: PayCycle[],
  forDate?: Date
): PayCycle | null {
  if (cycles.length === 0) return null;
  const dateStr = (forDate ?? new Date()).toISOString().slice(0, 10);
  // Find cycle where cycleStart <= date <= cycleEnd
  const active = cycles.find((c) => dateStr >= c.cycleStart && dateStr <= c.cycleEnd);
  if (active) return active;
  // If today is before any cycle (e.g. Wednesday, salary not credited yet), return most recent ended
  const past = cycles.filter((c) => c.cycleEnd < dateStr);
  return past.length > 0 ? past[past.length - 1] : cycles[cycles.length - 1];
}

/** All transactions that fall within a pay cycle's Thu→Wed window. */
export function getPayCycleTransactions(
  transactions: Transaction[],
  cycle: PayCycle
): Transaction[] {
  return transactions.filter(
    (t) => t.date >= cycle.cycleStart && t.date <= cycle.cycleEnd
  );
}

/**
 * Spending transactions that are truly discretionary.
 * Only excludes rent_payment (the $2,934 debit) — it's pre-funded by the weekly $410.
 * The $410 itself IS discretionary spending (Rent & Bills category).
 */
export function getDiscretionarySpend(
  cycleTxns: Transaction[],
  lockedTxnId: string | null
): Transaction[] {
  return cycleTxns.filter(t => {
    if (!t.isSpending) return false;
    if (t.id === lockedTxnId) return false;
    const tag = (t as ClassifiedTransaction).tag;
    // Only exclude the full rent payment — it's already covered by the weekly $410 savings
    if (tag === 'rent_payment') return false;
    return true;
  });
}

/** Daily discretionary spending for a pay cycle — excludes rent, savings, and internal transfers. */
export function getDailySpendingForCycle(
  cycleTxns: Transaction[],
  cycle: PayCycle
): DaySpend[] {
  const cycleLength = Math.max(
    1,
    (new Date(cycle.cycleEnd + 'T00:00:00').getTime() -
      new Date(cycle.cycleStart + 'T00:00:00').getTime()) / 86400000 + 1
  );
  const dayNames = Array.from({ length: cycleLength }, (_, i) => {
    const d = new Date(cycle.cycleStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  });

  const EXCLUDED_TAGS = new Set<TxnTag>(['rent_payment']);
  const todayStr = new Date().toISOString().slice(0, 10);

  return dayNames.map((day, i) => {
    const dateStr = addDays(cycle.cycleStart, i);
    const total = cycleTxns
      .filter(t => {
        if (!t.isSpending || t.date !== dateStr) return false;
        if (t.id === cycle.lockedTxnId) return false;
        const tag = (t as ClassifiedTransaction).tag;
        if (tag && EXCLUDED_TAGS.has(tag)) return false;
        return true;
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return {
      day,
      date: dateStr,
      total,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    };
  });
}

export function generateCycleInsights(
  thisCycleC: Record<string, number>,
  prevCycleC: Record<string, number>,
  usableIncome: number
): string[] {
  const insights: string[] = [];
  const allCats = new Set([...Object.keys(thisCycleC), ...Object.keys(prevCycleC)]);

  // Category changes
  const changes: { cat: string; pct: number }[] = [];
  for (const cat of allCats) {
    const prev = prevCycleC[cat] ?? 0;
    const curr = thisCycleC[cat] ?? 0;
    if (prev < 5 && curr < 5) continue;
    if (prev > 0) changes.push({ cat, pct: ((curr - prev) / prev) * 100 });
  }
  changes.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const bigUp = changes.find((c) => c.pct > 25);
  if (bigUp) insights.push(`${bigUp.cat} spending rose ${Math.round(bigUp.pct)}% vs last pay cycle.`);

  const bigDown = changes.find((c) => c.pct < -25);
  if (bigDown) insights.push(`${bigDown.cat} spend dropped ${Math.round(Math.abs(bigDown.pct))}% — solid discipline.`);

  const stable = Array.from(allCats).filter((cat) => {
    const prev = prevCycleC[cat] ?? 0;
    const curr = thisCycleC[cat] ?? 0;
    return prev >= 10 && Math.abs(((curr - prev) / prev) * 100) < 8;
  });
  if (stable.length > 0) insights.push(`${stable[0]} remained stable compared to last cycle.`);

  const thisTotal = Object.values(thisCycleC).reduce((s, v) => s + v, 0);
  const prevTotal = Object.values(prevCycleC).reduce((s, v) => s + v, 0);
  if (prevTotal > 0) {
    const diff = ((thisTotal - prevTotal) / prevTotal) * 100;
    if (diff < -15) insights.push(`You spent ${Math.round(Math.abs(diff))}% less this cycle overall.`);
    else if (diff > 15) insights.push(`Overall spending is up ${Math.round(diff)}% from last cycle.`);
    else insights.push('Total spending is tracking similar to last cycle.');
  }

  if (usableIncome > 0) {
    const foodSpend = thisCycleC['Food & Drinks'] ?? 0;
    const pct = Math.round((foodSpend / usableIncome) * 100);
    if (pct >= 12) insights.push(`Dining consumed ${pct}% of your usable income this cycle.`);
  }

  return insights.slice(0, 4);
}
