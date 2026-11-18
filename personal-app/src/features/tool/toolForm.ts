import type { ToolSponsorship } from '../../entities/tool/types';
import { isHttpUrl } from '../../shared/lib/adminPanel';
import type { ToolInput, ToolRow } from './api/tools-admin';

/**
 * Form state, option constants, row↔body mappers, label helper and the Spanish
 * client-side validation of the tools admin panel
 * (`/admin/herramientas/`). Everything here is pure so the panel stays a
 * container and the presentational components own no rules.
 */

export type ToolFormState = {
	name: string;
	/** Landing note shown on one line under the name; `''` renders `Sin nota.`. */
	what: string;
	/** Stored click target; `''` means the tool has no page yet. */
	url: string;
	/** Classification key; the DTO defaults it, the form always sends it. */
	sponsorship: ToolSponsorship;
};

export const EMPTY_TOOL_FORM: ToolFormState = {
	name: '',
	what: '',
	url: '',
	sponsorship: 'genuina',
};

export const TOOL_SPONSORSHIP_OPTIONS: { value: ToolSponsorship; label: string }[] = [
	{ value: 'genuina', label: 'Por amor al arte' },
	{ value: 'patrocinada', label: 'Patrocinada' },
];

/** Rendered label of a stored sponsorship key; raw keys show as they come. */
export function sponsorshipLabel(sponsorship: string): string {
	return TOOL_SPONSORSHIP_OPTIONS.find((option) => option.value === sponsorship)?.label ?? sponsorship;
}

/** Maps a stored tool row into editable form fields. */
export function toolToForm(row: ToolRow): ToolFormState {
	return {
		name: row.name,
		what: row.what,
		url: row.url ?? '',
		sponsorship: row.sponsorship ?? 'genuina',
	};
}

/** Maps form state into the API write payload. */
export function toolFormToBody(form: ToolFormState): ToolInput {
	return {
		name: form.name.trim(),
		what: form.what.trim(),
		url: form.url.trim(),
		sponsorship: form.sponsorship,
	};
}

/**
 * Client-side check so the admin gets Spanish copy instead of a raw `400`.
 * The Link field keeps the soft policy of the panel: the only check is a full
 * http(s) URL (or empty, because the backend treats `''` as "sin link"), and
 * the API still owns the authoritative answer.
 */
export function validateToolForm(form: ToolFormState): string | null {
	if (!form.name.trim()) return 'El nombre no puede quedar vacío.';

	const url = form.url.trim();
	if (url && !isHttpUrl(url)) {
		return 'El link tiene que ser una URL completa (https://…), o vacío si todavía no hay página.';
	}

	return null;
}
