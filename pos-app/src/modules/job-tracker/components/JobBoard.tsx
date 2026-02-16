import { useJobTrackerStore } from '@/store/useJobTrackerStore';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { JobColumn } from './JobColumn';
import { JobCard } from './JobCard';
import { Job, JobStatus } from '../types';
import { useState } from 'react';
import { createPortal } from 'react-dom';

const COLUMNS: { id: JobStatus; title: string }[] = [
    { id: 'wishlist', title: 'Wishlist' },
    { id: 'applied', title: 'Applied' },
    { id: 'interviewing', title: 'Interviewing' },
    { id: 'offer', title: 'Offer' },
    { id: 'rejected', title: 'Rejected' },
];

import { JobDetailSheet } from './JobDetailSheet';

export const JobBoard = ({ searchQuery = '' }: { searchQuery?: string }) => {
    const { jobs, updateJobStatus } = useJobTrackerStore();
    const [activeJob, setActiveJob] = useState<Job | null>(null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);


    const filteredJobs = jobs.filter(job =>
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const onDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Job') {
            setActiveJob(event.active.data.current.job);
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        setActiveJob(null);
        const { active, over } = event;

        if (!over) return;

        const activeJobId = active.id as string;
        const overId = over.id as string;

        // If dropped over a column
        if (Object.values(COLUMNS).some(col => col.id === overId)) {
            const newStatus = overId as JobStatus;
            if (activeJob && activeJob.status !== newStatus) {
                updateJobStatus(activeJobId, newStatus);
            }
        }
    };

    const onDragOver = () => {
        // Handle drag over logic if needed for refined sorting
    };

    const onJobClick = (job: Job) => {
        setSelectedJob(job);
        setDetailsOpen(true);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
        >
            <div className="h-full flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <JobColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        jobs={filteredJobs.filter((job) => job.status === col.id)}
                        onJobClick={onJobClick}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay>
                    {activeJob && (
                        <JobCard job={activeJob} />
                    )}
                </DragOverlay>,
                document.body
            )}

            <JobDetailSheet
                job={selectedJob}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </DndContext>
    );
};
