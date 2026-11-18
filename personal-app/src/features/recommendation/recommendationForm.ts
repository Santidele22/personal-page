import { isHttpUrl, parseNonNegativeInt } from '../../shared/lib/adminPanel';
import type { AdminRecommendationRow, RecommendationWriteBody } from './api/recommendations-admin';

export type RecommendationFormState = {
	quote: string;
	authorName: string;
	authorRole: string;
	relationship: string;
	linkedinUrl: string;
	/** Raw input text; parsed with `parseNonNegativeInt` before sending. */
	position: string;
};

export const EMPTY_RECOMMENDATION_FORM: RecommendationFormState = {
	quote: '',
	authorName: '',
	authorRole: '',
	relationship: '',
	linkedinUrl: '',
	position: '',
};

/** Maps a stored recommendation row into editable form fields. */
export function recommendationToForm(row: AdminRecommendationRow): RecommendationFormState {
	return {
		quote: row.quote,
		authorName: row.authorName,
		authorRole: row.authorRole,
		relationship: row.relationship,
		linkedinUrl: row.linkedinUrl ?? '',
		position: String(row.position),
	};
}

/** Maps form fields to the API payload. Empty `linkedinUrl` clears the stored link. */
export function recommendationFormToBody(form: RecommendationFormState): RecommendationWriteBody {
	const position = parseNonNegativeInt(form.position);
	const body: RecommendationWriteBody = {
		quote: form.quote.trim(),
		authorName: form.authorName.trim(),
		authorRole: form.authorRole.trim(),
		relationship: form.relationship.trim(),
		linkedinUrl: form.linkedinUrl.trim(),
	};

	if (position !== null && position !== 'invalid') {
		body.position = position;
	}

	return body;
}

/**
 * Client-side validation mirroring the backend DTO so the admin receives
 * immediate Spanish copy instead of waiting for a `400` response.
 */
export function validateRecommendationForm(form: RecommendationFormState): string | null {
	if (!form.quote.trim()) return 'La recomendación necesita el texto de la cita.';
	if (!form.authorName.trim()) return 'La recomendación necesita el nombre de quien la firma.';
	if (!form.authorRole.trim()) return 'La recomendación necesita el rol de quien la firma.';
	if (!form.relationship.trim()) {
		return 'La recomendación necesita la relación (por ejemplo, «Me supervisó directamente»).';
	}

	const link = form.linkedinUrl.trim();
	if (link && !isHttpUrl(link)) {
		return 'El link de LinkedIn tiene que ser una URL completa (https://…), o vacío si todavía no hay enlace.';
	}

	if (parseNonNegativeInt(form.position) === 'invalid') {
		return 'La posición tiene que ser un número entero igual o mayor que cero.';
	}

	return null;
}
