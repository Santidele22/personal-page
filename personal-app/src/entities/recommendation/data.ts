import type { Recommendation } from './types';

/* The recommendation the home section ships with (S8): the real Carlos
   Fabian Lencina quote (S1), the only real one. `GET /recommendations`
   replaces it as soon as the API answers, exactly like the other landing
   fallbacks; a reachable but empty collection renders the section's empty
   state instead (the backend is then the only source of truth). The row
   carries no `linkedinUrl` yet: without a real link the card renders no
   «in ↗». */
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
];
