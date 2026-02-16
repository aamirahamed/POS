import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Job } from '../types';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Briefcase, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

import { motion, AnimatePresence, Variants } from 'framer-motion';

interface JobDetailSheetProps {
    job: Job | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 25,
            stiffness: 120,
        },
    },
};

export const JobDetailSheet = ({ job, open, onOpenChange }: JobDetailSheetProps) => {
    if (!job) return null;

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'wishlist': return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: Briefcase };
            case 'applied': return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: ExternalLink };
            case 'interviewing': return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Calendar };
            case 'offer': return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: DollarSign };
            case 'rejected': return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: Building2 };
            default: return { color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', icon: Building2 };
        }
    };

    const statusConfig = getStatusConfig(job.status);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto border-white/5 bg-background/95 backdrop-blur-xl">
                <AnimatePresence mode="wait">
                    {open && (
                        <motion.div
                            key={job.id}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-8"
                        >
                            <motion.div variants={itemVariants}>
                                <SheetHeader className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl glass-dark ${statusConfig.border}`}>
                                                <statusConfig.icon className={`h-6 w-6 ${statusConfig.color}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <Badge variant="outline" className={`capitalize font-medium ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                                                    {job.status}
                                                </Badge>
                                                <SheetTitle className="text-2xl font-bold tracking-tight text-foreground">{job.role}</SheetTitle>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-dark text-zinc-300">
                                                <Building2 className="h-4 w-4 text-indigo-400" />
                                                {job.company}
                                            </div>
                                            {job.location && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-dark text-zinc-300">
                                                    <MapPin className="h-4 w-4 text-rose-400" />
                                                    {job.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </SheetHeader>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-8">
                                {/* Stats & Meta Section */}
                                <div className="grid grid-cols-2 gap-3 items-stretch">
                                    <div className="p-4 rounded-2xl glass-dark flex flex-col gap-2 border border-white/5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mode</span>
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <Briefcase className="h-4 w-4 text-indigo-400" />
                                            <span className="capitalize">{job.work_mode} / {job.employment_type}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl glass-dark flex flex-col gap-2 border border-white/5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Salary</span>
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <DollarSign className="h-4 w-4 text-emerald-400" />
                                            <span>{job.salary_range || 'Not specified'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {job.url && (
                                    <Button variant="outline" className="w-full glass hover:bg-white/5 border-white/10 group h-12 rounded-xl transition-all duration-300" asChild>
                                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                                            <ExternalLink className="h-4 w-4 text-blue-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                            <span className="font-medium">Visit Company Website</span>
                                        </a>
                                    </Button>
                                )}
                            </motion.div>

                            {/* Description */}
                            <motion.div variants={itemVariants} className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                    Job Description
                                </div>
                                <div className="text-sm leading-relaxed text-zinc-400 glass p-5 rounded-2xl border-white/5 min-h-[100px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                                    {job.description || 'No description provided.'}
                                </div>
                            </motion.div>

                            {/* Notes */}
                            <motion.div variants={itemVariants} className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                    Notes & Strategy
                                </div>
                                <div className="text-sm leading-relaxed text-zinc-400 glass-dark p-5 rounded-2xl border-white/5 min-h-[100px]">
                                    {job.notes || 'No notes added yet.'}
                                </div>
                            </motion.div>

                            {/* Timeline & Metadata */}
                            <motion.div variants={itemVariants} className="space-y-6 pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-sm font-semibold text-foreground">Activity & Timeline</h4>
                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-white/5 px-2 py-1 rounded-full uppercase tracking-tighter">
                                        <Calendar className="h-3 w-3" />
                                        Added {format(new Date(job.created_at), 'MMM d, yyyy')}
                                    </div>
                                </div>

                                <div className="glass-dark p-8 rounded-2xl border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="p-3 rounded-full bg-white/5">
                                        <Calendar className="h-5 w-5 text-muted-foreground/40" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-zinc-400">Timeline and follow-ups coming soon</p>
                                        <p className="text-xs text-muted-foreground/60">We'll track your interview stages and offer details here.</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </SheetContent>
        </Sheet>
    );
};
