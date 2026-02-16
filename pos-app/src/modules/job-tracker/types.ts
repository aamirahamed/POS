
export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived';
export type WorkMode = 'remote' | 'hybrid' | 'onsite' | 'unknown';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern' | 'unknown';
export type ActivityType = 'note' | 'status_change' | 'follow_up';
export type InterviewOutcome = 'pending' | 'pass' | 'fail';
export type OfferStatus = 'pending' | 'accepted' | 'declined';

export interface Job {
    id: string;
    user_id: string;
    company: string;
    role: string;
    status: JobStatus;
    priority: boolean;
    location?: string;
    work_mode: WorkMode;
    employment_type: EmploymentType;
    source?: string;
    salary_range?: string;
    url?: string;
    description?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface JobActivity {
    id: string;
    job_id: string;
    user_id: string;
    type: ActivityType;
    content: string;
    activity_date: string;
    is_completed?: boolean;
    created_at: string;
}

export interface JobInterview {
    id: string;
    job_id: string;
    user_id: string;
    round_number: number;
    interview_date?: string;
    notes?: string;
    outcome: InterviewOutcome;
    created_at: string;
}

export interface JobOffer {
    id: string;
    job_id: string;
    user_id: string;
    salary?: string;
    start_date?: string;
    deadline?: string;
    notes?: string;
    status: OfferStatus;
    created_at: string;
}
