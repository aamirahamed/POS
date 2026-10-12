import { BarChart3, BookOpen, Calculator, Landmark, Layers, Lightbulb, LucideIcon, Mic, Newspaper, RotateCcw, Sunrise, Users } from 'lucide-react';
import { ModuleKey } from './quest';

export interface ModuleMeta {
    label: string;
    icon: LucideIcon;
    hue: number; // drives the module's colour accents
    skill: 'Product' | 'AI' | 'Reasoning' | 'Numbers' | 'Knowledge' | 'Reflection';
}

export const MODULE_META: Record<ModuleKey, ModuleMeta> = {
    recall: { label: 'Recall', icon: RotateCcw, hue: 190, skill: 'Knowledge' },
    ai_briefing: { label: 'AI Briefing', icon: Newspaper, hue: 200, skill: 'AI' },
    interview_rep: { label: 'Interview Rep', icon: Mic, hue: 265, skill: 'Product' },
    think: { label: 'Think', icon: Lightbulb, hue: 40, skill: 'Reasoning' },
    numbers: { label: 'Numbers', icon: Calculator, hue: 150, skill: 'Numbers' },
    lesson: { label: 'Lesson', icon: BookOpen, hue: 235, skill: 'Knowledge' },
    history: { label: 'History', icon: Landmark, hue: 15, skill: 'Knowledge' },
    close: { label: 'Close', icon: Sunrise, hue: 320, skill: 'Reflection' },
    mock_interview: { label: 'Mock Interview', icon: Users, hue: 265, skill: 'Product' },
    weekly_review: { label: 'Weekly Review', icon: BarChart3, hue: 190, skill: 'Reflection' },
    teardown: { label: 'Teardown', icon: Layers, hue: 280, skill: 'Product' },
};

export const hsl = (hue: number, s = 70, l = 60, a = 1) => `hsla(${hue}, ${s}%, ${l}%, ${a})`;
