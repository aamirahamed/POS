import { useDraggable } from '@dnd-kit/core';
import { Job } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, Briefcase } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';

interface JobCardProps {
    job: Job;
    onClick?: () => void;
}

export const JobCard = ({ job, onClick }: JobCardProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: job.id,
        data: {
            type: 'Job',
            job: job,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick}>
            <Card className="bg-surface hover:bg-surface/80 border-white/5 transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:border-white/10 group">
                <CardContent className="p-3 space-y-2">
                    <div className="space-y-0.5">
                        <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{job.role}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{job.company}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {job.location && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                                <MapPin className="h-2.5 w-2.5" />
                                {job.location}
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded capitalize">
                            <Briefcase className="h-2.5 w-2.5" />
                            {job.work_mode}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
