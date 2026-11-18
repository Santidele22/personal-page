import { isHttpUrl } from '../../shared/lib/adminPanel';
import type { AdminCertificateRow, CertificateWriteBody } from './api/certificates-admin';

export type CertificateFormState = {
	title: string;
	description: string;
	/** Link of the platform/institution; `''` means the card shows no link. */
	issuerLink: string;
	/** `YYYY-MM-DD`, the value the date input edits and the API orders by. */
	date: string;
};

export const EMPTY_CERTIFICATE_FORM: CertificateFormState = {
	title: '',
	description: '',
	issuerLink: '',
	date: '',
};

/** Accepted uploads, the same three formats the backend verifies by magic bytes. */
export const CERTIFICATE_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

/** Stored row → editable form state. */
export function certificateToForm(row: AdminCertificateRow): CertificateFormState {
	return {
		title: row.title,
		description: row.description,
		issuerLink: row.issuerLink ?? '',
		date: row.date ?? '',
	};
}

/** Form state → API body. Empty `issuerLink` clears the stored link. */
export function certificateFormToBody(form: CertificateFormState): CertificateWriteBody {
	return {
		title: form.title.trim(),
		description: form.description.trim(),
		issuerLink: form.issuerLink.trim(),
		date: form.date.trim(),
	};
}

/**
 * Client-side check so the admin gets Spanish copy instead of a raw `400`.
 * Empty `issuerLink` is allowed (the backend stores "sin link"); non-empty
 * values must be a full http(s) URL, while the API keeps final authority.
 */
export function validateCertificateForm(form: CertificateFormState): string | null {
	if (!form.title.trim()) return 'El certificado necesita un título.';
	if (!form.description.trim()) return 'El certificado necesita una descripción.';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) return 'El certificado necesita una fecha.';

	const link = form.issuerLink.trim();
	if (link && !isHttpUrl(link)) {
		return 'El link del lugar tiene que ser una URL completa (https://…), o vacío si todavía no hay enlace.';
	}

	return null;
}
