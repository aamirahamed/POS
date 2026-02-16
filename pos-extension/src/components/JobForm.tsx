import { useState } from 'react';
import { JobData } from '@/lib/ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface JobFormProps {
    initialData: JobData;
    onSave: (data: JobData) => Promise<void>;
    onCancel: () => void;
}

export const JobForm = ({ initialData, onSave, onCancel }: JobFormProps) => {
    const [formData, setFormData] = useState<JobData>(initialData);
    const [loading, setLoading] = useState(false);

    const handleChange = (field: keyof JobData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave(formData);
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4 overflow-y-auto px-1">
            <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={formData.company} onChange={e => handleChange('company', e.target.value)} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={formData.role} onChange={e => handleChange('role', e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={formData.location} onChange={e => handleChange('location', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input id="salary" value={formData.salary_range} onChange={e => handleChange('salary_range', e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <Label htmlFor="work_mode">Work Mode</Label>
                    <select
                        id="work_mode"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.work_mode}
                        onChange={e => handleChange('work_mode', e.target.value)}
                    >
                        <option value="onsite">Onsite</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="remote">Remote</option>
                        <option value="unknown">Unknown</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select
                        id="type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.employment_type}
                        onChange={e => handleChange('employment_type', e.target.value)}
                    >
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="intern">Intern</option>
                        <option value="temporary">Temporary</option>
                        <option value="unknown">Unknown</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" value={formData.url || ''} onChange={e => handleChange('url', e.target.value)} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={e => handleChange('description', e.target.value)} className="h-24" />
            </div>

            <div className="pt-2 flex gap-2 sticky bottom-0 bg-background py-2">
                <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save System'}
                </Button>
            </div>
        </form>
    );
};
