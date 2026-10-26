/**
 * Count words in HTML content.
 * Tags are removed first, so margin notes stored in attributes are not counted.
 */
export function countWordsInHtml(html: string): number {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ');
    const words = text
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter((word) => word.length > 0);
    return words.length;
}

/**
 * Count words in plain text. Used for pasted content.
 */
export function countWordsInPlainText(text: string): number {
    if (!text) return 0;
    const words = text
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter((word) => word.length > 0);
    return words.length;
}
