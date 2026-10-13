// News Curator: gathers the last ~day of AI news from feeds and Google Search, then writes the
// AI Briefing module. Every story it publishes must link to a URL it actually fetched or found.

import { callGemini, callGeminiWithSearch, CAREFUL_MODEL } from '../_shared/gemini.ts';
import { Block, ModuleOut, NewsItem } from '../_shared/content.ts';

const FEEDS: { source: string; url: string }[] = [
  { source: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { source: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
  { source: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
  { source: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  { source: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
  { source: 'Latent Space', url: 'https://www.latent.space/feed' },
  { source: 'Import AI', url: 'https://importai.substack.com/feed' },
  { source: 'Interconnects', url: 'https://www.interconnects.ai/feed' },
  { source: "Ben's Bites", url: 'https://www.bensbites.com/feed' },
];

// Search results are only used from reputable outlets and the companies' own sites. Aggregators and
// content farms repeat rumours as fact; a short briefing beats a confidently wrong one.
const REPUTABLE_DOMAINS = [
  // companies and research
  'anthropic.com', 'openai.com', 'meta.com', 'fb.com', 'microsoft.com', 'mistral.ai', 'x.ai', 'blog.google', 'deepmind.google', 'google.com',
  'nvidia.com', 'apple.com', 'amazon.com', 'aws.amazon.com', 'huggingface.co', 'arxiv.org', 'github.com', 'deepseek.com', 'qwenlm.github.io',
  // news
  'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'nytimes.com', 'theguardian.com', 'bbc.com', 'bbc.co.uk', 'cnbc.com', 'axios.com',
  'theverge.com', 'techcrunch.com', 'wired.com', 'arstechnica.com', 'theinformation.com', 'semafor.com', 'venturebeat.com', 'technologyreview.com',
  'theregister.com', 'zdnet.com', 'engadget.com', 'fortune.com', 'businessinsider.com', 'apnews.com', 'economist.com', 'afr.com', 'abc.net.au',
  'platformer.news', '404media.co', 'simonwillison.net', 'latent.space', 'interconnects.ai',
];

export const isReputable = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return REPUTABLE_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

// Labs without a usable feed, covered by Google Search instead
const SEARCH_LABS = ['Anthropic', 'Meta AI', 'Microsoft AI', 'Mistral', 'xAI', 'Google Gemini', 'OpenAI'];

export interface Candidate {
  source: string;
  title: string;
  url: string;
  published?: string;
  summary: string;
}

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1];

// Minimal RSS 2.0 / Atom parser: title, link, date and a short summary per item
export const parseFeed = (xml: string, source: string): Candidate[] => {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map(b => {
    const atomLink = b.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ?? b.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const link = decode(tag(b, 'link') ?? '') || atomLink || '';
    const date = tag(b, 'pubDate') ?? tag(b, 'published') ?? tag(b, 'updated') ?? tag(b, 'dc:date');
    const summary = decode(tag(b, 'description') ?? tag(b, 'summary') ?? tag(b, 'content') ?? '').slice(0, 500);
    return { source, title: decode(tag(b, 'title') ?? ''), url: link.trim(), published: date ? new Date(decode(date)).toISOString() : undefined, summary };
  }).filter(c => c.title && c.url.startsWith('http'));
};

const fetchFeed = async (feed: { source: string; url: string }): Promise<Candidate[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(feed.url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (POS Brain Gym news curator)' } });
    if (!res.ok) return [];
    return parseFeed(await res.text(), feed.source);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
};

const resolveRedirect = async (url: string): Promise<string> => {
  if (!url.includes('grounding-api-redirect')) return url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(url, { redirect: 'manual', signal: controller.signal });
    return res.headers.get('location') ?? url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
};

export const gatherCandidates = async (apiKey: string, now: Date, usedUrls: Set<string>) => {
  const since = new Date(now.getTime() - 40 * 3_600_000); // a little over a day, so nothing falls in a gap
  const feedResults = await Promise.all(FEEDS.map(fetchFeed));
  const fromFeeds = feedResults.flatMap(items =>
    items
      .filter(c => !usedUrls.has(c.url) && (!c.published || new Date(c.published) >= since))
      .sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''))
      .slice(0, 6), // keep a prolific blog from drowning out the labs
  );

  let searchText = '';
  let searchSources: { title: string; url: string }[] = [];
  try {
    const sinceStr = since.toISOString().slice(0, 10);
    const grounded = await callGeminiWithSearch(
      apiKey,
      `Find AI announcements and major AI news published on or after ${sinceStr}. Cover: ${SEARCH_LABS.join(', ')}, plus any other major AI model, product, research or policy story widely discussed in that window (including on X/Twitter).
For each item give: the company or source, what was announced, the publication date, and why it is significant. Only include items you actually found in search results dated within the window. Prefer the company's own announcement or major outlets (Reuters, Bloomberg, The Verge, TechCrunch, the FT). Ignore aggregator and content-farm sites. If there is nothing new for a company, skip it. Do not speculate.`,
    );
    searchText = grounded.text;
    // Search returns short-lived redirect links; resolve them to the real article URLs
    const resolved = await Promise.all(grounded.sources.map(async s => ({ ...s, url: await resolveRedirect(s.url) })));
    searchSources = resolved.filter(s => !usedUrls.has(s.url) && isReputable(s.url));
  } catch (e) {
    console.error('news search failed:', e);
  }

  return { fromFeeds, searchText, searchSources };
};

interface CuratedItem extends Omit<NewsItem, 'url'> { url_index: number }
interface Curated {
  items: CuratedItem[];
  technical: { title: string; body: string };
  term: { term: string; definition: string; example: string };
  so_what_question: string;
  intro: string;
  tags: string[];
}

const CURATOR_SYSTEM = `You are the News Curator for Aamir's Brain Gym: a product manager preparing for PM and AI PM roles. Each morning you write his AI briefing.

From the candidate stories, pick the 3 to 5 that matter most for an AI product manager: new model capabilities, important products, research that changes what is buildable, policy that affects shipping AI, and big industry moves. Prefer primary sources (the company's own post) over commentary when both cover the same story. Skip minor updates, tutorials, and opinion pieces with no news.

For each story write, in plain language a smart non-engineer follows:
- what: what actually happened, specifically (2 sentences max).
- why: why it matters for people building AI products.
- buildable: what a product team can now do that it couldn't before, or "Nothing new yet" if that's honest.
- relevance: 1-3 for Aamir's goals (PM interviews, AI product sense).
- url_index: the number of the candidate whose URL this story links to. Use only the given numbers.

Also write:
- technical: a short technical section (title + 3-6 sentences of markdown) on how one of today's stories actually works under the hood. Aamir wants technical depth too.
- term: one AI term worth knowing today, with a plain definition and a concrete example.
- so_what_question: one specific question asking him what today's news means for a product decision.
- intro: a one-line headline for today's briefing.
- tags: 2-3 short topic tags.

Accuracy rules: use only facts present in the candidates. Never invent numbers, dates, names or quotes. If candidates are thin, pick fewer stories rather than padding.`;

const CURATOR_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          headline: { type: 'STRING' },
          source: { type: 'STRING' },
          date: { type: 'STRING', description: 'e.g. 12 Oct' },
          category: { type: 'STRING', enum: ['model', 'research', 'product', 'policy', 'industry'] },
          url_index: { type: 'INTEGER' },
          what: { type: 'STRING' },
          why: { type: 'STRING' },
          buildable: { type: 'STRING' },
          relevance: { type: 'INTEGER' },
        },
        required: ['headline', 'source', 'category', 'url_index', 'what', 'why', 'buildable', 'relevance'],
      },
    },
    technical: { type: 'OBJECT', properties: { title: { type: 'STRING' }, body: { type: 'STRING' } }, required: ['title', 'body'] },
    term: { type: 'OBJECT', properties: { term: { type: 'STRING' }, definition: { type: 'STRING' }, example: { type: 'STRING' } }, required: ['term', 'definition', 'example'] },
    so_what_question: { type: 'STRING' },
    intro: { type: 'STRING' },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['items', 'technical', 'term', 'so_what_question', 'intro', 'tags'],
};

export interface Briefing {
  module: ModuleOut;
  used: Candidate[]; // stories that made it in, to record so they never repeat
  headlines: string[]; // for the Think exercise
}

export const buildBriefing = async (apiKey: string, now: Date, usedUrls: Set<string>): Promise<Briefing> => {
  const { fromFeeds, searchText, searchSources } = await gatherCandidates(apiKey, now, usedUrls);
  const searchCandidates: Candidate[] = searchSources.map(s => ({ source: s.title || 'Web', title: s.title, url: s.url, summary: '' }));
  const candidates = [...fromFeeds, ...searchCandidates];
  if (candidates.length === 0) throw new Error('No news candidates found');

  const list = candidates.map((c, i) =>
    `[${i}] ${c.source} | ${c.title}${c.published ? ` | ${c.published.slice(0, 10)}` : ''}\n${c.url}\n${c.summary}`).join('\n\n');
  const prompt = `TODAY: ${now.toISOString().slice(0, 10)}

CANDIDATES FROM FEEDS AND SEARCH (data):
${list}

GOOGLE SEARCH SUMMARY OF THE LABS WITHOUT FEEDS (data; its sources are the "Web" candidates above):
${searchText || '(none)'}`;

  const curated = await callGemini<Curated>(apiKey, CURATOR_SYSTEM, [{ role: 'user', parts: [{ text: prompt }] }], CURATOR_SCHEMA, 0.3, CAREFUL_MODEL);

  // Keep only stories that link to a real candidate; drop anything the model can't source
  const items: NewsItem[] = [];
  const used: Candidate[] = [];
  for (const it of curated.items) {
    const c = candidates[it.url_index];
    if (!c || used.includes(c)) continue;
    used.push(c);
    items.push({
      headline: it.headline,
      source: it.source,
      date: it.date,
      category: it.category,
      url: c.url,
      what: it.what,
      why: it.why,
      buildable: it.buildable,
      relevance: Math.min(3, Math.max(1, Math.round(it.relevance))) as 1 | 2 | 3,
    });
  }
  if (items.length === 0) throw new Error('Curator returned no sourced stories');

  const blocks: Block[] = [
    { type: 'news', items },
    { type: 'callout', tone: 'insight', title: curated.technical.title, text: curated.technical.body },
    { type: 'keyterm', term: curated.term.term, definition: curated.term.definition, example: curated.term.example },
  ];

  return {
    module: {
      moduleKey: 'ai_briefing',
      title: 'AI Briefing',
      minutes: 7,
      content: {
        intro: curated.intro,
        tags: curated.tags.slice(0, 3),
        blocks,
        prompt: curated.so_what_question,
        responseType: 'text',
        sources: used.map(u => ({ title: u.title, url: u.url })),
      },
    },
    used,
    headlines: items.map(i => `${i.headline}: ${i.what}`),
  };
};
