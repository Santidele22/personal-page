import { getBearerToken } from '../../../shared/api/authorizedHttp';
import { resolveApiUrl } from '../../../shared/api/http';

/**
 * Browser-side image upload for the diario editor (drag & drop or paste).
 * `fetch` cannot report upload progress, so this call is one XHR with the
 * same auth contract the JSON helpers use: Cookies by default and a Bearer
 * token when Managed Neon Auth is active. Progress feeds the editor toast
 * and the response carries the delivery URL the markdown gets.
 */

type UploadResponse = {
	/** Delivery path to save in the markdown (`/api/blogs/images/<name>`). */
	url: string;
};

function errorFrom(xhr: XMLHttpRequest): Error {
	let message = '';

	try {
		const payload = JSON.parse(xhr.responseText) as { message?: string | string[] } | null;
		message = Array.isArray(payload?.message) ? payload.message[0] : (payload?.message ?? '');
	} catch {
		// The upstream body was not the API error shape; fall through.
	}

	return new Error(message || 'El servidor no pudo subir la imagen.');
}

export function uploadBlogImage(file: File, onProgress: (pct: number) => void): Promise<UploadResponse> {
	return (async () => {
		const token = await getBearerToken();
		const url = await resolveApiUrl('/blogs/images');

		return new Promise<UploadResponse>((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			xhr.open('POST', url, true);
			xhr.withCredentials = true;
			if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

			xhr.upload.addEventListener('progress', (event) => {
				if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
			});
			xhr.addEventListener('load', () => {
				if (xhr.status < 200 || xhr.status >= 300) {
					reject(errorFrom(xhr));
					return;
				}
				try {
					resolve(JSON.parse(xhr.responseText) as UploadResponse);
				} catch {
					reject(new Error('El servidor no pudo subir la imagen.'));
				}
			});
			xhr.addEventListener('error', () =>
				reject(new Error('No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.'))
			);

			const data = new FormData();
			data.append('file', file);
			xhr.send(data);
		});
	})();
}
