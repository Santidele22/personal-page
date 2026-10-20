import { createSignal, For, onMount, Show } from 'solid-js';
import { isBrandActive } from '../../entities/admin/adapter';
import { formatDayMonthYear } from '../../entities/admin/format';
import type { ApiBrand } from '../../entities/admin/types';
import type { AdvertisingPlan } from './api/advertising-admin';
import { createBrand, deleteBrand, fetchBrands, fetchBrandPlans, updateBrand } from './api/brands-admin';
import type { BrandInput } from './api/brands-admin';

/**
 * Admin editor for the stored brands: the real sponsors the carousels rotate.
 * Every brand belongs to an advertising plan (the backend rejects deleting a
 * plan still referenced by one), so the form carries a plan selector resolved
 * against the plans collection. The row lists name, plan and validity, using
 * the same active rule as the dashboard adapter (`isBrandActive`). The session
 * gate lives in the admin shell (`AdminTopBar` mounts `SessionGuard`), like the
 * other panels.
 */

type Status = 'loading' | 'ready' | 'error';

type Notice = {
	tone: 'ok' | 'error';
	text: string;
};

/** Form shape: everything is text, including the plan id and the date input. */
type BrandForm = {
	name: string;
	imageUrl: string;
	url: string;
	planId: string;
	activeUntil: string;
};

const EMPTY_FORM: BrandForm = {
	name: '',
	imageUrl: '',
	url: '',
	planId: '',
	activeUntil: '',
};

function toForm(brand: ApiBrand): BrandForm {
	return {
		name: brand.name,
		imageUrl: brand.imageUrl,
		url: brand.url ?? '',
		planId: String(brand.planId),
		// The date input wants `YYYY-MM-DD`; the API sends an ISO timestamp.
		activeUntil: brand.activeUntil ? brand.activeUntil.slice(0, 10) : '',
	};
}

/** `''` → omitted: the backend rejects empty strings. */
function optional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

type InputResult = { ok: true; value: BrandInput } | { ok: false; error: string };

/** Checks the form the way the DTO does, so the panel answers in Spanish. */
function toInput(form: BrandForm): InputResult {
	const name = form.name.trim();

	if (!name) {
		return { ok: false, error: 'La marca necesita un nombre.' };
	}

	const imageUrl = form.imageUrl.trim();

	if (!imageUrl) {
		return { ok: false, error: 'La marca necesita un logo: la URL de la imagen.' };
	}

	// The DTO validates `planId` as an integer; the select carries it as text.
	const planId = Number(form.planId);

	if (!form.planId || !Number.isInteger(planId)) {
		return { ok: false, error: 'Elige el plan que ocupa la marca.' };
	}

	const activeUntil = optional(form.activeUntil);

	if (activeUntil && Number.isNaN(new Date(activeUntil).getTime())) {
		return { ok: false, error: 'La vigencia tiene que ser una fecha válida.' };
	}

	return {
		ok: true,
		value: {
			name,
			imageUrl,
			url: optional(form.url),
			planId,
			activeUntil,
		},
	};
}

/** Row copy for the validity column, reusing the adapter's active rule. */
function validityOf(brand: ApiBrand, now: Date): { text: string; active: boolean } {
	if (!brand.activeUntil) {
		return { text: 'Sin vencimiento', active: true };
	}

	const day = formatDayMonthYear(brand.activeUntil);

	return isBrandActive(brand, now)
		? { text: `Hasta el ${day}`, active: true }
		: { text: `Vencida el ${day}`, active: false };
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
	placeholder?: string;
	type?: 'text' | 'date';
	onInput: (value: string) => void;
};

/** One labelled input, shared by every field of both forms. */
function Field(props: FieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<input
				id={props.id}
				type={props.type ?? 'text'}
				value={props.value}
				placeholder={props.placeholder}
				onInput={(event) => props.onInput(event.currentTarget.value)}
				class={`${inputClass} mt-2`}
			/>
			{props.hint && <p class={hintClass}>{props.hint}</p>}
		</div>
	);
}

type PlanSelectProps = {
	id: string;
	value: string;
	plans: AdvertisingPlan[];
	onInput: (value: string) => void;
};

/** The plan the brand occupies; the value travels as text until submit. */
function PlanSelect(props: PlanSelectProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				PLAN
			</label>
			<select
				id={props.id}
				onChange={(event) => props.onInput(event.currentTarget.value)}
				class={`${inputClass} mt-2`}
			>
				<option value="" selected={props.value === ''}>
					Elige un plan
				</option>
				<For each={props.plans}>
					{(plan) => (
						<option value={String(plan.id)} selected={String(plan.id) === props.value}>
							#{plan.id} — {plan.description}
						</option>
					)}
				</For>
			</select>
			<p class={hintClass}>
				{props.plans.length === 0
					? 'Todavía no hay planes cargados: crea uno en PLANES Y CARA PÚBLICA antes de añadir una marca.'
					: 'El plan que ocupa la marca.'}
			</p>
		</div>
	);
}

type BrandFormProps = {
	/** Id prefix so the create form and the row forms never share labels. */
	prefix: string;
	initial: BrandForm;
	plans: AdvertisingPlan[];
	submitLabel: string;
	busy: boolean;
	error: string;
	onSubmit: (input: BrandInput) => void;
	onCancel: () => void;
};

/**
 * The inline add/edit form. It owns its draft, validates locally and hands a
 * ready-to-send body to the parent; it mounts once per edited row, so the
 * draft is discarded when the row leaves edit mode.
 */
function BrandFormFields(props: BrandFormProps) {
	const [form, setForm] = createSignal<BrandForm>({ ...props.initial });
	const [invalid, setInvalid] = createSignal('');

	function update(key: keyof BrandForm, value: string) {
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
			<div class="grid gap-5 sm:grid-cols-2">
				<Field
					id={`${props.prefix}-name`}
					label="NOMBRE"
					value={form().name}
					placeholder="Marca"
					onInput={(value) => update('name', value)}
				/>
				<Field
					id={`${props.prefix}-image`}
					label="LOGO"
					value={form().imageUrl}
					placeholder="https://…/logo.png"
					hint="URL pública de la imagen; el carrusel la muestra en la tarjeta."
					onInput={(value) => update('imageUrl', value)}
				/>
			</div>

			<div class="grid gap-5 sm:grid-cols-2">
				<Field
					id={`${props.prefix}-url`}
					label="ENLACE"
					value={form().url}
					placeholder="https://…"
					hint="Opcional: a dónde lleva la tarjeta. Se abre en otra pestaña."
					onInput={(value) => update('url', value)}
				/>
				<PlanSelect
					id={`${props.prefix}-plan`}
					value={form().planId}
					plans={props.plans}
					onInput={(value) => update('planId', value)}
				/>
			</div>

			<div class="max-w-[16rem]">
				<Field
					id={`${props.prefix}-active-until`}
					label="VIGENCIA"
					type="date"
					value={form().activeUntil}
					hint="Opcional: vacío significa sin vencimiento."
					onInput={(value) => update('activeUntil', value)}
				/>
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

export default function BrandsEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [brands, setBrands] = createSignal<ApiBrand[]>([]);
	const [plans, setPlans] = createSignal<AdvertisingPlan[]>([]);
	const [busy, setBusy] = createSignal(false);
	const [notice, setNotice] = createSignal<Notice | null>(null);
	const [creating, setCreating] = createSignal(false);
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [pendingDelete, setPendingDelete] = createSignal<number | null>(null);

	const [formError, setFormError] = createSignal('');

	/**
	 * Reads the stored brands and the plans their selector needs. `silent`
	 * re-syncs after a mutation without flashing the loading state or dropping
	 * the panel the admin is using.
	 */
	async function load(silent = false) {
		if (!silent) setStatus('loading');

		try {
			const [storedBrands, storedPlans] = await Promise.all([fetchBrands(), fetchBrandPlans()]);
			setBrands(storedBrands);
			setPlans(storedPlans);
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

	const planLabel = (planId: number) =>
		plans().find((plan) => plan.id === planId)?.description ?? `Plan #${planId}`;

	async function handleCreate(input: BrandInput) {
		if (busy()) return;

		setBusy(true);
		setFormError('');
		setNotice(null);

		try {
			await createBrand(input);
			setCreating(false);
			await load(true);
			announce('ok', 'Marca añadida. Los carruseles la muestran al recargar.');
		} catch (cause) {
			setFormError(cause instanceof Error ? cause.message : 'No pudimos guardar la marca.');
		} finally {
			setBusy(false);
		}
	}

	async function handleUpdate(id: number, input: BrandInput) {
		if (busy()) return;

		setBusy(true);
		setFormError('');
		setNotice(null);

		try {
			await updateBrand(id, input);
			setEditingId(null);
			await load(true);
			announce('ok', `Marca #${id} guardada. Los carruseles ya muestran los cambios.`);
		} catch (cause) {
			setFormError(cause instanceof Error ? cause.message : 'No pudimos guardar la marca.');
		} finally {
			setBusy(false);
		}
	}

	async function handleDelete(brand: ApiBrand) {
		if (busy()) return;

		setBusy(true);
		setNotice(null);

		try {
			await deleteBrand(brand.id);
			setPendingDelete(null);
			setBrands((current) => current.filter((item) => item.id !== brand.id));
			announce('ok', `Marca #${brand.id} eliminada.`);
		} catch (cause) {
			// The plan relation is `onDelete: 'RESTRICT'`: when the backend
			// refuses, its message is the one that explains why.
			announce(
				'error',
				cause instanceof Error && cause.message
					? cause.message
					: 'No pudimos eliminar la marca. Inténtalo de nuevo en unos minutos.',
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div class="flex flex-col gap-6">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando las marcas…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar las marcas. La web sigue mostrando lo último guardado.
					</p>
					<button type="button" onClick={() => void load()} class={quietButtonClass}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<p class="text-sm text-muted-foreground">
						{brands().length === 1 ? '1 marca guardada.' : `${brands().length} marcas guardadas.`}
					</p>
					<button type="button" onClick={() => setCreating((open) => !open)} class={quietButtonClass}>
						{creating() ? 'Cerrar formulario' : '+ Añadir marca'}
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
						<h3 class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">NUEVA MARCA</h3>
						<div class="mt-5">
							<BrandFormFields
								prefix="brand-nueva"
								initial={EMPTY_FORM}
								plans={plans()}
								submitLabel="Añadir marca"
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
					when={brands().length > 0}
					fallback={
						<p class="border border-dashed border-border p-6 text-sm text-muted-foreground">
							Todavía no hay marcas. Añade la primera y los carruseles empezarán a mostrar sponsors.
						</p>
					}
				>
					<ul class="flex flex-col gap-4">
						<For each={brands()}>
							{(brand) => {
								const validity = () => validityOf(brand, new Date());

								return (
									<li class="border border-border bg-card p-6">
										<Show
											when={editingId() === brand.id}
											fallback={
												<>
													<div class="flex flex-wrap items-start justify-between gap-4">
														<div class="flex min-w-0 gap-4">
															<img
																src={brand.imageUrl}
																alt={`Logo de ${brand.name}`}
																class="size-14 shrink-0 rounded-md border border-border bg-background object-contain p-1.5"
															/>
															<div class="min-w-0">
																<p class="font-mono text-[11px] text-muted-foreground">
																	MARCA #{brand.id}
																</p>
																<p class="mt-2 font-mincho text-xl font-semibold tracking-tight">
																	{brand.name}
																</p>
																<dl class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
																	<div class="flex gap-2">
																		<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">
																			PLAN
																		</dt>
																		<dd class="text-foreground">{planLabel(brand.planId)}</dd>
																	</div>
																	<div class="flex gap-2">
																		<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">
																			VIGENCIA
																		</dt>
																		<dd class={validity().active ? 'text-foreground' : 'text-destructive'}>
																			{validity().text}
																		</dd>
																	</div>
																	<Show when={brand.url}>
																		<div class="flex min-w-0 gap-2">
																			<dt class="shrink-0 font-medium tracking-[0.15em] text-muted-foreground">
																				ENLACE
																			</dt>
																			<dd class="break-all text-foreground">{brand.url}</dd>
																		</div>
																	</Show>
																</dl>
															</div>
														</div>
													</div>

													<div class="mt-5 flex flex-wrap items-center gap-3">
														<button
															type="button"
															onClick={() => {
																setPendingDelete(null);
																setFormError('');
																setEditingId(brand.id);
															}}
															class={quietButtonClass}
														>
															Editar
														</button>
														<Show
															when={pendingDelete() === brand.id}
															fallback={
																<button
																	type="button"
																	onClick={() => setPendingDelete(brand.id)}
																	class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
																>
																	Eliminar
																</button>
															}
														>
															<span class="text-[12px] text-muted-foreground">
																Se borra de la base y el carrusel deja de mostrarla. Si el plan todavía
																la referencia, el backend rechaza el borrado.
															</span>
															<button
																type="button"
																disabled={busy()}
																onClick={() => void handleDelete(brand)}
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
												EDITAR MARCA #{brand.id}
											</h3>
											<div class="mt-5">
												<BrandFormFields
													prefix={`brand-${brand.id}`}
													initial={toForm(brand)}
													plans={plans()}
													submitLabel="Guardar marca"
													busy={busy()}
													error={formError()}
													onSubmit={(input) => void handleUpdate(brand.id, input)}
													onCancel={() => {
														setEditingId(null);
														setFormError('');
													}}
												/>
											</div>
										</Show>
									</li>
								);
							}}
						</For>
					</ul>
				</Show>
			</Show>
		</div>
	);
}
