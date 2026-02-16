import { GraduationCap, BarChart3, Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SubjectsSettingsDialog } from './SubjectsSettingsDialog';

type TabType = 'dashboard' | 'create' | 'list';

interface CompactHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const CompactHeader = ({ activeTab, onTabChange }: CompactHeaderProps) => {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      id: 'create' as const,
      label: 'Create Assignment',
      icon: Plus,
    },
    {
      id: 'list' as const,
      label: 'My Assignments',
      icon: List,
    }
  ];

  return (
    <div className="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-border shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between py-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <GraduationCap className="h-6 w-6" />
              <h1 className="text-lg font-bold text-foreground">Assignment Tracker</h1>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-surface-hover/50 backdrop-blur-sm p-1 rounded-lg border border-border/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 h-auto transition-all duration-200 relative hover:bg-surface-hover",
                    isActive
                      ? "bg-surface text-primary shadow-sm font-medium border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm hidden sm:inline">{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                </Button>
              );
            })}
          </nav>
          <SubjectsSettingsDialog />
        </div>
      </div>
    </div>
  );
};