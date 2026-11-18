import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
	adminCardClass,
	adminHintClass,
	adminLabelClass,
	adminSectionHeadingClass,
} from '../../../shared/ui/admin/styles';

/**
 * Field controls, the section card and the class tokens of the profile panel.
 * The panel owns the singleton, the draft and the save lifecycle; this module
 * only renders and reports input.
 *
 * The tokens are local because this panel ships its own sizes (S5): its primary
 * actions are `h-11 px-6`, the retry button is `w-fit`, and its inputs never
 * lock, so they carry no disabled variant.
 */

/** Field input styling of the profile form. */
export const profileInputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Retry button of the load-error card. */
export const profileRetryButtonClass =
	'inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-aka hover:text-aka';

/** «Descartar borrador» of the unpublish notice. */
export const profileDraftDiscardButtonClass =
	'ml-auto inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';

/** «+ Añadir» of the list sections. */
export const profileAddButtonClass =
	'inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka';

/** «Quitar» of one list row. */
export const profileRemoveButtonClass =
	'mb-0.5 inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive';

/** «Guardar borrador» of the action bar. */
export const profileSaveDraftButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';

/** «Publicar» of the action bar. */
export const profilePublishButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';

/** «Descartar» of the confirmation dialog. */
export const profileConfirmDiscardButtonClass =
	'inline-flex h-10 items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60';

/** «Cancelar» of the confirmation dialog. */
export const profileCancelDiscardButtonClass =
	'ml-auto inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';

export type ProfileFieldProps = {
	id: string;
	label: string;
	value: string;
	hint?: string;
	multiline?: boolean;
	rows?: number;
	placeholder?: string;
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by every field of the form. */
export function ProfileField(props: ProfileFieldProps) {
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
						class={`${profileInputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 4}
					value={props.value}
					placeholder={props.placeholder}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${profileInputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}

export type ProfileSectionProps = {
	id: string;
	heading: string;
	/** Two columns from `sm` up, like the identity, meta and network sections. */
	twoColumns?: boolean;
	children: JSX.Element;
};

/** One titled card of the profile form. */
export function ProfileSection(props: ProfileSectionProps) {
	return (
		<section aria-labelledby={props.id} class={adminCardClass}>
			<h2 id={props.id} class={adminSectionHeadingClass}>
				{props.heading}
			</h2>
			<div class={props.twoColumns ? 'mt-5 grid gap-5 sm:grid-cols-2' : 'mt-5 grid gap-5'}>
				{props.children}
			</div>
		</section>
	);
}
