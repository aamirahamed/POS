import { Job } from './types';

export type JobSort = 'newest' | 'fit_desc' | 'fit_asc';

export const JOB_SORT_OPTIONS: { value: JobSort; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'fit_desc', label: 'Fit score: high to low' },
    { value: 'fit_asc', label: 'Fit score: low to high' },
];

const hasScore = (j: Job) => j.fit_score !== null && j.fit_score !== undefined;
const newestFirst = (a: Job, b: Job) => b.created_at.localeCompare(a.created_at);

// Unscored roles always sit after scored ones; ties fall back to newest first.
export const sortJobs = (jobs: Job[], sort: JobSort): Job[] => {
    const sorted = [...jobs];
    if (sort === 'newest') return sorted.sort(newestFirst);
    const dir = sort === 'fit_desc' ? -1 : 1;
    return sorted.sort((a, b) => {
        if (hasScore(a) !== hasScore(b)) return hasScore(a) ? -1 : 1;
        if (!hasScore(a)) return newestFirst(a, b);
        const diff = (Number(a.fit_score) - Number(b.fit_score)) * dir;
        return diff !== 0 ? diff : newestFirst(a, b);
    });
};
