'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SidebarItem } from '@/types/sidebar';
import type { ItemRow } from '@/types/database';
import { goalService } from '@/lib/services/goalService';
import { useDataServiceOptional, type ServiceResult } from '@/lib/services/dataService';
import { manuscriptWordsAdded } from '@/lib/editor/wordCount';
import {
    activateItem,
    baselineFor,
    createSaveLedger,
    deactivateItem,
    noteSaved,
    type SaveItemType,
    type SaveLedger,
} from '@/lib/editor/saveLedger';

const AUTOSAVE_DELAY_MS = 1500;

interface SaveDraft {
    readonly itemId: string;
    readonly itemType: SaveItemType;
    readonly content: string;
    readonly pastedWords: number;
    readonly skipGoalTracking: boolean;
}

interface UseAutosaveContentOptions {
    /** File, folder, canvas, or nothing selected */
    selectedItem: SidebarItem | null;
    /** Project whose writing goal receives newly typed words */
    projectId?: string;
    /** Called after a successful save with the item that was written */
    onContentSaved?: (itemId: string, content: string) => void;
    /** Demo mode records the save but does not touch goals or the subscription total */
    isDemo: boolean;
    /** Reloads the account word total after a file save */
    refreshSubscription: () => void;
}

interface UseAutosaveContentResult {
    content: string;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    error: string | null;
    /** True when the open document matches the baseline used for goal tracking */
    isSaved: boolean;
    handleContentChange: (content: string) => void;
    handlePasteWords: (pastedWordCount: number) => void;
    /** Persist now. Restores pass skipGoalTracking so an old version is not new writing. */
    saveNow: (content: string, skipGoalTracking?: boolean) => void;
}

function isEditableItem(item: SidebarItem): item is SidebarItem & { type: SaveItemType; content: string } {
    return item.type === 'file' || item.type === 'canvas';
}

/**
 * Autosave the open manuscript and credit only words typed into that same item.
 * The debounce can fire after the writer opens something else. The previous
 * item keeps its own baseline so the switch is not stored as words written.
 */
export function useAutosaveContent({
    selectedItem,
    projectId,
    onContentSaved,
    isDemo,
    refreshSubscription,
}: UseAutosaveContentOptions): UseAutosaveContentResult {
    const dataService = useDataServiceOptional();
    const [content, setContent] = useState('');
    const [savedBaseline, setSavedBaseline] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const ledgerRef = useRef<SaveLedger>(createSaveLedger());
    const pendingRef = useRef<SaveDraft | null>(null);
    const pastedWordsRef = useRef(0);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const externalRef = useRef({ projectId, onContentSaved, isDemo, refreshSubscription, dataService });

    const clearIdle = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }, []);

    const commit = useCallback(async (draft: SaveDraft) => {
        const external = externalRef.current;
        const ledger = ledgerRef.current;
        const baselineAtStart = baselineFor(ledger, draft.itemId);
        if (draft.content === baselineAtStart) {
            if (ledger.activeItemId === draft.itemId) pastedWordsRef.current = 0;
            return;
        }

        const wordsAdded = manuscriptWordsAdded(baselineAtStart, draft.content, draft.pastedWords);
        const viewing = ledger.activeItemId === draft.itemId;
        // Advance the baseline before the request returns so a second save, or a
        // file switch during the request, cannot count these words again.
        ledgerRef.current = noteSaved(ledger, draft.itemId, draft.content);
        if (viewing && mountedRef.current) {
            clearIdle();
            setSaveStatus('saving');
            setError(null);
        }

        let result: ServiceResult<ItemRow>;
        if (external.dataService) {
            result = await external.dataService.updateContent(draft.itemId, draft.content);
        } else {
            result = { success: true, data: { id: draft.itemId } as ItemRow };
        }

        if (!result.success) {
            const current = ledgerRef.current;
            const recorded = current.activeItemId === draft.itemId
                ? current.activeBaseline
                : current.baselines.get(draft.itemId);
            if (recorded === draft.content) {
                ledgerRef.current = noteSaved(current, draft.itemId, baselineAtStart);
            }
            console.error('Failed to save:', result.error);
            if (mountedRef.current && ledgerRef.current.activeItemId === draft.itemId) {
                if (ledgerRef.current.activeBaseline === baselineAtStart) {
                    setSavedBaseline(baselineAtStart);
                }
                setError(result.error || 'Failed to save');
                setSaveStatus('error');
            }
            return;
        }

        external.onContentSaved?.(draft.itemId, draft.content);
        const trackGoals = Boolean(
            external.dataService
            && !external.isDemo
            && !draft.skipGoalTracking
            && draft.itemType === 'file'
            && external.projectId
            && wordsAdded > 0,
        );
        if (trackGoals && external.projectId) {
            const credited = wordsAdded;
            const savedProjectId = external.projectId;
            goalService.addWords(savedProjectId, credited)
                .then(() => {
                    window.dispatchEvent(new CustomEvent('goalProgressUpdated', {
                        detail: { wordsAdded: credited },
                    }));
                })
                .catch((err: unknown) => {
                    console.error('Failed to track goal progress:', err);
                });
        }
        if (external.dataService && !external.isDemo && draft.itemType === 'file') {
            external.refreshSubscription();
        }

        if (!mountedRef.current || ledgerRef.current.activeItemId !== draft.itemId) return;
        if (ledgerRef.current.activeBaseline === draft.content) {
            setSavedBaseline(draft.content);
        }
        setSaveStatus('saved');
        clearIdle();
        idleTimerRef.current = setTimeout(() => {
            if (mountedRef.current && ledgerRef.current.activeItemId === draft.itemId) {
                setSaveStatus('idle');
            }
        }, 2000);
    }, [clearIdle]);

    const clearPendingTimer = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            clearIdle();
            clearPendingTimer();
            const pending = pendingRef.current;
            pendingRef.current = null;
            if (pending) void commit(pending);
        };
    }, [clearIdle, clearPendingTimer, commit]);

    // Before paint, so the word count and editor never show the previous file,
    // and before Tiptap's passive content sync.
    useLayoutEffect(() => {
        externalRef.current = { projectId, onContentSaved, isDemo, refreshSubscription, dataService };
        const next = selectedItem && isEditableItem(selectedItem) ? selectedItem : null;
        const activeId = ledgerRef.current.activeItemId;
        if (next && activeId === next.id) return;

        clearPendingTimer();
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) void commit(pending);

        if (!next) {
            ledgerRef.current = deactivateItem(ledgerRef.current);
            pastedWordsRef.current = 0;
            clearIdle();
            setSaveStatus('idle');
            setError(null);
            return;
        }

        const nextContent = next.content || '';
        ledgerRef.current = activateItem(ledgerRef.current, {
            id: next.id,
            type: next.type,
            content: nextContent,
        });
        pastedWordsRef.current = 0;
        setContent(nextContent);
        setSavedBaseline(nextContent);
        clearIdle();
        setSaveStatus('idle');
        setError(null);
    }, [selectedItem, projectId, onContentSaved, isDemo, refreshSubscription, dataService, clearIdle, clearPendingTimer, commit]);

    const handlePasteWords = useCallback((pastedWordCount: number) => {
        pastedWordsRef.current += pastedWordCount;
    }, []);

    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
        const ledger = ledgerRef.current;
        if (!ledger.activeItemId || !ledger.activeItemType) return;
        pendingRef.current = {
            itemId: ledger.activeItemId,
            itemType: ledger.activeItemType,
            content: newContent,
            pastedWords: pastedWordsRef.current,
            skipGoalTracking: false,
        };
        clearPendingTimer();
        saveTimeoutRef.current = setTimeout(() => {
            saveTimeoutRef.current = null;
            const pending = pendingRef.current;
            pendingRef.current = null;
            if (pending) void commit(pending);
        }, AUTOSAVE_DELAY_MS);
    }, [clearPendingTimer, commit]);

    const saveNow = useCallback((nextContent: string, skipGoalTracking = false) => {
        const ledger = ledgerRef.current;
        if (!ledger.activeItemId || !ledger.activeItemType) return;
        clearPendingTimer();
        pendingRef.current = null;
        setContent(nextContent);
        void commit({
            itemId: ledger.activeItemId,
            itemType: ledger.activeItemType,
            content: nextContent,
            pastedWords: pastedWordsRef.current,
            skipGoalTracking,
        });
    }, [clearPendingTimer, commit]);

    return {
        content,
        saveStatus,
        error,
        isSaved: content === savedBaseline,
        handleContentChange,
        handlePasteWords,
        saveNow,
    };
}
