import { Compass, GraduationCap, LucideIcon, MessageCircle, SearchCheck } from 'lucide-react';
import { ModuleKey } from './quest';

export type HelperMode = 'coach' | 'tutor' | 'reflect' | 'review';

// Keep in sync with BASE_MODE in pos-app/supabase/functions/bg-coach/index.ts
const HELPER_MODE: Record<ModuleKey, Exclude<HelperMode, 'review'>> = {
    think: 'coach',
    numbers: 'coach',
    interview_rep: 'coach',
    mock_interview: 'coach',
    teardown: 'coach',
    recall: 'coach',
    lesson: 'tutor',
    history: 'tutor',
    ai_briefing: 'tutor',
    close: 'reflect',
    weekly_review: 'reflect',
};

// A finished exercise switches from coach to review: the answer is no longer off limits
export const helperModeFor = (moduleKey: ModuleKey, completed: boolean): HelperMode => {
    const base = HELPER_MODE[moduleKey];
    return base === 'coach' && completed ? 'review' : base;
};

export const HELPER_IDENTITY: Record<HelperMode, { name: string; tagline: string; icon: LucideIcon; intro: string }> = {
    coach: {
        name: 'Coach',
        tagline: 'Nudges you. Never answers for you.',
        icon: Compass,
        intro: 'Try it first. If you get stuck, ask anything: what a term means, how to approach it, or whether your draft is heading somewhere useful. The coach starts with the lightest hint and only goes further if you need it.',
    },
    tutor: {
        name: 'Tutor',
        tagline: 'Ask anything. Go as deep as you like.',
        icon: GraduationCap,
        intro: 'Curious about something you just read? Ask for a simpler explanation, more depth, what happened next, or where to read further. The one thing it won\'t do is write your "Lock it in" answer.',
    },
    reflect: {
        name: 'Reflect',
        tagline: 'Asks, listens. The words stay yours.',
        icon: MessageCircle,
        intro: 'Not sure what to write? Ask for a question to get you started, and it will help you sharpen what you say.',
    },
    review: {
        name: 'Review',
        tagline: "You've submitted, so nothing is off limits now.",
        icon: SearchCheck,
        intro: 'Ask what a strong answer looks like, what you missed, or to walk through the solution step by step.',
    },
};

export interface QuickAsk {
    label: string;
    text: string;
    needsDraft?: boolean;
}

const COACH_ASKS: QuickAsk[] = [
    { label: "I'm stuck", text: "I'm stuck. Give me a nudge." },
    { label: 'Explain the method', text: 'Explain a method I can use for this.' },
    { label: 'Show an example', text: 'Show me an example on a different problem.' },
    { label: 'Check my draft', text: 'Look at my draft so far. What is strong, and what kind of thing is missing?', needsDraft: true },
];

const QUICK_ASKS: Partial<Record<ModuleKey, QuickAsk[]>> = {
    numbers: [
        { label: "I'm stuck", text: "I'm stuck on these. Give me a nudge." },
        { label: 'Explain the concept', text: 'Explain the concept behind these problems, without solving them.' },
        { label: 'Similar example', text: 'Walk me through a similar problem with different numbers.' },
        { label: 'Check my approach', text: 'Here are my answers so far. Am I approaching them the right way?', needsDraft: true },
    ],
    interview_rep: [
        { label: 'What are they testing?', text: 'What is the interviewer really trying to learn with this question?' },
        { label: 'Which story fits?', text: 'Help me think about which of my experiences would fit this best.' },
        { label: 'Structure it', text: 'How should I structure an answer to this kind of question?' },
        { label: 'Check my draft', text: 'Look at my draft. What is strong, and what is missing?', needsDraft: true },
    ],
    lesson: [
        { label: 'Explain more simply', text: 'Explain the main idea more simply, with an everyday example.' },
        { label: 'Go deeper', text: 'Go deeper. What is the more advanced version of this idea?' },
        { label: 'Real-world case', text: 'Give me a famous real-world case of this.' },
        { label: 'For product work', text: 'How does this show up in product management or business decisions?' },
        { label: 'Read further', text: 'What should I read if I want to go further on this?' },
    ],
    history: [
        { label: 'Explain more', text: 'Tell me more about the most important moment in this episode.' },
        { label: 'Why it happened', text: 'What were the deeper causes behind this?' },
        { label: 'What came next?', text: 'What happened next, beyond this episode?' },
        { label: 'Why it matters today', text: 'How does this still shape the world today?' },
        { label: 'Read further', text: 'What is a good book or documentary on this?' },
    ],
    ai_briefing: [
        { label: 'Explain simply', text: 'Explain this more simply, as if to a smart non-engineer.' },
        { label: 'How it works', text: 'How does this actually work technically?' },
        { label: 'What can I build?', text: 'What product could I build with this?' },
        { label: 'Interview angle', text: 'How might this come up in an AI PM interview?' },
    ],
    close: [
        { label: 'Help me start', text: "I'm not sure what to write. Ask me a question to get started." },
    ],
    weekly_review: [
        { label: 'Help me reflect', text: 'Ask me a question to help me reflect on this week.' },
        { label: 'Challenge me', text: 'Push me on where I took it easy this week.' },
    ],
};

const REVIEW_ASKS: QuickAsk[] = [
    { label: 'What did I miss?', text: 'Looking at my submitted answer, what did I miss?' },
    { label: 'Strong answer', text: 'What does a strong answer to this contain?' },
    { label: 'Walk me through it', text: 'Walk me through the reasoning step by step.' },
];

export const quickAsksFor = (moduleKey: ModuleKey, mode: HelperMode): QuickAsk[] =>
    mode === 'review' ? REVIEW_ASKS : QUICK_ASKS[moduleKey] ?? COACH_ASKS;
