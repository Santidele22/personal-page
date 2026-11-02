import { deleteJson, getBearerToken, getJson } from '../../../shared/api/authorizedHttp';

/**
 * Admin CRUD for the `certificates` domain (`/admin/certificados/`). It is
 * deliberately separate from the landing loader (`./certificates.ts`): the
 * loader maps storage into the public cards and swallows failures, while the
 * panel needs every stored row and the real error of each mutation.
 *
 * Create and update are multipart because the optional image travels as the
 * `file` field, exactly like the books PDF upload: the shared JSON helpers set
 * `Content-Type: application/json`, while the browser has to set the
 * `multipart/form-data` boundary itself.
 */

/**
 * A `certificates` row as `GET /certificates` serves it to an admin session:
 * every column, including the upload path (`image`, `null` while unset) and
 * the TypeORM bookkeeping stamps the public read strips.
 */
export type AdminCertificateRow = {
	id: number;
	/** On-disk path of the uploaded image; `null` when the row has none. */
	image?: string | null;
	title: string;
	description: string;
	issuerLink: string;
	/** Issue date as stored (`YYYY-MM-DD`), the value the date input edits. */
	date: string;
	createdAt?: string;
	updatedAt?: string;
};

/** Body of `POST /certificates` and `PATCH /certificates/:id`. */
export type CertificateWriteBody = {
	title: string;
	description: string;
	/** `''` clears the link; a non-empty value must be an http(s) URL. */
	issuerLink: string;
	/** `YYYY-MM-DD`, the value the backend orders the public read by. */
	date: string;
};

const baseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.';
const GENERIC_ERROR = 'El servidor no pudo completar la solicitud.';

type ErrorPayload = {
	message?: string | string[];
};

/** Stored certificates in the API order (newest first); throws so the panel can offer a retry. */
export function fetchAdminCertificates(): Promise<AdminCertificateRow[]> {
	return getJson<AdminCertificateRow[]>('/certificates');
}

/** Removes a stored certificate; the backend drops the image it may have on disk. */
export function deleteCertificate(id: number): Promise<void> {
	return deleteJson(`/certificates/${id}`);
}

/**
 * Builds the multipart body. `file` is only appended when the admin picked an
 * image: without it the backend keeps the stored column untouched on `PATCH`
 * and stores no image on `POST` (S1).
 */
function toFormData(body: CertificateWriteBody, file?: File | null): FormData {
	const data = new FormData();
	data.append('title', body.title);
	data.append('description', body.description);
	data.append('issuerLink', body.issuerLink);
	data.append('date', body.date);
	if (file) data.append('file', file);

	return data;
}

/**
 * Sends the multipart body with the admin credential. The response payload is
 * not read (the panel refetches the list), but the error shape is normalised
 * the same way the shared helper does, so the panel always shows a Spanish
 * message plus the API detail.
 */
async function submit(
	method: 'POST' | 'PATCH',
	path: string,
	body: CertificateWriteBody,
	file?: File | null,
): Promise<void> {
	let response: Response;

	try {
		const token = await getBearerToken();
		response = await fetch(`${baseUrl}${path}`, {
			method,
			credentials: 'include',
			headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			body: toFormData(body, file),
		});
	} catch {
		throw new Error(CONNECTION_ERROR);
	}

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
		const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
		throw new Error(message || GENERIC_ERROR);
	}
}

/** Creates a certificate; a `400` carries the validation message the panel shows. */
export function createCertificate(body: CertificateWriteBody, image?: File | null): Promise<void> {
	return submit('POST', '/certificates', body, image);
}

/** Replaces the editable columns of a stored certificate, and its image when one is picked. */
export function updateCertificate(
	id: number,
	body: CertificateWriteBody,
	image?: File | null,
): Promise<void> {
	return submit('PATCH', `/certificates/${id}`, body, image);
}
