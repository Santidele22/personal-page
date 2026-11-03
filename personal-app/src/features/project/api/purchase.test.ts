import { describe, expect, it } from 'vitest';
import { projectPurchaseMailto } from './purchase';

describe('projectPurchaseMailto', () => {
	it('prepares a contact email with the project and sender details', () => {
		const href = projectPurchaseMailto('Orvel', {
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			message: 'Quiero comprarlo.',
		});

		expect(href).toBe(
			'mailto:santiidele21@gmail.com?subject=Consulta%20de%20compra%3A%20Orvel&body=Proyecto%3A%20Orvel%0ANombre%3A%20Ada%20Lovelace%0AEmail%3A%20ada%40example.com%0A%0AQuiero%20comprarlo.',
		);
	});
});
