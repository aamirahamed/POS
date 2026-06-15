import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import {
    ArrowLeft, Bold, Italic, List, ListOrdered, CheckSquare,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Undo, Redo, CheckCircle2, Loader2
} from 'lucide-react';

interface ContextEditorCanvasProps {
    nodeId: string;
    canvasId: string;
    onClose: () => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    const addImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        editor.chain().focus().setImage({ src: e.target.result as string }).run();
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const toggleBtnClass = (isActive: boolean) =>
        `p-2 rounded-md transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`;

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-[#1a2235]/90 backdrop-blur-md border border-white/10 rounded-xl sticky top-20 z-10 shadow-lg">
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={toggleBtnClass(editor.isActive('heading', { level: 1 }))} title="Heading 1"><Heading1 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={toggleBtnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2"><Heading2 size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={toggleBtnClass(editor.isActive('bold'))} title="Bold"><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={toggleBtnClass(editor.isActive('italic'))} title="Italic"><Italic size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={toggleBtnClass(editor.isActive('bulletList'))} title="Bullet List"><List size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={toggleBtnClass(editor.isActive('orderedList'))} title="Numbered List"><ListOrdered size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={toggleBtnClass(editor.isActive('taskList'))} title="Checklist"><CheckSquare size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={setLink} className={toggleBtnClass(editor.isActive('link'))} title="Link"><LinkIcon size={16} /></button>
            <button onClick={addImage} className={toggleBtnClass(false)} title="Add Image"><ImageIcon size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-2 rounded-md text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"><Undo size={16} /></button>
            <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-2 rounded-md text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"><Redo size={16} /></button>
        </div>
    );
};

const ContextEditorCanvas: FC<ContextEditorCanvasProps> = ({ nodeId, canvasId, onClose }) => {
    const { nodes, updateNode } = useLifeMapStore();
    const node = nodes.find(n => n.id === nodeId);
    const canvas = node?.data.canvases?.find(c => c.id === canvasId);

    const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
    const [title, setTitle] = useState(canvas?.title || 'Untitled Canvas');

    const debouncedSave = useCallback((html: string, newTitle: string) => {
        setSaveState('saving');
        const timeout = setTimeout(() => {
            if (!node || !node.data.canvases) return;
            const updatedCanvases = node.data.canvases.map(c =>
                c.id === canvasId ? { ...c, content: html, title: newTitle, lastEdited: Date.now() } : c
            );
            updateNode(nodeId, { canvases: updatedCanvases, lastUpdated: Date.now() });
            setSaveState('saved');
        }, 1000);
        return () => clearTimeout(timeout);
    }, [node, nodeId, canvasId, updateNode]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({ inline: true, allowBase64: true }),
            Link.configure({ openOnClick: false }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: 'Capture detailed thoughts, paste screenshots, or create lists...' }),
        ],
        content: canvas?.content || '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-[50vh] pb-32 pt-8',
            },
        },
        onUpdate: ({ editor }) => {
            setSaveState('saving');
            const html = editor.getHTML();
            debouncedSave(html, title);
        },
    });

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        setSaveState('saving');
        if (editor) debouncedSave(editor.getHTML(), e.target.value);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (saveState === 'saving' && editor && node && node.data.canvases) {
            timeout = setTimeout(() => {
                const updatedCanvases = node.data.canvases!.map(c =>
                    c.id === canvasId ? { ...c, content: editor.getHTML(), title, lastEdited: Date.now() } : c
                );
                updateNode(nodeId, { canvases: updatedCanvases, lastUpdated: Date.now() });
                setSaveState('saved');
            }, 1000);
        }
        return () => clearTimeout(timeout);
    }, [editor?.getHTML(), title, nodeId, canvasId, node, updateNode]);

    if (!node || !canvas) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[100] bg-[#0f172a] overflow-y-auto custom-scrollbar"
        >
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Execution Node</span>
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-0.5">
                            Canvas • {node.data.label as string}
                        </span>
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Untitled Canvas"
                            className="text-lg font-bold text-white bg-transparent border-none outline-none focus:ring-0 p-0 m-0 placeholder:text-white/30"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium">
                    {saveState === 'saving' ? (
                        <span className="flex items-center gap-1.5 text-slate-400 bg-white/5 px-3 py-1.5 rounded-full">
                            <Loader2 size={12} className="animate-spin" /> Saving...
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-emerald-400/80 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                            <CheckCircle2 size={12} /> Saved
                        </span>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 relative">
                <MenuBar editor={editor} />
                <div className="mt-8 bg-[#1a2235]/30 rounded-2xl border border-white/5 p-8 md:p-12 shadow-2xl">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </motion.div>
    );
};

export default ContextEditorCanvas;
