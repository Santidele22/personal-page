import type { Post } from './types';

export const posts: Post[] = [
	{
		slug: 'aprender-ingenieria-en-publico',
		title: 'Aprender ingeniería en público: por qué abrí este diario',
		excerpt:
			'Documentar lo que aprendo de backend y blockchain me obliga a entenderlo de verdad. Este es el trato: una entrada cada dos semanas, sin humo y con código real.',
		category: 'Ensayo',
		icon: 'compass',
		date: '2026.10.15',
		readMin: 6,
		featured: true,
	},
	{
		slug: 'postgresql-no-es-lento',
		title: 'PostgreSQL no es lento: tus índices sí',
		excerpt:
			'Tres consultas que creíamos condenadas y cómo un EXPLAIN a tiempo las volvió triviales. Con los planes de ejecución incluidos.',
		category: 'Backend',
		icon: 'database',
		date: '2026.10.08',
		readMin: 9,
	},
	{
		slug: 'mi-primer-smart-contract',
		title: 'Mi primer smart contract (y todo lo que casi sale mal)',
		excerpt:
			'Gas, reentrancy y la diferencia entre «funciona en el test» y «funciona en mainnet». Notas desde la trinchera.',
		category: 'Blockchain',
		icon: 'blocks',
		date: '2026.09.30',
		readMin: 11,
	},
	{
		slug: 'stack-minimo-api-2026',
		title: 'El stack mínimo para lanzar una API en 2026',
		excerpt:
			'Framework, base de datos, deploy y observabilidad sin pagar de más: lo que uso yo y por qué descarté el resto.',
		category: 'Herramientas',
		icon: 'wrench',
		date: '2026.09.22',
		readMin: 8,
	},
	{
		slug: 'tests-que-si-se-mantienen',
		title: 'Tests que sí se mantienen: reglas de bolsillo',
		excerpt:
			'Menos cobertura teatral, más confianza real. Las reglas que me ahorraron fines de semana enteros.',
		category: 'Opinión',
		icon: 'scale',
		date: '2026.09.14',
		readMin: 7,
	},
];
