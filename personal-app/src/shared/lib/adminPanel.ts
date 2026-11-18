/**
 * Shared state types and pure helpers for admin CRUD panels.
 */

export type AdminPanelStatus = 'loading' | 'ready' | 'error';

export type AdminPanelFeedback =
	| { kind: 'idle' }
	| { kind: 'success'; message: string }
	| { kind: 'error'; message: string };

/**
 * Keeps the Spanish UI message and appends the backend error detail when one
 * exists (for example `400 { message }` normalized by `shared/api/http`).
 */
export function formatAdminError(fallback: string, cause: unknown): string {
	const detail = cause instanceof Error ? cause.message.trim() : '';

	return detail ? `${fallback} (${detail})` : fallback;
}

/** Matches full http(s) URLs with no whitespace, aligned with backend DTO rules. */
export function isHttpUrl(value: string): boolean {
	return /^https?:\/\/\S+$/i.test(value);
}

/**
 * Parses an optional non-negative integer input (`''` → `null`, invalid text → `'invalid'`).
 */
export function parseNonNegativeInt(value: string): number | null | 'invalid' {
	const trimmed = value.trim();

	if (!trimmed) return null;

	const parsed = Number(trimmed);

	return Number.isInteger(parsed) && parsed >= 0 ? parsed : 'invalid';
}

/** Formats the item counter line for admin list headers (for example `2 recomendaciones · en orden de posición`). */
export function formatAdminRowCount(
	count: number,
	singular: string,
	plural: string,
	note?: string,
): string {
	const label = count === 1 ? singular : plural;
	const trimmedNote = note?.trim();

	return trimmedNote ? `${count} ${label} · ${trimmedNote}` : `${count} ${label}`;
}
