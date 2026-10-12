import { FC, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, CheckCircle2, ExternalLink, Lightbulb, Sparkles, Star } from 'lucide-react';
import { Block, NewsItem, TreeNode } from '../blocks';

export const Markdown: FC<{ children: string; className?: string }> = ({ children, className = '' }) => (
    <div className={`prose prose-invert prose-sm max-w-none prose-headings:text-text-primary prose-p:text-text-secondary prose-p:leading-relaxed prose-li:text-text-secondary prose-strong:text-text-primary prose-td:text-text-secondary prose-th:text-text-primary prose-blockquote:text-text-primary prose-blockquote:border-accent ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
);

// Inline markdown for short text inside blocks (bold, italics, links), without paragraph spacing
const Inline: FC<{ children: string }> = ({ children }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            p: ({ children: c }) => <>{c}</>,
            strong: ({ children: c }) => <strong className="text-text-primary font-semibold">{c}</strong>,
            a: ({ children: c, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-hover underline">{c}</a>,
        }}
    >
        {children}
    </ReactMarkdown>
);

const BlockTitle: FC<{ children: ReactNode }> = ({ children }) => (
    <div className="text-[11px] font-bold uppercase tracking-widest text-text-secondary/70 mb-3">{children}</div>
);

const TONE_TEXT = { good: 'text-emerald-300', bad: 'text-rose-300', neutral: 'text-text-primary' } as const;
const TONE_BORDER = {
    good: 'border-emerald-400/40 bg-emerald-400/10',
    bad: 'border-rose-400/40 bg-rose-400/10',
    neutral: 'border-border bg-surface-elevated',
} as const;

// ── Individual blocks ─────────────────────────────────────────────────────────

const Callout: FC<Extract<Block, { type: 'callout' }>> = ({ tone, title, text }) => {
    const styles = {
        insight: { box: 'border-accent/40 bg-accent/10', icon: <Sparkles size={16} className="text-accent shrink-0 mt-0.5" /> },
        tip: { box: 'border-emerald-400/30 bg-emerald-400/5', icon: <Lightbulb size={16} className="text-emerald-300 shrink-0 mt-0.5" /> },
        warning: { box: 'border-amber-300/40 bg-amber-300/10', icon: <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" /> },
    }[tone];
    return (
        <div className={`flex gap-3 rounded-2xl border p-4 ${styles.box}`}>
            {styles.icon}
            <div className="flex flex-col gap-1">
                {title && <div className="text-sm font-bold text-text-primary">{title}</div>}
                <Markdown>{text}</Markdown>
            </div>
        </div>
    );
};

const KeyTerm: FC<Extract<Block, { type: 'keyterm' }>> = ({ term, definition, example }) => (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-elevated to-surface p-5 flex gap-5 items-start">
        <div className="shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent">Key term</div>
            <div className="text-lg font-bold text-text-primary mt-1 max-w-[180px] leading-tight">{term}</div>
        </div>
        <div className="flex flex-col gap-2 border-l border-border pl-5">
            <Markdown>{definition}</Markdown>
            {example && <div className="text-xs text-text-secondary/80 italic">e.g. {example}</div>}
        </div>
    </div>
);

const Timeline: FC<Extract<Block, { type: 'timeline' }>> = ({ title, events }) => (
    <div>
        {title && <BlockTitle>{title}</BlockTitle>}
        <div className="relative pl-2">
            <div className="absolute left-[118px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/60 via-accent/30 to-transparent" />
            <div className="flex flex-col gap-4">
                {events.map((e, i) => (
                    <div key={i} className="grid grid-cols-[100px_24px_1fr] items-start gap-2">
                        <div className="text-xs font-bold text-accent text-right pt-0.5">{e.date}</div>
                        <div className="flex justify-center pt-1"><div className="w-3 h-3 rounded-full bg-background border-2 border-accent" /></div>
                        <div>
                            <div className="text-sm font-semibold text-text-primary">{e.title}</div>
                            {e.detail && <div className="text-xs text-text-secondary leading-relaxed mt-0.5"><Inline>{e.detail}</Inline></div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const People: FC<Extract<Block, { type: 'people' }>> = ({ title, people }) => (
    <div>
        {title && <BlockTitle>{title}</BlockTitle>}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {people.map(p => (
                <div key={p.name} className="rounded-xl border border-border bg-surface-elevated/60 p-3.5 flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                        {p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary">{p.name}</div>
                        <div className="text-[11px] text-accent/90">{p.role}</div>
                        {p.note && <div className="text-xs text-text-secondary mt-1 leading-snug"><Inline>{p.note}</Inline></div>}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const Matrix: FC<Extract<Block, { type: 'matrix' }>> = ({ title, rowLabel, colLabel, rows, cols, cells, caption }) => {
    const highlight = {
        good: 'bg-emerald-400/15 border-emerald-400/40 text-emerald-100',
        bad: 'bg-rose-400/10 border-rose-400/30 text-rose-100',
        equilibrium: 'bg-amber-300/15 border-amber-300/60 text-amber-100 ring-2 ring-amber-300/40',
    };
    return (
        <div>
            {title && <BlockTitle>{title}</BlockTitle>}
            <div className="inline-grid gap-2" style={{ gridTemplateColumns: `140px repeat(${cols.length}, minmax(150px, 1fr))` }}>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary/70 flex items-end pb-1">{rowLabel} ↓ · {colLabel} →</div>
                {cols.map(c => <div key={c} className="text-xs font-bold text-text-primary text-center pb-1">{c}</div>)}
                {rows.map((r, i) => [
                    <div key={`r-${r}`} className="text-xs font-bold text-text-primary flex items-center">{r}</div>,
                    ...cols.map((c, j) => {
                        const cell = cells[i]?.[j];
                        return (
                            <div key={`${r}-${c}`} className={`rounded-xl border p-3 text-center text-sm font-medium ${cell?.highlight ? highlight[cell.highlight] : 'border-border bg-surface-elevated text-text-secondary'}`}>
                                {cell?.text}
                                {cell?.highlight === 'equilibrium' && <div className="text-[10px] uppercase tracking-wider mt-1 opacity-80">Equilibrium</div>}
                            </div>
                        );
                    }),
                ])}
            </div>
            {caption && <div className="text-xs text-text-secondary mt-3">{caption}</div>}
        </div>
    );
};

export const Bars: FC<Extract<Block, { type: 'bars' }>> = ({ title, unit, items, caption }) => {
    const max = Math.max(...items.map(i => i.value), 0) || 1;
    return (
        <div>
            {title && <BlockTitle>{title}</BlockTitle>}
            <div className="flex flex-col gap-2.5">
                {items.map(item => (
                    <div key={item.label} className="grid grid-cols-[150px_1fr_70px] items-center gap-3">
                        <div className="text-xs text-text-secondary text-right truncate">{item.label}</div>
                        <div className="h-6 bg-background rounded-md overflow-hidden">
                            <div
                                className={`h-full rounded-md ${item.highlight ? 'bg-gradient-to-r from-accent to-indigo-300' : 'bg-surface-hover'}`}
                                style={{ width: `${(item.value / max) * 100}%` }}
                            />
                        </div>
                        <div className={`text-sm font-bold ${item.highlight ? 'text-text-primary' : 'text-text-secondary'}`}>{item.value.toLocaleString()}{unit ?? ''}</div>
                    </div>
                ))}
            </div>
            {caption && <div className="text-xs text-text-secondary mt-3">{caption}</div>}
        </div>
    );
};

const TreeBranch: FC<{ node: TreeNode }> = ({ node }) => (
    <div className="flex items-center">
        <div className={`rounded-xl border px-3 py-2 min-w-[130px] ${TONE_BORDER[node.tone ?? 'neutral']}`}>
            <div className={`text-xs font-semibold ${TONE_TEXT[node.tone ?? 'neutral']}`}>{node.label}</div>
            {node.value && <div className="text-base font-bold text-text-primary">{node.value}</div>}
            {node.note && <div className="text-[10px] text-text-secondary">{node.note}</div>}
        </div>
        {node.children && node.children.length > 0 && (
            <>
                <div className="w-6 h-px bg-border" />
                <div className="flex flex-col gap-3 border-l border-border pl-6 py-1">
                    {node.children.map((c, i) => <TreeBranch key={i} node={c} />)}
                </div>
            </>
        )}
    </div>
);

export const Tree: FC<Extract<Block, { type: 'tree' }>> = ({ title, root, caption }) => (
    <div>
        {title && <BlockTitle>{title}</BlockTitle>}
        <div className="overflow-x-auto pb-1"><TreeBranch node={root} /></div>
        {caption && <div className="text-xs text-text-secondary mt-3">{caption}</div>}
    </div>
);

const Cards: FC<Extract<Block, { type: 'cards' }>> = ({ title, items }) => (
    <div>
        {title && <BlockTitle>{title}</BlockTitle>}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {items.map(item => (
                <div key={item.title} className="rounded-xl border border-border bg-surface-elevated/60 p-3.5">
                    <div className="text-sm font-semibold text-text-primary">{item.title}</div>
                    <div className="text-xs text-text-secondary mt-1 leading-relaxed"><Inline>{item.text}</Inline></div>
                </div>
            ))}
        </div>
    </div>
);

const Steps: FC<Extract<Block, { type: 'steps' }>> = ({ title, steps }) => (
    <div>
        {title && <BlockTitle>{title}</BlockTitle>}
        <div className="flex flex-col gap-2.5">
            {steps.map((s, i) => (
                <div key={i} className="flex gap-3 items-start rounded-xl border border-border bg-surface-elevated/40 p-3.5">
                    <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                    <div>
                        <div className="text-sm font-semibold text-text-primary">{s.title}</div>
                        <div className="text-xs text-text-secondary mt-0.5 leading-relaxed"><Inline>{s.text}</Inline></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const Compare: FC<Extract<Block, { type: 'compare' }>> = ({ title, columns }) => (
    <div>
        {title && <BlockTitle>{title}</BlockTitle>}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map(col => (
                <div key={col.title} className={`rounded-xl border p-4 ${TONE_BORDER[col.tone ?? 'neutral']}`}>
                    <div className={`text-sm font-bold ${TONE_TEXT[col.tone ?? 'neutral']}`}>{col.title}</div>
                    <ul className="mt-2 flex flex-col gap-1.5">
                        {col.points.map(p => (
                            <li key={p} className="text-xs text-text-secondary leading-relaxed flex gap-1.5"><span className="text-text-secondary/50">•</span><span><Inline>{p}</Inline></span></li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    </div>
);

const CATEGORY_STYLE: Record<NewsItem['category'], string> = {
    model: 'text-sky-300 border-sky-300/30 bg-sky-300/10',
    research: 'text-violet-300 border-violet-300/30 bg-violet-300/10',
    product: 'text-emerald-300 border-emerald-300/30 bg-emerald-300/10',
    policy: 'text-amber-300 border-amber-300/30 bg-amber-300/10',
    industry: 'text-rose-300 border-rose-300/30 bg-rose-300/10',
};

const News: FC<Extract<Block, { type: 'news' }>> = ({ note, items }) => (
    <div className="flex flex-col gap-3">
        {note && <div className="text-xs text-amber-300/90">{note}</div>}
        {items.map(n => (
            <div key={n.headline} className="rounded-2xl border border-border bg-surface-elevated/50 overflow-hidden">
                <div className="flex items-start justify-between gap-4 px-5 pt-4">
                    <div>
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className={`px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${CATEGORY_STYLE[n.category]}`}>{n.category}</span>
                            <span className="text-text-secondary">{n.source}{n.date ? ` · ${n.date}` : ''}</span>
                        </div>
                        <div className="text-base font-bold text-text-primary mt-2 leading-snug">{n.headline}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex gap-0.5" title="Relevance to your goals">
                            {[1, 2, 3].map(i => <Star key={i} size={13} className={i <= n.relevance ? 'text-amber-300 fill-amber-300' : 'text-text-secondary/30'} />)}
                        </div>
                        {n.url && (
                            <a href={n.url} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1">
                                Source <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-border mt-4">
                    {[['What happened', n.what], ['Why it matters', n.why], ['Now buildable', n.buildable]].map(([label, text]) => (
                        <div key={label} className="bg-surface-elevated p-4">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-accent/90">{label}</div>
                            <div className="text-xs text-text-secondary mt-1.5 leading-relaxed"><Inline>{text}</Inline></div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const Stats: FC<Extract<Block, { type: 'stats' }>> = ({ items }) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-surface-elevated/50 p-4">
                <div className="text-2xl font-black text-text-primary">{s.value}</div>
                <div className="text-xs text-text-secondary mt-1">{s.label}</div>
            </div>
        ))}
    </div>
);

const Chat: FC<Extract<Block, { type: 'chat' }>> = ({ messages }) => (
    <div className="rounded-2xl border border-border bg-[#1a1d29] p-4 flex flex-col gap-3">
        {messages.map((m, i) => (
            <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/30 text-violet-200 text-xs font-bold flex items-center justify-center shrink-0">
                    {m.author.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                    <div className="text-sm"><span className="font-bold text-text-primary">{m.author}</span>{m.role && <span className="text-xs text-text-secondary ml-2">{m.role}</span>}</div>
                    <div className="text-sm text-text-secondary mt-0.5"><Inline>{m.text}</Inline></div>
                </div>
            </div>
        ))}
    </div>
);

const Rubric: FC<Extract<Block, { type: 'rubric' }>> = ({ title, items }) => (
    <div className="rounded-2xl border border-border bg-surface-elevated/40 p-4">
        {title && <BlockTitle>{title}</BlockTitle>}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {items.map(item => (
                <div key={item} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
                    <CheckCircle2 size={14} className="text-emerald-400/80 shrink-0 mt-0.5" /><span><Inline>{item}</Inline></span>
                </div>
            ))}
        </div>
    </div>
);

// ── Dispatcher ────────────────────────────────────────────────────────────────

export const BlockView: FC<{ block: Block }> = ({ block }) => {
    switch (block.type) {
        case 'markdown': return <Markdown>{block.text}</Markdown>;
        case 'callout': return <Callout {...block} />;
        case 'keyterm': return <KeyTerm {...block} />;
        case 'timeline': return <Timeline {...block} />;
        case 'people': return <People {...block} />;
        case 'matrix': return <Matrix {...block} />;
        case 'bars': return <Bars {...block} />;
        case 'tree': return <Tree {...block} />;
        case 'cards': return <Cards {...block} />;
        case 'steps': return <Steps {...block} />;
        case 'compare': return <Compare {...block} />;
        case 'news': return <News {...block} />;
        case 'stats': return <Stats {...block} />;
        case 'chat': return <Chat {...block} />;
        case 'rubric': return <Rubric {...block} />;
        default: return null; // unknown block types from a newer agent are skipped, not crashed on
    }
};

export const BlockList: FC<{ blocks: Block[] }> = ({ blocks }) => (
    <div className="flex flex-col gap-6">
        {blocks.map((b, i) => <BlockView key={i} block={b} />)}
    </div>
);

