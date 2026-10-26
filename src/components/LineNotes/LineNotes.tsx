'use client';

import { useState } from 'react';
import type { LineNoteEntry } from '@/lib/hooks/useLineNoteEntries';
import styles from './LineNotes.module.css';

interface LineNotesProps {
    /** Lines to annotate, in document order */
    entries: readonly LineNoteEntry[];
    /** Document position of the line the cursor is in */
    activePos: number | null;
    /** Stack notes under the manuscript instead of aligning them in the margin */
    stacked: boolean;
    /** Called with the line position and the next note text */
    onChange: (pos: number, note: string) => void;
    /** Id of the visible "Notes" label when the margin column is showing */
    labelledBy?: string;
}

interface LineNoteFieldProps {
    entry: LineNoteEntry;
    active: boolean;
    stacked: boolean;
    onChange: (pos: number, note: string) => void;
}

/**
 * A single note field. Local state keeps the caret stable while the editor
 * transaction that stores the note catches up.
 */
function LineNoteField({ entry, active, stacked, onChange }: LineNoteFieldProps) {
    const [draft, setDraft] = useState<string | null>(null);
    const [trackedNote, setTrackedNote] = useState(entry.note);
    let value = draft ?? entry.note;
    if (entry.note !== trackedNote) {
        setTrackedNote(entry.note);
        // Drop the local draft when the document changes out from under it (undo, restore).
        if (draft !== null && entry.note !== draft) {
            setDraft(null);
            value = entry.note;
        }
    }

    const label = entry.excerpt.length > 0
        ? `Note for: ${entry.excerpt}`
        : 'Note for this line';

    const filled = value.trim().length > 0;

    return (
        <div className={stacked ? styles.stackItem : undefined}>
            {stacked && (
                <p className={styles.excerpt}>
                    {entry.excerpt.length > 0 ? entry.excerpt : 'This line'}
                </p>
            )}
            <textarea
                className={[
                    styles.note,
                    stacked ? styles.noteStacked : '',
                    filled ? styles.noteFilled : '',
                    active ? styles.noteActive : '',
                ].filter(Boolean).join(' ')}
                style={stacked ? undefined : { top: entry.top, height: entry.height }}
                value={value}
                placeholder="Add a note…"
                aria-label={label}
                spellCheck
                onBlur={() => {
                    const trimmed = value.trim();
                    if (trimmed !== entry.note) {
                        onChange(entry.pos, trimmed);
                    }
                    setDraft(null);
                }}
                onChange={(event) => {
                    const next = event.target.value;
                    setDraft(next);
                    onChange(entry.pos, next);
                }}
            />
        </div>
    );
}

/**
 * Margin notes for the open manuscript. Each field lines up with one
 * paragraph, heading, or list line.
 */
export function LineNotes({
    entries,
    activePos,
    stacked,
    onChange,
    labelledBy,
}: LineNotesProps) {
    return (
        <aside
            className={stacked ? styles.stack : styles.column}
            aria-label={labelledBy ? undefined : 'Line notes'}
            aria-labelledby={labelledBy}
        >
            {stacked && <h2 className={styles.stackHeading}>Notes</h2>}
            <div className={stacked ? undefined : styles.align}>
                {entries.map((entry) => (
                    <LineNoteField
                        key={entry.pos}
                        entry={entry}
                        active={entry.pos === activePos}
                        stacked={stacked}
                        onChange={onChange}
                    />
                ))}
            </div>
        </aside>
    );
}
