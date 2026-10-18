import type { AdminKpi, AdminSignupByMonth, AdminSubscriber } from './types';

/**
 * Demo data that still has no backend source. The resumen, publicidad and
 * diario views read the API through `adapter.ts`; these subscriber datasets stay
 * here until the backend newsletter module lands (task T3).
 */

export const suscriptoresKpis: AdminKpi[] = [
	{ id: 'totales', label: 'Totales', value: '1.204', note: 'todos activos + pendientes' },
	{ id: 'altas', label: 'Altas este mes', value: '+36', note: 'mejor mes del año' },
	{ id: 'apertura', label: 'Apertura media', value: '46%', note: 'últimos 3 envíos' },
	{ id: 'clics', label: 'Clics', value: '12%', note: 'sobre envíos abiertos' },
];

export const signupsByMonth: AdminSignupByMonth[] = [
	{ month: 'MAR', value: 18 },
	{ month: 'ABR', value: 22 },
	{ month: 'MAY', value: 19 },
	{ month: 'JUN', value: 27 },
	{ month: 'JUL', value: 24 },
	{ month: 'AGO', value: 31 },
	{ month: 'SEP', value: 33 },
	{ month: 'OCT', value: 36 },
];

export const signupsSummary = 'crecimiento media +26/mes';

export const ultimasAltas = {
	title: 'Últimas altas',
	totalLabel: '6 de 1.204',
};

export const adminSubscribers: AdminSubscriber[] = [
	{ id: '01', email: 'marta@foldeditor.dev', name: 'Marta G.', origin: 'Diario', date: '2026.10.15', status: 'activo' },
	{ id: '02', email: 'jon@kitehosting.io', name: 'Jon P.', origin: 'Portada', date: '2026.10.14', status: 'activo' },
	{ id: '03', email: 'lucia.romero@gmail.com', name: 'Lucía R.', origin: 'Recomendación', date: '2026.10.13', status: 'activo' },
	{ id: '04', email: 'carlos@devmail.es', name: 'Carlos M.', origin: 'Diario', date: '2026.10.12', status: 'pendiente' },
	{ id: '05', email: 'ana@papelcalmo.ink', name: 'Ana S.', origin: 'Diario', date: '2026.10.09', status: 'activo' },
	{ id: '06', email: 'pablo@kitedev.io', name: 'Pablo T.', origin: 'Portada', date: '2026.10.06', status: 'activo' },
];
