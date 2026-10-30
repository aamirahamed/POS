// Parses a career-ops evaluation report (markdown) into the summary the Job Tracker shows.

const unquote = (v: string) => v.trim().replace(/^["']|["']$/g, '');

// Pull the YAML list under `key:` in the Machine Summary block (items are `  - "..."`).
const yamlList = (yaml: string, key: string) => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(\\[\\])?\\s*$([\\s\\S]*?)(?=^\\S|(?![\\s\\S]))`, 'm'));
    if (!m || m[1]) return [];
    return m[2].split('\n').map(l => l.match(/^\s*-\s+(.*)$/)?.[1]).filter((v): v is string => !!v).map(unquote);
};
const yamlScalar = (yaml: string, key: string) => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return m ? unquote(m[1]) : undefined;
};

export const parseReport = (md: string) => {
    const header = (label: string) => md.match(new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, 'm'))?.[1].trim();
    const yaml = md.match(/## Machine Summary\s*```ya?ml\n([\s\S]*?)```/)?.[1] ?? '';
    const lead = md.split(/^---$/m)[0].split('\n\n').map(p => p.trim()).filter(p => p && !p.startsWith('#') && !p.startsWith('**Date:**')).pop();
    const jd = md.match(/^## Job Description[^\n]*\n([\s\S]*)$/m)?.[1].trim();
    const evaluation = {
        date: header('Date'),
        via: header('Via'),
        decision: yamlScalar(yaml, 'final_decision') ?? header('Decision'),
        legitimacy: yamlScalar(yaml, 'legitimacy_tier') ?? header('Legitimacy'),
        work_auth: header('Work Auth'),
        risk_level: yamlScalar(yaml, 'risk_level'),
        lead,
        hard_stops: yamlList(yaml, 'hard_stops'),
        soft_gaps: yamlList(yaml, 'soft_gaps'),
        top_strengths: yamlList(yaml, 'top_strengths'),
    };
    return { evaluation, jd };
};

