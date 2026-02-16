
import { BarChart3, Plus, List, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TabType = 'dashboard' | 'create' | 'list';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Overview & stats'
    },
    {
      id: 'create' as const,
      label: 'Create Assignment',
      icon: Plus,
      description: 'Add new assignment'
    },
    {
      id: 'list' as const,
      label: 'My Assignments',
      icon: List,
      description: 'View & manage'
    }
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-primary text-white shadow-elegant">
          <GraduationCap className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">MyAssignment Tracker</h1>
            <p className="text-white/80 text-sm">Semester 2 • Personal Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 p-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 h-auto p-4 flex flex-col items-center gap-2 transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">{tab.label}</div>
                <div className={cn(
                  "text-xs",
                  isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {tab.description}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};