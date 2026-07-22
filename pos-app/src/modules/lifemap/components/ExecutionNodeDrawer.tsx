import { FC, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { Resource, ResourceType } from '@/types/lifemap';
import { uploadResourceFile } from '@/services/lifeMapService';
import { supabase } from '@/lib/supabase';
import { X, Plus, Trash2, CheckCircle, Circle, BookOpen, Clock, Flame, Link as LinkIcon, FileText, Play, Pause, Archive, ArrowRight, Activity, Calendar, Youtube, Paperclip, ExternalLink, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import ContextEditorCanvas from './ContextEditorCanvas';

// Detect resource type from URL
const detectType = (url: string): ResourceType => {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|png|jpg|jpeg|gif|mp4)$/i.test(url)) return 'attachment';
    return 'article';
};

const ResourceIcon: FC<{ type: ResourceType; size?: number }> = ({ type, size = 14 }) => {
    if (type === 'youtube') return <Youtube size={size} className="text-red-400" />;
    if (type === 'attachment') return <Paperclip size={size} className="text-amber-400" />;
    return <ExternalLink size={size} className="text-blue-400" />;
};

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const ExecutionNodeDrawer: FC = () => {
    const { nodes, selectedExecutionNodeId, setSelectedExecutionNodeId, addTaskToNode, toggleNodeTask, deleteTaskFromNode, editTaskInNode, updateNode, deleteNode, addResource, removeResource, loadFromDB } = useLifeMapStore();
    const [newTaskText, setNewTaskText] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [resUrl, setResUrl] = useState('');
    const [resTitle, setResTitle] = useState('');
    const [resUploading, setResUploading] = useState(false);
    const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTaskText, setEditTaskText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load from DB on mount so data is always fresh
    useEffect(() => { loadFromDB(); }, []);

    const node = nodes.find(n => n.id === selectedExecutionNodeId);

    if (!selectedExecutionNodeId || !node || node.type !== 'milestone') return null;

    const data = node.data;
    const tasks = (data.tasks as any[]) || [];
    const canvases = (data.canvases as any[]) || [];
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

    const handleCreateCanvas = () => {
        const newCanvas = {
            id: `canvas-${Date.now()}`,
            title: 'Untitled Canvas',
            content: '',
            lastEdited: Date.now()
        };
        const updatedCanvases = [newCanvas, ...canvases];
        updateNode(node.id, { canvases: updatedCanvases, lastUpdated: Date.now() });
        setActiveCanvasId(newCanvas.id);
    };

    const handleDeleteCanvas = (e: React.MouseEvent, canvasId: string) => {
        e.stopPropagation();
        const updatedCanvases = canvases.filter(c => c.id !== canvasId);
        updateNode(node.id, { canvases: updatedCanvases, lastUpdated: Date.now() });
    };

    const handleAddUrlResource = () => {
        if (!resUrl.trim()) return;
        const type = detectType(resUrl);
        const resource: Resource = {
            id: `res-${Date.now()}`,
            title: resTitle.trim() || resUrl,
            url: resUrl.trim(),
            type,
        };
        addResource(node.id, resource);
        setResUrl('');
        setResTitle('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !node) return;
        setResUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setResUploading(false); return; }
            const url = await uploadResourceFile(user.id, node.id, file);
            if (url) {
                const resource: Resource = {
                    id: `res-${Date.now()}`,
                    title: file.name,
                    url,
                    type: 'attachment',
                    fileName: file.name,
                    fileSize: file.size,
                };
                addResource(node.id, resource);
            }
        } finally {
            setResUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteResource = async (res: Resource) => {
        removeResource(node.id, res.id);
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
                
                {/* 2. ACTION ITEMS */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
                            <ArrowRight size={14} className="text-accent" /> Action Items
                        </h3>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-2 flex flex-col gap-1 shadow-inner">
                        {tasks.length > 0 ? tasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 group transition-all">
                                <div 
                                    className={`mt-0.5 flex-shrink-0 transition-colors cursor-pointer ${task.completed ? 'text-green-500' : 'text-text-secondary group-hover:text-blue-400'}`}
                                    onClick={() => toggleNodeTask(node.id, task.id)}
                                >
                                    {task.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                                </div>
                                
                                {editingTaskId === task.id ? (
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editTaskText}
                                            onChange={(e) => setEditTaskText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && editTaskText.trim()) {
                                                    editTaskInNode(node.id, task.id, editTaskText.trim());
                                                    setEditingTaskId(null);
                                                } else if (e.key === 'Escape') {
                                                    setEditingTaskId(null);
                                                }
                                            }}
                                            onBlur={() => {
                                                if (editTaskText.trim()) editTaskInNode(node.id, task.id, editTaskText.trim());
                                                setEditingTaskId(null);
                                            }}
                                            className="flex-1 bg-black/40 border border-accent/50 rounded px-2 py-0.5 text-sm text-text-primary focus:outline-none"
                                        />
                                    </div>
                                ) : (
                                    <span 
                                        className={`text-sm flex-1 font-medium leading-snug cursor-pointer ${task.completed ? 'line-through text-text-secondary opacity-60' : 'text-text-primary opacity-90'}`}
                                        onClick={() => toggleNodeTask(node.id, task.id)}
                                    >
                                        {task.text}
                                    </span>
                                )}

                                {!editingTaskId && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditTaskText(task.text);
                                                setEditingTaskId(task.id);
                                            }}
                                            className="p-1 rounded text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                                            title="Edit Action Item"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTaskFromNode(node.id, task.id);
                                            }}
                                            className="p-1 rounded text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                            title="Delete Action Item"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="p-3 text-sm text-text-secondary italic">
                                No action items defined yet.
                            </div>
                        )}
                        
                        <div className="mt-1 flex items-center gap-2 p-2 border-t border-white/5">
                            <Plus size={16} className="text-text-secondary flex-shrink-0" />
                            <input 
                                type="text" 
                                placeholder="Add a new action item..."
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

                {/* 4. CONTEXT & NOTES (Canvases List) */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
                            <FileText size={14} className="text-text-secondary" /> Context & Insights
                        </h3>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleCreateCanvas}
                            className="h-7 text-[10px] bg-white/5 hover:bg-white/10 text-white border border-white/5"
                        >
                            <Plus size={12} className="mr-1" /> New Canvas
                        </Button>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        {canvases.length > 0 ? (
                            canvases.map((canvas: any) => (
                                <div 
                                    key={canvas.id}
                                    onClick={() => setActiveCanvasId(canvas.id)}
                                    className="bg-black/30 border border-white/10 hover:border-accent/50 rounded-xl p-3 cursor-pointer group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{canvas.title}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-text-secondary">
                                                {formatDistanceToNow(canvas.lastEdited, { addSuffix: true })}
                                            </span>
                                            <button 
                                                onClick={(e) => handleDeleteCanvas(e, canvas.id)}
                                                className="p-1 rounded opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                title="Delete Canvas"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-text-secondary line-clamp-2 leading-relaxed opacity-80">
                                        {canvas.content 
                                            ? <div dangerouslySetInnerHTML={{ __html: canvas.content.replace(/<[^>]*>?/gm, ' ') }} />
                                            : <span className="italic">Empty canvas...</span>
                                        }
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div 
                                onClick={handleCreateCanvas}
                                className="bg-black/30 border border-white/10 border-dashed hover:border-accent/50 rounded-xl p-4 cursor-pointer group transition-all flex flex-col items-center justify-center text-center"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Plus size={14} className="text-text-secondary group-hover:text-white transition-colors" />
                                </div>
                                <span className="text-xs font-medium text-text-primary">Create your first canvas</span>
                                <span className="text-[10px] text-text-secondary mt-1">Capture rich notes, images, and context</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* 5. RESOURCES */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold tracking-wide text-text-primary flex items-center gap-2">
                            <LinkIcon size={14} className="text-text-secondary" /> Resources
                            {resources.length > 0 && (
                                <span className="text-[10px] font-bold bg-white/10 text-text-secondary px-1.5 py-0.5 rounded-full">{resources.length}</span>
                            )}
                        </h3>
                    </div>

                    {/* URL / Link input */}
                    <div className="flex flex-col gap-2 mb-3">
                        <input
                            type="text"
                            placeholder="Paste a YouTube, article, or any URL..."
                            value={resUrl}
                            onChange={(e) => {
                                setResUrl(e.target.value);
                                // Auto-fill title from URL if title is empty
                                if (!resTitle && e.target.value) {
                                    try { setResTitle(new URL(e.target.value).hostname.replace('www.', '')); } catch {}
                                }
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddUrlResource()}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent placeholder:text-text-secondary/50"
                        />
                        {resUrl.trim() && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Label (optional)"
                                    value={resTitle}
                                    onChange={(e) => setResTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrlResource()}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent placeholder:text-text-secondary/50"
                                />
                                <Button size="sm" onClick={handleAddUrlResource} className="h-9 px-3 text-xs bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30">
                                    <Plus size={14} className="mr-1" /> Add
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* File attachment upload */}
                    <div className="mb-4">
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={resUploading}
                            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/10 rounded-xl text-xs text-text-secondary hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
                        >
                            <Paperclip size={13} />
                            {resUploading ? 'Uploading...' : 'Attach a file (PDF, image, doc...)'}
                        </button>
                    </div>

                    {/* Resource list */}
                    {resources.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {resources.map((res) => (
                                <div key={res.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/40 border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="p-1.5 rounded-md bg-white/5 shrink-0">
                                        <ResourceIcon type={res.type as ResourceType} size={13} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <a href={res.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-text-primary truncate block hover:text-accent transition-colors">
                                            {res.title}
                                        </a>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] text-text-secondary uppercase tracking-wider">{res.type}</span>
                                            {res.fileSize && <span className="text-[9px] text-text-secondary/60">{formatFileSize(res.fileSize)}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteResource(res)}
                                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-all"
                                        title="Remove resource"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/5 border-dashed rounded-lg p-4 text-center text-xs text-text-secondary">
                            No resources yet. Add a link or attach a file above.
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

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {activeCanvasId && (
                        <ContextEditorCanvas 
                            nodeId={node.id} 
                            canvasId={activeCanvasId}
                            onClose={() => setActiveCanvasId(null)} 
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ExecutionNodeDrawer;
