import type { ApiBlogLevel } from './types';

/**
 * Formatting used by the admin adapters. Everything is resolved in Spanish and
 * in UTC, so a server render and a browser render of the same row agree.
 */

const CATEGORY_BY_LEVEL: Record<string, string> = {
	basico: 'BÁSICO',
	intermedio: 'INTERMEDIO',
	avanzado: 'AVANZADO',
};

/** `basico` → `BÁSICO`; an unknown level falls back to its upper case. */
export function formatLevel(level: ApiBlogLevel): string {
	return CATEGORY_BY_LEVEL[level] ?? String(level).toUpperCase();
}

/** `120` → `€120`; keeps up to two decimals only when they exist. */
export function formatEuro(value: number): string {
	return `€${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)}`;
}

/** `1204` → `1.204`. */
export function formatCount(value: number): string {
	return new Intl.NumberFormat('es-ES').format(value);
}

/** ISO timestamp → `2026.10.12`, the date format the panel tables use. */
export function formatDay(iso: string): string {
	return iso.slice(0, 10).replaceAll('-', '.');
}

/** ISO timestamp → `30 nov`. */
export function formatDayMonth(iso: string): string {
	return new Intl.DateTimeFormat('es-ES', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC',
	}).format(new Date(iso));
}

/** ISO timestamp → `30 nov 2026`. */
export function formatDayMonthYear(iso: string): string {
	return new Intl.DateTimeFormat('es-ES', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(iso));
}
