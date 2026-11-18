import { For, Show } from 'solid-js';
import { adminHintClass, adminLabelClass } from '../../../shared/ui/admin/styles';
import { SERVICE_ICON_OPTIONS } from '../serviceForm';
import type { ServiceFormState } from '../serviceForm';

/**
 * Shared field controls and atoms of the services panel: the labelled input and
 * select, the field grid both forms render, the notice line every mutation
 * answers with, and the button/input tokens of this panel. The panel owns the
 * draft and the Spanish validation; this module only renders and reports input.
 *
 * The tokens are local because this panel ships its own sizes: its primary
 * button is `h-11 px-6` (the shared one is `h-10 px-5`), its secondary button
 * keeps the inherited text colour, and its inputs never lock, so they carry no
 * disabled variant.
 */

/** Field input styling of the service forms. */
export const serviceInputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Primary submit button of the service forms. */
export const servicePrimaryButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';

/** Secondary action button: cancel, start edit, retry. */
export const serviceSecondaryButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';

/** Destructive action button: the two-step delete of a row. */
export const serviceDangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';

type ServiceFieldProps = {
	id: string;
	label: string;
	value: string;
	hint?: string;
	multiline?: boolean;
	rows?: number;
	placeholder?: string;
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by every field of both forms. */
function ServiceField(props: ServiceFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<Show
				when={props.multiline}
				fallback={
					<input
						id={props.id}
						type="text"
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						class={`${serviceInputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 4}
					value={props.value}
					placeholder={props.placeholder}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${serviceInputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}

type ServiceSelectFieldProps = {
	id: string;
	label: string;
	value: string;
	emptyLabel: string;
	options: { value: string; label: string }[];
	hint?: string;
	onInput: (value: string) => void;
};

/** One labelled select; the empty option clears the stored column. */
function ServiceSelectField(props: ServiceSelectFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<select
				id={props.id}
				onChange={(event) => props.onInput(event.currentTarget.value)}
				class={`${serviceInputClass} mt-2`}
			>
				<option value="" selected={props.value === ''}>
					{props.emptyLabel}
				</option>
				<For each={props.options}>
					{(option) => (
						<option value={option.value} selected={option.value === props.value}>
							{option.label}
						</option>
					)}
				</For>
			</select>
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}

export type ServiceFieldsProps = {
	form: ServiceFormState;
	/** Id prefix so the add form and the row editors never share labels. */
	prefix: string;
	onInput: <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => void;
};

/** The fields of one service, shared by the add form and the inline editor. */
export function ServiceFields(props: ServiceFieldsProps) {
	return (
		<>
			<div class="grid gap-5 sm:grid-cols-2">
				<ServiceField
					id={`${props.prefix}-name`}
					label="NOMBRE"
					value={props.form.name}
					onInput={(value) => props.onInput('name', value)}
				/>
				<ServiceField
					id={`${props.prefix}-price`}
					label="PRECIO (USD)"
					value={props.form.price}
					placeholder="150"
					onInput={(value) => props.onInput('price', value)}
				/>
			</div>
			<ServiceField
				id={`${props.prefix}-description`}
				label="DESCRIPCIÓN"
				value={props.form.description}
				multiline
				rows={3}
				onInput={(value) => props.onInput('description', value)}
			/>
			<ServiceField
				id={`${props.prefix}-features`}
				label="PRESTACIONES"
				value={props.form.features}
				multiline
				rows={5}
				hint="Una por línea; las líneas vacías se descartan."
				onInput={(value) => props.onInput('features', value)}
			/>
			<div class="grid gap-5 sm:grid-cols-2">
				<ServiceSelectField
					id={`${props.prefix}-icon`}
					label="ICONO"
					value={props.form.icon}
					emptyLabel="Sin icono (la web elige uno)"
					options={SERVICE_ICON_OPTIONS}
					onInput={(value) => props.onInput('icon', value)}
				/>
				<ServiceField
					id={`${props.prefix}-price-label`}
					label="ETIQUETA DE PRECIO"
					value={props.form.priceLabel}
					placeholder="desde USD 150"
					hint="Opcional: el texto que la tarjeta muestra en lugar del número."
					onInput={(value) => props.onInput('priceLabel', value)}
				/>
			</div>
		</>
	);
}

/** Mutation feedback of one scope. `detail` carries the API message when there is one. */
export type ServiceNotice = {
	scope: 'create' | 'edit' | 'delete';
	kind: 'saved' | 'error';
	message: string;
	detail?: string;
};

/** Saved/error line of one mutation, in Spanish with the API detail. */
export function ServiceFeedback(props: { notice: ServiceNotice | null }) {
	return (
		<>
			<Show when={props.notice?.kind === 'saved'}>
				<p role="status" class="flex items-center gap-2 text-sm text-foreground">
					<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
					{props.notice?.message}
				</p>
			</Show>
			<Show when={props.notice?.kind === 'error'}>
				<div role="alert" class="text-sm text-destructive">
					<p>{props.notice?.message}</p>
					<Show when={props.notice?.detail}>
						<p class="mt-1 font-mono text-[11px] leading-relaxed">{props.notice?.detail}</p>
					</Show>
				</div>
			</Show>
		</>
	);
}
