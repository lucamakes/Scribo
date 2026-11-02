'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote } from 'lucide-react';
import {
    getManuscriptNotesServerSnapshot,
    getManuscriptNotesSnapshot,
    manuscriptNoteActions,
    subscribeManuscriptNotes,
} from '@/lib/editor/manuscriptNotesStore';
import type { ManuscriptNoteItem, PendingNote } from '@/lib/editor/manuscriptNotesStore';
import styles from './ManuscriptNotes.module.css';

interface ComposerProps {
    pending: PendingNote;
}

interface NoteRowProps {
    note: ManuscriptNoteItem;
    active: boolean;
}

/**
 * Field for the text that is highlighted right now.
 */
function Composer({ pending }: ComposerProps) {
    const [draft, setDraft] = useState<string | null>(null);
    const [trackedSeed, setTrackedSeed] = useState(pending.seed);
    const [trackedExcerpt, setTrackedExcerpt] = useState(pending.excerpt);
    let value = draft ?? pending.seed;
    if (pending.excerpt !== trackedExcerpt || (draft === null && pending.seed !== trackedSeed)) {
        setTrackedExcerpt(pending.excerpt);
        setTrackedSeed(pending.seed);
        if (pending.excerpt !== trackedExcerpt) {
            setDraft(null);
            value = pending.seed;
        }
    }

    return (
        <div className={styles.composer}>
            <p className={styles.excerpt}>{pending.excerpt}</p>
            <textarea
                className={styles.input}
                value={value}
                placeholder="Add a note"
                aria-label={`Note for ${pending.excerpt}`}
                rows={2}
                spellCheck
                onChange={(event) => {
                    const next = event.target.value;
                    setDraft(next);
                    manuscriptNoteActions()?.savePending(next);
                }}
                onBlur={() => {
                    manuscriptNoteActions()?.savePending(value);
                    setDraft(null);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.blur();
                    }
                }}
            />
        </div>
    );
}

/**
 * One saved note. The excerpt jumps to the highlight. The text saves on blur.
 */
function NoteRow({ note, active }: NoteRowProps) {
    const [draft, setDraft] = useState<string | null>(null);
    const [trackedNote, setTrackedNote] = useState(note.note);
    let value = draft ?? note.note;
    if (note.note !== trackedNote) {
        setTrackedNote(note.note);
        if (draft !== null && note.note !== draft) {
            setDraft(null);
            value = note.note;
        }
    }

    return (
        <li className={active ? styles.itemActive : styles.item}>
            <button
                type="button"
                className={styles.jump}
                onClick={() => manuscriptNoteActions()?.focus(note.id)}
            >
                {note.excerpt.length > 0 ? note.excerpt : 'Note'}
            </button>
            <textarea
                className={styles.input}
                value={value}
                aria-label={`Note on ${note.excerpt.length > 0 ? note.excerpt : 'this passage'}`}
                rows={2}
                spellCheck
                onChange={(event) => {
                    const next = event.target.value;
                    setDraft(next);
                    manuscriptNoteActions()?.update(note.id, next);
                }}
                onBlur={() => setDraft(null)}
            />
        </li>
    );
}

function isNotesTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('[data-manuscript-notes]') !== null;
}

/**
 * Place the popover under the toolbar button, flipping above it when the page is short.
 */
function placePopover(button: HTMLButtonElement, popover: HTMLElement): void {
    const rect = button.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const roomBelow = window.innerHeight - rect.bottom;
    const top = roomBelow < height + 12 && rect.top > height + 12
        ? rect.top - height - 6
        : rect.bottom + 6;
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
}

/**
 * Notes button in the formatting row. Clicking it opens a small list.
 * Highlight text to add one. Click a saved note to scroll to it.
 */
export function ManuscriptNotes() {
    const snapshot = useSyncExternalStore(
        subscribeManuscriptNotes,
        getManuscriptNotesSnapshot,
        getManuscriptNotesServerSnapshot,
    );
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!open) return;
        const button = buttonRef.current;
        const popover = popoverRef.current;
        if (!button || !popover) return;

        const place = () => placePopover(button, popover);
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, snapshot.pending, snapshot.notes.length]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!isNotesTarget(event.target)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!snapshot.active) return null;

    const notes = snapshot.pending?.noteId
        ? snapshot.notes.filter((note) => note.id !== snapshot.pending?.noteId)
        : snapshot.notes;
    const popover = open ? (
        <div
            ref={popoverRef}
            className={styles.popover}
            data-manuscript-notes=""
            role="dialog"
            aria-label="Notes"
        >
            {snapshot.pending ? (
                <Composer pending={snapshot.pending} />
            ) : notes.length === 0 ? (
                <p className={styles.hint}>Highlight text to add a note</p>
            ) : null}
            {notes.length > 0 && (
                <ul className={styles.list}>
                    {notes.map((note) => (
                        <NoteRow
                            key={note.id}
                            note={note}
                            active={note.id === snapshot.activeId}
                        />
                    ))}
                </ul>
            )}
        </div>
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={open ? `${styles.button} ${styles.buttonOpen}` : styles.button}
                data-manuscript-notes=""
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label="Notes"
                title="Notes"
                onClick={() => setOpen((current) => !current)}
            >
                <StickyNote size={16} strokeWidth={1.5} />
                {snapshot.notes.length > 0 && (
                    <span className={styles.count}>{snapshot.notes.length}</span>
                )}
            </button>
            {popover && typeof document !== 'undefined' ? createPortal(popover, document.body) : null}
        </>
    );
}
