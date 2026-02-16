export interface Semester {
    id: string;
    name: string;
    is_current: boolean;
    created_at: string;
}

export interface Assignment {
    id: string;
    semester_id: string;
    subject: string;
    assignment_title: string;
    due_date: string;
    contribution_percentage: number;
    is_completed: boolean;
    group_individual: string;
    created_at: string;
    updated_at: string;
}

export interface CreateAssignmentData {
    semester_id: string;
    subject: string;
    assignment_title: string;
    due_date: string;
    contribution_percentage: number;
    group_individual: string;
}

export type FilterType = 'all' | 'pending' | 'completed';

export type UpdateAssignmentData = Omit<CreateAssignmentData, 'semester_id'>;
