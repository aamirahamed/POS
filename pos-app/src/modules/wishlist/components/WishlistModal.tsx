
import { FC, useState, useEffect } from 'react';
import { WishlistItem, PriorityBucket, WishlistStatus, useWishlistStore } from '@/store/useWishlistStore';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    editingItem?: WishlistItem;
    defaultBucket?: PriorityBucket;
}

const BUCKETS: PriorityBucket[] = ['Need Now', 'Need Next', 'Nice to Have', 'Dream / Long-Term'];
const STATUSES: WishlistStatus[] = ['Considering', 'Shortlisted', 'Planned', 'Bought', 'Dropped'];

const WishlistModal: FC<Props> = ({ isOpen, onClose, editingItem, defaultBucket }) => {
    const { addItem, updateItem } = useWishlistStore();
    const [formData, setFormData] = useState<Partial<WishlistItem>>({
        name: '',
        link: '',
        price: 0,
        category: '',
        priorityBucket: defaultBucket || 'Nice to Have',
        notes: '',
        status: 'Considering',
        scoreImpact: 1,
        scoreUrgency: 1,
        scoreFrequency: 1
    });

    useEffect(() => {
        if (editingItem) {
            setFormData(editingItem);
        } else {
            setFormData({
                name: '',
                link: '',
                price: 0,
                category: '',
                priorityBucket: defaultBucket || 'Nice to Have',
                notes: '',
                status: 'Considering',
                scoreImpact: 1,
                scoreUrgency: 1,
                scoreFrequency: 1
            });
        }
    }, [editingItem, isOpen, defaultBucket]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem && editingItem.id) {
                await updateItem({ ...editingItem, ...formData } as WishlistItem);
            } else {
                await addItem(formData as WishlistItem);
            }
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-6 text-text-primary">{editingItem ? 'Edit Item' : 'New Wish Item'}</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Item Name</label>
                            <input
                                className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Link (URL)</label>
                            <input
                                className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                                value={formData.link || ''}
                                onChange={e => setFormData({ ...formData, link: e.target.value })}
                                placeholder="https://"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Price ($)</label>
                            <input
                                type="number"
                                className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Category</label>
                            <input
                                className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                                value={formData.category || ''}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                list="categories"
                            />
                            <datalist id="categories">
                                <option value="Tech & Gadgets" />
                                <option value="Health & Fitness" />
                                <option value="Clothing" />
                                <option value="Home" />
                                <option value="Travel" />
                            </datalist>
                        </div>
                    </div>

                    {/* Classifications */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Bucket</label>
                            <select
                                className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                                value={formData.priorityBucket}
                                onChange={e => setFormData({ ...formData, priorityBucket: e.target.value as PriorityBucket })}
                            >
                                {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Status</label>
                            <select
                                className="w-full bg-background border border-border rounded px-3 py-2 text-text-primary focus:border-accent outline-none"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as WishlistStatus })}
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="pt-4 border-t border-white/5">
                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Priority Score (1-5)</label>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <span className="text-[10px] text-text-secondary block mb-1">Impact</span>
                                <input type="number" min="1" max="5" className="w-full bg-background border border-border rounded p-1 text-center"
                                    value={formData.scoreImpact}
                                    onChange={e => setFormData({ ...formData, scoreImpact: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-text-secondary block mb-1">Urgency</span>
                                <input type="number" min="1" max="5" className="w-full bg-background border border-border rounded p-1 text-center"
                                    value={formData.scoreUrgency}
                                    onChange={e => setFormData({ ...formData, scoreUrgency: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-text-secondary block mb-1">Frequency</span>
                                <input type="number" min="1" max="5" className="w-full bg-background border border-border rounded p-1 text-center"
                                    value={formData.scoreFrequency}
                                    onChange={e => setFormData({ ...formData, scoreFrequency: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded transition-colors"
                        >
                            {editingItem ? 'Save Changes' : 'Add to Wishlist'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default WishlistModal;
