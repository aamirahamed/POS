import { FC, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Search, Clock, AlertCircle } from 'lucide-react';

const BriefsPage: FC = () => {
    const [briefs, setBriefs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const { data, error } = await supabase
                .from('lifemap_project_briefs')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });
                
            if (!error && data) {
                setBriefs(data);
            }
            setLoading(false);
        };
        load();
    }, []);

    const filtered = briefs.filter(b => 
        (b.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (b.one_liner || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full w-full bg-background flex flex-col items-center">
            <div className="w-full max-w-5xl px-8 py-10 flex flex-col h-full gap-8">
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-accent mb-2">
                            <FileText size={24} />
                            <span className="font-bold tracking-widest text-sm">PROJECT BRIEFS</span>
                        </div>
                        <h1 className="text-4xl font-black text-text-primary">Portfolio & CV Source</h1>
                        <p className="text-text-secondary text-sm max-w-xl">
                            This page aggregates all Project Briefs across your Life Map. Claude uses this structured data to generate your portfolio, CV entries, and context summaries.
                        </p>
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input 
                            type="text"
                            placeholder="Search briefs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-surface border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-text-primary focus:border-accent focus:outline-none w-[300px]"
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-text-secondary">Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-20 custom-scrollbar pr-4">
                        {filtered.map(brief => {
                            const isStale = brief.last_reviewed_at && (Date.now() - new Date(brief.last_reviewed_at).getTime() > 1000 * 60 * 60 * 24 * 30);
                            
                            const missingFields = [];
                            if (!brief.one_liner) missingFields.push('One-liner');
                            if (!brief.problem) missingFields.push('Problem');
                            if (!brief.my_role) missingFields.push('My Role');
                            
                            return (
                                <div key={brief.id} className="bg-surface rounded-xl border border-white/5 p-6 hover:border-accent/50 transition-colors flex flex-col gap-4 group">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-bold text-text-primary">{brief.name || 'Unnamed Project'}</h3>
                                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-white/5 text-text-secondary">
                                            {brief.stage || 'Unknown Stage'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-text-secondary flex-1">
                                        {brief.one_liner || 'No one-liner provided.'}
                                    </p>
                                    
                                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                                        {isStale && (
                                            <div className="text-xs text-orange-400 flex items-center gap-1.5">
                                                <Clock size={12} /> Stale (Not reviewed recently)
                                            </div>
                                        )}
                                        {missingFields.length > 0 ? (
                                            <div className="text-xs text-blue-400 flex items-center gap-1.5">
                                                <AlertCircle size={12} /> Missing: {missingFields.join(', ')}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-green-400 flex items-center gap-1.5">
                                                <AlertCircle size={12} /> Complete
                                            </div>
                                        )}
                                        <div className="text-xs text-text-secondary mt-1">
                                            Updated {new Date(brief.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BriefsPage;
