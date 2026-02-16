
import { useState } from 'react';
import { Plus, Trash2, BookOpen, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSubjects } from '../hooks/useSubjects';
import { Separator } from '@/components/ui/separator';

interface SubjectsSettingsDialogProps {
    children?: React.ReactNode;
}

export const SubjectsSettingsDialog = ({ children }: SubjectsSettingsDialogProps) => {
    const [open, setOpen] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const { subjects, addSubject, deleteSubject, loading } = useSubjects();

    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubject.trim()) return;

        setIsAdding(true);
        try {
            await addSubject(newSubject.trim());
            setNewSubject('');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteSubject = async (id: string) => {
        if (confirm('Are you sure you want to delete this subject?')) {
            await deleteSubject(id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings2 className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-surface border-border sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Manage Subjects
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Add or remove subjects used in assignment tracking.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <form onSubmit={handleAddSubject} className="flex gap-2">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="subject" className="sr-only">New Subject</Label>
                            <Input
                                id="subject"
                                placeholder="Enter subject name..."
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                className="bg-surface/50 border-border backdrop-blur-sm text-foreground"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!newSubject.trim() || isAdding}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </form>

                    <Separator className="bg-border/50" />

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Current Subjects</h4>
                        <ScrollArea className="h-[200px] w-full rounded-md border border-border/50 bg-surface/20 p-4">
                            {loading ? (
                                <div className="text-sm text-muted-foreground text-center py-4">Loading subjects...</div>
                            ) : subjects.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-4">No subjects added yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {subjects.map((subject) => (
                                        <div
                                            key={subject.id}
                                            className="flex items-center justify-between p-2 rounded-lg bg-surface/40 border border-white/5 group hover:bg-surface/60 transition-colors"
                                        >
                                            <span className="text-sm text-foreground">{subject.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSubject(subject.id)}
                                                className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
