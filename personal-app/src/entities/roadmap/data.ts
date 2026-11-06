import type { Roadmap } from './types';

/* The roadmap the /roadmap page ships with (S8): it renders when
   `GET /roadmap` is unreachable, exactly like the other landing fallbacks; a
   reachable backend replaces it as the only source of truth. Stages carry the
   chip labels of artboard 03 and the milestones its «Próximos hitos» list. */
export const roadmap: Roadmap = {
	stages: [
		{
			id: 1,
			title: 'Fundamentos',
			summary: 'La base sobre la que se construye todo lo demás.',
			techs: ['TypeScript', 'Node', 'HTTP'],
			state: 'done',
			progress: 100,
		},
		{
			id: 2,
			title: 'Backend I',
			summary: 'APIs reales con persistencia y autenticación.',
			techs: ['NestJS', 'PostgreSQL', 'JWT'],
			state: 'done',
			progress: 100,
		},
		{
			id: 3,
			title: 'Backend II',
			summary: 'Arquitectura hexagonal, colas con Redis y pipelines de CI/CD.',
			techs: ['Arquitectura', 'Redis', 'CI/CD'],
			state: 'now',
			progress: 60,
		},
		{
			id: 4,
			title: 'Web3 I',
			summary: 'Emisión y gestión de activos tokenizados con Solidity y ethers.js.',
			techs: ['Solidity', 'EVM', 'ERC-20/721'],
			state: 'now',
			progress: 45,
		},
		{
			id: 5,
			title: 'Cloud & DevOps',
			summary: 'Infraestructura como código y despliegues serenos.',
			techs: ['AWS', 'GCP', 'Terraform'],
			state: 'next',
			progress: 0,
		},
		{
			id: 6,
			title: 'Web3 II',
			summary: 'Contratos auditados, rendimiento y segunda capa.',
			techs: ['Rust', 'Auditorías', 'L2'],
			state: 'next',
			progress: 0,
		},
		{
			id: 7,
			title: 'Especialización',
			summary: 'La convergencia: profundidad donde el camino lo pida.',
			techs: ['ZK', 'Indexadores'],
			state: 'next',
			progress: 0,
		},
	],
	milestones: [
		{
			id: 1,
			quarter: 'Q3 · 2026',
			title: 'Cerrar Backend II',
			summary: 'Proyecto propio con arquitectura hexagonal, deployado con CI/CD y tests de integración.',
			status: 'now',
		},
		{
			id: 2,
			quarter: 'Q4 · 2026',
			title: 'Cerrar Web3 I',
			summary: 'Dapp de tokenización completa: contrato ERC-20, frontend con ethers.js y backend de indexación.',
			status: 'now',
		},
		{
			id: 3,
			quarter: 'Q1 · 2027',
			title: 'Arrancar Cloud & DevOps',
			summary: 'Infraestructura como código con Terraform sobre AWS y observabilidad básica.',
			status: 'planned',
		},
	],
};
