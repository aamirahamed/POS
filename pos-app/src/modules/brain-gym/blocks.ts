// Content blocks for Brain Gym modules. Sample content uses them now; in phase 2 the Session Builder
// agent writes the same JSON, so every block type here is also part of the agent's output contract.

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
    relevance: 1 | 2 | 3; // to Aamir's PM goals
}

export type Block =
    | { type: 'markdown'; text: string }
    | { type: 'callout'; tone: 'insight' | 'tip' | 'warning'; title?: string; text: string }
    | { type: 'keyterm'; term: string; definition: string; example?: string }
    | { type: 'timeline'; title?: string; events: { date: string; title: string; detail?: string }[] }
    | { type: 'people'; title?: string; people: { name: string; role: string; note?: string }[] }
    | {
        type: 'matrix';
        title?: string;
        rowLabel: string;
        colLabel: string;
        rows: string[];
        cols: string[];
        cells: { text: string; highlight?: 'good' | 'bad' | 'equilibrium' }[][];
        caption?: string;
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
