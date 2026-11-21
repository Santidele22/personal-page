import type { DuneState, ScribeState, ScribeWhisper } from './duneTypes';

export const WHISPERS_BY_STATE: Record<ScribeState, readonly string[]> = {
	QUIETO: [
		'Afuera siempre parece urgente algo que mañana ni me acuerdo.',
		'¿En qué momento confundí moverme rápido con ir a algún lado?',
		'Ojalá uno pudiera bajar el volumen del mundo con una perilla.',
	],
	AGUANTANDO: [
		'Aguantar todo el tiempo también cansa, aunque nadie lo note.',
		'Me pesa más lo que me guardo que lo que me toca hacer.',
		'El viento pasa, pero si me quedo acá me lo como de frente.',
	],
	PENSANDO: [
		'Quizás parar un rato no es perder tiempo, sino recuperarlo.',
		'No necesito tener todas las respuestas hoy; me alcanza con escucharme.',
		'Qué liviano sería soltar lo que ya no depende de mí.',
	],
	ENTRANDO: [
		'Paso a paso. Hoy elijo dejar el apuro del lado de afuera.',
		'Entrar despacio también es una forma de cuidarme.',
	],
	ADENTRO: [
		'Acá adentro el silencio no asusta; por fin se escucha lo que importa.',
		'Qué raro sentirme en paz sin estar haciendo nada.',
		'A veces la vida se aclara sola cuando dejo de empujarla.',
	],
	SALIENDO: [
		'Listo. Vuelvo afuera, pero sin olvidarme de cómo se siente estar en calma.',
		'El mundo sigue igual de ruidoso; el que vuelve distinto soy yo.',
	],
};

export function triggerStateWhisper(state: DuneState, scribeState: ScribeState, duration = 7.6): void {
	const list = WHISPERS_BY_STATE[scribeState];
	if (list.length === 0) return;
	const text = list[state.whisperIndex % list.length];
	state.whisperIndex += 1;
	state.whisper = { text, elapsed: 0, duration };
}

export function stepWhisper(state: DuneState, dt: number): void {
	if (!state.whisper) return;
	state.whisper.elapsed += dt;
	if (state.whisper.elapsed >= state.whisper.duration) {
		state.whisper = null;
	}
}

export function getWhisperOpacity(whisper: ScribeWhisper | null): number {
	if (!whisper) return 0;
	const { elapsed, duration } = whisper;
	if (elapsed <= 0 || elapsed >= duration) return 0;
	const fadeIn = 0.7;
	const fadeOut = 1.1;
	if (elapsed < fadeIn) return elapsed / fadeIn;
	if (elapsed > duration - fadeOut) return Math.max(0, (duration - elapsed) / fadeOut);
	return 1;
}
