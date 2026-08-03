import { FC, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { History, X, User, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export const ActivityLogView: FC<{ onClose: () => void }> = ({ onClose }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('lifemap_activity')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (data) setLogs(data);
            setLoading(false);
        };
        fetchLogs();

        // Realtime subscription
        const sub = supabase
            .channel('lifemap_activity_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lifemap_activity' }, payload => {
                setLogs(prev => [payload.new, ...prev].slice(0, 50));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    return (
        <div className="absolute inset-y-0 right-0 w-80 bg-surface border-l border-border/80 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface-elevated">
                <h3 className="font-bold flex items-center gap-2 text-text-primary">
                    <History size={16} /> Activity Log
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md text-text-secondary transition-colors">
                    <X size={16} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-background">
                {loading ? (
                    <div className="text-sm text-text-secondary animate-pulse text-center mt-10">Loading activity...</div>
                ) : logs.length === 0 ? (
                    <div className="text-sm text-text-secondary text-center mt-10">No recent activity.</div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex gap-3 relative">
                            <div className="flex flex-col items-center gap-1">
                                <div className={clsx(
                                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                                    log.actor === 'claude' 
                                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                        : "bg-surface-elevated text-text-secondary border-white/10"
                                )}>
                                    {log.actor === 'claude' ? <Bot size={12} /> : <User size={12} />}
                                </div>
                                <div className="w-[1px] h-full bg-white/5" />
                            </div>
                            
                            <div className="flex flex-col pb-4 pt-1">
                                <div className="text-xs text-text-secondary mb-0.5">
                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </div>
                                <div className="text-sm font-medium text-text-primary">
                                    {log.detail}
                                </div>
                                {log.action && (
                                    <div className="text-[10px] uppercase tracking-wider text-text-secondary/50 font-bold mt-1.5 font-mono">
                                        {log.action.replace(/_/g, ' ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
