// Placeholder sessions for phase 1, used until the Session Builder agent (phase 2) writes real ones.
// Every module ends with an output (docs/specs/BRAIN_GYM.md, "Design principles").

import { Block } from './blocks';
import { DayKind, ModuleKey } from './quest';

export interface NumbersProblem {
    question: string;
    answer: number;
    tolerance: number; // absolute
    unit?: string;
    solution: string; // markdown
    visual?: Block; // shown with the solution
}

export interface ResponseField {
    id: string;
    label: string;
    placeholder?: string;
    rows?: number;
}

export interface ModuleContent {
    sample?: boolean;
    sampleNote?: string;
    intro?: string; // one line under the title
    tags?: string[];
    series?: { name: string; part: number; total: number };
    blocks?: Block[];
    body?: string; // legacy markdown, rendered when there are no blocks
    prompt: string;
    responseType: 'text' | 'numeric' | 'fields';
    fields?: ResponseField[];
    problems?: NumbersProblem[];
    timerSeconds?: number; // target length for spoken-style answers
}

export interface ModuleTemplate {
    moduleKey: ModuleKey;
    title: string;
    minutes: number;
    content: ModuleContent;
}

const AI_BRIEFING: ModuleTemplate = {
    moduleKey: 'ai_briefing',
    title: 'AI Briefing',
    minutes: 7,
    content: {
        sample: true,
        sampleNote: 'Live news arrives with the News Curator agent (phase 2). The two cards below use past announcements to show the format.',
        intro: 'Explainer: why "evals" became a core PM skill',
        tags: ['Evals', 'AI quality'],
        responseType: 'text',
        blocks: [
            {
                type: 'news',
                items: [
                    {
                        headline: 'Anthropic open-sources the Model Context Protocol (MCP)',
                        source: 'Anthropic',
                        date: 'Nov 2024',
                        category: 'product',
                        what: 'An open standard for connecting AI assistants to tools and data sources, with SDKs and reference servers.',
                        why: 'Integrations stop being one-off work per model. A tool built once can be used by any assistant that speaks MCP.',
                        buildable: 'Products that expose their own capabilities to any AI client, as POS does with its own MCP server.',
                        relevance: 3,
                    },
                    {
                        headline: 'OpenAI releases o1, a model that reasons before answering',
                        source: 'OpenAI',
                        date: 'Sep 2024',
                        category: 'model',
                        what: 'A model trained to spend extra compute thinking through a problem step by step before responding.',
                        why: 'Quality became tunable by "thinking time", trading latency and cost for accuracy on hard problems.',
                        buildable: 'Features where a slower, more careful answer is worth it: analysis, planning, code review.',
                        relevance: 2,
                    },
                ],
            },
            {
                type: 'callout',
                tone: 'insight',
                title: 'The core idea',
                text: 'Normal software is deterministic, so a test passes or fails. A language model always returns *something*, and deciding whether it is **good enough** is a product judgement. An **eval** is how you make that judgement repeatable.',
            },
            {
                type: 'compare',
                title: 'Three ways to grade an AI answer',
                columns: [
                    { title: 'Exact match', tone: 'neutral', points: ['Compare to a known right answer', 'Cheap, fast, fully reliable', 'Only works for structured outputs'] },
                    { title: 'LLM-as-judge', tone: 'neutral', points: ['A stronger model scores against a rubric', 'Scales to open-ended answers', 'Biased toward longer answers: calibrate it'] },
                    { title: 'Human review', tone: 'neutral', points: ['People grade a sample', 'The ground truth the others are checked against', 'Slow and expensive'] },
                ],
            },
            {
                type: 'keyterm',
                term: 'Context window',
                definition: 'How much text a model can consider at once: prompt, documents and conversation together. Bigger windows can replace some retrieval engineering, but cost and latency grow with every token sent.',
                example: 'pasting a 200-page contract into one request instead of searching it in chunks',
            },
        ],
        prompt: 'So what for a PM? You own an AI support assistant. Name two things you would put in its first eval set, and why.',
    },
};

const INTERVIEW_REP: ModuleTemplate = {
    moduleKey: 'interview_rep',
    title: 'Interview Rep',
    minutes: 10,
    content: {
        sample: true,
        sampleNote: 'Phase 3 adds spoken answers, scoring against this rubric, your answer rewritten better, and a redo.',
        intro: 'Behavioural · Customer insight',
        tags: ['Behavioural', 'Customer obsession', 'Influence'],
        responseType: 'text',
        timerSeconds: 150,
        blocks: [
            { type: 'callout', tone: 'insight', title: 'The question', text: '**"Tell me about a time you used customer evidence to change your team\'s mind."**' },
            {
                type: 'rubric',
                title: 'What a strong answer has',
                items: [
                    'Situation and stakes in two sentences',
                    'What the team believed, and why it was reasonable',
                    'The evidence *you* gathered: say "I", not "we"',
                    'How you put it in front of people',
                    'A result with a number',
                    'What changed in how the team worked afterwards',
                ],
            },
            {
                type: 'cards',
                title: 'Stories from your bank that could fit',
                items: [
                    { title: 'Flash Approval', text: '100+ user calls settled an argument the dashboard couldn\'t.' },
                    { title: 'Community Hub', text: 'A design sprint killed the features the team was sure about.' },
                    { title: 'NPS Programme', text: 'Turning open-ended feedback into roadmap calls each quarter.' },
                ],
            },
        ],
        prompt: 'Write your answer as you would say it, about 250–300 words. Use the timer: a spoken version should land under 2½ minutes.',
    },
};

const THINK: ModuleTemplate = {
    moduleKey: 'think',
    title: 'Think',
    minutes: 7,
    content: {
        sample: true,
        intro: 'Assumption hunt',
        tags: ['Assumptions', 'Evidence'],
        responseType: 'fields',
        blocks: [
            {
                type: 'chat',
                messages: [{ author: 'Priya Shah', role: 'Head of Product', text: 'Our AI support chatbot cut tickets by 40% in its first month. We should roll it out to every product line next quarter. 🚀' }],
            },
            {
                type: 'steps',
                title: 'How to hunt',
                steps: [
                    { title: 'Write each assumption as a sentence', text: 'Something that would have to be true for the conclusion to follow.' },
                    { title: 'Name the cheapest test', text: 'The evidence that would confirm or kill it, ideally within a week.' },
                ],
            },
        ],
        prompt: 'Find three hidden assumptions, each with the evidence that would test it.',
        fields: [
            { id: 'a1', label: 'Assumption 1 → how to test it', rows: 2 },
            { id: 'a2', label: 'Assumption 2 → how to test it', rows: 2 },
            { id: 'a3', label: 'Assumption 3 → how to test it', rows: 2 },
        ],
    },
};

const NUMBERS: ModuleTemplate = {
    moduleKey: 'numbers',
    title: 'Numbers',
    minutes: 5,
    content: {
        sample: true,
        intro: 'Lift, base rates and expected value',
        tags: ['A/B tests', 'Probability', 'Decisions'],
        responseType: 'numeric',
        blocks: [{ type: 'markdown', text: 'Three problems. A calculator is fine. Each solution comes with a picture of what is going on.' }],
        prompt: 'Answer all three.',
        problems: [
            {
                question: 'An A/B test: control converts 4.0% of 10,000 users, the variant converts 4.4% of 10,000. What is the **relative lift** of the variant, in percent?',
                answer: 10,
                tolerance: 0.1,
                unit: '%',
                solution: 'Relative lift = (4.4 − 4.0) / 4.0 = **10%**. The *absolute* lift is only 0.4 percentage points. Mixing the two up is one of the most common errors in metric reviews.',
                visual: {
                    type: 'bars',
                    unit: '%',
                    items: [
                        { label: 'Control', value: 4.0 },
                        { label: 'Variant', value: 4.4, highlight: true },
                    ],
                    caption: 'A 0.4-point gap looks small on the chart, yet it is a 10% relative lift.',
                },
            },
            {
                question: '1% of transactions are fraudulent. A detector flags 95% of fraud, and also wrongly flags 10% of legitimate transactions. If a transaction is flagged, what is the chance it is actually fraud, in percent (one decimal)?',
                answer: 8.8,
                tolerance: 0.3,
                unit: '%',
                solution: 'Flagged = 95 fraud + 990 legitimate = 1,085. Chance a flag is real fraud = 95 / 1,085 ≈ **8.8%**. A "95% accurate" detector is wrong about 91% of the time it fires, because fraud is rare. That is the base-rate trap.',
                visual: {
                    type: 'tree',
                    title: 'Follow 10,000 transactions',
                    root: {
                        label: 'All transactions',
                        value: '10,000',
                        children: [
                            {
                                label: 'Fraud (1%)',
                                value: '100',
                                children: [
                                    { label: 'Flagged', value: '95', tone: 'good' },
                                    { label: 'Missed', value: '5', tone: 'neutral' },
                                ],
                            },
                            {
                                label: 'Legitimate (99%)',
                                value: '9,900',
                                children: [
                                    { label: 'Wrongly flagged', value: '990', tone: 'bad' },
                                    { label: 'Cleared', value: '8,910', tone: 'neutral' },
                                ],
                            },
                        ],
                    },
                    caption: 'Of 1,085 flags, only 95 are fraud. The 990 false alarms come from the much bigger legitimate group.',
                },
            },
            {
                question: 'Feature A has a 30% chance of adding $500k a year. Feature B has a 70% chance of adding $180k a year. What is the **expected value of A**, in $k?',
                answer: 150,
                tolerance: 0.5,
                unit: '$k',
                solution: 'EV(A) = 0.3 × 500 = **$150k**; EV(B) = 0.7 × 180 = $126k. A wins on expected value, but B is far less likely to deliver nothing. Which you pick depends on how much a zero hurts this quarter.',
                visual: {
                    type: 'tree',
                    title: 'The decision',
                    root: {
                        label: 'Which feature?',
                        children: [
                            {
                                label: 'Feature A',
                                value: 'EV $150k',
                                tone: 'good',
                                children: [
                                    { label: '30% · works', value: '$500k' },
                                    { label: '70% · flops', value: '$0', tone: 'bad' },
                                ],
                            },
                            {
                                label: 'Feature B',
                                value: 'EV $126k',
                                children: [
                                    { label: '70% · works', value: '$180k' },
                                    { label: '30% · flops', value: '$0', tone: 'bad' },
                                ],
                            },
                        ],
                    },
                },
            },
        ],
    },
};

const LESSON: ModuleTemplate = {
    moduleKey: 'lesson',
    title: 'Game Theory',
    minutes: 5,
    content: {
        sample: true,
        intro: "Chapter 1 · The Prisoner's Dilemma",
        tags: ['Nash equilibrium', 'Incentives'],
        series: { name: 'Game Theory', part: 1, total: 8 },
        responseType: 'fields',
        blocks: [
            {
                type: 'markdown',
                text: 'Two people are arrested and questioned in separate rooms. Each can **stay silent** or **betray** the other. Neither knows what the other will choose.',
            },
            {
                type: 'matrix',
                title: 'Years in prison: (you, them)',
                rowLabel: 'You',
                colLabel: 'Them',
                rows: ['Stay silent', 'Betray'],
                cols: ['Stay silent', 'Betray'],
                cells: [
                    [{ text: '1, 1', highlight: 'good' }, { text: '10, 0', highlight: 'bad' }],
                    [{ text: '0, 10', highlight: 'bad' }, { text: '5, 5', highlight: 'equilibrium' }],
                ],
                caption: 'Both staying silent (1 year each) is best together. Both betraying (5 each) is where rational players end up.',
            },
            {
                type: 'steps',
                title: 'Why both betray',
                steps: [
                    { title: 'If they stay silent', text: 'Betraying gets you 0 years instead of 1. Betray.' },
                    { title: 'If they betray', text: 'Betraying gets you 5 years instead of 10. Betray.' },
                    { title: 'Same logic for them', text: 'So both betray and get 5 years, though silence would have given each of them 1.' },
                ],
            },
            {
                type: 'keyterm',
                term: 'Nash equilibrium',
                definition: 'An outcome where no player can do better by changing only their own move. It is stable, but it is not necessarily good for anyone.',
                example: 'both prisoners betraying',
            },
            {
                type: 'cards',
                title: 'Where it shows up',
                items: [
                    { title: 'Price wars', text: 'Every airline cuts fares; all of them lose margin.' },
                    { title: 'Ad arms races', text: 'Rivals outspend each other just to stay level.' },
                    { title: 'Budget season', text: 'Teams hoard headcount because others will.' },
                    { title: 'Marketplaces', text: 'Buyers and sellers each wait for the other side to commit.' },
                ],
            },
            {
                type: 'callout',
                tone: 'insight',
                title: 'Next chapter',
                text: 'The dilemma assumes you play once. Chapter 2 is about what changes when the game repeats: where trust, reputation and cooperation come from.',
            },
        ],
        prompt: 'Lock it in.',
        fields: [
            { id: 'summary', label: 'The core idea, in one line', rows: 1 },
            { id: 'example', label: 'Where this showed up in your own work', rows: 2 },
        ],
    },
};

const HISTORY: ModuleTemplate = {
    moduleKey: 'history',
    title: 'The Cold War',
    minutes: 5,
    content: {
        sample: true,
        intro: 'Episode 1 · From allies to rivals, 1945–1947',
        tags: ['Containment', 'Post-war Europe'],
        series: { name: 'The Cold War', part: 1, total: 8 },
        responseType: 'fields',
        blocks: [
            {
                type: 'markdown',
                text: 'In 1945 the US, Britain and the Soviet Union had just defeated Nazi Germany together. Within two years they had split Europe in two, without a shot fired between them. That is what made the war "cold".',
            },
            {
                type: 'timeline',
                title: 'How the alliance came apart',
                events: [
                    { date: 'Feb 1945', title: 'Yalta conference', detail: 'Roosevelt, Churchill and Stalin plan the post-war world. Stalin wants a buffer of friendly states; the West wants free elections in Eastern Europe.' },
                    { date: 'Apr 1945', title: 'Roosevelt dies', detail: 'Truman, more suspicious of Moscow, becomes president.' },
                    { date: 'Jul 1945', title: 'Potsdam conference', detail: 'Soviet-backed governments are taking hold in Poland, Romania and Bulgaria.' },
                    { date: 'Feb 1946', title: 'The Long Telegram', detail: 'Kennan argues Soviet expansion can be stopped by firm, patient resistance: the idea of containment.' },
                    { date: 'Mar 1946', title: '"Iron curtain" speech', detail: 'Churchill, in Missouri, says a curtain has descended across Europe.' },
                    { date: 'Mar 1947', title: 'Truman Doctrine', detail: 'The US promises support to countries resisting communist pressure, starting with Greece and Turkey.' },
                    { date: 'Jun 1947', title: 'Marshall Plan announced', detail: 'Billions offered to rebuild Europe. Moscow refuses it and keeps its satellites out.' },
                ],
            },
            {
                type: 'people',
                title: 'Key figures',
                people: [
                    { name: 'Joseph Stalin', role: 'Soviet leader', note: 'Lost tens of millions in the war; wanted Eastern Europe as a buffer.' },
                    { name: 'Harry Truman', role: 'US President from Apr 1945', note: 'Took a harder line than Roosevelt.' },
                    { name: 'Winston Churchill', role: 'British PM, then opposition leader', note: 'Named the "iron curtain".' },
                    { name: 'George Kennan', role: 'US diplomat in Moscow', note: 'Author of containment.' },
                    { name: 'George Marshall', role: 'US Secretary of State', note: 'Economic aid as the answer to communism.' },
                ],
            },
            {
                type: 'callout',
                tone: 'insight',
                title: 'Next episode',
                text: 'Berlin, 1948: the first crisis, and an airlift that ran for almost a year.',
            },
        ],
        prompt: 'Lock it in.',
        fields: [
            { id: 'summary', label: 'Why did the alliance break down so fast? One line.', rows: 1 },
            { id: 'remember', label: 'One thing from this episode you want to remember', rows: 2 },
        ],
    },
};

const CLOSE: ModuleTemplate = {
    moduleKey: 'close',
    title: 'Close',
    minutes: 1,
    content: {
        intro: 'Before you go',
        responseType: 'text',
        blocks: [{ type: 'markdown', text: 'Pick one thing from today\'s session you will actually use.' }],
        prompt: 'One thing I\'ll use today:',
    },
};

const MOCK_INTERVIEW: ModuleTemplate = {
    moduleKey: 'mock_interview',
    title: 'Mock Interview',
    minutes: 30,
    content: {
        sample: true,
        sampleNote: 'In phase 3 the Interviewer agent runs this live, with follow-up questions, and the Coach debriefs you.',
        intro: 'First-round PM interview · 5 questions',
        tags: ['Product sense', 'Metrics', 'Behavioural'],
        responseType: 'fields',
        timerSeconds: 1800,
        blocks: [
            { type: 'callout', tone: 'tip', text: 'Treat it as real: answer each question as you would out loud, without notes.' },
            {
                type: 'steps',
                title: 'The interview',
                steps: [
                    { title: 'Background', text: 'Walk me through your background. Two minutes, max.' },
                    { title: 'Product sense', text: 'Design a product to help international students in Melbourne find part-time work. Who is it for, what is the core problem, what would you build first?' },
                    { title: 'Metrics', text: 'You launch it. What is your north-star metric, and what would worry you in week two?' },
                    { title: 'Behavioural', text: 'Tell me about a decision you made with incomplete data.' },
                    { title: 'Your question', text: 'What would you ask the interviewer?' },
                ],
            },
        ],
        prompt: 'Your answers',
        fields: [
            { id: 'q1', label: '1 · Background', rows: 3 },
            { id: 'q2', label: '2 · Product sense', rows: 5 },
            { id: 'q3', label: '3 · Metrics', rows: 3 },
            { id: 'q4', label: '4 · Behavioural', rows: 4 },
            { id: 'q5', label: '5 · Your question', rows: 1 },
        ],
    },
};

const WEEKLY_REVIEW: ModuleTemplate = {
    moduleKey: 'weekly_review',
    title: 'Weekly Review',
    minutes: 10,
    content: {
        sample: true,
        sampleNote: 'In phase 4 the Weekly Reviewer agent writes this from your scores and adjusts next week.',
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

const TEARDOWN: ModuleTemplate = {
    moduleKey: 'teardown',
    title: 'Teardown',
    minutes: 15,
    content: {
        sample: true,
        intro: 'Why did Canva win casual design?',
        tags: ['Strategy', 'Disruption', 'Moats'],
        responseType: 'fields',
        blocks: [
            {
                type: 'markdown',
                text: 'Canva, founded in Perth in 2012, became the default design tool for people who are not designers, in a market Adobe had owned for decades.',
            },
            {
                type: 'compare',
                title: 'The two approaches',
                columns: [
                    { title: 'Incumbent (pro tools)', tone: 'neutral', points: ['Built for trained designers', 'Powerful, deep, steep learning curve', 'Priced for professionals'] },
                    { title: 'Canva', tone: 'good', points: ['Built for everyone else', 'Templates first, browser-based', 'Free tier, then team plans'] },
                ],
            },
        ],
        prompt: 'Work through it like a strategy interview.',
        fields: [
            { id: 'who', label: 'Who was underserved, and why didn\'t the incumbent care?', rows: 2 },
            { id: 'easy', label: 'What did Canva make easy that used to be hard?', rows: 2 },
            { id: 'moat', label: 'What is the moat now?', rows: 2 },
            { id: 'worry', label: 'What would worry you if you ran Canva today, given AI design tools?', rows: 2 },
        ],
    },
};

export const templatesFor = (kind: DayKind): ModuleTemplate[] => {
    if (kind === 'saturday') return [MOCK_INTERVIEW, CLOSE];
    if (kind === 'sunday') return [WEEKLY_REVIEW, TEARDOWN, CLOSE];
    return [AI_BRIEFING, INTERVIEW_REP, THINK, NUMBERS, LESSON, HISTORY, CLOSE];
};
