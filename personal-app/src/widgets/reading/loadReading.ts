import {
	computeInitialRenderWindow,
	extractBookChapters,
	findSavedProgressItemIndex,
	prepareBookDisplayItems,
} from '../../features/book/lib/reader';
import { fetchBookClientReading } from '../../features/book/api/books';
import { renderChapterList, setCurrentItemIndex } from './chapterNav';
import { BATCH_SIZE, getDisplayItems, getTotalParas, setChapters, setDisplayItems, setTotalParas } from './doc';
import { body, progTotalPages, readerArticle } from './dom';
import { markBookStarted, syncAutoBookStatus } from './status';
import { bookAuthor, bookId, bookTitle, downloadUrl, getPdfPages, hasBook, setPdfPages, state } from './state';
import { updateProgressDisplay } from './progress';
import { findRenderedElementForItem, mountRenderWindow } from './renderWindow';
import { scrollElementToFocalBand } from './scroll';

// Fetches the extracted text of the book and mounts the first render window,
// with honest fallbacks for scanned PDFs and failed loads.

function renderOcrFallback() {
	if (!readerArticle) return;
	readerArticle.replaceChildren();
	const h2 = document.createElement('h2');
	h2.textContent = bookTitle;

	const box = document.createElement('div');
	box.className = 'fallback-box';
	const head = document.createElement('div');
	head.className = 'head';
	const seal = document.createElement('span');
	seal.className = 'seal';
	seal.textContent = 'Fallback · ocr_pending';
	const msg = document.createElement('p');
	msg.appendChild(
		document.createTextNode(
			'Este PDF es escaneado o aún no tiene capa de texto extraída. La vigilia abre el documento original dentro del mundo nocturno mientras el proceso de OCR está pendiente — también podés ',
		),
	);
	const link = document.createElement('a');
	link.className = 'fallback-link';
	link.href = downloadUrl;
	link.target = '_blank';
	link.rel = 'noreferrer';
	link.textContent = 'descargar el PDF original';
	msg.appendChild(link);
	msg.appendChild(document.createTextNode('.'));
	head.appendChild(seal);
	head.appendChild(msg);
	box.appendChild(head);

	const frame = document.createElement('iframe');
	frame.className = 'fallback-frame';
	frame.src = downloadUrl;
	frame.title = bookTitle;

	readerArticle.appendChild(h2);
	readerArticle.appendChild(box);
	readerArticle.appendChild(frame);
}

function renderReadingError(message: string) {
	if (!readerArticle) return;
	readerArticle.replaceChildren();
	const box = document.createElement('div');
	box.className = 'fallback-box';
	const head = document.createElement('div');
	head.className = 'head';
	const seal = document.createElement('span');
	seal.className = 'seal';
	seal.textContent = 'Error de carga';
	const p = document.createElement('p');
	p.textContent = message;
	head.appendChild(seal);
	head.appendChild(p);
	box.appendChild(head);

	const retry = document.createElement('button');
	retry.type = 'button';
	retry.className = 'retry-btn';
	retry.textContent = 'Reintentar';
	retry.addEventListener('click', () => {
		const loader = document.createElement('div');
		loader.className = 'reader-loading';
		loader.setAttribute('role', 'status');
		loader.setAttribute('aria-live', 'polite');
		const dot = document.createElement('span');
		dot.className = 'loader-dot';
		dot.setAttribute('aria-hidden', 'true');
		const article = readerArticle;
		if (!article) return;
		const txt = document.createElement('span');
		txt.textContent = 'Abriendo páginas…';
		loader.appendChild(dot);
		loader.appendChild(txt);
		article.replaceChildren(loader);
		void loadReadingDocument();
	});
	box.appendChild(retry);
	readerArticle.appendChild(box);
}

async function loadReadingDocument() {
	if (!hasBook || !readerArticle) return;
	try {
		const reading = await fetchBookClientReading(bookId);
		setPdfPages(Math.max(1, reading.pdfPages || 1));
		body.dataset.pdfPages = String(getPdfPages());
		body.dataset.readingLoaded = '1';
		if (progTotalPages) progTotalPages.textContent = String(getPdfPages());

		const chunks = Array.isArray(reading.chunks) ? reading.chunks : [];
		if (reading.ocrPending || chunks.length === 0) {
			updateProgressDisplay(state.progress.page || 1, state.progress.pct || 0, state.progress.chunkId);
			renderOcrFallback();
			markBookStarted();
			void syncAutoBookStatus();
			return;
		}

		const prepared = prepareBookDisplayItems(chunks, getPdfPages(), {
			title: bookTitle,
			author: bookAuthor,
		});
		setDisplayItems(prepared.items);
		setTotalParas(prepared.totalParas);
		setChapters(extractBookChapters(getDisplayItems()));
		renderChapterList();

		if (getDisplayItems().length === 0) {
			renderOcrFallback();
			markBookStarted();
			void syncAutoBookStatus();
			return;
		}

		const startTargetIdx = findSavedProgressItemIndex(getDisplayItems(), state.progress);
		setCurrentItemIndex(startTargetIdx);
		const win = computeInitialRenderWindow(getDisplayItems().length, startTargetIdx, BATCH_SIZE);
		mountRenderWindow(win.start, win.end);

		const hasSavedPosition =
			Boolean(state.progress?.chunkId) || (state.progress?.page ?? 1) > 1;
		if (hasSavedPosition) {
			const savedItem = getDisplayItems()[startTargetIdx];
			const savedEl = savedItem ? findRenderedElementForItem(savedItem) : null;
			if (savedEl) {
				setTimeout(() => scrollElementToFocalBand(savedEl, 'instant'), 30);
			}
		} else {
			updateProgressDisplay(1, getTotalParas() > 0 ? Math.max(1, Math.round((1 / getTotalParas()) * 100)) : 1, getDisplayItems()[0]?.chunkId);
		}
		markBookStarted();
		void syncAutoBookStatus();
	} catch (err) {
		const msg =
			err instanceof Error && err.message
				? err.message
				: 'No se pudo cargar el texto del libro. Intentá nuevamente.';
		renderReadingError(msg);
	}
}


/** Kicks off the first reading load. */

export function initReading(): void {
	void loadReadingDocument();
}
