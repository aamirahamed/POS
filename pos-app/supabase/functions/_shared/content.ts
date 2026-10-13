// The module content contract the Session Builder writes and the app renders.
// Keep in sync with pos-app/src/modules/brain-gym/blocks.ts and sampleContent.ts (ModuleContent).

export interface TreeNode {
  label: string;
  value?: string;
  note?: string;
  tone?: 'good' | 'bad' | 'neutral';
  children?: TreeNode[];
}

export interface NewsItem {
  headline: string;
  source: string;
  date?: string;
  category: 'model' | 'research' | 'product' | 'policy' | 'industry';
  url?: string;
  what: string;
  why: string;
  buildable: string;
  relevance: 1 | 2 | 3;
}

export type Block =
  | { type: 'markdown'; text: string }
  | { type: 'callout'; tone: 'insight' | 'tip' | 'warning'; title?: string; text: string }
  | { type: 'keyterm'; term: string; definition: string; example?: string }
  | { type: 'timeline'; title?: string; events: { date: string; title: string; detail?: string }[] }
  | { type: 'people'; title?: string; people: { name: string; role: string; note?: string }[] }
  | {
    type: 'matrix'; title?: string; rowLabel: string; colLabel: string; rows: string[]; cols: string[];
    cells: { text: string; highlight?: 'good' | 'bad' | 'equilibrium' }[][]; caption?: string;
  }
  | { type: 'bars'; title?: string; unit?: string; items: { label: string; value: number; highlight?: boolean }[]; caption?: string }
  | { type: 'tree'; title?: string; root: TreeNode; caption?: string }
  | { type: 'cards'; title?: string; items: { title: string; text: string }[] }
  | { type: 'steps'; title?: string; steps: { title: string; text: string }[] }
  | { type: 'compare'; title?: string; columns: { title: string; tone?: 'good' | 'bad' | 'neutral'; points: string[] }[] }
  | { type: 'news'; note?: string; items: NewsItem[] }
  | { type: 'stats'; items: { value: string; label: string }[] }
  | { type: 'chat'; messages: { author: string; role?: string; text: string }[] }
  | { type: 'rubric'; title?: string; items: string[] };

export interface NumbersProblem {
  question: string;
  answer: number;
  tolerance: number;
  unit?: string;
  solution: string;
  visual?: Block;
}

export interface ModuleContent {
  sample?: boolean;
  sampleNote?: string;
  intro?: string;
  tags?: string[];
  series?: { name: string; part: number; total: number };
  blocks?: Block[];
  prompt: string;
  responseType: 'text' | 'numeric' | 'fields';
  fields?: { id: string; label: string; placeholder?: string; rows?: number }[];
  problems?: NumbersProblem[];
  timerSeconds?: number;
  sources?: { title: string; url: string }[]; // where a module's facts came from (news)
}

export type ModuleKey =
  | 'recall' | 'ai_briefing' | 'interview_rep' | 'think' | 'numbers' | 'lesson' | 'history' | 'close'
  | 'mock_interview' | 'weekly_review' | 'teardown';

export interface ModuleOut {
  moduleKey: ModuleKey;
  title: string;
  minutes: number;
  content: ModuleContent;
}
