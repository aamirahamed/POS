
import { FC } from 'react';
import { WishlistItem, useWishlistStore } from '@/store/useWishlistStore';
import { Trash2, Edit2, ExternalLink, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    item: WishlistItem;
    onEdit: (item: WishlistItem) => void;
}

const WishlistItemCard: FC<Props> = ({ item, onEdit }) => {
    const { deleteItem, updateItem } = useWishlistStore();

    const totalScore = (item.scoreImpact || 0) + (item.scoreUrgency || 0) + (item.scoreFrequency || 0);
    const isBought = item.status === 'Bought';

    const handleMarkBought = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.id) {
            updateItem({ ...item, status: 'Bought' });
        }
    };

    return (
        <motion.div
            layoutId={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-surface border border-border p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow group relative ${isBought ? 'opacity-60' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className={`font-semibold text-text-primary truncate pr-8 ${isBought ? 'line-through text-text-secondary' : ''}`}>
                    {item.name}
                </h3>
                {item.link && (
                    <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-text-secondary hover:text-accent transition-colors"
                    >
                        <ExternalLink size={14} />
                    </a>
                )}
            </div>

            <div className="text-sm text-text-secondary mb-3 flex justify-between items-center">
                <span className={`font-mono text-accent ${isBought ? 'line-through opacity-70' : ''}`}>
                    ${item.price.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                    {item.createdAt && !isBought && (
                        <div className="flex items-center gap-1.5 bg-white/10 text-text-primary px-2 py-1 rounded-md text-xs font-medium border border-white/5" title={`Added on ${new Date(item.createdAt).toLocaleDateString()}`}>
                            <Clock size={12} className="text-text-secondary" />
                            <span>
                                {Math.max(0, Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)))} <span className="text-text-secondary font-normal">days</span>
                            </span>
                        </div>
                    )}
                    <span className="text-[10px] uppercase tracking-wider border border-white/10 px-1 rounded text-text-secondary/70">
                        {item.category || 'Other'}
                    </span>
                </div>
            </div>

            {/* Score Badge */}
            <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-xs text-text-secondary" title="Total Priority Score">
                    <span className="bg-white/5 px-2 py-0.5 rounded text-text-primary font-bold">{totalScore}</span>
                    <span className="opacity-50">/ 15</span>
                </div>
                {/* Status Badge */}
                <div className={`text-[10px] px-2 py-0.5 rounded-full ${item.status === 'Bought' ? 'bg-green-500/20 text-green-400' :
                    item.status === 'Planned' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/5 text-text-secondary'
                    }`}>
                    {item.status}
                </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 items-center bg-surface/90 rounded border border-white/5 p-0.5 backdrop-blur-sm">
                {!isBought && (
                    <button
                        onClick={handleMarkBought}
                        className="p-1.5 hover:bg-green-500/20 rounded text-text-secondary hover:text-green-400 transition-colors mr-1 border-r border-white/10"
                        title="Mark as Bought"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider">Bought</span>
                    </button>
                )}
                <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={() => item.id && deleteItem(item.id)}
                    className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-red-400"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
};

export default WishlistItemCard;
