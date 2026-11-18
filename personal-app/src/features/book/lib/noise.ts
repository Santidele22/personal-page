import type { ReadingChunk } from '../../../entities/book/types';

import { parseBookOpenerHeading } from './headings';
import { normalizeLoose } from './textNormalize';

const KNOWN_EBOOK_SITES_RE =
	/\b(?:lelibros|lectulandia|ebookelo|epublibre|bajalibros|elejandria|espaebook|quedelibros|epubgratis|librodot|freeditorial|pdfdrive|z-lib|libgen)\b/i;

const EBOOK_PROMO_PHRASES_RE =
	/(?:libro\s+proporcionado\s+por|proporcionado\s+por\s+el\s+equipo|visite\s+nuestro\s+sitio|visita\s+nuestr[oa]\s+(?:sitio|web)|descarga\s+est[eo]\s+y\s+otros\s+(?:miles\s+de\s+)?libros)/i;

const DOMAIN_PAGE_WATERMARK_EXACT_RE =
	/^(?:(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\s*[-–—|·/]\s*(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?|(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?\s*[-–—|·/]\s*(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i;

const STANDALONE_PAGE_NUMBER_RE =
	/^(?:[-–—[(]?\s*\d{1,4}\s*[-–—\])]|(?:p[aá]gina|page|p[aá]g\.?)\s*\d{1,4}(?:\s*(?:de|of|\/)\s*\d{1,4})?|\d{1,4})$/i;

const STANDALONE_URL_RE = /^(?:https?:\/\/\S+|www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?)$/i;
const EPUB_STAMP_RE = /\bepub\s+(?:base\s+)?r\d+(?:\.\d+)*\b/i;
const RIPPER_CREDIT_PREFIX_RE =
	/^(?:editor\s+digital|digitalizado\s+por|escaneado\s+por|maquetado\s+por|maquetaci[oó]n|correcci[oó]n\s+de\s+erratas|conversi[oó]n\s+a\s+(?:pdf|epub))\b/i;
const RIPPER_CREDIT_ANYWHERE_RE = /\b(?:digitalizado|escaneado|maquetado)\s+por\b/i;
const RIPPER_DATE_SIG_RE =
	/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_.-]{2,28}(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_.-]{2,20})?\s+\d{2}\.\d{2}\.\d{2,4}$/;
const FRONTMATTER_LEGAL_RE =
	/(?:\bisbn(?:-1[03])?\s*[:\-]?\s*[\dXx-]{10,}|^isbn\b|dep[oó]sito\s+legal|todos\s+los\s+derechos\s+reservados|reservados\s+todos\s+los\s+derechos|no\s+se\s+permite\s+la\s+reproducci[oó]n\s+total\s+o\s+parcial|^(?:copyright\s*)?©|^(?:t[ií]tulo\s+original|edici[oó]n\s+original|dise[ñn]o\s+de\s+(?:cubierta|portada)|ilustraci[oó]n\s+de\s+(?:cubierta|portada)|impreso\s+en|printed\s+in)\b)/i;

const EDGE_HEADER_CHAPTER_RE =
	/^(?:cap[íi]tulo|parte|secci[óo]n|pr[óo]logo|ep[íi]logo|[íi]ndice|tabla\s+de\s+contenidos|contenido|sumario|index|table\s+of\s+contents|[ivxlcdm]+)(?:\s+(?:[ivxlcdm]+|\d+))?\.?$/i;

export type ReaderDisplayContext = {
	repeatedNoiseKeys?: Set<string>;
	totalPages?: number;
};

export function normalizeEdgeNoiseKey(text: string): string {
	return normalizeLoose(text)
		.replace(/\b(?:pagina|page|pag\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?\b/g, 'pagina #')
		.replace(/^\d+(?:\s*[-–—|·]\s*|\s+)/g, '# ')
		.replace(/(?:\s*[-–—|·]\s*|\s+)\d+$/g, ' #')
		.replace(/\s+/g, ' ')
		.trim();
}

function isRepeatedEdgeCandidate(
	chunk: ReadingChunk,
	book?: { title?: string; author?: string } | null,
): boolean {
	const trimmed = chunk.text.trim();
	if (!trimmed || trimmed.length > 100) return false;
	if (chunk.type === 'toc' || chunk.type === 'verse') return false;
	if (/^—/.test(trimmed)) return false;
	if (EDGE_HEADER_CHAPTER_RE.test(trimmed)) return false;
	if (chunk.page <= 5 && parseBookOpenerHeading(trimmed, book)) return false;
	const key = normalizeEdgeNoiseKey(trimmed);
	const hasPageToken = key.includes('#') || /\b(?:https?:\/\/|www\.|\.[a-z]{2,4})\b/i.test(trimmed);
	if (!hasPageToken && /[.!?;:»"]$/.test(trimmed)) return false;
	return Boolean(key);
}

export function collectRepeatedEdgeNoise(
	chunks: ReadingChunk[],
	pdfPages: number,
	book?: { title?: string; author?: string } | null,
): Set<string> {
	const pagesMap = new Map<number, ReadingChunk[]>();
	for (const chunk of chunks) {
		const list = pagesMap.get(chunk.page);
		if (list) list.push(chunk);
		else pagesMap.set(chunk.page, [chunk]);
	}

	const keyPages = new Map<string, Set<number>>();
	for (const [page, pageChunks] of pagesMap.entries()) {
		const edgeChunks =
			pageChunks.length === 1 ? [pageChunks[0]] : [pageChunks[0], pageChunks[pageChunks.length - 1]];
		for (const edge of edgeChunks) {
			if (!isRepeatedEdgeCandidate(edge, book)) continue;
			const key = normalizeEdgeNoiseKey(edge.text);
			if (!key) continue;
			const pages = keyPages.get(key) ?? new Set<number>();
			pages.add(page);
			keyPages.set(key, pages);
		}
	}

	const repeated = new Set<string>();
	for (const [key, pages] of keyPages.entries()) {
		const hasMarker = key.includes('#') || /(?:https?:\/\/|www\.|\.(?:com|org|net|es|info|io)\b)/i.test(key);
		const minPages = pdfPages <= 6 && hasMarker ? 2 : 3;
		if (pages.size >= minPages) {
			repeated.add(key);
		}
	}
	return repeated;
}

export function isNoiseChunk(
	chunk: ReadingChunk,
	book?: { title?: string; author?: string } | null,
	context?: ReaderDisplayContext,
): boolean {
	const trimmed = chunk.text.trim();
	if (!trimmed) return true;
	if (chunk.type === 'toc') return false;

	const totalPages = context?.totalPages;
	const isEdgeMatter =
		chunk.page <= 8 || (typeof totalPages === 'number' && totalPages > 0 && chunk.page >= totalPages - 3);

	if (STANDALONE_PAGE_NUMBER_RE.test(trimmed)) return true;
	if (DOMAIN_PAGE_WATERMARK_EXACT_RE.test(trimmed)) return true;
	if (EBOOK_PROMO_PHRASES_RE.test(trimmed) && trimmed.length <= 280) return true;
	if (KNOWN_EBOOK_SITES_RE.test(trimmed) && trimmed.length <= 220) return true;
	if (EPUB_STAMP_RE.test(trimmed) && trimmed.length <= 220) return true;
	if (RIPPER_CREDIT_PREFIX_RE.test(trimmed) && trimmed.length <= 240) return true;
	if (RIPPER_CREDIT_ANYWHERE_RE.test(trimmed) && trimmed.length <= 160) return true;

	if (STANDALONE_URL_RE.test(trimmed)) {
		if (KNOWN_EBOOK_SITES_RE.test(trimmed) || isEdgeMatter) return true;
	}

	if (isEdgeMatter) {
		if (RIPPER_DATE_SIG_RE.test(trimmed)) return true;
		if (trimmed.length <= 320 && FRONTMATTER_LEGAL_RE.test(trimmed)) return true;
	}

	if (context?.repeatedNoiseKeys && context.repeatedNoiseKeys.size > 0) {
		if (!(chunk.page <= 5 && parseBookOpenerHeading(trimmed, book))) {
			const key = normalizeEdgeNoiseKey(trimmed);
			if (key && context.repeatedNoiseKeys.has(key)) {
				return true;
			}
		}
	}

	return false;
}
