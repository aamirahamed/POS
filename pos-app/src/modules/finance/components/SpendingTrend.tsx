import { FC, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';

interface TrendData {
  week?: string;
  month?: string;
  total: number;
  income?: number;
  spending?: number;
}

interface SpendingTrendProps {
  weeklyData: { week: string; total: number }[];
  monthlyData: { month: string; income: number; spending: number }[];
}

const formatLabel = (key: string) => {
  // "2026-05" → "May", "2026-05-05" → "05 May"
  if (key.length === 7) {
    const d = new Date(`${key}-01`);
    return d.toLocaleDateString('en-AU', { month: 'short' });
  }
  const d = new Date(key);
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2235] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          ${p.value?.toFixed(2)}
        </p>
      ))}
    </div>
  );
};

const SpendingTrend: FC<SpendingTrendProps> = ({ weeklyData, monthlyData }) => {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');

  const weeklyFormatted = weeklyData.map((d) => ({
    label: formatLabel(d.week),
    total: d.total,
  }));

  const monthlyFormatted = monthlyData.map((d) => ({
    label: formatLabel(d.month),
    spending: d.spending,
    income: d.income,
  }));

  const hasData = view === 'weekly' ? weeklyFormatted.length > 0 : monthlyFormatted.length > 0;

  return (
    <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Spending Trend</h3>
        <div className="flex bg-white/5 rounded-xl p-0.5 gap-0.5">
          {(['weekly', 'monthly'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                view === v ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
          Not enough data for trend
        </div>
      ) : (
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-48"
        >
          <ResponsiveContainer width="100%" height="100%">
            {view === 'weekly' ? (
              <AreaChart data={weeklyFormatted} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#spendGrad)"
                  dot={{ fill: '#34d399', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            ) : (
              <AreaChart data={monthlyFormatted} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="spendGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="spending"
                  stroke="#f87171"
                  strokeWidth={2}
                  fill="url(#spendGrad2)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>

          {view === 'monthly' && (
            <div className="flex gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-3 h-0.5 rounded bg-blue-400" /> Income
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-3 h-0.5 rounded bg-red-400" /> Spending
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default SpendingTrend;
