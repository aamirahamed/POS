import { JobBoard } from './components/JobBoard';
import { JobTableView } from './components/JobTableView'; // Import new component
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddJobDialog } from './components/AddJobDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobTrackerStore } from '@/store/useJobTrackerStore';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export const JobTrackerPage = () => {
    const { jobs, fetchJobs } = useJobTrackerStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const totalJobs = jobs.length;
    const appliedJobs = jobs.filter(j => j.status === 'applied').length;
    const interviewingJobs = jobs.filter(j => j.status === 'interviewing').length;

    useEffect(() => {
        fetchJobs();
    }, []);

    return (
        <div className="h-full flex flex-col space-y-4 p-8">
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Job Tracker</h1>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-1 rounded-md bg-surface border border-border/50 text-muted-foreground font-medium flex gap-1.5 items-center">
                                Total <span className="text-foreground">{totalJobs}</span>
                            </span>
                            <span className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 font-medium flex gap-1.5 items-center">
                                Applied <span className="text-blue-400">{appliedJobs}</span>
                            </span>
                            <span className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-500 font-medium flex gap-1.5 items-center">
                                Interviewing <span className="text-purple-400">{interviewingJobs}</span>
                            </span>
                        </div>
                    </div>
                    <p className="text-muted-foreground">
                        Manage your job search pipeline calmly and effectively.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="table" className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-background/50 border border-white/10">
                        <TabsTrigger value="kanban" className="gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            Kanban Board
                        </TabsTrigger>
                        <TabsTrigger value="table" className="gap-2">
                            <List className="h-4 w-4" />
                            List View
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative w-64 group">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary group-focus-within:text-accent transition-colors" />
                            <Input
                                placeholder="Search roles or companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-surface-elevated border-border hover:border-accent/40 focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-full h-9 text-sm text-text-primary placeholder:text-text-secondary/60 transition-all shadow-sm"
                            />
                        </div>
                        <Button onClick={() => setIsAddOpen(true)} className="gap-2 rounded-full h-9 px-5 bg-gradient-to-r from-accent to-indigo-400 text-white shadow-md hover:shadow-lg hover:from-accent-hover hover:to-indigo-500 hover:-translate-y-[1px] border border-indigo-400/30 transition-all duration-200 font-medium tracking-wide">
                            <Plus className="h-4 w-4" />
                            Add Job
                        </Button>
                    </div>
                </div>

                <TabsContent value="kanban" className="flex-1 min-h-0 mt-0">
                    <JobBoard searchQuery={searchQuery} />
                </TabsContent>

                <TabsContent value="table" className="flex-1 min-h-0 mt-0 overflow-auto">
                    <JobTableView searchQuery={searchQuery} />
                </TabsContent>
            </Tabs>

            <AddJobDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>
    );
};
