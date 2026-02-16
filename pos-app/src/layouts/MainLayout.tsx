import { FC } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Network, Bell, Settings, LayoutGrid, GraduationCap, Briefcase } from 'lucide-react';
import clsx from 'clsx';

const MainLayout: FC = () => {
    const navItems = [
        { path: '/', label: 'Overview', icon: LayoutDashboard },
        { path: '/life-map', label: 'Life Map', icon: Network },
        { path: '/reminders', label: 'Reminders', icon: Bell },
        { path: '/wishlist', label: 'Wishlist', icon: LayoutGrid },
        { path: '/tracker', label: 'Assignments', icon: GraduationCap },
        { path: '/jobs', label: 'Job Tracker', icon: Briefcase },
        { path: '/settings', label: 'Settings', icon: Settings, disabled: true },
    ];

    return (
        <div className="flex h-screen w-full bg-background text-text-primary overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-surface flex flex-col p-4">
                <div className="mb-8 px-2">
                    <h1 className="text-xl font-bold tracking-tight text-text-primary">POS <span className="text-text-secondary text-sm font-normal">v0.1</span></h1>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.disabled ? '#' : item.path}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group',
                                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-hover',
                                    isActive && !item.disabled ? 'bg-surface-hover text-accent' : 'text-text-secondary'
                                )
                            }
                            onClick={(e) => item.disabled && e.preventDefault()}
                        >
                            <item.icon size={18} className="group-hover:text-accent transition-colors" />
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.disabled && <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">Soon</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto px-2 py-4 border-t border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-hover flex-center text-xs font-bold text-text-secondary">
                            AA
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-text-primary">Aamir</span>
                            <span className="text-xs text-text-secondary">Basic Plan</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
