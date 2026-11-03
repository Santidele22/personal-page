/**
 * Offset/limit pagination shared by the public SSR pages (issue 47).
 *
 * The backend wraps a collection answer in `{ items, total, offset, limit }`
 * as soon as `offset` or `limit` appears in the query, and keeps answering the
 * plain array otherwise (compat criterion S4). The frontend only ever reads
 * the envelope through these helpers.
 */

/** Envelope the backend serves on every paginated collection read. */
export type Paged<T> = {
	items: T[];
	total: number;
	offset: number;
	limit: number;
};

/** Builds the query string for a paginated read (`?offset=…&limit=…`). */
export function pageQuery(offset?: number, limit?: number): string {
	const params = new URLSearchParams();
	if (offset !== undefined) params.set('offset', String(offset));
	if (limit !== undefined) params.set('limit', String(limit));
	const query = params.toString();
	return query ? `?${query}` : '';
}

/** Parses a raw `?offset=` value into a safe non-negative integer (0 when absent/garbage). */
export function parseOffset(raw: string | null): number {
	const value = Number(raw);
	return Number.isInteger(value) && value >= 0 ? value : 0;
}

/** One numbered page of the controls: 1-based, `current` marks the rendered one. */
export type PageNumber = {
	number: number;
	current: boolean;
};

/**
 * The sliding window of numbered pages the controls render: at most
 * `maxItems` entries centred on the current page, never outside
 * `[1, pageCount]`. With one page (or none) the window is empty, so the
 * caller renders no controls at all.
 */
export function paginationWindow(total: number, offset: number, limit: number, maxItems = 7): PageNumber[] {
	const pageCount = Math.ceil(total / limit);
	if (pageCount <= 1) return [];

	const current = Math.min(Math.floor(offset / limit) + 1, pageCount);
	let start = Math.max(1, current - Math.floor(maxItems / 2));
	const end = Math.min(pageCount, start + maxItems - 1);
	start = Math.max(1, end - maxItems + 1);

	const pages: PageNumber[] = [];
	for (let number = start; number <= end; number += 1) {
		pages.push({ number, current: number === current });
	}
	return pages;
}

/** Offset the numbered `page` starts at (`page` is 1-based). */
export function offsetForPage(page: number, limit: number): number {
	return (page - 1) * limit;
}
