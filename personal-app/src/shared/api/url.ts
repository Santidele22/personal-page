/**
 * URLs administrables (páginas de herramientas, repos y demos de proyectos,
 * perfiles sociales) terminan en un `href` de una página renderizada en
 * servidor. La validación de esquema vive aquí, en la capa `shared`, y la
 * aplican los adaptadores de cada feature: cualquier cosa que no sea
 * http/https/mailto se descarta y el widget cae a su fallback, así un valor
 * guardado como `javascript:` o una URL scheme-relative nunca llega al HTML.
 */
const SAFE_HREF_SCHEME = /^(https?:|mailto:)/i;

/**
 * Devuelve la URL si su esquema es seguro para un enlace, o `undefined` si
 * hay que tratarla como «sin URL» (vacía, malformada o con otro esquema).
 */
export function safeHref(url: string | null | undefined): string | undefined {
	const value = url?.trim();

	if (!value || !SAFE_HREF_SCHEME.test(value)) {
		return undefined;
	}

	return value;
}
