import { FC, useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Network, Bell, Settings, LayoutGrid, GraduationCap, Briefcase, ShoppingCart, Menu, X, Lightbulb, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import CommandCenter from '@/modules/lifemap/components/CommandCenter';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { Command } from 'lucide-react';

const NAV_ITEMS = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/life-map', label: 'Life Map', icon: Network },
    { path: '/reminders', label: 'Reminders', icon: Bell },
    { path: '/wishlist', label: 'Wishlist', icon: LayoutGrid },
    { path: '/tracker', label: 'Assignments', icon: GraduationCap },
    { path: '/jobs', label: 'Job Tracker', icon: Briefcase },
    { path: '/shopping',   label: 'Shopping',          icon: ShoppingCart },
    { path: '/incubator',  label: 'Thought Incubator', icon: Lightbulb },
    { path: '/finance',    label: 'Finance',            icon: Wallet },
    { path: '/settings',   label: 'Settings',          icon: Settings, disabled: true },
] as const;

type NavItem = typeof NAV_ITEMS[number];

interface SidebarNavProps {
    onClose?: () => void;
    showClose?: boolean;
}

const SidebarNav: FC<SidebarNavProps> = ({ onClose, showClose }) => (
    <>
        <div className="mb-8 px-2 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
                POS <span className="text-text-secondary text-sm font-normal">v0.1</span>
            </h1>
            {showClose && onClose && (
                <button
                    className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>
            )}
        </div>

        <nav className="flex-1 space-y-1">
            {(NAV_ITEMS as readonly NavItem[]).map((item) => (
                <NavLink
                    key={item.path}
                    to={'disabled' in item && item.disabled ? '#' : item.path}
                    className={({ isActive }) =>
                        clsx(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                            'disabled' in item && item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-elevated',
                            isActive && !('disabled' in item && item.disabled)
                                ? 'bg-accent/10 text-accent border border-accent/20 font-semibold shadow-sm'
                                : 'text-text-secondary border border-transparent'
                        )
                    }
                    onClick={(e) => ('disabled' in item && item.disabled) && e.preventDefault()}
                >
                    <item.icon size={18} className="group-hover:text-accent transition-colors shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {'disabled' in item && item.disabled && (
                        <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">Soon</span>
                    )}
                </NavLink>
            ))}
        </nav>

        <div className="mt-auto px-2 py-4 border-t border-border">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-hover flex-center text-xs font-bold text-text-secondary shrink-0">
                    AA
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-text-primary">Aamir</span>
                    <span className="text-xs text-text-secondary">Basic Plan</span>
                </div>
            </div>
        </div>
    </>
);

const MainLayout: FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { setCommandCenterOpen } = useLifeMapStore();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSidebarOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div className="flex h-screen w-full bg-background text-text-primary overflow-hidden">

            {/* ── Desktop Sidebar (md+) ── */}
            <aside className="hidden md:flex w-64 border-r border-border/80 bg-surface flex-col p-4 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)] z-10 shrink-0">
                <SidebarNav />
            </aside>

            {/* ── Mobile Drawer Overlay ── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.aside
                            key="drawer"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed left-0 top-0 bottom-0 w-72 bg-surface border-r border-border/80 flex flex-col p-4 z-50 md:hidden shadow-2xl"
                        >
                            <SidebarNav onClose={() => setSidebarOpen(false)} showClose />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Top Bar */}
                <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-surface/80 backdrop-blur-md border-b border-border/50 shrink-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu size={22} />
                    </button>
                    <span className="text-base font-bold text-text-primary tracking-tight">POS</span>
                </header>

                <main className="flex-1 overflow-auto relative">
                    <Outlet />
                </main>
            </div>
            
            {/* Global FAB for Command Center */}
            <button
                onClick={() => setCommandCenterOpen(true)}
                className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-accent hover:bg-accent-hover text-white rounded-full shadow-[0_8px_32px_rgba(99,102,241,0.4)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-40 group border border-white/10"
                title="Open Command Center (Cmd+K)"
            >
                <Command size={24} className="group-hover:rotate-12 transition-transform duration-300" />
            </button>

            <CommandCenter />
        </div>
    );
};

export default MainLayout;
