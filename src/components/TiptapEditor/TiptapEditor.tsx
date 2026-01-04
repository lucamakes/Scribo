'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useCallback, useRef } from 'react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo
} from 'lucide-react';
import styles from './TiptapEditor.module.css';

interface TiptapEditorProps {
    /** Initial content (HTML string) */
    content: string;
    /** Called when content changes */
    onContentChange: (html: string) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the user is at their word limit */
    isAtLimit?: boolean;
    /** Whether the user is a Pro subscriber */
    isPro?: boolean;
    /** Called when typing is blocked due to word limit */
    onLimitBlocked?: () => void;
    /** Whether focus mode is active (hides toolbar) */
    focusMode?: boolean;
    /** Font size in pixels */
    fontSize?: number;
    /** Line height multiplier */
    lineHeight?: number;
    /** Text color */
    textColor?: string;
}

/**
 * Rich text editor component using Tiptap.
 * Provides formatting toolbar and saves content as HTML.
 */
export function TiptapEditor({
    content,
    onContentChange,
    placeholder = 'Start writing...',
    isAtLimit = false,
    isPro = false,
    onLimitBlocked,
    focusMode = false,
    fontSize = 18,
    lineHeight = 2.0,
    textColor = '#4a4a4a'
}: TiptapEditorProps) {
    const isInitialMount = useRef(true);
    const previousContent = useRef(content);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                defaultAlignment: 'left',
            }),
            Highlight.configure({
                multicolor: false,
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class: styles.editorContent,
            },
            // Block paste when at limit
            handlePaste: () => {
                if (isAtLimit && !isPro) {
                    onLimitBlocked?.();
                    return true; // Returning true prevents default paste behavior
                }
                return false;
            },
            // Block typing when at limit
            handleKeyDown: (view, event) => {
                if (isAtLimit && !isPro) {
                    // Allow navigation, selection, deletion keys
                    const allowedKeys = [
                        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
                        'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab',
                        'Escape', 'Enter' // Enter for navigation, not adding content
                    ];
                    const isModifierOnly = event.ctrlKey || event.metaKey || event.altKey;
                    const isAllowedKey = allowedKeys.includes(event.key);
                    const isSelectAll = (event.ctrlKey || event.metaKey) && event.key === 'a';
                    const isCopy = (event.ctrlKey || event.metaKey) && event.key === 'c';
                    const isCut = (event.ctrlKey || event.metaKey) && event.key === 'x';
                    const isUndo = (event.ctrlKey || event.metaKey) && event.key === 'z';
                    const isSave = (event.ctrlKey || event.metaKey) && event.key === 's';
                    
                    // Allow these actions
                    if (isAllowedKey || isSelectAll || isCopy || isCut || isUndo || isSave) {
                        return false;
                    }
                    
                    // Block character input and show modal
                    if (event.key.length === 1 && !isModifierOnly) {
                        onLimitBlocked?.();
                        return true; // Block the keystroke
                    }
                }
                return false;
            },
        },
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            
            // If at limit and not Pro, check if content increased
            if (isAtLimit && !isPro) {
                const prevWordCount = countWordsInHtml(previousContent.current);
                const newWordCount = countWordsInHtml(newContent);
                
                // Block if trying to add words
                if (newWordCount > prevWordCount) {
                    // Revert to previous content
                    editor.commands.setContent(previousContent.current, { emitUpdate: false });
                    return;
                }
            }
            
            previousContent.current = newContent;
            onContentChange(newContent);
        },
    });

    // Update content when it changes externally (e.g., selecting a different file)
    useEffect(() => {
        if (editor && !isInitialMount.current) {
            const currentContent = editor.getHTML();
            if (currentContent !== content) {
                editor.commands.setContent(content, { emitUpdate: false });
                previousContent.current = content;
            }
        }
        isInitialMount.current = false;
    }, [content, editor]);

    // Keyboard shortcuts for save
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            // Trigger save immediately by getting current content
            if (editor) {
                onContentChange(editor.getHTML());
            }
        }
    }, [editor, onContentChange]);

    if (!editor) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
            </div>
        );
    }

    return (
        <div className={styles.editor} onKeyDown={handleKeyDown}>
            {/* Toolbar - animated hide in focus mode */}
            <div className={`${styles.toolbarWrapper} ${focusMode ? styles.toolbarHidden : ''}`}>
                <div className={styles.toolbar}>
                        <div className={styles.toolbarGroup}>
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('bold') ? styles.active : ''}`}
                                title="Bold (Ctrl+B)"
                            >
                                <Bold size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('italic') ? styles.active : ''}`}
                                title="Italic (Ctrl+I)"
                            >
                                <Italic size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('underline') ? styles.active : ''}`}
                                title="Underline (Ctrl+U)"
                            >
                                <UnderlineIcon size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('strike') ? styles.active : ''}`}
                                title="Strikethrough"
                            >
                                <Strikethrough size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHighlight().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('highlight') ? styles.active : ''}`}
                                title="Highlight"
                            >
                                <Highlighter size={16} strokeWidth={1} />
                            </button>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.toolbarGroup}>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 1 }) ? styles.active : ''}`}
                                title="Heading 1"
                            >
                                <Heading1 size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 2 }) ? styles.active : ''}`}
                                title="Heading 2"
                            >
                                <Heading2 size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 3 }) ? styles.active : ''}`}
                                title="Heading 3"
                            >
                                <Heading3 size={16} strokeWidth={1} />
                            </button>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.toolbarGroup}>
                            <button
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('bulletList') ? styles.active : ''}`}
                                title="Bullet List"
                            >
                                <List size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('orderedList') ? styles.active : ''}`}
                                title="Numbered List"
                            >
                                <ListOrdered size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                className={`${styles.toolbarButton} ${editor.isActive('blockquote') ? styles.active : ''}`}
                                title="Quote"
                            >
                                <Quote size={16} strokeWidth={1} />
                            </button>
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.toolbarGroup}>
                            <button
                                onClick={() => editor.chain().focus().undo().run()}
                                disabled={!editor.can().undo()}
                                className={styles.toolbarButton}
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo size={16} strokeWidth={1} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().redo().run()}
                                disabled={!editor.can().redo()}
                                className={styles.toolbarButton}
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo size={16} strokeWidth={1} />
                            </button>
                    </div>
                </div>
            </div>

            {/* Editor Content */}
            <div 
                className={`${styles.editorWrapper} ${focusMode ? styles.editorWrapperFocusMode : ''}`}
                style={{ fontSize: `${fontSize}px`, lineHeight, color: textColor }}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

/**
 * Count words in HTML content
 */
function countWordsInHtml(html: string): number {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ');
    const words = text
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter((word) => word.length > 0);
    return words.length;
}
