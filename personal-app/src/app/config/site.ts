export const SITE_NAME = 'santi.';
export const SITE_TITLE = 'Santiago Delebecq — santi. · código con calma';
export const SITE_DESCRIPTION =
	'Web personal y diario de Santiago Delebecq, backend developer de Córdoba, Argentina: backend, blockchain e ingeniería de software, escrito despacio y primero en español. Espacios honestos para marcas que valoran la calma.';
export const SITE_AUTHOR = 'Santiago Delebecq';

export const GITHUB_URL = 'https://github.com/Santidele22';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/santiago-delebecq-8630a2215/';
export const CONTACT_EMAIL = 'hola@devlog.es';
export const MASTODON_URL = 'https://mastodon.social/@santidele22';

export type NavLink = {
	href: string;
	label: string;
};

export const NAV_LINKS: NavLink[] = [
	{ href: '/#diario', label: 'Diario' },
	{ href: '/#quien-soy', label: 'Quién soy' },
	{ href: '/#proyectos', label: 'Proyectos' },
	{ href: '/#servicios', label: 'Servicios' },
	{ href: '/marcas', label: 'Marcas' },
];

export const SOCIAL_LINKS = [
	{ icon: 'rss', label: 'RSS del diario', href: '/rss.xml' },
	{ icon: 'github', label: 'GitHub', href: GITHUB_URL },
	{ icon: 'linkedin', label: 'LinkedIn', href: LINKEDIN_URL },
] as const;
