import { useWishlistStore } from '@/store/useWishlistStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Gift, TrendingUp, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WishlistWidget = () => {
    const { items } = useWishlistStore();
    const navigate = useNavigate();

    // Filter 'Need Now' or 'Need Next' items that are not bought
    const activeItems = items.filter(i => i.status !== 'Bought' && i.status !== 'Dropped');
    const priorityItems = activeItems.filter(i => i.priorityBucket === 'Need Now' || i.priorityBucket === 'Need Next');

    // Sort by scoreImpact (high impact first)
    const topItem = priorityItems.sort((a, b) => b.scoreImpact - a.scoreImpact)[0];

    return (
        <Card className="h-full bg-surface/40 backdrop-blur-sm border-white/5 hover:border-white/10 transition-all group overflow-hidden relative flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 shrink-0">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-pink-400 transition-colors flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Next Reward
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2"
                    onClick={() => navigate('/wishlist')}
                >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-4">
                {topItem ? (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold leading-tight truncate text-foreground" title={topItem.name}>
                                {topItem.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                    {topItem.priorityBucket}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    ${Number(topItem.price).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface/50 border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3 text-pink-400" />
                                <span>High Impact Item</span>
                            </div>
                            <p className="text-xs text-muted-foreground/80 leading-relaxed italic">
                                "This item will significantly improve your workflow/life."
                            </p>
                            <Button size="sm" className="w-full text-xs h-7 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 mt-1">
                                View Details
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-3">
                            <DollarSign className="h-6 w-6 text-pink-400" />
                        </div>
                        <h3 className="font-semibold text-foreground">No Goals Set</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Add items to your wishlist to verify your goals.
                        </p>
                    </div>
                )}

                {activeItems.length > 1 && (
                    <div className="mt-auto pt-3 border-t border-white/5 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            +{activeItems.length - 1} other items on wishlist
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
