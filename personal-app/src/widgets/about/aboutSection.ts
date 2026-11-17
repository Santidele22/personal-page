export interface WorkshopStageLabels {
	btnOff: string;
	btnOn: string;
	capOff: string;
	capOn: string;
}

export const WORKSHOP_STAGE_LABELS: WorkshopStageLabels = {
	btnOff: 'Compilar y soldar',
	btnOn: 'Soldado',
	capOff: 'TALLER CYBER-HERRERO · LINUX',
	capOn: 'SOLDADO · KINTSUGI',
};

export interface WorkshopStageState {
	assembled: boolean;
	buttonLabel: string;
	captionLabel: string;
	ariaPressed: 'true' | 'false';
}

export function getWorkshopStageState(assembled: boolean): WorkshopStageState {
	return {
		assembled,
		buttonLabel: assembled ? WORKSHOP_STAGE_LABELS.btnOn : WORKSHOP_STAGE_LABELS.btnOff,
		captionLabel: assembled ? WORKSHOP_STAGE_LABELS.capOn : WORKSHOP_STAGE_LABELS.capOff,
		ariaPressed: assembled ? 'true' : 'false',
	};
}

export interface FolioSegment {
	text: string;
	strong: boolean;
}

export interface FolioEntry {
	tag: string;
	segments: FolioSegment[];
}

const FOLIO_SUBTITLES = [
	'IDENTIDAD',
	'EL TALLER Y EL TORNO',
	'EL ESTANTE',
] as const;

const HIGHLIGHT_PHRASES = [
	'no hay personaje inventado detrás de este diario',
	'el torno no talla solo: el criterio lo pongo yo',
	'está ahí como un libro en un estante',
] as const;

function toRoman(value: number): string {
	const numerals: Array<[number, string]> = [
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I'],
	];

	let remaining = Math.max(1, Math.floor(value));
	let out = '';

	for (const [amount, symbol] of numerals) {
		while (remaining >= amount) {
			out += symbol;
			remaining -= amount;
		}
	}

	return out;
}

function splitHighlightedSegments(paragraph: string): FolioSegment[] {
	const segments: FolioSegment[] = [];
	let cursor = 0;

	while (cursor < paragraph.length) {
		let nextIndex = -1;
		let nextPhrase = '';

		for (const phrase of HIGHLIGHT_PHRASES) {
			const idx = paragraph.indexOf(phrase, cursor);
			if (idx !== -1 && (nextIndex === -1 || idx < nextIndex)) {
				nextIndex = idx;
				nextPhrase = phrase;
			}
		}

		if (nextIndex === -1) {
			segments.push({ text: paragraph.slice(cursor), strong: false });
			break;
		}

		if (nextIndex > cursor) {
			segments.push({ text: paragraph.slice(cursor, nextIndex), strong: false });
		}

		segments.push({ text: nextPhrase, strong: true });
		cursor = nextIndex + nextPhrase.length;
	}

	return segments.length > 0 ? segments : [{ text: paragraph, strong: false }];
}

export function buildAboutFolios(bioParagraphs: readonly string[]): FolioEntry[] {
	return bioParagraphs.map((paragraph, index) => {
		const roman = toRoman(index + 1);
		const subtitle = FOLIO_SUBTITLES[index];
		const tag = subtitle ? `FOLIO ${roman} · ${subtitle}` : `FOLIO ${roman}`;

		return {
			tag,
			segments: splitHighlightedSegments(paragraph),
		};
	});
}

export function initWorkshopStage(root: ParentNode = document): void {
	const stage = root.querySelector<HTMLElement>('#workshopStage');
	const btn = root.querySelector<HTMLButtonElement>('#assembleBtn');
	const caption = root.querySelector<HTMLElement>('#workshopCaptionState');

	if (!stage || !btn || !caption || stage.dataset.workshopBound === 'true') {
		return;
	}

	stage.dataset.workshopBound = 'true';

	const applyState = (assembled: boolean) => {
		const state = getWorkshopStageState(assembled);
		stage.classList.toggle('is-on', state.assembled);
		btn.classList.toggle('is-assembled', state.assembled);
		btn.setAttribute('aria-pressed', state.ariaPressed);
		btn.textContent = state.buttonLabel;
		caption.textContent = state.captionLabel;
	};

	const toggle = () => {
		applyState(!stage.classList.contains('is-on'));
	};

	stage.addEventListener('click', toggle);
	stage.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.target !== stage) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggle();
		}
	});
}
