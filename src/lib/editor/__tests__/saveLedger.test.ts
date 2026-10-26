import { manuscriptWordsAdded } from '@/lib/editor/wordCount';
import {
    activateItem,
    baselineFor,
    createSaveLedger,
    noteSaved,
} from '@/lib/editor/saveLedger';

const fileA = '<p>one two</p>';
const editedA = '<p>one two three four five</p>';
const fileB = '<p>hi</p>';

describe('save ledger', () => {
    it('credits a save for the file that was edited after another file is opened', () => {
        let ledger = activateItem(createSaveLedger(), { id: 'a', type: 'file', content: fileA });
        ledger = activateItem(ledger, { id: 'b', type: 'file', content: fileB });

        expect(manuscriptWordsAdded(baselineFor(ledger, 'a'), editedA, 0)).toBe(3);
        // Diffing against the file now on screen is the bug: almost all of A is "new".
        expect(manuscriptWordsAdded(ledger.activeBaseline, editedA, 0)).toBe(4);
    });

    it('does not credit those words again once they have been recorded', () => {
        let ledger = activateItem(createSaveLedger(), { id: 'a', type: 'file', content: fileA });
        ledger = noteSaved(ledger, 'a', editedA);
        ledger = activateItem(ledger, { id: 'b', type: 'file', content: fileB });

        expect(manuscriptWordsAdded(baselineFor(ledger, 'a'), editedA, 0)).toBe(0);
        expect(manuscriptWordsAdded(baselineFor(ledger, 'b'), '<p>hi there</p>', 0)).toBe(1);
    });

    it('leaves the open file baseline alone when a background save is recorded', () => {
        let ledger = activateItem(createSaveLedger(), { id: 'a', type: 'file', content: fileA });
        ledger = activateItem(ledger, { id: 'b', type: 'file', content: fileB });
        ledger = noteSaved(ledger, 'a', editedA);

        expect(ledger.activeItemId).toBe('b');
        expect(ledger.activeBaseline).toBe(fileB);
        expect(baselineFor(ledger, 'a')).toBe(editedA);
    });
});
