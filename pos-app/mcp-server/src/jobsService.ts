import { readFileSync, realpathSync } from 'fs';
import os from 'os';
import path from 'path';
import { supabase, MCP_USER_ID } from './supabase.js';
import { parseReport } from './reportParser.js';

// career-ops → Job Tracker bridge. career-ops owns discovery and fit scoring;
// POS owns status, priority and notes once a role exists, so updates never
// touch those columns.

const WORK_MODES = ['remote', 'hybrid', 'onsite', 'unknown'];
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'intern', 'unknown'];
const VERDICTS = ['PASS', 'MARGINAL', 'FAIL', 'SKIP'];
const STATUSES = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected', 'archived'];

const FIT_FIELDS = ['fit_score', 'fit_verdict', 'archetype', 'fit_notes', 'cv_pick', 'report_path', 'posted_at', 'report_md', 'evaluation'] as const;

// Reports are read from the local career-ops data folder only.
const REPORT_ROOT = path.resolve(process.env.CAREER_OPS_DATA_DIR || path.join(os.homedir(), 'career-ops-data'));

const readReport = (reportPath: string) => {
    const resolved = realpathSync(path.resolve(reportPath));
    if (!resolved.startsWith(REPORT_ROOT + path.sep) || !resolved.endsWith('.md')) {
        throw new Error(`report_path must be a .md file inside ${REPORT_ROOT}`);
    }
    const md = readFileSync(resolved, 'utf8');
    const parsed = parseReport(md);
    // Some reports archive the JD in a separate file and only point to it ("See jds/... for the full archive").
    const pointer = parsed.jd && parsed.jd.length < 400 ? parsed.jd.match(/\b(jds\/[\w.-]+\.md)\b/)?.[1] : undefined;
    if (pointer) {
        const jdPath = realpathSync(path.join(REPORT_ROOT, pointer));
        if (jdPath.startsWith(REPORT_ROOT + path.sep)) parsed.jd = readFileSync(jdPath, 'utf8').trim();
    }
    return { md, ...parsed };
};
// Basic fields are filled on insert, and on update only when POS has them empty.
const BASIC_FIELDS = ['location', 'work_mode', 'employment_type', 'salary_range', 'description'] as const;

const str = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim());

type JobRow = Record<string, unknown> & { id: string; url: string };

const clean = (input: Record<string, unknown>) => {
    const url = str(input?.url);
    const company = str(input?.company);
    const role = str(input?.role);
    if (!url || !company || !role) throw new Error('each job needs url, company and role');

    const workMode = str(input.work_mode);
    const employmentType = str(input.employment_type);
    const verdict = str(input.fit_verdict)?.toUpperCase();
    const score = input.fit_score === undefined || input.fit_score === null ? undefined : Number(input.fit_score);
    if (score !== undefined && (Number.isNaN(score) || score < 0 || score > 5)) throw new Error(`fit_score out of range for ${url}`);
    if (verdict && !VERDICTS.includes(verdict)) throw new Error(`fit_verdict must be one of ${VERDICTS.join(', ')}`);

    return {
        url, company, role,
        location: str(input.location),
        work_mode: workMode && WORK_MODES.includes(workMode) ? workMode : 'unknown',
        employment_type: employmentType && EMPLOYMENT_TYPES.includes(employmentType) ? employmentType : 'unknown',
        salary_range: str(input.salary_range),
        description: str(input.description),
        fit_score: score === undefined ? undefined : Math.round(score * 10) / 10,
        fit_verdict: verdict,
        archetype: str(input.archetype),
        fit_notes: str(input.fit_notes),
        cv_pick: str(input.cv_pick),
        report_path: str(input.report_path),
        posted_at: str(input.posted_at),
    };
};

const defined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export const upsertJobs = async (jobs: unknown) => {
    if (!Array.isArray(jobs) || jobs.length === 0) throw new Error('jobs must be a non-empty array');
    if (jobs.length > 200) throw new Error('send at most 200 jobs per call');
    const rows = (jobs as Record<string, unknown>[]).map(clean);

    const { data: existing, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', MCP_USER_ID)
        .in('url', rows.map(r => r.url));
    if (error) throw error;
    const byUrl = new Map(((existing ?? []) as JobRow[]).map(j => [j.url, j]));

    const result = { inserted: 0, updated: 0, unchanged: 0, errors: [] as string[] };
    const now = new Date().toISOString();

    for (const row of rows as (ReturnType<typeof clean> & { report_md?: string; evaluation?: unknown })[]) {
        const current = byUrl.get(row.url);
        try {
            if (row.report_path) {
                const report = readReport(row.report_path);
                row.report_md = report.md;
                row.evaluation = report.evaluation;
                if (!row.description && report.jd) row.description = report.jd;
            }
            // For roles career-ops added, the archived JD is career-ops data too, so refresh it.
            if (current && current.source === 'career-ops' && row.description && row.description !== current.description) {
                current.description = null;
            }
            if (!current) {
                const { error: insErr } = await supabase.from('jobs').insert({
                    ...defined(row),
                    user_id: MCP_USER_ID,
                    status: 'wishlist',
                    source: 'career-ops',
                    fit_updated_at: row.fit_score !== undefined || row.fit_verdict ? now : undefined,
                });
                if (insErr) throw insErr;
                result.inserted++;
                continue;
            }

            const updates: Record<string, unknown> = {};
            for (const f of FIT_FIELDS) {
                const same = (a: unknown, b: unknown) => (typeof a === 'object' || typeof b === 'object')
                    ? JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
                    : String(a) === String(b ?? '');
                if (row[f] !== undefined && !same(row[f], current[f])) updates[f] = row[f];
            }
            for (const f of BASIC_FIELDS) {
                const empty = current[f] === null || current[f] === undefined || current[f] === '' || current[f] === 'unknown';
                if (empty && row[f] !== undefined && row[f] !== 'unknown') updates[f] = row[f];
            }
            if (Object.keys(updates).length === 0) { result.unchanged++; continue; }
            if (FIT_FIELDS.some(f => f in updates)) updates.fit_updated_at = now;
            updates.updated_at = now;

            const { error: updErr } = await supabase.from('jobs').update(updates).eq('id', current.id).eq('user_id', MCP_USER_ID);
            if (updErr) throw updErr;
            result.updated++;
        } catch (e) {
            result.errors.push(`${row.url}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return result;
};

export const listJobs = async (opts: { status?: string; source?: string; limit?: number } = {}) => {
    let query = supabase
        .from('jobs')
        .select('id, url, company, role, status, priority, location, salary_range, source, fit_score, fit_verdict, archetype, cv_pick, report_path, notes, created_at, updated_at')
        .eq('user_id', MCP_USER_ID)
        .order('updated_at', { ascending: false })
        .limit(Math.min(Math.max(Number(opts.limit) || 200, 1), 500));
    if (opts.status) {
        if (!STATUSES.includes(opts.status)) throw new Error(`status must be one of ${STATUSES.join(', ')}`);
        query = query.eq('status', opts.status);
    }
    if (opts.source) query = query.eq('source', opts.source);
    const { data, error } = await query;
    if (error) throw error;

    // Latest status change per job, so career-ops can time follow-ups.
    const ids = (data ?? []).map(j => j.id);
    const lastChange = new Map<string, string>();
    if (ids.length) {
        const { data: acts } = await supabase
            .from('job_activities')
            .select('job_id, activity_date')
            .eq('type', 'status_change')
            .in('job_id', ids)
            .order('activity_date', { ascending: false });
        for (const a of acts ?? []) if (!lastChange.has(a.job_id)) lastChange.set(a.job_id, a.activity_date);
    }
    return (data ?? []).map(j => ({ ...j, status_changed_at: lastChange.get(j.id) ?? null }));
};
