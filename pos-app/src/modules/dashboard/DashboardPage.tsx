import { FC } from 'react';
import { TrackerWidget } from './components/TrackerWidget';
import { RemindersWidget } from './components/RemindersWidget';
import { LifeMapWidget } from './components/LifeMapWidget';
import { WishlistWidget } from './components/WishlistWidget';

const DashboardPage: FC = () => {
    // Determine greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-top-4 duration-500">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {greeting}, Aamir
                </h1>
                <p className="text-text-secondary">
                    Here's what's happening in your personal operating system today.
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                {/* Tracker Widget - Span 2 columns on large screens if needed, otherwise 1 */}
                <div className="lg:col-span-2 h-[220px]">
                    <TrackerWidget />
                </div>

                {/* Reminders Widget */}
                <div className="lg:col-span-2 h-[220px]">
                    <RemindersWidget />
                </div>

                {/* Life Map Widget */}
                <div className="lg:col-span-2 h-[220px]">
                    <LifeMapWidget />
                </div>

                {/* Wishlist Widget */}
                <div className="lg:col-span-2 h-[220px]">
                    <WishlistWidget />
                </div>
            </div>

            {/* Bottom Row / Stats? Maybe later. For now just the widgets are good. */}
        </div>
    );
};

export default DashboardPage;
