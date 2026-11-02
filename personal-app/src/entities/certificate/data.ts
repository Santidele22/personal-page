import type { Certificate } from './types';

/* The certificates section shipped with this small sample before the entity
   had a backend collection. `GET /certificates` replaces it as soon as the API
   answers, exactly like the "herramientas que uso" fallback; a reachable but
   empty collection renders the section's empty state instead (the backend is
   then the only source of truth). No row carries an image on purpose: a
   certificate without an image is rendered without the image block (S6). */
export const certificates: Certificate[] = [
	{
		id: 1,
		title: 'Meta Front-End Developer',
		description:
			'Especialización profesional sobre interfaces, accesibilidad y estado en el cliente, con un proyecto final por curso.',
		issuerLink: 'https://www.coursera.org/professional-certificates/meta-front-end-developer',
		date: '2023-11-20',
	},
	{
		id: 2,
		title: 'Arquitectura Hexagonal en la práctica',
		description: 'Puertos, adaptadores y límites de dominio aplicados a servicios que tienen que durar.',
		issuerLink: 'https://platzi.com',
		date: '2022-08-05',
	},
];
