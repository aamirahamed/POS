import { FC, memo } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import DomainSection from './DomainSection';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DomainsView: FC = () => {
    const { nodes, addDomain } = useLifeMapStore();

    // Get all domains/pillars
    const domains = nodes
        .filter(n => n.type === 'domain')
        .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));

    const handleAddDomain = () => {
        const title = prompt("Enter Domain Name:");
        if (title) addDomain(title);
    };

    return (
        <div className="h-full w-full bg-background overflow-y-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="max-w-5xl mx-auto flex flex-col gap-2 pb-32">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Domains</h1>
                        <p className="text-sm text-text-secondary mt-1">Hierarchical view of your life's structure.</p>
                    </div>
                    <Button onClick={handleAddDomain} variant="default" className="flex items-center gap-2">
                        <Plus size={16} /> New Domain
                    </Button>
                </div>

                {domains.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl">
                        <p className="text-text-secondary mb-4">No domains found.</p>
                        <Button onClick={handleAddDomain} variant="outline">
                            Create your first Domain
                        </Button>
                    </div>
                ) : (
                    domains.map(domain => (
                        <DomainSection key={domain.id} domain={domain} />
                    ))
                )}
            </div>
        </div>
    );
};

export default memo(DomainsView);
