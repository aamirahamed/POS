import { FC, useState, useCallback, createContext, useContext } from 'react';
import { Bot, Link as LinkIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/store/useAgentStore';

interface AgentMessageProps {
    msg: ChatMessage;
    isLatest: boolean;
    onSendAnswers: (answers: Record<string, string>) => void;
}

const extractText = (n: any): string => {
    if (!n) return '';
    if (n.type === 'text') return n.value;
    if (n.children) return n.children.map(extractText).join('');
    return '';
};

interface AnswerContextType {
    answers: Record<string, string>;
    onChange: (questionId: string, val: string) => void;
    isLatest: boolean;
}

const AnswerContext = createContext<AnswerContextType>({
    answers: {},
    onChange: () => {},
    isLatest: false
});

const markdownComponents = {
    a: ({ node, ...props }: any) => (
        <a
            {...props}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all text-xs font-medium text-indigo-300 no-underline mt-1 mb-1 shadow-sm group max-w-full"
        >
            <LinkIcon size={10} className="group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="truncate">{props.children}</span>
        </a>
    ),
    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
    li: ({ node, children, ...props }: any) => {
        const { answers, onChange, isLatest } = useContext(AnswerContext);
        
        const textContent = extractText(node);
        const isQuestion = textContent.includes('?');
        const questionId = textContent.trim();

        return (
            <li {...props} className="my-1.5 relative">
                <div className="leading-relaxed">{children}</div>
                {isQuestion && isLatest && (
                    <div className="mt-2 mb-3 pr-2">
                        <input
                            type="text"
                            placeholder="Type your answer here..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
                            value={answers[questionId] || ''}
                            onChange={(e) => onChange(questionId, e.target.value)}
                        />
                    </div>
                )}
            </li>
        );
    }
};

export const AgentMessage: FC<AgentMessageProps> = ({ msg, isLatest, onSendAnswers }) => {
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const handleAnswerChange = useCallback((questionId: string, val: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: val }));
    }, []);

    const handleSubmit = () => {
        onSendAnswers(answers);
        setAnswers({});
    };

    const hasAnyAnswers = Object.keys(answers).some(k => answers[k].trim().length > 0);
    
    // A quick heuristic to show the submit button if the markdown contains list item questions
    const hasQuestions = isLatest && /(?:\d+\.|\-|\*)\s+.*?\?/s.test(msg.text);

    return (
        <div className="flex items-start gap-3 max-w-[88%] self-start w-full">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-indigo-400">
                <Bot size={14} />
            </div>
            <div className="p-4 rounded-2xl text-[15px] shadow-sm bg-white/5 backdrop-blur-md text-text-primary border border-white/10 rounded-tl-sm w-full">
                <div className="prose prose-sm prose-invert prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-ul:my-1.5 prose-li:my-0.5">
                    <AnswerContext.Provider value={{ answers, onChange: handleAnswerChange, isLatest }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {msg.text}
                        </ReactMarkdown>
                    </AnswerContext.Provider>
                </div>

                {hasQuestions && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={!hasAnyAnswers}
                            className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        >
                            Send Answers
                        </button>
                    </div>
                )}
                
                {/* Status / Execution Logs */}
                {msg.statusLog && msg.statusLog.some(log => log.startsWith('✓')) && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="text-[10px] font-bold tracking-wider text-text-secondary/70 uppercase mb-2 flex items-center gap-2">
                            <div className="w-4 border-t border-white/10" />
                            Actions Executed
                            <div className="flex-1 border-t border-white/10" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {msg.statusLog.filter(log => log.startsWith('✓')).map((log, index) => {
                                const cleanText = log.replace('✓ ', '');
                                return (
                                    <div key={index} className="flex items-start gap-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 transition-colors px-3 py-2 rounded-xl">
                                        <div className="mt-[3px] w-3 h-3 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                        </div>
                                        <span className="text-[12px] text-indigo-200/90 leading-tight font-medium">
                                            {cleanText}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
