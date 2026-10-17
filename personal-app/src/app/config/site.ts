export const SITE_NAME = 'santi.';
export const SITE_TITLE = 'santi. — código con calma · web personal';
export const SITE_DESCRIPTION =
	'Diario personal de Santi: backend, blockchain e ingeniería de software, escrito despacio y primero en español. Espacios honestos para marcas que valoran la calma.';
export const SITE_EMAIL = 'hola@santi.dev';

export type NavLink = {
	href: string;
	label: string;
};

export const NAV_LINKS: NavLink[] = [
	{ href: '/#diario', label: 'Diario' },
	{ href: '/#quien-soy', label: 'Quién soy' },
	{ href: '/#servicios', label: 'Servicios' },
	{ href: '/#marcas', label: 'Marcas' },
];

export const SOCIAL_LINKS = [
	{ icon: 'rss', label: 'RSS del diario', href: '/rss.xml' },
	{ icon: 'github', label: 'GitHub', href: '/#contacto' },
	{ icon: 'linkedin', label: 'LinkedIn', href: '/#contacto' },
	{ icon: 'at-sign', label: 'Mastodon', href: '/#contacto' },
] as const;
