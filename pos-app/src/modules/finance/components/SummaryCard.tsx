import { FC } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  accentColor: string;
  delay?: number;
}

const SummaryCard: FC<SummaryCardProps> = ({ label, value, sub, icon, trend, accentColor, delay = 0 }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-slate-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative bg-[#1a2235] border border-white/8 rounded-2xl p-4 overflow-hidden group hover:border-white/15 transition-all duration-300"
    >
      {/* Glow accent */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500"
        style={{ background: accentColor }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{icon}</span>
          {trend && (
            <span className={`${trendColor}`}>
              <TrendIcon size={14} />
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-medium">{label}</p>
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
};

export default SummaryCard;
