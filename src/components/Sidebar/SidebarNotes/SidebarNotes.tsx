'use client';

import { useSyncExternalStore } from 'react';
import { ManuscriptNotes } from '@/components/ManuscriptNotes/ManuscriptNotes';
import {
    getManuscriptNotesServerSnapshot,
    getManuscriptNotesSnapshot,
    subscribeManuscriptNotes,
} from '@/lib/editor/manuscriptNotesStore';
import styles from './SidebarNotes.module.css';

/**
 * Notes for the open file, pinned under the file tree.
 * Hidden when the manuscript is covered, because the editor shows the same list there.
 */
export function SidebarNotes() {
    const snapshot = useSyncExternalStore(
        subscribeManuscriptNotes,
        getManuscriptNotesSnapshot,
        getManuscriptNotesServerSnapshot,
    );
    if (!snapshot.active || snapshot.notesInEditor) return null;
    return (
        <div className={styles.host}>
            <ManuscriptNotes layout="sidebar" />
        </div>
    );
}
