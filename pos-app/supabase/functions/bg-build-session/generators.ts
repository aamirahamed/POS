// Session Builder generators: one function per module. Each asks Gemini for a module-specific JSON
// shape (more reliable than free-form blocks) and converts it to the block format in code.

import { callGemini, CAREFUL_MODEL, FAST_MODEL } from '../_shared/gemini.ts';
import { checksOut, evaluate } from '../_shared/arith.ts';
import { Block, ModuleOut, NumbersProblem, TreeNode } from '../_shared/content.ts';
import { TARGET_LEVEL } from '../_shared/level.ts';

export interface BuildContext {
  apiKey: string;
  date: string; // YYYY-MM-DD
  profile: string; // a trimmed slice of Aamir's strategy memo, for personalisation
  recentTitles: Record<string, string[]>; // module key -> recent titles, to avoid repeats
}

const ACCURACY = `Accuracy matters more than fluency. Never invent quotes, statistics, dates or sources. If historians or experts disagree on something, say so. Before using an example, check it genuinely illustrates the point.`;
const STYLE = `Write in plain, warm, direct English for a sharp adult who is not a specialist. Short paragraphs. No filler, no "In conclusion". Markdown bold for key terms is fine.`;

const text = (t: string) => ({ role: 'user' as const, parts: [{ text: t }] });

// ── Series (Lesson and History) ───────────────────────────────────────────────

export interface SyllabusPart { part: number; title: string; focus: string }

export const planSyllabus = async (apiKey: string, kind: 'lesson' | 'history', name: string, total = 8): Promise<SyllabusPart[]> => {
  const res = await callGemini<{ parts: SyllabusPart[] }>(
    apiKey,
    `You design short courses for a daily 5-minute reading habit. ${ACCURACY}`,
    [text(`Plan a ${total}-part ${kind === 'history' ? 'history series' : 'course'} called "${name}". Each part must stand on its own in about 5 minutes of reading, but the parts should build on each other in a sensible order${kind === 'history' ? ', mostly chronological' : ', from foundations to advanced ideas'}. For each part give a title and a one-sentence focus.`)],
    {
      type: 'OBJECT',
      properties: {
        parts: {
          type: 'ARRAY',
          items: { type: 'OBJECT', properties: { part: { type: 'INTEGER' }, title: { type: 'STRING' }, focus: { type: 'STRING' } }, required: ['part', 'title', 'focus'] },
        },
      },
      required: ['parts'],
    },
    0.4,
    CAREFUL_MODEL,
  );
  return res.parts.slice(0, total).map((p, i) => ({ ...p, part: i + 1 }));
};

interface LessonShape {
  title: string;
  intro: string;
  key_idea: string;
  sections: { heading: string; body: string }[];
  steps?: { title: string; text: string }[];
  matrix?: { title: string; row_label: string; col_label: string; rows: string[]; cols: string[]; cells: string[][]; highlight_cell?: { row: number; col: number; kind: 'good' | 'bad' | 'equilibrium' }[]; caption: string };
  cards?: { title: string; text: string }[];
  compare?: { title: string; columns: { title: string; points: string[] }[] };
  key_term: { term: string; definition: string; example: string };
  next_teaser: string;
  tags: string[];
}

const LESSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    intro: { type: 'STRING', description: '2-3 sentence hook in markdown' },
    key_idea: { type: 'STRING', description: 'The one idea to take away, 1-2 sentences' },
    sections: { type: 'ARRAY', items: { type: 'OBJECT', properties: { heading: { type: 'STRING' }, body: { type: 'STRING' } }, required: ['heading', 'body'] } },
    steps: { type: 'ARRAY', description: 'Optional: a step-by-step argument or process', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['title', 'text'] } },
    matrix: {
      type: 'OBJECT',
      description: 'Optional: a 2x2 or small grid, e.g. a payoff matrix',
      properties: {
        title: { type: 'STRING' }, row_label: { type: 'STRING' }, col_label: { type: 'STRING' },
        rows: { type: 'ARRAY', items: { type: 'STRING' } }, cols: { type: 'ARRAY', items: { type: 'STRING' } },
        cells: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } } },
        highlight_cell: { type: 'ARRAY', items: { type: 'OBJECT', properties: { row: { type: 'INTEGER' }, col: { type: 'INTEGER' }, kind: { type: 'STRING', enum: ['good', 'bad', 'equilibrium'] } }, required: ['row', 'col', 'kind'] } },
        caption: { type: 'STRING' },
      },
      required: ['title', 'row_label', 'col_label', 'rows', 'cols', 'cells', 'caption'],
    },
    cards: { type: 'ARRAY', description: 'Optional: 3-4 short real-world examples', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['title', 'text'] } },
    compare: {
      type: 'OBJECT',
      description: 'Optional: two or three positions side by side',
      properties: { title: { type: 'STRING' }, columns: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, points: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['title', 'points'] } } },
      required: ['title', 'columns'],
    },
    key_term: { type: 'OBJECT', properties: { term: { type: 'STRING' }, definition: { type: 'STRING' }, example: { type: 'STRING' } }, required: ['term', 'definition', 'example'] },
    next_teaser: { type: 'STRING' },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'intro', 'key_idea', 'sections', 'key_term', 'next_teaser', 'tags'],
};

export const buildLesson = async (ctx: BuildContext, series: { name: string; total: number }, part: SyllabusPart, syllabus: SyllabusPart[]): Promise<ModuleOut> => {
  const outline = syllabus.map(p => `${p.part}. ${p.title}: ${p.focus}`).join('\n');
  const l = await callGemini<LessonShape>(
    ctx.apiKey,
    `You write one chapter a day of a short course, for a 5-minute read (about 350-450 words of prose in total across intro and sections). ${STYLE} ${ACCURACY}
Make it visual where the idea is visual: use the optional matrix for payoffs or 2x2s, steps for an argument, cards for real-world examples, compare for rival positions. Use 1 to 3 of these, only where they genuinely help. Where natural, connect the idea to product management or business decisions, without forcing it.`,
    [text(`COURSE: ${series.name}\nOUTLINE:\n${outline}\n\nWrite chapter ${part.part}: "${part.title}" (focus: ${part.focus}). Assume the reader has done the earlier chapters.`)],
    LESSON_SCHEMA,
    0.5,
    CAREFUL_MODEL,
  );

  const blocks: Block[] = [{ type: 'markdown', text: l.intro }, { type: 'callout', tone: 'insight', title: 'The key idea', text: l.key_idea }];
  for (const s of l.sections) blocks.push({ type: 'markdown', text: `### ${s.heading}\n\n${s.body}` });
  if (l.matrix && l.matrix.rows.length && l.matrix.cols.length) {
    const hl = l.matrix.highlight_cell ?? [];
    blocks.push({
      type: 'matrix', title: l.matrix.title, rowLabel: l.matrix.row_label, colLabel: l.matrix.col_label, rows: l.matrix.rows, cols: l.matrix.cols,
      cells: l.matrix.rows.map((_, r) => l.matrix!.cols.map((__, c) => ({ text: l.matrix!.cells[r]?.[c] ?? '', highlight: hl.find(h => h.row === r && h.col === c)?.kind }))),
      caption: l.matrix.caption,
    });
  }
  if (l.steps?.length) blocks.push({ type: 'steps', steps: l.steps });
  if (l.compare?.columns?.length) blocks.push({ type: 'compare', title: l.compare.title, columns: l.compare.columns });
  blocks.push({ type: 'keyterm', term: l.key_term.term, definition: l.key_term.definition, example: l.key_term.example });
  if (l.cards?.length) blocks.push({ type: 'cards', title: 'Where it shows up', items: l.cards.slice(0, 4) });
  if (part.part < series.total) blocks.push({ type: 'callout', tone: 'insight', title: 'Next chapter', text: l.next_teaser });

  return {
    moduleKey: 'lesson',
    title: series.name,
    minutes: 5,
    content: {
      intro: `Chapter ${part.part} · ${l.title}`,
      tags: l.tags.slice(0, 3),
      series: { name: series.name, part: part.part, total: series.total },
      blocks,
      prompt: 'Lock it in.',
      responseType: 'fields',
      fields: [
        { id: 'summary', label: 'The core idea, in one line', rows: 1 },
        { id: 'example', label: 'Where this has shown up in your own life or work', rows: 2 },
      ],
    },
  };
};

interface HistoryShape {
  title: string;
  intro: string;
  timeline: { date: string; title: string; detail: string }[];
  people: { name: string; role: string; note: string }[];
  why_it_matters: string;
  debate?: string;
  next_teaser: string;
  tags: string[];
}

export const buildHistory = async (ctx: BuildContext, series: { name: string; total: number }, part: SyllabusPart, syllabus: SyllabusPart[]): Promise<ModuleOut> => {
  const outline = syllabus.map(p => `${p.part}. ${p.title}: ${p.focus}`).join('\n');
  const h = await callGemini<HistoryShape>(
    ctx.apiKey,
    `You write one episode a day of a history series, for a 5-minute read. ${STYLE} ${ACCURACY}
Tell it as a story with causes and consequences, not a list of facts. Use exact dates only when you are confident of them; otherwise give the month or year.`,
    [text(`SERIES: ${series.name}\nOUTLINE:\n${outline}\n\nWrite episode ${part.part}: "${part.title}" (focus: ${part.focus}). Assume the reader has done the earlier episodes.
Give: a 3-4 sentence intro that sets the scene; a timeline of 4-8 key events; 3-5 key people; why it still matters today; optionally one thing historians debate about it; and a one-line teaser for the next episode.`)],
    {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        intro: { type: 'STRING' },
        timeline: { type: 'ARRAY', items: { type: 'OBJECT', properties: { date: { type: 'STRING' }, title: { type: 'STRING' }, detail: { type: 'STRING' } }, required: ['date', 'title', 'detail'] } },
        people: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, role: { type: 'STRING' }, note: { type: 'STRING' } }, required: ['name', 'role', 'note'] } },
        why_it_matters: { type: 'STRING' },
        debate: { type: 'STRING' },
        next_teaser: { type: 'STRING' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['title', 'intro', 'timeline', 'people', 'why_it_matters', 'next_teaser', 'tags'],
    },
    0.4,
    CAREFUL_MODEL,
  );

  const blocks: Block[] = [
    { type: 'markdown', text: h.intro },
    { type: 'timeline', title: 'What happened', events: h.timeline.slice(0, 8) },
    { type: 'people', title: 'Key figures', people: h.people.slice(0, 5) },
    { type: 'callout', tone: 'insight', title: 'Why it still matters', text: h.why_it_matters },
  ];
  if (h.debate) blocks.push({ type: 'callout', tone: 'tip', title: 'What historians argue about', text: h.debate });
  if (part.part < series.total) blocks.push({ type: 'callout', tone: 'insight', title: 'Next episode', text: h.next_teaser });

  return {
    moduleKey: 'history',
    title: series.name,
    minutes: 5,
    content: {
      intro: `Episode ${part.part} · ${h.title}`,
      tags: h.tags.slice(0, 3),
      series: { name: series.name, part: part.part, total: series.total },
      blocks,
      prompt: 'Lock it in.',
      responseType: 'fields',
      fields: [
        { id: 'summary', label: 'What drove these events? One line.', rows: 1 },
        { id: 'remember', label: 'One thing from this episode you want to remember', rows: 2 },
      ],
    },
  };
};

// ── Numbers (every answer verified by the arithmetic evaluator) ───────────────

interface NumbersShape {
  theme: string;
  tags: string[];
  problems: {
    question: string;
    answer_expression: string;
    stated_answer: number;
    unit: string;
    tolerance: number;
    solution: string;
    bars?: { label: string; value: number; highlight: boolean }[];
    tree?: { id: string; parent: string; label: string; value: string; tone: 'good' | 'bad' | 'neutral' }[];
    visual_title?: string;
    visual_caption?: string;
  }[];
}

const treeFrom = (nodes: NonNullable<NumbersShape['problems'][number]['tree']>): TreeNode | null => {
  const build = (id: string, depth: number): TreeNode | null => {
    const n = nodes.find(x => x.id === id);
    if (!n || depth > 4) return null;
    const children = nodes.filter(x => x.parent === id).map(c => build(c.id, depth + 1)).filter((x): x is TreeNode => !!x);
    return { label: n.label, value: n.value || undefined, tone: n.tone, children: children.length ? children : undefined };
  };
  const root = nodes.find(n => !n.parent || !nodes.some(m => m.id === n.parent));
  return root ? build(root.id, 0) : null;
};

const NUMBER_TOPICS = [
  'A/B test results and statistical significance', 'base rates and conditional probability', 'expected value and decision making under risk',
  'Fermi estimation of a market size', 'unit economics: CAC, LTV and payback', 'compound growth and doubling time', 'percentages and percentage points traps',
  'funnel conversion maths', 'sample size and margin of error', 'retention and churn cohorts',
];

export const buildNumbers = async (ctx: BuildContext): Promise<ModuleOut> => {
  const dayIndex = Math.floor(new Date(`${ctx.date}T00:00:00Z`).getTime() / 86_400_000);
  const focus = [NUMBER_TOPICS[dayIndex % NUMBER_TOPICS.length], NUMBER_TOPICS[(dayIndex + 3) % NUMBER_TOPICS.length]];

  const ask = async (): Promise<NumbersProblem[]> => {
    const r = await callGemini<NumbersShape>(
      ctx.apiKey,
      `You write quantitative reasoning problems for a product manager: the kind of maths that comes up in metric reviews, PM interviews and real decisions. Medium difficulty: one or two steps, solvable in about a minute each with a calculator (estimation problems by hand).
For each problem give answer_expression: a plain arithmetic expression using only numbers, + - * / ^, parentheses and sqrt/ln/log10/exp/abs/round, that computes the answer exactly as asked (same units, e.g. percent as 8.8 not 0.088). stated_answer must equal it. tolerance: how far off still counts as right. The solution explains the reasoning step by step in markdown and names the common trap.
Add a visual where it helps: bars to compare two or three quantities, or a tree (nodes with id, parent id, label, value) to follow a population through branches. ${ACCURACY}`,
      [text(`Write 4 problems. Today's focus: ${focus.join('; ')}. Use realistic product or business settings. Avoid these recent themes: ${(ctx.recentTitles.numbers ?? []).join('; ') || 'none'}.`)],
      {
        type: 'OBJECT',
        properties: {
          theme: { type: 'STRING' },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
          problems: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                question: { type: 'STRING' },
                answer_expression: { type: 'STRING' },
                stated_answer: { type: 'NUMBER' },
                unit: { type: 'STRING' },
                tolerance: { type: 'NUMBER' },
                solution: { type: 'STRING' },
                bars: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, value: { type: 'NUMBER' }, highlight: { type: 'BOOLEAN' } }, required: ['label', 'value', 'highlight'] } },
                tree: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, parent: { type: 'STRING' }, label: { type: 'STRING' }, value: { type: 'STRING' }, tone: { type: 'STRING', enum: ['good', 'bad', 'neutral'] } }, required: ['id', 'parent', 'label', 'value', 'tone'] } },
                visual_title: { type: 'STRING' },
                visual_caption: { type: 'STRING' },
              },
              required: ['question', 'answer_expression', 'stated_answer', 'unit', 'tolerance', 'solution'],
            },
          },
        },
        required: ['theme', 'tags', 'problems'],
      },
      0.6,
      CAREFUL_MODEL, // better at maths; the calculator check still catches any slip
    );
    themeTags = { theme: r.theme, tags: r.tags };
    return r.problems
      .filter(p => checksOut(p.answer_expression, p.stated_answer, Math.max(p.tolerance, Math.abs(p.stated_answer) * 0.005)))
      .map(p => {
        const exact = evaluate(p.answer_expression);
        let visual: Block | undefined;
        if (p.tree?.length) {
          const root = treeFrom(p.tree);
          if (root) visual = { type: 'tree', title: p.visual_title, root, caption: p.visual_caption };
        } else if (p.bars?.length) {
          visual = { type: 'bars', title: p.visual_title, items: p.bars, caption: p.visual_caption };
        }
        // At least 0.5% of the answer, so a sensibly rounded answer is never marked wrong
        const tolerance = Math.max(p.tolerance, Math.abs(exact) * 0.005, 0.0001);
        return { question: p.question, answer: Number(exact.toFixed(4)), tolerance, unit: p.unit || undefined, solution: p.solution, visual };
      });
  };

  let themeTags = { theme: '', tags: [] as string[] };
  let verified = await ask();
  if (verified.length < 3) verified = [...verified, ...(await ask())];
  if (verified.length < 3) throw new Error(`Only ${verified.length} numbers problems passed verification`);

  return {
    moduleKey: 'numbers',
    title: 'Numbers',
    minutes: 5,
    content: {
      intro: themeTags.theme,
      tags: themeTags.tags.slice(0, 3),
      blocks: [{ type: 'markdown', text: 'Three problems. A calculator is fine, except for estimates. Each answer key was checked by a calculator, not just written by the model.' }],
      prompt: 'Answer all three.',
      responseType: 'numeric',
      problems: verified.slice(0, 3),
    },
  };
};

// ── Interview Rep ─────────────────────────────────────────────────────────────

const QUESTION_TYPES = ['behavioural', 'product sense', 'metrics', 'strategy', 'estimation', 'AI product', 'behavioural', 'execution'];
// Rotates separately from the type (7 vs 8, so the pairs keep changing); without it every question lands in his past industry
const QUESTION_DOMAINS = ['a consumer app', 'a two-sided marketplace', 'fintech or payments', 'B2B SaaS', 'e-commerce or retail', 'travel, mobility or delivery', 'health, education or media'];

export const buildInterviewRep = async (ctx: BuildContext): Promise<ModuleOut> => {
  const dayIndex = Math.floor(new Date(`${ctx.date}T00:00:00Z`).getTime() / 86_400_000);
  const qType = QUESTION_TYPES[dayIndex % QUESTION_TYPES.length];
  const domain = QUESTION_DOMAINS[dayIndex % QUESTION_DOMAINS.length];
  const r = await callGemini<{ question: string; competencies: string[]; what_they_test: string; rubric: string[]; structure_hint: string }>(
    ctx.apiKey,
    `You are an experienced PM interviewer at a tech company, preparing a candidate. Write one realistic interview question of the given type, the kind actually asked in PM and AI PM interviews in 2026 at the target level. Then explain what the interviewer is really testing and give a 6-point rubric of what a strong answer at this level contains. Do not write an answer.\n\n${TARGET_LEVEL}`,
    [text(`QUESTION TYPE: ${qType}\n${qType === 'behavioural' ? '' : `SET IT IN: ${domain} (a product he hasn't worked on, so he can't lean on his own industry)\n`}CANDIDATE BACKGROUND (data):\n${ctx.profile}\n\nAvoid these recent questions: ${(ctx.recentTitles.interview_rep ?? []).join(' | ') || 'none'}.`)],
    {
      type: 'OBJECT',
      properties: {
        question: { type: 'STRING' },
        competencies: { type: 'ARRAY', items: { type: 'STRING' } },
        what_they_test: { type: 'STRING' },
        rubric: { type: 'ARRAY', items: { type: 'STRING' } },
        structure_hint: { type: 'STRING', description: 'A framework name or structure for this type of answer, one sentence' },
      },
      required: ['question', 'competencies', 'what_they_test', 'rubric', 'structure_hint'],
    },
    0.8,
    FAST_MODEL,
  );
  return {
    moduleKey: 'interview_rep',
    title: 'Interview Rep',
    minutes: 10,
    content: {
      intro: `${qType[0].toUpperCase()}${qType.slice(1)} · ${r.competencies[0] ?? ''}`.replace(/ · $/, ''),
      tags: [qType, ...r.competencies].slice(0, 3),
      timerSeconds: qType === 'estimation' || qType === 'product sense' ? 300 : 150,
      blocks: [
        { type: 'callout', tone: 'insight', title: 'The question', text: `**"${r.question}"**` },
        { type: 'markdown', text: `**What they're really testing:** ${r.what_they_test}` },
        { type: 'rubric', title: 'What a strong answer has', items: r.rubric.slice(0, 6) },
        { type: 'callout', tone: 'tip', title: 'Structure', text: r.structure_hint },
      ],
      prompt: `Write your answer as you would say it. Use the timer: aim to finish ${qType === 'estimation' || qType === 'product sense' ? 'within 5 minutes' : 'under 2½ minutes'} when spoken.`,
      responseType: 'text',
    },
  };
};

// ── Think (built on today's news when possible) ──────────────────────────────

// Method steps and answer-field labels are fixed per type: when the model writes them, it tends to
// describe the answers to this particular claim. The model only writes the claim.
const THINK_TYPES = [
  {
    name: 'Assumption hunt', how: 'List the hidden assumptions the claim depends on, and the cheapest test for each.',
    steps: [
      { title: 'Write each assumption as a sentence', text: 'Something that would have to be true for the conclusion to follow.' },
      { title: 'Name the cheapest test', text: 'The evidence that would confirm or kill it, ideally within a week.' },
    ],
    fields: ['Assumption 1 → how to test it', 'Assumption 2 → how to test it', 'Assumption 3 → how to test it'],
  },
  {
    name: 'Steelman', how: 'Write the strongest possible case for the side you disagree with.',
    steps: [
      { title: 'Find the best version, not the easiest', text: 'Argue it the way its smartest supporter would.' },
      { title: 'Give it real evidence', text: 'What facts or experiences would make a reasonable person believe it?' },
      { title: 'Name your crux', text: 'What single thing would have to change for you to agree?' },
    ],
    fields: ['The strongest version of the other side', 'The evidence that would most support it', 'What it would take to change your mind'],
  },
  {
    name: 'Second-order effects', how: 'Trace what happens next, and what happens after that, for different groups.',
    steps: [
      { title: 'Start with the obvious effect', text: 'What happens immediately, to the people directly involved?' },
      { title: 'Ask "and then what?"', text: 'Follow each effect one more step. Incentives change behaviour.' },
      { title: 'Widen the circle', text: 'Who else is touched by this, a step or two removed?' },
    ],
    fields: ['First-order effect', 'What that causes next', 'Who is affected that nobody is talking about'],
  },
  {
    name: 'Pre-mortem', how: 'Imagine it failed a year from now. Write the most likely reasons why.',
    steps: [
      { title: 'Assume it already failed', text: "Don't ask whether it could fail. It did. Now explain why." },
      { title: 'Rank by likelihood, not drama', text: 'The boring reasons usually beat the spectacular ones.' },
      { title: 'Find the early warning sign', text: 'What would you have seen in month one if this reason was coming true?' },
    ],
    fields: ['Failure reason 1 → the early warning sign', 'Failure reason 2 → the early warning sign', 'Failure reason 3 → the early warning sign'],
  },
  {
    name: 'Spot the flaw', how: 'Find the reasoning errors (fallacies, bad comparisons, missing data) in the argument.',
    steps: [
      { title: 'Separate claims from conclusions', text: 'What is stated as fact, and what is inferred from it?' },
      { title: 'Test each step', text: 'Does each conclusion actually follow from what came before it?' },
      { title: "Ask what's missing", text: 'What would you need to know before acting on this?' },
    ],
    fields: ['Flaw 1 → why it matters', 'Flaw 2 → why it matters', 'What a sound version of the argument would need'],
  },
];

export const buildThink = async (ctx: BuildContext, headlines: string[]): Promise<ModuleOut> => {
  const dayIndex = Math.floor(new Date(`${ctx.date}T00:00:00Z`).getTime() / 86_400_000);
  const t = THINK_TYPES[dayIndex % THINK_TYPES.length];
  const r = await callGemini<{ title: string; author: string; role: string; claim: string; prompt: string }>(
    ctx.apiKey,
    `You design daily critical-thinking exercises for a product manager. The exercise type is fixed. Write a realistic claim or argument for him to work on: a short message someone might post at work, or a strong opinion from the industry. Base it on one of today's AI news items if any fits naturally; otherwise use a realistic product or business scenario. Make the claim plausible and confident, with real but non-obvious weaknesses. Do NOT reveal or hint at the answers anywhere. The prompt asks him to do the exercise on this claim without naming what to look for.`,
    [text(`EXERCISE TYPE: ${t.name}: ${t.how}\nTODAY'S NEWS (data):\n${headlines.join('\n') || '(none)'}\n\nAvoid these recent exercises: ${(ctx.recentTitles.think ?? []).join(' | ') || 'none'}.`)],
    {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        author: { type: 'STRING', description: 'A realistic fictional name' },
        role: { type: 'STRING' },
        claim: { type: 'STRING' },
        prompt: { type: 'STRING' },
      },
      required: ['title', 'author', 'role', 'claim', 'prompt'],
    },
    0.8,
    FAST_MODEL,
  );
  return {
    moduleKey: 'think',
    title: 'Think',
    minutes: 7,
    content: {
      intro: t.name,
      tags: [t.name],
      blocks: [
        { type: 'chat', messages: [{ author: r.author, role: r.role, text: r.claim }] },
        { type: 'steps', title: 'How to do it', steps: t.steps },
      ],
      prompt: r.prompt,
      responseType: 'fields',
      fields: t.fields.map((label, i) => ({ id: `f${i + 1}`, label, rows: 2 })),
    },
  };
};

// ── Weekend ───────────────────────────────────────────────────────────────────

export const buildMockInterview = async (ctx: BuildContext): Promise<ModuleOut> => {
  const r = await callGemini<{ intro: string; questions: { type: string; title: string; text: string }[] }>(
    ctx.apiKey,
    `You are an experienced PM interviewer running a 30-minute first-round interview for a PM or AI PM role in 2026. Write 5 questions in order: a short background question, a product sense design question, a metrics question that follows from it, a behavioural question, and an AI product judgement question. Make them realistic and specific.\n\n${TARGET_LEVEL}`,
    [text(`CANDIDATE BACKGROUND (data):\n${ctx.profile}`)],
    {
      type: 'OBJECT',
      properties: {
        intro: { type: 'STRING' },
        questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { type: { type: 'STRING' }, title: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['type', 'title', 'text'] } },
      },
      required: ['intro', 'questions'],
    },
    0.8,
    FAST_MODEL,
  );
  const qs = r.questions.slice(0, 5);
  return {
    moduleKey: 'mock_interview',
    title: 'Mock Interview',
    minutes: 30,
    content: {
      intro: r.intro,
      tags: ['Product sense', 'Metrics', 'Behavioural'],
      timerSeconds: 1800,
      blocks: [
        { type: 'callout', tone: 'tip', text: 'Treat it as real: answer each question as you would out loud, without notes.' },
        { type: 'steps', title: 'The interview', steps: qs.map(q => ({ title: q.title, text: q.text })) },
      ],
      prompt: 'Your answers',
      responseType: 'fields',
      fields: qs.map((q, i) => ({ id: `q${i + 1}`, label: `${i + 1} · ${q.title}`, rows: i === 1 ? 5 : 3 })),
    },
  };
};

export const buildTeardown = async (ctx: BuildContext): Promise<ModuleOut> => {
  const r = await callGemini<{ company: string; question: string; context: string; compare: { title: string; columns: { title: string; points: string[] }[] }; questions: string[]; tags: string[] }>(
    ctx.apiKey,
    `You set weekly product and business strategy teardowns for a PM preparing for interviews. Pick a well-known company or product decision with a clear, well-documented story (why X won, why Y failed, a pivotal strategic move). Give 3-4 sentences of factual context, a side-by-side comparison, and 4 analysis questions. Do not answer the questions. ${ACCURACY}`,
    [text(`Avoid these recent teardowns: ${(ctx.recentTitles.teardown ?? []).join(' | ') || 'none'}.`)],
    {
      type: 'OBJECT',
      properties: {
        company: { type: 'STRING' },
        question: { type: 'STRING', description: 'The teardown headline, e.g. Why did Canva win casual design?' },
        context: { type: 'STRING' },
        compare: { type: 'OBJECT', properties: { title: { type: 'STRING' }, columns: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, points: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['title', 'points'] } } }, required: ['title', 'columns'] },
        questions: { type: 'ARRAY', items: { type: 'STRING' } },
        tags: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['company', 'question', 'context', 'compare', 'questions', 'tags'],
    },
    0.7,
    CAREFUL_MODEL,
  );
  return {
    moduleKey: 'teardown',
    title: 'Teardown',
    minutes: 15,
    content: {
      intro: r.question,
      tags: r.tags.slice(0, 3),
      blocks: [{ type: 'markdown', text: r.context }, { type: 'compare', title: r.compare.title, columns: r.compare.columns.slice(0, 3) }],
      prompt: 'Work through it like a strategy interview.',
      responseType: 'fields',
      fields: r.questions.slice(0, 4).map((q, i) => ({ id: `q${i + 1}`, label: q, rows: 2 })),
    },
  };
};

export const CLOSE: ModuleOut = {
  moduleKey: 'close',
  title: 'Close',
  minutes: 1,
  content: {
    intro: 'Before you go',
    responseType: 'text',
    blocks: [{ type: 'markdown', text: "Pick one thing from today's session you will actually use." }],
    prompt: "One thing I'll use today:",
  },
};

// The Weekly Reviewer agent arrives in phase 4; until then the review is a structured reflection
export const WEEKLY_REVIEW: ModuleOut = {
  moduleKey: 'weekly_review',
  title: 'Weekly Review',
  minutes: 10,
  content: {
    intro: 'Look back, adjust, go again',
    responseType: 'fields',
    blocks: [{ type: 'markdown', text: 'Your week is charted above. Look at it, then answer honestly.' }],
    prompt: 'Your review',
    fields: [
      { id: 'easy', label: 'Which module felt easiest, and which did you dread?', rows: 2 },
      { id: 'surprise', label: 'Where did you get something wrong that surprised you?', rows: 2 },
      { id: 'change', label: 'One change for next week', rows: 1 },
    ],
  },
};
