import { useDroppable } from '@dnd-kit/core';
import { Job } from '../types';
import { JobCard } from './JobCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface JobColumnProps {
    id: string;
    title: string;
    jobs: Job[];
    onJobClick: (job: Job) => void;
}

export const JobColumn = ({ id, title, jobs, onJobClick }: JobColumnProps) => {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[280px] max-w-[320px] bg-surface/30 rounded-xl border border-white/5 flex flex-col h-full">
            <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                    {title}
                    <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-full">
                        {jobs.length}
                    </span>
                </h3>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                    {jobs.map((job) => (
                        <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
                    ))}
                </SortableContext>
                {jobs.length === 0 && (
                    <div className="h-20 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-white/5 rounded-lg">
                        Drop items here
                    </div>
                )}
            </div>
        </div>
    );
};
