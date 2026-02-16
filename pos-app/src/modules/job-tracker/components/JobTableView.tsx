
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useJobTrackerStore } from '@/store/useJobTrackerStore';
import { Job, JobStatus, EmploymentType } from '../types';
import { MoreHorizontal, ExternalLink, MapPin, Building2, Wallet, Star } from 'lucide-react';

import { useState } from 'react';
import { JobDetailSheet } from './JobDetailSheet';

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
    wishlist: { label: 'Wishlist', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
    applied: { label: 'Applied', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    interviewing: { label: 'Interviewing', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    offer: { label: 'Offer', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    archived: { label: 'Archived', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
};

const TYPE_CONFIG: Record<EmploymentType, { label: string }> = {
    'full-time': { label: 'Full-time' },
    'part-time': { label: 'Part-time' },
    'contract': { label: 'Contract' },
    'intern': { label: 'Internship' },
    'unknown': { label: 'Unknown' },
};

export const JobTableView = ({ searchQuery }: { searchQuery: string }) => {
    const { jobs, updateJobStatus, deleteJob, togglePriority } = useJobTrackerStore();
    const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<EmploymentType | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'priority'>('all');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const filteredJobs = jobs.filter(job => {
        const matchesSearch =
            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.role.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        const matchesType = typeFilter === 'all' || job.employment_type === typeFilter;
        const matchesPriority = priorityFilter === 'all' || (priorityFilter === 'priority' && job.priority);

        return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this job?')) {
            await deleteJob(id);
        }
    };

    const handleRowClick = (job: Job) => {
        setSelectedJob(job);
        setDetailsOpen(true);
    };

    const handleTogglePriority = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await togglePriority(id);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Select
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as JobStatus | 'all')}
                >
                    <SelectTrigger className="w-[150px] bg-background border-border/50">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                                {config.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={typeFilter}
                    onValueChange={(val) => setTypeFilter(val as EmploymentType | 'all')}
                >
                    <SelectTrigger className="w-[150px] bg-background border-border/50">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                                {config.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={priorityFilter}
                    onValueChange={(val) => setPriorityFilter(val as 'all' | 'priority')}
                >
                    <SelectTrigger className="w-[150px] bg-background border-border/50">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        <SelectItem value="priority">Priority Only</SelectItem>
                    </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground ml-auto">
                    Showing {filteredJobs.length} jobs
                </div>
            </div>

            <div className="rounded-md border border-border/50 bg-background/50 backdrop-blur-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-muted/50 border-border/50">
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead className="w-[250px]">Company & Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Salary</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredJobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No jobs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredJobs.map((job) => (
                                <TableRow
                                    key={job.id}
                                    className={`hover:bg-muted/50 border-border/50 cursor-pointer transition-colors ${job.priority ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : ''
                                        }`}
                                    onClick={() => handleRowClick(job)}
                                >
                                    <TableCell>
                                        <div
                                            onClick={(e) => handleTogglePriority(e, job.id)}
                                            className="cursor-pointer p-1 rounded-full hover:bg-background/50 transition-colors inline-flex"
                                        >
                                            <Star
                                                className={`h-4 w-4 transition-all ${job.priority
                                                    ? 'fill-yellow-500 text-yellow-500 scale-110'
                                                    : 'text-muted-foreground/50 hover:text-yellow-500'
                                                    }`}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-foreground flex items-center gap-2">
                                                {job.role}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Building2 className="h-3 w-3" />
                                                <span>{job.company}</span>
                                                {job.url && (
                                                    <a
                                                        href={job.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="hover:text-primary transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Select
                                                defaultValue={job.status}
                                                onValueChange={(val) => updateJobStatus(job.id, val as JobStatus)}
                                            >
                                                <SelectTrigger className={`w-[140px] h-8 text-xs font-medium border-0 ${STATUS_CONFIG[job.status].color}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {config.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs font-normal">
                                            {TYPE_CONFIG[job.employment_type]?.label || job.employment_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            {job.location ? (
                                                <>
                                                    <MapPin className="h-3 w-3" />
                                                    {job.location}
                                                </>
                                            ) : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            {job.salary_range ? (
                                                <>
                                                    <Wallet className="h-3 w-3" />
                                                    {job.salary_range}
                                                </>
                                            ) : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={(e) => handleDelete(e, job.id)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <JobDetailSheet
                job={selectedJob}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
};
