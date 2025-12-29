'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useCallback, useRef } from 'react';
import styles from './TiptapEditor.module.css';

interface TiptapEditorProps {
    /** Initial content (HTML string) */
    content: string;
    /** Called when content changes */
    onContentChange: (html: string) => void;
    /** Placeholder text */
    placeholder?: string;
}

/**
 * Rich text editor component using Tiptap.
 * Provides formatting toolbar and saves content as HTML.
 */
export function TiptapEditor({
    content,
    onContentChange,
    placeholder = 'Start writing...'
}: TiptapEditorProps) {
    const isInitialMount = useRef(true);

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
        },
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onContentChange(editor.getHTML());
        },
    });

    // Update content when it changes externally (e.g., selecting a different file)
    useEffect(() => {
        if (editor && !isInitialMount.current) {
            const currentContent = editor.getHTML();
            if (currentContent !== content) {
                editor.commands.setContent(content, { emitUpdate: false });
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
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarGroup}>
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('bold') ? styles.active : ''}`}
                        title="Bold (Ctrl+B)"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('italic') ? styles.active : ''}`}
                        title="Italic (Ctrl+I)"
                    >
                        <em>I</em>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('underline') ? styles.active : ''}`}
                        title="Underline (Ctrl+U)"
                    >
                        <u>U</u>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('strike') ? styles.active : ''}`}
                        title="Strikethrough"
                    >
                        <s>S</s>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('highlight') ? styles.active : ''}`}
                        title="Highlight"
                    >
                        <span className={styles.highlightIcon}>H</span>
                    </button>
                </div>

                <div className={styles.divider}></div>

                <div className={styles.toolbarGroup}>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 1 }) ? styles.active : ''}`}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 2 }) ? styles.active : ''}`}
                        title="Heading 2"
                    >
                        H2
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`${styles.toolbarButton} ${editor.isActive('heading', { level: 3 }) ? styles.active : ''}`}
                        title="Heading 3"
                    >
                        H3
                    </button>
                </div>

                <div className={styles.divider}></div>

                <div className={styles.toolbarGroup}>
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('bulletList') ? styles.active : ''}`}
                        title="Bullet List"
                    >
                        •
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('orderedList') ? styles.active : ''}`}
                        title="Numbered List"
                    >
                        1.
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('blockquote') ? styles.active : ''}`}
                        title="Quote"
                    >
                        "
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        className={`${styles.toolbarButton} ${editor.isActive('codeBlock') ? styles.active : ''}`}
                        title="Code Block"
                    >
                        {'</>'}
                    </button>
                </div>

                <div className={styles.divider}></div>

                <div className={styles.toolbarGroup}>
                    <button
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={`${styles.toolbarButton} ${editor.isActive({ textAlign: 'left' }) ? styles.active : ''}`}
                        title="Align Left"
                    >
                        ≡
                    </button>
                    <button
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={`${styles.toolbarButton} ${editor.isActive({ textAlign: 'center' }) ? styles.active : ''}`}
                        title="Align Center"
                    >
                        ≡
                    </button>
                    <button
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={`${styles.toolbarButton} ${editor.isActive({ textAlign: 'right' }) ? styles.active : ''}`}
                        title="Align Right"
                    >
                        ≡
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
                        ↶
                    </button>
                    <button
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className={styles.toolbarButton}
                        title="Redo (Ctrl+Y)"
                    >
                        ↷
                    </button>
                </div>
            </div>

            {/* Editor Content */}
            <div className={styles.editorWrapper}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
