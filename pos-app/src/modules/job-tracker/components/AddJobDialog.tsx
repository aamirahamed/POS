import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useJobTrackerStore } from '@/store/useJobTrackerStore';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WorkMode, EmploymentType } from '@/modules/job-tracker/types';

interface AddJobDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AddJobDialog = ({ open, onOpenChange }: AddJobDialogProps) => {
    const { addJob } = useJobTrackerStore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        company: '',
        role: '',
        location: '',
        work_mode: 'onsite' as WorkMode,
        employment_type: 'full-time' as EmploymentType,
        source: '',
        salary_range: '',
        url: '',
        description: '',
        notes: ''
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.company || !formData.role) return;

        setLoading(true);
        try {
            await addJob({
                ...formData,
                status: 'wishlist', // Default status
                priority: false
            });
            toast({
                title: "Job added",
                description: "New opportunity added to your wishlist.",
            });
            onOpenChange(false);
            setFormData({
                company: '',
                role: '',
                location: '',
                work_mode: 'onsite',
                employment_type: 'full-time',
                source: '',
                salary_range: '',
                url: '',
                description: '',
                notes: ''
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to add job. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Job Opportunity</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company">Company *</Label>
                            <Input
                                id="company"
                                value={formData.company}
                                onChange={(e) => handleChange('company', e.target.value)}
                                placeholder="e.g. Google"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role Title *</Label>
                            <Input
                                id="role"
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                                placeholder="e.g. Senior Frontend Engineer"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="work_mode">Work Mode</Label>
                            <Select value={formData.work_mode} onValueChange={(val) => handleChange('work_mode', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="onsite">On-site</SelectItem>
                                    <SelectItem value="hybrid">Hybrid</SelectItem>
                                    <SelectItem value="remote">Remote</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="employment_type">Type</Label>
                            <Select value={formData.employment_type} onValueChange={(val) => handleChange('employment_type', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full-time">Full-time</SelectItem>
                                    <SelectItem value="part-time">Part-time</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                    <SelectItem value="intern">Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => handleChange('location', e.target.value)}
                                placeholder="e.g. New York, NY"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="salary">Salary Range</Label>
                            <Input
                                id="salary"
                                value={formData.salary_range}
                                onChange={(e) => handleChange('salary_range', e.target.value)}
                                placeholder="e.g. $120k - $150k"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="url">Job Link</Label>
                        <Input
                            id="url"
                            type="url"
                            value={formData.url}
                            onChange={(e) => handleChange('url', e.target.value)}
                            placeholder="https://..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Job Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Paste the full job description here..."
                            className="h-32"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Initial Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Key requirements, thoughts, etc."
                            className="h-20"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Opportunity'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
