import { createSignal, For, onMount, Show } from 'solid-js';
import {
	createAdvertisingPlan,
	deleteAdvertisingPlan,
	fetchAdvertisingPlans,
	updateAdvertisingPlan,
} from './api/advertising-admin';
import type { AdvertisingPlan, AdvertisingPlanInput } from './api/advertising-admin';

/**
 * Admin editor for the stored advertising plans. The page keeps its read-only
 * dashboard above; this island owns the writable list: every plan can be
 * edited in place or deleted, and the form at the top creates a new one. The
 * editable shape is the commercial pair plus the public slot columns the
 * landing renders (S5, S11). The session gate lives in the admin shell
 * (`AdminTopBar` mounts `SessionGuard`), like the other panels.
 */

type Status = 'loading' | 'ready' | 'error';

type Notice = {
	tone: 'ok' | 'error';
	text: string;
};

/** Form shape: everything is text so a half-typed price stays literal. */
type PlanForm = {
	price: string;
	description: string;
	slug: string;
	name: string;
	visibility: string;
	moment: string;
	format: string;
	cadence: string;
	note: string;
};

const EMPTY_FORM: PlanForm = {
	price: '',
	description: '',
	slug: '',
	name: '',
	visibility: '',
	moment: '',
	format: '',
	cadence: '',
	note: '',
};

/** The public slot face of the plan, in landing order. */
const PUBLIC_FIELDS = [
	{ key: 'slug', label: 'SLUG', hint: 'Identidad del slot en la landing: pie, flujo, lectura, carta o patrono.' },
	{ key: 'name', label: 'NOMBRE', hint: 'Título que muestra el slot.' },
	{ key: 'visibility', label: 'VISIBILIDAD', hint: 'Cuánto se nota: discreto, medio, destacado.' },
	{ key: 'moment', label: 'MOMENTO', hint: 'Dónde aparece dentro de la página.' },
	{ key: 'format', label: 'FORMATO', hint: 'La forma del bloque: estático, sin animación.' },
	{ key: 'cadence', label: 'CADENCIA', hint: 'Lo que acompaña al precio: /mes, /trimestre.' },
	{ key: 'note', label: 'NOTA', hint: 'La línea editorial bajo el formato.' },
] as const;

function toForm(plan: AdvertisingPlan): PlanForm {
	return {
		price: plan.price.toString(),
		description: plan.description,
		slug: plan.slug ?? '',
		name: plan.name ?? '',
		visibility: plan.visibility ?? '',
		moment: plan.moment ?? '',
		format: plan.format ?? '',
		cadence: plan.cadence ?? '',
		note: plan.note ?? '',
	};
}

function hasPublicFields(form: PlanForm): boolean {
	return PUBLIC_FIELDS.some((field) => form[field.key] !== '');
}

/** `''` → omitted: the backend rejects empty strings with `@IsNotEmpty`. */
function optional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

type InputResult = { ok: true; value: AdvertisingPlanInput } | { ok: false; error: string };

/** Checks the form the way the DTO does, so the panel answers in Spanish. */
function toInput(form: PlanForm): InputResult {
	const price = form.price.trim().replace(',', '.');

	if (!PRICE_PATTERN.test(price)) {
		return { ok: false, error: 'El precio tiene que ser un número de hasta dos decimales y sin signo.' };
	}

	const description = form.description.trim();

	if (!description) {
		return { ok: false, error: 'La descripción es obligatoria: es lo que explica el plan.' };
	}

	return {
		ok: true,
		value: {
			price: Number(price),
			description,
			slug: optional(form.slug),
			name: optional(form.name),
			visibility: optional(form.visibility),
			moment: optional(form.moment),
			format: optional(form.format),
			cadence: optional(form.cadence),
			note: optional(form.note),
		},
	};
}

const labelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const inputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const hintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground';
const quietButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka';
const primaryButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';

type FieldProps = {
	id: string;
	label: string;
	value: string;
	hint?: string;
	rows?: number;
	placeholder?: string;
	type?: 'text' | 'number';
	min?: string;
	step?: string;
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by every field of both forms. */
function Field(props: FieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<Show
				when={props.rows}
				fallback={
					<input
						id={props.id}
						type={props.type ?? 'text'}
						min={props.min}
						step={props.step}
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						class={`${inputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 3}
					value={props.value}
					placeholder={props.placeholder}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${inputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			{props.hint && <p class={hintClass}>{props.hint}</p>}
		</div>
	);
}

type PlanFormProps = {
	/** Id prefix so the create form and the row forms never share labels. */
	prefix: string;
	initial: PlanForm;
	submitLabel: string;
	busy: boolean;
	error: string;
	onSubmit: (input: AdvertisingPlanInput) => void;
	onCancel: () => void;
};

/**
 * The inline add/edit form. It owns its draft, validates locally and hands a
 * ready-to-send body to the parent; it mounts once per edited row, so the
 * draft is discarded when the row leaves edit mode.
 */
function PlanFormFields(props: PlanFormProps) {
	const [form, setForm] = createSignal<PlanForm>({ ...props.initial });
	const [invalid, setInvalid] = createSignal('');
	const [publicOpen, setPublicOpen] = createSignal(hasPublicFields(props.initial));

	function update(key: keyof PlanForm, value: string) {
		setForm((current) => ({ ...current, [key]: value }));
		setInvalid('');
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (props.busy) return;

		const result = toInput(form());

		if (!result.ok) {
			setInvalid(result.error);
			return;
		}

		props.onSubmit(result.value);
	}

	return (
		<form onSubmit={handleSubmit} class="flex flex-col gap-5">
			<div class="grid gap-5 sm:grid-cols-[minmax(0,10rem)_1fr]">
				<Field
					id={`${props.prefix}-price`}
					label="PRECIO (USD)"
					value={form().price}
					type="number"
					min="0"
					step="0.01"
					placeholder="120"
					onInput={(value) => update('price', value)}
				/>
				<Field
					id={`${props.prefix}-description`}
					label="DESCRIPCIÓN"
					value={form().description}
					rows={3}
					placeholder="Qué incluye el plan y por qué cuesta eso."
					onInput={(value) => update('description', value)}
				/>
			</div>

			<div class="border border-dashed border-border p-4">
				<button
					type="button"
					aria-expanded={publicOpen()}
					onClick={() => setPublicOpen((open) => !open)}
					class="flex w-full items-center justify-between gap-3 text-left"
				>
					<span class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">
						CARA PÚBLICA DEL SLOT
					</span>
					<span class="font-mono text-xs text-muted-foreground" aria-hidden="true">
						{publicOpen() ? '−' : '+'}
					</span>
				</button>
				<p class={hintClass}>
					Lo que la landing muestra en el slot. Un campo vacío no viaja al backend y el valor guardado se mantiene.
				</p>
				<Show when={publicOpen()}>
					<div class="mt-5 grid gap-5 sm:grid-cols-2">
						<For each={PUBLIC_FIELDS}>
							{(field) => (
								<div class={field.key === 'note' ? 'sm:col-span-2' : undefined}>
									<Field
										id={`${props.prefix}-${field.key}`}
										label={field.label}
										value={form()[field.key]}
										hint={field.hint}
										rows={field.key === 'note' ? 2 : undefined}
										onInput={(value) => update(field.key, value)}
									/>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>

			<Show when={invalid() || props.error}>
				<p role="alert" class="text-sm text-destructive">
					{invalid() || props.error}
				</p>
			</Show>

			<div class="flex flex-wrap items-center gap-3">
				<button type="submit" disabled={props.busy} class={primaryButtonClass}>
					{props.busy ? 'Guardando…' : props.submitLabel}
				</button>
				<button type="button" onClick={props.onCancel} class={`${quietButtonClass} h-11 px-5 text-sm`}>
					Cancelar
				</button>
			</div>
		</form>
	);
}

/** The stored public columns of one plan, ready to render as a small list. */
function publicRows(plan: AdvertisingPlan): Array<{ label: string; value: string }> {
	return PUBLIC_FIELDS.map((field) => ({ label: field.label, value: plan[field.key] ?? '' })).filter((row) =>
		Boolean(row.value),
	);
}

export default function AdvertisingPlansEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [plans, setPlans] = createSignal<AdvertisingPlan[]>([]);
	const [busy, setBusy] = createSignal(false);
	const [notice, setNotice] = createSignal<Notice | null>(null);
	const [creating, setCreating] = createSignal(false);
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [pendingDelete, setPendingDelete] = createSignal<number | null>(null);

	const [formError, setFormError] = createSignal('');

	/**
	 * Reads the stored list. `silent` re-syncs after a mutation without
	 * flashing the loading state or dropping the panel the admin is using.
	 */
	async function load(silent = false) {
		if (!silent) setStatus('loading');

		try {
			setPlans(await fetchAdvertisingPlans());
			setStatus('ready');
		} catch {
			if (!silent) setStatus('error');
			else setNotice({ tone: 'error', text: 'No pudimos actualizar la lista. Recarga la página para verla al día.' });
		}
	}

	onMount(() => {
		void load();
	});

	function announce(tone: Notice['tone'], text: string) {
		setNotice({ tone, text });
	}

	async function handleCreate(input: AdvertisingPlanInput) {
		if (busy()) return;

		setBusy(true);
		setFormError('');
		setNotice(null);

		try {
			await createAdvertisingPlan(input);
			setCreating(false);
			await load(true);
			announce('ok', 'Plan añadido. La landing ya muestra el slot al recargar.');
		} catch (cause) {
			setFormError(cause instanceof Error ? cause.message : 'No pudimos guardar el plan.');
		} finally {
			setBusy(false);
		}
	}

	async function handleUpdate(id: number, input: AdvertisingPlanInput) {
		if (busy()) return;

		setBusy(true);
		setFormError('');
		setNotice(null);

		try {
			await updateAdvertisingPlan(id, input);
			setEditingId(null);
			await load(true);
			announce('ok', `Plan #${id} guardado. La landing ya muestra los cambios.`);
		} catch (cause) {
			setFormError(cause instanceof Error ? cause.message : 'No pudimos guardar el plan.');
		} finally {
			setBusy(false);
		}
	}

	async function handleDelete(plan: AdvertisingPlan) {
		if (busy()) return;

		setBusy(true);
		setNotice(null);

		try {
			await deleteAdvertisingPlan(plan.id);
			setPendingDelete(null);
			setPlans((current) => current.filter((item) => item.id !== plan.id));
			announce('ok', `Plan #${plan.id} eliminado.`);
		} catch {
			announce('error', 'No pudimos eliminar el plan. Inténtalo de nuevo en unos minutos.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div class="flex flex-col gap-6">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando los planes de publicidad…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar los planes. La web sigue mostrando lo último guardado.
					</p>
					<button type="button" onClick={() => void load()} class={quietButtonClass}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<p class="text-sm text-muted-foreground">
						{plans().length === 1 ? '1 plan guardado.' : `${plans().length} planes guardados.`}
					</p>
					<button type="button" onClick={() => setCreating((open) => !open)} class={quietButtonClass}>
						{creating() ? 'Cerrar formulario' : '+ Añadir plan'}
					</button>
				</div>

				<Show when={notice()} keyed>
					{(current) => (
						<p
							role={current.tone === 'error' ? 'alert' : 'status'}
							class={`border p-4 text-sm ${
								current.tone === 'error'
									? 'border-destructive/40 bg-destructive/10 text-destructive'
									: 'border-border bg-card text-foreground'
							}`}
						>
							{current.text}
						</p>
					)}
				</Show>

				<Show when={creating()}>
					<div class="border border-border bg-card p-6">
						<h3 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">NUEVO PLAN</h3>
						<div class="mt-5">
							<PlanFormFields
								prefix="plan-nuevo"
								initial={EMPTY_FORM}
								submitLabel="Añadir plan"
								busy={busy()}
								error={formError()}
								onSubmit={(input) => void handleCreate(input)}
								onCancel={() => {
									setCreating(false);
									setFormError('');
								}}
							/>
						</div>
					</div>
				</Show>

				<Show
					when={plans().length > 0}
					fallback={
						<p class="border border-dashed border-border p-6 text-sm text-muted-foreground">
							Todavía no hay planes guardados. Añade el primero y la landing empezará a mostrar el slot.
						</p>
					}
				>
					<ul class="flex flex-col gap-4">
						<For each={plans()}>
							{(plan) => (
								<li class="border border-border bg-card p-6">
									<Show
										when={editingId() === plan.id}
										fallback={
											<>
												<div class="flex flex-wrap items-start justify-between gap-4">
													<div>
														<p class="font-mono text-[11px] text-muted-foreground">PLAN #{plan.id}</p>
														<p class="mt-2 text-sm">{plan.description}</p>
													</div>
													<p class="shrink-0 text-right">
														<span class="block font-mincho text-2xl font-semibold tracking-tight">
															USD {plan.price}
														</span>
														<span class="mt-1 block text-[10px] tracking-[0.25em] text-muted-foreground">
															PRECIO
														</span>
													</p>
												</div>

												<Show
													when={publicRows(plan).length > 0}
													fallback={
														<p class={hintClass}>
															Sin cara pública: la landing no muestra este plan hasta que le des un
															slug.
														</p>
													}
												>
													<dl class="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
														<For each={publicRows(plan)}>
															{(row) => (
																<div class="flex gap-2 text-[12px]">
																	<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">
																		{row.label}
																	</dt>
																	<dd class="text-foreground">{row.value}</dd>
																</div>
															)}
														</For>
													</dl>
												</Show>

												<div class="mt-5 flex flex-wrap items-center gap-3">
													<button
														type="button"
														onClick={() => {
															setPendingDelete(null);
															setFormError('');
															setEditingId(plan.id);
														}}
														class={quietButtonClass}
													>
														Editar
													</button>
													<Show
														when={pendingDelete() === plan.id}
														fallback={
															<button
																type="button"
																onClick={() => setPendingDelete(plan.id)}
																class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
															>
																Eliminar
															</button>
														}
													>
														<span class="text-[12px] text-muted-foreground">
															Se borra de la base y la landing deja de mostrarlo.
														</span>
														<button
															type="button"
															disabled={busy()}
															onClick={() => void handleDelete(plan)}
															class="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-3 text-[12px] font-medium text-[#fdf8ee] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
														>
															{busy() ? 'Eliminando…' : 'Sí, eliminar'}
														</button>
														<button type="button" onClick={() => setPendingDelete(null)} class={quietButtonClass}>
															Cancelar
														</button>
													</Show>
												</div>
											</>
										}
									>
										<h3 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
											EDITAR PLAN #{plan.id}
										</h3>
										<div class="mt-5">
											<PlanFormFields
												prefix={`plan-${plan.id}`}
												initial={toForm(plan)}
												submitLabel="Guardar plan"
												busy={busy()}
												error={formError()}
												onSubmit={(input) => void handleUpdate(plan.id, input)}
												onCancel={() => {
													setEditingId(null);
													setFormError('');
												}}
											/>
										</div>
									</Show>
								</li>
							)}
						</For>
					</ul>
				</Show>
			</Show>
		</div>
	);
}
