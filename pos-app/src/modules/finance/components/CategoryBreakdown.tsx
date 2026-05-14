import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/store/useFinanceStore';

interface CategoryItem {
  category: string;
  total: number;
}

interface CategoryBreakdownProps {
  data: CategoryItem[];
}

const CategoryBreakdown: FC<CategoryBreakdownProps> = ({ data }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0) return null;

  // Build donut segments
  let cumulative = 0;
  const segments = data.slice(0, 7).map((item) => {
    const pct = item.total / total;
    const startAngle = cumulative * 360;
    const endAngle = (cumulative + pct) * 360;
    cumulative += pct;
    return { ...item, pct, startAngle, endAngle };
  });

  const r = 60;
  const cx = 80;
  const cy = 80;
  const strokeWidth = 18;

  function polarToXY(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function arcPath(startAngle: number, endAngle: number, radius: number) {
    const start = polarToXY(startAngle, radius);
    const end = polarToXY(endAngle, radius);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  return (
    <div className="bg-[#1a2235] border border-white/8 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-5 uppercase tracking-wider">Category Breakdown</h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width={160} height={160} viewBox="0 0 160 160">
            {/* Background track */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={strokeWidth}
            />

            {segments.map((seg, i) => {
              const color = CATEGORY_COLORS[seg.category] ?? '#64748b';
              const isHovered = hovered === seg.category;
              // Avoid 360° path rendering bug
              const effectiveEnd = seg.endAngle >= 360 ? 359.99 : seg.endAngle;
              return (
                <path
                  key={i}
                  d={arcPath(seg.startAngle, effectiveEnd, r)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeLinecap="round"
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${color}80)` : 'none',
                    transition: 'stroke-width 0.2s, filter 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHovered(seg.category)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}

            {/* Center label */}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="Inter">
              Total
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill="white" fontSize="13" fontWeight="600" fontFamily="Inter">
              ${total.toFixed(0)}
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 w-full">
          {data.slice(0, 7).map((item, i) => {
            const color = CATEGORY_COLORS[item.category] ?? '#64748b';
            const icon = CATEGORY_ICONS[item.category] ?? '📦';
            const pct = ((item.total / total) * 100).toFixed(0);
            const isHov = hovered === item.category;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onMouseEnter={() => setHovered(item.category)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-3 p-2 rounded-xl cursor-default transition-all duration-200 ${
                  isHov ? 'bg-white/5' : ''
                }`}
              >
                <span className="text-base w-5 text-center">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-300 truncate">{item.category}</span>
                    <span className="text-xs text-slate-400 ml-2 shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-white shrink-0">${item.total.toFixed(0)}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryBreakdown;
