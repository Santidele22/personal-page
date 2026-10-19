import type { ReadingStatus } from '../../../entities/book/types';
import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/http';

/**
 * Admin CRUD for the `books` domain. It is deliberately separate from the
 * landing loader (`./books.ts`): the loader maps storage into the reading
 * cards, filters unpublished drafts and swallows failures, while the admin
 * needs every stored row and the real error of each mutation. The session
 * cookie travels with every call (`credentials: 'include'` inside the shared
 * helper), so the backend can reject anonymous writes with `401`/`403`.
 */

/**
 * A `books` row exactly as `GET /books` serves it: the editable columns plus
 * the upload metadata TypeORM stores (`fileSize` travels as a string because
 * the column is `bigint`) and the `ownerId`, which the panel never sends back
 * (the backend derives the owner from the authenticated admin session).
 */
export type AdminBookRow = {
	id: number;
	title: string;
	author: string;
	description: string;
	status: ReadingStatus;
	review?: string | null;
	published?: boolean | null;
	originalName?: string | null;
	fileSize?: string | null;
	mimeType?: string | null;
	filePath?: string | null;
	ownerId: string;
};

/**
 * Body of `POST /books` and `PATCH /books/:id`. The owner is never included.
 * `status` always travels with one of the enum keys because the DTO marks it
 * required; `review` travels as `null` when the form leaves it empty, which
 * the `@IsOptional()` DTO accepts and clears the stored column instead of
 * failing an empty string.
 */
export type BookWriteBody = {
	title: string;
	author: string;
	description: string;
	status: ReadingStatus;
	review: string | null;
	published: boolean;
};

const baseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.';
const GENERIC_ERROR = 'El servidor no pudo completar la solicitud.';

type ErrorPayload = {
	message?: string | string[];
};

/** Stored books in storage order; throws so the panel can offer a retry. */
export function fetchAdminBooks(): Promise<AdminBookRow[]> {
	return getJson<AdminBookRow[]>('/books');
}

/** Creates a book; a `400` carries the validation message the panel shows. */
export function createBook(body: BookWriteBody): Promise<void> {
	return postJson('/books', body);
}

/** Replaces the editable columns of a stored book. */
export function updateBook(id: number, body: BookWriteBody): Promise<void> {
	return patchJson(`/books/${id}`, body);
}

/** Removes a stored book and the PDF it may have on disk. */
export function deleteBook(id: number): Promise<void> {
	return deleteJson(`/books/${id}`);
}

/**
 * Attaches (or replaces) the PDF of a stored book through
 * `POST /books/:id/file`. The multipart body cannot go through the shared JSON
 * helpers: those set `Content-Type: application/json`, while the browser has to
 * set the `multipart/form-data` boundary itself. The response status is not
 * read because the endpoint answers the updated row and the panel refetches,
 * but the error shape is normalised the same way the shared helper does, so
 * the panel always shows a Spanish message plus the API detail.
 */
export async function uploadBookFile(id: number, file: File): Promise<void> {
	const body = new FormData();
	body.append('file', file);

	let response: Response;

	try {
		response = await fetch(`${baseUrl}/books/${id}/file`, {
			method: 'POST',
			credentials: 'include',
			body,
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
