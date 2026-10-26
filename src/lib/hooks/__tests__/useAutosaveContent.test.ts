/** @jest-environment jsdom */

import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { ItemRow } from '@/types/database';
import type { SidebarItem } from '@/types/sidebar';
import { DataServiceContext, type DataService, type ServiceResult } from '@/lib/services/dataService';
import { useAutosaveContent } from '@/lib/hooks/useAutosaveContent';

const addWords = jest.fn(async () => ({ success: true as const, data: undefined }));

jest.mock('@/lib/services/goalService', () => ({
    goalService: {
        addWords: (...args: unknown[]) => addWords(...args),
    },
}));

function file(id: string, content: string): SidebarItem {
    return {
        id,
        name: id,
        type: 'file',
        parentId: null,
        content,
        order: 0,
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
    };
}

function saved(): ServiceResult<ItemRow> {
    return { success: true, data: { id: 'saved' } as ItemRow };
}

describe('useAutosaveContent', () => {
    beforeEach(() => {
        addWords.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('credits a debounced edit to the file that changed when another file is opened first', async () => {
        const updateContent = jest.fn(async () => saved());
        const refreshSubscription = jest.fn();
        const onContentSaved = jest.fn();
        const service = { isDemo: false, updateContent } as DataService;
        const fileA = file('a', '<p>one two</p>');
        const fileB = file('b', '<p>hi</p>');

        function Wrapper({ children }: { children: ReactNode }) {
            return createElement(DataServiceContext.Provider, { value: service }, children);
        }

        const { result, rerender } = renderHook(
            (props: { item: SidebarItem }) => useAutosaveContent({
                selectedItem: props.item,
                projectId: 'project-1',
                onContentSaved,
                isDemo: false,
                refreshSubscription,
            }),
            { initialProps: { item: fileA }, wrapper: Wrapper },
        );

        act(() => {
            result.current.handleContentChange('<p>one two three four five</p>');
        });

        await act(async () => {
            rerender({ item: fileB });
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(updateContent).toHaveBeenCalledTimes(1);
        expect(updateContent).toHaveBeenCalledWith('a', '<p>one two three four five</p>');
        expect(addWords).toHaveBeenCalledTimes(1);
        expect(addWords).toHaveBeenCalledWith('project-1', 3);
        expect(onContentSaved).toHaveBeenCalledWith('a', '<p>one two three four five</p>');
        expect(refreshSubscription).toHaveBeenCalledTimes(1);

        jest.useFakeTimers();
        act(() => {
            result.current.handleContentChange('<p>hi there</p>');
        });
        await act(async () => {
            jest.advanceTimersByTime(1500);
            await Promise.resolve();
            await Promise.resolve();
        });
        jest.useRealTimers();

        expect(addWords).toHaveBeenCalledTimes(2);
        expect(addWords).toHaveBeenLastCalledWith('project-1', 1);
        expect(updateContent).toHaveBeenLastCalledWith('b', '<p>hi there</p>');
    });

    it('keeps pasted words out of the goal when the file is switched before autosave', async () => {
        const updateContent = jest.fn(async () => saved());
        const service = { isDemo: false, updateContent } as DataService;
        const fileA = file('a', '<p>one two</p>');
        const fileB = file('b', '<p>hi</p>');

        function Wrapper({ children }: { children: ReactNode }) {
            return createElement(DataServiceContext.Provider, { value: service }, children);
        }

        const { result, rerender } = renderHook(
            (props: { item: SidebarItem }) => useAutosaveContent({
                selectedItem: props.item,
                projectId: 'project-1',
                isDemo: false,
                refreshSubscription: jest.fn(),
            }),
            { initialProps: { item: fileA }, wrapper: Wrapper },
        );

        act(() => {
            result.current.handlePasteWords(3);
            result.current.handleContentChange('<p>one two three four five</p>');
        });
        await act(async () => {
            rerender({ item: fileB });
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(addWords).not.toHaveBeenCalled();
        expect(updateContent).toHaveBeenCalledWith('a', '<p>one two three four five</p>');
    });

    it('does not credit a restored version as new writing', async () => {
        const updateContent = jest.fn(async () => saved());
        const service = { isDemo: false, updateContent } as DataService;
        const fileA = file('a', '<p>one two</p>');

        function Wrapper({ children }: { children: ReactNode }) {
            return createElement(DataServiceContext.Provider, { value: service }, children);
        }

        const { result } = renderHook(
            () => useAutosaveContent({
                selectedItem: fileA,
                projectId: 'project-1',
                isDemo: false,
                refreshSubscription: jest.fn(),
            }),
            { wrapper: Wrapper },
        );

        await act(async () => {
            result.current.saveNow('<p>one two three four five six</p>', true);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(updateContent).toHaveBeenCalledWith('a', '<p>one two three four five six</p>');
        expect(addWords).not.toHaveBeenCalled();
    });
});
