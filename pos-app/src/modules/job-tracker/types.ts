
export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived' | 'unavailable';
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

// Application documents built by Claude Code (see mcp-server/src/jobsService.ts)
export type DocsStatus = 'requested' | 'in_progress' | 'waiting_on_you' | 'ready' | 'failed';
export interface DocsFile { label: string; path: string }

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
    // Request for a tailored CV and cover letter, picked up by Claude Code.
    docs_status?: DocsStatus | null;
    docs_note?: string | null;
    docs_review_first?: boolean;
    docs_requested_at?: string | null;
    docs_updated_at?: string | null;
    docs_message?: string | null;
    docs_files?: DocsFile[] | null;
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
