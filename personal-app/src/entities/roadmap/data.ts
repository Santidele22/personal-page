import type { Roadmap } from './types';

/* The roadmap the /roadmap page ships with (S8, refreshed with real data in
   L6/L7): it renders when `GET /roadmap` is unreachable, exactly like the
   other landing fallbacks; a reachable backend replaces it as the only source
   of truth. The trunk mirrors the user's roadmap.sh backend progress
   (language + APIs + relational databases done; advanced backend next) and
   the Web3 stages their roadmap.sh blockchain progress (23%) and Cyfrin
   Updraft path: Blockchain Basics, Solidity 101 and Foundry Fundamentals
   done, Smart Contract Security in progress, Advanced Foundry and
   Assembly/Formal Verification next. Stage order matters: the graph walks
   the leading done run as its trunk, so done stages always come first. */
export const roadmap: Roadmap = {
	stages: [
		{
			id: 1,
			title: 'Fundamentos',
			summary: 'Internet, redes, Git y Linux: la base sobre la que se apoya todo lo demás.',
			techs: ['Internet', 'Git', 'Linux'],
			state: 'done',
			progress: 100,
		},
		{
			id: 2,
			title: 'Backend I',
			summary: 'Un lenguaje a fondo y APIs reales: Node.js, TypeScript y REST.',
			techs: ['Node.js', 'TypeScript', 'REST'],
			state: 'done',
			progress: 100,
		},
		{
			id: 3,
			title: 'Backend II',
			summary: 'Bases de datos relacionales y persistencia: PostgreSQL, SQL y ORMs.',
			techs: ['PostgreSQL', 'SQL', 'TypeORM'],
			state: 'done',
			progress: 100,
		},
		{
			id: 4,
			title: 'Web3 I',
			summary: 'Blockchain Basics (Cyfrin) y el mapa de chains: EVM, UTXO y capas 2.',
			techs: ['Blockchain', 'EVM', 'L2'],
			state: 'done',
			progress: 100,
		},
		{
			id: 5,
			title: 'Web3 II',
			summary: 'Solidity 101 y Foundry Fundamentals (Cyfrin): contratos, tests y deploys reproducibles.',
			techs: ['Solidity', 'Foundry', 'OpenZeppelin'],
			state: 'done',
			progress: 100,
		},
		{
			id: 6,
			title: 'Seguridad',
			summary: 'Seguridad y Auditoría de Contratos Inteligentes (Cyfrin, en curso): vectores de ataque, DeFi y reportes.',
			techs: ['Auditoría', 'DeFi', 'Seguridad'],
			state: 'now',
			progress: 35,
		},
		{
			id: 7,
			title: 'Backend III',
			summary: 'El backend avanzado de roadmap.sh: testing, caching, CI/CD, contenedores y brokers de mensajes.',
			techs: ['Testing', 'Docker', 'CI/CD'],
			state: 'next',
			progress: 0,
		},
		{
			id: 8,
			title: 'Cloud & DevOps',
			summary: 'Infraestructura y despliegues serenos en la nube.',
			techs: ['AWS', 'Kubernetes', 'IaC'],
			state: 'next',
			progress: 0,
		},
		{
			id: 9,
			title: 'Especialización',
			summary: 'Advanced Foundry, Assembly/EVM y Formal Verification de Cyfrin, y las primeras auditorías competitivas.',
			techs: ['Advanced Foundry', 'Assembly', 'CodeHawks'],
			state: 'next',
			progress: 0,
		},
	],
	milestones: [
		{
			id: 1,
			quarter: 'Q4 · 2026',
			title: 'Terminar Seguridad de Contratos Inteligentes',
			summary: 'Cerrar el curso de auditoría de Cyfrin con un reporte propio sobre un codebase real.',
			status: 'now',
		},
		{
			id: 2,
			quarter: 'Q1 · 2027',
			title: 'Advanced Foundry',
			summary: 'El curso avanzado de Cyfrin: DeFi, oráculos, upgrades y tooling profesional.',
			status: 'planned',
		},
		{
			id: 3,
			quarter: 'Q2 · 2027',
			title: 'Assembly, EVM y Formal Verification',
			summary: 'El último tramo de Cyfrin Updraft y las primeras auditorías competitivas en CodeHawks.',
			status: 'planned',
		},
	],
};
