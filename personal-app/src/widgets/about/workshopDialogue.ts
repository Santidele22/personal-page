import type { ActiveDialogue, DialogueLine, SpeakerId, VisitorRole, WorkshopWorld } from './workshopTypes';

export const SPEAKER_LABELS: Record<SpeakerId, string> = {
	artisan: 'SANTI',
	drone: 'DRON',
	carrier: 'ARAÑA',
};

export const JOKE_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'carrier', text: '¿Cómo se llama la placa madre?', duration: 2.3, mood: 'joke' },
		{ speaker: 'artisan', text: 'A la grande le puse Cuca', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'drone', text: '¡La consola prende sin batería!', duration: 2.3, mood: 'joke' },
		{ speaker: 'artisan', text: '¡Acá obedecemos la termodinámica!', duration: 2.5, mood: 'joke' },
	],
	[
		{ speaker: 'artisan', text: 'Le puse reloj nu-cu-lar al CPU', duration: 2.4, mood: 'joke' },
		{ speaker: 'drone', text: 'Atómico, Santi… se dice atómico', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'carrier', text: '¡La placa necesita capacitores!', duration: 2.3, mood: 'joke' },
		{ speaker: 'artisan', text: '¡Plan kintsugi! ¡Necesita pines!', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'drone', text: 'Dice: presione cualquier tecla', duration: 2.3, mood: 'joke' },
		{ speaker: 'carrier', text: '¿Cuál es la tecla cualquiera?', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'artisan', text: 'Sin café y sin Linux…', duration: 2.2, mood: 'joke' },
		{ speaker: 'drone', text: '…Santi pierde la cabeza', duration: 2.3, mood: 'joke' },
	],
	[
		{ speaker: 'carrier', text: '¿Le metemos RGB a la consola?', duration: 2.3, mood: 'joke' },
		{ speaker: 'artisan', text: 'No ganás FPS con lucecitas', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'drone', text: 'Mi trabajo aquí ha terminado', duration: 2.3, mood: 'joke' },
		{ speaker: 'carrier', text: '¡Pero si escaneaste 2 segundos!', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'artisan', text: 'Estúpido y sensual borrow checker', duration: 2.4, mood: 'joke' },
		{ speaker: 'drone', text: 'Como si no compilara nada… nada…', duration: 2.5, mood: 'joke' },
	],
	[
		{ speaker: 'carrier', text: 'Se te trabó Neovim en el kernel', duration: 2.3, mood: 'joke' },
		{ speaker: 'artisan', text: 'Todo marcha bien, Milhouse', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'drone', text: 'El chip de audio zumba raro', duration: 2.3, mood: 'joke' },
		{ speaker: 'artisan', text: '¡Pequeño demonio, te voy a soldar!', duration: 2.4, mood: 'joke' },
	],
	[
		{ speaker: 'artisan', text: '¡Careta abajo que voy a soldar!', duration: 2.3, mood: 'joke' },
		{ speaker: 'carrier', text: '¡Hable más fuerte que tengo estática!', duration: 2.5, mood: 'joke' },
	],
];

const CODING_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'drone', text: 'Frame time en 14ms, clava 60 FPS', duration: 2.3 },
		{ speaker: 'artisan', text: 'Le metemos físicas al sprite', duration: 2.2 },
	],
	[
		{ speaker: 'carrier', text: '¿Salió el driver de video?', duration: 2.2 },
		{ speaker: 'artisan', text: 'El buffer en Rust ya casi compila', duration: 2.3 },
	],
	[
		{ speaker: 'drone', text: 'El firmware pesa 180 KB pelado', duration: 2.3 },
		{ speaker: 'artisan', text: 'Linux y Rust, cero grasa', duration: 2.2 },
	],
];

const BENCH_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'drone', text: 'Costura kintsugi lista en la placa', duration: 2.3 },
		{ speaker: 'artisan', text: 'Dejala enfriar antes de dar 5V', duration: 2.2 },
	],
	[
		{ speaker: 'carrier', text: 'Traje capacitor del rack para audio', duration: 2.3 },
		{ speaker: 'drone', text: 'Sueldo la pista del DAC ahora', duration: 2.2 },
	],
	[
		{ speaker: 'artisan', text: 'Señal de video limpia en el oscilo', duration: 2.3 },
		{ speaker: 'drone', text: 'Flasheo el bootloader ahora', duration: 2.2 },
	],
	[
		{ speaker: 'artisan', text: 'Careta abajo, ¡no miren el arco!', duration: 2.3 },
		{ speaker: 'drone', text: 'Filtro UV listo, jefe', duration: 2.2 },
	],
];

const AMBIENT_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'carrier', text: 'Café caliente para el motor en Rust', duration: 2.3 },
		{ speaker: 'artisan', text: 'Sin esto no bootea la consola', duration: 2.2 },
	],
	[
		{ speaker: 'carrier', text: 'Traje PCB nueva del rack al banco', duration: 2.3 },
		{ speaker: 'drone', text: 'Bajando a soldar los pines', duration: 2.2 },
	],
	[
		{ speaker: 'carrier', text: 'Capacitor de repuesto en el banco', duration: 2.3 },
		{ speaker: 'artisan', text: 'Justo el que faltaba al audio', duration: 2.2 },
	],
];

const SHORT_CIRCUIT_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'drone', text: '¡Chispazo en el banco! ¡Sector 7G!', duration: 2.1, mood: 'alert' },
		{ speaker: 'artisan', text: '¡Aprieten el botón rojo… ESE no!', duration: 2.3, mood: 'alert' },
	],
	[
		{ speaker: 'carrier', text: '¡Se escapa el humo de la consola!', duration: 2.1, mood: 'alert' },
		{ speaker: 'artisan', text: '¡Corto los 5V ya, sin pánico!', duration: 2.3, mood: 'alert' },
	],
];

const BUILD_FAIL_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'drone', text: '¡KERNEL PANIC en la consola!', duration: 2.1, mood: 'alert' },
		{ speaker: 'artisan', text: '¡D’oh! ¡Justo antes del demo!', duration: 2.3, mood: 'alert' },
	],
	[
		{ speaker: 'carrier', text: 'Explotó el motor en Rust, ¡pánico!', duration: 2.1, mood: 'alert' },
		{ speaker: 'artisan', text: '¡Yo no fui, nadie me vio! Parcheo', duration: 2.3, mood: 'alert' },
	],
];

const DRONE_GLITCH_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'drone', text: '¡Perdí el PID! ¡Me lleva la corriente!', duration: 2.1, mood: 'alert' },
		{ speaker: 'artisan', text: '¡Agáchense! ¡Reinicio firmware!', duration: 2.3, mood: 'alert' },
	],
	[
		{ speaker: 'carrier', text: '¡El dron parece la nave de Kang!', duration: 2.1, mood: 'alert' },
		{ speaker: 'artisan', text: '¡Tranqui, lo flasheo desde Linux!', duration: 2.3, mood: 'alert' },
	],
];

const EMERGENCY_DELIVERY_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'carrier', text: '¡Matafuegos a 6 patas! ¡Abran paso!', duration: 2.1, mood: 'alert' },
		{ speaker: 'artisan', text: '¡Sos el MVP del taller, Araña!', duration: 2.1, mood: 'alert' },
	],
];

const CELEBRATION_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'artisan', text: '¡Booteó a 60 FPS! ¡Excelente…!', duration: 2.4, mood: 'celebrate' },
		{ speaker: 'drone', text: '¡Todo marcha bien, Santi!', duration: 2.3, mood: 'celebrate' },
	],
	[
		{ speaker: 'drone', text: 'Placa kintsugi viva y sin cortos', duration: 2.2, mood: 'celebrate' },
		{ speaker: 'carrier', text: '¡Yuju! ¡Baile de las 6 patas!', duration: 2.3, mood: 'celebrate' },
	],
];

const STUMBLE_EXCHANGES: readonly DialogueLine[][] = [
	[
		{ speaker: 'carrier', text: '¡D’oh! Casi tiro el capacitor', duration: 2.2, mood: 'joke' },
		{ speaker: 'drone', text: 'Seis patas y tropezás igual', duration: 2.4, mood: 'joke' },
	],
];

export type ExchangeKind =
	| 'short_circuit'
	| 'build_fail'
	| 'drone_glitch'
	| 'emergency_delivery'
	| 'celebration'
	| 'stumble'
	| 'joke';

export function createEmptyDialogue(): ActiveDialogue {
	return { queue: [], index: 0, elapsed: 0, gapRemaining: 0, active: null };
}

export function getGreetingDialogue(visitorRole: VisitorRole): DialogueLine[] {
	if (visitorRole === 'admin') {
		return [
			{ speaker: 'drone', text: '¡Volviste, Santi! La consola te espera.', duration: 2.5, mood: 'celebrate' },
			{ speaker: 'artisan', text: 'Placa en banco y Rust en terminal. A darle.', duration: 2.6 },
		];
	}
	return [
		{ speaker: 'drone', text: '¡Bienvenido, desconocido!', duration: 2.6 },
		{ speaker: 'artisan', text: 'Pasá, armamos una consola Linux casera.', duration: 2.6 },
	];
}

export function startDialogue(world: WorkshopWorld, lines: readonly DialogueLine[]): void {
	if (lines.length === 0) return;
	const queue = lines.map((line) => ({ ...line }));
	world.dialogue = { queue, index: 0, elapsed: 0, gapRemaining: 0, active: queue[0] };
}

export function pickExchange(
	pool: readonly DialogueLine[][],
	prefix: string,
	nextRand: () => number,
	lastKey: string,
): { lines: readonly DialogueLine[]; key: string } {
	if (pool.length <= 1) return { lines: pool[0], key: `${prefix}:0` };
	let idx = Math.floor(nextRand() * pool.length);
	if (`${prefix}:${idx}` === lastKey) {
		idx = (idx + 1) % pool.length;
	}
	return { lines: pool[idx], key: `${prefix}:${idx}` };
}

export function triggerEventDialogue(
	world: WorkshopWorld,
	kind: ExchangeKind,
	nextRand: () => number,
): void {
	if (world.artisan.state === 'GREETING' || world.drone.state === 'GREET_VISITOR') return;

	const pools: Record<ExchangeKind, readonly DialogueLine[][]> = {
		short_circuit: SHORT_CIRCUIT_EXCHANGES,
		build_fail: BUILD_FAIL_EXCHANGES,
		drone_glitch: DRONE_GLITCH_EXCHANGES,
		emergency_delivery: EMERGENCY_DELIVERY_EXCHANGES,
		celebration: CELEBRATION_EXCHANGES,
		stumble: STUMBLE_EXCHANGES,
		joke: JOKE_EXCHANGES,
	};
	const picked = pickExchange(pools[kind], kind, nextRand, world.lastDialogueKey);
	world.lastDialogueKey = picked.key;
	startDialogue(world, picked.lines);
}

function pickAmbientPool(
	world: WorkshopWorld,
	nextRand: () => number,
): { pool: readonly DialogueLine[][]; prefix: string } {
	if (nextRand() < 0.52) return { pool: JOKE_EXCHANGES, prefix: 'joke' };
	if (
		world.artisan.state === 'SOLDERING' ||
		world.artisan.state === 'ELECTRONICS_TEST' ||
		world.drone.state === 'WELDING_BENCH'
	) {
		return { pool: BENCH_EXCHANGES, prefix: 'bench' };
	}
	if (world.artisan.state === 'CODING') {
		return { pool: CODING_EXCHANGES, prefix: 'coding' };
	}
	return { pool: AMBIENT_EXCHANGES, prefix: 'ambient' };
}

export function stepDialogue(world: WorkshopWorld, dt: number, nextRand: () => number): void {
	const d = world.dialogue;

	if (d.active) {
		d.elapsed += dt;
		if (d.elapsed >= d.active.duration) {
			d.index += 1;
			d.elapsed = 0;
			if (d.index < d.queue.length) {
				d.active = null;
				d.gapRemaining = 0.28;
			} else {
				world.dialogue = createEmptyDialogue();
				world.dialogueCooldown = 2.4 + nextRand() * 2.8;
			}
		}
		return;
	}

	if (d.index < d.queue.length) {
		d.gapRemaining -= dt;
		if (d.gapRemaining <= 0) {
			d.active = d.queue[d.index] ?? null;
			d.elapsed = 0;
		}
		return;
	}

	world.dialogueCooldown -= dt;
	if (world.dialogueCooldown <= 0) {
		const { pool, prefix } = pickAmbientPool(world, nextRand);
		const picked = pickExchange(pool, prefix, nextRand, world.lastDialogueKey);
		world.lastDialogueKey = picked.key;
		startDialogue(world, picked.lines);
	}
}
