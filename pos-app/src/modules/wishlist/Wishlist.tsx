
import { FC, useEffect, useState } from 'react';
import { useWishlistStore, PriorityBucket, WishlistItem } from '@/store/useWishlistStore';
import { supabase } from '@/lib/supabase';
import { fetchWishlistItems } from '@/services/wishlistService';
import WishlistItemCard from './components/WishlistItemCard';
import WishlistModal from './components/WishlistModal';
import { Plus, LayoutGrid } from 'lucide-react';

const BUCKETS: PriorityBucket[] = ['Need Now', 'Need Next', 'Nice to Have', 'Dream / Long-Term'];

const Wishlist: FC = () => {
    const { items, setItems } = useWishlistStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<WishlistItem | undefined>(undefined);
    const [, setLoading] = useState(true);
    const [defaultBucket, setDefaultBucket] = useState<PriorityBucket | undefined>(undefined);

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const data = await fetchWishlistItems(user.id);
                if (data) setItems(data);
            }
            setLoading(false);
        };
        load();
    }, [setItems]);

    const handleEdit = (item: WishlistItem) => {
        setEditingItem(item);
        setDefaultBucket(undefined);
        setIsModalOpen(true);
    };

    const handleAddNew = (bucket?: PriorityBucket) => {
        setEditingItem(undefined);
        setDefaultBucket(bucket);
        setIsModalOpen(true);
    };

    // Calculate totals
    const totalCost = items.reduce((sum, item) => sum + (item.status !== 'Dropped' ? item.price : 0), 0);
    const purchasedCost = items.filter(i => i.status === 'Bought').reduce((sum, i) => sum + i.price, 0);

    return (
        <div className="h-full w-full bg-background p-6 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Shopping Wish List</h1>
                        <p className="text-sm text-text-secondary">Prioritize. Plan. Purchase.</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <span className="block text-xs text-text-secondary uppercase">Total Estimated</span>
                        <span className="text-lg font-mono font-bold text-text-primary">${totalCost.toLocaleString()}</span>
                    </div>
                    <div className="text-right hidden md:block">
                        <span className="block text-xs text-text-secondary uppercase">Purchased</span>
                        <span className="text-lg font-mono font-bold text-green-400">${purchasedCost.toLocaleString()}</span>
                    </div>
                    <button
                        onClick={() => handleAddNew()}
                        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors shadow-lg hover:shadow-accent/20"
                    >
                        <Plus size={18} />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="grid grid-cols-4 gap-4 h-full min-w-[1000px]">
                    {BUCKETS.map(bucket => {
                        const bucketItems = items
                            .filter(i => i.priorityBucket === bucket)
                            .sort((a, b) => {
                                const scoreA = (a.scoreImpact || 0) + (a.scoreUrgency || 0) + (a.scoreFrequency || 0);
                                const scoreB = (b.scoreImpact || 0) + (b.scoreUrgency || 0) + (b.scoreFrequency || 0);
                                return scoreB - scoreA; // Descending score
                            });

                        const bucketTotal = bucketItems.reduce((sum, i) => sum + i.price, 0);

                        return (
                            <div key={bucket} className="flex flex-col h-full bg-surface/30 rounded-xl border border-white/5 overflow-hidden group/bucket relative">
                                {/* Column Header */}
                                <div className="p-4 border-b border-white/5 bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-text-primary flex items-center gap-2">
                                            {bucket}
                                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-text-secondary">
                                                {bucketItems.length}
                                            </span>
                                        </h3>
                                        <button
                                            onClick={() => handleAddNew(bucket)}
                                            className="text-text-secondary hover:text-accent p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover/bucket:opacity-100"
                                            title={`Add to ${bucket}`}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-text-secondary uppercase tracking-wider">
                                        Vol: <span className="text-text-primary font-mono">${bucketTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {bucketItems.map(item => (
                                        <WishlistItemCard key={item.id} item={item} onEdit={handleEdit} />
                                    ))}
                                    {bucketItems.length === 0 && (
                                        <div className="text-center py-10 opacity-30 text-sm italic">
                                            Empty bucket
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <WishlistModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingItem={editingItem}
                defaultBucket={defaultBucket}
            />
        </div>
    );
};

export default Wishlist;
