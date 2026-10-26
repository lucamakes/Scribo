'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { EditorState } from '@tiptap/pm/state';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { LineNote, setLineNote } from '@/lib/editor/lineNoteExtension';
import {
    getLineNotesOpenServerSnapshot,
    getLineNotesOpenSnapshot,
    setLineNotesOpen,
    subscribeLineNotesOpen,
} from '@/lib/editor/lineNotesPreference';
import { countWordsInHtml, countWordsInPlainText } from '@/lib/editor/wordCount';
import { useLineNoteEntries } from '@/lib/hooks/useLineNoteEntries';
import { EditorToolbar } from '@/components/EditorToolbar/EditorToolbar';
import { LineNotes } from '@/components/LineNotes/LineNotes';
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
    /** Called when text is pasted, with the count of pasted words (used to exclude pasted text from writing goal progress) */
    onPaste?: (pastedWordCount: number) => void;
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
    onPaste,
    focusMode = false,
    fontSize = 18,
    lineHeight = 2.0,
    textColor = '#4a4a4a'
}: TiptapEditorProps) {
    const isInitialMount = useRef(true);
    const previousContent = useRef(content);
    const scrollRef = useRef<HTMLDivElement>(null);
    const manuscriptRef = useRef<HTMLDivElement>(null);
    const notesLabelId = useId();
    const [isMobile, setIsMobile] = useState(false);
    const [stackedNotes, setStackedNotes] = useState(false);
    const notesOpen = useSyncExternalStore(
        subscribeLineNotesOpen,
        getLineNotesOpenSnapshot,
        getLineNotesOpenServerSnapshot,
    );

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
            LineNote,
        ],
        content,
        editorProps: {
            attributes: {
                class: styles.editorContent,
            },
            // Block paste when at limit
            handlePaste: (_view, event, slice) => {
                if (isAtLimit && !isPro) {
                    onLimitBlocked?.();
                    return true; // Returning true prevents default paste behavior
                }
                // Count pasted words so the parent can exclude them from goal tracking
                if (onPaste) {
                    let pastedText = '';
                    // Prefer clipboard text when available (covers plain text paste)
                    const clipboardText = event.clipboardData?.getData('text/plain');
                    if (clipboardText) {
                        pastedText = clipboardText;
                    } else {
                        // Fallback: extract text from the ProseMirror slice
                        slice.content.descendants((node) => {
                            if (node.isText && node.text) {
                                pastedText += node.text + ' ';
                            }
                            return true;
                        });
                    }
                    const wordCount = countWordsInPlainText(pastedText);
                    if (wordCount > 0) {
                        onPaste(wordCount);
                    }
                }
                return false;
            },
            // Block typing when at limit
            handleKeyDown: (_view, event) => {
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

                // Reset the undo/redo history so Ctrl+Z can't reach back into the
                // previously opened file's edits. The editor instance is reused
                // across files (content is swapped rather than remounted), so
                // without this the ProseMirror history stack carries over and
                // undo would reconstruct the previous file's content here.
                const { state } = editor.view;
                const freshState = EditorState.create({
                    doc: state.doc,
                    plugins: state.plugins,
                    schema: state.schema,
                });
                editor.view.updateState(freshState);

                // On mobile, scroll to bottom when loading a new file with content
                if (isMobile && content && content.length > 100) {
                    // Use a small delay to let the content render
                    setTimeout(() => {
                        if (scrollRef.current) {
                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                        }
                    }, 100);
                }
            }
        }
        isInitialMount.current = false;
    }, [content, editor, isMobile]);

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

    const toggleNotes = useCallback(() => {
        setLineNotesOpen(!getLineNotesOpenSnapshot());
    }, []);

    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        const observer = new ResizeObserver(() => {
            setStackedNotes(element.clientWidth < 760);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [editor]);

    const { entries, activePos } = useLineNoteEntries(
        editor,
        manuscriptRef,
        notesOpen,
        `${fontSize}:${lineHeight}:${stackedNotes}`,
    );

    const handleNoteChange = useCallback((pos: number, note: string) => {
        if (!editor) return;
        setLineNote(editor, pos, note);
    }, [editor]);

    if (!editor) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
            </div>
        );
    }

    const notesBesideText = notesOpen && !stackedNotes;
    const stageClass = [
        styles.stage,
        notesOpen ? styles.stageWithNotes : '',
        notesOpen && stackedNotes ? styles.stageStacked : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={`${styles.editor} ${notesOpen ? styles.notesVisible : ''}`}
            onKeyDown={handleKeyDown}
        >
            <div className={`${styles.toolbarWrapper} ${focusMode ? styles.toolbarHidden : ''}`}>
                <div className={`${styles.toolbarFrame} ${notesBesideText ? styles.toolbarFrameWithNotes : ''}`}>
                    <EditorToolbar
                        editor={editor}
                        notesOpen={notesOpen}
                        onToggleNotes={toggleNotes}
                    />
                    {notesBesideText && (
                        <p className={styles.notesColumnLabel} id={notesLabelId}>
                            Notes
                        </p>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                className={`${styles.editorScroll} ${focusMode ? styles.editorScrollFocus : ''}`}
            >
                <div className={stageClass}>
                    <div
                        ref={manuscriptRef}
                        className={styles.manuscript}
                        style={{ fontSize: `${fontSize}px`, lineHeight, color: textColor }}
                    >
                        <EditorContent editor={editor} />
                    </div>
                    {notesOpen && (
                        <div className={styles.notesSlot}>
                            <LineNotes
                                entries={entries}
                                activePos={activePos}
                                stacked={stackedNotes}
                                onChange={handleNoteChange}
                                labelledBy={notesBesideText ? notesLabelId : undefined}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
