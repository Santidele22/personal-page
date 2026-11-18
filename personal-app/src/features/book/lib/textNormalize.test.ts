import { describe, expect, it } from 'vitest';

import { prepareChunkDisplay } from './displayModel';

describe('text normalization helpers', () => {
	it('strips inline site watermarks glued onto real prose without dropping the paragraph', () => {
		const prepared = prepareChunkDisplay({
			id: 'p0004.0500',
			type: 'para',
			page: 4,
			offset: 500,
			text: 'Al día siguiente no murió nadie. www.lectulandia.com - Página 4',
			mood: 'espera',
			cues: ['nadie'],
		});

		expect(prepared).toEqual({
			kind: 'para',
			text: 'Al día siguiente no murió nadie.',
			verse: false,
		});
	});
});
