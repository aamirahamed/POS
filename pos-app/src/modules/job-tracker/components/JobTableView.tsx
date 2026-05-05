import { useState } from 'react';
import { useJobTrackerStore } from '@/store/useJobTrackerStore';
import { Job, JobStatus, EmploymentType } from '../types';
import { JobDetailSheet } from './JobDetailSheet';
import { 
    MoreHorizontal, ExternalLink, MapPin, Building2, Wallet, Star,
    Edit2, FileText, Globe
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
    wishlist: { label: 'Wishlist', color: 'bg-[#1E2330] text-slate-300 border-slate-600/30' },
    applied: { label: 'Applied', color: 'bg-blue-900/30 text-blue-300 border-blue-700/30' },
    interviewing: { label: 'Interviewing', color: 'bg-amber-900/30 text-amber-300 border-amber-700/30' },
    offer: { label: 'Offer', color: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/30' },
    rejected: { label: 'Rejected', color: 'bg-red-900/30 text-red-300 border-red-700/30' },
    archived: { label: 'Archived', color: 'bg-[#1A1F2B] text-slate-400 border-slate-700/30' },
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
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<EmploymentType | 'all'>('all');
    const [locationFilter, setLocationFilter] = useState<string>('all');
    
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Derived unique locations for the filter
    const uniqueLocations = Array.from(new Set(jobs.map(j => j.location).filter(Boolean))) as string[];

    const filteredJobs = jobs.filter(job => {
        const matchesSearch =
            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.role.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        const matchesType = typeFilter === 'all' || job.employment_type === typeFilter;
        const matchesLocation = locationFilter === 'all' || job.location === locationFilter;

        return matchesSearch && matchesStatus && matchesType && matchesLocation;
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
        <div className="space-y-6 pb-20">
            {/* Action Bar (Pill Filters) */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center bg-surface/50 rounded-full p-1 border border-border/50">
                    <button 
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        All Status
                    </button>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key as JobStatus)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>

                {/* Type Filter Dropdown styled as Pill */}
                <DropdownMenu>
                    <DropdownMenuTrigger className="px-4 py-1.5 rounded-full text-xs font-medium bg-surface/50 border border-border/50 hover:bg-surface text-foreground transition-colors flex items-center gap-2">
                        {typeFilter === 'all' ? 'All Types' : TYPE_CONFIG[typeFilter as EmploymentType]?.label}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setTypeFilter('all')}>All Types</DropdownMenuItem>
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                            <DropdownMenuItem key={key} onClick={() => setTypeFilter(key as EmploymentType)}>
                                {config.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Location Filter Dropdown styled as Pill */}
                {uniqueLocations.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="px-4 py-1.5 rounded-full text-xs font-medium bg-surface/50 border border-border/50 hover:bg-surface text-foreground transition-colors flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {locationFilter === 'all' ? 'All Locations' : locationFilter}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setLocationFilter('all')}>All Locations</DropdownMenuItem>
                            {uniqueLocations.map(loc => (
                                <DropdownMenuItem key={loc} onClick={() => setLocationFilter(loc)}>
                                    {loc}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <div className="text-xs font-medium text-muted-foreground ml-auto">
                    {filteredJobs.length} result{filteredJobs.length !== 1 && 's'}
                </div>
            </div>

            {/* Table Area */}
            <div className="space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-[40px_minmax(0,1.5fr)_140px_120px_140px_120px_100px] gap-4 px-6 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <div></div>
                    <div>Company & Role</div>
                    <div>Status</div>
                    <div>Type</div>
                    <div>Location</div>
                    <div>Salary</div>
                    <div className="text-right">Actions</div>
                </div>

                {/* Rows */}
                {filteredJobs.length === 0 ? (
                    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
                        No jobs found matching your filters.
                    </div>
                ) : (
                    filteredJobs.map((job) => (
                        <div
                            key={job.id}
                            onClick={() => handleRowClick(job)}
                            className={`group relative grid grid-cols-[40px_minmax(0,1.5fr)_140px_120px_140px_120px_100px] gap-4 items-center px-6 py-4 rounded-xl transition-all duration-200 cursor-pointer
                                ${job.priority 
                                    ? 'bg-surface-elevated border border-yellow-500/20 shadow-sm hover:bg-surface-hover hover:border-yellow-500/40 hover:-translate-y-[2px] hover:shadow-md' 
                                    : 'bg-surface-elevated border border-transparent shadow-sm hover:bg-surface-hover hover:border-border/60 hover:-translate-y-[2px] hover:shadow-md'
                                }
                            `}
                        >
                            {/* Star Priority */}
                            <div>
                                <button
                                    onClick={(e) => handleTogglePriority(e, job.id)}
                                    className="p-1.5 rounded-full hover:bg-background/80 transition-colors focus:outline-none"
                                >
                                    <Star
                                        className={`h-4 w-4 transition-all ${job.priority
                                            ? 'fill-yellow-500 text-yellow-500 scale-110'
                                            : 'text-muted-foreground/30 group-hover:text-muted-foreground hover:!text-yellow-500'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Company & Role */}
                            <div className="flex flex-col min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-text-primary text-[16px] truncate tracking-tight">
                                        {job.role}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 text-sm text-text-secondary">
                                    <Building2 className="h-3.5 w-3.5 opacity-80" />
                                    <span className="truncate">{job.company}</span>
                                </div>
                            </div>

                            {/* Status Pill Badge (Clickable via DropdownMenu) */}
                            <div onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="focus:outline-none">
                                        <div className={`px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase rounded-md border transition-colors hover:brightness-110 ${STATUS_CONFIG[job.status].color}`}>
                                            {STATUS_CONFIG[job.status].label}
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-40">
                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                            <DropdownMenuItem 
                                                key={key} 
                                                onClick={() => updateJobStatus(job.id, key as JobStatus)}
                                                className="text-xs"
                                            >
                                                <div className={`w-2 h-2 rounded-full mr-2 ${config.color.split(' ')[0]}`} />
                                                {config.label}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Type */}
                            <div>
                                <span className="inline-flex px-2 py-0.5 rounded border border-border/50 text-[11px] text-muted-foreground font-medium">
                                    {TYPE_CONFIG[job.employment_type]?.label || job.employment_type}
                                </span>
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                {job.location ? (
                                    <>
                                        <MapPin className="h-3.5 w-3.5 opacity-50 shrink-0" />
                                        <span className="truncate">{job.location}</span>
                                    </>
                                ) : <span className="opacity-30">-</span>}
                            </div>

                            {/* Salary */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                {job.salary_range ? (
                                    <>
                                        <Wallet className="h-3.5 w-3.5 opacity-50 shrink-0" />
                                        <span className="truncate">{job.salary_range}</span>
                                    </>
                                ) : <span className="opacity-30">-</span>}
                            </div>

                            {/* Hover Actions */}
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {job.url && (
                                    <a
                                        href={job.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                                        title="Open Job Link"
                                    >
                                        <Globe className="h-4 w-4" />
                                    </a>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRowClick(job); }}
                                    className="p-2 rounded-md hover:bg-background/80 text-muted-foreground hover:text-accent transition-colors"
                                    title="View/Edit Details"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button className="p-2 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(job); }}>
                                            <FileText className="mr-2 h-4 w-4" /> View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={(e) => handleDelete(e, job.id)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            Delete Job
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <JobDetailSheet
                job={selectedJob}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
};
