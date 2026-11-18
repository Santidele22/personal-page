import { For, Show } from 'solid-js';
import { adminHintClass, adminLabelClass } from '../../../shared/ui/admin/styles';
import type { AdvertisingPlan } from '../api/advertising-admin';
import type { BrandFormState } from '../brandForm';

/**
 * Field controls and the inline add/edit form of the brands panel. The panel
 * owns the draft and the Spanish validation; this module only renders and
 * reports input.
 */

/** Field input styling of the brand forms (no disabled variant: these inputs never lock). */
const brandInputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Secondary action button: header toggle, retry, cancel, row actions. */
export const brandQuietButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka';

/** Primary submit button of the brand forms. */
export const brandPrimaryButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';

type BrandFieldProps = {
	id: string;
	label: string;
	value: string;
	hint?: string;
	placeholder?: string;
	type?: 'text' | 'date';
	onInput: (value: string) => void;
};

/** One labelled input, shared by every field of both forms. */
function BrandField(props: BrandFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<input
				id={props.id}
				type={props.type ?? 'text'}
				value={props.value}
				placeholder={props.placeholder}
				onInput={(event) => props.onInput(event.currentTarget.value)}
				class={`${brandInputClass} mt-2`}
			/>
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}

type PlanSelectProps = {
	id: string;
	value: string;
	plans: readonly AdvertisingPlan[];
	onInput: (value: string) => void;
};

/** The plan the brand occupies; the value travels as text until submit. */
function PlanSelect(props: PlanSelectProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				PLAN
			</label>
			<select
				id={props.id}
				onChange={(event) => props.onInput(event.currentTarget.value)}
				class={`${brandInputClass} mt-2`}
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
			<p class={adminHintClass}>
				{props.plans.length === 0
					? 'Todavía no hay planes cargados: crea uno en PLANES Y CARA PÚBLICA antes de añadir una marca.'
					: 'El plan que ocupa la marca.'}
			</p>
		</div>
	);
}

export type BrandFormProps = {
	/** Id prefix so the create form and the row forms never share labels. */
	prefix: string;
	form: BrandFormState;
	plans: readonly AdvertisingPlan[];
	submitLabel: string;
	pending: boolean;
	/** Rejected-submit message of this form, or the failure of its last save. */
	error: string;
	onInput: <K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) => void;
	onSubmit: (event: SubmitEvent) => void;
	onCancel: () => void;
};

/** The inline add/edit form, shared by the create card and the row editors. */
export function BrandForm(props: BrandFormProps) {
	return (
		<form onSubmit={props.onSubmit} class="flex flex-col gap-5">
			<div class="grid gap-5 sm:grid-cols-2">
				<BrandField
					id={`${props.prefix}-name`}
					label="NOMBRE"
					value={props.form.name}
					placeholder="Marca"
					onInput={(value) => props.onInput('name', value)}
				/>
				<BrandField
					id={`${props.prefix}-image`}
					label="LOGO"
					value={props.form.imageUrl}
					placeholder="https://…/logo.png"
					hint="URL pública de la imagen; el carrusel la muestra en la tarjeta."
					onInput={(value) => props.onInput('imageUrl', value)}
				/>
			</div>

			<div class="grid gap-5 sm:grid-cols-2">
				<BrandField
					id={`${props.prefix}-url`}
					label="ENLACE"
					value={props.form.url}
					placeholder="https://…"
					hint="Opcional: a dónde lleva la tarjeta. Se abre en otra pestaña."
					onInput={(value) => props.onInput('url', value)}
				/>
				<PlanSelect
					id={`${props.prefix}-plan`}
					value={props.form.planId}
					plans={props.plans}
					onInput={(value) => props.onInput('planId', value)}
				/>
			</div>

			<div class="max-w-[16rem]">
				<BrandField
					id={`${props.prefix}-active-until`}
					label="VIGENCIA"
					type="date"
					value={props.form.activeUntil}
					hint="Opcional: vacío significa sin vencimiento."
					onInput={(value) => props.onInput('activeUntil', value)}
				/>
			</div>

			<Show when={props.error}>
				<p role="alert" class="text-sm text-destructive">
					{props.error}
				</p>
			</Show>

			<div class="flex flex-wrap items-center gap-3">
				<button type="submit" disabled={props.pending} class={brandPrimaryButtonClass}>
					{props.pending ? 'Guardando…' : props.submitLabel}
				</button>
				<button type="button" onClick={props.onCancel} class={`${brandQuietButtonClass} h-11 px-5 text-sm`}>
					Cancelar
				</button>
			</div>
		</form>
	);
}
