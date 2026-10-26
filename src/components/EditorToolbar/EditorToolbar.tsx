'use client';

import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
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
    Redo,
    StickyNote,
} from 'lucide-react';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
    /** Active Tiptap editor instance */
    editor: Editor;
    /** Whether the margin notes column is open */
    notesOpen: boolean;
    /** Show or hide the margin notes column */
    onToggleNotes: () => void;
}

interface ToolbarButtonProps {
    label: string;
    onClick: () => void;
    children: ReactNode;
    pressed?: boolean;
    disabled?: boolean;
}

/**
 * Icon button in the formatting toolbar.
 */
function ToolbarButton({
    label,
    onClick,
    children,
    pressed,
    disabled = false,
}: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${styles.toolbarButton} ${pressed ? styles.active : ''}`}
            title={label}
            aria-label={label}
            aria-pressed={pressed}
        >
            {children}
        </button>
    );
}

/**
 * Formatting controls for the manuscript editor, including the line-notes toggle.
 */
export function EditorToolbar({ editor, notesOpen, onToggleNotes }: EditorToolbarProps) {
    return (
        <div className={styles.toolbarRow}>
        <div className={styles.toolbar}>
            <div className={styles.toolbarGroup}>
                <ToolbarButton
                    label="Bold (Ctrl+B)"
                    pressed={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <Bold size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Italic (Ctrl+I)"
                    pressed={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <Italic size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Underline (Ctrl+U)"
                    pressed={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <UnderlineIcon size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Strikethrough"
                    pressed={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <Strikethrough size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Highlight"
                    pressed={editor.isActive('highlight')}
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                >
                    <Highlighter size={16} strokeWidth={1.5} />
                </ToolbarButton>
            </div>

            <div className={styles.divider} />

            <div className={styles.toolbarGroup}>
                <ToolbarButton
                    label="Heading 1"
                    pressed={editor.isActive('heading', { level: 1 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                    <Heading1 size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Heading 2"
                    pressed={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    <Heading2 size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Heading 3"
                    pressed={editor.isActive('heading', { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                    <Heading3 size={16} strokeWidth={1.5} />
                </ToolbarButton>
            </div>

            <div className={styles.divider} />

            <div className={styles.toolbarGroup}>
                <ToolbarButton
                    label="Bullet List"
                    pressed={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Numbered List"
                    pressed={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Quote"
                    pressed={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <Quote size={16} strokeWidth={1.5} />
                </ToolbarButton>
            </div>

            <div className={styles.divider} />

            <div className={styles.toolbarGroup}>
                <ToolbarButton
                    label="Undo (Ctrl+Z)"
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}
                >
                    <Undo size={16} strokeWidth={1.5} />
                </ToolbarButton>
                <ToolbarButton
                    label="Redo (Ctrl+Y)"
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}
                >
                    <Redo size={16} strokeWidth={1.5} />
                </ToolbarButton>
            </div>
        </div>

            <button
                type="button"
                className={`${styles.notesToggle} ${notesOpen ? styles.active : ''}`}
                title={notesOpen ? 'Hide line notes' : 'Show line notes'}
                aria-label={notesOpen ? 'Hide line notes' : 'Show line notes'}
                aria-pressed={notesOpen}
                onClick={onToggleNotes}
            >
                <StickyNote size={16} strokeWidth={1.5} />
                <span>Notes</span>
            </button>
        </div>
    );
}
