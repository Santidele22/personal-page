import type { Service } from './types';

export const services: Service[] = [
	{
		num: '01',
		icon: 'pen-line',
		title: 'Contenido técnico',
		description:
			'Artículos de ingeniería para blogs de producto y documentación con voz propia. Investigación, estructura y ejemplos que compilan.',
		items: ['Artículos técnicos de fondo', 'Documentación y guías', 'Ghostwriting para equipos'],
		price: 'desde USD 150',
	},
	{
		num: '02',
		icon: 'handshake',
		title: 'Colaboraciones con marcas',
		description:
			'Solo herramientas que uso o usaría de verdad: hosting, editores, servicios para devs. Reseñas honestas, siempre marcadas.',
		items: ['Reseña honesta en el diario', 'Mención en la carta mensual', 'Espacios por momento de lectura'],
		price: 'desde USD 200',
	},
	{
		num: '03',
		icon: 'graduation-cap',
		title: 'Mentoría 1:1',
		description:
			'Una hora de backend, arquitectura o carrera. Sin humo: revisión real de tu repo y un plan que puedas sostener después de la llamada.',
		items: ['Sesión de 60 min por videollamada', 'Revisión de código o arquitectura', 'Plan de estudio realista'],
		price: 'desde USD 50',
	},
];
