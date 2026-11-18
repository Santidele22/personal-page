import { createSignal, For, Show } from 'solid-js';
import { adminHintClass, adminLabelClass } from '../../../shared/ui/admin/styles';
import { PUBLIC_PLAN_FIELDS, hasPublicFields } from '../advertisingPlanForm';
import type { AdvertisingPlanFormState } from '../advertisingPlanForm';

/**
 * Shared field controls and the inline add/edit form of the advertising-plans
 * panel. The panel owns the draft and the Spanish validation; this module only
 * renders and reports input.
 */

/** Field input styling of the plan forms (no disabled variant: these inputs never lock). */
export const planInputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Secondary action button: header toggle, retry, cancel, row actions. */
export const planQuietButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka';

/** Primary submit button of the plan forms. */
export const planPrimaryButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';

type PlanFieldProps = {
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
function PlanField(props: PlanFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
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
						class={`${planInputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 3}
					value={props.value}
					placeholder={props.placeholder}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${planInputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}

export type AdvertisingPlanFormProps = {
	/** Id prefix so the create form and the row forms never share labels. */
	prefix: string;
	form: AdvertisingPlanFormState;
	submitLabel: string;
	pending: boolean;
	error: string;
	onInput: (key: keyof AdvertisingPlanFormState, value: string) => void;
	onSubmit: (event: SubmitEvent) => void;
	onCancel: () => void;
};

/**
 * The inline add/edit form. It owns only the disclosure state of the public
 * slot columns; it mounts once per edited row, so that disclosure starts from
 * the row it edits.
 */
export function AdvertisingPlanForm(props: AdvertisingPlanFormProps) {
	const [publicOpen, setPublicOpen] = createSignal(hasPublicFields(props.form));

	return (
		<form onSubmit={props.onSubmit} class="flex flex-col gap-5">
			<div class="grid gap-5 sm:grid-cols-[minmax(0,10rem)_1fr]">
				<PlanField
					id={`${props.prefix}-price`}
					label="PRECIO (USD)"
					value={props.form.price}
					type="number"
					min="0"
					step="0.01"
					placeholder="120"
					onInput={(value) => props.onInput('price', value)}
				/>
				<PlanField
					id={`${props.prefix}-description`}
					label="DESCRIPCIÓN"
					value={props.form.description}
					rows={3}
					placeholder="Qué incluye el plan y por qué cuesta eso."
					onInput={(value) => props.onInput('description', value)}
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
				<p class={adminHintClass}>
					Lo que la landing muestra en el slot. Un campo vacío no viaja al backend y el valor guardado se mantiene.
				</p>
				<Show when={publicOpen()}>
					<div class="mt-5 grid gap-5 sm:grid-cols-2">
						<For each={PUBLIC_PLAN_FIELDS}>
							{(field) => (
								<div class={field.key === 'note' ? 'sm:col-span-2' : undefined}>
									<PlanField
										id={`${props.prefix}-${field.key}`}
										label={field.label}
										value={props.form[field.key]}
										hint={field.hint}
										rows={field.key === 'note' ? 2 : undefined}
										onInput={(value) => props.onInput(field.key, value)}
									/>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>

			<Show when={props.error}>
				<p role="alert" class="text-sm text-destructive">
					{props.error}
				</p>
			</Show>

			<div class="flex flex-wrap items-center gap-3">
				<button type="submit" disabled={props.pending} class={planPrimaryButtonClass}>
					{props.pending ? 'Guardando…' : props.submitLabel}
				</button>
				<button type="button" onClick={props.onCancel} class={`${planQuietButtonClass} h-11 px-5 text-sm`}>
					Cancelar
				</button>
			</div>
		</form>
	);
}
