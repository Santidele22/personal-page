import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Markdown → HTML seguro para los cuerpos del diario. `marked` no sanitiza:
 * el HTML que genera se pasa por `sanitize-html` en el servidor antes de
 * llegar a cualquier `set:html`, así un cuerpo guardado con `<script>`,
 * handlers `on*` o enlaces `javascript:` se neutraliza aunque el contenido
 * llegara a manipularse. El allowlist cubre el markup de artículo que el CSS
 * de `BlogPostLayout` estila (encabezados, listas, código, tablas, imágenes)
 * y los esquemas de enlace quedan reducidos a http/https/mailto.
 *
 * Vive en `shared` porque el renderizado lo usa la capa `pages` y no depende
 * de ninguna feature o entidad.
 */

// Los defaults de sanitize-html ya incluyen encabezados, listas, tablas,
// figure; solo faltan las imágenes, `<del>` (que marked emite para
// strikethrough GFM) y `<span>`, que el editor del diario usa para los
// acentos de color de la paleta (editor full-page, artboard 02).
const ARTICLE_TAGS = [...sanitizeHtml.defaults.allowedTags, 'img', 'del', 'span'];

const ARTICLE_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
	a: ['href', 'title'],
	img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
	code: ['class'],
	pre: ['class'],
	span: ['class'],
};

/**
 * El `<span>` solo viaja con clase de la paleta del editor: cualquier otro
 * valor (o un payload de atributos disfrazado de clases) se descarta, aunque
 * la etiqueta sobreviva con su texto.
 */
const ARTICLE_CLASSES: sanitizeHtml.IOptions['allowedClasses'] = {
	span: ['c-aka', 'c-muted'],
};

export function renderMarkdown(markdown: string): string {
	const raw = marked.parse(markdown, { async: false });

	return sanitizeHtml(raw, {
		allowedTags: ARTICLE_TAGS,
		allowedAttributes: ARTICLE_ATTRIBUTES,
		allowedClasses: ARTICLE_CLASSES,
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
		// `//host/path` hereda el esquema del documento; fuera de la allowlist.
		allowProtocolRelative: false,
		// Descarta las etiquetas no permitidas conservando su texto.
		disallowedTagsMode: 'discard',
	});
}
