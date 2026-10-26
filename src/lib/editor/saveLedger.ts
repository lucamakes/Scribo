export type SaveItemType = 'file' | 'canvas';

/**
 * Word-count baseline for the item on screen, plus baselines remembered
 * for items the writer has left but not finished saving.
 * Autosave is debounced, so a save for the previous file can finish after
 * another file is already open. Crediting that save against the open file
 * counts the whole manuscript as newly written.
 */
export interface SaveLedger {
    readonly activeItemId: string | null;
    readonly activeItemType: SaveItemType | null;
    readonly activeBaseline: string;
    readonly baselines: ReadonlyMap<string, string>;
}

interface ActivateItem {
    readonly id: string;
    readonly type: SaveItemType;
    readonly content: string;
}

/**
 * Empty ledger, before any file or canvas is open.
 */
export function createSaveLedger(): SaveLedger {
    return {
        activeItemId: null,
        activeItemType: null,
        activeBaseline: '',
        baselines: new Map(),
    };
}

/**
 * HTML the next save of `itemId` should be compared with.
 */
export function baselineFor(ledger: SaveLedger, itemId: string): string {
    if (ledger.activeItemId === itemId) return ledger.activeBaseline;
    return ledger.baselines.get(itemId) ?? '';
}

/**
 * Open an item. The previous item's baseline is kept so an in-flight
 * save can still be diffed against that item, not the one now on screen.
 */
export function activateItem(ledger: SaveLedger, item: ActivateItem): SaveLedger {
    if (ledger.activeItemId === item.id && ledger.activeItemType === item.type) {
        return ledger;
    }
    const baselines = new Map(ledger.baselines);
    if (ledger.activeItemId) {
        baselines.set(ledger.activeItemId, ledger.activeBaseline);
    }
    baselines.set(item.id, item.content);
    return {
        activeItemId: item.id,
        activeItemType: item.type,
        activeBaseline: item.content,
        baselines,
    };
}

/**
 * Remember the open item's baseline and clear the active slot.
 * Used when a folder is selected or nothing is open.
 */
export function deactivateItem(ledger: SaveLedger): SaveLedger {
    if (!ledger.activeItemId) return ledger;
    const baselines = new Map(ledger.baselines);
    baselines.set(ledger.activeItemId, ledger.activeBaseline);
    return {
        activeItemId: null,
        activeItemType: null,
        activeBaseline: '',
        baselines,
    };
}

/**
 * Record HTML that is now the baseline for `itemId`.
 * If that item is not on screen, the open file's baseline stays put.
 */
export function noteSaved(ledger: SaveLedger, itemId: string, content: string): SaveLedger {
    const baselines = new Map(ledger.baselines);
    baselines.set(itemId, content);
    if (ledger.activeItemId !== itemId) {
        return { ...ledger, baselines };
    }
    return { ...ledger, activeBaseline: content, baselines };
}
