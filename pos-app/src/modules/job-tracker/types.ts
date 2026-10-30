
export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived';
export type WorkMode = 'remote' | 'hybrid' | 'onsite' | 'unknown';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern' | 'unknown';
export type ActivityType = 'note' | 'status_change' | 'follow_up';
export type InterviewOutcome = 'pending' | 'pass' | 'fail';
export type FitVerdict = 'PASS' | 'MARGINAL' | 'FAIL' | 'SKIP';
export interface JobEvaluation {
    date?: string;
    via?: string;
    decision?: string;
    legitimacy?: string;
    work_auth?: string;
    risk_level?: string;
    lead?: string;
    hard_stops?: string[];
    soft_gaps?: string[];
    top_strengths?: string[];
}

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
    // Fit assessment written by career-ops (see mcp-server/src/jobsService.ts)
    fit_score?: number | null;
    fit_verdict?: FitVerdict | null;
    archetype?: string | null;
    fit_notes?: string | null;
    cv_pick?: string | null;
    report_path?: string | null;
    posted_at?: string | null;
    fit_updated_at?: string | null;
    // Full career-ops report (markdown) and its parsed summary; loaded on the detail page only.
    report_md?: string | null;
    evaluation?: JobEvaluation | null;
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
