import { FC, useState, useEffect } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { supabase } from '@/lib/supabase';
import { getProjectBrief, updateBriefField, getBriefSuggestions, resolveBriefSuggestion } from '@/services/lifeMapService';
import { X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export const BriefDrawer: FC = () => {
    const { nodes, selectedBriefNodeId, setSelectedBriefNodeId } = useLifeMapStore();
    const [brief, setBrief] = useState<any>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Derived node info
    const node = nodes.find(n => n.id === selectedBriefNodeId);
    
    useEffect(() => {
        const load = async () => {
            if (!selectedBriefNodeId) return;
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const b = await getProjectBrief(user.id, selectedBriefNodeId);
                setBrief(b || { node_id: selectedBriefNodeId });
                const suggs = await getBriefSuggestions(user.id, selectedBriefNodeId);
                setSuggestions(suggs);
            }
            setLoading(false);
        };
        load();
    }, [selectedBriefNodeId]);

    if (!selectedBriefNodeId || !node) return null;

    const hue = (node.data.hue as number) || 210;

    const handleClose = () => setSelectedBriefNodeId(null);

    const handleUpdate = async (field: string, value: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await updateBriefField(user.id, selectedBriefNodeId, field, value);
            setBrief({ ...brief, [field]: value });
        }
    };

    const handleResolve = async (suggestionId: string, accept: boolean) => {
        await resolveBriefSuggestion(suggestionId, accept);
        setSuggestions(suggestions.filter(s => s.id !== suggestionId));
        
        // Reload brief if accepted
        if (accept) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const b = await getProjectBrief(user.id, selectedBriefNodeId);
                setBrief(b);
            }
        }
    };

    // Calculate completeness
    const missingFields = [];
    if (!brief?.one_liner) missingFields.push('One-liner');
    if (!brief?.problem) missingFields.push('Problem');
    if (!brief?.my_role) missingFields.push('My Role');
    if (!brief?.outcomes || brief.outcomes.length === 0) missingFields.push('Outcomes');

    const isStale = brief?.last_reviewed_at && (Date.now() - new Date(brief.last_reviewed_at).getTime() > 1000 * 60 * 60 * 24 * 30); // 30 days

    return (
        <div className="absolute top-0 right-0 h-full w-[450px] bg-surface-elevated/95 backdrop-blur-2xl border-l border-white/5 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="p-6 border-b border-white/5 relative overflow-hidden flex flex-col gap-5 shrink-0">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top right, hsl(${hue}, 70%, 50%), transparent 70%)` }} />
                
                <div className="flex items-center justify-between z-10 relative">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
                            {node.type === 'domain' ? 'Domain Brief' : 'Project Brief'}
                        </div>
                        <h2 className="text-xl font-black text-text-primary flex items-center gap-2">
                            {node.data.label as string}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Stale & Completeness */}
                <div className="z-10 flex flex-col gap-2">
                    {isStale && (
                        <div className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-md flex items-center gap-2">
                            <Clock size={12} /> Stale: Not reviewed recently
                        </div>
                    )}
                    {missingFields.length > 0 && (
                        <div className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-md flex items-center gap-2">
                            <AlertCircle size={12} /> Missing: {missingFields.join(', ')}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                {loading ? (
                    <div className="text-text-secondary text-sm">Loading brief...</div>
                ) : (
                    <>
                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                                <h3 className="text-sm font-bold text-accent">Pending Suggestions from Claude</h3>
                                {suggestions.map(s => (
                                    <div key={s.id} className="bg-black/40 rounded p-3 text-sm flex flex-col gap-2">
                                        <div><span className="font-bold text-text-secondary">{s.field}:</span> {typeof s.suggested_value === 'string' ? s.suggested_value : JSON.stringify(s.suggested_value)}</div>
                                        <div className="text-xs italic text-text-secondary">"{s.reason}"</div>
                                        <div className="flex gap-2 mt-1">
                                            <button onClick={() => handleResolve(s.id, true)} className="flex-1 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-green-500/30">
                                                <CheckCircle size={12}/> Accept
                                            </button>
                                            <button onClick={() => handleResolve(s.id, false)} className="flex-1 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-500/30">
                                                <XCircle size={12}/> Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Fields */}
                        <div className="space-y-6">
                            <FieldEditor label="One-Liner" value={brief?.one_liner} onChange={(v) => handleUpdate('one_liner', v)} multiline={false} />
                            <FieldEditor label="The Problem" value={brief?.problem} onChange={(v) => handleUpdate('problem', v)} multiline={true} />
                            <FieldEditor label="What It Does" value={brief?.what_it_does} onChange={(v) => handleUpdate('what_it_does', v)} multiline={true} />
                            <FieldEditor label="My Role" value={brief?.my_role} onChange={(v) => handleUpdate('my_role', v)} multiline={true} />
                            
                            {/* JSON Editor for arrays to keep it simple for now */}
                            <FieldEditor label="Features (JSON)" value={JSON.stringify(brief?.features || [], null, 2)} onChange={(v) => {
                                try { handleUpdate('features', JSON.parse(v)); } catch (e) { /* ignore parse error while typing */ }
                            }} multiline={true} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const FieldEditor = ({ label, value, onChange, multiline }: { label: string, value: string, onChange: (v: string) => void, multiline: boolean }) => {
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</label>
            {multiline ? (
                <textarea
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-text-primary focus:border-accent focus:outline-none min-h-[100px] resize-y"
                    placeholder="Empty..."
                />
            ) : (
                <input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-text-primary focus:border-accent focus:outline-none"
                    placeholder="Empty..."
                />
            )}
        </div>
    );
};
