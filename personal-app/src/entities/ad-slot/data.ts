import type { AdSlotInfo } from './types';

export const adSlots: AdSlotInfo[] = [
	{
		id: 'pie',
		name: 'Sello',
		visibility: 'Discreto',
		moment: 'Al final de cada página',
		format: 'Sello pequeño + enlace',
		price: 'USD 10',
		cadence: '/mes',
		note: 'El colofón del diario: un sello quieto que solo ve quien terminó de leer. Sin competir con el contenido.',
	},
	{
		id: 'flujo',
		name: 'Entre entradas',
		visibility: 'Media',
		moment: 'En la rejilla del diario',
		format: 'Bloque estático, sin animación',
		price: 'USD 30',
		cadence: '/mes',
		note: 'Convive con las entradas recientes: atención natural de quien explora qué leer, sin interrumpir nada.',
	},
	{
		id: 'lectura',
		name: 'En lectura',
		visibility: 'Alta',
		moment: 'Dentro de cada entrada',
		format: '«Esta entrada llega gracias a…», escrito por mí',
		price: 'USD 60',
		cadence: '/mes',
		note: 'El momento de máxima atención: el lector ya eligió quedarse. Formato editorial nativo, nunca un banner.',
	},
	{
		id: 'patrono',
		name: 'Patrono del mes',
		visibility: 'Exclusiva · 1 por mes',
		moment: 'Todo lo anterior + bajo la portada',
		format: 'Presencia total, sin rotación ni rivales',
		price: 'USD 150',
		cadence: '/mes',
		note: 'Una sola marca acompaña todo el diario durante un mes completo. Cuando está tomado, no hay otro.',
	},
];
