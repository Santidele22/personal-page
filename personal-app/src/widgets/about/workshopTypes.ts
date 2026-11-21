// Pure data types for the isometric workshop FSM, physics, dialogue, and Canvas 2D renderer.

export type RGB = [number, number, number];
export type Point2D = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export type VisitorRole = 'admin' | 'guest';
export type WorkshopStation = 'pc' | 'bench';
export type SpeakerId = 'artisan' | 'drone' | 'carrier';
export type CarryItem = 'none' | 'capacitor' | 'pcb' | 'coffee' | 'extinguisher';
export type ActorEmote = 'none' | 'alert' | 'ok' | 'laugh' | 'panic';
export type DialogueMood = 'normal' | 'joke' | 'alert' | 'celebrate';
export type ParticleKind = 'spark' | 'smoke' | 'confetti';
export type ParticleColor = 'aka' | 'ok' | 'gold' | 'smoke' | 'arc';
export type WorkshopEventKind = 'none' | 'short_circuit' | 'build_fail' | 'drone_glitch' | 'celebration';
export type WorkshopEventPhase = 'none' | 'panic' | 'fixing' | 'celebrating';

export interface ObstacleBox {
	id: 'rack' | 'bench' | 'pcDesk';
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	maxZ: number;
	surfaceZ: number;
}

export interface DrawBox {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	minZ: number;
	maxZ: number;
}

export type ArtisanState =
	| 'GREETING'
	| 'CODING'
	| 'WALKING_TO_BENCH'
	| 'SOLDERING'
	| 'ELECTRONICS_TEST'
	| 'WALKING_TO_PC'
	| 'INSPECTING'
	| 'PANICKING'
	| 'TROUBLESHOOTING'
	| 'CELEBRATING';

export type DroneState =
	| 'GREET_VISITOR'
	| 'PATROL'
	| 'SCAN_PC'
	| 'WELDING_BENCH'
	| 'DELIVER_AERIAL'
	| 'PANICKING'
	| 'MALFUNCTION'
	| 'ALERT'
	| 'CELEBRATING';

export type CarrierState =
	| 'IDLE'
	| 'FETCHING'
	| 'CARRYING_TO_BENCH'
	| 'CARRYING_TO_PC'
	| 'DELIVERING'
	| 'RETURNING'
	| 'STUMBLE'
	| 'PANICKING'
	| 'CELEBRATING';

export interface BaseActor<S extends string> {
	state: S;
	stateTime: number;
	duration: number;
	x: number;
	y: number;
	z: number;
	targetX: number;
	targetY: number;
	targetZ: number;
	facing: number;
	walkPhase: number;
	radius: number;
	jumpZ: number;
	emote: ActorEmote;
}

export interface ArtisanActor extends BaseActor<ArtisanState> {
	activeStation: WorkshopStation;
	path: Point2D[];
	carrying: CarryItem;
	maskProgress: number;
	solderProgress: number;
	arcActive: boolean;
	solderSparkAccum: number;
}

export interface DroneActor extends BaseActor<DroneState> {
	carrying: CarryItem;
	orbitAngle: number;
	hoverPhase: number;
	weldProgress: number;
	weldHeat: number;
	sparkAccum: number;
	weldingActive: boolean;
}

export interface CarrierActor extends BaseActor<CarrierState> {
	carrying: CarryItem;
	nextDestination: WorkshopStation;
	path: Point2D[];
	wobble: number;
}

export interface WorkshopParticle {
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	life: number;
	maxLife: number;
	kind: ParticleKind;
	color?: ParticleColor;
	size?: number;
}

export type SparkParticle = WorkshopParticle;

export interface DialogueLine {
	speaker: SpeakerId;
	text: string;
	duration: number;
	mood?: DialogueMood;
}

export interface ActiveDialogue {
	queue: DialogueLine[];
	index: number;
	elapsed: number;
	gapRemaining: number;
	active: DialogueLine | null;
}

export interface WorkshopEventState {
	kind: WorkshopEventKind;
	phase: WorkshopEventPhase;
	elapsed: number;
	duration: number;
	cooldown: number;
	source: 'pc' | 'bench' | 'room';
}

export interface WorkshopBlackboard {
	greeted: boolean;
	visitorRole: VisitorRole;
	partDeliveredAtBench: boolean;
	benchNeedsWeld: boolean;
	kintsugiSeam: number;
	codeLinesCompiled: number;
	coffeeTimer: number;
	nextFailureIndex: number;
}

export interface WorkshopWorld {
	time: number;
	seed: number;
	artisan: ArtisanActor;
	drone: DroneActor;
	carrier: CarrierActor;
	sparks: WorkshopParticle[];
	dialogue: ActiveDialogue;
	dialogueCooldown: number;
	lastDialogueKey: string;
	debugFsm: boolean;
	event: WorkshopEventState;
	blackboard: WorkshopBlackboard;
}

export interface WorkshopPalette {
	isDark: boolean;
	bg: string;
	card: string;
	fg: string;
	mutedFg: string;
	border: string;
	aka: string;
	akaRgb: RGB;
	ok: string;
	okRgb: RGB;
	gold: string;
	goldRgb: RGB;
	fgRgb: RGB;
	isoTop: RGB;
	isoLeft: RGB;
	isoRight: RGB;
	isoDark: RGB;
	isoEdge: string;
	skyTop: string;
	skyBottom: string;
	city: string;
	woodTop: RGB;
	woodLeft: RGB;
	woodRight: RGB;
	pcbTop: RGB;
}

export interface DrawItem {
	depth: number;
	box?: DrawBox;
	draw: (ctx: CanvasRenderingContext2D) => void;
}
