import { FC } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface WeeklyInsightsProps {
  insights: string[];
}

const WeeklyInsights: FC<WeeklyInsightsProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={13} className="text-amber-400" />
        <h3 className="text-xs font-semibold text-white uppercase tracking-widest">Weekly Insights</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex gap-2.5 p-3 rounded-xl bg-amber-400/5 border border-amber-400/10"
          >
            <span className="text-amber-400 text-sm mt-0.5 shrink-0">✦</span>
            <p className="text-sm text-slate-300 leading-snug">{insight}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyInsights;
