import { FC, useEffect, useState } from 'react';
import { useCalendarStore, YDShiftSnapshot } from '@/store/useCalendarStore';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { Calendar, Clock, Briefcase, RefreshCw, TrendingUp, TrendingDown, Minus, BarChart2, DollarSign, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { format, isSameDay, addDays, startOfWeek } from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import {
    getPaidHrs, calcShiftEarnings, calcWeeklyEarnings, calcEarningsDelta, fmt$,
} from '@/utils/earningsEngine';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const TrendTooltip = ({ active, payload, label, mode }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value as number;
    const isFuture   = payload[0]?.payload?.isFuture as boolean;
    const isCurrent  = payload[0]?.payload?.isCurrent as boolean;
    const isRecentPast = payload[0]?.payload?.isRecentPast as boolean;
    const isEarnings = mode === 'earnings';
    return (
        <div className="bg-surface-elevated border border-border rounded-xl px-4 py-3 shadow-xl">
            <p className="text-xs font-bold text-text-secondary mb-1">{label}</p>
            {isEarnings
                ? <p className="text-lg font-black text-emerald-300">{fmt$(val)} <span className="text-xs font-medium text-text-secondary">est. take-home</span></p>
                : <p className="text-lg font-black text-indigo-300">{val.toFixed(1).replace('.0', '')} hrs <span className="text-xs font-medium text-text-secondary">paid</span></p>
            }
            {isCurrent   && <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">Current Week</p>}
            {isFuture && !isCurrent && <p className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-wider mt-1">Upcoming</p>}
            {isRecentPast && <p className="text-[10px] font-bold text-violet-400/70 uppercase tracking-wider mt-1">Past</p>}
        </div>
    );
};

// ─── YD Hours Trend Widget ────────────────────────────────────────────────────
const YDHoursTrend: FC<{ ydShifts: YDShiftSnapshot[] }> = ({ ydShifts }) => {
    const [trendMode, setTrendMode] = useState<'hours' | 'earnings'>('hours');
    const now = new Date();
    const currentMonday = startOfWeek(now, { weekStartsOn: 1 });
    const weekOffsets = [-4, -3, -2, -1, 0, 1, 2, 3];

    const dataPoints = weekOffsets.map(offset => {
        const weekStart = new Date(currentMonday);
        weekStart.setDate(currentMonday.getDate() + offset * 7);
        const weekEnd = addDays(weekStart, 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekShifts = ydShifts.filter(s => {
            const t = new Date(s.startTime).getTime();
            return t >= weekStart.getTime() && t <= weekEnd.getTime() && s.status !== 'removed';
        });

        const totalPaid = weekShifts.reduce((sum, s) => sum + (s.paidHrs || getPaidHrs(s.durationHrs)), 0);
        const weekEarnings = calcWeeklyEarnings(weekShifts);

        const label = offset === 0
            ? 'This Week'
            : offset === 1
            ? 'Next Week'
            : offset === -1
            ? 'Last Week'
            : offset === -2
            ? '2 Wks Ago'
            : `${format(weekStart, 'MMM d')}`;

        return {
            label,
            hours:    parseFloat(totalPaid.toFixed(1)),
            earnings: parseFloat(weekEarnings.net.toFixed(0)),
            isCurrent:    offset === 0,
            isFuture:     offset > 0,
            isRecentPast: offset === -1 || offset === -2,
            weekStart,
        };
    });

    const filtered = dataPoints.filter(d => d.hours > 0 || d.isCurrent || d.isFuture || d.isRecentPast);
    const isEarnings = trendMode === 'earnings';
    const activeKey  = isEarnings ? 'earnings' : 'hours';
    const chartColor = isEarnings ? '#34d399' : '#818cf8';

    // Insights
    const currentHrs = filtered.find(d => d.isCurrent)?.hours    ?? 0;
    const nextHrs    = filtered.find(d => d.label === 'Next Week')?.hours ?? 0;
    const lastHrs    = filtered.find(d => d.label === 'Last Week')?.hours ?? 0;
    const currentNet = filtered.find(d => d.isCurrent)?.earnings  ?? 0;
    const nextNet    = filtered.find(d => d.label === 'Next Week')?.earnings ?? 0;
    const lastNet    = filtered.find(d => d.label === 'Last Week')?.earnings ?? 0;
    const allZero    = filtered.every(d => d.hours === 0);

    let insight = 'Your roster appears stable over the coming weeks.';
    if (!allZero) {
        if (isEarnings) {
            const d = nextNet - currentNet;
            if (nextNet > 0 && currentNet > 0) {
                if (d > 10)       insight = `Next week's est. take-home is ${fmt$(d)} more than this week.`;
                else if (d < -10) insight = `Next week's est. take-home is ${fmt$(Math.abs(d))} less than this week.`;
                else              insight = 'Your estimated take-home is consistent into next week.';
            } else if (lastNet > 0 && currentNet > 0) {
                const d2 = currentNet - lastNet;
                if (d2 > 10)       insight = `Take-home is up ${fmt$(d2)} compared to last week.`;
                else if (d2 < -10) insight = `Take-home is down ${fmt$(Math.abs(d2))} compared to last week.`;
            } else { insight = 'Showing estimated take-home from your published roster.'; }
        } else {
            const d = nextHrs - currentHrs;
            if (nextHrs > 0 && currentHrs > 0) {
                if (d > 1)       insight = `Next week has ${d.toFixed(1).replace('.0', '')} more paid hours than this week.`;
                else if (d < -1) insight = `Next week has ${Math.abs(d).toFixed(1).replace('.0', '')} fewer paid hours than this week.`;
                else             insight = 'Your scheduled hours are consistent into next week.';
            } else if (lastHrs > 0 && currentHrs > 0) {
                const d2 = currentHrs - lastHrs;
                if (d2 > 0.5)       insight = `Hours are up ${d2.toFixed(1).replace('.0', '')} hrs compared to last week.`;
                else if (d2 < -0.5) insight = `Hours are down ${Math.abs(d2).toFixed(1).replace('.0', '')} hrs compared to last week.`;
            }
        }
    } else { insight = 'No roster data yet. Refresh to pull your YD shifts.'; }

    const pastPoints     = filtered.filter(d => !d.isFuture);
    const activeValues   = pastPoints.map(d => isEarnings ? d.earnings : d.hours);
    const overallTrendUp = activeValues.length >= 2 && activeValues[activeValues.length - 1] > activeValues[0];
    const TrendIcon  = overallTrendUp ? TrendingUp : TrendingDown;
    const trendColor = overallTrendUp ? 'text-emerald-400' : 'text-amber-400';

    return (
        <section className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-5">
            {/* Header + toggle */}
            <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                    <BarChart2 size={18} className="text-violet-400" />
                    <h2 className="text-lg font-bold text-white">YD Roster Trend</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-surface-elevated border border-border rounded-lg p-0.5 text-[11px] font-bold">
                        <button
                            onClick={() => setTrendMode('hours')}
                            className={`px-2.5 py-1 rounded-md transition-all ${trendMode === 'hours' ? 'bg-indigo-500/20 text-indigo-300' : 'text-text-secondary hover:text-white'}`}
                        >Hours</button>
                        <button
                            onClick={() => setTrendMode('earnings')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${trendMode === 'earnings' ? 'bg-emerald-500/20 text-emerald-300' : 'text-text-secondary hover:text-white'}`}
                        ><DollarSign size={10} />Earnings</button>
                    </div>
                    {!allZero && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${trendColor}`}>
                            <TrendIcon size={13} /><span>{overallTrendUp ? 'Up' : 'Down'}</span>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-sm font-medium text-text-secondary leading-relaxed italic px-1">{insight}</p>

            {allZero ? (
                <div className="h-40 flex items-center justify-center">
                    <p className="text-sm text-text-secondary/60 font-medium">No trend data available yet.</p>
                </div>
            ) : (
                <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filtered} margin={{ top: 10, right: 8, left: isEarnings ? 8 : -16, bottom: 0 }}>
                            <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                                tickFormatter={v => isEarnings ? `$${v}` : `${v}h`}
                                width={isEarnings ? 42 : 30}
                            />
                            <Tooltip content={(props: any) => <TrendTooltip {...props} mode={trendMode} />} cursor={{ stroke: `${chartColor}50`, strokeWidth: 1 }} />
                            {filtered.findIndex(d => d.isCurrent) !== -1 && (
                                <ReferenceLine x="This Week" stroke={`${chartColor}60`} strokeDasharray="4 4" strokeWidth={1.5} />
                            )}
                            <Area
                                type="monotone" dataKey={activeKey} stroke={chartColor} strokeWidth={2.5} fill="url(#trendGrad)"
                                dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    if (payload.isCurrent) return (
                                        <g key={`dc-${cx}`}>
                                            <circle cx={cx} cy={cy} r={6}  fill={chartColor} stroke="#1e293b" strokeWidth={2} />
                                            <circle cx={cx} cy={cy} r={11} fill={`${chartColor}25`} />
                                        </g>
                                    );
                                    if (payload.isFuture) return <circle key={`df-${cx}`} cx={cx} cy={cy} r={4} fill={`${chartColor}50`} stroke={chartColor} strokeWidth={1.5} strokeDasharray="2 2" />;
                                    return <circle key={`dp-${cx}`} cx={cx} cy={cy} r={4} fill={chartColor} stroke="#1e293b" strokeWidth={2} />;
                                }}
                                activeDot={{ r: 6, fill: chartColor, stroke: '#1e293b', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Legend pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
                {filtered.map(d => (
                    <div key={d.label} className={`flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 ${
                        d.isCurrent    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        : d.isFuture   ? 'bg-surface-elevated text-text-secondary/60 border border-border'
                        : d.isRecentPast ? 'bg-violet-500/10 text-violet-300/80 border border-violet-500/20'
                        : 'bg-surface-elevated text-text-secondary border border-border'
                    }`}>
                        <span>{d.label}</span>
                        {isEarnings
                            ? (d.earnings > 0 ? <span className="opacity-80">{fmt$(d.earnings)}</span> : d.isRecentPast && <span className="opacity-40">—</span>)
                            : (d.hours > 0    ? <span className="opacity-80">{d.hours.toFixed(1).replace('.0', '')}h</span> : d.isRecentPast && <span className="opacity-40">—</span>)
                        }
                    </div>
                ))}
            </div>
        </section>
    );
};




const CalendarConnect: FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { setToken, fetchEvents } = useCalendarStore();
    const [isConnecting, setIsConnecting] = useState(false);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setToken(tokenResponse.access_token, tokenResponse.expires_in);
            await fetchEvents();
            setIsConnecting(false);
        },
        onError: () => setIsConnecting(false),
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
    });

    if (compact) {
        return (
            <button
                onClick={() => { setIsConnecting(true); login(); }}
                disabled={isConnecting}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
            >
                <RefreshCw size={12} className={isConnecting ? 'animate-spin' : ''} />
                {isConnecting ? 'Connecting...' : 'Reconnect Calendar'}
            </button>
        );
    }

    return (
        <section className="bg-surface border border-border rounded-3xl p-6 shadow-sm">
            <button
                onClick={() => { setIsConnecting(true); login(); }}
                disabled={isConnecting}
                className="w-full py-8 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 text-text-secondary hover:text-white hover:border-white/40 transition-all bg-surface-elevated/50"
            >
                <Calendar size={24} />
                <span className="text-sm font-bold">{isConnecting ? 'Connecting...' : 'Connect Google Calendar'}</span>
                <span className="text-xs opacity-80">Read-only access for daily schedule & roster</span>
            </button>
        </section>
    );
};

const WeekCard: FC<{ weekIndex: number; shifts: YDShiftSnapshot[]; startOfWeek: Date }> = ({ weekIndex, shifts, startOfWeek }) => {
    const endOfWeek = addDays(startOfWeek, 6);
    let title = weekIndex === 0 ? 'Current Week' : weekIndex === 1 ? 'Next Week' : `Week ${weekIndex + 1}`;
    const dateRange = `${format(startOfWeek, 'MMM d')} – ${format(endOfWeek, 'MMM d')}`;

    const activeShifts = shifts.filter(s => s.status !== 'removed');
    const totalHours = activeShifts.reduce((sum, s) => sum + (s.paidHrs || s.durationHrs || 0), 0);

    // Earnings
    const weeklyEarnings = calcWeeklyEarnings(activeShifts);
    const earningsDelta  = calcEarningsDelta(shifts);

    let hourChange = 0;
    shifts.forEach(s => {
        const currentPaid = s.paidHrs || s.durationHrs || 0;
        const prevPaid = s.previousPaidHrs || s.previousDurationHrs || 0;
        if (s.status === 'added') hourChange += currentPaid;
        else if (s.status === 'removed') hourChange -= currentPaid;
        else if (s.status === 'modified' && prevPaid !== undefined) {
            hourChange += (currentPaid - prevPaid);
        }
    });

    const formatEventTime = (iso: string) => format(new Date(iso), 'h:mm a');

    const getBreakText = (scheduledHrs: number) => {
        if (scheduledHrs <= 5) return null;
        if (scheduledHrs < 8) return '30 min break';
        return '1 hr break';
    };

    const isCurrent  = weekIndex === 0;
    const cardStyles = isCurrent
        ? 'bg-surface-elevated border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.05)] ring-1 ring-indigo-500/20'
        : weekIndex > 1
        ? 'bg-surface-elevated/40 border-border/60 opacity-80 hover:opacity-100'
        : 'bg-surface-elevated border-border';

    return (
        <div className={`w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] shrink-0 snap-start rounded-2xl p-5 flex flex-col gap-5 transition-all border ${cardStyles}`}>
            {/* 1. Week Range & 4. Shift Count */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <p className="text-xs font-medium text-text-secondary mt-0.5">{dateRange}</p>
                </div>
                <div className="text-xs font-bold text-text-secondary bg-surface px-2.5 py-1 rounded-lg border border-border">
                    {activeShifts.length} {activeShifts.length === 1 ? 'shift' : 'shifts'} scheduled
                </div>
            </div>

            {/* Hours row */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-end justify-between">
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-indigo-400 tracking-tight">
                            {totalHours.toFixed(1).replace('.0', '')} hrs
                        </span>
                        <span className="text-sm font-bold text-text-secondary mb-1">paid</span>
                    </div>
                    {weeklyEarnings.gross > 0 && (
                        <span className="text-2xl font-black text-emerald-400 tracking-tight">{fmt$(weeklyEarnings.net)}</span>
                    )}
                </div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                    {hourChange > 0 ? (
                        <span className="text-emerald-400 flex items-center gap-1.5"><TrendingUp size={16} /> +{hourChange.toFixed(1).replace('.0', '')} hrs since last sync</span>
                    ) : hourChange < 0 ? (
                        <span className="text-amber-400 flex items-center gap-1.5"><TrendingDown size={16} /> {hourChange.toFixed(1).replace('.0', '')} hrs since last sync</span>
                    ) : (
                        <span className="text-text-secondary flex items-center gap-1.5"><Minus size={16} /> No change</span>
                    )}
                </div>
            </div>

            {/* Earnings card */}
            {weeklyEarnings.gross > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Estimated Earnings</span>
                        <span className="text-[9px] text-text-secondary/50 font-medium italic">est. only · not payroll</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-text-secondary">Gross</span>
                            <span className="text-sm font-bold text-white">{fmt$(weeklyEarnings.gross)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-text-secondary">Tax (~13.7%)</span>
                            <span className="text-xs font-medium text-text-secondary/70">−{fmt$(weeklyEarnings.tax)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-emerald-500/10">
                            <span className="text-sm font-bold text-white">Take-Home</span>
                            <span className="text-lg font-black text-emerald-400">{fmt$(weeklyEarnings.net)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Roster change earnings impact */}
            {Math.abs(earningsDelta) > 1 && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                    earningsDelta > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                }`}>
                    {earningsDelta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    Roster update: take-home {earningsDelta > 0 ? 'up' : 'down'} ~{fmt$(Math.abs(earningsDelta))}
                </div>
            )}

            {/* 5. Full Shift Breakdown & 6. Shift Change Visibility */}
            <div className="pt-3 flex flex-col gap-2">
                {shifts.length === 0 ? (
                    <div className="p-3 bg-surface/50 border border-border rounded-xl text-center">
                        <p className="text-sm text-text-secondary font-medium">No shifts found for this week.</p>
                    </div>
                ) : (() => {
                    const now = new Date();
                    const sorted = [...shifts].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    // Find the first upcoming shift (end time is in the future, status not removed)
                    const nextShiftId = sorted.find(
                        s => s.status !== 'removed' && new Date(s.endTime) > now
                    )?.id;

                    return sorted.map(shift => {
                        const breakText = getBreakText(shift.durationHrs);
                        const shiftEnded = new Date(shift.endTime) <= now;
                        const isNext = shift.id === nextShiftId;
                        const shiftEst = shift.status !== 'removed' ? calcShiftEarnings(shift.startTime, shift.endTime) : null;

                        const completedStyles = shiftEnded && shift.status !== 'removed'
                            ? 'opacity-50'
                            : '';

                        return (
                            <div key={shift.id} className={`flex flex-col bg-surface border rounded-xl p-3.5 transition-all ${isNext ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-border'} ${completedStyles}`}>
                                {shift.status === 'removed' ? (
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-text-secondary line-through">{format(new Date(shift.startTime), 'EEEE')} Shift Removed</span>
                                        <span className="text-sm font-medium text-text-secondary mt-1">Previous Paid: {(shift.paidHrs || shift.durationHrs || 0).toFixed(1).replace('.0', '')} hrs</span>
                                        <span className="text-sm font-bold text-amber-400 mt-0.5">-{(shift.paidHrs || shift.durationHrs || 0).toFixed(1).replace('.0', '')} hrs</span>
                                    </div>
                                ) : shift.status === 'added' ? (
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className={`text-sm font-bold ${shiftEnded ? 'text-text-secondary line-through' : 'text-white'}`}>
                                                {format(new Date(shift.startTime), 'EEEE')} Shift Added
                                            </span>
                                            {isNext && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full">Next Shift</span>}
                                        </div>
                                        <span className={`text-sm font-medium mt-0.5 ${shiftEnded ? 'text-text-secondary line-through' : 'text-white'}`}>{formatEventTime(shift.startTime)} – {formatEventTime(shift.endTime)}</span>
                                        <span className="text-sm font-bold text-emerald-400 mt-1">+{(shift.paidHrs || shift.durationHrs || 0).toFixed(1).replace('.0', '')} hrs paid</span>
                                        {breakText && <span className="text-[11px] font-medium text-text-secondary mt-1">({breakText})</span>}
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-sm font-bold ${shiftEnded ? 'text-text-secondary line-through' : 'text-white'}`}>
                                                    {format(new Date(shift.startTime), 'EEEE')}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {isNext && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full">Next Shift</span>}
                                                    {shiftEnded ? (
                                                        <span className="text-xs font-bold text-text-secondary/50 line-through">{(shift.paidHrs || shift.durationHrs || 0).toFixed(1).replace('.0', '')} hrs</span>
                                                    ) : (
                                                        <span className="text-sm font-bold text-indigo-300">{(shift.paidHrs || shift.durationHrs || 0).toFixed(1).replace('.0', '')} hrs</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-sm font-medium ${shiftEnded ? 'text-text-secondary/60 line-through' : 'text-text-secondary'}`}>
                                                {formatEventTime(shift.startTime)} – {formatEventTime(shift.endTime)}
                                            </span>
                                            {shiftEst && !shiftEnded && (
                                                <span className="text-[11px] font-medium text-emerald-300/50 mt-0.5">~{fmt$(shiftEst.net)} est.</span>
                                            )}
                                        </div>
                                        {breakText && !shiftEnded && <span className="text-[11px] font-medium text-text-secondary/70 mt-1">({breakText})</span>}
                                        
                                        {shift.status === 'modified' && (
                                            <div className="mt-2.5 pt-2.5 border-t border-border flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                                    <span>Was:</span>
                                                    <span className="line-through">{formatEventTime(shift.previousStartTime!)} – {formatEventTime(shift.previousEndTime!)}</span>
                                                    <span className="opacity-70">({(shift.previousPaidHrs || shift.previousDurationHrs || 0).toFixed(1).replace('.0', '')} hrs)</span>
                                                </div>
                                                {((shift.paidHrs || shift.durationHrs || 0) - (shift.previousPaidHrs || shift.previousDurationHrs || 0)) !== 0 && (
                                                    <div className={`text-xs font-bold ${
                                                        ((shift.paidHrs || shift.durationHrs || 0) - (shift.previousPaidHrs || shift.previousDurationHrs || 0)) > 0 ? 'text-emerald-400' : 'text-amber-400'
                                                    }`}>
                                                        {((shift.paidHrs || shift.durationHrs || 0) - (shift.previousPaidHrs || shift.previousDurationHrs || 0)) > 0 ? '+' : ''}
                                                        {((shift.paidHrs || shift.durationHrs || 0) - (shift.previousPaidHrs || shift.previousDurationHrs || 0)).toFixed(1).replace('.0', '')} Hours
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
};

// Helper: Generate Roster Change Summary
const generateRosterSummary = (shifts: YDShiftSnapshot[]) => {
    const now = new Date();
    const currentMonday = startOfWeek(now, { weekStartsOn: 1 });
    currentMonday.setHours(0, 0, 0, 0);

    const changedShifts = shifts.filter(s => {
        if (s.status === 'unchanged') return false;
        const shiftTime = new Date(s.startTime).getTime();
        return shiftTime >= currentMonday.getTime();
    });

    if (changedShifts.length === 0) return null;

    const changesByWeek: { [weekStartStr: string]: YDShiftSnapshot[] } = {};
    changedShifts.forEach(s => {
        const date = new Date(s.startTime);
        const mon = startOfWeek(date, { weekStartsOn: 1 });
        const monKey = format(mon, 'yyyy-MM-dd');
        if (!changesByWeek[monKey]) changesByWeek[monKey] = [];
        changesByWeek[monKey].push(s);
    });

    const weekSummaries = Object.keys(changesByWeek).sort().map(monKey => {
        const weekShifts = changesByWeek[monKey];
        const weekStart = new Date(monKey);
        const weekLabel = `Week of ${format(weekStart, 'MMM d')}`;

        const descriptions = weekShifts.map(s => {
            const dayName = format(new Date(s.startTime), 'EEEE');
            const currentPaid = s.paidHrs || s.durationHrs || 0;
            const prevPaid = s.previousPaidHrs || s.previousDurationHrs || 0;

            if (s.status === 'added') {
                return `${dayName} shift added worth ${currentPaid.toFixed(1).replace('.0', '')} hours`;
            } else if (s.status === 'removed') {
                return `${dayName} shift of ${currentPaid.toFixed(1).replace('.0', '')} hours removed`;
            } else if (s.status === 'modified') {
                const diff = currentPaid - prevPaid;
                if (diff === 0) return ''; // Skip callout if hours didn't change
                const direction = diff > 0 ? 'increased' : 'reduced';
                return `${dayName} shift ${direction} by ${Math.abs(diff).toFixed(1).replace('.0', '')} hour${Math.abs(diff) !== 1 ? 's' : ''}`;
            }
            return '';
        }).filter(Boolean);

        let netHrs = 0;
        weekShifts.forEach(s => {
            const currentPaid = s.paidHrs || s.durationHrs || 0;
            const prevPaid = s.previousPaidHrs || s.previousDurationHrs || 0;
            if (s.status === 'added') netHrs += currentPaid;
            else if (s.status === 'removed') netHrs -= currentPaid;
            else if (s.status === 'modified') netHrs += (currentPaid - prevPaid);
        });

        let netText = '';
        if (netHrs > 0) {
            netText = `you gained ${netHrs.toFixed(1).replace('.0', '')} extra hour${netHrs !== 1 ? 's' : ''}`;
        } else if (netHrs < 0) {
            netText = `you lost ${Math.abs(netHrs).toFixed(1).replace('.0', '')} hour${Math.abs(netHrs) !== 1 ? 's' : ''} of the week`;
        } else {
            netText = `no net change in hours`;
        }

        let combinedDesc = '';
        if (descriptions.length === 1) {
            combinedDesc = `${descriptions[0]}, so ${netText}.`;
        } else if (descriptions.length === 2) {
            combinedDesc = `${descriptions[0]} and ${descriptions[1]}, so ${netText}.`;
        } else {
            combinedDesc = `${descriptions.slice(0, -1).join(', ')}, and ${descriptions[descriptions.length - 1]}, so ${netText}.`;
        }

        combinedDesc = combinedDesc.charAt(0).toUpperCase() + combinedDesc.slice(1);

        return {
            weekLabel,
            summaryText: combinedDesc,
            netHrs,
            hasChanges: descriptions.length > 0
        };
    });

    return weekSummaries.filter(s => s.hasChanges);
};

export const CalendarSection: FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { accessToken, events, ydShifts, fetchEvents, loading, error, clearToken, lastFetched, loadFromDB } = useCalendarStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // On mount: load persisted snapshot from Supabase (works even without a fresh Google token)
    useEffect(() => {
        loadFromDB();
    }, []);

    // Auto-refresh when token becomes available
    useEffect(() => {
        if (accessToken) {
            fetchEvents();
        }
    }, [accessToken]);

    if (!CLIENT_ID) {
        return (
            <div className="p-4 bg-surface/30 border border-white/5 rounded-2xl text-center">
                <p className="text-sm text-text-secondary">Calendar integration requires VITE_GOOGLE_CLIENT_ID in .env</p>
            </div>
        );
    }

    // Token state — used only for the reconnect banner, NOT to gate the entire UI
    const hasToken = !!accessToken;

    // Process Events for Today
    const now = new Date();
    const todaysEvents = events.filter(e => isSameDay(new Date(e.startTime), now));
    todaysEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    let daySummary = "Your day is completely free.";
    if (todaysEvents.length > 0) {
        const totalHrs = todaysEvents.reduce((sum, e) => sum + e.durationHrs, 0);
        const hasYD = todaysEvents.some(e => e.title.includes('RETAIL SALES ASSISTANT'));
        
        if (hasYD) {
            daySummary = `You have a retail shift today, plus ${todaysEvents.length - 1} other events.`;
            if (todaysEvents.length === 1) daySummary = `You have a retail shift today.`;
        } else {
            daySummary = `You have ${todaysEvents.length} events today, with ${totalHrs.toFixed(1).replace('.0', '')} hours scheduled.`;
        }
    }

    const formatEventTime = (iso: string) => format(new Date(iso), 'h:mm a');

    // Group YD Shifts by Week
    const day = now.getDay();
    const currentMonday = new Date(now);
    currentMonday.setDate(currentMonday.getDate() - day + (day === 0 ? -6 : 1));
    currentMonday.setHours(0,0,0,0);

    const getWeekIndex = (iso: string) => {
        const d = new Date(iso).getTime();
        const diff = d - currentMonday.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    };

    const weeks: { [key: number]: YDShiftSnapshot[] } = {};
    ydShifts.forEach(shift => {
        const idx = getWeekIndex(shift.startTime);
        if (idx >= 0 && idx < 4) {
            if (!weeks[idx]) weeks[idx] = [];
            weeks[idx].push(shift);
        }
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchEvents();
        setIsRefreshing(false);
    };

    const sectionCls = embedded
        ? 'px-6 py-5 space-y-4'
        : 'bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-5';
    const dividerCls = embedded ? 'mx-0 border-t border-border/40' : 'hidden';

    return (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
        <>
            {error && <div className={`text-sm font-bold text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex justify-between items-center ${embedded ? 'mx-6 mb-2' : 'mb-6'}`}>Sync failed: {error} <button onClick={clearToken} className="underline text-xs opacity-80 hover:opacity-100">Disconnect</button></div>}

            {/* Today's Schedule */}
            <section className={sectionCls}>
                <div className="flex items-center justify-between pb-1">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                        <Calendar size={18} className="text-blue-400" />
                        Today's Schedule
                    </h2>
                    <div className="flex items-center gap-2">
                        {!hasToken && <CalendarConnect compact />}
                        <span className="text-xs font-bold text-text-secondary bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border">{todaysEvents.length} events</span>
                    </div>
                </div>
                <p className="text-sm font-medium text-text-secondary/90 leading-relaxed">{daySummary}</p>
                <div className="space-y-2.5">
                    {todaysEvents.length === 0 ? (
                        <div className="p-5 bg-surface-elevated border border-dashed border-border rounded-2xl flex items-center justify-center">
                            <span className="text-sm font-medium text-text-secondary">No events scheduled for today.</span>
                        </div>
                    ) : (
                        todaysEvents.map(event => (
                            <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-elevated border border-border rounded-xl gap-3 min-w-0">
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <span className="text-sm font-bold text-white truncate block">{event.title}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-text-secondary shrink-0 pl-5 sm:pl-0 bg-surface px-2.5 py-1 rounded-md border border-border">
                                    <Clock size={12} className="opacity-70 text-blue-400" />
                                    {formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <div className={dividerCls} />

            {/* YD Roster Hours Tracker */}
            <section className={sectionCls}>
                <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2.5">
                        <Briefcase size={18} className="text-indigo-400" />
                        <h2 className="text-lg font-bold text-white">YD Roster Hours</h2>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        {lastFetched && <span className="text-[11px] font-medium text-text-secondary hidden sm:inline-block">Synced: {format(new Date(lastFetched), 'h:mm a')}</span>}
                        {/* Minimal elegant carousel navigation */}
                        <div className="flex items-center gap-0.5 bg-surface-elevated border border-border rounded-lg p-0.5">
                            <button
                                onClick={() => {
                                    const el = document.getElementById('roster-carousel');
                                    if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
                                }}
                                className="p-1 text-text-secondary hover:text-white transition-colors"
                                title="Scroll Left"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <div className="w-[1px] h-3 bg-border mx-0.5" />
                            <button
                                onClick={() => {
                                    const el = document.getElementById('roster-carousel');
                                    if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
                                }}
                                className="p-1 text-text-secondary hover:text-white transition-colors"
                                title="Scroll Right"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing || loading}
                            className="text-xs font-bold flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg shrink-0"
                        >
                            <RefreshCw size={13} className={isRefreshing || loading ? 'animate-spin' : ''} />
                            <span className="hidden md:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Roster Update Summary Card */}
                {(() => {
                    const summaries = generateRosterSummary(ydShifts);
                    if (!summaries || summaries.length === 0) return null;

                    return (
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4.5 space-y-2.5">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                                <h3 className="text-sm font-bold text-white">Latest Roster Updates</h3>
                            </div>
                            <div className="space-y-2">
                                {summaries.map((s, idx) => (
                                    <div key={idx} className="text-xs text-text-secondary leading-relaxed flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3">
                                        <span className="font-bold text-indigo-300 shrink-0 min-w-[100px]">{s.weekLabel}:</span>
                                        <span>{s.summaryText}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <div id="roster-carousel" className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 pt-1 snap-x snap-mandatory scroll-smooth items-stretch">
                    {[0, 1, 2, 3].map(weekIndex => {
                        const shifts = weeks[weekIndex] || [];
                        if (weekIndex > 1 && shifts.length === 0) return null;
                        const startOfWeek = new Date(currentMonday);
                        startOfWeek.setDate(currentMonday.getDate() + (weekIndex * 7));
                        return <WeekCard key={weekIndex} weekIndex={weekIndex} shifts={shifts} startOfWeek={startOfWeek} />;
                    })}
                </div>
            </section>

            <div className={dividerCls} />

            {/* YD Roster Trend */}
            <section className={embedded ? 'px-6 pb-6 pt-0' : ''}>
                <YDHoursTrend ydShifts={ydShifts} />
            </section>
        </>
        </GoogleOAuthProvider>
    );
};

