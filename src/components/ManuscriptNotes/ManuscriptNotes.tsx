'use client';

import { useState, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    getManuscriptNotesServerSnapshot,
    getManuscriptNotesSnapshot,
    manuscriptNoteActions,
    subscribeManuscriptNotes,
} from '@/lib/editor/manuscriptNotesStore';
import type { ManuscriptNoteItem, PendingNote } from '@/lib/editor/manuscriptNotesStore';
import {
    getNotesPanelOpenServerSnapshot,
    getNotesPanelOpenSnapshot,
    setNotesPanelOpen,
    subscribeNotesPanelOpen,
} from '@/lib/editor/notesPanelPreference';
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

/**
 * Collapsible notes for the open manuscript, beside the writing.
 * Highlight text to add one. Click a saved note to scroll to it.
 */
export function ManuscriptNotes() {
    const snapshot = useSyncExternalStore(
        subscribeManuscriptNotes,
        getManuscriptNotesSnapshot,
        getManuscriptNotesServerSnapshot,
    );
    const open = useSyncExternalStore(
        subscribeNotesPanelOpen,
        getNotesPanelOpenSnapshot,
        getNotesPanelOpenServerSnapshot,
    );
    if (!snapshot.active) return null;

    const notes = snapshot.pending?.noteId
        ? snapshot.notes.filter((note) => note.id !== snapshot.pending?.noteId)
        : snapshot.notes;
    const className = open ? styles.panel : `${styles.panel} ${styles.collapsed}`;

    return (
        <section className={className} data-manuscript-notes="" aria-label="Notes">
            <button
                type="button"
                className={styles.toggle}
                aria-expanded={open}
                aria-label={open ? 'Collapse notes' : 'Expand notes'}
                onClick={() => setNotesPanelOpen(!open)}
            >
                {!open && <ChevronLeft size={14} strokeWidth={1.5} aria-hidden />}
                <span className={styles.toggleLabel}>Notes</span>
                {!open && notes.length > 0 && (
                    <span className={styles.count}>{notes.length}</span>
                )}
                {open && <ChevronRight size={14} strokeWidth={1.5} aria-hidden />}
            </button>
            {open && (
                <>
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
                </>
            )}
        </section>
    );
}
