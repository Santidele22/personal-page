// Subtle synthesized bronze completion bell for ended vigilia sessions.

let sharedAudioCtx: AudioContext | null = null;

function resolveAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (sharedAudioCtx) return sharedAudioCtx;
	const AudioCtor =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!AudioCtor) return null;
	sharedAudioCtx = new AudioCtor();
	return sharedAudioCtx;
}

/** Ensures the Web Audio context is unlocked during a user gesture. */
export function primeChimeAudio(): void {
	try {
		const ctx = resolveAudioContext();
		if (ctx && ctx.state === 'suspended') {
			void ctx.resume();
		}
	} catch {}
}

/** Plays a soft monastic bronze chime without external audio assets. */
export function playCompletionChime(): void {
	try {
		const ctx = resolveAudioContext();
		if (!ctx) return;
		if (ctx.state === 'suspended') {
			void ctx.resume();
		}

		const now = ctx.currentTime;
		const master = ctx.createGain();
		master.gain.setValueAtTime(0.0001, now);
		master.gain.linearRampToValueAtTime(0.16, now + 0.015);
		master.gain.exponentialRampToValueAtTime(0.0001, now + 2.45);
		master.connect(ctx.destination);

		const fundamental = ctx.createOscillator();
		fundamental.type = 'sine';
		fundamental.frequency.setValueAtTime(432, now);
		fundamental.connect(master);

		const overtoneGain = ctx.createGain();
		overtoneGain.gain.setValueAtTime(0.28, now);
		overtoneGain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
		overtoneGain.connect(master);

		const overtone = ctx.createOscillator();
		overtone.type = 'sine';
		overtone.frequency.setValueAtTime(1192, now);
		overtone.connect(overtoneGain);

		fundamental.start(now);
		overtone.start(now);
		fundamental.stop(now + 2.5);
		overtone.stop(now + 2.5);
	} catch {}
}
