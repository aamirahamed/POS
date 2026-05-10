import { FC, useState } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { X, Plus, Trash2, CheckCircle, Circle, BookOpen, Clock, Flame, Link as LinkIcon, FileText, Play, Pause, Archive, ArrowRight, Activity, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

const ExecutionNodeDrawer: FC = () => {
    const { nodes, selectedExecutionNodeId, setSelectedExecutionNodeId, addTaskToNode, toggleNodeTask, updateNode, deleteNode } = useLifeMapStore();
    const [newTaskText, setNewTaskText] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    // const [showFullList, setShowFullList] = useState(false);

    const node = nodes.find(n => n.id === selectedExecutionNodeId);

    if (!selectedExecutionNodeId || !node || node.type !== 'subnode') return null;

    const data = node.data;
    const tasks = (data.tasks as any[]) || [];
    const notes = (data.notes as string) || '';
    const resources = (data.resources as any[]) || [];
    const priority = (data.priority as string) || 'medium';
    const status = data.status || 'active'; // active, completed, paused, backlog
    // const isCompleted = status === 'completed';
    const hue = (data.hue as number) || 210;
    const lastUpdated = data.lastUpdated as number || Date.now();

    const completedTasksCount = tasks.filter(t => t.completed).length;
    const totalTasksCount = tasks.length;
    const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    // Remove activeTasks since we render all tasks

    const handleClose = () => setSelectedExecutionNodeId(null);

    const handleAddTask = () => {
        if (newTaskText.trim()) {
            addTaskToNode(node.id, newTaskText.trim());
            setNewTaskText('');
        }
    };

    const handleAddNote = () => {
        if (newNoteText.trim()) {
            // Append note with timestamp
            const newEntry = `[${new Date().toLocaleDateString()}] ${newNoteText.trim()}`;
            const updatedNotes = notes ? `${newEntry}\n\n${notes}` : newEntry;
            updateNode(node.id, { notes: updatedNotes, lastUpdated: Date.now() });
            setNewNoteText('');
        }
    };

    const setStatus = (newStatus: string) => {
        updateNode(node.id, { status: newStatus as any, lastUpdated: Date.now() });
    };

    const priorityColor = priority === 'high' ? 'text-red-400 border-red-400/20 bg-red-400/10' : priority === 'medium' ? 'text-amber-400 border-amber-400/20 bg-amber-400/10' : 'text-blue-400 border-blue-400/20 bg-blue-400/10';
    // const statusColor = status === 'active' ? 'text-green-400' : status === 'completed' ? 'text-indigo-400' : status === 'paused' ? 'text-orange-400' : 'text-gray-400';

    return (
        <div className="absolute top-0 right-0 h-full w-[450px] bg-surface-elevated/95 backdrop-blur-2xl border-l border-white/5 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            
            {/* 1. EXECUTION SUMMARY HEADER */}
            <div className="p-6 border-b border-white/5 relative overflow-hidden flex flex-col gap-5">
                {/* Subtle Background Glow */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top right, hsl(${hue}, 70%, 50%), transparent 70%)` }} />
                
                <div className="relative z-10 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-[10px] uppercase font-bold tracking-widest">
                            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : status === 'completed' ? 'bg-indigo-500' : 'bg-gray-500'}`} /> {status}</span>
                            <span className="text-white/20">•</span>
                            <span className={`px-2 py-0.5 rounded border ${priorityColor}`}>{priority}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-tight">{data.label as string}</h2>
                        <div className="text-xs text-text-secondary mt-2 flex items-center gap-1.5 opacity-80">
                            <Clock size={12} /> Last active {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                deleteNode(node.id);
                                handleClose();
                            }}
                            className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors border border-white/5"
                            title="Delete Node"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button onClick={handleClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-text-secondary transition-colors border border-white/5" title="Close Drawer">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-4 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setStatus('active')} className={`h-8 text-xs ${status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/5 text-text-secondary'} border hover:bg-white/10`}>
                        <Play size={12} className="mr-1.5" /> Resume
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setStatus('completed')} className={`h-8 text-xs ${status === 'completed' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-text-secondary'} border hover:bg-white/10`}>
                        <CheckCircle size={12} className="mr-1.5" /> Done
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setStatus('paused')} className={`h-8 text-xs ${status === 'paused' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-white/5 text-text-secondary'} border hover:bg-white/10`}>
                        <Pause size={12} className="mr-1.5" /> Pause
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setStatus('backlog')} className={`h-8 text-xs ${status === 'backlog' ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : 'bg-white/5 text-text-secondary'} border hover:bg-white/10`}>
                        <Archive size={12} className="mr-1.5" /> Backlog
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                
                {/* 2. EXECUTION LIST */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
                            <ArrowRight size={14} className="text-accent" /> Execution List
                        </h3>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-2 flex flex-col gap-1 shadow-inner">
                        {tasks.length > 0 ? tasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 group transition-all cursor-pointer" onClick={() => toggleNodeTask(node.id, task.id)}>
                                <div className={`mt-0.5 flex-shrink-0 transition-colors ${task.completed ? 'text-green-500' : 'text-text-secondary group-hover:text-blue-400'}`}>
                                    {task.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                                </div>
                                <span className={`text-sm flex-1 font-medium leading-snug ${task.completed ? 'line-through text-text-secondary opacity-60' : 'text-text-primary opacity-90'}`}>
                                    {task.text}
                                </span>
                            </div>
                        )) : (
                            <div className="p-3 text-sm text-text-secondary italic">
                                No tasks defined yet.
                            </div>
                        )}
                        
                        <div className="mt-1 flex items-center gap-2 p-2 border-t border-white/5">
                            <Plus size={16} className="text-text-secondary flex-shrink-0" />
                            <input 
                                type="text" 
                                placeholder="Add a new task..."
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-secondary/50"
                            />
                        </div>
                    </div>
                </section>

                {/* 3. PROGRESS OVERVIEW */}
                <section className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Progress</h3>
                        <span className="text-sm font-bold text-text-primary">{progressPercentage}%</span>
                    </div>
                    <div className="flex gap-1 h-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`flex-1 rounded-full ${i < progressPercentage / 10 ? 'bg-accent' : 'bg-white/10'}`} />
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-text-secondary">
                        <span>{completedTasksCount} / {totalTasksCount} completed</span>
                        {(data.streak ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded-full"><Flame size={10} /> {data.streak} Day Streak</span>
                        )}
                    </div>
                </section>

                {/* 4. CONTEXT & NOTES */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
                            <FileText size={14} className="text-text-secondary" /> Context & Insights
                        </h3>
                    </div>
                    
                    <div className="relative mb-4">
                        <textarea 
                            placeholder="Capture quick thoughts, blockers, or insights..."
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddNote();
                                }
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-accent resize-none min-h-[80px] shadow-inner placeholder:text-text-secondary/50"
                        />
                        <Button size="sm" onClick={handleAddNote} className="absolute bottom-2 right-2 h-7 px-3 text-xs bg-white/10 hover:bg-white/20 text-white">Save</Button>
                    </div>

                    {notes && (
                        <div className="flex flex-col gap-2">
                            {notes.split('\n\n').map((block, i) => (
                                block.trim() && (
                                    <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-3 text-sm text-text-primary/90 whitespace-pre-wrap leading-relaxed shadow-sm">
                                        {block}
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </section>

                {/* 5. RESOURCES */}
                <section>
                    <h3 className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2 mb-3">
                        <LinkIcon size={14} className="text-text-secondary" /> Resources
                    </h3>
                    {resources.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {resources.map((res, i) => (
                                <a key={i} href={res.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 p-2 rounded-lg bg-black/40 hover:bg-white/10 border border-white/5 transition-all group">
                                    <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-accent/20 transition-colors">
                                        <BookOpen size={12} className="text-text-secondary group-hover:text-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-text-primary truncate">{res.title}</div>
                                        <div className="text-[9px] text-text-secondary uppercase mt-0.5 truncate">{res.type}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/5 border-dashed rounded-lg p-4 text-center text-xs text-text-secondary">
                            No resources attached. Use metadata to link docs.
                        </div>
                    )}
                </section>



            </div>

            {/* 7. ACTIVITY & MOMENTUM FOOTER */}
            <div className="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between text-xs text-text-secondary">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="opacity-60" /> Created recently
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity size={12} className="opacity-60" /> Updated {new Date(lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-medium text-white/40 uppercase tracking-widest text-[9px]">Momentum</span>
                    <span className="text-white/70">{completedTasksCount > 0 ? `${completedTasksCount} items shipped` : 'Just started'}</span>
                </div>
            </div>
        </div>
    );
};

export default ExecutionNodeDrawer;
