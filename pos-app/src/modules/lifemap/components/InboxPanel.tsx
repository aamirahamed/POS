import { FC, useState } from 'react';
import { Inbox, Plus, X, Trash2 } from 'lucide-react';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const InboxPanel: FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [newItemText, setNewItemText] = useState('');
    const { inbox, addInboxItem, removeInboxItem } = useLifeMapStore();

    const handleAddItem = () => {
        if (newItemText.trim()) {
            addInboxItem(newItemText.trim());
            setNewItemText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddItem();
        } else if (e.key === 'Escape') {
            setNewItemText('');
        }
    };

    return (
        <>
            {/* Floating Inbox Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121214]/90 border border-white/10 backdrop-blur-md text-text-primary hover:bg-white/10 transition-all shadow-lg hover:shadow-xl group"
            >
                <Inbox size={16} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                <span className="text-sm font-medium">Inbox</span>
                {inbox.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold min-w-[20px] text-center">
                        {inbox.length}
                    </span>
                )}
            </button>

            {/* Slide-out Panel */}
            {isOpen && (
                <div className="absolute top-0 right-0 bottom-0 w-[340px] z-50 bg-[#0e0e10]/95 border-l border-white/10 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Inbox size={18} className="text-indigo-400" />
                            <h2 className="text-base font-bold text-text-primary">Inbox</h2>
                            <span className="text-xs text-text-secondary">({inbox.length})</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Add Item Input */}
                    <div className="px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10 focus-within:border-indigo-500/50 transition-colors">
                            <Plus size={14} className="text-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                value={newItemText}
                                onChange={(e) => setNewItemText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Quick capture..."
                                className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-secondary/50"
                            />
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                        {inbox.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-sm text-text-secondary/50 italic">No items in inbox</p>
                            </div>
                        ) : (
                            inbox.map((item) => (
                                <div
                                    key={item.id}
                                    className="group flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 mt-2 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-text-primary leading-snug break-words">{item.text}</p>
                                        <p className="text-[10px] text-text-secondary mt-1">
                                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeInboxItem(item.id)}
                                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-all flex-shrink-0"
                                        title="Remove"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default InboxPanel;
