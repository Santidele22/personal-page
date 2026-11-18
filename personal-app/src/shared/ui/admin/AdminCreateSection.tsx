import type { JSX } from 'solid-js';
import { adminCardClass, adminPrimaryButtonClass, adminSectionHeadingClass } from './styles';

export type AdminCreateSectionProps = {
	headingId: string;
	heading: string;
	submitLabel: string;
	pending?: boolean;
	pendingLabel?: string;
	submitDisabled?: boolean;
	onSubmit: (event: SubmitEvent) => void;
	children: JSX.Element;
};

/** Card shell for the create form at the top of an admin CRUD panel. */
export function AdminCreateSection(props: AdminCreateSectionProps) {
	return (
		<section aria-labelledby={props.headingId} class={adminCardClass}>
			<h2 id={props.headingId} class={adminSectionHeadingClass}>
				{props.heading}
			</h2>
			<form onSubmit={props.onSubmit} class="mt-5 grid gap-5">
				{props.children}
				<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
					<button
						type="submit"
						disabled={props.pending || props.submitDisabled}
						class={adminPrimaryButtonClass}
					>
						{props.pending ? (props.pendingLabel ?? 'Guardando…') : props.submitLabel}
					</button>
				</div>
			</form>
		</section>
	);
}
