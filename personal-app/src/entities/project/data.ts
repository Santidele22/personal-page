import type { Project } from './types';

export const projects: Project[] = [
	{
		name: 'Orvel',
		icon: 'sprout',
		tagline: 'Turnos online para negocios de belleza',
		description:
			'SaaS/PWA de turnos para uñas, barbería y estética: los clientes reservan desde un enlace público y el negocio gestiona su agenda desde un dashboard. La landing y el dashboard están desplegados.',
		stack: ['Angular 21', 'Astro 6', 'Svelte 5', 'Tailwind 4', 'Supabase', 'Postgres', 'Realtime', 'Edge Functions'],
		status: 'en-produccion',
		statusLabel: 'En producción',
		repoUrl: 'https://github.com/Santidele22/orvel',
		demoUrl: 'https://orvel.pro',
		featured: true,
	},
	{
		name: 'Whiskito',
		icon: 'feather',
		tagline: 'Donaciones on-chain',
		description:
			'Landing para recibir donaciones en la moneda nativa mediante un contrato Fund que valida un mínimo de USD 0,01 con un feed de Chainlink. El código está abierto; la demo pública no está disponible por ahora.',
		stack: ['Foundry', 'Solidity', 'Vite', 'viem', 'Chainlink'],
		status: 'codigo-abierto',
		statusLabel: 'Código abierto',
		repoUrl: 'https://github.com/Santidele22/whiskito',
	},
	{
		name: 'nft-marketplace',
		icon: 'blocks',
		tagline: 'Marketplace NFT',
		description:
			'Marketplace NFT en construcción: hoy concentra los contratos ERC-721 y ERC-20 junto a la base del frontend. El próximo paso es completar el contrato del marketplace y la interfaz.',
		stack: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind 4', 'Foundry', 'Solidity', 'OpenZeppelin'],
		status: 'en-construccion',
		statusLabel: 'En construcción',
		repoUrl: 'https://github.com/Santidele22/nft-marketplace',
	},
	{
		name: 'ts-sender-clon',
		icon: 'wrench',
		tagline: 'Airdrop de tokens ERC20',
		description:
			'Herramienta para enviar tokens ERC-20 a múltiples direcciones gestionando la allowance previa, con conexión de wallet mediante RainbowKit.',
		stack: ['Next.js 16', 'React 19', 'RainbowKit', 'wagmi', 'viem'],
		status: 'codigo-abierto',
		statusLabel: 'Código abierto',
		repoUrl: 'https://github.com/Santidele22/ts-sender-clon',
	},
];
