import type { Recommendation } from './types';

/* The recommendations the home bento ships with (S8): the real Carlos Fabian
   Lencina quote (S1) plus the two clearly-replaceable stand-ins of artboard
   02. `GET /recommendations` replaces them as soon as the API answers,
   exactly like the other landing fallbacks; a reachable but empty collection
   renders the section's empty state instead (the backend is then the only
   source of truth). No row carries a `linkedinUrl` yet: without a real link
   the card renders no «in ↗». */
export const recommendations: Recommendation[] = [
	{
		id: 1,
		quote:
			'Tengo la oportunidad de trabajar con Santiago como Full Stack Developer Jr. dentro del área de tokenizaciones, en un entorno fintech/crypto de alta exigencia, y su evolución fue realmente destacable. Participó activamente en el desarrollo de soluciones vinculadas a emisión y gestión de activos tokenizados, integrando componentes frontend y backend con gran responsabilidad. Siempre recibí muy buenos reportes de los Tech Leads sobre su desempeño, su capacidad de aprendizaje y su compromiso con la calidad, especialmente en flujos sensibles relacionados con blockchain y transacciones. Se caracteriza por su actitud proactiva, su interés por comprender el impacto de lo que construye y su disposición constante a mejorar. Es un profesional en crecimiento, con bases sólidas y gran proyección dentro del ecosistema digital. Sin duda, un talento con mucho futuro en el mundo de la tokenización y el desarrollo full stack.',
		authorName: 'Carlos Fabian Lencina',
		authorRole: 'CTO · Blockchain & AI Engineer',
		relationship: 'Me supervisó directamente',
		linkedinUrl: '',
	},
	{
		id: 2,
		quote:
			'Santiago tomó ownership de flujos de pago críticos desde el primer mes. Aprende más rápido que cualquier junior que haya mentoreado.',
		authorName: 'Mariana Duarte',
		authorRole: 'Tech Lead · Fintech',
		relationship: 'Me supervisó directamente',
		linkedinUrl: '',
	},
	{
		id: 3,
		quote:
			'Integró servicios NestJS con contratos ERC-20 sin fricción. Bases sólidas y gran proyección en el ecosistema digital.',
		authorName: 'Diego Fernández',
		authorRole: 'Senior Backend Engineer',
		relationship: 'Trabajamos en el mismo equipo',
		linkedinUrl: '',
	},
];
