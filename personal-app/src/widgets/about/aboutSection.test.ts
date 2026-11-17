import { describe, expect, it } from 'vitest';
import {
	buildAboutFolios,
	getWorkshopStageState,
	WORKSHOP_STAGE_LABELS,
} from './aboutSection';

describe('buildAboutFolios', () => {
	it('returns an empty list when no bio paragraphs exist', () => {
		expect(buildAboutFolios([])).toEqual([]);
	});

	it('maps the three default paragraphs to labeled folios with highlighted phrases', () => {
		const paragraphs = [
			'Soy Santiago, desarrollador backend y blockchain. Un dev real escribiendo a mano en un mundo que se apura: no hay personaje inventado detrás de este diario, solo alguien que decide entender antes de apretar enter.',
			'Trabajo como en un taller: mi entorno Linux está armado pieza por pieza, cada una elegida y entendida — poco de manual, mucho de hacer y remendar. Las máquinas ayudan, y mucho; pero el torno no talla solo: el criterio lo pongo yo, y cuando me equivoco, el error queda publicado y remendado.',
			'Este libro existe sin importar quién lo lea: no pide nada, no persigue al lector, está ahí como un libro en un estante. Escribo para preservar lo que aprendo y para obligarme a entenderlo. Si te sirve, es tuyo.',
		];

		const folios = buildAboutFolios(paragraphs);
		expect(folios).toHaveLength(3);
		expect(folios.map((folio) => folio.tag)).toEqual([
			'FOLIO I · IDENTIDAD',
			'FOLIO II · EL TALLER Y EL TORNO',
			'FOLIO III · EL ESTANTE',
		]);

		expect(folios[0].segments).toEqual([
			{
				text: 'Soy Santiago, desarrollador backend y blockchain. Un dev real escribiendo a mano en un mundo que se apura: ',
				strong: false,
			},
			{
				text: 'no hay personaje inventado detrás de este diario',
				strong: true,
			},
			{
				text: ', solo alguien que decide entender antes de apretar enter.',
				strong: false,
			},
		]);

		expect(folios[1].segments.some((s) => s.strong && s.text === 'el torno no talla solo: el criterio lo pongo yo')).toBe(true);
		expect(folios[2].segments.some((s) => s.strong && s.text === 'está ahí como un libro en un estante')).toBe(true);
	});

	it('handles custom or additional paragraphs safely with Roman numeral tags', () => {
		const folios = buildAboutFolios([
			'Primer párrafo editado.',
			'Segundo párrafo.',
			'Tercer párrafo.',
			'Cuarto párrafo extra.',
		]);

		expect(folios.map((folio) => folio.tag)).toEqual([
			'FOLIO I · IDENTIDAD',
			'FOLIO II · EL TALLER Y EL TORNO',
			'FOLIO III · EL ESTANTE',
			'FOLIO IV',
		]);
		expect(folios[3].segments).toEqual([{ text: 'Cuarto párrafo extra.', strong: false }]);
	});
});

describe('getWorkshopStageState', () => {
	it('returns idle workshop labels before compiling/welding', () => {
		expect(getWorkshopStageState(false)).toEqual({
			assembled: false,
			buttonLabel: WORKSHOP_STAGE_LABELS.btnOff,
			captionLabel: WORKSHOP_STAGE_LABELS.capOff,
			ariaPressed: 'false',
		});
	});

	it('returns welded kintsugi labels when assembled', () => {
		expect(getWorkshopStageState(true)).toEqual({
			assembled: true,
			buttonLabel: WORKSHOP_STAGE_LABELS.btnOn,
			captionLabel: WORKSHOP_STAGE_LABELS.capOn,
			ariaPressed: 'true',
		});
	});
});
