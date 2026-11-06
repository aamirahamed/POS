import { supabase, MCP_USER_ID } from './supabase.js';

// Skill ledger: terms job ads ask for that Aamir's CVs don't back up yet.
// Claude records them while tailoring; Aamir reviews them in POS. Approval of
// CV wording happens only in POS, so Claude can propose wording but never approve it.

const CATEGORIES = ['method', 'technique', 'tool', 'domain', 'credential', 'experience', 'other'];
const KINDS = ['buildable', 'fixed'];
const IMPORTANCE = ['critical', 'high', 'meaningful', 'nice'];
const IMPORTANCE_RANK: Record<string, number> = { nice: 0, meaningful: 1, high: 2, critical: 3 };
const MATCHES = ['missing', 'partial'];
const SOURCES = ['build', 'career-ops'];
const ALL_STATUSES = ['unreviewed', 'confirmed', 'wording_proposed', 'approved', 'not_done', 'learning', 'dont_claim', 'resolved_wording'];
// Statuses Claude may set. 'approved' is Aamir's call, made in POS.
const CLAUDE_STATUSES = ALL_STATUSES.filter(s => s !== 'approved');

const str = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim());
const pick = (v: unknown, allowed: string[], fallback: string) => {
    const s = str(v)?.toLowerCase();
    return s && allowed.includes(s) ? s : fallback;
};

export const termKey = (term: string) => term
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();

type LedgerRow = { id: string; term: string; term_key: string; aliases: string[]; status: string; mapped_to: string | null; approved_wording: string | null; interview_line: string | null; category: string; kind: string };

const loadLedger = async () => {
    const { data, error } = await supabase
        .from('skill_ledger')
        .select('id, term, term_key, aliases, status, mapped_to, approved_wording, interview_line, category, kind')
        .eq('user_id', MCP_USER_ID);
    if (error) throw error;
    const byKey = new Map<string, LedgerRow>();
    for (const row of (data ?? []) as LedgerRow[]) {
        byKey.set(row.term_key, row);
        for (const a of row.aliases ?? []) byKey.set(termKey(a), row);
    }
    return byKey;
};

export const recordSkillGaps = async (input: {
    job_id?: unknown; company?: unknown; role?: unknown; source?: unknown; gaps?: unknown;
}) => {
    if (!Array.isArray(input.gaps) || input.gaps.length === 0) throw new Error('gaps must be a non-empty array');
    if (input.gaps.length > 100) throw new Error('send at most 100 gaps per call');
    const jobId = str(input.job_id);
    let company = str(input.company);
    let role = str(input.role);
    if (jobId) {
        const { data: job, error } = await supabase.from('jobs').select('id, company, role').eq('id', jobId).eq('user_id', MCP_USER_ID).maybeSingle();
        if (error) throw error;
        if (!job) throw new Error('job not found');
        company = company ?? job.company;
        role = role ?? job.role;
    }
    const source = pick(input.source, SOURCES, 'build');
    const byKey = await loadLedger();
    const now = new Date().toISOString();
    const result = { created: [] as string[], sighted: [] as string[], errors: [] as string[], known: [] as { term: string; status: string; mapped_to: string | null; approved_wording: string | null; interview_line: string | null }[] };

    for (const raw of input.gaps as Record<string, unknown>[]) {
        const term = str(raw?.term);
        try {
            if (!term) throw new Error('each gap needs a term');
            const aliases = Array.isArray(raw.aliases) ? (raw.aliases as unknown[]).map(str).filter((a): a is string => !!a) : [];
            const mappedTo = str(raw.mapped_to);
            let row = byKey.get(termKey(term)) ?? aliases.map(a => byKey.get(termKey(a))).find(Boolean);

            if (!row) {
                const { data, error } = await supabase.from('skill_ledger').insert({
                    user_id: MCP_USER_ID,
                    term,
                    term_key: termKey(term),
                    aliases,
                    category: pick(raw.category, CATEGORIES, 'other'),
                    kind: pick(raw.kind, KINDS, 'buildable'),
                    status: mappedTo ? 'resolved_wording' : 'unreviewed',
                    mapped_to: mappedTo ?? null,
                    interview_line: str(raw.interview_line) ?? null,
                    bg_req_key: str(raw.bg_req_key) ?? null,
                    first_seen_at: now,
                    last_seen_at: now,
                }).select('id, term, term_key, aliases, status, mapped_to, approved_wording, interview_line, category, kind').single();
                if (error) throw error;
                row = data as LedgerRow;
                byKey.set(row.term_key, row);
                for (const a of aliases) byKey.set(termKey(a), row);
                result.created.push(term);
            } else {
                const newAliases = [...new Set([...(row.aliases ?? []), ...aliases, ...(termKey(term) !== row.term_key ? [term] : [])])]
                    .filter(a => termKey(a) !== row!.term_key);
                const updates: Record<string, unknown> = { last_seen_at: now, updated_at: now };
                if (newAliases.length !== (row.aliases ?? []).length) updates.aliases = newAliases;
                if (!row.interview_line && str(raw.interview_line)) updates.interview_line = str(raw.interview_line);
                const { error } = await supabase.from('skill_ledger').update(updates).eq('id', row.id).eq('user_id', MCP_USER_ID);
                if (error) throw error;
                row.aliases = newAliases;
                result.known.push({ term: row.term, status: row.status, mapped_to: row.mapped_to, approved_wording: row.approved_wording, interview_line: row.interview_line });
            }

            // A term added from chat, with no job behind it, has nothing to count yet.
            if (!jobId && !company) continue;
            const sighting = {
                user_id: MCP_USER_ID,
                ledger_id: row.id,
                job_id: jobId ?? null,
                company: company ?? null,
                role: role ?? null,
                quote: str(raw.quote) ?? null,
                importance: pick(raw.importance, IMPORTANCE, 'meaningful'),
                match: pick(raw.match, MATCHES, 'missing'),
                source,
            };
            if (jobId) {
                const { data: existing } = await supabase.from('skill_sightings').select('id, importance').eq('ledger_id', row.id).eq('job_id', jobId).maybeSingle();
                if (existing) {
                    // Keep the stronger importance if the same job is recorded twice.
                    if (IMPORTANCE_RANK[sighting.importance] > IMPORTANCE_RANK[existing.importance]) {
                        await supabase.from('skill_sightings').update({ importance: sighting.importance, quote: sighting.quote, match: sighting.match }).eq('id', existing.id);
                    }
                    continue;
                }
            }
            const { error: sErr } = await supabase.from('skill_sightings').insert(sighting);
            if (sErr) throw sErr;
            result.sighted.push(row.term);
        } catch (e) {
            result.errors.push(`${term ?? '(no term)'}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return result;
};

export const listSkillLedger = async (opts: { status?: string; includeSightings?: boolean } = {}) => {
    let query = supabase
        .from('skill_ledger')
        .select('id, term, aliases, category, kind, status, mapped_to, evidence_where, evidence_what, evidence_result, proposed_wording, approved_wording, interview_line, bg_req_key, first_seen_at, last_seen_at')
        .eq('user_id', MCP_USER_ID)
        .order('last_seen_at', { ascending: false });
    if (opts.status) {
        const statuses = opts.status.split(',').map(s => s.trim());
        for (const s of statuses) if (!ALL_STATUSES.includes(s)) throw new Error(`status must be among ${ALL_STATUSES.join(', ')}`);
        query = query.in('status', statuses);
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    const ids = rows.map(r => r.id);
    const sightings = new Map<string, { company: string | null; role: string | null; importance: string; quote: string | null; job_id: string | null }[]>();
    if (ids.length) {
        const { data: s, error: sErr } = await supabase
            .from('skill_sightings')
            .select('ledger_id, job_id, company, role, importance, quote')
            .in('ledger_id', ids);
        if (sErr) throw sErr;
        for (const x of s ?? []) {
            const list = sightings.get(x.ledger_id) ?? [];
            list.push(x);
            sightings.set(x.ledger_id, list);
        }
    }
    return rows.map(r => {
        const list = sightings.get(r.id) ?? [];
        const counts = { jobs: list.length, critical: 0, high: 0, meaningful: 0, nice: 0 } as Record<string, number>;
        for (const x of list) counts[x.importance] = (counts[x.importance] ?? 0) + 1;
        return { ...r, demand: counts, ...(opts.includeSightings ? { sightings: list } : {}) };
    });
};

export const updateSkill = async (input: Record<string, unknown>) => {
    const id = str(input.id);
    if (!id) throw new Error('id is required');
    const updates: Record<string, unknown> = {};
    const status = str(input.status);
    if (status) {
        if (status === 'approved') throw new Error('only Aamir approves wording, in POS');
        if (!CLAUDE_STATUSES.includes(status)) throw new Error(`status must be one of ${CLAUDE_STATUSES.join(', ')}`);
        updates.status = status;
    }
    if (input.category !== undefined) updates.category = pick(input.category, CATEGORIES, 'other');
    if (input.kind !== undefined) updates.kind = pick(input.kind, KINDS, 'buildable');
    for (const f of ['term', 'mapped_to', 'evidence_where', 'evidence_what', 'evidence_result', 'proposed_wording', 'interview_line', 'bg_req_key'] as const) {
        if (input[f] !== undefined) updates[f] = str(input[f]) ?? null;
    }
    if (typeof updates.term === 'string') updates.term_key = termKey(updates.term);
    if (Array.isArray(input.aliases)) updates.aliases = (input.aliases as unknown[]).map(str).filter(Boolean);
    if (updates.proposed_wording && !status) updates.status = 'wording_proposed';
    if (Object.keys(updates).length === 0) throw new Error('nothing to update');
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('skill_ledger')
        .update(updates)
        .eq('id', id)
        .eq('user_id', MCP_USER_ID)
        .select('id, term, status')
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('skill not found');
    return data;
};

// Folds a duplicate entry into another: sightings and aliases move across, the duplicate is deleted.
export const mergeSkills = async (input: { keep_id?: unknown; merge_id?: unknown }) => {
    const keepId = str(input.keep_id);
    const mergeId = str(input.merge_id);
    if (!keepId || !mergeId || keepId === mergeId) throw new Error('pass two different ids: keep_id and merge_id');
    const { data: rows, error } = await supabase.from('skill_ledger').select('id, term, aliases').eq('user_id', MCP_USER_ID).in('id', [keepId, mergeId]);
    if (error) throw error;
    const keep = rows?.find(r => r.id === keepId);
    const merge = rows?.find(r => r.id === mergeId);
    if (!keep || !merge) throw new Error('skill not found');

    const { data: moving } = await supabase.from('skill_sightings').select('id, job_id').eq('ledger_id', mergeId);
    const { data: kept } = await supabase.from('skill_sightings').select('job_id').eq('ledger_id', keepId);
    const keptJobs = new Set((kept ?? []).map(k => k.job_id).filter(Boolean));
    for (const s of moving ?? []) {
        if (s.job_id && keptJobs.has(s.job_id)) continue; // already counted for that job
        await supabase.from('skill_sightings').update({ ledger_id: keepId }).eq('id', s.id);
    }
    const aliases = [...new Set([...(keep.aliases ?? []), merge.term, ...(merge.aliases ?? [])])];
    await supabase.from('skill_ledger').update({ aliases, updated_at: new Date().toISOString() }).eq('id', keepId);
    const { error: delErr } = await supabase.from('skill_ledger').delete().eq('id', mergeId).eq('user_id', MCP_USER_ID);
    if (delErr) throw delErr;
    return { kept: keep.term, merged: merge.term, aliases };
};
