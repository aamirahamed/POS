import { FC } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface InsightsProps {
  insights: string[];
}

const FinancialInsights: FC<InsightsProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Financial Insights</h3>
      </div>

      <div className="flex flex-col gap-3">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex gap-3 p-3 rounded-xl bg-amber-400/5 border border-amber-400/10"
          >
            <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
            <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FinancialInsights;
