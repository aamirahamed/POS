import { FC } from 'react';
import { motion } from 'framer-motion';
import { DaySpend } from '@/utils/financeUtils';

interface DailyTimelineProps {
  days: DaySpend[];
}

const DailyTimeline: FC<DailyTimelineProps> = ({ days }) => {
  const maxSpend = Math.max(...days.map((d) => d.total), 1);
  const totalThisWeek = days.reduce((s, d) => s + d.total, 0);

  // Biggest spending day
  const busiestDay = [...days].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-semibold text-white uppercase tracking-widest">Daily Spending</h3>
        {busiestDay?.total > 0 && (
          <span className="text-[10px] text-slate-500">
            Peak: <span className="text-slate-300">{busiestDay.day} ${busiestDay.total.toFixed(0)}</span>
          </span>
        )}
      </div>

      {totalThisWeek === 0 ? (
        <p className="text-slate-600 text-sm text-center py-6">No spending data for this week</p>
      ) : (
        <div className="flex items-end justify-between gap-1.5 h-32">
          {days.map((day) => {
            const barH = day.total > 0 ? Math.max((day.total / maxSpend) * 96, 6) : 0;
            const isBusiest = day.date === busiestDay?.date && day.total > 0;

            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                {/* Amount label */}
                <div className="text-[9px] text-slate-500 text-center" style={{ minHeight: '12px' }}>
                  {day.total > 0 && !day.isFuture ? `$${day.total.toFixed(0)}` : ''}
                </div>

                {/* Bar */}
                <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
                  {day.isFuture ? (
                    <div className="w-6 h-1 rounded-full bg-white/5" />
                  ) : day.total === 0 ? (
                    <div className="w-6 h-1 rounded-full bg-white/8" />
                  ) : (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: barH }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className={`w-6 rounded-t-lg transition-all ${
                        day.isToday
                          ? 'bg-emerald-400'
                          : isBusiest
                          ? 'bg-amber-400/70'
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                      style={{ height: barH }}
                    />
                  )}
                </div>

                {/* Day label */}
                <span
                  className={`text-[10px] font-medium ${
                    day.isToday ? 'text-emerald-400' : day.isFuture ? 'text-white/20' : 'text-slate-500'
                  }`}
                >
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <div className="w-3 h-3 rounded-sm bg-emerald-400" /> Today
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <div className="w-3 h-3 rounded-sm bg-amber-400/70" /> Peak day
        </div>
      </div>
    </div>
  );
};

export default DailyTimeline;
