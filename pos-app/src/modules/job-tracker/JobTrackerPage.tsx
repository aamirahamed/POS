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
    const { fetchJobs } = useJobTrackerStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchJobs();
    }, []);

    return (
        <div className="h-full flex flex-col space-y-4 p-8">
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Job Tracker</h1>
                    <p className="text-muted-foreground">
                        Manage your job search pipeline calmly and effectively.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search jobs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 bg-surface/50 border-white/10"
                        />
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Job
                    </Button>
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
