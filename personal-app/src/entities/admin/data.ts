import type {
	AdminKpi,
	AdminPost,
	AdminRenewal,
	AdminSignupByMonth,
	AdminSlot,
	AdminSlotOccupancy,
	AdminSlotStatusLine,
	AdminSubscriber,
	AdminSummaryStat,
} from './types';

/**
 * Datos de demostración del panel de admin. Mientras no exista backend,
 * reflejan la vista de referencia y viven solo en el frontend.
 */

export const adminOwner = {
	/** Nombre para el saludo del panel. */
	firstName: 'Santi',
	/** Identificación en el pie del sidebar. */
	email: 'admin@devlog.es',
};

/* ---------- Resumen ---------- */

export const resumenKpis: AdminKpi[] = [
	{ id: 'visitas', label: 'Visitas del mes', value: '48.216', trend: '+8,4% vs. octubre', note: '12.410 lectores únicos' },
	{ id: 'ingresos', label: 'Ingresos por slots', value: '€205', unit: '/mes', trend: '82% ocupación', note: '€250 potenciales al 100%' },
	{ id: 'entradas', label: 'Entradas publicadas', value: '128', trend: '3 borradores abiertos', note: '12 entradas este año' },
	{ id: 'suscriptores', label: 'Suscriptores', value: '1.204', trend: '+36 este mes', note: '46% de apertura media' },
];

export const slotOccupancy: AdminSlotOccupancy = {
	percent: 82,
	value: '€205',
	max: '€250',
	note: '3 de 4 slots reservados este mes.',
	href: '/admin/publicidad',
	linkLabel: 'Gestionar publicidad',
};

export const slotStatusLines: AdminSlotStatusLine[] = [
	{ id: 'pie', name: 'Slot Pie', dimensions: '300 × 100', price: '€15', active: true },
	{ id: 'contenido', name: 'Slot Contenido', dimensions: '480 × 120', price: '€45', active: false },
	{ id: 'lateral', name: 'Slot Lateral', dimensions: '300 × 250', price: '€70', active: true },
	{ id: 'portada', name: 'Slot Portada', dimensions: '970 × 120', price: '€120', active: true },
];

export const renewals: AdminRenewal[] = [
	{
		id: 'portada',
		slotName: 'Slot Portada',
		brand: 'Kite Hosting',
		dateLabel: '30 nov',
		price: '€120',
		warning: 'Vence en dos semanas — enviar recordatorio',
	},
	{ id: 'pie', slotName: 'Slot Pie', brand: 'Sumi Fonts', dateLabel: '30 nov', price: '€15' },
	{ id: 'lateral', slotName: 'Slot Lateral', brand: 'Fold Editor', dateLabel: '31 dic', price: '€70' },
];

export const renewalsNote =
	'La renovación se propone 15 días antes del vencimiento. Nunca se reasigna un slot sin confirmación de la marca.';

export const nextRenewal = '30 nov 2026';

/** Visitas semanales en miles, de más antigua a más reciente (12 semanas). */
export const trafficSeries = [7.6, 8.9, 7.8, 9.6, 9.2, 8.8, 10.2, 9.9, 10.6, 10.3, 11.4, 12.4];

export const trafficSummary = 'media 10,1k · mejor semana 12,4k';

/* ---------- Diario ---------- */

export const diarioStats: AdminSummaryStat[] = [
	{ value: '6', label: 'publicadas en la muestra', dot: 'neutral' },
	{ value: '2', label: 'borradores abiertos', dot: 'hollow' },
	{ value: '128', label: 'entradas totales', dot: 'aka' },
];

export const adminPosts: AdminPost[] = [
	{ id: '01', title: 'Menos capas, más software', category: 'ENSAYO', status: 'publicado', views: '6.412', comments: 14, date: '2026.10.12' },
	{ id: '02', title: 'Mi ritual antes de programar: café, papel y un test en rojo', category: 'CUADERNO', status: 'publicado', views: '4.908', comments: 9, date: '2026.10.04' },
	{ id: '03', title: 'Arquitectura dirigida por eventos sin perder el norte', category: 'ENSAYO', status: 'borrador', views: null, comments: 0, date: '2026.10.16' },
	{ id: '04', title: 'Refactorizar proyectos abandonados sin morir de pena', category: 'HÁBITOS', status: 'publicado', views: '3.877', comments: 11, date: '2026.09.21' },
	{ id: '05', title: 'Ocho herramientas que cambiaron mi flujo de trabajo', category: 'HERRAMIENTAS', status: 'publicado', views: '9.233', comments: 22, date: '2026.09.08' },
	{ id: '06', title: 'La deuda técnica no es una metáfora', category: 'OPINIÓN', status: 'publicado', views: '7.105', comments: 18, date: '2026.08.27' },
	{ id: '07', title: 'Por qué abandono los tests lentos sin remordimiento', category: 'CUADERNO', status: 'borrador', views: null, comments: 0, date: '2026.08.14' },
	{ id: '08', title: 'Un solo directorio: mi sistema de notas de código', category: 'HERRAMIENTAS', status: 'publicado', views: '5.540', comments: 7, date: '2026.08.02' },
];

/* ---------- Publicidad ---------- */

export const publicidadKpis: AdminKpi[] = [
	{ id: 'ingresos', label: 'Ingresos activos', value: '€205', unit: '/mes' },
	{ id: 'ocupacion', label: 'Ocupación', value: '3', unit: 'de 4 slots' },
	{ id: 'renovacion', label: 'Próxima renovación', value: '30 nov' },
];

export const adminSlots: AdminSlot[] = [
	{
		id: 'pie',
		name: 'Slot Pie',
		dimensions: '300 × 100 px',
		position: 'Pie de página',
		status: 'reservado',
		brand: 'Sumi Fonts',
		period: '2026.09.01 → 2026.11.30',
		impressions: '≈ 25.000 impresiones / mes',
		price: '€15',
	},
	{
		id: 'contenido',
		name: 'Slot Contenido',
		dimensions: '480 × 120 px',
		position: 'Entre entradas del diario',
		status: 'disponible',
		impressions: '≈ 40.000 impresiones / mes en oferta',
		price: '€45',
	},
	{
		id: 'lateral',
		name: 'Slot Lateral',
		dimensions: '300 × 250 px',
		position: 'Junto a la rejilla del diario',
		status: 'reservado',
		brand: 'Fold Editor',
		period: '2026.10.01 → 2026.12.31',
		impressions: '≈ 55.000 impresiones / mes',
		price: '€70',
	},
	{
		id: 'portada',
		name: 'Slot Portada',
		dimensions: '970 × 120 px',
		position: 'Bajo el hero de la portada',
		status: 'reservado',
		brand: 'Kite Hosting',
		period: '2026.10.01 → 2026.11.30',
		impressions: '≈ 90.000 impresiones / mes',
		price: '€120',
		isImminent: true,
	},
];

/* ---------- Suscriptores ---------- */

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
