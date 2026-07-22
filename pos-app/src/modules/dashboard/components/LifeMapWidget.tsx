import { useLifeMapStore } from '@/store/useLifeMapStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export const LifeMapWidget = () => {
    const { nodes } = useLifeMapStore();
    const navigate = useNavigate();

    const domains = useMemo(() => nodes.filter(n => n.type === 'domain'), [nodes]);

    // stable random domain based on date to avoid jumping around on re-renders too much
    // but actually, random on mount is fine for "freshness"
    const randomDomain = useMemo(() => {
        if (domains.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * domains.length);
        return domains[randomIndex];
    }, [domains]);

    const quotes = [
        "Create the life you can't wait to wake up to.",
        "Balance is not something you find, it's something you create.",
        "Small steps in the right direction can turn out to be the biggest step of your life.",
        "The secret of change is to focus all of your energy, not on fighting the old, but on building the new.",
        "Focus on the journey, not the destination."
    ];

    const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

    return (
        <Card className="h-full bg-surface/40 backdrop-blur-sm border-white/5 hover:border-white/10 transition-all group overflow-hidden relative flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 shrink-0">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-green-400 transition-colors flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Life Balance
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2"
                    onClick={() => navigate('/life-map')}
                >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center text-center p-6 pt-2">
                {randomDomain ? (
                    <div className="space-y-4">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-surface border border-white/5 shadow-lg relative overflow-hidden group/pillar cursor-pointer" onClick={() => navigate('/life-map')}>
                            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: `hsl(${randomDomain.data.hue}, 70%, 50%)` }} />
                            <Sparkles className="h-5 w-5 mr-2" style={{ color: `hsl(${randomDomain.data.hue}, 80%, 70%)` }} />
                            <span className="text-lg font-bold tracking-wide" style={{ color: `hsl(${randomDomain.data.hue}, 80%, 70%)` }}>
                                {randomDomain.data.label as string}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-foreground font-medium">How is this area of your life?</h3>
                            <p className="text-xs text-muted-foreground italic max-w-[200px] mx-auto leading-relaxed">
                                "{randomQuote}"
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                            <Network className="h-6 w-6 text-green-400" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Start mapping your life domains to find your balance.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/life-map')} className="mt-2 border-green-500/20 text-green-400 hover:bg-green-500/10">
                            Create First Domain
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
